"use client"

import { useState } from "react"
import {
  PackageCheck, TrendingUp, TrendingDown,
  CheckCircle2, ChevronDown, ChevronUp, Clock, AlertCircle,
} from "lucide-react"
import type { LotDiscrepancySummary } from "@/actions/lots"

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  SENT:      { label: "รอรับ",    cls: "bg-blue-100 text-blue-700" },
  RECEIVING: { label: "กำลังรับ", cls: "bg-amber-100 text-amber-700" },
  PARTIAL:   { label: "บางส่วน",  cls: "bg-orange-100 text-orange-700" },
  COMPLETED: { label: "ครบแล้ว",  cls: "bg-emerald-100 text-emerald-700" },
  SUCCESS:   { label: "สำเร็จ",   cls: "bg-emerald-100 text-emerald-700" },
}

type Filter = "all" | "shortage" | "excess" | "ghost" | "ok"

interface Props {
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
  branchName: string
}

const fmtDate = (d: string | null) =>
  d ? new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short" }).format(new Date(d)) : "—"
const fmtQty = (n: number) => n.toLocaleString("th-TH", { maximumFractionDigits: 2 })

function LotCard({ lot }: { lot: LotDiscrepancySummary }) {
  const hasDisc = lot.shortage_count > 0 || lot.excess_count > 0 || lot.ghost_count > 0
  const [open, setOpen] = useState(hasDisc)
  const s = STATUS_MAP[lot.status] ?? STATUS_MAP.SENT

  return (
    <div className={`bg-white rounded-2xl border-2 shadow-sm transition-all ${hasDisc ? "border-orange-200" : "border-slate-100"}`}>
      <button onClick={() => setOpen(v => !v)} className="w-full text-left p-4 flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-black text-slate-900">{lot.lot_code}</span>
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${s.cls}`}>{s.label}</span>
            {lot.shortage_count > 0 && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-black px-2 py-0.5 rounded-lg bg-red-100 text-red-600">
                <TrendingDown className="w-3 h-3" /> ขาด {lot.shortage_count} รายการ
              </span>
            )}
            {lot.excess_count > 0 && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-black px-2 py-0.5 rounded-lg bg-green-100 text-green-600">
                <TrendingUp className="w-3 h-3" /> เกิน {lot.excess_count} รายการ
              </span>
            )}
            {lot.ghost_count > 0 && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-black px-2 py-0.5 rounded-lg bg-purple-100 text-purple-600">
                <AlertCircle className="w-3 h-3" /> ไม่ได้อยู่ในลอต {lot.ghost_count} รายการ
              </span>
            )}
            {!hasDisc && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-black px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="w-3 h-3" /> ตรงทุกรายการ
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-slate-400 mt-1">
            <Clock className="w-3 h-3" />
            <span>ส่ง {fmtDate(lot.sent_at)}</span>
            <span className="mx-1">·</span>
            <span>รับ {fmtQty(lot.total_received)} / คาด {fmtQty(lot.total_expected)} ชิ้น</span>
          </div>
        </div>
        {open
          ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0 mt-1" />
          : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 mt-1" />}
      </button>

      {open && (
        <div className="border-t border-slate-100 divide-y divide-slate-50">
          {lot.items.map((item, idx) => {
            const rowBg = item.is_ghost
              ? "bg-purple-50/60"
              : item.diff < 0 ? "bg-red-50/40"
              : item.diff > 0 ? "bg-green-50/40"
              : ""

            return (
              <div key={item.is_ghost ? `ghost-${item.product_id}` : item.item_id} className={`px-4 py-3 flex items-center gap-3 ${rowBg}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-sm font-bold text-slate-800 truncate">{item.product_name}</p>
                    {item.is_ghost && (
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-purple-100 text-purple-600 uppercase tracking-wide">
                        ไม่ได้อยู่ในลอต
                      </span>
                    )}
                  </div>
                  {item.product_sku && (
                    <p className="text-[10px] text-slate-400 font-mono">{item.product_sku}</p>
                  )}
                </div>

                <div className="text-right shrink-0 space-y-1">
                  {item.is_ghost ? (
                    <>
                      <div className="text-xs text-slate-500">
                        คาด <span className="font-bold text-slate-400">—</span>
                      </div>
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-black px-2 py-0.5 rounded-lg bg-purple-100 text-purple-600">
                        <TrendingUp className="w-3 h-3" /> รับเกิน {fmtQty(item.movement_qty)} ชิ้น
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="text-xs text-slate-500">
                        คาด <span className="font-bold text-slate-700">{fmtQty(item.expected_qty)}</span>
                        {" · "}รับ <span className="font-bold text-slate-700">{fmtQty(item.received_qty)}</span>
                      </div>
                      {item.movement_qty !== item.received_qty && (
                        <div className="text-[10px] text-amber-500 font-bold">
                          Movement: {fmtQty(item.movement_qty)} ⚠️
                        </div>
                      )}
                      {item.diff === 0 ? (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-slate-100 text-slate-400">ตรง</span>
                      ) : item.diff < 0 ? (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-black px-2 py-0.5 rounded-lg bg-red-100 text-red-600">
                          <TrendingDown className="w-3 h-3" /> ขาด {fmtQty(Math.abs(item.diff))}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-black px-2 py-0.5 rounded-lg bg-green-100 text-green-600">
                          <TrendingUp className="w-3 h-3" /> เกิน {fmtQty(item.diff)}
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function ReceiveCheckClient({ lots, stats, branchName }: Props) {
  const [filter, setFilter] = useState<Filter>("all")

  const filtered = lots.filter(lot => {
    if (filter === "shortage") return lot.shortage_count > 0
    if (filter === "excess")   return lot.excess_count > 0
    if (filter === "ghost")    return lot.ghost_count > 0
    if (filter === "ok")       return lot.shortage_count === 0 && lot.excess_count === 0 && lot.ghost_count === 0
    return true
  })

  const tabs: { key: Filter; label: string; count: number; activeCls: string }[] = [
    { key: "all",      label: "ทั้งหมด",          count: stats.totalLots,        activeCls: "bg-slate-700 text-white border-slate-700" },
    { key: "shortage", label: "ขาด",              count: stats.lotsWithShortage, activeCls: "bg-red-500 text-white border-red-500" },
    { key: "excess",   label: "เกิน",             count: stats.lotsWithExcess,   activeCls: "bg-green-500 text-white border-green-500" },
    { key: "ghost",    label: "ไม่ได้อยู่ในลอต",  count: stats.lotsWithGhost,    activeCls: "bg-purple-500 text-white border-purple-500" },
    { key: "ok",       label: "ตรงพอดี",          count: stats.lotsOk,           activeCls: "bg-emerald-500 text-white border-emerald-500" },
  ]

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-5 pb-24">
      <div>
        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
          <PackageCheck className="w-7 h-7 text-blue-600" /> ตรวจสอบการรับสินค้า
        </h1>
        <p className="text-slate-500 text-sm mt-1">สาขา {branchName} · 100 ลอตล่าสุด</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl border-2 border-red-100 p-4 shadow-sm">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">ยอดขาดรวม</p>
          <p className="text-3xl font-black text-red-500 mt-1">{fmtQty(stats.totalShortageQty)}</p>
          <p className="text-xs text-slate-400 mt-0.5">ชิ้น จาก {stats.lotsWithShortage} ลอต</p>
        </div>
        <div className="bg-white rounded-2xl border-2 border-green-100 p-4 shadow-sm">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">ยอดเกินรวม</p>
          <p className="text-3xl font-black text-green-500 mt-1">{fmtQty(stats.totalExcessQty)}</p>
          <p className="text-xs text-slate-400 mt-0.5">ชิ้น จาก {stats.lotsWithExcess} ลอต</p>
        </div>
        <div className="bg-white rounded-2xl border-2 border-purple-100 p-4 shadow-sm">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">ไม่ได้อยู่ในลอต</p>
          <p className="text-3xl font-black text-purple-500 mt-1">{fmtQty(stats.totalGhostQty)}</p>
          <p className="text-xs text-slate-400 mt-0.5">ชิ้น จาก {stats.lotsWithGhost} ลอต</p>
        </div>
        <div className="bg-white rounded-2xl border-2 border-emerald-100 p-4 shadow-sm">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">ตรงพอดี</p>
          <p className="text-3xl font-black text-emerald-500 mt-1">{stats.lotsOk}</p>
          <p className="text-xs text-slate-400 mt-0.5">ลอต จาก {stats.totalLots} ทั้งหมด</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all border-2 ${
              filter === t.key ? t.activeCls : "bg-white text-slate-400 border-slate-100 hover:border-slate-200"
            }`}
          >
            {t.label}
            <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-black ${filter === t.key ? "bg-white/30" : "bg-slate-100"}`}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Lot Cards */}
      {filtered.length === 0 ? (
        <div className="py-20 flex flex-col items-center gap-3 text-slate-400">
          <CheckCircle2 className="w-12 h-12 text-slate-200" />
          <p className="font-bold text-sm">ไม่มีลอตในหมวดนี้</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(lot => <LotCard key={lot.lot_id} lot={lot} />)}
        </div>
      )}
    </div>
  )
}
