"use client"

import { useState, useMemo } from "react"
import { Search, Tag, CheckCircle2, XCircle, AlertCircle, RefreshCcw, ClipboardList, ChevronDown } from "lucide-react"
import type { PropTagStatus } from "@/actions/tagcheck"

type Filter = "all" | "tagged" | "missing"

interface CheckResult {
  matched:   { prop: PropTagStatus; pasteQty: number }[]  // paste qty vs stock qty
  missing:   PropTagStatus[]                               // ในระบบ แต่ไม่อยู่ใน paste
  notFound:  string[]                                      // ใน paste แต่ไม่มีในระบบ
}

interface Props {
  props: PropTagStatus[]
  branchName: string
}

export default function TagCheckClient({ props, branchName }: Props) {
  const [filter, setFilter] = useState<Filter>("all")
  const [search, setSearch] = useState("")
  const [showImport, setShowImport] = useState(false)
  const [importText, setImportText] = useState("")
  const [result, setResult] = useState<CheckResult | null>(null)
  const [resultTab, setResultTab] = useState<"matched" | "missing" | "notFound">("missing")

  const total = props.length
  const taggedCount = props.filter(p => p.tagged).length
  const missingCount = total - taggedCount
  const pct = total > 0 ? Math.round((taggedCount / total) * 100) : 0

  const filtered = useMemo(() => {
    let list = props
    if (filter === "tagged") list = list.filter(p => p.tagged)
    if (filter === "missing") list = list.filter(p => !p.tagged)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(p =>
        (p.name || "").toLowerCase().includes(q) ||
        (p.sku || "").toLowerCase().includes(q) ||
        (p.barcode || "").toLowerCase().includes(q) ||
        (p.color || "").toLowerCase().includes(q)
      )
    }
    return list
  }, [props, filter, search])

  // ---- Import Check Logic ----
  const handleImportCheck = () => {
    const lines = importText.split("\n")
    const pasteMap = new Map<string, number>() // code → qty

    lines.forEach(line => {
      if (!line.trim()) return
      const parts = line.split("\t")
      if (parts.length >= 2) {
        const qty = parseInt(parts[0].trim())
        const code = parts[1].trim()
        if (!isNaN(qty) && code) pasteMap.set(code, qty)
      }
    })

    if (pasteMap.size === 0) {
      alert("ไม่พบข้อมูลที่ถูกต้อง\nตรวจสอบว่า Copy มาจาก Sheets แล้ว Paste ลงตรงๆ (จำนวน [Tab] รหัสสินค้า)")
      return
    }

    const matched:  CheckResult["matched"]  = []
    const missing:  CheckResult["missing"]  = []
    const notFound: CheckResult["notFound"] = []

    const matchedIds = new Set<number>()

    pasteMap.forEach((pasteQty, code) => {
      const prop = props.find(p =>
        p.sku === code || p.barcode === code
      )
      if (prop) {
        matched.push({ prop, pasteQty })
        matchedIds.add(prop.id)
      } else {
        notFound.push(code)
      }
    })

    props.forEach(p => {
      if (!matchedIds.has(p.id)) missing.push(p)
    })

    setResult({ matched, missing, notFound })
    setResultTab("missing")
    setShowImport(false)
    setImportText("")
  }

  return (
    <div className="space-y-6 pb-20">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Tag className="w-7 h-7 text-violet-600" />
            เช็ค Tag Props
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            สาขา: <span className="font-bold text-slate-700">{branchName}</span>
            {" · "}เช็คว่า Props ครบทุกชิ้นไหม
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-violet-400 text-violet-600 text-sm font-bold hover:bg-violet-50 transition shadow-sm"
          >
            <ClipboardList className="w-4 h-4" />
            เปรียบเทียบ Sheets
          </button>
          <button
            onClick={() => window.location.reload()}
            className="p-2 text-slate-400 hover:text-violet-600 transition-colors bg-white border border-slate-200 rounded-xl shadow-sm"
          >
            <RefreshCcw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
          <div className="text-xs font-black uppercase tracking-widest text-slate-400">ทั้งหมด</div>
          <div className="text-4xl font-black text-slate-800 mt-2">{total.toLocaleString()}</div>
          <div className="text-sm text-slate-400 mt-1">Props ในระบบ</div>
        </div>
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
          <div className="text-xs font-black uppercase tracking-widest text-emerald-500">ติด Tag แล้ว</div>
          <div className="text-4xl font-black text-emerald-600 mt-2">{taggedCount.toLocaleString()}</div>
          <div className="text-sm text-slate-400 mt-1">มีใน Stock สาขานี้</div>
        </div>
        <div className={`rounded-3xl p-5 border shadow-sm ${missingCount > 0 ? "bg-rose-50 border-rose-100" : "bg-white border-slate-100"}`}>
          <div className={`text-xs font-black uppercase tracking-widest ${missingCount > 0 ? "text-rose-500" : "text-slate-400"}`}>ยังไม่ติด</div>
          <div className={`text-4xl font-black mt-2 ${missingCount > 0 ? "text-rose-600" : "text-slate-800"}`}>{missingCount.toLocaleString()}</div>
          <div className="text-sm text-slate-400 mt-1">ขาดใน Stock</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-bold text-slate-700">ความคืบหน้า</span>
          <span className="text-sm font-black text-violet-600">{pct}%</span>
        </div>
        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${pct === 100 ? "bg-emerald-500" : "bg-violet-500"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-slate-400 font-medium">
          <span>{taggedCount} ติดแล้ว</span>
          <span>{missingCount} ค้างอยู่</span>
        </div>
      </div>

      {/* ===== Import Check Result ===== */}
      {result && (
        <div className="bg-white rounded-[2rem] border-2 border-violet-200 shadow-sm overflow-hidden">
          {/* Result Header */}
          <div className="px-6 py-4 bg-violet-50 border-b border-violet-100 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-violet-600" />
              <span className="font-black text-slate-800">ผลการเปรียบเทียบ</span>
            </div>
            <div className="flex items-center gap-3 text-sm font-bold">
              <span className="text-emerald-600">✓ ตรงกัน {result.matched.length}</span>
              <span className="text-rose-600">↓ ขาด {result.missing.length}</span>
              <span className="text-amber-600">? ไม่พบ {result.notFound.length}</span>
              <button
                onClick={() => setResult(null)}
                className="text-slate-400 hover:text-slate-600 text-xs ml-2"
              >
                ✕ ปิด
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-100">
            {([
              { key: "missing",  label: `ขาด (${result.missing.length})`,     color: "rose" },
              { key: "matched",  label: `ตรงกัน (${result.matched.length})`,  color: "emerald" },
              { key: "notFound", label: `ไม่พบ (${result.notFound.length})`,  color: "amber" },
            ] as const).map(t => (
              <button
                key={t.key}
                onClick={() => setResultTab(t.key)}
                className={`flex-1 py-3 text-xs font-black uppercase tracking-widest transition-all border-b-2 ${
                  resultTab === t.key
                    ? t.color === "rose"    ? "border-rose-500 text-rose-600 bg-rose-50"
                    : t.color === "emerald" ? "border-emerald-500 text-emerald-600 bg-emerald-50"
                    : "border-amber-500 text-amber-600 bg-amber-50"
                    : "border-transparent text-slate-400 hover:bg-slate-50"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-4 max-h-[60vh] overflow-y-auto space-y-2">
            {resultTab === "missing" && (
              result.missing.length === 0
                ? <p className="text-center py-10 text-emerald-500 font-bold">ครบทุกรายการ!</p>
                : result.missing.map(p => <PropRow key={p.id} prop={p} label="ขาดใน Sheets" labelColor="rose" />)
            )}
            {resultTab === "matched" && (
              result.matched.length === 0
                ? <p className="text-center py-10 text-slate-400 font-bold">ไม่มีรายการที่ตรงกัน</p>
                : result.matched.map(({ prop, pasteQty }) => (
                    <PropRow
                      key={prop.id}
                      prop={prop}
                      label={`Sheets: ${pasteQty}${prop.qty !== null && prop.qty !== pasteQty ? ` · Stock: ${prop.qty} ⚠️` : ""}`}
                      labelColor={prop.qty !== null && prop.qty !== pasteQty ? "amber" : "emerald"}
                    />
                  ))
            )}
            {resultTab === "notFound" && (
              result.notFound.length === 0
                ? <p className="text-center py-10 text-emerald-500 font-bold">ทุกรายการมีในระบบ!</p>
                : (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest px-1">รหัสเหล่านี้ไม่มีในระบบ</p>
                    {result.notFound.map(code => (
                      <div key={code} className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                        <XCircle className="w-4 h-4 text-amber-500 shrink-0" />
                        <span className="font-mono text-sm font-bold text-amber-800">{code}</span>
                      </div>
                    ))}
                  </div>
                )
            )}
          </div>
        </div>
      )}

      {/* Filter + Search */}
      <div className="bg-white p-5 rounded-[2rem] border border-slate-200 shadow-sm space-y-4">
        <div className="flex gap-2 flex-wrap">
          {([
            { key: "all",     label: `ทั้งหมด (${total})` },
            { key: "missing", label: `ยังไม่ติด (${missingCount})` },
            { key: "tagged",  label: `ติดแล้ว (${taggedCount})` },
          ] as const).map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                filter === tab.key
                  ? tab.key === "missing" ? "bg-rose-600 text-white"
                  : tab.key === "tagged"  ? "bg-emerald-600 text-white"
                  : "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="ค้นหาชื่อ, SKU, Barcode, สี..."
            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-violet-100 transition-all"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">
        แสดง {filtered.length.toLocaleString()} รายการ
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {filtered.length === 0 ? (
          <div className="col-span-full py-20 text-center text-slate-400">
            <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-semibold">ไม่พบรายการ</p>
          </div>
        ) : (
          filtered.map(p => <PropCard key={p.id} prop={p} />)
        )}
      </div>

      {/* ===== Import Modal ===== */}
      {showImport && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowImport(false)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-violet-600" />
                เปรียบเทียบกับ Google Sheets / Excel
              </h2>
              <p className="text-slate-500 text-sm mt-1">
                Copy ข้อมูล 2 คอลัมน์ <span className="font-bold text-slate-700">(จำนวน [Tab] รหัสสินค้า)</span> แล้ว Paste ลงช่องด้านล่าง
              </p>
            </div>

            <div className="p-6">
              <div className="mb-2 flex gap-4 text-xs font-bold text-slate-400 uppercase tracking-widest px-1">
                <span>จำนวน</span>
                <span className="ml-8">รหัสสินค้า (SKU หรือ Barcode)</span>
              </div>
              <textarea
                value={importText}
                onChange={e => setImportText(e.target.value)}
                placeholder={"1\tHPST3584P\n2\tHPST3582P\n1\tHPST3584C"}
                className="w-full h-64 p-4 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-400 outline-none font-mono text-sm resize-none"
                autoFocus
              />
              <p className="text-xs text-slate-400 mt-2">
                ระบบจะเปรียบเทียบรหัสกับ SKU / Barcode ของ Props ทั้งหมดในระบบ
              </p>
            </div>

            <div className="p-6 border-t bg-slate-50 rounded-b-3xl flex justify-end gap-3">
              <button
                onClick={() => { setShowImport(false); setImportText("") }}
                className="px-6 py-2.5 rounded-xl border-2 border-slate-200 font-semibold text-slate-600 hover:bg-white transition text-sm"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleImportCheck}
                className="px-6 py-2.5 rounded-xl bg-violet-600 text-white font-bold hover:bg-violet-700 transition shadow text-sm"
              >
                🔍 เปรียบเทียบเลย
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ---- Sub-components ----

function PropRow({ prop, label, labelColor }: { prop: PropTagStatus; label: string; labelColor: "rose" | "emerald" | "amber" }) {
  const colorMap = {
    rose:    "bg-rose-50 border-rose-200 text-rose-700",
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-700",
    amber:   "bg-amber-50 border-amber-200 text-amber-700",
  }
  return (
    <div className="flex items-center gap-3 bg-slate-50 rounded-xl px-3 py-2.5">
      <div className="w-10 h-10 rounded-lg bg-white border border-slate-100 overflow-hidden flex items-center justify-center shrink-0">
        {prop.image_url
          ? <img src={prop.image_url} alt={prop.name} className="w-full h-full object-contain p-1" onError={e => { (e.target as HTMLImageElement).src = "/placeholder.png" }} />
          : <Tag className="w-4 h-4 text-slate-200" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-slate-800 truncate">{prop.name}</p>
        <p className="text-xs font-mono text-slate-400 truncate">{prop.barcode || prop.sku}</p>
      </div>
      <span className={`text-[10px] font-black px-2 py-1 rounded-lg border whitespace-nowrap ${colorMap[labelColor]}`}>
        {label}
      </span>
    </div>
  )
}

function PropCard({ prop }: { prop: PropTagStatus }) {
  const specs = prop.specs as any
  const L = specs?.length_cm ?? ""
  const W = specs?.width_cm ?? ""
  const T = specs?.thickness_cm ?? ""
  const sizeStr = (L || W || T) ? `${L}×${W}×${T} CM` : ""
  const isNeg  = prop.tagged && (prop.qty ?? 0) < 0
  const isZero = prop.tagged && prop.qty === 0

  return (
    <div className={`bg-white rounded-2xl border-2 overflow-hidden shadow-sm transition-all ${
      isNeg     ? "border-rose-300"
      : isZero  ? "border-amber-300"
      : prop.tagged ? "border-emerald-200"
      : "border-rose-300 ring-2 ring-rose-100"
    }`}>
      <div className={`px-3 py-1.5 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide ${
        isNeg     ? "bg-rose-500 text-white"
        : isZero  ? "bg-amber-400 text-white"
        : prop.tagged ? "bg-emerald-500 text-white"
        : "bg-rose-500 text-white"
      }`}>
        {isNeg     ? <><XCircle className="w-3 h-3" /> ติดลบ ({prop.qty})</>
        : isZero   ? <><AlertCircle className="w-3 h-3" /> qty = 0</>
        : prop.tagged ? <><CheckCircle2 className="w-3 h-3" /> ติดแล้ว · {prop.qty}</>
        : <><XCircle className="w-3 h-3" /> ยังไม่มีใน Stock</>}
      </div>
      <div className="aspect-square bg-slate-50 p-2 flex items-center justify-center overflow-hidden">
        {prop.image_url
          ? <img src={prop.image_url} alt={prop.name} className="w-full h-full object-contain" onError={e => { (e.target as HTMLImageElement).src = "/placeholder.png" }} />
          : <Tag className="w-8 h-8 text-slate-200" />}
      </div>
      <div className="px-2.5 pb-3 pt-1.5 space-y-0.5">
        <p className="text-[10px] font-black text-slate-800 line-clamp-2 leading-tight">{prop.name}</p>
        {prop.sku    && <p className="text-[9px] font-mono text-slate-400 truncate">SKU: {prop.sku}</p>}
        {prop.barcode && <p className="text-[9px] font-mono text-slate-400 truncate">BC: {prop.barcode}</p>}
        <div className="flex flex-wrap gap-1 mt-1">
          {prop.color && <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full font-bold">{prop.color}</span>}
          {sizeStr    && <span className="text-[9px] bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded-full font-bold">{sizeStr}</span>}
        </div>
      </div>
    </div>
  )
}
