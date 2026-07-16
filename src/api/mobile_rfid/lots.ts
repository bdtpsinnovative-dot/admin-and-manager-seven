import { NextRequest, NextResponse } from "next/server";
import { MobileRfidService } from "./service";
import { handleError } from "./utils";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const LotsController = {
  async getLots(req: NextRequest, user: any) {
    try {
      const branchId = user.branchId;
      const statusParam = req.nextUrl.searchParams.get("status") || "in.(SENT,PARTIAL)";
      let statuses = ["SENT", "PARTIAL"];
      const match = statusParam.match(/in\.\(([^)]+)\)/);
      if (match) {
        statuses = match[1].split(",");
      }

      const data = await MobileRfidService.fetchActiveLots(branchId, statuses);
      return NextResponse.json(data);
    } catch (err) {
      return handleError(err);
    }
  },

  async getLotItems(req: NextRequest, user: any) {
    try {
      const lotId = Number(req.nextUrl.searchParams.get("lot_id"));
      const data = await MobileRfidService.fetchLotItems(lotId);
      return NextResponse.json(data);
    } catch (err) {
      return handleError(err);
    }
  },

  async createLot(req: NextRequest, user: any) {
    try {
      const body = await req.json();
      const lot_code = body.lot_code || body.lotCode;
      const branch_id = Number(body.branch_id || body.branchId || user.branchId);
      const status = body.status || "SENT";
      const note = body.note || null;
      const created_by = body.created_by || null;
      const created_by_name = body.created_by_name || null;

      const { data, error } = await supabaseAdmin
        .from("stock_lots")
        .insert({
          branch_id,
          lot_code,
          status,
          note,
          created_by,
          created_by_name
        })
        .select("id")
        .single();
      if (error) throw error;
      return NextResponse.json(data);
    } catch (err) {
      return handleError(err);
    }
  },

  async addLotItem(req: NextRequest, user: any) {
    try {
      const body = await req.json();
      if (Array.isArray(body)) {
        const data = await MobileRfidService.createLotItems(body);
        return NextResponse.json(data);
      } else {
        const { lotId, productId, expectedQty } = body;
        const data = await MobileRfidService.createLotItem(lotId, productId, expectedQty);
        return NextResponse.json(data);
      }
    } catch (err) {
      return handleError(err);
    }
  },

  async updateLotItemQty(req: NextRequest, user: any) {
    try {
      const itemId = Number(req.nextUrl.searchParams.get("id")?.replace("eq.", ""));
      const { received_qty } = await req.json();
      const { data, error } = await supabaseAdmin
        .from("stock_lot_items")
        .update({ received_qty })
        .eq("id", itemId)
        .select();
      if (error) throw error;
      return NextResponse.json(data);
    } catch (err) {
      return handleError(err);
    }
  },

  async updateLotStatus(req: NextRequest, user: any) {
    try {
      const lotId = Number(req.nextUrl.searchParams.get("id")?.replace("eq.", ""));
      const { status } = await req.json();
      const { data, error } = await supabaseAdmin
        .from("stock_lots")
        .update({ status })
        .eq("id", lotId)
        .select();
      if (error) throw error;
      return NextResponse.json(data);
    } catch (err) {
      return handleError(err);
    }
  },

  async deleteLotItem(req: NextRequest, user: any) {
    try {
      const itemId = Number(req.nextUrl.searchParams.get("id")?.replace("eq.", ""));
      await MobileRfidService.deleteLotItem(itemId);
      return new NextResponse(null, { status: 204 });
    } catch (err) {
      return handleError(err);
    }
  },

  async deleteLot(req: NextRequest, user: any) {
    try {
      const lotId = Number(req.nextUrl.searchParams.get("id")?.replace("eq.", ""));
      await MobileRfidService.deleteLot(lotId);
      return new NextResponse(null, { status: 204 });
    } catch (err) {
      return handleError(err);
    }
  },
};
