import { NextRequest, NextResponse } from "next/server";
import { MobileRfidService } from "./service";
import { handleError } from "./utils";

export const StockTakeController = {
  async saveReaderStock(req: NextRequest, user: any) {
    try {
      const body = await req.json();
      let items: any[] = [];
      let scans: any[] = [];
      if (Array.isArray(body)) {
        items = body;
      } else {
        items = body.items || [];
        scans = body.scans || [];
      }

      const data = await MobileRfidService.saveReaderStock(items);
      if (scans.length > 0) {
        await MobileRfidService.saveReaderCountScans(scans);
      }
      return NextResponse.json(data);
    } catch (err) {
      return handleError(err);
    }
  },

  async fetchSearchTargets(req: NextRequest, user: any) {
    try {
      const branchId = user.branchId;
      const data = await MobileRfidService.fetchSearchTargets(branchId);
      return NextResponse.json(data);
    } catch (err) {
      return handleError(err);
    }
  },

  async deleteSearchTarget(req: NextRequest, user: any) {
    try {
      const targetId = Number(req.nextUrl.searchParams.get("id")?.replace("eq.", ""));
      await MobileRfidService.deleteSearchTarget(targetId);
      return new NextResponse(null, { status: 204 });
    } catch (err) {
      return handleError(err);
    }
  },

  async fetchInitialCount(req: NextRequest, user: any) {
    try {
      const branchId = user.branchId;
      const data = await MobileRfidService.fetchInitialCount(branchId);
      return NextResponse.json(data);
    } catch (err) {
      return handleError(err);
    }
  },

  async clearInitialCount(req: NextRequest, user: any) {
    try {
      const branchIdStr = req.nextUrl.searchParams.get("branch_id")?.replace("eq.", "");
      if (!branchIdStr) throw new Error("branch_id is required");
      const branchId = Number(branchIdStr);
      await MobileRfidService.clearInitialCount(branchId);
      return new NextResponse(null, { status: 204 });
    } catch (err) {
      return handleError(err);
    }
  },

  async deleteInitialCountItem(req: NextRequest, user: any) {
    try {
      const productId = Number(req.nextUrl.searchParams.get("product_id")?.replace("eq.", ""));
      const inParam = req.nextUrl.searchParams.get("initial_count_id") || "";
      const match = inParam.match(/in\.\(([^)]+)\)/);
      if (!match) throw new Error("initial_count_id list is required");
      const initialCountIds = match[1].split(",").map(Number);

      await MobileRfidService.deleteInitialCountItems(productId, initialCountIds);
      return new NextResponse(null, { status: 204 });
    } catch (err) {
      return handleError(err);
    }
  },

  async saveInitialCount(req: NextRequest, user: any) {
    try {
      const body = await req.json();
      const items = Array.isArray(body) ? body : (body.items || []);
      const branch_id = user.branchId;
      const count = await MobileRfidService.saveInitialCount(branch_id);
      
      if (items && items.length > 0) {
        const countItems = items.map((x: any) => ({
          initial_count_id: count.id,
          product_id: x.product_id,
          qty: x.qty,
        }));
        await MobileRfidService.saveInitialCountItems(countItems);
      }
      
      return NextResponse.json(Array.isArray(count) ? count : [count]);
    } catch (err) {
      return handleError(err);
    }
  },

  async saveInitialCountItems(req: NextRequest, user: any) {
    try {
      const body = await req.json();
      const items = Array.isArray(body) ? body : [body];
      await MobileRfidService.saveInitialCountItems(items);
      return new NextResponse(null, { status: 201 });
    } catch (err) {
      return handleError(err);
    }
  },

  async fetchInitialCountItems(req: NextRequest, user: any) {
    try {
      const branchId = user.branchId;
      const data = await MobileRfidService.fetchInitialCountItems(branchId);
      return NextResponse.json(data);
    } catch (err) {
      return handleError(err);
    }
  },
};
