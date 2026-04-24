"use client"

import React, { useState, useEffect, useRef, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  Package, Search, Plus, X, Loader2, ArrowLeft,
  Shuffle, Building2, FileText, ClipboardList
} from "lucide-react"
import {
  getBranches, searchProducts, createLot, getProductsByCodes,
  type Branch, type ProductSearchResult
} from "@/actions/lots"

interface LotItem {
  product: ProductSearchResult
  expected_qty: number
}

function genLotCode() {
  const d = new Date()
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`
  const rand = String(Math.floor(Math.random() * 900) + 100)
  return `LOT-${ymd}-${rand}`
}

export default function NewLotPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // form fields
  const [lotCode,   setLotCode]   = useState(genLotCode)
  const [branchId,  setBranchId]  = useState<number | "">("")
  const [note,      setNote]      = useState("")
  const [branches,  setBranches]  = useState<Branch[]>([])

  // product search
  const [searchQ,      setSearchQ]      = useState("")
  const [searchResults, setSearchResults] = useState<ProductSearchResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  // items in lot
  const [items, setItems] = useState<LotItem[]>([])

  // import modal
  const [showImport,   setShowImport]   = useState(false)
  const [importText,   setImportText]   = useState("")
  const [importLoading, setImportLoading] = useState(false)

  const [submitError, setSubmitError] = useState("")

  useEffect(() => { getBranches().then(setBranches) }, [])

  // debounced search
  useEffect(() => {
    if (!searchQ.trim()) { setSearchResults([]); return }
    const t = setTimeout(async () => {
      setSearchLoading(true)
      const res = await searchProducts(searchQ)
      setSearchResults(res)
      setSearchLoading(false)
    }, 300)
    return () => clearTimeout(t)
  }, [searchQ])

  const addItem = (product: ProductSearchResult) => {
    if (items.some(i => i.product.id === product.id)) return
    setItems(prev => [...prev, { product, expected_qty: 1 }])
    setSearchQ("")
    setSearchResults([])
  }

  const removeItem = (productId: number) =>
    setItems(prev => prev.filter(i => i.product.id !== productId))

  const updateQty = (productId: number, qty: number) =>
    setItems(prev => prev.map(i => i.product.id === productId ? { ...i, expected_qty: Math.max(1, qty) } : i))

  const totalQty = items.reduce((s, i) => s + i.expected_qty, 0)

  const handleImport = async () => {
    const lines = importText.split("\n")
    const parsed: { qty: number; code: string }[] = []

    for (const line of lines) {
      if (!line.trim()) continue
      const parts = line.split("\t")
      if (parts.length >= 2) {
        const qty  = parseInt(parts[0].trim())
        const code = parts[1].trim()
        if (!isNaN(qty) && qty > 0 && code) parsed.push({ qty, code })
      }
    }

    if (parsed.length === 0) {
      alert("ไม่พบข้อมูลที่ถูกต้อง\nตรวจสอบว่า Copy จาก Sheets แล้ว Paste ตรงๆ (จำนวน [Tab] รหัสสินค้า)")
      return
    }

    setImportLoading(true)
    const codes = parsed.map(p => p.code)
    const { found, notFound } = await getProductsByCodes(codes)
    setImportLoading(false)

    // merge into items list (ไม่ duplicate, ถ้ามีอยู่แล้วให้ update qty)
    setItems(prev => {
      const next = [...prev]
      for (const p of found) {
        const qty = parsed.find(x => x.code === p.matchedCode)?.qty ?? 1
        const existing = next.findIndex(i => i.product.id === p.id)
        if (existing >= 0) {
          next[existing] = { ...next[existing], expected_qty: qty }
        } else {
          next.push({ product: p, expected_qty: qty })
        }
      }
      return next
    })

    setShowImport(false)
    setImportText("")

    if (notFound.length > 0) {
      alert(`นำเข้าสำเร็จ ${found.length} รายการ\n\nไม่พบรหัสเหล่านี้ในระบบ:\n${notFound.join(", ")}`)
    }
  }

  const handleSubmit = () => {
    setSubmitError("")
    if (!lotCode.trim())  { setSubmitError("กรุณากรอกรหัสลอต"); return }
    if (!branchId)        { setSubmitError("กรุณาเลือกสาขา"); return }
    if (items.length === 0) { setSubmitError("กรุณาเพิ่มสินค้าอย่างน้อย 1 รายการ"); return }

    startTransition(async () => {
      try {
        const res = await createLot({
          lot_code:  lotCode.trim(),
          branch_id: Number(branchId),
          note:      note.trim() || undefined,
          items:     items.map(i => ({ product_id: i.product.id, expected_qty: i.expected_qty })),
        })
        router.push(`/lots/${res.id}`)
      } catch (e: any) {
        setSubmitError(e.message)
      }
    })
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6 pb-20">

      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.push("/lots")}
          className="p-2 border border-slate-200 rounded-xl text-slate-400 hover:text-slate-700 transition bg-white shadow-sm">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Package className="w-7 h-7 text-indigo-600" /> สร้างลอตใหม่
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">กำหนดรายการสินค้าและสาขาที่จะส่ง</p>
        </div>
      </div>

      {/* ---- Section 1: Lot Info ---- */}
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 space-y-4">
        <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
          <FileText className="w-4 h-4" /> ข้อมูลลอต
        </h2>

        {/* Lot code */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-600">รหัสลอต *</label>
          <div className="flex gap-2">
            <input
              value={lotCode}
              onChange={e => setLotCode(e.target.value)}
              placeholder="LOT-20240424-001"
              className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold outline-none focus:ring-2 focus:ring-indigo-100 transition"
            />
            <button
              onClick={() => setLotCode(genLotCode())}
              title="สุ่มรหัสใหม่"
              className="px-4 py-3 bg-slate-100 rounded-xl hover:bg-slate-200 transition text-slate-600"
            >
              <Shuffle className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Branch */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-600 flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5" /> สาขาที่ส่ง *
          </label>
          <select
            value={branchId}
            onChange={e => setBranchId(e.target.value ? Number(e.target.value) : "")}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-100 transition"
          >
            <option value="">-- เลือกสาขา --</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.branch_name}</option>)}
          </select>
        </div>

        {/* Note */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-600">หมายเหตุ (ถ้ามี)</label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="เช่น รับของจาก supplier X รอบที่ 2..."
            rows={2}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100 transition resize-none"
          />
        </div>
      </div>

      {/* ---- Section 2: Product Search ---- */}
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
            <Search className="w-4 h-4" /> เพิ่มสินค้าในลอต
          </h2>
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold border-2 border-green-400 text-green-600 rounded-xl hover:bg-green-50 transition"
          >
            <ClipboardList className="w-3.5 h-3.5" /> นำเข้าจาก Sheets
          </button>
        </div>

        <div className="relative" ref={searchRef}>
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
            placeholder="ค้นหาชื่อ, SKU, Barcode..."
            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-100 transition"
          />

          {/* Dropdown results */}
          {(searchResults.length > 0 || searchLoading) && (
            <div className="absolute z-30 top-full mt-2 left-0 right-0 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden max-h-72 overflow-y-auto">
              {searchLoading ? (
                <div className="flex items-center justify-center gap-2 py-6 text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin" /><span className="text-sm">กำลังค้นหา...</span>
                </div>
              ) : (
                searchResults.map(p => {
                  const alreadyAdded = items.some(i => i.product.id === p.id)
                  return (
                    <button
                      key={p.id}
                      onClick={() => !alreadyAdded && addItem(p)}
                      disabled={alreadyAdded}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-indigo-50 transition border-b border-slate-50 last:border-0 ${alreadyAdded ? "opacity-40 cursor-not-allowed" : ""}`}
                    >
                      <div className="w-10 h-10 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                        {p.image_url
                          ? <img src={p.image_url} alt="" className="w-full h-full object-contain p-1" onError={e => { (e.target as HTMLImageElement).src = "/placeholder.png" }} />
                          : <Package className="w-5 h-5 text-slate-300" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate">{p.name}</p>
                        <p className="text-[10px] font-mono text-slate-400">{p.sku || p.barcode || "—"}</p>
                      </div>
                      {alreadyAdded
                        ? <span className="text-[10px] font-bold text-emerald-600">เพิ่มแล้ว ✓</span>
                        : <span className="text-[10px] font-bold text-indigo-600 flex items-center gap-1"><Plus className="w-3 h-3" />เพิ่ม</span>
                      }
                    </button>
                  )
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* ---- Section 3: Items List ---- */}
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">
            รายการสินค้า ({items.length} รายการ)
          </h2>
          {items.length > 0 && (
            <span className="text-sm font-black text-indigo-600">
              รวม {totalQty.toLocaleString()} ชิ้น
            </span>
          )}
        </div>

        {items.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3 text-slate-400">
            <Package className="w-10 h-10 opacity-30" />
            <p className="text-sm font-semibold">ยังไม่มีสินค้า — ค้นหาและเพิ่มด้านบน</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {items.map((item, idx) => (
              <div key={item.product.id} className="flex items-center gap-3 px-5 py-3">
                <span className="text-xs font-black text-slate-300 w-5 shrink-0">{idx + 1}</span>
                <div className="w-10 h-10 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                  {item.product.image_url
                    ? <img src={item.product.image_url} alt="" className="w-full h-full object-contain p-1" onError={e => { (e.target as HTMLImageElement).src = "/placeholder.png" }} />
                    : <Package className="w-5 h-5 text-slate-300" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800 line-clamp-1">{item.product.name}</p>
                  <p className="text-[10px] font-mono text-slate-400">{item.product.sku || item.product.barcode || "—"}</p>
                </div>
                {/* Qty input */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => updateQty(item.product.id, item.expected_qty - 1)}
                    className="w-7 h-7 rounded-lg bg-slate-100 font-black text-slate-600 hover:bg-slate-200 transition text-sm">−</button>
                  <input
                    type="number" min={1} value={item.expected_qty}
                    onChange={e => updateQty(item.product.id, parseInt(e.target.value) || 1)}
                    className="w-16 text-center border border-slate-200 rounded-lg text-sm font-black py-1 outline-none focus:ring-2 focus:ring-indigo-100"
                  />
                  <button onClick={() => updateQty(item.product.id, item.expected_qty + 1)}
                    className="w-7 h-7 rounded-lg bg-slate-100 font-black text-slate-600 hover:bg-slate-200 transition text-sm">+</button>
                  <span className="text-xs text-slate-400 ml-1">{item.product.unit || "ชิ้น"}</span>
                </div>
                <button onClick={() => removeItem(item.product.id)}
                  className="p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Error */}
      {submitError && (
        <div className="flex items-center gap-3 bg-rose-50 border border-rose-200 rounded-2xl p-4 text-rose-700">
          <span className="text-sm font-bold">{submitError}</span>
        </div>
      )}

      {/* ===== Import Modal ===== */}
      {showImport && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowImport(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl flex flex-col"
            onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-green-600" />
                นำเข้าจาก Google Sheets / Excel
              </h2>
              <p className="text-slate-500 text-sm mt-1">
                Copy ข้อมูล 2 คอลัมน์{" "}
                <span className="font-bold text-slate-700">(จำนวน [Tab] รหัสสินค้า)</span>{" "}
                แล้ว Paste ลงช่องด้านล่าง
              </p>
            </div>

            <div className="p-6">
              <div className="mb-2 flex gap-8 text-xs font-bold text-slate-400 uppercase tracking-widest px-1">
                <span>จำนวน</span>
                <span>รหัสสินค้า (SKU หรือ Barcode)</span>
              </div>
              <textarea
                value={importText}
                onChange={e => setImportText(e.target.value)}
                placeholder={"1\tHPST3584P\n2\tHPST3582P\n1\tML-VA-CR-HPST3584P"}
                className="w-full h-56 p-4 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-green-400 outline-none font-mono text-sm resize-none"
                autoFocus
              />
              <p className="text-xs text-slate-400 mt-2">
                ถ้า SKU มีในระบบแล้ว จะอัปเดตจำนวน · ถ้าไม่พบจะแจ้งชื่อรหัสที่หาไม่เจอ
              </p>
            </div>

            <div className="p-6 border-t bg-slate-50 rounded-b-3xl flex justify-end gap-3">
              <button onClick={() => { setShowImport(false); setImportText("") }}
                className="px-6 py-2.5 rounded-xl border-2 border-slate-200 font-semibold text-slate-600 hover:bg-white transition text-sm">
                ยกเลิก
              </button>
              <button onClick={handleImport} disabled={importLoading || !importText.trim()}
                className="px-6 py-2.5 rounded-xl bg-green-600 text-white font-bold hover:bg-green-700 transition shadow text-sm disabled:opacity-40 flex items-center gap-2">
                {importLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardList className="w-4 h-4" />}
                🚀 ประมวลผลและเพิ่มในลอต
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submit */}
      <div className="flex gap-3 justify-end">
        <button onClick={() => router.push("/lots")}
          className="px-6 py-3 border-2 border-slate-200 rounded-xl font-bold text-sm text-slate-500 hover:bg-slate-50 transition">
          ยกเลิก
        </button>
        <button
          onClick={handleSubmit}
          disabled={isPending || items.length === 0}
          className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 disabled:opacity-40 transition shadow flex items-center gap-2"
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}
          สร้างลอต (Draft)
        </button>
      </div>
    </div>
  )
}
