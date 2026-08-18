"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Package, Search, RefreshCcw, ChevronLeft, ChevronRight,
  Loader2, Barcode, Tag, Layers, Download
} from "lucide-react"
import { getStockList, getStockStats, getInitialProfile, getTotalQty, generateExcelFile, type ProductStock } from "../../../../actions/publicstock"
import { useRouter } from "next/navigation"
import { saveAs } from "file-saver"

const fmtQty = (n: number) => n.toLocaleString("th-TH", { maximumFractionDigits: 0 })
const fmtDT = (d: string) => new Intl.DateTimeFormat("en-GB", {
  day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
}).format(new Date(d))

export default function PublicStockPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [dataLoading, setDataLoading] = useState(false)
  const [products, setProducts] = useState<ProductStock[]>([])
  const [profile, setProfile] = useState<{ branch_id: number, branch_name: string } | null>(null)
  const [exporting, setExporting] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportOnlyInStock, setExportOnlyInStock] = useState(true)
  const [exportProgress, setExportProgress] = useState<{
    percent: number
    current: number
    total: number
    message: string
  }>({ percent: 0, current: 0, total: 0, message: "" })

  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [pageSize] = useState(30)
  const [searchQ, setSearchQ] = useState("")
  const [onlyNeg, setOnlyNeg] = useState(false)

  const [stats, setStats] = useState({ totalSku: 0, negativeItems: 0 })
  const [totalQty, setTotalQty] = useState(0)
  const [lastUpdate, setLastUpdate] = useState("-")

  useEffect(() => {
    const init = async () => {
      const res = await getInitialProfile()
      if (!res) { router.push("/login"); return }
      setProfile(res)
      setLoading(false)
    }
    init()
  }, [router])

  const fetchData = useCallback(async () => {
    if (!profile) return
    setDataLoading(true)

    const [listRes, statsRes, qty] = await Promise.all([
      getStockList(profile.branch_id, page, pageSize, searchQ, onlyNeg),
      getStockStats(profile.branch_id),
      getTotalQty(profile.branch_id),
    ])

    if (listRes.data) {
      setProducts(listRes.data)
      setTotalCount(listRes.total)
    }
    setStats(statsRes)
    setTotalQty(qty)
    setLastUpdate("อัปเดต " + new Date().toLocaleTimeString("th-TH"))
    setDataLoading(false)
  }, [profile, page, pageSize, searchQ, onlyNeg])

  useEffect(() => {
    if (profile) fetchData()
  }, [fetchData, profile])

  useEffect(() => {
    if (!profile) return
    const interval = setInterval(() => {
      getStockStats(profile.branch_id).then(setStats)
      getTotalQty(profile.branch_id).then(setTotalQty)
      setLastUpdate("อัปเดต " + new Date().toLocaleTimeString("th-TH"))
    }, 60000)
    return () => clearInterval(interval)
  }, [profile])

  const handleSearch = () => { setPage(1); fetchData() }
  const handleReset = () => { setSearchQ(""); setOnlyNeg(false); setPage(1) }
  const pageAll = Math.max(1, Math.ceil(totalCount / pageSize))

  const triggerExport = async (includeImages: boolean, onlyInStock: boolean = true) => {
    if (!profile) return
    setExporting(true)
    setExportProgress({
      percent: 0,
      current: 0,
      total: 0,
      message: "กำลังเชื่อมต่อเพื่อสร้างไฟล์ Excel...",
    })

    try {
      const params = new URLSearchParams({
        branchId: String(profile.branch_id),
        includeImages: String(includeImages),
        onlyInStock: String(onlyInStock),
      })

      const response = await fetch(`/api/stock/export-excel?${params.toString()}`)
      if (!response.ok || !response.body) {
        throw new Error("ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์เพื่อสร้างไฟล์ได้")
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""
      let excelBase64 = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          const trimmed = line.trim()
          if (trimmed.startsWith("data: ")) {
            try {
              const data = JSON.parse(trimmed.slice(6))
              if (data.error) {
                throw new Error(data.error)
              }
              if (data.progress !== undefined) {
                setExportProgress({
                  percent: data.progress,
                  current: data.current || 0,
                  total: data.total || 0,
                  message: data.message || "",
                })
              }
              if (data.done && data.data) {
                excelBase64 = data.data
              }
            } catch (e: any) {
              if (e.message && !e.message.includes("Unexpected end of JSON")) {
                console.error(e)
              }
            }
          }
        }
      }

      if (excelBase64) {
        const byteCharacters = atob(excelBase64)
        const byteNumbers = new Array(byteCharacters.length)
        for (let j = 0; j < byteCharacters.length; j++) {
          byteNumbers[j] = byteCharacters.charCodeAt(j)
        }
        const byteArray = new Uint8Array(byteNumbers)
        const blob = new Blob([byteArray], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        })

        const suffix = onlyInStock ? "_InStock" : "_All"
        saveAs(
          blob,
          `Stock_${profile.branch_name}${suffix}_${new Date().toISOString().split("T")[0]}.xlsx`
        )

        setExportProgress((prev) => ({
          ...prev,
          percent: 100,
          message: "ดาวน์โหลดเสร็จสมบูรณ์!",
        }))

        setTimeout(() => {
          setExporting(false)
          setShowExportModal(false)
          setExportProgress({ percent: 0, current: 0, total: 0, message: "" })
        }, 1000)
      } else {
        alert("ไม่สามารถสร้างไฟล์ Excel ได้ หรือไม่มีข้อมูลสินค้า")
        setExporting(false)
      }
    } catch (err: any) {
      console.error(err)
      alert(err.message || "เกิดข้อผิดพลาดในการดาวน์โหลด Excel")
      setExporting(false)
    }
  }

  const handleExportExcel = () => {
    setShowExportModal(true)
  }

  if (loading) return (
    <div className="h-screen flex items-center justify-center text-slate-400 gap-2">
      <Loader2 className="animate-spin" /> กำลังตรวจสอบสิทธิ์...
    </div>
  )

  return (
    <div className="space-y-6 pb-20">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Package className="w-7 h-7 text-blue-600" />
            สต็อกสินค้าในร้าน
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            สาขา: <span className="font-bold text-slate-700">{profile?.branch_name}</span>
            {" · "}<span className="text-slate-400">{lastUpdate}</span>
          </p>
        </div>
        <div className="flex items-center gap-3 self-start">
          <button
            onClick={handleExportExcel}
            disabled={exporting}
            className="px-5 py-2.5 text-sm font-bold bg-[#107c41] text-white rounded-xl shadow-lg shadow-green-900/20 hover:bg-[#0c5e31] active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {exporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
            โหลด Excel
          </button>
          <button
            onClick={fetchData}
            className="p-2.5 text-slate-400 hover:text-blue-600 transition-colors bg-white border border-slate-200 rounded-xl shadow-sm active:scale-95"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCcw className={`w-5 h-5 ${dataLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {/* Total qty - hero card */}
        <div className="col-span-2 md:col-span-1 bg-gradient-to-br from-blue-500 to-blue-700 rounded-3xl p-6 text-white shadow-lg shadow-blue-100">
          <div className="text-xs font-black uppercase tracking-widest opacity-75 mb-2">
            ยอดรวมทั้งหมดในร้าน
          </div>
          <div className="text-5xl font-black leading-none">
            {fmtQty(totalQty)}
          </div>
          <div className="text-sm opacity-70 mt-2">ชิ้น</div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="text-xs font-black uppercase tracking-widest text-slate-400">
            จำนวน SKU
          </div>
          <div>
            <div className="text-4xl font-black text-slate-800 mt-2">{stats.totalSku.toLocaleString()}</div>
            <div className="text-sm text-slate-400 mt-1">รายการสินค้า</div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="text-xs font-black uppercase tracking-widest text-slate-400">
            สต็อกติดลบ
          </div>
          <div>
            <div className={`text-4xl font-black mt-2 ${stats.negativeItems > 0 ? 'text-rose-500' : 'text-slate-800'}`}>
              {stats.negativeItems.toLocaleString()}
            </div>
            <div className="text-sm text-slate-400 mt-1">รายการ</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-5 rounded-[2rem] border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="flex-1 relative w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="ค้นหาชื่อสินค้า, SKU หรือ Barcode..."
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-blue-100 transition-all"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={onlyNeg}
              onChange={(e) => { setOnlyNeg(e.target.checked); setPage(1) }}
            />
            <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            <span className="ms-3 text-xs font-bold text-slate-500 uppercase tracking-tight whitespace-nowrap">เฉพาะติดลบ</span>
          </label>

          <div className="flex gap-2 w-full md:w-auto shrink-0">
            <button onClick={handleReset} className="flex-1 md:flex-none px-5 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 transition-all">
              ล้างค่า
            </button>
            <button onClick={handleSearch} className="flex-1 md:flex-none px-7 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-all">
              ค้นหา
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto min-h-[400px]">
          <table className="min-w-full border-collapse">
            <thead className="bg-slate-50/50 border-b border-slate-100">
              <tr className="text-left text-[10px] uppercase tracking-widest text-slate-400 font-black">
                <th className="px-5 py-4 w-16">รูป</th>
                <th className="px-5 py-4">ชื่อสินค้า</th>
                <th className="px-5 py-4">Barcode / SKU</th>
                <th className="px-5 py-4 text-center">หน่วย</th>
                <th className="px-5 py-4 text-right">คงเหลือ ↓</th>
                <th className="px-5 py-4 text-right hidden md:table-cell">อัปเดต</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {dataLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-5 py-3"><div className="w-12 h-12 bg-slate-100 rounded-xl" /></td>
                    <td className="px-5 py-3"><div className="h-4 w-40 bg-slate-100 rounded" /></td>
                    <td colSpan={4} />
                  </tr>
                ))
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-slate-400 italic font-medium">
                    ไม่พบสินค้าในสต็อก
                  </td>
                </tr>
              ) : (
                products.map((r, idx) => {
                  const q = r.qty
                  const isNeg = q < 0
                  const isOut = q === 0
                  const isLow = q > 0 && q <= 5
                  const globalRank = (page - 1) * pageSize + idx + 1

                  return (
                    <tr key={r.id} className="hover:bg-slate-50 transition-colors group">
                      {/* Image */}
                      <td className="px-5 py-3">
                        <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                          {r.products?.image_url ? (
                            <img
                              src={r.products.image_url}
                              alt={r.products?.name ?? ""}
                              className="w-full h-full object-contain p-1"
                              onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.png" }}
                            />
                          ) : (
                            <Layers className="w-5 h-5 text-slate-200" />
                          )}
                        </div>
                      </td>

                      {/* Name */}
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          {globalRank <= 3 && (
                            <span className={`text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center text-white shrink-0 ${
                              globalRank === 1 ? 'bg-yellow-400' : globalRank === 2 ? 'bg-slate-400' : 'bg-amber-600'
                            }`}>{globalRank}</span>
                          )}
                          <div>
                            <div className="font-bold text-slate-800 text-sm leading-tight">{r.products?.name ?? "Unknown"}</div>
                            <div className="mt-1">
                              {isNeg && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 border border-rose-100">Negative</span>}
                              {isOut && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-400 border border-slate-200">หมด</span>}
                              {isLow && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-100">ใกล้หมด</span>}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Barcode / SKU */}
                      <td className="px-5 py-3">
                        <div className="flex flex-col gap-0.5 text-xs text-slate-500 font-mono tracking-tighter">
                          <div className="flex items-center gap-1"><Barcode className="w-3 h-3 text-slate-300 shrink-0"/> {r.products?.barcode || "-"}</div>
                          <div className="flex items-center gap-1"><Tag className="w-3 h-3 text-slate-300 shrink-0"/> {r.products?.sku || "-"}</div>
                        </div>
                      </td>

                      {/* Unit */}
                      <td className="px-5 py-3 text-center">
                        <span className="px-2 py-1 rounded-lg bg-slate-100 text-[10px] font-black uppercase text-slate-500">
                          {r.products?.unit || "PCS"}
                        </span>
                      </td>

                      {/* Qty */}
                      <td className="px-5 py-3 text-right">
                        <div className={`text-xl font-black ${isNeg ? 'text-rose-500' : isOut ? 'text-slate-300' : isLow ? 'text-amber-500' : 'text-blue-600'}`}>
                          {fmtQty(q)}
                        </div>
                      </td>

                      {/* Updated */}
                      <td className="px-5 py-3 text-right text-[11px] text-slate-400 font-mono hidden md:table-cell">
                        {fmtDT(r.updated_at)}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            หน้า {page} / {pageAll} ({totalCount.toLocaleString()} รายการ)
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="p-2 rounded-lg border border-slate-200 bg-white disabled:opacity-40">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => setPage(p => Math.min(pageAll, p + 1))} disabled={page >= pageAll} className="p-2 rounded-lg border border-slate-200 bg-white disabled:opacity-40">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Export Options & Progress Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] p-6 max-w-sm w-full shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            {exporting ? (
              <div className="py-2 flex flex-col items-center text-center space-y-4">
                <div className="relative mt-2">
                  <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-[#107c41] flex items-center justify-center border border-emerald-100 shadow-inner">
                    <Download className="w-8 h-8 animate-bounce text-[#107c41]" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-white p-1 rounded-full shadow-sm border border-slate-100">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-black text-slate-900">กำลังสร้างไฟล์ Excel</h4>
                  <p className="text-xs text-slate-500 mt-1 min-h-[1.25rem] px-2 leading-relaxed">
                    {exportProgress.message || "กำลังเตรียมข้อมูลสินค้า..."}
                  </p>
                </div>

                {/* Percentage Display & Progress Bar */}
                <div className="w-full space-y-2 pt-1">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 px-1">
                    <span className="text-[11px] text-slate-400">ความคืบหน้า</span>
                    <span className="text-base font-black text-[#107c41] font-mono">
                      {exportProgress.percent}%
                    </span>
                  </div>

                  <div className="w-full h-3.5 bg-slate-100 rounded-full p-0.5 border border-slate-200 overflow-hidden shadow-inner">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 via-emerald-500 to-[#107c41] rounded-full transition-all duration-300 ease-out shadow-sm"
                      style={{ width: `${Math.max(5, exportProgress.percent)}%` }}
                    />
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono pt-1 px-1">
                    <span>
                      {exportProgress.total > 0
                        ? `${exportProgress.current.toLocaleString()} / ${exportProgress.total.toLocaleString()} รายการ`
                        : "กำลังเชื่อมต่อ..."}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {exportProgress.percent === 100 ? "ดาวน์โหลดเรียบร้อย" : "กรุณารอสักครู่"}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Download className="w-5 h-5 text-blue-600" />
                  ดาวน์โหลด Excel
                </h3>
                <p className="text-slate-500 text-xs mt-1.5 leading-relaxed">
                  กำหนดเงื่อนไขและรูปแบบไฟล์ Excel ที่ต้องการดาวน์โหลดข้อมูลสต็อกสินค้า
                </p>

                {/* ตัวกรองสต็อก */}
                <div className="mt-4 p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    ตัวกรองจำนวนสต็อก
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setExportOnlyInStock(true)}
                      className={`p-2.5 rounded-xl border text-left transition-all flex flex-col gap-0.5 ${
                        exportOnlyInStock
                          ? "border-blue-600 bg-white text-blue-950 font-bold shadow-sm ring-2 ring-blue-500/20"
                          : "border-slate-200 bg-transparent text-slate-500 hover:bg-white/60"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 text-xs font-bold">
                        <span className={`w-2 h-2 rounded-full ${exportOnlyInStock ? "bg-blue-600" : "bg-slate-300"}`} />
                        มีสต็อกเท่านั้น
                      </div>
                      <div className="text-[10px] text-slate-400 font-normal">
                        เฉพาะจำนวน &gt; 0
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setExportOnlyInStock(false)}
                      className={`p-2.5 rounded-xl border text-left transition-all flex flex-col gap-0.5 ${
                        !exportOnlyInStock
                          ? "border-blue-600 bg-white text-blue-950 font-bold shadow-sm ring-2 ring-blue-500/20"
                          : "border-slate-200 bg-transparent text-slate-500 hover:bg-white/60"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 text-xs font-bold">
                        <span className={`w-2 h-2 rounded-full ${!exportOnlyInStock ? "bg-blue-600" : "bg-slate-300"}`} />
                        สินค้าทั้งหมด
                      </div>
                      <div className="text-[10px] text-slate-400 font-normal">
                        รวมสต็อก 0 และติดลบ
                      </div>
                    </button>
                  </div>
                </div>
                
                <div className="mt-4 space-y-2">
                  <button
                    onClick={() => {
                      triggerExport(false, exportOnlyInStock)
                    }}
                    className="w-full py-3 px-4 bg-slate-900 text-white rounded-2xl text-sm font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                  >
                    ดาวน์โหลดปกติ (ไม่มีรูปภาพ) - โหลดเร็ว
                  </button>
                  
                  <button
                    onClick={() => {
                      const confirmWithImages = window.confirm("คำเตือน: การดาวน์โหลดพร้อมรูปภาพจะใช้เวลานานในการดาวน์โหลด (ประมาณ 1-2 นาที ขึ้นอยู่กับจำนวนสินค้า)\n\nคุณต้องการดำเนินการต่อหรือไม่?")
                      if (confirmWithImages) {
                        triggerExport(true, exportOnlyInStock)
                      }
                    }}
                    className="w-full py-3 px-4 bg-blue-50 text-blue-600 rounded-2xl text-sm font-bold hover:bg-blue-100 transition-all border border-blue-100 flex items-center justify-center gap-2 active:scale-[0.98]"
                  >
                    ดาวน์โหลดพร้อมรูปภาพ (ใช้เวลานาน)
                  </button>
                  
                  <button
                    onClick={() => setShowExportModal(false)}
                    className="w-full py-2 px-4 text-slate-400 hover:text-slate-600 transition-all text-xs font-bold text-center"
                  >
                    ยกเลิก
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
