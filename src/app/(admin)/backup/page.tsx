"use client"

import React, { useState, useEffect } from "react"
import {
  ShieldCheck, Camera, RotateCcw, Download, CheckCircle2,
  Loader2, AlertCircle, Package, RefreshCcw, AlertTriangle,
  Clock, Square, CheckSquare, ChevronDown, ChevronUp,
} from "lucide-react"
import {
  getBackupTableStats, getSnapshotMeta, createSnapshot, restoreSnapshot, exportTable,
  type TableInfo, type SnapshotMeta,
} from "@/actions/backup"

const CRITICAL = ["products", "stock"]

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
  const [snap,     setSnap]     = useState<SnapshotMeta | null>(null)
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

  const fetchAll = async () => {
    setLoading(true)
    const [stats, meta] = await Promise.all([getBackupTableStats(), getSnapshotMeta()])
    setTables(stats)
    setSnap(meta)
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [])

  // ---- Snapshot ----
  const handleSnapshot = async () => {
    if (!confirm("สร้าง Snapshot ตอนนี้เลยไหมครับ?\nจะบันทึกข้อมูลทุก table ไว้บน server")) return
    setSnapBusy(true); setErrorMsg(""); setSuccessMsg(""); setRestoreResult(null)
    const res = await createSnapshot()
    if (!res.ok) {
      setErrorMsg("Snapshot ไม่สำเร็จ: " + res.error)
    } else {
      setSnap(res.meta)
      setSuccessMsg(`✅ Snapshot สำเร็จ! บันทึก ${res.meta.totalRows.toLocaleString()} rows ไว้แล้ว`)
      fetchAll()
    }
    setSnapBusy(false)
  }

  // ---- Restore ----
  const handleRestore = async () => {
    if (!snap) { setErrorMsg("ยังไม่มี Snapshot — กด 'สร้าง Snapshot' ก่อน"); return }
    const keys = Array.from(selectedTables)
    if (keys.length === 0) { setErrorMsg("เลือกตารางที่ต้องการ Restore อย่างน้อย 1 ตาราง"); return }

    const tableLabels = keys.map(k => restorableTables.find(t => t.key === k)?.label ?? k).join(", ")
    if (!confirm(
      `⚠️ Restore ตาราง: ${tableLabels}\n\nจะคืนค่ากลับไปตอน:\n${fmtDT(snap.created_at)}\n\nดำเนินการเลยไหมครับ?`
    )) return

    setRestoreBusy(true); setErrorMsg(""); setSuccessMsg(""); setRestoreResult(null)
    const res = await restoreSnapshot(keys)
    if (!res.ok) {
      setErrorMsg("Restore ไม่สำเร็จ: " + res.error)
    } else {
      setRestoreResult(res.restored)
      setSuccessMsg(`✅ Restore สำเร็จ! คืนค่า ${keys.length} ตาราง เรียบร้อยแล้วครับ`)
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

  const snapRowMap: Record<string, number> = {}
  for (const t of snap?.tables ?? []) snapRowMap[t.key] = t.rows

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
          <p className="text-slate-500 text-sm mt-1">Snapshot ข้อมูลไว้ แล้วเลือก restore ทีละตารางได้</p>
        </div>
        <button onClick={fetchAll} disabled={loading}
          className="p-2 bg-white border border-slate-200 rounded-xl shadow-sm text-slate-400 hover:text-emerald-600 transition">
          <RefreshCcw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Snapshot button */}
      <button
        onClick={handleSnapshot}
        disabled={snapBusy || restoreBusy}
        className="w-full group relative bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-[2rem] p-6 flex items-center gap-4 transition shadow-lg shadow-indigo-200 text-left"
      >
        <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
          {snapBusy ? <Loader2 className="w-6 h-6 animate-spin" /> : <Camera className="w-6 h-6" />}
        </div>
        <div className="flex-1">
          <div className="text-lg font-black">📸 สร้าง Snapshot</div>
          <div className="text-indigo-200 text-sm mt-0.5">
            {snap
              ? `Snapshot ล่าสุด: ${fmtDT(snap.created_at)} · ${snap.totalRows.toLocaleString()} rows`
              : "บันทึกสถานะ DB ทั้งหมดไว้บน server ตอนนี้เลย"}
          </div>
        </div>
        {snap && <CheckCircle2 className="w-5 h-5 text-indigo-300 shrink-0" />}
      </button>

      {/* ===== RESTORE SECTION ===== */}
      {snap && (
        <div className="bg-white rounded-[1.5rem] border-2 border-rose-200 shadow-sm overflow-hidden">

          {/* Restore header toggle */}
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
                <Clock className="w-3 h-3" />
                จะคืนกลับไปตอน {fmtDT(snap.created_at)}
                {selectedTables.size > 0 && (
                  <span className="ml-2 font-black text-rose-600">· เลือก {selectedTables.size} ตาราง</span>
                )}
              </div>
            </div>
            {showRestorePanel
              ? <ChevronUp className="w-5 h-5 text-slate-400 shrink-0" />
              : <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" />}
          </button>

          {showRestorePanel && (
            <div className="border-t border-slate-100 p-5 space-y-4">

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

              {/* Table checkboxes */}
              <div className="space-y-2">
                {restorableTables.map(t => {
                  const isSelected  = selectedTables.has(t.key)
                  const isCritical  = CRITICAL.includes(t.key)
                  const snapRows    = snapRowMap[t.key] ?? 0
                  const currentRows = t.count
                  const diff        = currentRows - snapRows

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
                      </div>

                      {/* Snapshot vs Current */}
                      <div className="text-right text-[11px] shrink-0 space-y-0.5">
                        <div className="text-slate-500">
                          Snapshot: <span className="font-black text-indigo-600">{snapRows.toLocaleString()}</span>
                        </div>
                        <div className="text-slate-500">
                          ปัจจุบัน: <span className="font-black text-slate-700">{currentRows.toLocaleString()}</span>
                        </div>
                        {diff !== 0 && (
                          <div className={`font-black ${diff > 0 ? "text-orange-500" : "text-blue-500"}`}>
                            {diff > 0 ? `+${diff.toLocaleString()} เพิ่มมา` : `${diff.toLocaleString()} น้อยกว่า`}
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
                  : `🔄 Restore ${selectedTables.size} ตาราง กลับไปตอน Snapshot`}
              </button>

              <p className="text-[11px] text-slate-400 text-center">
                ระบบจะ upsert ข้อมูลจาก Snapshot กลับมา และลบ rows ที่เพิ่มมาหลัง Snapshot
              </p>
            </div>
          )}
        </div>
      )}

      {/* Success / Error messages */}
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

      {/* Restore result detail */}
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

      {/* ===== Export table list ===== */}
      <div className="space-y-3">
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

      {/* Warning note */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-800 space-y-1">
          <p className="font-black">หมายเหตุ</p>
          <p>Restore ทีละตาราง — เลือกเฉพาะที่ต้องการได้เลย ไม่ต้องคืนทั้งหมด</p>
          <p><b>ไม่แตะ:</b> profiles, sales, sale_items (operational data)</p>
          <p>Snapshot บันทึกไว้ที่ <code className="bg-amber-100 px-1 rounded font-mono">data/snapshots/latest.json</code></p>
        </div>
      </div>
    </div>
  )
}
