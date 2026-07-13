import { NextRequest, NextResponse } from "next/server";
import { MobileRfidService } from "./service";
import { handleError } from "./utils";

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
      const { to_branch_id, transfer_code, items } = await req.json();
      const from_branch_id = user.branchId;
      const transfer = await MobileRfidService.createTransfer(from_branch_id, to_branch_id, transfer_code);
      
      if (items && items.length > 0) {
        const transferItems = items.map((x: any) => ({
          transfer_id: transfer.id,
          product_id: x.product_id,
          transfer_qty: x.transfer_qty,
          received_qty: 0,
        }));
        await MobileRfidService.createTransferItems(transferItems);
      }
      
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
