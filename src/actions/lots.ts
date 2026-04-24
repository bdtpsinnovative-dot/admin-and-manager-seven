"use server"

import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"

// ---- Types ----

export type LotStatus = "DRAFT" | "SENT" | "RECEIVING" | "COMPLETED" | "PARTIAL"

export interface StockLot {
  id: number
  lot_code: string
  branch_id: number
  note: string | null
  status: LotStatus
  created_by: string | null
  created_by_name: string | null
  created_at: string
  sent_at: string | null
  branches: { branch_name: string } | null
  item_count: number
  expected_total: number
  received_total: number
}

export interface LotItem {
  id: number
  lot_id: number
  product_id: number
  expected_qty: number
  received_qty: number
  updated_at: string
  products: {
    id: number
    name: string
    sku: string | null
    barcode: string | null
    image_url: string | null
    unit: string | null
  } | null
}

export interface Branch {
  id: number
  branch_name: string
}

export interface ProductSearchResult {
  id: number
  name: string
  sku: string | null
  barcode: string | null
  image_url: string | null
  unit: string | null
  category_id: string | null
}

// ---- Branches ----

export async function getBranches(): Promise<Branch[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("branches")
    .select("id, branch_name")
    .order("branch_name")
  return (data ?? []) as Branch[]
}

// ---- Lots List ----

export async function getLots(params?: {
  branch_id?: number
  status?: string
  page?: number
}) {
  const { branch_id, status, page = 1 } = params ?? {}
  const pageSize = 20
  const from = (page - 1) * pageSize

  let query = supabaseAdmin
    .from("stock_lots")
    .select(
      `id, lot_code, branch_id, note, status, created_by_name, created_at, sent_at,
       branches:branch_id (branch_name),
       stock_lot_items (id, expected_qty, received_qty)`,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1)

  if (branch_id) query = query.eq("branch_id", branch_id)
  if (status)    query = query.eq("status", status)

  const { data, count, error } = await query
  if (error) return { data: [], count: 0, error: error.message }

  const lots: StockLot[] = (data ?? []).map((lot: any) => {
    const items: any[] = lot.stock_lot_items ?? []
    return {
      ...lot,
      stock_lot_items: undefined,
      item_count:      items.length,
      expected_total:  items.reduce((s: number, i: any) => s + Number(i.expected_qty), 0),
      received_total:  items.reduce((s: number, i: any) => s + Number(i.received_qty), 0),
    }
  })

  return { data: lots, count: count ?? 0 }
}

// ---- Lot Detail ----

export async function getLotDetail(lotId: number) {
  const { data: lot, error } = await supabaseAdmin
    .from("stock_lots")
    .select(`id, lot_code, branch_id, note, status, created_by_name, created_at, sent_at,
             branches:branch_id (branch_name)`)
    .eq("id", lotId)
    .single()

  if (error || !lot) return null

  const { data: items } = await supabaseAdmin
    .from("stock_lot_items")
    .select(`id, lot_id, product_id, expected_qty, received_qty, updated_at,
             products:product_id (id, name, sku, barcode, image_url, unit)`)
    .eq("lot_id", lotId)
    .order("id")

  return {
    lot: lot as unknown as StockLot,
    items: (items ?? []) as unknown as LotItem[],
  }
}

// ---- Create Lot ----

export async function createLot(payload: {
  lot_code: string
  branch_id: number
  note?: string
  items: { product_id: number; expected_qty: number }[]
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("full_name")
    .eq("user_id", user.id)
    .single()

  const { data: lot, error: lotErr } = await supabaseAdmin
    .from("stock_lots")
    .insert({
      lot_code:        payload.lot_code,
      branch_id:       payload.branch_id,
      note:            payload.note || null,
      status:          "DRAFT",
      created_by:      user.id,
      created_by_name: profile?.full_name || user.email || "Admin",
    })
    .select("id")
    .single()

  if (lotErr) throw new Error(lotErr.message)

  const { error: itemsErr } = await supabaseAdmin
    .from("stock_lot_items")
    .insert(
      payload.items.map(i => ({
        lot_id:       lot.id,
        product_id:   i.product_id,
        expected_qty: i.expected_qty,
        received_qty: 0,
      }))
    )

  if (itemsErr) throw new Error(itemsErr.message)

  revalidatePath("/lots")
  return { id: lot.id }
}

// ---- Send Lot (DRAFT → SENT) ----

export async function sendLot(lotId: number) {
  const { error } = await supabaseAdmin
    .from("stock_lots")
    .update({ status: "SENT", sent_at: new Date().toISOString() })
    .eq("id", lotId)
    .eq("status", "DRAFT")

  if (error) throw new Error(error.message)
  revalidatePath("/lots")
  revalidatePath(`/lots/${lotId}`)
}

// ---- Delete Lot (DRAFT only) ----

export async function deleteLot(lotId: number) {
  const { error } = await supabaseAdmin
    .from("stock_lots")
    .delete()
    .eq("id", lotId)
    .eq("status", "DRAFT")

  if (error) throw new Error(error.message)
  revalidatePath("/lots")
}

// ---- Update Received Quantities ----

export async function updateLotReceived(
  lotId: number,
  updates: { item_id: number; received_qty: number }[]
) {
  for (const { item_id, received_qty } of updates) {
    await supabaseAdmin
      .from("stock_lot_items")
      .update({ received_qty, updated_at: new Date().toISOString() })
      .eq("id", item_id)
      .eq("lot_id", lotId)
  }

  // คำนวณ status ใหม่
  const { data: items } = await supabaseAdmin
    .from("stock_lot_items")
    .select("expected_qty, received_qty")
    .eq("lot_id", lotId)

  if (items && items.length > 0) {
    const anyReceived  = items.some(i => Number(i.received_qty) > 0)
    const allComplete  = items.every(i => Number(i.received_qty) >= Number(i.expected_qty))
    const newStatus: LotStatus = allComplete ? "COMPLETED" : anyReceived ? "PARTIAL" : "SENT"

    await supabaseAdmin
      .from("stock_lots")
      .update({ status: newStatus })
      .eq("id", lotId)
  }

  revalidatePath(`/lots/${lotId}`)
  revalidatePath("/lots")
}

// ---- Search Products (fuzzy) ----

export async function searchProducts(query: string, limit = 15): Promise<ProductSearchResult[]> {
  const supabase = await createClient()
  let q = supabase
    .from("products")
    .select("id, name, sku, barcode, image_url, unit, category_id")
    .eq("status", "active")
    .limit(limit)
    .order("name")

  if (query.trim()) {
    q = q.or(`name.ilike.%${query}%,sku.ilike.%${query}%,barcode.ilike.%${query}%`)
  }

  const { data } = await q
  return (data ?? []) as ProductSearchResult[]
}

// ---- Get Products by exact SKU/Barcode codes (for Sheets import) ----

export async function getProductsByCodes(codes: string[]): Promise<{
  found: (ProductSearchResult & { matchedCode: string })[]
  notFound: string[]
}> {
  if (codes.length === 0) return { found: [], notFound: [] }

  const supabase = await createClient()
  const { data } = await supabase
    .from("products")
    .select("id, name, sku, barcode, image_url, unit, category_id")
    .eq("status", "active")
    .or(
      codes.map(c => `sku.eq.${c},barcode.eq.${c}`).join(",")
    )

  const products = (data ?? []) as ProductSearchResult[]

  const found: (ProductSearchResult & { matchedCode: string })[] = []
  const notFound: string[] = []

  for (const code of codes) {
    const p = products.find(p => p.sku === code || p.barcode === code)
    if (p) found.push({ ...p, matchedCode: code })
    else    notFound.push(code)
  }

  return { found, notFound }
}
