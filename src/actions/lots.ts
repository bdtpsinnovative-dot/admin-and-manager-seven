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

  let createdById:   string | null = null
  let createdByName: string        = "Admin"

  if (user) {
    createdById = user.id
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("user_id", user.id)
      .single()
    createdByName = profile?.full_name || user.email || "Admin"
  }

  const { data: lot, error: lotErr } = await supabaseAdmin
    .from("stock_lots")
    .insert({
      lot_code:        payload.lot_code,
      branch_id:       payload.branch_id,
      note:            payload.note || null,
      status:          "DRAFT",
      created_by:      createdById,
      created_by_name: createdByName,
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

// ---- Get Lots for Manager's Branch (SENT / PARTIAL) ----

export async function getManagerLots(branchId: number) {
  const { data, error } = await supabaseAdmin
    .from("stock_lots")
    .select(
      `id, lot_code, branch_id, note, status, created_by_name, created_at, sent_at,
       stock_lot_items (id, expected_qty, received_qty)`,
      { count: "exact" }
    )
    .eq("branch_id", branchId)
    .in("status", ["SENT", "PARTIAL", "RECEIVING"])
    .order("sent_at", { ascending: false })

  if (error) return []

  return (data ?? []).map((lot: any) => {
    const items: any[] = lot.stock_lot_items ?? []
    return {
      ...lot,
      stock_lot_items: undefined,
      item_count:     items.length,
      expected_total: items.reduce((s: number, i: any) => s + Number(i.expected_qty), 0),
      received_total: items.reduce((s: number, i: any) => s + Number(i.received_qty), 0),
    }
  }) as StockLot[]
}

// ---- Receive Lot Items (update stock + movements + lot status) ----

export async function receiveLotItems(
  lotId: number,
  branchId: number,
  receives: { lot_item_id: number; product_id: number; qty_added: number }[]
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let createdByName = "Manager"
  if (user) {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("user_id", user.id)
      .single()
    createdByName = profile?.full_name || user.email || "Manager"
  }

  // get lot code for batch_ref
  const { data: lot } = await supabaseAdmin
    .from("stock_lots")
    .select("lot_code")
    .eq("id", lotId)
    .single()
  const batchRef = lot?.lot_code ?? `LOT-${lotId}`

  // current received_qty for each item
  const itemIds = receives.map(r => r.lot_item_id)
  const { data: currentItems } = await supabaseAdmin
    .from("stock_lot_items")
    .select("id, received_qty")
    .in("id", itemIds)

  const currentMap: Record<number, number> = {}
  for (const ci of currentItems ?? []) {
    currentMap[ci.id] = Number(ci.received_qty)
  }

  const now = new Date().toISOString()

  // 1. Update each lot item received_qty
  for (const r of receives) {
    const newQty = (currentMap[r.lot_item_id] ?? 0) + r.qty_added
    await supabaseAdmin
      .from("stock_lot_items")
      .update({ received_qty: newQty, updated_at: now })
      .eq("id", r.lot_item_id)
  }

  // 2. Upsert stock (add to branch stock)
  const productIds = receives.map(r => r.product_id)
  const { data: currentStock } = await supabaseAdmin
    .from("stock")
    .select("id, product_id, qty")
    .eq("branch_id", branchId)
    .in("product_id", productIds)

  const stockMap: Record<number, { id: number; qty: number }> = {}
  for (const s of currentStock ?? []) {
    stockMap[s.product_id] = { id: s.id, qty: Number(s.qty) }
  }

  for (const r of receives) {
    const existing = stockMap[r.product_id]
    if (existing) {
      await supabaseAdmin
        .from("stock")
        .update({ qty: existing.qty + r.qty_added })
        .eq("id", existing.id)
    } else {
      await supabaseAdmin
        .from("stock")
        .insert({ product_id: r.product_id, branch_id: branchId, qty: r.qty_added })
    }
  }

  // 3. Insert stock_movements
  await supabaseAdmin.from("stock_movements").insert(
    receives.map(r => ({
      product_id_bigint: r.product_id,
      branch_id:         branchId,
      type:              "IN",
      qty:               r.qty_added,
      note:              `รับสินค้าลอต ${batchRef}`,
      batch_ref:         batchRef,
      ref_type:          "lot_receive",
      created_at_ts:     now,
      created_by_name:   createdByName,
    }))
  )

  // 4. Update lot status
  const { data: allItems } = await supabaseAdmin
    .from("stock_lot_items")
    .select("expected_qty, received_qty")
    .eq("lot_id", lotId)

  if (allItems && allItems.length > 0) {
    const anyReceived = allItems.some(i => Number(i.received_qty) > 0)
    const allComplete = allItems.every(i => Number(i.received_qty) >= Number(i.expected_qty))
    const newStatus: LotStatus = allComplete ? "COMPLETED" : anyReceived ? "PARTIAL" : "SENT"
    await supabaseAdmin.from("stock_lots").update({ status: newStatus }).eq("id", lotId)
  }

  revalidatePath(`/manager/lots/${lotId}`)
  revalidatePath("/manager/lots")
  revalidatePath("/lots")
  return { ok: true }
}

// ---- Lot Receiving Discrepancies ----

export interface LotDiscrepancyItem {
  item_id: number       // 0 = ghost (no lot_item row)
  product_id: number
  product_name: string
  product_sku: string | null
  expected_qty: number
  received_qty: number
  movement_qty: number
  diff: number          // received_qty - expected_qty  (0 for ghost)
  move_diff: number     // movement_qty - expected_qty
  is_ghost: boolean     // true = อยู่ใน movements แต่ไม่ได้อยู่ใน lot
}

export interface LotDiscrepancySummary {
  lot_id: number
  lot_code: string
  status: string
  sent_at: string | null
  created_at: string
  total_expected: number
  total_received: number
  total_movement: number
  shortage_count: number
  excess_count: number
  ghost_count: number
  ok_count: number
  items: LotDiscrepancyItem[]
}

export async function getLotDiscrepancies(branchId: number): Promise<{
  lots: LotDiscrepancySummary[]
  stats: {
    totalLots: number
    lotsWithShortage: number
    lotsWithExcess: number
    lotsWithGhost: number
    lotsOk: number
    totalShortageQty: number
    totalExcessQty: number
    totalGhostQty: number
  }
}> {
  const empty = { lots: [], stats: { totalLots: 0, lotsWithShortage: 0, lotsWithExcess: 0, lotsWithGhost: 0, lotsOk: 0, totalShortageQty: 0, totalExcessQty: 0, totalGhostQty: 0 } }

  // 1. Fetch non-DRAFT lots for branch (latest 100)
  const { data: lotsRaw } = await supabaseAdmin
    .from("stock_lots")
    .select("id, lot_code, status, sent_at, created_at")
    .eq("branch_id", branchId)
    .neq("status", "DRAFT")
    .order("sent_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(100)

  if (!lotsRaw || lotsRaw.length === 0) return empty

  const lotIds = lotsRaw.map((l: any) => l.id)

  // 2. Fetch all lot items with product info
  const { data: itemsRaw } = await supabaseAdmin
    .from("stock_lot_items")
    .select("id, lot_id, product_id, expected_qty, received_qty, products:product_id (id, name, sku)")
    .in("lot_id", lotIds)

  // 3. Fetch actual movements (type=IN) per lot + product
  const { data: movementsRaw } = await supabaseAdmin
    .from("stock_movements")
    .select("lot_id, product_id_bigint, qty")
    .in("lot_id", lotIds)
    .eq("type", "IN")

  // Aggregate movements: { lotId: { productId: totalQty } }
  const moveMap: Record<number, Record<number, number>> = {}
  for (const m of movementsRaw ?? []) {
    if (!m.lot_id || !m.product_id_bigint) continue
    const lotId  = Number(m.lot_id)
    const prodId = Number(m.product_id_bigint)
    if (!moveMap[lotId]) moveMap[lotId] = {}
    moveMap[lotId][prodId] = (moveMap[lotId][prodId] ?? 0) + Number(m.qty ?? 0)
  }

  // Group lot items by lot_id + build set of known product IDs per lot
  const itemsByLot: Record<number, any[]> = {}
  const knownProdsByLot: Record<number, Set<number>> = {}
  for (const item of itemsRaw ?? []) {
    const lid = Number(item.lot_id)
    if (!itemsByLot[lid])    itemsByLot[lid] = []
    if (!knownProdsByLot[lid]) knownProdsByLot[lid] = new Set()
    itemsByLot[lid].push(item)
    knownProdsByLot[lid].add(Number(item.product_id))
  }

  // Find ghost product IDs (in movements but NOT in lot items)
  const ghostProdIds = new Set<number>()
  for (const [lotIdStr, prodMap] of Object.entries(moveMap)) {
    const lotId = Number(lotIdStr)
    for (const prodIdStr of Object.keys(prodMap)) {
      if (!knownProdsByLot[lotId]?.has(Number(prodIdStr))) {
        ghostProdIds.add(Number(prodIdStr))
      }
    }
  }

  // Fetch names for ghost products
  const ghostNameMap: Record<number, { name: string; sku: string | null }> = {}
  if (ghostProdIds.size > 0) {
    const { data: ghostProds } = await supabaseAdmin
      .from("products")
      .select("id, name, sku")
      .in("id", Array.from(ghostProdIds))
    for (const p of ghostProds ?? []) {
      ghostNameMap[p.id] = { name: p.name, sku: p.sku ?? null }
    }
  }

  // Build summaries
  const lots: LotDiscrepancySummary[] = lotsRaw.map((lot: any) => {
    const items = itemsByLot[lot.id] ?? []

    // Normal lot items
    const discItems: LotDiscrepancyItem[] = items.map((item: any) => {
      const expected = Number(item.expected_qty)
      const received = Number(item.received_qty)
      const movement = moveMap[lot.id]?.[Number(item.product_id)] ?? 0
      return {
        item_id:      item.id,
        product_id:   Number(item.product_id),
        product_name: item.products?.name ?? `#${item.product_id}`,
        product_sku:  item.products?.sku ?? null,
        expected_qty: expected,
        received_qty: received,
        movement_qty: movement,
        diff:         received - expected,
        move_diff:    movement - expected,
        is_ghost:     false,
      }
    })

    // Ghost items: in movements but not in lot
    for (const [prodIdStr, movQty] of Object.entries(moveMap[lot.id] ?? {})) {
      const prodId = Number(prodIdStr)
      if (knownProdsByLot[lot.id]?.has(prodId)) continue
      const prod = ghostNameMap[prodId] ?? { name: `#${prodId}`, sku: null }
      discItems.push({
        item_id:      0,
        product_id:   prodId,
        product_name: prod.name,
        product_sku:  prod.sku,
        expected_qty: 0,
        received_qty: 0,
        movement_qty: movQty,
        diff:         0,
        move_diff:    movQty,
        is_ghost:     true,
      })
    }

    const shortage_count = discItems.filter(i => !i.is_ghost && i.diff < 0).length
    const excess_count   = discItems.filter(i => !i.is_ghost && i.diff > 0).length
    const ghost_count    = discItems.filter(i => i.is_ghost).length
    const ok_count       = discItems.filter(i => !i.is_ghost && i.diff === 0).length

    return {
      lot_id:         lot.id,
      lot_code:       lot.lot_code,
      status:         lot.status,
      sent_at:        lot.sent_at,
      created_at:     lot.created_at,
      total_expected: discItems.filter(i => !i.is_ghost).reduce((s, i) => s + i.expected_qty, 0),
      total_received: discItems.filter(i => !i.is_ghost).reduce((s, i) => s + i.received_qty, 0),
      total_movement: discItems.reduce((s, i) => s + i.movement_qty, 0),
      shortage_count,
      excess_count,
      ghost_count,
      ok_count,
      items: discItems,
    }
  })

  const stats = {
    totalLots:        lots.length,
    lotsWithShortage: lots.filter(l => l.shortage_count > 0).length,
    lotsWithExcess:   lots.filter(l => l.excess_count > 0).length,
    lotsWithGhost:    lots.filter(l => l.ghost_count > 0).length,
    lotsOk:           lots.filter(l => l.shortage_count === 0 && l.excess_count === 0 && l.ghost_count === 0).length,
    totalShortageQty: lots.reduce((s, l) => s + l.items.filter(i => !i.is_ghost && i.diff < 0).reduce((a, i) => a + Math.abs(i.diff), 0), 0),
    totalExcessQty:   lots.reduce((s, l) => s + l.items.filter(i => !i.is_ghost && i.diff > 0).reduce((a, i) => a + i.diff, 0), 0),
    totalGhostQty:    lots.reduce((s, l) => s + l.items.filter(i => i.is_ghost).reduce((a, i) => a + i.movement_qty, 0), 0),
  }

  return { lots, stats }
}

// ---- Search Products (fuzzy) ----

export async function searchProducts(query: string, limit = 15): Promise<ProductSearchResult[]> {
  const supabase = await createClient()
  let q = supabase
    .from("products")
    .select("id, name, sku, barcode, image_url, unit, category_id")
    .or("status.neq.deleted,status.is.null")
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

  // แบ่ง chunk ละ 30 codes เพื่อไม่ให้ URL ยาวเกิน limit
  const CHUNK = 30
  const allProducts: ProductSearchResult[] = []

  for (let i = 0; i < codes.length; i += CHUNK) {
    const chunk = codes.slice(i, i + CHUNK)
    const { data } = await supabaseAdmin
      .from("products")
      .select("id, name, sku, barcode, image_url, unit, category_id")
      .or(chunk.map(c => `sku.eq.${c},barcode.eq.${c}`).join(","))

    if (data) allProducts.push(...(data as ProductSearchResult[]))
  }

  const found: (ProductSearchResult & { matchedCode: string })[] = []
  const notFound: string[] = []

  for (const code of codes) {
    const p = allProducts.find(p => p.sku === code || p.barcode === code)
    if (p) found.push({ ...p, matchedCode: code })
    else    notFound.push(code)
  }

  return { found, notFound }
}
