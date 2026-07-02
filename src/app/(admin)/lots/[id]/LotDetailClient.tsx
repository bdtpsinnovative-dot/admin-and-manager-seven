"use client"

import React, { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  Package, ArrowLeft, Send, CheckCircle2, AlertTriangle,
  XCircle, Loader2, Edit3, Save, Clock, RotateCw,
  Building2, CalendarDays, User, PackagePlus, FileText
} from "lucide-react"
import { sendLot, updateLotReceived, type StockLot, type LotItem } from "@/actions/lots"

const STATUS_MAP: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  DRAFT:     { label: "ร่าง",          cls: "bg-slate-100 text-slate-600 border-slate-200",    icon: <Clock className="w-3.5 h-3.5" /> },
  SENT:      { label: "ส่งแล้ว",       cls: "bg-blue-50 text-blue-700 border-blue-200",      icon: <Send className="w-3.5 h-3.5" /> },
  RECEIVING: { label: "กำลังรับ",      cls: "bg-amber-50 text-amber-700 border-amber-200",    icon: <RotateCw className="w-3.5 h-3.5" /> },
  PARTIAL:   { label: "รับบางส่วน",    cls: "bg-orange-50 text-orange-700 border-orange-200",  icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  COMPLETED: { label: "ครบแล้ว",       cls: "bg-emerald-50 text-emerald-700 border-emerald-200",icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  SUCCESS:   { label: "สำเร็จ",        cls: "bg-teal-50 text-teal-700 border-teal-200",      icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
}

function ItemStatusBadge({ expected, received }: { expected: number; received: number }) {
  if (received === 0)      return <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-500">รอรับ</span>
  if (received >= expected && expected > 0) return <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100">ครบ</span>
  if (expected === 0)      return <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100">นอกลอต</span>
  return <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-100">ขาด {expected - received}</span>
}

const fmtDate = (d: string) =>
  new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short" }).format(new Date(d))

const fmtQty = (n: number) => n.toLocaleString("th-TH")

interface Props { lot: StockLot; items: LotItem[] }

export default function LotDetailClient({ lot, items: initItems }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const isWalkin = lot.lot_code.toUpperCase().includes("WALKIN")

  // local received qty state (editable)
  const [editMode, setEditMode] = useState(false)
  const [received, setReceived] = useState<Record<number, number>>(
    Object.fromEntries(initItems.map(i => [i.id, Number(i.received_qty)]))
  )

  const totalExpected = initItems.reduce((s, i) => s + Number(i.expected_qty), 0)
  const totalReceived = Object.values(received).reduce((s, v) => s + v, 0)
  const totalDiff     = totalReceived - totalExpected
  const pct           = totalExpected > 0 ? Math.min(100, Math.round((totalReceived / totalExpected) * 100)) : (totalReceived > 0 ? 100 : 0)

  // Count ghost items (expected = 0, received > 0)
  const ghostCount = initItems.filter(i => Number(i.expected_qty) === 0 && (received[i.id] ?? 0) > 0).length
  const ghostQty = initItems.filter(i => Number(i.expected_qty) === 0).reduce((s, i) => s + (received[i.id] ?? 0), 0)

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

  // Progress bar color
  let barColor = "bg-slate-200"
  if (isWalkin) {
    barColor = totalReceived > 0 ? "bg-blue-500" : "bg-slate-200"
  } else if (pct >= 100) {
    barColor = "bg-emerald-500"
  } else if (pct > 0) {
    barColor = "bg-indigo-500"
  }

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-5 pb-20 text-slate-800">

      {/* ====== Header ====== */}
      <div className="flex items-start gap-4 flex-wrap border-b border-slate-200 pb-4">
        <button onClick={() => router.push("/lots")}
          className="p-2 border border-slate-200 rounded text-slate-400 hover:text-slate-700 bg-white transition shrink-0">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-slate-900">{lot.lot_code}</h1>
            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded border ${s.cls}`}>
              {s.icon}<span>{s.label}</span>
            </span>
            {/* Lot type badge */}
            {isWalkin ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-200">
                <PackagePlus className="w-3.5 h-3.5" /> <span>รับนอกลอต</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-600 border border-indigo-200">
                <Package className="w-3.5 h-3.5" /> <span>ตามลอต</span>
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 font-medium mt-1.5">
            <span className="flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <span>{(lot.branches as any)?.branch_name ?? "—"}</span>
            </span>
            <span>สร้าง {fmtDate(lot.created_at)}</span>
            {lot.sent_at && <span>ส่ง {fmtDate(lot.sent_at)}</span>}
            {lot.created_by_name && <span>โดย {lot.created_by_name}</span>}
          </div>
          {lot.note && (
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 shrink-0" /> 
              <span>หมายเหตุ: {lot.note}</span>
            </p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 shrink-0">
          {lot.status === "DRAFT" && (
            <button onClick={handleSend} disabled={isPending || initItems.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold text-sm transition">
              <Send className="w-4 h-4" />
              <span>ส่งลอต</span>
            </button>
          )}
          {canEdit && !editMode && (
            <button onClick={() => setEditMode(true)}
              className="flex items-center gap-1.5 px-4 py-2 border border-indigo-400 text-indigo-600 rounded font-semibold text-sm hover:bg-indigo-50 transition">
              <Edit3 className="w-4 h-4" /> 
              <span>บันทึกรับของ</span>
            </button>
          )}
          {editMode && (
            <>
              <button onClick={() => setEditMode(false)} disabled={isPending}
                className="px-4 py-2 border border-slate-200 rounded font-semibold text-sm text-slate-500 hover:bg-slate-50 transition">
                ยกเลิก
              </button>
              <button onClick={handleSaveReceived} disabled={isPending}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-semibold text-sm transition">
                <Save className="w-4 h-4" />
                <span>บันทึก</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* ====== Summary cards ====== */}
      <div className={`grid gap-3 ${isWalkin || ghostCount > 0 ? "grid-cols-2 md:grid-cols-5" : "grid-cols-2 md:grid-cols-4"}`}>
        <div className="bg-white rounded p-4 border border-slate-200">
          <div className="text-xs font-semibold text-slate-400 uppercase">รายการ</div>
          <div className="text-2xl font-bold text-slate-800 mt-1">{initItems.length} สินค้า</div>
        </div>
        <div className="bg-white rounded p-4 border border-slate-200">
          <div className="text-xs font-semibold text-slate-400 uppercase">สั่งไป</div>
          <div className="text-2xl font-bold text-slate-800 mt-1">{fmtQty(totalExpected)} ชิ้น</div>
        </div>
        <div className="bg-white rounded p-4 border border-slate-200">
          <div className="text-xs font-semibold text-slate-400 uppercase">รับแล้ว</div>
          <div className="text-2xl font-bold text-slate-800 mt-1">{fmtQty(totalReceived)} ชิ้น</div>
        </div>
        <div className="bg-white rounded p-4 border border-slate-200">
          <div className="text-xs font-semibold text-slate-400 uppercase">ผลต่าง</div>
          <div className={`text-2xl font-bold mt-1 ${
            totalDiff > 0 ? "text-amber-600" : totalDiff < 0 ? "text-rose-600" : "text-emerald-600"
          }`}>{totalDiff > 0 ? "+" : ""}{fmtQty(totalDiff)} ชิ้น</div>
        </div>

        {/* Ghost/WALKIN card */}
        {(isWalkin || ghostCount > 0) && (
          <div className="bg-blue-50 rounded p-4 border border-blue-200">
            <div className="text-xs font-semibold text-blue-500 uppercase">รับนอกลอต</div>
            <div className="text-2xl font-bold text-blue-700 mt-1">
              {isWalkin ? fmtQty(totalReceived) : fmtQty(ghostQty)} ชิ้น
            </div>
          </div>
        )}
      </div>

      {/* ====== Progress bar ====== */}
      <div className="bg-white rounded p-4 border border-slate-200 space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="text-slate-700">ความคืบหน้าการรับของ</span>
          {isWalkin ? (
            <span className="text-blue-600">รับนอกลอต (WALKIN)</span>
          ) : (
            <span className={pct >= 100 ? "text-emerald-600" : "text-indigo-600"}>{pct}%</span>
          )}
        </div>
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${barColor}`}
            style={{ width: `${isWalkin ? (totalReceived > 0 ? 100 : 0) : pct}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-slate-400 font-medium">
          <span>รับแล้ว {fmtQty(totalReceived)} ชิ้น</span>
          <span>{isWalkin ? "ไม่มียอดสั่ง (WALKIN)" : `เป้า ${fmtQty(totalExpected)} ชิ้น`}</span>
        </div>
      </div>

      {/* ====== Items table ====== */}
      <div className="bg-white rounded border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">รายการสินค้าในลอต</h2>
          {editMode && (
            <p className="text-xs text-indigo-600 font-bold">
              ✏️ กำลังแก้ไข — กรอกจำนวนที่รับจริงแล้วกด &quot;บันทึก&quot;
            </p>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead className="bg-slate-100/50 border-b border-slate-200 text-left text-xs text-slate-500 font-semibold">
              <tr>
                <th className="px-4 py-3 w-8">#</th>
                <th className="px-4 py-3">สินค้า</th>
                <th className="px-4 py-3 text-right">สั่งไป</th>
                <th className="px-4 py-3 text-right">รับแล้ว</th>
                <th className="px-4 py-3 text-right">ผลต่าง</th>
                <th className="px-4 py-3">ประเภท</th>
                <th className="px-4 py-3">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {initItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400 italic">ยังไม่มีสินค้าในลอตนี้</td>
                </tr>
              ) : (
                initItems.map((item, idx) => {
                  const exp     = Number(item.expected_qty)
                  const rec     = received[item.id] ?? 0
                  const diff    = rec - exp
                  const isOver  = diff > 0
                  const isShort = diff < 0
                  const isGhost = exp === 0

                  return (
                    <tr key={item.id} className={`hover:bg-slate-50 transition-colors ${isGhost && rec > 0 ? "bg-blue-50/20" : ""}`}>
                      <td className="px-4 py-2.5 text-xs text-slate-400">{idx + 1}</td>

                      {/* Product */}
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-slate-50 overflow-hidden flex items-center justify-center shrink-0 border border-slate-200">
                            {item.products?.image_url
                              ? <img src={item.products.image_url} alt="" className="w-full h-full object-contain p-0.5"
                                  onError={e => { (e.target as HTMLImageElement).src = "/placeholder.png" }} />
                              : <Package className="w-4 h-4 text-slate-300" />}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 line-clamp-1">{item.products?.name ?? "—"}</p>
                            <p className="text-[10px] font-mono text-slate-400">{item.products?.sku || item.products?.barcode || ""}</p>
                          </div>
                        </div>
                      </td>

                      {/* Expected */}
                      <td className="px-4 py-2.5 text-right font-semibold text-slate-700">
                        {exp === 0 ? <span className="text-slate-300">0</span> : fmtQty(exp)}
                      </td>

                      {/* Received — editable if editMode */}
                      <td className="px-4 py-2.5 text-right">
                        {editMode ? (
                          <input
                            type="number" min={0} value={rec}
                            onChange={e => setReceived(prev => ({ ...prev, [item.id]: Math.max(0, parseInt(e.target.value) || 0) }))}
                            className="w-16 text-right border border-indigo-300 rounded text-xs font-semibold py-1 px-1.5 outline-none bg-white"
                          />
                        ) : (
                          <span className={`font-bold ${rec > 0 ? (isGhost ? "text-blue-600" : "text-emerald-700") : "text-slate-300"}`}>
                            {fmtQty(rec)}
                          </span>
                        )}
                      </td>

                      {/* Diff */}
                      <td className="px-4 py-2.5 text-right">
                        <span className={`font-semibold ${
                          isGhost && rec > 0 ? "text-blue-600"
                          : isOver  ? "text-amber-600"
                          : isShort ? "text-rose-600"
                          : rec > 0 ? "text-emerald-600"
                          : "text-slate-300"
                        }`}>
                          {rec === 0 ? "—"
                            : isGhost ? `+${fmtQty(rec)}`
                            : isOver  ? `+${fmtQty(diff)}`
                            : isShort ? `${fmtQty(diff)}`
                            : "ครบ"}
                        </span>
                      </td>

                      {/* Type */}
                      <td className="px-4 py-2.5">
                        {isGhost || isWalkin ? (
                          <span className="text-xs font-semibold text-blue-600">นอกลอต</span>
                        ) : (
                          <span className="text-xs text-indigo-600">ตามลอต</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-2.5">
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
