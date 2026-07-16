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
      const rfid_tag = body.rfid_tag || null;
      const recorded_by = user.userId;
      const recorded_by_name = body.recorded_by_name || null;

      const data = await MobileRfidService.saveDamagedRecord(
        product_id,
        branch_id,
        qty,
        reason,
        rfid_tag,
        recorded_by,
        recorded_by_name
      );
      return NextResponse.json(data);
    } catch (err) {
      return handleError(err);
    }
  },
};
