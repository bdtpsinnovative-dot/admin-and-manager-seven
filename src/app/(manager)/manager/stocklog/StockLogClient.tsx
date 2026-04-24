"use client"

import React, { useState, useCallback } from "react"
import {
  History, Search, RefreshCcw, ChevronLeft, ChevronRight,
  ArrowUpCircle, ArrowDownCircle, Loader2, AlertCircle, TrendingDown, Package
} from "lucide-react"
import { getManagerStockLog, type MovementWithBalance } from "@/actions/stockmovement"

const fmtDT = (d: string) =>
  new Intl.DateTimeFormat("th-TH", {
    day: "2-digit", month: "short", year: "2-digit",
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(d))

const fmtQty = (n: number) => n.toLocaleString("th-TH", { maximumFractionDigits: 0 })

const TYPE_LABEL: Record<string, { label: string; color: string }> = {
  in:           { label: "รับเข้า",   color: "emerald" },
  IN:           { label: "รับเข้า",   color: "emerald" },
  receive:      { label: "รับเข้า",   color: "emerald" },
  out:          { label: "จ่ายออก",   color: "rose" },
  OUT:          { label: "จ่ายออก",   color: "rose" },
  sale:         { label: "ขาย",       color: "rose" },
  SALE:         { label: "ขาย",       color: "rose" },
  adjust:       { label: "ปรับ",      color: "amber" },
  ADJUST:       { label: "ปรับ",      color: "amber" },
  adjust_in:    { label: "ปรับ+",     color: "blue" },
  adjust_out:   { label: "ปรับ-",     color: "amber" },
  transfer_in:  { label: "โอนเข้า",   color: "blue" },
  transfer_out: { label: "โอนออก",    color: "purple" },
}

function TypeBadge({ type, qty }: { type: string | null; qty: number }) {
  const key = type ?? (qty >= 0 ? "in" : "out")
  const info = TYPE_LABEL[key] ?? { label: key || "—", color: qty >= 0 ? "emerald" : "rose" }
  const colors: Record<string, string> = {
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    rose:    "bg-rose-50 text-rose-700 border-rose-200",
    amber:   "bg-amber-50 text-amber-700 border-amber-200",
    blue:    "bg-blue-50 text-blue-700 border-blue-200",
    purple:  "bg-purple-50 text-purple-700 border-purple-200",
  }
  return (
    <span className={`text-[10px] font-black px-2 py-1 rounded-lg border uppercase tracking-wide ${colors[info.color]}`}>
      {info.label}
    </span>
  )
}

interface Props {
  branchId: number
  branchName: string
}

export default function StockLogClient({ branchId, branchName }: Props) {
  const [movements, setMovements] = useState<MovementWithBalance[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [totalIn, setTotalIn] = useState(0)
  const [totalOut, setTotalOut] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [fetched, setFetched] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  const pageSize = 60
  const pageAll = Math.max(1, Math.ceil(totalCount / pageSize))

  const fetchData = useCallback(async (p = 1) => {
    setLoading(true)
    setError(null)
    const res = await getManagerStockLog({
      branchId,
      productSearch: search || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      page: p,
    })
    if (res.error) {
      setError(res.error)
    } else {
      setMovements(res.data)
      setTotalCount(res.totalCount)
      setTotalIn(res.totalIn)
      setTotalOut(res.totalOut)
      setFetched(true)
    }
    setLoading(false)
  }, [branchId, search, dateFrom, dateTo])

  const handleSearch = () => { setPage(1); fetchData(1) }
  const handleReset  = () => { setSearch(""); setDateFrom(""); setDateTo(""); setPage(1); setFetched(false); setMovements([]) }

  // group by batch_ref for "รอบ" display
  const batchGroups = movements.reduce<Map<string, MovementWithBalance[]>>((acc, m) => {
    const key = m.batch_ref || `solo-${m.id}`
    if (!acc.has(key)) acc.set(key, [])
    acc.get(key)!.push(m)
    return acc
  }, new Map())

  return (
    <div className="space-y-6 pb-20">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <History className="w-7 h-7 text-blue-600" />
            ประวัติเคลื่อนไหวสต็อก
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            สาขา: <span className="font-bold text-slate-700">{branchName}</span>
            {fetched && <span className="text-slate-400"> · {totalCount.toLocaleString()} รายการ</span>}
          </p>
        </div>
        <button onClick={() => fetchData(page)} className="p-2 bg-white border border-slate-200 rounded-xl shadow-sm text-slate-400 hover:text-blue-600 transition">
          <RefreshCcw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Filter */}
      <div className="bg-white p-5 rounded-[2rem] border border-slate-200 shadow-sm space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="ค้นหาชื่อสินค้า, SKU, Barcode..."
            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-blue-100 transition-all"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
          />
        </div>
        <div className="flex gap-3 flex-wrap items-center">
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-500">จาก</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-blue-100" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-500">ถึง</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-blue-100" />
          </div>
          <div className="flex gap-2 ml-auto">
            <button onClick={handleReset} className="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition">ล้าง</button>
            <button onClick={handleSearch} className="px-6 py-2 text-sm font-bold bg-slate-900 text-white rounded-xl hover:bg-blue-700 transition">
              ค้นหา
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 bg-rose-50 border border-rose-200 rounded-2xl p-4 text-rose-700">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="text-sm font-bold">{error}</span>
        </div>
      )}

      {/* Summary cards — แสดงเฉพาะเมื่อดึงข้อมูลแล้ว */}
      {fetched && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
            <div className="text-xs font-black uppercase tracking-widest text-slate-400">รายการทั้งหมด</div>
            <div className="text-3xl font-black text-slate-800 mt-2">{totalCount.toLocaleString()}</div>
            <div className="text-sm text-slate-400 mt-1">movements</div>
          </div>
          <div className="bg-emerald-50 rounded-3xl p-5 border border-emerald-100 shadow-sm">
            <div className="text-xs font-black uppercase tracking-widest text-emerald-600 flex items-center gap-1">
              <ArrowUpCircle className="w-3.5 h-3.5" /> เข้า (กรองนี้)
            </div>
            <div className="text-3xl font-black text-emerald-700 mt-2">+{fmtQty(totalIn)}</div>
            <div className="text-sm text-emerald-500 mt-1">ชิ้น</div>
          </div>
          <div className="bg-rose-50 rounded-3xl p-5 border border-rose-100 shadow-sm">
            <div className="text-xs font-black uppercase tracking-widest text-rose-600 flex items-center gap-1">
              <ArrowDownCircle className="w-3.5 h-3.5" /> ออก (กรองนี้)
            </div>
            <div className="text-3xl font-black text-rose-700 mt-2">{fmtQty(totalOut)}</div>
            <div className="text-sm text-rose-500 mt-1">ชิ้น</div>
          </div>
        </div>
      )}

      {/* Empty / loading state */}
      {!fetched && !loading && (
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm py-24 flex flex-col items-center gap-4 text-slate-400">
          <Package className="w-12 h-12 opacity-30" />
          <p className="font-semibold text-sm">กรอก filter แล้วกด "ค้นหา" เพื่อดูประวัติ</p>
          <button onClick={() => fetchData(1)} className="px-6 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition">
            ดูทั้งหมด
          </button>
        </div>
      )}

      {loading && (
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm py-24 flex items-center justify-center gap-3 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="font-semibold text-sm">กำลังโหลด...</span>
        </div>
      )}

      {/* Table */}
      {fetched && !loading && (
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead className="bg-slate-50/50 border-b border-slate-100 text-left text-[10px] uppercase tracking-widest text-slate-400 font-black">
                <tr>
                  <th className="px-5 py-4">วันเวลา / Batch</th>
                  <th className="px-5 py-4">สินค้า</th>
                  <th className="px-5 py-4">ประเภท</th>
                  <th className="px-5 py-4 text-right">จำนวน</th>
                  <th className="px-5 py-4 text-right">ยอดสะสม</th>
                  <th className="px-5 py-4">บันทึกโดย</th>
                  <th className="px-5 py-4">หมายเหตุ / อ้างอิง</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {movements.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-20 text-center text-slate-400 italic font-medium">
                      ไม่พบรายการ
                    </td>
                  </tr>
                ) : (
                  Array.from(batchGroups.entries()).map(([batchKey, rows]) => {
                    const hasBatch = !batchKey.startsWith("solo-")
                    const batchIn  = rows.filter(x => Number(x.qty) > 0).reduce((s, x) => s + Number(x.qty), 0)
                    const batchOut = rows.filter(x => Number(x.qty) < 0).reduce((s, x) => s + Number(x.qty), 0)
                    const batchDate = rows[0]?.created_at_ts

                    return (
                      <React.Fragment key={batchKey}>
                        {/* ====== Batch header row ====== */}
                        {hasBatch && (
                          <tr className="bg-blue-50 border-t-2 border-blue-200">
                            <td colSpan={7} className="px-5 py-2.5">
                              <div className="flex items-center gap-3 flex-wrap">
                                <span className="text-[11px] font-black text-blue-700 uppercase tracking-widest">
                                  📦 รอบ: {rows[0]?.batch_ref}
                                </span>
                                <span className="text-[10px] text-blue-500 font-bold">{batchDate ? fmtDT(batchDate) : ""}</span>
                                <span className="ml-auto flex items-center gap-3 text-[10px] font-black">
                                  <span className="text-slate-500">{rows.length} รายการ</span>
                                  {batchIn  > 0 && <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-lg">+{fmtQty(batchIn)} เข้า</span>}
                                  {batchOut < 0 && <span className="text-rose-700 bg-rose-100 px-2 py-0.5 rounded-lg">{fmtQty(batchOut)} ออก</span>}
                                </span>
                              </div>
                            </td>
                          </tr>
                        )}

                        {/* ====== Movement rows in this batch ====== */}
                        {rows.map(m => {
                          const qty    = Number(m.qty ?? 0)
                          const isIn   = qty > 0
                          const balNeg  = m.balance < 0
                          const balZero = m.balance === 0

                          return (
                            <tr key={m.id} className={`hover:bg-slate-50 transition-colors ${balNeg ? "bg-rose-50/40" : ""}`}>
                              {/* วันเวลา */}
                              <td className="px-5 py-3 text-xs font-bold text-slate-700 whitespace-nowrap">
                                {fmtDT(m.created_at_ts)}
                                {m.batch_ref && (
                                  <div className="text-[9px] font-mono text-blue-400 mt-0.5">{m.batch_ref}</div>
                                )}
                              </td>
                              {/* สินค้า */}
                              <td className="px-5 py-3">
                                <div className="font-bold text-slate-800 text-sm line-clamp-1">{m.products?.name ?? "—"}</div>
                                <div className="text-[10px] font-mono text-slate-400">{m.products?.sku || m.products?.barcode || ""}</div>
                              </td>
                              {/* ประเภท */}
                              <td className="px-5 py-3">
                                <TypeBadge type={m.type} qty={qty} />
                              </td>
                              {/* จำนวน */}
                              <td className={`px-5 py-3 text-right font-black text-lg ${isIn ? "text-emerald-600" : "text-rose-600"}`}>
                                {isIn ? "+" : ""}{fmtQty(qty)}
                              </td>
                              {/* ยอดสะสม */}
                              <td className="px-5 py-3 text-right">
                                <span className={`font-black text-base px-2 py-1 rounded-lg ${
                                  balNeg  ? "text-rose-700 bg-rose-100"
                                  : balZero ? "text-amber-600 bg-amber-50"
                                  : "text-slate-800"
                                }`}>
                                  {balNeg && <TrendingDown className="w-3 h-3 inline mr-1" />}
                                  {fmtQty(m.balance)}
                                </span>
                              </td>
                              {/* บันทึกโดย */}
                              <td className="px-5 py-3 text-xs text-slate-500 font-medium">{m.created_by_name || "—"}</td>
                              {/* หมายเหตุ */}
                              <td className="px-5 py-3 text-xs text-slate-400 italic max-w-[200px]">
                                <span className="line-clamp-2">{[m.note, m.ref_type].filter(Boolean).join(" · ") || "—"}</span>
                              </td>
                            </tr>
                          )
                        })}
                      </React.Fragment>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              หน้า {page} / {pageAll} · {totalCount.toLocaleString()} รายการ
            </div>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => { const p = page - 1; setPage(p); fetchData(p) }}
                className="px-4 py-2 text-xs font-bold border border-slate-200 rounded-xl bg-white disabled:opacity-40 hover:bg-slate-50 transition flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" /> ก่อนหน้า
              </button>
              <button
                disabled={page >= pageAll}
                onClick={() => { const p = page + 1; setPage(p); fetchData(p) }}
                className="px-4 py-2 text-xs font-bold bg-slate-900 text-white rounded-xl disabled:opacity-40 hover:bg-blue-700 transition flex items-center gap-1"
              >
                ถัดไป <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
