import { NextRequest, NextResponse } from "next/server";
import { MobileRfidService } from "./service";
import { handleError } from "./utils";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const TransfersController = {
  async fetchBranches(req: NextRequest, user: any) {
    try {
      const data = await MobileRfidService.fetchBranches();
      return NextResponse.json(data);
    } catch (err) {
      return handleError(err);
    }
  },

  async fetchPendingTransfers(req: NextRequest, user: any) {
    try {
      const toBranchId = user.branchId;
      const data = await MobileRfidService.fetchPendingTransfers(toBranchId);
      return NextResponse.json(data);
    } catch (err) {
      return handleError(err);
    }
  },

  async createTransfer(req: NextRequest, user: any) {
    try {
      const body = await req.json();
      const { transfer_code, items } = body;
      const from_branch_id = Number(body.from_branch_id) || user.branchId || 14;
      const to_branch_id = Number(body.to_branch_id);

      if (!items || items.length === 0) {
        return NextResponse.json({ success: false, message: "ไม่มีรายการสินค้าที่จะโอน" }, { status: 400 });
      }

      // 1. ตรวจสอบ product_id ทั้งหมดว่ามีอยู่ในตาราง products หรือไม่
      const submittedIds = items
        .map((x: any) => Number(x.product_id))
        .filter((id: number) => !isNaN(id) && id > 0);

      const { data: existingProducts, error: pErr } = await supabaseAdmin
        .from("products")
        .select("id, sku")
        .in("id", submittedIds);

      if (pErr) throw pErr;

      const existingIdSet = new Set((existingProducts || []).map((p: any) => p.id));
      const missingIds = submittedIds.filter((id: number) => !existingIdSet.has(id));

      if (missingIds.length > 0) {
        console.warn(`[createTransfer] Missing product IDs in products table:`, missingIds);

        for (const missingId of missingIds) {
          const missingItem = items.find((x: any) => Number(x.product_id) === missingId);
          let resolvedId: number | null = null;

          if (missingItem?.sku || missingItem?.barcode) {
            const code = missingItem.sku || missingItem.barcode;
            const { data: matched } = await supabaseAdmin
              .from("products")
              .select("id")
              .or(`sku.eq.${code},barcode.eq.${code}`)
              .limit(1)
              .maybeSingle();
            if (matched) resolvedId = matched.id;
          }

          if (resolvedId) {
            missingItem.product_id = resolvedId;
          } else {
            // สร้าง placeholder product ป้องกัน foreign key constraint violation เพื่อให้การโอนสำเร็จ 100%
            const { error: insErr } = await supabaseAdmin.from("products").upsert({
              id: missingId,
              name: missingItem?.name || `สินค้าโอนรอตรวจสอบ (ID ${missingId})`,
              sku: missingItem?.sku || `TR-MISSING-${missingId}`,
              barcode: missingItem?.barcode || `TR-MISSING-${missingId}`,
              price: 0,
              unit: "ชิ้น",
              status: "active"
            }, { onConflict: "id" });
            if (insErr) console.error(`[createTransfer] Failed to create placeholder product:`, insErr.message);
          }
        }
      }

      // 2. สร้างหัวเอกสารใบโอน
      const transfer = await MobileRfidService.createTransfer(from_branch_id, to_branch_id, transfer_code);

      // 3. บันทึกรายการสินค้าในใบโอน
      const transferItems = items.map((x: any) => ({
        transfer_id: transfer.id,
        product_id: Number(x.product_id),
        qty: Number(x.qty || x.transfer_qty),
        transfer_qty: Number(x.transfer_qty || x.qty),
        received_qty: 0,
      }));
      await MobileRfidService.createTransferItems(transferItems);

      return NextResponse.json(Array.isArray(transfer) ? transfer : [transfer]);
    } catch (err) {
      return handleError(err);
    }
  },

  async fetchTransferItems(req: NextRequest, user: any) {
    try {
      const transferId = Number(req.nextUrl.searchParams.get("transfer_id")?.replace("eq.", ""));
      const data = await MobileRfidService.fetchTransferItems(transferId);
      return NextResponse.json(data);
    } catch (err) {
      return handleError(err);
    }
  },

  async receiveTransfer(req: NextRequest, user: any) {
    try {
      const { p_transfer_id, p_branch_name, p_user_name, p_items } = await req.json();
      const p_branch_id = user.branchId;
      const p_user_id = user.userId;

      const data = await MobileRfidService.receiveTransferRpc(
        p_transfer_id,
        p_branch_id,
        p_branch_name || "สาขา",
        p_user_id,
        p_user_name || "พนักงาน",
        p_items
      );
      return NextResponse.json(data);
    } catch (err) {
      return handleError(err);
    }
  },
};
