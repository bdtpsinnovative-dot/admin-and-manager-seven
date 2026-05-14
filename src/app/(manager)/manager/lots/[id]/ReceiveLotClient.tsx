"use client"

import React, { useState, useRef, useCallback, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft, ScanLine, Package, CheckCircle2, AlertTriangle,
  Loader2, Save, Plus, Minus, X, Send, RotateCw, Clock, Trash2
} from "lucide-react"
import { receiveLotItems, type StockLot, type LotItem } from "@/actions/lots"

// ---- Types ----

interface PendingItem {
  lot_item_id: number
  product_id: number
  name: string
  sku: string | null
  barcode: string | null
  image_url: string | null
  qty_added: number
  expected_qty: number
  already_received: number
}

// ---- Status helpers ----

const STATUS_MAP: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  SENT:      { label: "รอรับ",       cls: "bg-blue-100 text-blue-700",      icon: <Send className="w-3.5 h-3.5" /> },
  RECEIVING: { label: "กำลังรับ",    cls: "bg-amber-100 text-amber-700",    icon: <RotateCw className="w-3.5 h-3.5" /> },
  PARTIAL:   { label: "รับบางส่วน",  cls: "bg-orange-100 text-orange-700",  icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  COMPLETED: { label: "ครบแล้ว ✓",   cls: "bg-emerald-100 text-emerald-700",icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
}

const fmtQty = (n: number) => n.toLocaleString("th-TH")

// ---- Quantity Dialog ----

interface QtyDialogProps {
  item: LotItem
  onConfirm: (qty: number) => void
  onClose: () => void
}

function QtyDialog({ item, onConfirm, onClose }: QtyDialogProps) {
  const remaining = Math.max(0, Number(item.expected_qty) - Number(item.received_qty))
  const [qty, setQty] = useState(remaining > 0 ? remaining : 1)

  const adjust = (delta: number) => setQty(q => Math.max(1, q + delta))

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-white rounded-[2rem] shadow-2xl overflow-hidden">

        {/* Product info */}
        <div className="flex items-center gap-4 p-5 border-b border-slate-100">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
            {item.products?.image_url
              ? <img src={item.products.image_url} alt="" className="w-full h-full object-contain p-1"
                  onError={e => { (e.target as HTMLImageElement).style.display = "none" }} />
              : <Package className="w-8 h-8 text-slate-300" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-slate-900 leading-tight line-clamp-2">{item.products?.name ?? "สินค้า"}</p>
            <p className="text-xs font-mono text-slate-400 mt-1">{item.products?.sku || item.products?.barcode || ""}</p>
            <div className="flex gap-3 mt-1.5 text-[11px]">
              <span className="text-indigo-600 font-bold">สั่ง {fmtQty(Number(item.expected_qty))}</span>
              <span className="text-emerald-600 font-bold">รับแล้ว {fmtQty(Number(item.received_qty))}</span>
              {remaining > 0 && <span className="text-amber-600 font-bold">ค้าง {fmtQty(remaining)}</span>}
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Qty control */}
        <div className="p-6 space-y-4">
          <p className="text-center text-sm font-bold text-slate-500">จำนวนที่รับครั้งนี้</p>
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => adjust(-1)}
              className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600 active:bg-slate-200 transition text-2xl font-black"
            >
              <Minus className="w-6 h-6" />
            </button>
            <input
              type="number"
              min={1}
              value={qty}
              onChange={e => setQty(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-28 h-14 text-center text-3xl font-black text-slate-900 border-2 border-indigo-300 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-100"
            />
            <button
              onClick={() => adjust(1)}
              className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600 active:bg-slate-200 transition text-2xl font-black"
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>

          <button
            onClick={() => onConfirm(qty)}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-lg transition shadow-lg shadow-indigo-200 active:scale-[.98]"
          >
            ยืนยัน {fmtQty(qty)} ชิ้น
          </button>
        </div>
      </div>
    </div>
  )
}

// ---- Main Component ----

interface Props {
  lot: StockLot
  items: LotItem[]
  branchId: number
  branchName: string
}

export default function ReceiveLotClient({ lot, items, branchId, branchName }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const inputRef = useRef<HTMLInputElement>(null)
  const [barcodeInput, setBarcodeInput] = useState("")
  const [dialogItem,   setDialogItem]   = useState<LotItem | null>(null)
  const [notFoundMsg,  setNotFoundMsg]  = useState("")

  // pending: map product_id → PendingItem
  const [pending, setPending] = useState<Map<number, PendingItem>>(new Map())

  const s     = STATUS_MAP[lot.status] ?? STATUS_MAP.SENT
  const totalPendingQty = Array.from(pending.values()).reduce((s, p) => s + p.qty_added, 0)
  const totalExpected   = items.reduce((s, i) => s + Number(i.expected_qty), 0)
  const totalReceived   = items.reduce((s, i) => s + Number(i.received_qty), 0)
  const pct = totalExpected > 0 ? Math.min(100, Math.round(((totalReceived + totalPendingQty) / totalExpected) * 100)) : 0

  // ---- Scan / lookup ----
  const handleScan = useCallback(() => {
    const code = barcodeInput.trim()
    if (!code) return
    setNotFoundMsg("")

    const found = items.find(item =>
      item.products?.barcode === code || item.products?.sku === code
    )

    if (found) {
      setDialogItem(found)
    } else {
      setNotFoundMsg(`ไม่พบ "${code}" ในลอตนี้`)
      setTimeout(() => setNotFoundMsg(""), 3000)
    }
    setBarcodeInput("")
    inputRef.current?.focus()
  }, [barcodeInput, items])

  const handleConfirm = (qty: number) => {
    if (!dialogItem) return
    const p = dialogItem.products!
    setPending(prev => {
      const next = new Map(prev)
      const existing = next.get(dialogItem.product_id)
      next.set(dialogItem.product_id, {
        lot_item_id:      dialogItem.id,
        product_id:       dialogItem.product_id,
        name:             p.name,
        sku:              p.sku ?? null,
        barcode:          p.barcode ?? null,
        image_url:        p.image_url ?? null,
        qty_added:        (existing?.qty_added ?? 0) + qty,
        expected_qty:     Number(dialogItem.expected_qty),
        already_received: Number(dialogItem.received_qty),
      })
      return next
    })
    setDialogItem(null)
    inputRef.current?.focus()
  }

  const removePending = (product_id: number) => {
    setPending(prev => { const next = new Map(prev); next.delete(product_id); return next })
  }

  // ---- Save ----
  const handleSave = () => {
    if (pending.size === 0) return
    startTransition(async () => {
      try {
        await receiveLotItems(
          lot.id,
          branchId,
          Array.from(pending.values()).map(p => ({
            lot_item_id: p.lot_item_id,
            product_id:  p.product_id,
            qty_added:   p.qty_added,
          }))
        )
        setPending(new Map())
        router.refresh()
      } catch (e: any) {
        alert("บันทึกไม่สำเร็จ: " + e.message)
      }
    })
  }

  return (
    <>
      {/* Qty Dialog */}
      {dialogItem && (
        <QtyDialog
          item={dialogItem}
          onConfirm={handleConfirm}
          onClose={() => { setDialogItem(null); inputRef.current?.focus() }}
        />
      )}

      <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-4 pb-32">

        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/manager/lots")}
            className="p-2 border border-slate-200 rounded-xl text-slate-400 hover:text-slate-700 bg-white shadow-sm shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-black text-slate-900">{lot.lot_code}</h1>
              <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-lg ${s.cls}`}>
                {s.icon}{s.label}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">🏬 {branchName}</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-1.5">
          <div className="flex justify-between text-xs font-bold text-slate-500">
            <span>รับแล้ว {fmtQty(totalReceived + totalPendingQty)} / {fmtQty(totalExpected)} ชิ้น</span>
            <span className={pct >= 100 ? "text-emerald-600" : "text-indigo-600"}>{pct}%</span>
          </div>
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${pct >= 100 ? "bg-emerald-500" : "bg-indigo-500"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="text-xs text-slate-400">{items.length} รายการสินค้าในลอตนี้</div>
        </div>

        {/* Barcode scanner input */}
        <div className="bg-white rounded-2xl border-2 border-indigo-200 shadow-sm p-4 space-y-2">
          <label className="text-xs font-black uppercase tracking-widest text-indigo-500 flex items-center gap-1.5">
            <ScanLine className="w-4 h-4" /> สแกน / พิมพ์บาร์โค้ด
          </label>
          <div className="flex gap-2">
            <input
              ref={inputRef}
              autoFocus
              type="text"
              value={barcodeInput}
              onChange={e => setBarcodeInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleScan() }}
              placeholder="สแกนหรือพิมพ์บาร์โค้ด แล้วกด Enter"
              className="flex-1 px-4 py-3 text-lg font-bold border-2 border-slate-200 rounded-xl outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition placeholder:font-normal placeholder:text-sm"
            />
            <button
              onClick={handleScan}
              className="px-5 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition active:scale-95"
            >
              ค้นหา
            </button>
          </div>
          {notFoundMsg && (
            <p className="text-xs font-bold text-rose-600 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> {notFoundMsg}
            </p>
          )}
        </div>

        {/* Pending list (items scanned this session) */}
        {pending.size > 0 && (
          <div className="space-y-2">
            <h2 className="text-xs font-black uppercase tracking-widest text-amber-600 px-1 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> รอบันทึก ({pending.size} รายการ · {fmtQty(totalPendingQty)} ชิ้น)
            </h2>
            {Array.from(pending.values()).map(p => (
              <div key={p.product_id}
                className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white overflow-hidden flex items-center justify-center shrink-0 border border-amber-100">
                  {p.image_url
                    ? <img src={p.image_url} alt="" className="w-full h-full object-contain p-0.5"
                        onError={e => { (e.target as HTMLImageElement).style.display = "none" }} />
                    : <Package className="w-5 h-5 text-amber-300" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-slate-900 line-clamp-1">{p.name}</p>
                  <p className="text-[10px] font-mono text-slate-400">{p.sku || p.barcode}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-2xl font-black text-amber-700">{fmtQty(p.qty_added)}</p>
                  <p className="text-[10px] text-amber-500 font-bold">ชิ้น</p>
                </div>
                <button
                  onClick={() => removePending(p.product_id)}
                  className="p-1.5 text-slate-400 hover:text-rose-500 transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Lot items list */}
        <div className="space-y-2">
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 px-1">รายการสินค้าในลอต</h2>
          {items.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-sm">ไม่มีสินค้าในลอตนี้</div>
          ) : (
            items.map(item => {
              const exp      = Number(item.expected_qty)
              const rec      = Number(item.received_qty)
              const pendQty  = pending.get(item.product_id)?.qty_added ?? 0
              const total    = rec + pendQty
              const isComplete = total >= exp
              const isPartial  = total > 0 && total < exp

              return (
                <button
                  key={item.id}
                  onClick={() => { setDialogItem(item); setNotFoundMsg("") }}
                  disabled={lot.status === "COMPLETED"}
                  className={`w-full text-left bg-white rounded-2xl border-2 p-4 flex items-center gap-3 transition-all active:scale-[.98] ${
                    isComplete ? "border-emerald-200 bg-emerald-50/30"
                    : isPartial ? "border-amber-200 hover:border-amber-300"
                    : "border-slate-100 hover:border-indigo-300"
                  }`}
                >
                  {/* Image */}
                  <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                    {item.products?.image_url
                      ? <img src={item.products.image_url} alt="" className="w-full h-full object-contain p-1"
                          onError={e => { (e.target as HTMLImageElement).style.display = "none" }} />
                      : <Package className="w-6 h-6 text-slate-300" />}
                  </div>

                  {/* Name + code */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-slate-900 line-clamp-1">{item.products?.name ?? "—"}</p>
                    <p className="text-[10px] font-mono text-slate-400">{item.products?.sku || item.products?.barcode || ""}</p>
                    {/* Mini progress */}
                    <div className="mt-1.5 w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${isComplete ? "bg-emerald-500" : "bg-indigo-400"}`}
                        style={{ width: `${exp > 0 ? Math.min(100, Math.round((total / exp) * 100)) : 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Qty info */}
                  <div className="text-right shrink-0 space-y-0.5">
                    <div className="flex items-baseline gap-1 justify-end">
                      <span className={`text-xl font-black ${isComplete ? "text-emerald-700" : isPartial ? "text-amber-700" : "text-slate-300"}`}>
                        {fmtQty(total)}
                      </span>
                      <span className="text-xs text-slate-400 font-bold">/ {fmtQty(exp)}</span>
                    </div>
                    {isComplete && <span className="text-[10px] font-black text-emerald-600 block">ครบแล้ว ✓</span>}
                    {isPartial && <span className="text-[10px] font-black text-amber-600 block">ขาด {fmtQty(exp - total)}</span>}
                    {!isComplete && !isPartial && <span className="text-[10px] font-black text-slate-400 block">แตะเพื่อรับ</span>}
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* Bottom sticky save bar */}
      {pending.size > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-40 p-4 bg-white/95 backdrop-blur border-t border-slate-200 shadow-xl">
          <div className="max-w-2xl mx-auto flex items-center gap-3">
            <div className="flex-1">
              <p className="text-sm font-black text-slate-800">
                รอบันทึก {fmtQty(totalPendingQty)} ชิ้น · {pending.size} รายการ
              </p>
              <p className="text-xs text-slate-400 font-medium">กด "บันทึก" เพื่อเพิ่มเข้าสต็อก</p>
            </div>
            <button
              onClick={handleSave}
              disabled={isPending}
              className="flex items-center gap-2 px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-2xl font-black text-sm transition shadow-lg shadow-emerald-200 active:scale-95"
            >
              {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              บันทึก
            </button>
          </div>
        </div>
      )}
    </>
  )
}
