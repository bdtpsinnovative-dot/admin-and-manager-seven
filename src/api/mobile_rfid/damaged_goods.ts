import { NextRequest, NextResponse } from "next/server";
import { MobileRfidService } from "./service";
import { handleError } from "./utils";

export const DamagedGoodsController = {
  async fetchStockQty(req: NextRequest, user: any) {
    try {
      const productIdParam = req.nextUrl.searchParams.get("product_id") || "";
      const productId = Number(productIdParam.replace("eq.", ""));
      const branchId = user.branchId;

      const data = await MobileRfidService.fetchStockQty(productId, branchId);
      return NextResponse.json(data ? [data] : []);
    } catch (err) {
      return handleError(err);
    }
  },

  async saveDamageRecord(req: NextRequest, user: any) {
    try {
      const body = await req.json();
      const product_id = Number(body.product_id);
      const branch_id = user.branchId;
      const qty = Number(body.qty);
      const reason = body.reason || "";
      const remark = body.remark || body.rfid_tag || "";
      const reported_by = user.userId;

      const data = await MobileRfidService.saveDamagedRecord(
        product_id,
        branch_id,
        qty,
        reason,
        remark,
        reported_by
      );
      return NextResponse.json(data);
    } catch (err) {
      return handleError(err);
    }
  },
};
