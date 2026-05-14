"use server"

import { supabaseAdmin } from "@/lib/supabase/admin"
import fs from "fs"
import path from "path"

// ---- Constants ----

const SNAPSHOT_DIR  = path.join(process.cwd(), "data", "snapshots")
const SNAPSHOT_FILE = path.join(SNAPSHOT_DIR, "latest.json")

// Tables ที่ snapshot+restore ได้ (เรียงตาม FK order — parent ก่อน)
const RESTORABLE_TABLES = [
  { key: "branches",           label: "Branches",           pk: "id",         orderCol: "id" },
  { key: "products",           label: "Products",           pk: "id",         orderCol: "id" },
  { key: "discounts",          label: "Discounts",          pk: "id",         orderCol: "id" },
  { key: "stock",              label: "Stock",              pk: "id",         orderCol: "id" },
  { key: "stock_lots",         label: "Stock Lots",         pk: "id",         orderCol: "id" },
  { key: "stock_lot_items",    label: "Stock Lot Items",    pk: "id",         orderCol: "id" },
  { key: "stock_movements",    label: "Stock Movements",    pk: "id",         orderCol: "id" },
  { key: "stock_receiving",    label: "Stock Receiving",    pk: "id",         orderCol: "id" },
  { key: "product_rfid_tags",  label: "RFID Tags",          pk: "id",         orderCol: "id" },
  { key: "discount_rules",     label: "Discount Rules",     pk: "id",         orderCol: "id" },
  { key: "reader_stock",       label: "Reader Stock",       pk: "product_id", orderCol: "product_id" },
  { key: "reader_count_scans", label: "Reader Count Scans", pk: "rfid",       orderCol: "rfid" },
]

// Tables ที่ export ได้ แต่ไม่ restore (tied to auth / operational)
const EXPORT_ONLY_TABLES = [
  { key: "profiles",          label: "Profiles",           orderCol: "user_id" },
  { key: "customers",         label: "Customers",          orderCol: "id" },
  { key: "sales",             label: "Sales",              orderCol: "id" },
  { key: "sale_items",        label: "Sale Items",         orderCol: "id" },
  { key: "sale_scan_logs",    label: "Sale Scan Logs",     orderCol: "id" },
  { key: "sale_scan_deletes", label: "Sale Scan Deletes",  orderCol: "id" },
  { key: "sale_discounts",    label: "Sale Discounts",     orderCol: "id" },
  { key: "sale_dasbrode",     label: "Sale Dashboard",     orderCol: "day" },
  { key: "orders",            label: "Orders",             orderCol: "id" },
  { key: "cart_items",        label: "Cart Items",         orderCol: "id" },
  { key: "favorites",         label: "Favorites",          orderCol: "id" },
  { key: "site_gallery",      label: "Site Gallery",       orderCol: "id" },
]

const ALL_EXPORT_TABLES = [...RESTORABLE_TABLES, ...EXPORT_ONLY_TABLES]

// ---- Types ----

export interface TableInfo {
  key: string
  label: string
  description: string
  count: number
  restorable: boolean
}

export interface SnapshotMeta {
  created_at: string
  git_commit: string
  tables: { key: string; rows: number }[]
  totalRows: number
}

// ---- Helpers ----

function ensureDir() {
  if (!fs.existsSync(SNAPSHOT_DIR)) fs.mkdirSync(SNAPSHOT_DIR, { recursive: true })
}

async function fetchAllRows(tableKey: string, orderCol = "id"): Promise<any[]> {
  const all: any[] = []
  let from = 0
  const pageSize = 1000

  while (true) {
    const { data, error } = await supabaseAdmin
      .from(tableKey)
      .select("*")
      .range(from, from + pageSize - 1)
      .order(orderCol as any, { ascending: true })

    if (error || !data || data.length === 0) break
    all.push(...data)
    if (data.length < pageSize) break
    from += pageSize
  }
  return all
}

// ---- Table Stats ----

const TABLE_DESC: Record<string, string> = {
  branches:           "ข้อมูลสาขา",
  products:           "สินค้าทั้งหมด ⭐ สำคัญที่สุด",
  discounts:          "โปรโมชั่น/ส่วนลด",
  discount_rules:     "เงื่อนไขส่วนลด",
  stock:              "สต็อกสินค้าแต่ละสาขา",
  stock_lots:         "ลอตการรับสินค้า",
  stock_lot_items:    "รายการสินค้าในแต่ละลอต",
  stock_movements:    "ประวัติการเคลื่อนไหวสต็อก",
  stock_receiving:    "ข้อมูลการรับสินค้า",
  product_rfid_tags:  "RFID Tag ทุกตัว ⭐ สำคัญ",
  reader_stock:       "สต็อกจาก Reader",
  reader_count_scans: "ประวัติการ Scan นับสต็อก",
  profiles:           "ข้อมูลพนักงาน (export only)",
  customers:          "ข้อมูลลูกค้า (export only)",
  sales:              "ประวัติการขาย (export only)",
  sale_items:         "รายการสินค้าในแต่ละบิล (export only)",
  sale_scan_logs:     "Log การ Scan ขายสินค้า (export only)",
  sale_scan_deletes:  "Log การลบรายการขาย (export only)",
  sale_discounts:     "ส่วนลดในแต่ละบิล (export only)",
  sale_dasbrode:      "สรุปยอดขายรายวัน (export only)",
  orders:             "ออเดอร์ออนไลน์ (export only)",
  cart_items:         "ตะกร้าสินค้า (export only)",
  favorites:          "สินค้าโปรด (export only)",
  site_gallery:       "รูปภาพบนเว็บ (export only)",
}

export async function getBackupTableStats(): Promise<TableInfo[]> {
  const results: TableInfo[] = []
  for (const t of ALL_EXPORT_TABLES) {
    const { count } = await supabaseAdmin
      .from(t.key)
      .select("*", { count: "exact", head: true })
    results.push({
      key:         t.key,
      label:       t.label,
      description: TABLE_DESC[t.key] ?? t.key,
      count:       count ?? 0,
      restorable:  RESTORABLE_TABLES.some(r => r.key === t.key),
    })
  }
  return results
}

// ---- Read Snapshot Meta ----

export async function getSnapshotMeta(): Promise<SnapshotMeta | null> {
  if (!fs.existsSync(SNAPSHOT_FILE)) return null
  try {
    const raw = fs.readFileSync(SNAPSHOT_FILE, "utf-8")
    const snap = JSON.parse(raw)
    return snap.meta as SnapshotMeta
  } catch { return null }
}

// ---- Create Snapshot ----

export async function createSnapshot(): Promise<{ ok: boolean; meta: SnapshotMeta; error?: string }> {
  try {
    ensureDir()
    const snapshot: Record<string, any[]> = {}
    const tableSummary: { key: string; rows: number }[] = []

    for (const t of ALL_EXPORT_TABLES) {
      const rows = await fetchAllRows(t.key, t.orderCol)
      snapshot[t.key] = rows
      tableSummary.push({ key: t.key, rows: rows.length })
    }

    const meta: SnapshotMeta = {
      created_at: new Date().toISOString(),
      git_commit: "2c9ee17",
      tables:     tableSummary,
      totalRows:  tableSummary.reduce((s, t) => s + t.rows, 0),
    }

    const payload = { meta, data: snapshot }
    fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(payload), "utf-8")

    return { ok: true, meta }
  } catch (e: any) {
    return { ok: false, meta: {} as SnapshotMeta, error: e.message }
  }
}

// ---- Restore Snapshot ----

export async function restoreSnapshot(selectedTables?: string[]): Promise<{
  ok: boolean
  restored: { key: string; upserted: number; deleted: number }[]
  error?: string
}> {
  if (!fs.existsSync(SNAPSHOT_FILE)) {
    return { ok: false, restored: [], error: "ไม่พบ Snapshot — กด 'สร้าง Snapshot' ก่อน" }
  }

  try {
    const raw  = fs.readFileSync(SNAPSHOT_FILE, "utf-8")
    const snap = JSON.parse(raw)
    const data = snap.data as Record<string, any[]>

    const restored: { key: string; upserted: number; deleted: number }[] = []

    // Generated columns in products that cannot be inserted directly
    const GENERATED_COLS: Record<string, string[]> = {
      products: ["length_cm", "width_cm", "height_cm", "thickness_cm"],
    }

    const tablesToRestore = selectedTables && selectedTables.length > 0
      ? RESTORABLE_TABLES.filter(t => selectedTables.includes(t.key))
      : RESTORABLE_TABLES

    for (const t of tablesToRestore) {
      const rows = data[t.key] ?? []
      const stripCols = GENERATED_COLS[t.key] ?? []
      let upserted = 0
      let deleted  = 0

      // 1. Upsert snapshot rows กลับ (batch 500)
      for (let i = 0; i < rows.length; i += 500) {
        const chunk = rows.slice(i, i + 500).map((r: any) => {
          if (stripCols.length === 0) return r
          const copy = { ...r }
          for (const col of stripCols) delete copy[col]
          return copy
        })
        const { error } = await supabaseAdmin
          .from(t.key)
          .upsert(chunk, { onConflict: t.pk })
        if (error) throw new Error(`upsert ${t.key}: ${error.message}`)
        upserted += chunk.length
      }

      // 2. ลบ rows ที่เกินมาจาก snapshot
      const snapshotIds = new Set(rows.map((r: any) => r[t.pk]))
      const { data: current } = await supabaseAdmin
        .from(t.key)
        .select(t.pk)

      const toDelete = (current ?? [])
        .map((r: any) => r[t.pk])
        .filter((id: any) => !snapshotIds.has(id))

      if (toDelete.length > 0) {
        // batch delete 100 at a time
        for (let i = 0; i < toDelete.length; i += 100) {
          const chunk = toDelete.slice(i, i + 100)
          await supabaseAdmin.from(t.key).delete().in(t.pk, chunk)
        }
        deleted = toDelete.length
      }

      restored.push({ key: t.key, upserted, deleted })
    }

    return { ok: true, restored }
  } catch (e: any) {
    return { ok: false, restored: [], error: e.message }
  }
}

// ---- Export single table (download JSON) ----

export async function exportTable(tableKey: string): Promise<{ data: any[]; error?: string }> {
  const allowed = ALL_EXPORT_TABLES.map(t => t.key)
  if (!allowed.includes(tableKey)) return { data: [], error: "ไม่อนุญาต" }
  try {
    const data = await fetchAllRows(tableKey)
    return { data }
  } catch (e: any) {
    return { data: [], error: e.message }
  }
}
