"use server"

import { supabaseAdmin } from "@/lib/supabase/admin"
import fs from "fs"
import path from "path"

// ---- Constants ----

const SNAPSHOT_DIR  = path.join(process.cwd(), "data", "snapshots")

// Tables ที่ snapshot+restore ได้ (เรียงตาม FK order — parent ก่อน)
const RESTORABLE_TABLES = [
  { key: "branches",                  label: "Branches",                  pk: "id",         orderCol: "id" },
  { key: "collection_groups",         label: "Collection Groups",         pk: "id",         orderCol: "id" },
  { key: "products",                  label: "Products",                  pk: "id",         orderCol: "id" },
  { key: "discounts",                 label: "Discounts",                 pk: "id",         orderCol: "id" },
  { key: "discount_rules",            label: "Discount Rules",            pk: "id",         orderCol: "id" },
  { key: "stock",                     label: "Stock",                     pk: "id",         orderCol: "id" },
  { key: "stock_lots",                label: "Stock Lots",                pk: "id",         orderCol: "id" },
  { key: "stock_lot_items",           label: "Stock Lot Items",           pk: "id",         orderCol: "id" },
  { key: "stock_movements",           label: "Stock Movements",           pk: "id",         orderCol: "id" },
  { key: "stock_receiving",           label: "Stock Receiving",           pk: "id",         orderCol: "id" },
  { key: "product_rfid_tags",         label: "RFID Tags",                 pk: "id",         orderCol: "id" },
  { key: "reader_stock",              label: "Reader Stock",              pk: "product_id", orderCol: "product_id" },
  { key: "reader_count_scans",        label: "Reader Count Scans",        pk: "rfid",       orderCol: "rfid" },
  { key: "stock_initial_counts",      label: "Stock Initial Counts",      pk: "id",         orderCol: "id" }, 
  { key: "stock_initial_count_items", label: "Stock Initial Items",       pk: "id",         orderCol: "id" }, 
  { key: "stock_transfers",           label: "Stock Transfers",           pk: "id",         orderCol: "id" },
  { key: "stock_transfer_items",      label: "Stock Transfer Items",      pk: "id",         orderCol: "id" },
]

// Tables ที่ export ได้ แต่ไม่ restore
const EXPORT_ONLY_TABLES = [
  { key: "profiles",          label: "Profiles",           orderCol: "user_id" },
  { key: "customers",         label: "Customers",          orderCol: "id" },
  { key: "sale_dasbrode",     label: "Sale Dashboard",     orderCol: "day" },
  { key: "orders",            label: "Orders",             orderCol: "id" },
  { key: "order_items",       label: "Order Items",        orderCol: "id" },
  { key: "cart_items",        label: "Cart Items",         orderCol: "id" },
  { key: "favorites",         label: "Favorites",          orderCol: "id" },
  { key: "site_gallery",      label: "Site Gallery",       orderCol: "id" },
  { key: "summary_daily",     label: "Summary Daily",      orderCol: "period_key" },
  { key: "summary_weekly",    label: "Summary Weekly",     orderCol: "period_key" },
  { key: "summary_monthly",   label: "Summary Monthly",    orderCol: "period_key" },
]

const ALL_EXPORT_TABLES = [...RESTORABLE_TABLES, ...EXPORT_ONLY_TABLES]

export interface TableInfo {
  key: string
  label: string
  description: string
  count: number
  restorable: boolean
}

export interface SnapshotMeta {
  id: string
  note?: string
  created_at: string
  git_commit: string
  tables: { key: string; rows: number }[]
  totalRows: number
}

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

const TABLE_DESC: Record<string, string> = {
  branches:                   "ข้อมูลสาขา",
  collection_groups:          "กลุ่มคอลเลกชันสินค้า",
  products:                   "สินค้าทั้งหมด ⭐ สำคัญที่สุด",
  discounts:                  "โปรโมชั่น/ส่วนลด",
  discount_rules:             "เงื่อนไขส่วนลด",
  stock:                      "สต็อกสินค้าแต่ละสาขา",
  stock_lots:                 "ลอตการรับสินค้า",
  stock_lot_items:            "รายการสินค้าในแต่ละลอต",
  stock_movements:            "ประวัติการเคลื่อนไหวสต็อก",
  stock_receiving:            "ข้อมูลการรับสินค้า",
  product_rfid_tags:          "RFID Tag ทุกตัว ⭐ สำคัญ",
  reader_stock:               "สต็อกจาก Reader",
  reader_count_scans:         "ประวัติการ Scan นับสต็อก",
  stock_initial_counts:       "หัวใบนับสต็อกตั้งต้น",
  stock_initial_count_items:  "รายการนับสต็อกตั้งต้น",
  stock_transfers:            "ใบโอนย้ายสินค้าระหว่างสาขา",
  stock_transfer_items:       "รายการสินค้าในใบโอนย้าย",
  profiles:                   "ข้อมูลพนักงาน (export only)",
  customers:                  "ข้อมูลลูกค้า (export only)",
  sale_dasbrode:              "สรุปยอดขายรายวัน (export only)",
  orders:                     "ออเดอร์ (export only)",
  order_items:                "รายการออเดอร์ (export only)",
  cart_items:                 "ตะกร้าสินค้า (export only)",
  favorites:                  "สินค้าโปรด (export only)",
  site_gallery:               "รูปภาพบนเว็บ (export only)",
  summary_daily:              "สรุปข้อมูลรายวัน (export only)",
  summary_weekly:             "สรุปข้อมูลรายสัปดาห์ (export only)",
  summary_monthly:            "สรุปข้อมูลรายเดือน (export only)",
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

// ✅ อัปเดตฟังก์ชันดึงไฟล์ ให้ดักจับไฟล์รุ่นเก่า
export async function getSnapshotMeta(): Promise<SnapshotMeta[]> {
  if (!fs.existsSync(SNAPSHOT_DIR)) return []
  try {
    const files = fs.readdirSync(SNAPSHOT_DIR).filter(f => f.endsWith(".json"))
    const snapshots: SnapshotMeta[] = []

    for (const file of files) {
      try {
        const raw = fs.readFileSync(path.join(SNAPSHOT_DIR, file), "utf-8")
        const snap = JSON.parse(raw)
        
        if (snap.meta) {
          // 🌟 ดักจับไฟล์ latest.json (หรือไฟล์เก่าที่ไม่มี id) ให้เป็นตัว MASTER
          if (!snap.meta.id) {
            snap.meta.id = file.replace('.json', '') // กลายเป็น id = 'latest'
            snap.meta.note = file === 'latest.json' ? '⭐ MASTER (จุดเซฟก่อนหน้า)' : 'เซฟรุ่นเก่า'
          }
          snapshots.push(snap.meta as SnapshotMeta)
        }
      } catch (err) {
        console.error("ข้ามไฟล์ที่พัง:", file)
      }
    }

    return snapshots.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  } catch { 
    return [] 
  }
}

export async function createSnapshot(note: string = ""): Promise<{ ok: boolean; meta: SnapshotMeta; error?: string }> {
  try {
    ensureDir()
    const snapshot: Record<string, any[]> = {}
    const tableSummary: { key: string; rows: number }[] = []

    for (const t of ALL_EXPORT_TABLES) {
      const rows = await fetchAllRows(t.key, t.orderCol)
      snapshot[t.key] = rows
      tableSummary.push({ key: t.key, rows: rows.length })
    }

    const snapId = `snap_${Date.now()}`
    
    const meta: SnapshotMeta = {
      id: snapId,
      note: note,
      created_at: new Date().toISOString(),
      git_commit: "unknown",
      tables:     tableSummary,
      totalRows:  tableSummary.reduce((s, t) => s + t.rows, 0),
    }

    const payload = { meta, data: snapshot }
    const filePath = path.join(SNAPSHOT_DIR, `${snapId}.json`)
    
    fs.writeFileSync(filePath, JSON.stringify(payload), "utf-8")

    return { ok: true, meta }
  } catch (e: any) {
    return { ok: false, meta: {} as SnapshotMeta, error: e.message }
  }
}
// ✅ ฟังก์ชัน RestoreSnapshot รุ่นแก้ไขดึงข้อมูลทะลุลิมิต 1,000 rows และลบย้อนกลับลำดับ FK
export async function restoreSnapshot(snapId: string, selectedTables?: string[]): Promise<{
  ok: boolean
  restored: { key: string; upserted: number; deleted: number }[]
  error?: string
}> {
  const filePath = path.join(SNAPSHOT_DIR, `${snapId}.json`)
  
  if (!fs.existsSync(filePath)) {
    return { ok: false, restored: [], error: "ไม่พบไฟล์ Snapshot นี้บน Server" }
  }

  try {
    const raw  = fs.readFileSync(filePath, "utf-8")
    const snap = JSON.parse(raw)
    const data = snap.data as Record<string, any[]>

    const restored: { key: string; upserted: number; deleted: number }[] = []

    // Generated columns ที่ห้าม insert ค่าเข้าไปตรงๆ
    const GENERATED_COLS: Record<string, string[]> = {
      products: ["length_cm", "width_cm", "height_cm", "thickness_cm"],
      stock_transfer_items: ["variance_qty"], 
    }

    const tablesToRestore = selectedTables && selectedTables.length > 0
      ? RESTORABLE_TABLES.filter(t => selectedTables.includes(t.key))
      : RESTORABLE_TABLES

    // เตรียมตัวแปรเก็บสถิติแยกตามตาราง
    const stats: Record<string, { upserted: number; deleted: number }> = {}
    for (const t of tablesToRestore) {
      stats[t.key] = { upserted: 0, deleted: 0 }
    }

    // ==========================================
    // Phase 1: ไล่ UPSERT ข้อมูล (เดินหน้า แม่ -> ลูก)
    // ==========================================
    for (const t of tablesToRestore) {
      const rows = data[t.key] ?? []
      const stripCols = GENERATED_COLS[t.key] ?? []

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
        stats[t.key].upserted += chunk.length
      }
    }

    // ==========================================
    // Phase 2: ไล่ DELETE ตัวส่วนเกิน (ถอยหลัง ลูก -> แม่)
    // ==========================================
    // ทำการกลับลำดับอาร์เรย์ เพื่อเคลียร์ข้อมูลตารางลูกก่อน จะได้ไม่ติดบล็อก Foreign Key ของตารางแม่
    const reversedTables = [...tablesToRestore].reverse()

    for (const t of reversedTables) {
      const rows = data[t.key] ?? []
      const snapshotIds = new Set(rows.map((r: any) => r[t.pk]))

      // 🌟 ดึง ID ปัจจุบันทั้งหมดใน Database แบบวนลูปดักจับทะลุลิมิต 1,000 แถว
      let currentIds: any[] = []
      let fetchFrom = 0
      
      while (true) {
        const { data: currentData, error: fetchErr } = await supabaseAdmin
          .from(t.key)
          .select(t.pk)
          .range(fetchFrom, fetchFrom + 999)
          
        if (fetchErr) throw new Error(`[Fetch ${t.key}] ${fetchErr.message}`)
        if (!currentData || currentData.length === 0) break
        
        currentIds.push(...currentData.map(r => r[t.pk as keyof typeof r]))
        if (currentData.length < 1000) break
        fetchFrom += 1000
      }

      // เปรียบเทียบเพื่อหา ID ที่เกิดใหม่และไม่มีอยู่ในไฟล์จุดเซฟรอบ MASTER
      const toDelete = currentIds.filter(id => !snapshotIds.has(id))

      if (toDelete.length > 0) {
        for (let i = 0; i < toDelete.length; i += 100) {
          const chunk = toDelete.slice(i, i + 100)
          
          const { error } = await supabaseAdmin.from(t.key).delete().in(t.pk, chunk)
          
          if (error) {
            // ปริ้นท์รายงานความผิดพลาดลงที่จอดำ Terminal ทันทีเมื่อสั่งลบติดปัญหา
            console.log("\n========================================")
            console.log(`🚨 เด้งเออเรอแล้วนาย! ลบข้อมูลในตาราง [${t.key}] ไม่สำเร็จ เนื่องจาก:`)
            console.dir(error, { depth: null }) 
            console.log("========================================\n")
            
            throw new Error(`ลบข้อมูลตาราง ${t.key} ไม่สำเร็จ! เกิดจาก: ${error.message}`)
          }
        }
        stats[t.key].deleted = toDelete.length
      }
    }

    // ประกอบข้อมูลสถิติเรียงกลับตามลำดับเดิมเพื่อส่งคืนโครงสร้างหน้าบ้าน
    for (const t of tablesToRestore) {
      restored.push({
        key: t.key,
        upserted: stats[t.key].upserted,
        deleted: stats[t.key].deleted
      })
    }

    return { ok: true, restored }
  } catch (e: any) {
    return { ok: false, restored: [], error: e.message }
  }
}
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