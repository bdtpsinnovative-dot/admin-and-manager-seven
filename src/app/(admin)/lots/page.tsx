"use client"

import React, { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import {
  Package, Plus, Send, Trash2, Eye, RefreshCcw,
  ChevronLeft, ChevronRight, Loader2, AlertCircle,
  CheckCircle2, Clock, RotateCw, AlertTriangle, AlertOctagon, X,
  Building2, CalendarDays, Search, Filter, ChevronDown,
  PackageOpen, PackagePlus
} from "lucide-react"
import { 
  getLots, getBranches, sendLot, deleteLot, 
  getLotRollbackPreview, rollbackAndDeleteLot,
  type StockLot, type Branch 
} from "@/actions/lots"

// --- Status Config ---
const STATUS_MAP: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  DRAFT:      { label: "ร่าง",       cls: "bg-slate-100 text-slate-600 border-slate-200",     icon: <Clock className="w-3.5 h-3.5" /> },
  SENT:       { label: "ส่งแล้ว",    cls: "bg-blue-50 text-blue-700 border-blue-200",          icon: <Send className="w-3.5 h-3.5" /> },
  RECEIVING:  { label: "กำลังรับ",   cls: "bg-amber-50 text-amber-700 border-amber-200",       icon: <RotateCw className="w-3.5 h-3.5" /> },
  PARTIAL:    { label: "รับบางส่วน", cls: "bg-orange-50 text-orange-700 border-orange-200",    icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  COMPLETED:  { label: "ครบแล้ว",    cls: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  SUCCESS:    { label: "สำเร็จ",     cls: "bg-teal-50 text-teal-700 border-teal-200",          icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] ?? STATUS_MAP.DRAFT
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded border ${s.cls}`}>
      {s.icon}
      <span>{s.label}</span>
    </span>
  )
}

// --- Lot Type Badge ---
function LotTypeBadge({ lotCode }: { lotCode: string }) {
  const isWalkin = lotCode.toUpperCase().includes("WALKIN")
  if (isWalkin) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-200">
        <PackagePlus className="w-3.5 h-3.5" />
        <span>รับนอกลอต</span>
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-600 border border-indigo-200">
      <Package className="w-3.5 h-3.5" />
      <span>ตามลอต</span>
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
  const [filterType, setFilterType] = useState<"all" | "lot" | "walkin">("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [busy, setBusy]         = useState<number | null>(null)

  // ---- Rollback state ----
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

  // --- Client-side filters (type + search) ---
  const filteredLots = lots.filter(lot => {
    if (filterType === "walkin" && !lot.lot_code.toUpperCase().includes("WALKIN")) return false
    if (filterType === "lot" && lot.lot_code.toUpperCase().includes("WALKIN")) return false
    if (searchTerm) {
      const q = searchTerm.toLowerCase()
      const matchCode = lot.lot_code.toLowerCase().includes(q)
      const matchBranch = ((lot.branches as any)?.branch_name || "").toLowerCase().includes(q)
      if (!matchCode && !matchBranch) return false
    }
    return true
  })

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
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-5 pb-20 text-slate-800">

      {/* ====== Header ====== */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Package className="w-6 h-6 text-indigo-600" />
            <span>จัดการลอตสินค้า</span>
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">รวมทั้งหมด {totalCount.toLocaleString()} ลอต</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => fetchData(page)}
            className="p-2 border border-slate-200 bg-white hover:bg-slate-50 rounded text-slate-500 transition">
            <RefreshCcw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <Link href="/lots/new"
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-semibold text-sm transition">
            <Plus className="w-4 h-4" /> 
            <span>สร้างลอตใหม่</span>
          </Link>
        </div>
      </div>

      {/* ====== Search & Filters ====== */}
      <div className="bg-white p-3 rounded border border-slate-200 flex flex-wrap gap-2 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="ค้นหารหัสลอต หรือ สาขา..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded outline-none focus:border-indigo-500 bg-white"
          />
        </div>

        {/* Type Filter */}
        <div className="relative">
          <select value={filterType} onChange={e => setFilterType(e.target.value as any)}
            className="pl-3 pr-8 py-2 text-sm border border-slate-200 rounded bg-white outline-none cursor-pointer appearance-none">
            <option value="all">ทุกประเภท</option>
            <option value="lot">ตามลอต</option>
            <option value="walkin">รับนอกลอต (WALKIN)</option>
          </select>
          <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>

        {/* Branch Filter */}
        <div className="relative">
          <select value={filterBranch ?? ""} onChange={e => setFilterBranch(e.target.value ? Number(e.target.value) : undefined)}
            className="pl-3 pr-8 py-2 text-sm border border-slate-200 rounded bg-white outline-none cursor-pointer appearance-none">
            <option value="">ทุกสาขา</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.branch_name}</option>)}
          </select>
          <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>

        {/* Status Filter */}
        <div className="relative">
          <select value={filterStatus ?? ""} onChange={e => setFilterStatus(e.target.value || undefined)}
            className="pl-3 pr-8 py-2 text-sm border border-slate-200 rounded bg-white outline-none cursor-pointer appearance-none">
            <option value="">ทุกสถานะ</option>
            {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>

        {/* Clear */}
        {(filterBranch || filterStatus || filterType !== "all" || searchTerm) && (
          <button onClick={() => { setFilterBranch(undefined); setFilterStatus(undefined); setFilterType("all"); setSearchTerm("") }}
            className="px-3 py-2 text-xs font-semibold text-slate-500 hover:text-red-600 transition">
            ล้างตัวกรอง
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 rounded p-3 text-rose-700 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="font-semibold">{error}</span>
        </div>
      )}

      {/* ====== Lots Card List ====== */}
      {loading ? (
        <div className="py-20 flex items-center justify-center gap-2 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm font-semibold">กำลังโหลดข้อมูล...</span>
        </div>
      ) : filteredLots.length === 0 ? (
        <div className="py-20 text-center border border-slate-200 border-dashed rounded bg-white text-slate-400">
          <p className="font-semibold">ไม่พบรายการลอตสินค้า</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLots.map(lot => {
            const isWalkin = lot.lot_code.toUpperCase().includes("WALKIN")
            const pct = lot.expected_total > 0 ? Math.min(100, Math.round((lot.received_total / lot.expected_total) * 100)) : (lot.received_total > 0 ? 100 : 0)
            const diff = lot.received_total - lot.expected_total
            const isBusy = busy === lot.id

            // Progress bar color
            let barColor = "bg-slate-200"
            if (isWalkin) {
              barColor = lot.received_total > 0 ? "bg-blue-500" : "bg-slate-200"
            } else if (pct >= 100) {
              barColor = "bg-emerald-500"
            } else if (pct > 0) {
              barColor = "bg-indigo-500"
            }

            return (
              <div key={lot.id} className="bg-white rounded border border-slate-200 p-4 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                <div className="flex-1 min-w-0 space-y-2">
                  {/* Lot code, status, and type */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-900 text-sm md:text-base">{lot.lot_code}</span>
                    <StatusBadge status={lot.status} />
                    <LotTypeBadge lotCode={lot.lot_code} />
                  </div>

                  {/* Metadata */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>{(lot.branches as any)?.branch_name ?? "—"}</span>
                    </span>
                    <span>{lot.item_count} รายการ</span>
                    <span>{fmtDate(lot.created_at)}</span>
                  </div>

                  {/* Progress info */}
                  <div className="space-y-1 pt-1 max-w-xl">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-500">
                        รับแล้ว <span className="text-slate-800 font-bold">{fmtQty(lot.received_total)}</span> / สั่ง <span className="text-slate-800 font-bold">{fmtQty(lot.expected_total)}</span> ชิ้น
                      </span>
                      {isWalkin ? (
                        <span className="text-blue-600 font-bold">
                          รับนอกลอต
                        </span>
                      ) : (
                        <span className={`${diff > 0 ? "text-amber-600" : diff < 0 ? "text-rose-600" : "text-emerald-600"} font-bold`}>
                          {diff > 0 ? `+${fmtQty(diff)} เกิน` : diff < 0 ? `${fmtQty(diff)} ขาด` : "ครบ"}
                        </span>
                      )}
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${barColor}`}
                        style={{ width: `${isWalkin ? (lot.received_total > 0 ? 100 : 0) : pct}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-row md:flex-col gap-2 shrink-0 w-full md:w-auto justify-end">
                  <Link href={`/lots/${lot.id}`} className="flex-1 md:flex-none text-center px-3.5 py-1.5 text-xs font-semibold border border-slate-200 rounded hover:bg-slate-50 transition">
                    รายละเอียด
                  </Link>

                  {lot.status === "DRAFT" ? (
                    <>
                      <button onClick={() => handleSend(lot.id)} disabled={isBusy || lot.item_count === 0} className="flex-1 md:flex-none px-3.5 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-40 transition">
                        ส่งลอต
                      </button>
                      <button onClick={() => handleDeleteDraft(lot.id, lot.lot_code)} disabled={isBusy} className="flex-1 md:flex-none px-3.5 py-1.5 text-xs font-semibold text-rose-600 border border-rose-200 rounded hover:bg-rose-50 disabled:opacity-40 transition">
                        ลบ
                      </button>
                    </>
                  ) : (
                    <button onClick={() => handleOpenRollback(lot.id, lot.lot_code)} disabled={isBusy} className="flex-1 md:flex-none px-3.5 py-1.5 text-xs font-semibold text-rose-600 border border-rose-200 rounded hover:bg-rose-50 disabled:opacity-40 transition">
                      ยกเลิก & หักสต๊อก
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ====== Pagination ====== */}
      {pageAll > 1 && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-slate-500">หน้า {page} / {pageAll}</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => { const p = page - 1; setPage(p); fetchData(p) }} className="px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded bg-white disabled:opacity-40 hover:bg-slate-50 transition">ก่อนหน้า</button>
            <button disabled={page >= pageAll} onClick={() => { const p = page + 1; setPage(p); fetchData(p) }} className="px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-900 text-white rounded disabled:opacity-40 transition">ถัดไป</button>
          </div>
        </div>
      )}

      {/* ====== ROLLBACK MODAL ====== */}
      {rollbackLot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded border border-slate-200 w-full max-w-lg shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
            
            <div className="p-4 border-b border-slate-200 flex items-start justify-between bg-rose-50/50">
              <div className="flex items-center gap-2 text-rose-700">
                <AlertOctagon className="w-5 h-5" />
                <div>
                  <h2 className="font-bold text-base leading-tight">ยืนยันยกเลิกและลบลอต</h2>
                  <p className="text-xs opacity-80">รหัส: {rollbackLot.code}</p>
                </div>
              </div>
              <button onClick={() => setRollbackLot(null)} disabled={isRollingBack} className="p-1 hover:bg-rose-100 rounded text-rose-400 transition">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto bg-slate-50 text-sm">
              <p className="font-semibold text-slate-700 mb-2">
                สต๊อกเหล่านี้จะถูกหักออกจากระบบคืนโดยอัตโนมัติ:
              </p>

              {previewLoading ? (
                <div className="py-8 flex items-center justify-center gap-2 text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>กำลังคำนวณยอดสต๊อก...</span>
                </div>
              ) : rollbackPreview.length === 0 ? (
                <div className="py-8 text-center text-slate-500">
                  ไม่พบประวัติการบวกสต๊อกของลอตนี้
                </div>
              ) : (
                <div className="space-y-1.5">
                  {rollbackPreview.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-white p-2.5 rounded border border-slate-200">
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-slate-800 truncate">{item.name}</div>
                        <div className="text-xs text-slate-400 font-mono">{item.sku}</div>
                      </div>
                      <div className="font-bold text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded border border-rose-100 shrink-0">
                        - {item.total_qty.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 flex gap-2 bg-white">
              <button onClick={() => setRollbackLot(null)} disabled={isRollingBack} className="flex-1 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded transition">
                ปิด
              </button>
              <button onClick={confirmRollback} disabled={isRollingBack} className="flex-[2] flex items-center justify-center gap-2 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded transition shadow-sm">
                {isRollingBack ? <><Loader2 className="w-4 h-4 animate-spin" /> กำลังดำเนินการ...</> : "หักสต๊อกและลบลอต"}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}