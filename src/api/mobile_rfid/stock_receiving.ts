import { NextRequest, NextResponse } from "next/server";
import { MobileRfidService } from "./service";
import { handleError } from "./utils";

export const StockReceivingController = {
  async getReceivingQty(req: NextRequest, user: any) {
    try {
      const productIdParam = req.nextUrl.searchParams.get("product_id") || "";
      const lotIdParam = req.nextUrl.searchParams.get("lot_id") || "";
      const branchId = user.branchId;

      if (productIdParam.startsWith("in.")) {
        const match = productIdParam.match(/in\.\(([^)]+)\)/);
        if (!match) return NextResponse.json([]);
        const ids = match[1].split(",").map(Number);
        
        let lotId: number | null = null;
        if (lotIdParam.startsWith("eq.")) {
          lotId = Number(lotIdParam.replace("eq.", ""));
        }

        const data = await MobileRfidService.fetchReceivingQties(ids, branchId, lotId);
        return NextResponse.json(data);
      } else {
        const productId = Number(productIdParam.replace("eq.", ""));
        let lotId: number | null = null;
        if (lotIdParam.startsWith("eq.")) {
          lotId = Number(lotIdParam.replace("eq.", ""));
        }

        const data = await MobileRfidService.fetchReceivingQty(productId, branchId, lotId);
        return NextResponse.json(data ? [data] : []);
      }
    } catch (err) {
      return handleError(err);
    }
  },

  async saveReceivingQty(req: NextRequest, user: any) {
    try {
      const body = await req.json();
      const branchId = user.branchId;

      if (Array.isArray(body)) {
        // Enforce verified branchId on all batch items
        const sanitizedBody = body.map((x: any) => ({
          ...x,
          branch_id: branchId,
        }));
        const data = await MobileRfidService.saveQties(sanitizedBody);
        return NextResponse.json(data);
      } else {
        const { product_id, lot_id, qty } = body;
        const data = await MobileRfidService.saveQty(product_id, branchId, lot_id, qty);
        return NextResponse.json(data);
      }
    } catch (err) {
      return handleError(err);
    }
  },

  async browseReceiving(req: NextRequest, user: any) {
    try {
      const lotIdParam = req.nextUrl.searchParams.get("lot_id");
      let lotId: number | null = null;
      if (lotIdParam && lotIdParam.startsWith("eq.")) {
        lotId = Number(lotIdParam.replace("eq.", ""));
      }

      const receivingList = await MobileRfidService.fetchStockReceiving(lotId);
      if (receivingList.length === 0) return NextResponse.json([]);

      const productIds = receivingList.map((x) => x.product_id);
      const products = await MobileRfidService.fetchProductsMap(productIds);
      const productsMap = new Map(products.map((p) => [p.id, p]));

      const result = receivingList.map((item) => {
        const prod = productsMap.get(item.product_id);
        return {
          product_id: item.product_id,
          qty: item.qty,
          updated_at: item.updated_at,
          products: prod ? {
            name: prod.name,
            barcode: prod.barcode,
            sku: prod.sku,
            image_url: prod.image_url,
          } : null,
        };
      });

      return NextResponse.json(result);
    } catch (err) {
      return handleError(err);
    }
  },

  async commitReceiving(req: NextRequest, user: any) {
    try {
      const { p_branch_name, p_user_name, p_items, p_lot_id } = await req.json();
      const p_branch_id = user.branchId;
      const p_user_id = user.userId;

      const data = await MobileRfidService.commitReceiving(
        p_branch_id,
        p_branch_name || "สาขา",
        p_user_id,
        p_user_name || "พนักงาน",
        p_lot_id,
        p_items
      );
      return NextResponse.json(data);
    } catch (err) {
      return handleError(err);
    }
  },

  async checkConflicts(req: NextRequest, user: any) {
    try {
      const rfidParam = req.nextUrl.searchParams.get("rfid") || "";
      const match = rfidParam.match(/in\.\(([^)]+)\)/);
      if (!match) return NextResponse.json([]);
      const tags = match[1].split(",");
      
      const data = await MobileRfidService.findConflictingTags(tags);
      return NextResponse.json(data);
    } catch (err) {
      return handleError(err);
    }
  },

  async clearReceiving(req: NextRequest, user: any) {
    try {
      const lotIdParam = req.nextUrl.searchParams.get("lot_id") || "";
      const branchId = user.branchId;
      let lotId: number | null = null;
      if (lotIdParam.startsWith("eq.")) {
        lotId = Number(lotIdParam.replace("eq.", ""));
      }

      await MobileRfidService.clearStockReceiving(branchId, lotId);
      return new NextResponse(null, { status: 204 });
    } catch (err) {
      return handleError(err);
    }
  },

  async deleteProduct(req: NextRequest, user: any) {
    try {
      const productIdParam = req.nextUrl.searchParams.get("product_id") || "";
      const productId = Number(productIdParam.replace("eq.", ""));
      const branchId = user.branchId;

      await MobileRfidService.deleteProductReceiving(productId, branchId);
      return new NextResponse(null, { status: 204 });
    } catch (err) {
      return handleError(err);
    }
  },
};
