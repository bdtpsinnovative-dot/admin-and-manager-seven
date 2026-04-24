"use client"

import React, { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  Package, ArrowLeft, Send, CheckCircle2, AlertTriangle,
  XCircle, Loader2, Edit3, Save, Clock, RotateCw
} from "lucide-react"
import { sendLot, updateLotReceived, type StockLot, type LotItem } from "@/actions/lots"

const STATUS_MAP: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  DRAFT:     { label: "ร่าง",          cls: "bg-slate-100 text-slate-600",    icon: <Clock className="w-4 h-4" /> },
  SENT:      { label: "ส่งแล้ว",       cls: "bg-blue-100 text-blue-700",      icon: <Send className="w-4 h-4" /> },
  RECEIVING: { label: "กำลังรับ",      cls: "bg-amber-100 text-amber-700",    icon: <RotateCw className="w-4 h-4" /> },
  PARTIAL:   { label: "รับบางส่วน",    cls: "bg-orange-100 text-orange-700",  icon: <AlertTriangle className="w-4 h-4" /> },
  COMPLETED: { label: "ครบแล้ว ✓",     cls: "bg-emerald-100 text-emerald-700",icon: <CheckCircle2 className="w-4 h-4" /> },
}

function ItemStatusBadge({ expected, received }: { expected: number; received: number }) {
  if (received === 0)      return <span className="text-[10px] font-black px-2 py-1 rounded-lg bg-slate-100 text-slate-500">รอรับ</span>
  if (received >= expected) return <span className="text-[10px] font-black px-2 py-1 rounded-lg bg-emerald-100 text-emerald-700">ครบ ✓</span>
  return <span className="text-[10px] font-black px-2 py-1 rounded-lg bg-amber-100 text-amber-700">ขาด {expected - received}</span>
}

const fmtDate = (d: string) =>
  new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short" }).format(new Date(d))

const fmtQty = (n: number) => n.toLocaleString("th-TH")

interface Props { lot: StockLot; items: LotItem[] }

export default function LotDetailClient({ lot, items: initItems }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // local received qty state (editable)
  const [editMode, setEditMode] = useState(false)
  const [received, setReceived] = useState<Record<number, number>>(
    Object.fromEntries(initItems.map(i => [i.id, Number(i.received_qty)]))
  )

  const totalExpected = initItems.reduce((s, i) => s + Number(i.expected_qty), 0)
  const totalReceived = Object.values(received).reduce((s, v) => s + v, 0)
  const totalDiff     = totalReceived - totalExpected
  const pct           = totalExpected > 0 ? Math.min(100, Math.round((totalReceived / totalExpected) * 100)) : 0

  const s = STATUS_MAP[lot.status] ?? STATUS_MAP.DRAFT

  const handleSend = () => {
    if (!confirm("ส่งลอตนี้ไปยังสาขาเลยไหมครับ? สถานะจะเปลี่ยนเป็น SENT")) return
    startTransition(async () => {
      try { await sendLot(lot.id); router.refresh() }
      catch (e: any) { alert(e.message) }
    })
  }

  const handleSaveReceived = () => {
    startTransition(async () => {
      try {
        await updateLotReceived(
          lot.id,
          Object.entries(received).map(([item_id, received_qty]) => ({
            item_id: Number(item_id),
            received_qty,
          }))
        )
        setEditMode(false)
        router.refresh()
      } catch (e: any) {
        alert("บันทึกไม่สำเร็จ: " + e.message)
      }
    })
  }

  const canEdit = lot.status !== "DRAFT" && lot.status !== "COMPLETED"

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6 pb-20">

      {/* Header */}
      <div className="flex items-start gap-4 flex-wrap">
        <button onClick={() => router.push("/lots")}
          className="p-2 border border-slate-200 rounded-xl text-slate-400 hover:text-slate-700 transition bg-white shadow-sm shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-black text-slate-900">{lot.lot_code}</h1>
            <span className={`inline-flex items-center gap-1.5 text-xs font-black px-3 py-1.5 rounded-xl uppercase ${s.cls}`}>
              {s.icon}{s.label}
            </span>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 font-medium mt-1.5">
            <span>🏬 {(lot.branches as any)?.branch_name ?? "—"}</span>
            <span>📅 สร้าง {fmtDate(lot.created_at)}</span>
            {lot.sent_at && <span>📤 ส่ง {fmtDate(lot.sent_at)}</span>}
            {lot.created_by_name && <span>👤 {lot.created_by_name}</span>}
          </div>
          {lot.note && <p className="text-sm text-slate-400 italic mt-1">{lot.note}</p>}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 shrink-0">
          {lot.status === "DRAFT" && (
            <button onClick={handleSend} disabled={isPending || initItems.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-40 transition shadow">
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              ส่งลอต
            </button>
          )}
          {canEdit && !editMode && (
            <button onClick={() => setEditMode(true)}
              className="flex items-center gap-2 px-5 py-2.5 border-2 border-indigo-400 text-indigo-600 rounded-xl font-bold text-sm hover:bg-indigo-50 transition">
              <Edit3 className="w-4 h-4" /> บันทึกรับของ
            </button>
          )}
          {editMode && (
            <>
              <button onClick={() => setEditMode(false)} disabled={isPending}
                className="px-5 py-2.5 border-2 border-slate-200 rounded-xl font-bold text-sm text-slate-500 hover:bg-slate-50 transition">
                ยกเลิก
              </button>
              <button onClick={handleSaveReceived} disabled={isPending}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 disabled:opacity-40 transition shadow">
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                บันทึก
              </button>
            </>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
          <div className="text-xs font-black uppercase tracking-widest text-slate-400">รายการ</div>
          <div className="text-3xl font-black text-slate-800 mt-1">{initItems.length}</div>
          <div className="text-xs text-slate-400 mt-0.5">สินค้า</div>
        </div>
        <div className="bg-indigo-50 rounded-3xl p-5 border border-indigo-100 shadow-sm">
          <div className="text-xs font-black uppercase tracking-widest text-indigo-500">สั่งไป</div>
          <div className="text-3xl font-black text-indigo-700 mt-1">{fmtQty(totalExpected)}</div>
          <div className="text-xs text-indigo-400 mt-0.5">ชิ้น</div>
        </div>
        <div className="bg-emerald-50 rounded-3xl p-5 border border-emerald-100 shadow-sm">
          <div className="text-xs font-black uppercase tracking-widest text-emerald-500">รับแล้ว</div>
          <div className="text-3xl font-black text-emerald-700 mt-1">{fmtQty(totalReceived)}</div>
          <div className="text-xs text-emerald-400 mt-0.5">ชิ้น</div>
        </div>
        <div className={`rounded-3xl p-5 border shadow-sm ${
          totalDiff > 0 ? "bg-amber-50 border-amber-100"
          : totalDiff < 0 ? "bg-rose-50 border-rose-100"
          : "bg-slate-50 border-slate-100"
        }`}>
          <div className={`text-xs font-black uppercase tracking-widest ${
            totalDiff > 0 ? "text-amber-500" : totalDiff < 0 ? "text-rose-500" : "text-slate-400"
          }`}>ผลต่าง</div>
          <div className={`text-3xl font-black mt-1 ${
            totalDiff > 0 ? "text-amber-700" : totalDiff < 0 ? "text-rose-700" : "text-slate-800"
          }`}>{totalDiff > 0 ? "+" : ""}{fmtQty(totalDiff)}</div>
          <div className="text-xs text-slate-400 mt-0.5">{totalDiff > 0 ? "เกิน" : totalDiff < 0 ? "ขาด" : "ครบ ✓"}</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-slate-700">ความคืบหน้าการรับของ</span>
          <span className={`text-sm font-black ${pct >= 100 ? "text-emerald-600" : "text-indigo-600"}`}>{pct}%</span>
        </div>
        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${pct >= 100 ? "bg-emerald-500" : "bg-indigo-500"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-slate-400 font-medium">
          <span>รับแล้ว {fmtQty(totalReceived)} ชิ้น</span>
          <span>เป้า {fmtQty(totalExpected)} ชิ้น</span>
        </div>
      </div>

      {/* Items table */}
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">รายการสินค้าในลอต</h2>
          {editMode && (
            <p className="text-xs text-indigo-600 font-bold mt-1">✏️ โหมดแก้ไข — กรอกจำนวนที่รับจริงแล้วกด "บันทึก"</p>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead className="bg-slate-50/50 border-b border-slate-100 text-left text-[10px] uppercase tracking-widest text-slate-400 font-black">
              <tr>
                <th className="px-5 py-4 w-8">#</th>
                <th className="px-5 py-4">สินค้า</th>
                <th className="px-5 py-4 text-right">สั่งไป</th>
                <th className="px-5 py-4 text-right">รับแล้ว</th>
                <th className="px-5 py-4 text-right">ผลต่าง</th>
                <th className="px-5 py-4">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {initItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400 italic">ยังไม่มีสินค้าในลอตนี้</td>
                </tr>
              ) : (
                initItems.map((item, idx) => {
                  const exp     = Number(item.expected_qty)
                  const rec     = received[item.id] ?? 0
                  const diff    = rec - exp
                  const isOver  = diff > 0
                  const isShort = diff < 0
                  const isExact = diff === 0

                  return (
                    <tr key={item.id} className={`hover:bg-slate-50 transition-colors ${isShort && rec > 0 ? "bg-amber-50/30" : ""}`}>
                      <td className="px-5 py-3 text-xs font-black text-slate-300">{idx + 1}</td>

                      {/* Product */}
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                            {item.products?.image_url
                              ? <img src={item.products.image_url} alt="" className="w-full h-full object-contain p-1"
                                  onError={e => { (e.target as HTMLImageElement).src = "/placeholder.png" }} />
                              : <Package className="w-5 h-5 text-slate-300" />}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800 line-clamp-1">{item.products?.name ?? "—"}</p>
                            <p className="text-[10px] font-mono text-slate-400">{item.products?.sku || item.products?.barcode || ""}</p>
                          </div>
                        </div>
                      </td>

                      {/* Expected */}
                      <td className="px-5 py-3 text-right font-black text-slate-700">{fmtQty(exp)}</td>

                      {/* Received — editable if editMode */}
                      <td className="px-5 py-3 text-right">
                        {editMode ? (
                          <input
                            type="number" min={0} value={rec}
                            onChange={e => setReceived(prev => ({ ...prev, [item.id]: Math.max(0, parseInt(e.target.value) || 0) }))}
                            className="w-20 text-right border-2 border-indigo-300 rounded-xl text-sm font-black py-1 px-2 outline-none focus:ring-2 focus:ring-indigo-200"
                          />
                        ) : (
                          <span className={`font-black text-base ${rec > 0 ? "text-emerald-700" : "text-slate-300"}`}>
                            {fmtQty(rec)}
                          </span>
                        )}
                      </td>

                      {/* Diff */}
                      <td className="px-5 py-3 text-right">
                        <span className={`font-black text-sm ${
                          isOver  ? "text-amber-600"
                          : isShort ? "text-rose-600"
                          : rec > 0 ? "text-emerald-600"
                          : "text-slate-300"
                        }`}>
                          {rec === 0 ? "—"
                            : isOver  ? <><span className="inline-flex items-center gap-0.5"><AlertTriangle className="w-3 h-3" />+{fmtQty(diff)}</span></>
                            : isShort ? <><span className="inline-flex items-center gap-0.5"><XCircle className="w-3 h-3" />{fmtQty(diff)}</span></>
                            : <><span className="inline-flex items-center gap-0.5"><CheckCircle2 className="w-3 h-3" />ครบ</span></>}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-3">
                        <ItemStatusBadge expected={exp} received={rec} />
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
