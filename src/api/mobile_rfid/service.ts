import { supabaseAdmin } from "@/lib/supabase/admin";

export interface LotItemInsert {
  lot_id: number;
  product_id: number;
  expected_qty: number;
  received_qty: number;
}

export interface TransferItemInsert {
  transfer_id: number;
  product_id: number;
  transfer_qty: number;
  received_qty: number;
}

export const MobileRfidService = {
  // --- Auth & Profiles ---
  async verifyToken(token: string) {
    try {
      const res = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, {
        method: "GET",
        headers: {
          apikey: process.env.SUPABASE_ANON_KEY!,
          Authorization: `Bearer ${token}`,
        },
        cache: 'no-store'
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error("Direct GoTrue verification failed:", errText);
        throw new Error(`Invalid access token: ${errText} (status: ${res.status})`);
      }

      const user = await res.json();
      if (!user || !user.id) {
        throw new Error("Invalid access token: user object invalid");
      }
      
      const { data: profile, error: profileErr } = await supabaseAdmin
        .from("profiles")
        .select("role, branch_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileErr || !profile) {
        throw new Error("Profile not found for token user");
      }

      return {
        userId: user.id,
        email: user.email,
        role: profile.role,
        branchId: Number(profile.branch_id),
      };
    } catch (err: any) {
      console.error("verifyToken exception:", err.message);
      throw err;
    }
  },

  async signIn(email: string, password: string) {
    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },

  async refreshSession(refreshToken: string) {
    const { data, error } = await supabaseAdmin.auth.refreshSession({
      refresh_token: refreshToken,
    });
    if (error) throw error;
    return data;
  },

  async fetchProfile(userId: string) {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("*, branches(branch_name)")
      .eq("user_id", userId)
      .single();
    if (error) throw error;
    return data;
  },

  // --- Lots ---
  async fetchActiveLots(branchId: number, statuses: string[]) {
    const { data, error } = await supabaseAdmin
      .from("stock_lots")
      .select("id, lot_code, status, sent_at, stock_lot_items(expected_qty, received_qty)")
      .eq("branch_id", branchId)
      .in("status", statuses)
      .order("sent_at", { ascending: false });
    if (error) throw error;
    return data;
  },

  async fetchLotItems(lotId: number) {
    const { data, error } = await supabaseAdmin
      .from("stock_lot_items")
      .select("id, product_id, expected_qty, received_qty, products(name, sku, barcode, image_url)")
      .eq("lot_id", lotId)
      .order("id", { ascending: true });
    if (error) throw error;
    return data;
  },

  async createLot(branchId: number, lotCode: string) {
    const { data, error } = await supabaseAdmin
      .from("stock_lots")
      .insert({ branch_id: branchId, lot_code: lotCode, status: "SENT" })
      .select("id")
      .single();
    if (error) throw error;
    return data;
  },

  async createLotItem(lotId: number, productId: number, expectedQty: number) {
    const { data, error } = await supabaseAdmin
      .from("stock_lot_items")
      .insert({ lot_id: lotId, product_id: productId, expected_qty: expectedQty, received_qty: 0 })
      .select();
    if (error) throw error;
    return data;
  },

  async createLotItems(items: LotItemInsert[]) {
    const { data, error } = await supabaseAdmin
      .from("stock_lot_items")
      .insert(items)
      .select();
    if (error) throw error;
    return data;
  },

  async deleteLotItem(itemId: number) {
    const { error } = await supabaseAdmin
      .from("stock_lot_items")
      .delete()
      .eq("id", itemId);
    if (error) throw error;
  },

  async deleteLot(lotId: number) {
    const { error } = await supabaseAdmin
      .from("stock_lots")
      .delete()
      .eq("id", lotId);
    if (error) throw error;
  },

  // --- Products ---
  async fetchByBarcodeOrSku(code: string) {
    const { data, error } = await supabaseAdmin
      .from("products")
      .select("id, name, barcode, sku, image_url")
      .or(`barcode.eq.${code},sku.eq.${code}`)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async fetchAllProducts(offset: number, limit: number) {
    const { data, error, count } = await supabaseAdmin
      .from("products")
      .select("id, name, sku, barcode, price, unit, image_url, status, color, weight", { count: "exact" })
      .order("id", { ascending: true })
      .range(offset, offset + limit - 1);
    if (error) throw error;
    return { data, count };
  },

  async fetchProductsMap(ids: number[]) {
    const { data, error } = await supabaseAdmin
      .from("products")
      .select("id, name, barcode, sku, image_url")
      .in("id", ids);
    if (error) throw error;
    return data;
  },

  // --- Stock Receiving ---
  async fetchReceivingQty(productId: number, branchId: number, lotId?: number | null) {
    const query = supabaseAdmin
      .from("stock_receiving")
      .select("qty")
      .eq("product_id", productId)
      .eq("branch_id", branchId);
    if (lotId) {
      query.eq("lot_id", lotId);
    } else {
      query.is("lot_id", null);
    }
    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    return data;
  },

  async fetchReceivingQties(ids: number[], branchId: number, lotId?: number | null) {
    const query = supabaseAdmin
      .from("stock_receiving")
      .select("product_id, qty")
      .in("product_id", ids)
      .eq("branch_id", branchId);
    if (lotId) {
      query.eq("lot_id", lotId);
    } else {
      query.is("lot_id", null);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async saveQty(productId: number, branchId: number, lotId: number | null, qty: number) {
    const { data, error } = await supabaseAdmin
      .from("stock_receiving")
      .upsert({ product_id: productId, branch_id: branchId, lot_id: lotId || null, qty })
      .select();
    if (error) throw error;
    return data;
  },

  async saveQties(items: any[]) {
    const { data, error } = await supabaseAdmin
      .from("stock_receiving")
      .upsert(items, { onConflict: "branch_id,product_id,lot_id" })
      .select();
    if (error) throw error;
    return data;
  },

  async fetchStockReceiving(lotId?: number | null) {
    const query = supabaseAdmin
      .from("stock_receiving")
      .select("product_id, qty, updated_at")
      .order("updated_at", { ascending: false });
    if (lotId) {
      query.eq("lot_id", lotId);
    } else {
      query.is("lot_id", null);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async commitReceiving(
    branchId: number,
    branchName: string,
    userId: string,
    userName: string,
    lotId: number | null,
    items: any[]
  ) {
    const { data, error } = await supabaseAdmin.rpc("submit_receive_goods", {
      p_branch_id: branchId,
      p_branch_name: branchName,
      p_user_id: userId,
      p_user_name: userName,
      p_items: items,
      p_lot_id: lotId || null,
    });
    if (error) throw error;
    return data;
  },

  async findConflictingTags(tagList: string[]) {
    const { data, error } = await supabaseAdmin
      .from("product_rfid_tags")
      .select("rfid, product_id")
      .in("rfid", tagList);
    if (error) throw error;
    return data;
  },

  async clearStockReceiving(branchId: number, lotId?: number | null) {
    const query = supabaseAdmin.from("stock_receiving").delete().gt("product_id", 0);
    if (branchId) query.eq("branch_id", branchId);
    if (lotId) {
      query.eq("lot_id", lotId);
    } else {
      query.is("lot_id", null);
    }
    const { error } = await query;
    if (error) throw error;
  },

  async deleteProductReceiving(productId: number, branchId: number) {
    const { error } = await supabaseAdmin
      .from("stock_receiving")
      .delete()
      .eq("product_id", productId)
      .eq("branch_id", branchId);
    if (error) throw error;
  },

  // --- Damaged Goods ---
  async fetchStockQty(productId: number, branchId: number) {
    const { data, error } = await supabaseAdmin
      .from("stock")
      .select("qty")
      .eq("product_id", productId)
      .eq("branch_id", branchId)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async saveDamagedRecord(
    productId: number,
    branchId: number,
    qty: number,
    reason: string,
    remark: string | null,
    userId: string
  ) {
    const { data, error } = await supabaseAdmin
      .from("damaged_goods_records")
      .insert({
        product_id: productId,
        branch_id: branchId,
        qty,
        reason,
        remark: remark || null,
        reported_by: userId,
      })
      .select();
    if (error) throw error;
    return data;
  },

  // --- Transfers ---
  async fetchBranches() {
    const { data, error } = await supabaseAdmin
      .from("branches")
      .select("id, branch_code, branch_name, branch_type")
      .order("branch_name", { ascending: true });
    if (error) throw error;
    return data;
  },

  async fetchPendingTransfers(toBranchId: number) {
    const { data, error } = await supabaseAdmin
      .from("stock_transfers")
      .select("id, transfer_code, status, from_branch_id, to_branch_id, branches!stock_transfers_from_branch_fkey(branch_name)")
      .eq("status", "PENDING")
      .eq("to_branch_id", toBranchId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },

  async createTransfer(fromBranchId: number, toBranchId: number, transferCode: string) {
    const { data, error } = await supabaseAdmin
      .from("stock_transfers")
      .insert({
        from_branch_id: fromBranchId,
        to_branch_id: toBranchId,
        transfer_code: transferCode,
        status: "PENDING",
      })
      .select("id")
      .single();
    if (error) throw error;
    return data;
  },

  async createTransferItems(items: TransferItemInsert[]) {
    const { error } = await supabaseAdmin
      .from("stock_transfer_items")
      .insert(items);
    if (error) throw error;
  },

  async fetchTransferItems(transferId: number) {
    const { data, error } = await supabaseAdmin
      .from("stock_transfer_items")
      .select("id, transfer_id, product_id, transfer_qty, received_qty, products(name, barcode, image_url)")
      .eq("transfer_id", transferId);
    if (error) throw error;
    return data;
  },

  async receiveTransferRpc(
    transferId: number,
    branchId: number,
    branchName: string,
    userId: string,
    userName: string,
    items: any[]
  ) {
    const { data, error } = await supabaseAdmin.rpc("receive_stock_transaction", {
      p_transfer_id: transferId,
      p_branch_id: branchId,
      p_branch_name: branchName,
      p_user_id: userId,
      p_user_name: userName,
      p_items: items,
    });
    if (error) throw error;
    return data;
  },

  // --- Stock Take (Reader Stock / Initial Count) ---
  async saveReaderStock(items: any[]) {
    const { data, error } = await supabaseAdmin
      .from("reader_stock")
      .upsert(items, { onConflict: "product_id,branch_id" });
    if (error) throw error;
    return data;
  },

  async saveReaderCountScans(scans: any[]) {
    const { error } = await supabaseAdmin
      .from("reader_count_scans")
      .upsert(scans, { onConflict: "rfid" });
    if (error) throw error;
  },

  async fetchSearchTargets(branchId: number) {
    const { data, error } = await supabaseAdmin
      .from("search_targets")
      .select("id, product_id, products(name, sku, image_url)")
      .eq("branch_id", branchId);
    if (error) throw error;
    return data;
  },

  async deleteSearchTarget(targetId: number) {
    const { error } = await supabaseAdmin
      .from("search_targets")
      .delete()
      .eq("id", targetId);
    if (error) throw error;
  },

  async fetchInitialCount(branchId: number) {
    const { data, error } = await supabaseAdmin
      .from("stock_initial_counts")
      .select("id")
      .eq("branch_id", branchId);
    if (error) throw error;
    return data;
  },

  async clearInitialCount(branchId: number) {
    const { error } = await supabaseAdmin
      .from("stock_initial_counts")
      .delete()
      .eq("branch_id", branchId);
    if (error) throw error;
  },

  async deleteInitialCountItems(productId: number, initialCountIds: number[]) {
    const { error } = await supabaseAdmin
      .from("stock_initial_count_items")
      .delete()
      .eq("product_id", productId)
      .in("initial_count_id", initialCountIds);
    if (error) throw error;
  },

  async saveInitialCount(branchId: number) {
    const { data, error } = await supabaseAdmin
      .from("stock_initial_counts")
      .insert({ branch_id: branchId })
      .select("id")
      .single();
    if (error) throw error;
    return data;
  },

  async saveInitialCountItems(items: any[]) {
    const { error } = await supabaseAdmin
      .from("stock_initial_count_items")
      .insert(items);
    if (error) throw error;
  },

  async fetchInitialCountItems(branchId: number) {
    const { data, error } = await supabaseAdmin
      .from("stock_initial_count_items")
      .select("qty, product_id, products(name, barcode, sku, image_url), stock_initial_counts!inner(branch_id)")
      .eq("stock_initial_counts.branch_id", branchId);
    if (error) throw error;
    return data;
  },

  // --- Screen-Specific Operations (RFID tags / stocks) ---
  async verifyRfidTag(rfid: string) {
    const { data, error } = await supabaseAdmin
      .from("product_rfid_tags")
      .select("rfid, product_id, products(name)")
      .eq("rfid", rfid)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async fetchTagsForProducts(pIds: number[]) {
    const { data, error } = await supabaseAdmin
      .from("product_rfid_tags")
      .select("rfid, product_id")
      .in("product_id", pIds);
    if (error) throw error;
    return data;
  },

  async insertRfidTag(rfid: string, productId: number) {
    const { data, error } = await supabaseAdmin
      .from("product_rfid_tags")
      .insert({ rfid, product_id: productId })
      .select();
    if (error) throw error;
    return data;
  },

  async deleteRfidTag(rfid: string) {
    const { error } = await supabaseAdmin
      .from("product_rfid_tags")
      .delete()
      .eq("rfid", rfid);
    if (error) throw error;
  },

  async insertDeletedRfidTag(rfid: string, productId: number) {
    const { data, error } = await supabaseAdmin
      .from("deleted_rfid_tags")
      .insert({ rfid, product_id: productId })
      .select();
    if (error) throw error;
    return data;
  },

  async upsertStock(productId: number, branchId: number, qty: number) {
    const { data, error } = await supabaseAdmin
      .from("stock")
      .upsert({ product_id: productId, branch_id: branchId, qty })
      .select();
    if (error) throw error;
    return data;
  },
};
