"use client"

import React, { useState, useTransition, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  Package, ArrowLeft, Send, CheckCircle2, AlertTriangle,
  XCircle, Loader2, Edit3, Save, Clock, RotateCw,
  Building2, CalendarDays, User, PackagePlus, FileText,
  Tag, Search, Copy, Check, Download, Filter, ExternalLink
} from "lucide-react"
import { sendLot, updateLotReceived, syncLotWithRfidTags, type StockLot, type LotItem, type LotRfidTag } from "@/actions/lots"

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

interface Props {
  lot: StockLot
  items: LotItem[]
  rfidTags?: LotRfidTag[]
}

export default function LotDetailClient({ lot, items: initItems, rfidTags = [] }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const isWalkin = lot.lot_code.toUpperCase().includes("WALKIN")

  // Active view tab: 'items' or 'rfid'
  const [activeTab, setActiveTab] = useState<"items" | "rfid">("items")

  // RFID Filter state
  const [rfidFilterType, setRfidFilterType] = useState<"all" | "outside" | "regular">("all")
  const [rfidSearch, setRfidSearch] = useState("")
  const [rfidProductFilter, setRfidProductFilter] = useState<string>("all")
  const [copiedTag, setCopiedTag] = useState<string | null>(null)
  const [copyAllSuccess, setCopyAllSuccess] = useState(false)

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

  // Map product_id to lot item expected_qty
  const expectedMap = useMemo(() => {
    const map = new Map<number, number>()
    for (const item of initItems) {
      map.set(item.product_id, Number(item.expected_qty))
    }
    return map
  }, [initItems])

  // Count RFID tags per product
  const rfidCountByProduct = useMemo(() => {
    const map: Record<number, number> = {}
    for (const tag of rfidTags) {
      map[tag.product_id] = (map[tag.product_id] || 0) + 1
    }
    return map
  }, [rfidTags])

  // Tag classification: check if tag is outside the lot
  const enrichedRfidTags = useMemo(() => {
    return rfidTags.map(tag => {
      const exp = expectedMap.get(tag.product_id)
      // Outside lot if whole lot is WALKIN or product had expected_qty == 0 or product not in lot items
      const isOutside = isWalkin || exp === 0 || exp === undefined
      return {
        ...tag,
        isOutside,
      }
    })
  }, [rfidTags, isWalkin, expectedMap])

  const outsideTagsCount = enrichedRfidTags.filter(t => t.isOutside).length
  const regularTagsCount = enrichedRfidTags.filter(t => !t.isOutside).length

  // Filtered RFID Tags for display
  const filteredRfidTags = useMemo(() => {
    return enrichedRfidTags.filter(tag => {
      // Type filter
      if (rfidFilterType === "outside" && !tag.isOutside) return false
      if (rfidFilterType === "regular" && tag.isOutside) return false

      // Product filter
      if (rfidProductFilter !== "all" && String(tag.product_id) !== rfidProductFilter) return false

      // Search filter
      if (rfidSearch.trim()) {
        const q = rfidSearch.trim().toLowerCase()
        const rfidMatch = tag.rfid.toLowerCase().includes(q)
        const nameMatch = tag.products?.name.toLowerCase().includes(q) ?? false
        const skuMatch = tag.products?.sku?.toLowerCase().includes(q) ?? false
        const barcodeMatch = tag.products?.barcode?.toLowerCase().includes(q) ?? false
        if (!rfidMatch && !nameMatch && !skuMatch && !barcodeMatch) return false
      }

      return true
    })
  }, [enrichedRfidTags, rfidFilterType, rfidProductFilter, rfidSearch])

  const handleCopyTag = (rfid: string) => {
    navigator.clipboard.writeText(rfid)
    setCopiedTag(rfid)
    setTimeout(() => setCopiedTag(null), 2000)
  }

  const handleCopyAllTags = () => {
    const list = filteredRfidTags.map(t => t.rfid).join("\n")
    navigator.clipboard.writeText(list)
    setCopyAllSuccess(true)
    setTimeout(() => setCopyAllSuccess(false), 2500)
  }

  const handleExportCsv = () => {
    const headers = ["#", "RFID_Tag", "Product_ID", "Product_Name", "SKU", "Barcode", "Type", "Status", "Scanned_At"]
    const rows = filteredRfidTags.map((t, idx) => [
      idx + 1,
      t.rfid,
      t.product_id,
      `"${(t.products?.name || "").replace(/"/g, '""')}"`,
      t.products?.sku || "",
      t.products?.barcode || "",
      t.isOutside ? "รับนอกลอต" : "ตามลอต",
      t.status,
      t.created_at
    ])
    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `lot_${lot.id}_rfid_tags_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

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

  const handleSyncRfidTags = () => {
    if (!confirm(`ปรับยอดรับในลอตทุกตารางให้ซิงค์ตรงกับจำนวน RFID Tag จริง (${rfidTags.length} แท็ก) เลยไหมครับ?`)) return
    startTransition(async () => {
      try {
        await syncLotWithRfidTags(lot.id)
        router.refresh()
      } catch (e: any) {
        alert("เกิดข้อผิดพลาดในการซิงค์: " + e.message)
      }
    })
  }

  const canEdit = lot.status !== "DRAFT" && lot.status !== "COMPLETED"
  const hasTagMismatch = rfidTags.length > 0 && totalReceived !== rfidTags.length

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
          {hasTagMismatch && !editMode && (
            <button
              onClick={handleSyncRfidTags}
              disabled={isPending}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded font-semibold text-sm transition shadow-sm"
              title="ซิงค์ยอดรับในลอตให้ตรงกับจำนวน RFID Tag จริง"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCw className="w-4 h-4" />}
              <span>ซิงค์ยอดกับ Tag ({rfidTags.length})</span>
            </button>
          )}

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

      {/* ====== Mismatch Alert Banner ====== */}
      {hasTagMismatch && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center justify-between gap-3 flex-wrap shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg text-amber-700">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-900">
                ตรวจพบยอดรับในลอต ({fmtQty(totalReceived)} ชิ้น) ไม่ตรงกับจำนวน RFID Tag ({fmtQty(rfidTags.length)} แท็ก)
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                เกิดจากยอดบันทึกซ้ำ 2 เท่า — สามารถกดปุ่มเพื่อปรับยอดทุกตารางให้ซิงค์ตรงกับแท็กจริง 12 ชิ้นได้ทันที
              </p>
            </div>
          </div>
          <button
            onClick={handleSyncRfidTags}
            disabled={isPending}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded font-bold text-xs transition shadow-sm shrink-0"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCw className="w-4 h-4" />}
            <span>⚡ ปรับยอดทุกตารางให้ตรงกับ RFID Tag ({rfidTags.length} ชิ้น)</span>
          </button>
        </div>
      )}

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
          <button
            onClick={() => {
              setActiveTab("rfid")
              setRfidFilterType("outside")
              setRfidSearch("")
              setRfidProductFilter("all")
            }}
            className="bg-blue-50 hover:bg-blue-100/70 text-left rounded p-4 border border-blue-200 transition group cursor-pointer shadow-sm relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-blue-600 uppercase">รับนอกลอต</div>
              <span className="text-[11px] text-blue-600 font-medium group-hover:underline flex items-center gap-0.5">
                ดู Tag <ExternalLink className="w-3 h-3" />
              </span>
            </div>
            <div className="text-2xl font-bold text-blue-700 mt-1">
              {isWalkin ? fmtQty(totalReceived) : fmtQty(ghostQty)} ชิ้น
            </div>
            <div className="text-[11px] text-blue-500 mt-0.5">
              🏷️ มี {outsideTagsCount} RFID Tags นอกลอต
            </div>
          </button>
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

      {/* ====== Tab Bar (Items vs RFID Tags) ====== */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("items")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 transition ${
            activeTab === "items"
              ? "border-indigo-600 text-indigo-600 bg-white"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Package className="w-4 h-4" />
          <span>รายการสินค้า</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
            {initItems.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("rfid")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 transition ${
            activeTab === "rfid"
              ? "border-blue-600 text-blue-600 bg-white"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Tag className="w-4 h-4" />
          <span>RFID Tags ที่ผูกกับลอต</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
            outsideTagsCount > 0 ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"
          }`}>
            {rfidTags.length}
          </span>
          {outsideTagsCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-600 text-white font-medium">
              นอกลอต {outsideTagsCount}
            </span>
          )}
        </button>
      </div>

      {/* ====== TAB 1: Items Table ====== */}
      {activeTab === "items" && (
        <div className="bg-white rounded border border-slate-200 overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              รายการสินค้าในลอต
            </h2>
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
                  <th className="px-4 py-3 text-center">RFID Tags</th>
                  <th className="px-4 py-3">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {initItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-slate-400 italic">ยังไม่มีสินค้าในลอตนี้</td>
                  </tr>
                ) : (
                  initItems.map((item, idx) => {
                    const exp     = Number(item.expected_qty)
                    const rec     = received[item.id] ?? 0
                    const diff    = rec - exp
                    const isOver  = diff > 0
                    const isShort = diff < 0
                    const isGhost = exp === 0
                    const tagCount = rfidCountByProduct[item.product_id] || 0

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
                            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-200">
                              นอกลอต
                            </span>
                          ) : (
                            <span className="text-xs text-indigo-600 font-medium">ตามลอต</span>
                          )}
                        </td>

                        {/* RFID Tag Count Link */}
                        <td className="px-4 py-2.5 text-center">
                          {tagCount > 0 ? (
                            <button
                              onClick={() => {
                                setActiveTab("rfid")
                                setRfidProductFilter(String(item.product_id))
                                setRfidFilterType("all")
                                setRfidSearch("")
                              }}
                              className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded border border-blue-200 transition"
                              title="คลิกเพื่อดูแท็ก RFID ของสินค้านี้"
                            >
                              <Tag className="w-3 h-3" />
                              <span>{tagCount} แท็ก</span>
                            </button>
                          ) : (
                            <span className="text-xs text-slate-300">—</span>
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
      )}

      {/* ====== TAB 2: RFID Tags View ====== */}
      {activeTab === "rfid" && (
        <div className="space-y-4">
          {/* Tag Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white rounded-lg p-3.5 border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-medium">แท็กทั้งหมดในลอตนี้</p>
                <p className="text-2xl font-extrabold text-slate-800 mt-0.5">{rfidTags.length} <span className="text-sm font-normal text-slate-500">แท็ก</span></p>
              </div>
              <div className="p-2.5 bg-slate-100 rounded-lg text-slate-600">
                <Tag className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-blue-50/70 rounded-lg p-3.5 border border-blue-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-600 font-medium">แท็กที่รับนอกลอต (Ghost/Extra)</p>
                <p className="text-2xl font-extrabold text-blue-700 mt-0.5">{outsideTagsCount} <span className="text-sm font-normal text-blue-600">แท็ก</span></p>
              </div>
              <div className="p-2.5 bg-blue-100 rounded-lg text-blue-600">
                <PackagePlus className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-emerald-50/70 rounded-lg p-3.5 border border-emerald-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs text-emerald-700 font-medium">แท็กที่รับตามลอตปกติ</p>
                <p className="text-2xl font-extrabold text-emerald-800 mt-0.5">{regularTagsCount} <span className="text-sm font-normal text-emerald-600">แท็ก</span></p>
              </div>
              <div className="p-2.5 bg-emerald-100 rounded-lg text-emerald-600">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Search, Filters & Action Toolbar */}
          <div className="bg-white rounded border border-slate-200 p-4 space-y-3 shadow-sm">
            <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
              
              {/* Filter Pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => setRfidFilterType("all")}
                  className={`px-3 py-1.5 rounded text-xs font-bold transition flex items-center gap-1.5 ${
                    rfidFilterType === "all"
                      ? "bg-slate-800 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  <span>ทั้งหมด</span>
                  <span className="opacity-80">({rfidTags.length})</span>
                </button>

                <button
                  onClick={() => setRfidFilterType("outside")}
                  className={`px-3 py-1.5 rounded text-xs font-bold transition flex items-center gap-1.5 ${
                    rfidFilterType === "outside"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
                  }`}
                >
                  <PackagePlus className="w-3.5 h-3.5" />
                  <span>เฉพาะรับนอกลอต</span>
                  <span className="opacity-80">({outsideTagsCount})</span>
                </button>

                <button
                  onClick={() => setRfidFilterType("regular")}
                  className={`px-3 py-1.5 rounded text-xs font-bold transition flex items-center gap-1.5 ${
                    rfidFilterType === "regular"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                  }`}
                >
                  <Package className="w-3.5 h-3.5" />
                  <span>ตามลอตปกติ</span>
                  <span className="opacity-80">({regularTagsCount})</span>
                </button>
              </div>

              {/* Action Buttons: Copy All & Export */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleCopyAllTags}
                  disabled={filteredRfidTags.length === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded text-xs font-semibold transition disabled:opacity-40"
                  title="คัดลอกรหัส RFID ทั้งหมดตามที่กรองไว้"
                >
                  {copyAllSuccess ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-600 font-bold">คัดลอก {filteredRfidTags.length} แท็กแล้ว!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      <span>คัดลอกรหัส RFID ({filteredRfidTags.length})</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleExportCsv}
                  disabled={filteredRfidTags.length === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded text-xs font-semibold transition disabled:opacity-40"
                  title="ดาวน์โหลดไฟล์ CSV รายการแท็ก"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>ส่งออก CSV</span>
                </button>
              </div>
            </div>

            {/* Search Bar and Product Dropdown */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-2 border-t border-slate-100">
              <div className="sm:col-span-8 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={rfidSearch}
                  onChange={e => setRfidSearch(e.target.value)}
                  placeholder="ค้นหาด้วยรหัส RFID, ชื่อสินค้า, SKU, Barcode..."
                  className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded text-xs outline-none focus:border-blue-500 bg-white"
                />
              </div>

              <div className="sm:col-span-4">
                <select
                  value={rfidProductFilter}
                  onChange={e => setRfidProductFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs outline-none focus:border-blue-500 bg-white text-slate-700 font-medium"
                >
                  <option value="all">กรองทุกสินค้า ({enrichedRfidTags.length} แท็ก)</option>
                  {initItems.map(item => {
                    const cnt = rfidCountByProduct[item.product_id] || 0
                    return (
                      <option key={item.product_id} value={String(item.product_id)}>
                        {item.products?.name ?? `ID #${item.product_id}`} ({cnt} แท็ก)
                      </option>
                    )
                  })}
                </select>
              </div>
            </div>
          </div>

          {/* RFID Tags Table */}
          <div className="bg-white rounded border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-slate-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  รายการ RFID Tags ({filteredRfidTags.length} รายการ)
                </h3>
              </div>
              {rfidFilterType === "outside" && (
                <span className="text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded">
                  🔍 กำลังแสดงเฉพาะแท็กที่รับนอกลอต
                </span>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead className="bg-slate-100/60 border-b border-slate-200 text-left text-xs text-slate-500 font-semibold">
                  <tr>
                    <th className="px-4 py-3 w-8">#</th>
                    <th className="px-4 py-3">รหัส RFID Tag</th>
                    <th className="px-4 py-3">สินค้า</th>
                    <th className="px-4 py-3">ประเภทการรับ</th>
                    <th className="px-4 py-3">สถานะ Tag</th>
                    <th className="px-4 py-3 text-right">เวลาสแกนรับ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRfidTags.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <Tag className="w-8 h-8 mx-auto text-slate-300 mb-2 opacity-50" />
                        <p className="font-semibold text-slate-500">ไม่พบ RFID Tag ตามเงื่อนไขที่ค้นหา</p>
                        <p className="text-xs text-slate-400 mt-1">
                          {rfidTags.length === 0
                            ? "ยังไม่มีการสแกนผูก RFID Tag เข้ากับลอตนี้"
                            : "ลองเปลี่ยนคำค้นหาหรือเปลี่ยนแท็บตัวกรองด้านบน"}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredRfidTags.map((tag, idx) => {
                      const isCopied = copiedTag === tag.rfid
                      return (
                        <tr
                          key={tag.id || tag.rfid}
                          className={`hover:bg-slate-50 transition-colors ${
                            tag.isOutside ? "bg-blue-50/15" : ""
                          }`}
                        >
                          <td className="px-4 py-2.5 text-xs text-slate-400">{idx + 1}</td>

                          {/* RFID Tag Code */}
                          <td className="px-4 py-2.5 font-mono text-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 select-all tracking-wider">
                                {tag.rfid}
                              </span>
                              <button
                                onClick={() => handleCopyTag(tag.rfid)}
                                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded transition"
                                title="คัดลอกรหัส RFID"
                              >
                                {isCopied ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </td>

                          {/* Product Info */}
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded bg-slate-50 overflow-hidden flex items-center justify-center shrink-0 border border-slate-200">
                                {tag.products?.image_url ? (
                                  <img
                                    src={tag.products.image_url}
                                    alt=""
                                    className="w-full h-full object-contain p-0.5"
                                    onError={e => {
                                      ;(e.target as HTMLImageElement).src = "/placeholder.png"
                                    }}
                                  />
                                ) : (
                                  <Package className="w-3.5 h-3.5 text-slate-300" />
                                )}
                              </div>
                              <div>
                                <p className="font-bold text-slate-800 text-xs line-clamp-1">
                                  {tag.products?.name ?? `สินค้า ID #${tag.product_id}`}
                                </p>
                                <p className="text-[10px] font-mono text-slate-400">
                                  {tag.products?.sku || tag.products?.barcode || `ID: ${tag.product_id}`}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Outside / Regular Tag Badge */}
                          <td className="px-4 py-2.5">
                            {tag.isOutside ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                                <PackagePlus className="w-3 h-3" />
                                <span>รับนอกลอต</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                <Package className="w-3 h-3" />
                                <span>ตามลอต</span>
                              </span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="px-4 py-2.5">
                            <span
                              className={`text-[11px] font-bold px-2 py-0.5 rounded border ${
                                tag.status === "IN_STOCK"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : tag.status === "SOLD"
                                  ? "bg-slate-100 text-slate-500 border-slate-200"
                                  : "bg-amber-50 text-amber-700 border-amber-200"
                              }`}
                            >
                              {tag.status === "IN_STOCK" ? "IN STOCK (พร้อมขาย)" : tag.status}
                            </span>
                          </td>

                          {/* Scan Date/Time */}
                          <td className="px-4 py-2.5 text-right text-xs text-slate-500">
                            {tag.created_at ? fmtDate(tag.created_at) : "—"}
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
      )}
    </div>
  )
}

