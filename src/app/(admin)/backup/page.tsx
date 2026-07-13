"use client"

import React, { useState, useEffect } from "react"
import {
  ShieldCheck, Camera, RotateCcw, Download, CheckCircle2,
  Loader2, AlertCircle, Package, RefreshCcw, AlertTriangle,
  Clock, Square, CheckSquare, ChevronDown, ChevronUp, Link2, FileText, History
} from "lucide-react"
import {
  getBackupTableStats, getSnapshotMeta, createSnapshot, restoreSnapshot, exportTable,
  type TableInfo
} from "@/actions/backup"

// ✅ 1. เพิ่มฟิลด์ id และ note เข้าไปใน Interface
export interface SnapshotMeta {
  id: string; // เช่น ชื่อไฟล์ snap_1716900000.json
  created_at: string;
  totalRows: number;
  note?: string; // โน้ตที่พนักงานพิมพ์ไว้
  tables: { key: string, rows: number }[];
}

const CRITICAL = ["products", "stock", "orders"]

// ✅ 2. อัปเดต Table Relations ตาม Schema ล่าสุดที่นายให้มา
const TABLE_RELATIONS: Record<string, string[]> = {
  products: ["collection_groups"],
  stock: ["products", "branches"],
  stock_lots: ["branches", "profiles"],
  stock_lot_items: ["stock_lots", "products"],
  stock_movements: ["products", "branches", "stock_lots", "profiles"],
  stock_receiving: ["products", "branches", "stock_lots"],
  product_rfid_tags: ["products", "stock_lots"],
  discount_rules: ["discounts", "branches", "products"],
  reader_stock: ["products"],
  reader_count_scans: ["products"],
  stock_initial_counts: ["branches", "profiles"],
  stock_initial_count_items: ["stock_initial_counts", "products"],
  profiles: ["branches"],
  orders: ["profiles", "branches", "customers"],
  order_items: ["orders", "products", "branches"], // + fulfill_branch_id
  cart_items: ["products"],
  favorites: ["products"],
  stock_transfers: ["branches", "profiles"], // ตารางใหม่
  stock_transfer_items: ["stock_transfers", "products"], // ตารางใหม่
  sale_dasbrode: ["branches"],
  boxes: [],
  search_targets: ["products", "branches"],
  damaged_goods_records: ["products", "branches", "profiles"],
  deleted_rfid_tags: [],
  system_settings: []
}

function downloadJSON(data: any, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement("a")
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

const fmtDT = (iso: string) =>
  new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso))

export default function BackupPage() {
  const [tables,   setTables]   = useState<TableInfo[]>([])
  
  // ✅ 3. เปลี่ยน State รองรับแบบ Array และตัวแปรเก็บ Snapshot ที่กำลังเลือกดู
  const [snapshots,  setSnapshots]  = useState<SnapshotMeta[]>([])
  const [activeSnapId, setActiveSnapId] = useState<string>("") 
  const [memoText,   setMemoText]   = useState("") // State สำหรับพิมพ์โน้ต
  
  const [loading,  setLoading]  = useState(true)
  const [snapBusy,    setSnapBusy]    = useState(false)
  const [restoreBusy, setRestoreBusy] = useState(false)
  const [exportBusy,  setExportBusy]  = useState<Record<string, boolean>>({})
  const [exportDone,  setExportDone]  = useState<Record<string, boolean>>({})

  const [selectedTables, setSelectedTables] = useState<Set<string>>(new Set())
  const [showRestorePanel, setShowRestorePanel] = useState(false)

  const [restoreResult, setRestoreResult] = useState<{ key: string; upserted: number; deleted: number }[] | null>(null)
  const [errorMsg,      setErrorMsg]      = useState("")
  const [successMsg,    setSuccessMsg]    = useState("")

  const restorableTables = tables.filter(t => t.restorable)
  
  // หา Snapshot ปัจจุบันที่กำลังแสดงผลบน UI
  const activeSnap = snapshots.find(s => s.id === activeSnapId) || snapshots[0]

  const fetchAll = async () => {
    setLoading(true)
    // *นายต้องไปแก้ getSnapshotMeta หลังบ้านให้ return เป็น Array SnapshotMeta[] นะครับ*
    const [stats, metaArray] = await Promise.all([getBackupTableStats(), getSnapshotMeta()])
    setTables(stats)
    
    // สมมติว่า metaArray คือ Array (เรียงจากใหม่สุดไปเก่าสุด)
    if (Array.isArray(metaArray) && metaArray.length > 0) {
      setSnapshots(metaArray)
      if (!activeSnapId) setActiveSnapId(metaArray[0].id)
    }
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [])

  // ---- Snapshot ----
  const handleSnapshot = async () => {
    if (!memoText.trim()) {
      alert("รบกวนระบุโน้ตกันลืมหน่อยครับนาย จะได้รู้ว่าเซฟไว้ทำไม (เช่น ก่อนอัปเดตระบบโอนย้าย)")
      return
    }
    if (!confirm(`สร้าง Snapshot พร้อมโน้ต: "${memoText}"\nยืนยันไหมครับ?`)) return
    
    setSnapBusy(true); setErrorMsg(""); setSuccessMsg(""); setRestoreResult(null)
    
    // *นายต้องไปแก้ createSnapshot ให้รับ String (memoText) ด้วยนะ*
    const res = await createSnapshot(memoText) 
    
    if (!res.ok) {
      setErrorMsg("Snapshot ไม่สำเร็จ: " + res.error)
    } else {
      setSuccessMsg(`✅ Snapshot สำเร็จ! บันทึกพร้อมโน้ตเรียบร้อย`)
      setMemoText("") // ล้างช่อง
      fetchAll() // รีเฟรชลิสต์ใหม่
    }
    setSnapBusy(false)
  }

  // ---- Restore ----
  const handleRestore = async () => {
    if (!activeSnap) { setErrorMsg("ไม่พบข้อมูล Snapshot ที่เลือก"); return }
    const keys = Array.from(selectedTables)
    if (keys.length === 0) { setErrorMsg("เลือกตารางที่ต้องการ Restore อย่างน้อย 1 ตาราง"); return }

    const tableLabels = keys.map(k => restorableTables.find(t => t.key === k)?.label ?? k).join(", ")
    if (!confirm(
      `⚠️ Restore กลับไปยังเซฟ: "${activeSnap.note || 'ไม่มีโน้ต'}"\nเวลา: ${fmtDT(activeSnap.created_at)}\nตาราง: ${tableLabels}\n\nดำเนินการเลยไหมครับ?`
    )) return

    setRestoreBusy(true); setErrorMsg(""); setSuccessMsg(""); setRestoreResult(null)
    
    // *ตรงนี้นายอาจจะต้องส่ง activeSnap.id ไปด้วย เพื่อให้หลังบ้านรู้ว่าหยิบไฟล์ไหนมา Restore*
    const res = await restoreSnapshot(activeSnap.id, keys) 
    
    if (!res.ok) {
      setErrorMsg("Restore ไม่สำเร็จ: " + res.error)
    } else {
      setRestoreResult(res.restored)
      setSuccessMsg(`✅ Restore สำเร็จ! คืนค่า ${keys.length} ตาราง จากรอบ "${activeSnap.note}" เรียบร้อยแล้วครับ`)
      fetchAll()
    }
    setRestoreBusy(false)
  }

  const toggleTable = (key: string) => {
    setSelectedTables(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const selectAll = () => setSelectedTables(new Set(restorableTables.map(t => t.key)))
  const clearAll  = () => setSelectedTables(new Set())

  // ---- Export single table ----
  const handleExport = async (key: string, label: string) => {
    setExportBusy(p => ({ ...p, [key]: true }))
    const res = await exportTable(key)
    if (res.error) { setErrorMsg(res.error) }
    else {
      downloadJSON(res.data, `${key}-${new Date().toISOString().slice(0, 10)}.json`)
      setExportDone(p => ({ ...p, [key]: true }))
      setTimeout(() => setExportDone(p => ({ ...p, [key]: false })), 3000)
    }
    setExportBusy(p => ({ ...p, [key]: false }))
  }

  // ✅ 4. ดึงข้อมูลจำนวน Row ของ Snapshot ที่เลือกมาคำนวณ Diff
  const snapRowMap: Record<string, number> = {}
  for (const t of activeSnap?.tables ?? []) snapRowMap[t.key] = t.rows

  const totalRows = tables.reduce((s, t) => s + t.count, 0)

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6 pb-20">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-emerald-600" />
            Backup & Restore
          </h1>
          <p className="text-slate-500 text-sm mt-1">เก็บบันทึกประวัติฐานข้อมูล พร้อมระบุโน้ตกันลืม</p>
        </div>
        <button onClick={fetchAll} disabled={loading}
          className="p-2 bg-white border border-slate-200 rounded-xl shadow-sm text-slate-400 hover:text-emerald-600 transition">
          <RefreshCcw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* ===== CREATION SECTION ===== */}
      <div className="bg-white rounded-[1.5rem] border border-indigo-100 shadow-sm p-6 space-y-4">
        <h2 className="text-sm font-black text-indigo-900 flex items-center gap-2">
          <Camera className="w-5 h-5 text-indigo-500" />
          สร้างจุดเซฟใหม่ (New Snapshot)
        </h2>
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <FileText className="w-4 h-4 text-slate-400" />
            </div>
            <input
              type="text"
              value={memoText}
              onChange={(e) => setMemoText(e.target.value)}
              placeholder="ระบุเหตุผล (เช่น เซฟก่อนลบสินค้า, ก่อนขึ้นฟีเจอร์ใหม่...)"
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all"
            />
          </div>
          <button
            onClick={handleSnapshot}
            disabled={snapBusy || restoreBusy || !memoText.trim()}
            className="md:w-auto w-full group relative bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl px-6 py-3 font-bold text-sm flex items-center justify-center gap-2 transition shadow-md shadow-indigo-200 shrink-0"
          >
            {snapBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : "บันทึก Snapshot"}
          </button>
        </div>
      </div>

      {/* ===== RESTORE SECTION ===== */}
      {snapshots.length > 0 && (
        <div className="bg-white rounded-[1.5rem] border-2 border-rose-200 shadow-sm overflow-hidden">
          
          <button
            onClick={() => setShowRestorePanel(v => !v)}
            className="w-full flex items-center gap-4 p-5 text-left hover:bg-rose-50/50 transition"
          >
            <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center shrink-0">
              <RotateCcw className="w-5 h-5 text-rose-600" />
            </div>
            <div className="flex-1">
              <div className="font-black text-slate-800">🔄 Restore กลับมา</div>
              <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                <History className="w-3 h-3" />
                มีจุดเซฟทั้งหมด {snapshots.length} รายการ
              </div>
            </div>
            {showRestorePanel
              ? <ChevronUp className="w-5 h-5 text-slate-400 shrink-0" />
              : <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" />}
          </button>

          {showRestorePanel && (
            <div className="border-t border-slate-100 p-5 space-y-5">

              {/* ✅ Selector สำหรับเลือกจุดเซฟ */}
              <div className="bg-rose-50/50 rounded-xl p-4 border border-rose-100 space-y-3">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <Clock className="w-4 h-4 text-rose-500" />
                  เลือกช่วงเวลาที่ต้องการย้อนกลับไป
                </label>
                <select
                  value={activeSnapId}
                  onChange={(e) => setActiveSnapId(e.target.value)}
                  className="w-full bg-white border border-slate-200 text-slate-700 text-sm rounded-lg px-4 py-2.5 font-bold outline-none cursor-pointer focus:ring-2 focus:ring-rose-100"
                >
                  {snapshots.map(s => (
                    <option key={s.id} value={s.id}>
                      {fmtDT(s.created_at)} — {s.note || "ไม่มีโน้ต"} ({s.totalRows.toLocaleString()} rows)
                    </option>
                  ))}
                </select>
                {activeSnap && activeSnap.note && (
                  <p className="text-xs text-slate-500 italic flex gap-1">
                    <span className="font-bold text-slate-600">โน้ต:</span> {activeSnap.note}
                  </p>
                )}
              </div>

              {/* Select all / clear */}
              <div className="flex items-center justify-between">
                <p className="text-xs font-black text-slate-500 uppercase tracking-widest">เลือกตารางที่จะ Restore</p>
                <div className="flex gap-2">
                  <button onClick={selectAll} className="text-[11px] font-bold px-3 py-1 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition">
                    เลือกทั้งหมด
                  </button>
                  <button onClick={clearAll} className="text-[11px] font-bold px-3 py-1 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition">
                    ยกเลิก
                  </button>
                </div>
              </div>

              {/* Table checkboxes (เปรียบเทียบกับ activeSnap) */}
              <div className="space-y-2">
                {restorableTables.map(t => {
                  const isSelected  = selectedTables.has(t.key)
                  const isCritical  = CRITICAL.includes(t.key)
                  const snapRows    = snapRowMap[t.key] ?? 0
                  const currentRows = t.count
                  const diff        = currentRows - snapRows
                  const relations   = TABLE_RELATIONS[t.key] || []

                  return (
                    <button
                      key={t.key}
                      onClick={() => toggleTable(t.key)}
                      className={`w-full flex items-center gap-3 p-3 rounded-2xl border-2 transition text-left ${
                        isSelected
                          ? "border-rose-400 bg-rose-50"
                          : "border-slate-100 bg-white hover:border-slate-300"
                      }`}
                    >
                      {isSelected
                        ? <CheckSquare className="w-5 h-5 text-rose-500 shrink-0" />
                        : <Square className="w-5 h-5 text-slate-300 shrink-0" />}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-slate-800 text-sm">{t.label}</span>
                          {isCritical && (
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 uppercase">สำคัญ</span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">{t.description}</p>
                        
                        {relations.length > 0 && (
                          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                            <Link2 className="w-3 h-3 text-slate-300" />
                            <span className="text-[9px] text-slate-400 font-medium">อ้างอิง:</span>
                            {relations.map(rel => (
                              <span key={rel} className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-50/80 text-indigo-500 border border-indigo-100">
                                {rel}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Snapshot vs Current */}
                      <div className="text-right text-[11px] shrink-0 space-y-0.5">
                        <div className="text-slate-500">
                          ในเซฟนี้: <span className="font-black text-indigo-600">{snapRows.toLocaleString()}</span>
                        </div>
                        <div className="text-slate-500">
                          ปัจจุบัน: <span className="font-black text-slate-700">{currentRows.toLocaleString()}</span>
                        </div>
                        {diff !== 0 && (
                          <div className={`font-black ${diff > 0 ? "text-orange-500" : "text-blue-500"}`}>
                            {diff > 0 ? `+${diff.toLocaleString()} เพิ่มมา` : `${Math.abs(diff).toLocaleString()} น้อยกว่า`}
                          </div>
                        )}
                        {diff === 0 && (
                          <div className="text-emerald-500 font-bold">= ตรงกัน</div>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Restore button */}
              <button
                onClick={handleRestore}
                disabled={restoreBusy || selectedTables.size === 0}
                className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition shadow-md shadow-rose-200"
              >
                {restoreBusy
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> กำลัง Restore...</>
                  : selectedTables.size === 0
                  ? "เลือกตารางก่อนครับ"
                  : `🔄 Restore ${selectedTables.size} ตาราง (จากเซฟที่เลือก)`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Success / Error messages (ส่วนนี้เหมือนเดิม แค่ย้ายตำแหน่งให้ดูเนียนขึ้น) */}
      {successMsg && (
        <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-emerald-800">
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600" />
          <span className="text-sm font-bold">{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="flex items-start gap-3 bg-rose-50 border border-rose-200 rounded-2xl p-4 text-rose-700">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span className="text-sm font-bold">{errorMsg}</span>
        </div>
      )}

      {/* Restore result detail (เหมือนเดิม) */}
      {restoreResult && (
        <div className="bg-white rounded-[1.5rem] border border-emerald-200 shadow-sm p-5 space-y-3">
          <h3 className="text-sm font-black text-slate-700">ผล Restore</h3>
          <div className="space-y-2">
            {restoreResult.map(r => (
              <div key={r.key} className="flex items-center gap-3 text-xs bg-slate-50 rounded-xl px-4 py-2.5">
                <span className="font-mono font-bold text-slate-600 w-36">{r.key}</span>
                <span className="text-emerald-700 font-bold">↑ {r.upserted.toLocaleString()} rows คืนค่า</span>
                {r.deleted > 0 && (
                  <span className="text-rose-600 font-bold">✕ {r.deleted.toLocaleString()} rows ลบออก</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== Export table list (เหมือนเดิม) ===== */}
      <div className="space-y-3 pt-6 border-t border-slate-200">
        <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 px-1">
          Export ทีละ Table (ไฟล์ JSON)
          {!loading && <span className="ml-2 text-slate-300">· {totalRows.toLocaleString()} rows รวม</span>}
        </h2>
        {loading ? (
          <div className="py-12 flex items-center justify-center gap-3 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm">กำลังโหลด...</span>
          </div>
        ) : (
          tables.map(t => {
            const isCritical = CRITICAL.includes(t.key)
            const isBusy     = exportBusy[t.key]
            const isDone     = exportDone[t.key]
            const relations  = TABLE_RELATIONS[t.key] || []

            return (
              <div key={t.key}
                className={`bg-white rounded-[1.5rem] border-2 shadow-sm p-4 flex items-center gap-4 ${
                  isCritical ? "border-amber-200" : "border-slate-100"
                }`}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  isCritical ? "bg-amber-100" : "bg-slate-100"
                }`}>
                  <Package className={`w-4 h-4 ${isCritical ? "text-amber-600" : "text-slate-400"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-black text-slate-800 text-sm">{t.label}</span>
                    {isCritical && <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 uppercase">สำคัญ</span>}
                    {t.restorable
                      ? <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 uppercase">restorable</span>
                      : <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 uppercase">export only</span>}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">{t.description} · {t.count.toLocaleString()} rows</p>
                  
                  {relations.length > 0 && (
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      <Link2 className="w-3 h-3 text-slate-300" />
                      <span className="text-[9px] text-slate-400 font-medium">อ้างอิง:</span>
                      {relations.map(rel => (
                        <span key={rel} className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 border border-slate-200">
                          {rel}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleExport(t.key, t.label)}
                  disabled={isBusy}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-xs transition shrink-0 ${
                    isDone
                      ? "bg-emerald-100 text-emerald-700"
                      : "border-2 border-slate-200 text-slate-600 hover:border-indigo-400 hover:text-indigo-600"
                  } disabled:opacity-40`}
                >
                  {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : isDone ? <CheckCircle2 className="w-3.5 h-3.5" />
                  : <Download className="w-3.5 h-3.5" />}
                  {isDone ? "โหลดแล้ว" : "Export"}
                </button>
              </div>
            )
          })
        )}
      </div>

    </div>
  )
}