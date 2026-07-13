import { NextRequest, NextResponse } from "next/server";
import { AuthController } from "@/api/mobile_rfid/auth";
import { LotsController } from "@/api/mobile_rfid/lots";
import { ProductsController } from "@/api/mobile_rfid/products";
import { StockReceivingController } from "@/api/mobile_rfid/stock_receiving";
import { DamagedGoodsController } from "@/api/mobile_rfid/damaged_goods";
import { TransfersController } from "@/api/mobile_rfid/transfers";
import { StockTakeController } from "@/api/mobile_rfid/stock_take";
import { RfidTagsController } from "@/api/mobile_rfid/rfid_tags";
import { MobileRfidService } from "@/api/mobile_rfid/service";

// Next.js App Router dynamic route dispatcher for mobile RFID endpoints

async function dispatch(request: NextRequest, params: { path: string[] }) {
  const { path } = params;
  const subpath = path.join("/");
  const method = request.method;

  try {
    // --- Public / Auth Entry Paths ---
    if (subpath === "auth/v1/token" || subpath === "auth/login" || subpath === "auth/refresh") {
      const grantType = request.nextUrl.searchParams.get("grant_type");
      if (grantType === "password" || subpath === "auth/login") {
        return await AuthController.login(request);
      } else if (grantType === "refresh_token" || subpath === "auth/refresh") {
        return await AuthController.refresh(request);
      }
    }
    if (subpath === "system-settings") {
      const { supabaseAdmin } = await import("@/lib/supabase/admin");
      const { data, error } = await supabaseAdmin.from("system_settings").select("*");
      if (error) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
      }
      const settings = (data || []).reduce((acc: any, curr: any) => {
        acc[curr.key] = curr.value;
        return acc;
      }, {});
      return NextResponse.json({ success: true, settings });
    }

    // --- Enforce Token Verification on all other paths (Security Policy) ---
    const authHeader = request.headers.get("Authorization");
    const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.substring(7) : null;
    console.log("INCOMING TOKEN FOR SUBPATH:", subpath, "TOKEN:", token ? `${token.substring(0, 15)}...[len=${token.length}]` : "null");
    if (!token) {
      return NextResponse.json({ success: false, message: "Authorization token is missing" }, { status: 401 });
    }

    let verifiedUser: { userId: string; email: string | undefined; role: string; branchId: number };
    try {
      verifiedUser = await MobileRfidService.verifyToken(token);
    } catch (err: any) {
      console.error(`Unauthorized request attempt to ${method} ${subpath}:`, err.message);
      return NextResponse.json({ success: false, message: "Unauthorized token verification failed" }, { status: 401 });
    }

    // --- Profile Path ---
    if (subpath === "rest/v1/profiles" || subpath === "auth/profile") {
      return await AuthController.profile(request, verifiedUser);
    }

    // --- Lots Paths ---
    if (subpath === "rest/v1/stock_lots" || subpath === "lots") {
      if (method === "GET") return await LotsController.getLots(request, verifiedUser);
      if (method === "POST") return await LotsController.createLot(request, verifiedUser);
      if (method === "PATCH") return await LotsController.updateLotStatus(request, verifiedUser);
      if (method === "DELETE") return await LotsController.deleteLot(request, verifiedUser);
    }
    if (subpath === "rest/v1/stock_lot_items" || subpath === "lots/items") {
      if (method === "GET") return await LotsController.getLotItems(request, verifiedUser);
      if (method === "POST") return await LotsController.addLotItem(request, verifiedUser);
      if (method === "PATCH") return await LotsController.updateLotItemQty(request, verifiedUser);
      if (method === "DELETE") return await LotsController.deleteLotItem(request, verifiedUser);
    }

    // --- Products Paths ---
    if (subpath === "rest/v1/products" || subpath === "products" || subpath === "products/search") {
      return await ProductsController.getProducts(request, verifiedUser);
    }
    if (subpath === "products/sync") {
      return await ProductsController.getProducts(request, verifiedUser);
    }

    // --- Stock Receiving Paths ---
    if (subpath === "rest/v1/stock_receiving" || subpath === "stock-receiving") {
      if (method === "GET") {
        const selectParam = request.nextUrl.searchParams.get("select") || "";
        if (selectParam.includes("products")) {
          return await StockReceivingController.browseReceiving(request, verifiedUser);
        }
        return await StockReceivingController.getReceivingQty(request, verifiedUser);
      }
      if (method === "POST") return await StockReceivingController.saveReceivingQty(request, verifiedUser);
      if (method === "DELETE") {
        const productId = request.nextUrl.searchParams.get("product_id");
        if (productId && productId.startsWith("eq.")) {
          return await StockReceivingController.deleteProduct(request, verifiedUser);
        }
        return await StockReceivingController.clearReceiving(request, verifiedUser);
      }
    }
    if (subpath === "stock-receiving/save") {
      if (method === "POST") return await StockReceivingController.saveReceivingQty(request, verifiedUser);
    }
    if (subpath === "stock-receiving/browse") {
      if (method === "GET") return await StockReceivingController.browseReceiving(request, verifiedUser);
    }
    if (subpath === "stock-receiving/clear") {
      if (method === "DELETE") return await StockReceivingController.clearReceiving(request, verifiedUser);
    }
    if (subpath === "stock-receiving/delete-product") {
      if (method === "DELETE") return await StockReceivingController.deleteProduct(request, verifiedUser);
    }
    if (subpath === "rest/v1/rpc/submit_receive_goods" || subpath === "stock-receiving/commit") {
      if (method === "POST") return await StockReceivingController.commitReceiving(request, verifiedUser);
    }

    // --- Damaged Goods Paths ---
    if (subpath === "rest/v1/damaged_goods_records" || subpath === "damaged-goods/save") {
      if (method === "POST") return await DamagedGoodsController.saveDamageRecord(request, verifiedUser);
    }
    if (subpath === "rest/v1/stock" || subpath === "damaged-goods/stock") {
      if (method === "GET") return await DamagedGoodsController.fetchStockQty(request, verifiedUser);
      if (method === "POST" || method === "PATCH") return await RfidTagsController.upsertStock(request, verifiedUser);
    }

    // --- Transfers Paths ---
    if (subpath === "rest/v1/branches" || subpath === "transfers/branches") {
      if (method === "GET") return await TransfersController.fetchBranches(request, verifiedUser);
    }
    if (subpath === "rest/v1/stock_transfers" || subpath === "transfers/pending") {
      if (method === "GET") return await TransfersController.fetchPendingTransfers(request, verifiedUser);
    }
    if (subpath === "transfers/create") {
      if (method === "POST") return await TransfersController.createTransfer(request, verifiedUser);
    }
    if (subpath === "rest/v1/stock_transfer_items" || subpath === "transfers/items") {
      if (method === "GET") return await TransfersController.fetchTransferItems(request, verifiedUser);
    }
    if (subpath === "rest/v1/rpc/receive_stock_transaction" || subpath === "transfers/receive") {
      if (method === "POST") return await TransfersController.receiveTransfer(request, verifiedUser);
    }

    // --- Stock Take (Reader / Initial Count) Paths ---
    if (subpath === "rest/v1/reader_stock" || subpath === "stock-take/save-reader-stock") {
      if (method === "POST") return await StockTakeController.saveReaderStock(request, verifiedUser);
    }
    if (subpath === "rest/v1/search_targets" || subpath === "stock-take/search-targets") {
      if (method === "GET") return await StockTakeController.fetchSearchTargets(request, verifiedUser);
      if (method === "DELETE") return await StockTakeController.deleteSearchTarget(request, verifiedUser);
    }
    if (subpath === "stock-take/search-targets/delete") {
      if (method === "DELETE") return await StockTakeController.deleteSearchTarget(request, verifiedUser);
    }
    if (subpath === "rest/v1/stock_initial_counts" || subpath === "stock-take/initial-count") {
      if (method === "GET") return await StockTakeController.fetchInitialCount(request, verifiedUser);
      if (method === "POST") return await StockTakeController.saveInitialCount(request, verifiedUser);
      if (method === "DELETE") return await StockTakeController.clearInitialCount(request, verifiedUser);
    }
    if (subpath === "rest/v1/stock_initial_count_items" || subpath === "stock-take/initial-count/items") {
      if (method === "GET") return await StockTakeController.fetchInitialCountItems(request, verifiedUser);
      if (method === "POST") return await StockTakeController.saveInitialCountItems(request, verifiedUser);
      if (method === "DELETE") return await StockTakeController.deleteInitialCountItem(request, verifiedUser);
    }
    if (subpath === "stock-take/initial-count/delete-item") {
      if (method === "DELETE") return await StockTakeController.deleteInitialCountItem(request, verifiedUser);
    }
    if (subpath === "stock-take/verify-tag") {
      if (method === "GET") return await RfidTagsController.verifyRfidTag(request, verifiedUser);
    }
    if (subpath === "stock-take/product-tags") {
      if (method === "GET") return await RfidTagsController.fetchTagsForProducts(request, verifiedUser);
    }

    // --- RFID Tags Paths ---
    if (subpath === "rest/v1/product_rfid_tags" || subpath === "rfid-tags/verify") {
      if (method === "GET") {
        const rfidParam = request.nextUrl.searchParams.get("rfid") || "";
        if (rfidParam.startsWith("in.")) {
          return await StockReceivingController.checkConflicts(request, verifiedUser);
        }
        return await RfidTagsController.verifyRfidTag(request, verifiedUser);
      }
    }
    if (subpath === "rfid-tags/insert") {
      if (method === "POST") return await RfidTagsController.insertRfidTag(request, verifiedUser);
    }
    if (subpath === "rfid-tags/delete") {
      if (method === "DELETE") return await RfidTagsController.deleteRfidTag(request, verifiedUser);
    }
    if (subpath === "rest/v1/deleted_rfid_tags" || subpath === "rfid-tags/delete-record") {
      if (method === "POST") return await RfidTagsController.insertDeletedRfidTag(request, verifiedUser);
    }
    if (subpath === "stock/upsert") {
      if (method === "POST") return await RfidTagsController.upsertStock(request, verifiedUser);
    }

    console.warn(`Unmatched backend route handler requested: ${method} ${subpath}`);
    return NextResponse.json(
      { success: false, message: `Route handler for ${method} ${subpath} not found` },
      { status: 404 }
    );
  } catch (err: any) {
    console.error("Dispatcher error:", err);
    return NextResponse.json(
      { success: false, message: err.message || "Internal server dispatcher error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return dispatch(request, await params);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return dispatch(request, await params);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return dispatch(request, await params);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return dispatch(request, await params);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return dispatch(request, await params);
}

export async function OPTIONS(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return dispatch(request, await params);
}
