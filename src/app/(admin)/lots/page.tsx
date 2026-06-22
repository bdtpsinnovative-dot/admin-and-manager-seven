"use client"

import React, { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import {
  Package, Plus, Send, Trash2, Eye, RefreshCcw,
  ChevronLeft, ChevronRight, Loader2, AlertCircle,
  CheckCircle2, Clock, RotateCw, AlertTriangle, AlertOctagon, X
} from "lucide-react"
import { 
  getLots, getBranches, sendLot, deleteLot, 
  getLotRollbackPreview, rollbackAndDeleteLot,
  type StockLot, type Branch 
} from "@/actions/lots"

const STATUS_MAP: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  DRAFT:      { label: "ร่าง",       cls: "bg-slate-100 text-slate-600 border-slate-200",    icon: <Clock className="w-3 h-3" /> },
  SENT:       { label: "ส่งแล้ว",      cls: "bg-blue-50 text-blue-700 border-blue-200",         icon: <Send className="w-3 h-3" /> },
  RECEIVING:  { label: "กำลังรับ",     cls: "bg-amber-50 text-amber-700 border-amber-200",      icon: <RotateCw className="w-3 h-3" /> },
  PARTIAL:    { label: "รับบางส่วน",   cls: "bg-orange-50 text-orange-700 border-orange-200",   icon: <AlertTriangle className="w-3 h-3" /> },
  COMPLETED:  { label: "ครบแล้ว",      cls: "bg-emerald-50 text-emerald-700 border-emerald-200",icon: <CheckCircle2 className="w-3 h-3" /> },
  
  // 👇 เพิ่มบรรทัดนี้เข้าไปครับ เพื่อให้ระบบรู้จักคำว่า SUCCESS
  SUCCESS:    { label: "สำเร็จ",      cls: "bg-teal-50 text-teal-700 border-teal-200",         icon: <CheckCircle2 className="w-3 h-3" /> },
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] ?? STATUS_MAP.DRAFT
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-lg border uppercase tracking-wide ${s.cls}`}>
      {s.icon}{s.label}
    </span>
  )
}

const fmtDate = (d: string) =>
  new Intl.DateTimeFormat("th-TH", { day: "2-digit", month: "short", year: "2-digit" }).format(new Date(d))

const fmtQty = (n: number) => n.toLocaleString("th-TH")

export default function LotsPage() {
  const [lots, setLots]         = useState<StockLot[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage]         = useState(1)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [filterBranch, setFilterBranch] = useState<number | undefined>()
  const [filterStatus, setFilterStatus] = useState<string | undefined>()
  const [busy, setBusy]         = useState<number | null>(null)

  // ---- State สำหรับหน้าต่าง Rollback ----
  const [rollbackLot, setRollbackLot] = useState<{ id: number; code: string } | null>(null)
  const [rollbackPreview, setRollbackPreview] = useState<any[]>([])
  const [previewLoading, setPreviewLoading] = useState(false)
  const [isRollingBack, setIsRollingBack] = useState(false)

  const pageSize = 20
  const pageAll  = Math.max(1, Math.ceil(totalCount / pageSize))

  const fetchData = useCallback(async (p = 1) => {
    setLoading(true); setError(null)
    const res = await getLots({ branch_id: filterBranch, status: filterStatus, page: p })
    if (res.error) { setError(res.error) }
    else { setLots(res.data); setTotalCount(res.count) }
    setLoading(false)
  }, [filterBranch, filterStatus])

  useEffect(() => { getBranches().then(setBranches) }, [])
  useEffect(() => { setPage(1); fetchData(1) }, [fetchData])

  const handleSend = async (id: number) => {
    if (!confirm("ส่งลอตนี้ไปยังสาขาเลยไหมครับ? จะเปลี่ยนสถานะเป็น SENT")) return
    setBusy(id)
    try { await sendLot(id); fetchData(page) }
    catch (e: any) { alert("เกิดข้อผิดพลาด: " + e.message) }
    setBusy(null)
  }

  const handleDeleteDraft = async (id: number, code: string) => {
    if (!confirm(`ลบลอต "${code}" ออกไหมครับ? ไม่สามารถกู้คืนได้`)) return
    setBusy(id)
    try { await deleteLot(id); fetchData(page) }
    catch (e: any) { alert("เกิดข้อผิดพลาด: " + e.message) }
    setBusy(null)
  }

  const handleOpenRollback = async (id: number, code: string) => {
    setRollbackLot({ id, code })
    setPreviewLoading(true)
    try {
      const preview = await getLotRollbackPreview(id)
      setRollbackPreview(preview)
    } catch (e: any) {
      alert("ดึงข้อมูลไม่สำเร็จ: " + e.message)
      setRollbackLot(null)
    }
    setPreviewLoading(false)
  }

  const confirmRollback = async () => {
    if (!rollbackLot) return
    setIsRollingBack(true)
    try {
      await rollbackAndDeleteLot(rollbackLot.id)
      setRollbackLot(null)
      fetchData(page)
    } catch (e: any) {
      alert("เกิดข้อผิดพลาดในการยกเลิก: " + e.message)
    }
    setIsRollingBack(false)
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6 pb-20">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Package className="w-7 h-7 text-indigo-600" />
            จัดการลอตสินค้า
          </h1>
          <p className="text-slate-500 text-sm mt-1">{totalCount.toLocaleString()} ลอตทั้งหมด</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => fetchData(page)}
            className="p-2 bg-white border border-slate-200 rounded-xl shadow-sm text-slate-400 hover:text-indigo-600 transition">
            <RefreshCcw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
          </button>
          <Link href="/lots/new"
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition shadow">
            <Plus className="w-4 h-4" /> สร้างลอตใหม่
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-[2rem] border border-slate-200 shadow-sm flex flex-wrap gap-3 items-center">
        <select value={filterBranch ?? ""} onChange={e => setFilterBranch(e.target.value ? Number(e.target.value) : undefined)}
          className="px-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-100 font-medium">
          <option value="">ทุกสาขา</option>
          {branches.map(b => <option key={b.id} value={b.id}>{b.branch_name}</option>)}
        </select>
        <select value={filterStatus ?? ""} onChange={e => setFilterStatus(e.target.value || undefined)}
          className="px-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-100 font-medium">
          <option value="">ทุกสถานะ</option>
          {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <button onClick={() => { setFilterBranch(undefined); setFilterStatus(undefined) }}
          className="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition">
          ล้าง
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 bg-rose-50 border border-rose-200 rounded-2xl p-4 text-rose-700">
          <AlertCircle className="w-5 h-5 shrink-0" /><span className="text-sm font-bold">{error}</span>
        </div>
      )}

      {/* Lots Grid */}
      {loading ? (
        <div className="py-24 flex items-center justify-center gap-3 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin" /><span className="font-semibold">กำลังโหลด...</span>
        </div>
      ) : lots.length === 0 ? (
        <div className="py-24 flex flex-col items-center gap-4 text-slate-400">
          <Package className="w-12 h-12 opacity-30" />
          <p className="font-semibold">ยังไม่มีลอต</p>
          <Link href="/lots/new" className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition">
            + สร้างลอตแรก
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {lots.map(lot => {
            const pct = lot.expected_total > 0 ? Math.min(100, Math.round((lot.received_total / lot.expected_total) * 100)) : 0
            const diff = lot.received_total - lot.expected_total
            const isBusy = busy === lot.id

            return (
              <div key={lot.id} className="bg-white rounded-[1.5rem] border border-slate-200 shadow-sm p-5 flex flex-col md:flex-row gap-4">
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-black text-slate-900 text-base">{lot.lot_code}</span>
                    <StatusBadge status={lot.status} />
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 font-medium">
                    <span>🏬 {(lot.branches as any)?.branch_name ?? "—"}</span>
                    <span>📦 {lot.item_count} รายการ</span>
                    <span>📅 {fmtDate(lot.created_at)}</span>
                  </div>

                  <div className="space-y-1 pt-1">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-500">รับแล้ว <span className="text-slate-800">{fmtQty(lot.received_total)}</span> / สั่ง <span className="text-slate-800">{fmtQty(lot.expected_total)}</span> ชิ้น</span>
                      <span className={`${diff > 0 ? "text-amber-600" : diff < 0 ? "text-rose-600" : "text-emerald-600"}`}>
                        {diff > 0 ? `+${fmtQty(diff)} เกิน` : diff < 0 ? `${fmtQty(diff)} ขาด` : "ครบ ✓"}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${pct >= 100 ? "bg-emerald-500" : pct > 0 ? "bg-indigo-500" : "bg-slate-200"}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>

                <div className="flex md:flex-col gap-2 justify-end shrink-0">
                  <Link href={`/lots/${lot.id}`} className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold border-2 border-slate-200 rounded-xl hover:border-indigo-400 hover:text-indigo-600 transition">
                    <Eye className="w-3.5 h-3.5" /> รายละเอียด
                  </Link>

                  {lot.status === "DRAFT" ? (
                    <>
                      <button onClick={() => handleSend(lot.id)} disabled={isBusy || lot.item_count === 0} className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-40 transition">
                        {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} ส่งลอต
                      </button>
                      <button onClick={() => handleDeleteDraft(lot.id, lot.lot_code)} disabled={isBusy} className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-rose-600 border-2 border-rose-200 rounded-xl hover:bg-rose-50 disabled:opacity-40 transition">
                        <Trash2 className="w-3.5 h-3.5" /> ลบ (DRAFT)
                      </button>
                    </>
                  ) : (
                    <button onClick={() => handleOpenRollback(lot.id, lot.lot_code)} disabled={isBusy} className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-rose-600 border-2 border-rose-200 rounded-xl hover:bg-rose-50 disabled:opacity-40 transition">
                      <AlertOctagon className="w-3.5 h-3.5" /> ยกเลิก & หักสต๊อก
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {pageAll > 1 && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">หน้า {page} / {pageAll}</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => { const p = page - 1; setPage(p); fetchData(p) }} className="px-4 py-2 text-xs font-bold border border-slate-200 rounded-xl bg-white disabled:opacity-40 hover:bg-slate-50 transition flex items-center gap-1"><ChevronLeft className="w-4 h-4" /> ก่อนหน้า</button>
            <button disabled={page >= pageAll} onClick={() => { const p = page + 1; setPage(p); fetchData(p) }} className="px-4 py-2 text-xs font-bold bg-slate-900 text-white rounded-xl disabled:opacity-40 hover:bg-indigo-700 transition flex items-center gap-1">ถัดไป <ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {/* ⚠️ ROLLBACK MODAL (ส่วนที่ต่อให้จบ) */}
      {rollbackLot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            
            <div className="p-5 border-b border-slate-100 flex items-start justify-between bg-rose-50/50">
              <div className="flex items-center gap-3 text-rose-600">
                <AlertOctagon className="w-6 h-6" />
                <div>
                  <h2 className="font-bold text-lg leading-tight">ยืนยันยกเลิกและลบลอต</h2>
                  <p className="text-xs font-medium opacity-80">รหัส: {rollbackLot.code}</p>
                </div>
              </div>
              <button onClick={() => setRollbackLot(null)} disabled={isRollingBack} className="p-2 hover:bg-rose-100 rounded-full text-rose-400 transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto bg-slate-50">
              <p className="text-sm font-bold text-slate-700 mb-3 text-center">
                สต๊อกเหล่านี้จะถูกหักออกจากระบบคืนโดยอัตโนมัติ:
              </p>

              {previewLoading ? (
                <div className="py-10 flex flex-col items-center justify-center gap-2 text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span className="font-semibold text-sm">กำลังคำนวณยอดสต๊อก...</span>
                </div>
              ) : rollbackPreview.length === 0 ? (
                <div className="py-10 text-center text-sm font-medium text-slate-500">
                  ไม่พบประวัติการบวกสต๊อกของลอตนี้ (อาจถูกหักออกไปแล้ว หรือยังไม่ได้รับเข้า)
                </div>
              ) : (
                <div className="space-y-2">
                  {rollbackPreview.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-slate-800 truncate">{item.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{item.sku}</div>
                      </div>
                      <div className="font-black text-rose-600 bg-rose-50 px-3 py-1 rounded-lg shrink-0 border border-rose-100">
                        - {item.total_qty.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-5 border-t border-slate-100 flex gap-3 bg-white">
              <button onClick={() => setRollbackLot(null)} disabled={isRollingBack} className="flex-1 py-3 text-sm font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition">
                ปิด
              </button>
              <button onClick={confirmRollback} disabled={isRollingBack} className="flex-[2] flex items-center justify-center gap-2 py-3 text-sm font-bold text-white bg-rose-600 rounded-xl hover:bg-rose-700 disabled:opacity-50 transition shadow-md shadow-rose-200">
                {isRollingBack ? <><Loader2 className="w-4 h-4 animate-spin" /> กำลังดำเนินการ...</> : "หักสต๊อกและลบลอต"}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}