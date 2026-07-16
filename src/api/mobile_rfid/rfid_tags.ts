import { NextRequest, NextResponse } from "next/server";
import { MobileRfidService } from "./service";
import { handleError } from "./utils";

export const RfidTagsController = {
  async verifyRfidTag(req: NextRequest, user: any) {
    try {
      const rfidParam = req.nextUrl.searchParams.get("rfid") || "";
      let rfid = rfidParam.replace("eq.", "");

      if (rfidParam.startsWith("in.")) {
        const match = rfidParam.match(/in\.\(([^)]+)\)/);
        if (!match) return NextResponse.json([]);
        const tags = match[1].split(",").map(x => x.replace(/^["']|["']$/g, ''));
        const data = await MobileRfidService.findConflictingTags(tags);
        return NextResponse.json(data);
      }

      const data = await MobileRfidService.verifyRfidTag(rfid);
      return NextResponse.json(data ? [data] : []);
    } catch (err) {
      return handleError(err);
    }
  },

  async fetchTagsForProducts(req: NextRequest, user: any) {
    try {
      const pIdsParam = req.nextUrl.searchParams.get("product_id") || "";
      const match = pIdsParam.match(/in\.\(([^)]+)\)/);
      if (!match) return NextResponse.json([]);
      const ids = match[1].split(",").map(Number);
      const data = await MobileRfidService.fetchTagsForProducts(ids);
      return NextResponse.json(data);
    } catch (err) {
      return handleError(err);
    }
  },

  async insertRfidTag(req: NextRequest, user: any) {
    try {
      const { rfid, product_id } = await req.json();
      const data = await MobileRfidService.insertRfidTag(rfid, product_id);
      return NextResponse.json(data);
    } catch (err) {
      return handleError(err);
    }
  },

  async deleteRfidTag(req: NextRequest, user: any) {
    try {
      const rfid = req.nextUrl.searchParams.get("rfid")?.replace("eq.", "") || "";
      await MobileRfidService.deleteRfidTag(rfid);
      return new NextResponse(null, { status: 204 });
    } catch (err) {
      return handleError(err);
    }
  },

  async insertDeletedRfidTag(req: NextRequest, user: any) {
    try {
      const { rfid, product_id } = await req.json();
      const data = await MobileRfidService.insertDeletedRfidTag(rfid, product_id);
      return NextResponse.json(data);
    } catch (err) {
      return handleError(err);
    }
  },

  async upsertStock(req: NextRequest, user: any) {
    try {
      const { product_id, qty } = await req.json();
      const branch_id = user.branchId;
      const data = await MobileRfidService.upsertStock(product_id, branch_id, qty);
      return NextResponse.json(data);
    } catch (err) {
      return handleError(err);
    }
  },

  async updateRfidTag(req: NextRequest, user: any) {
    try {
      const oldRfid = req.nextUrl.searchParams.get("rfid")?.replace("eq.", "") || "";
      const { rfid: newRfid } = await req.json();
      const data = await MobileRfidService.updateRfidTag(oldRfid, newRfid);
      return NextResponse.json(data);
    } catch (err) {
      return handleError(err);
    }
  },
};
