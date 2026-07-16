"use client"

import React, { useState, useEffect, Suspense } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { getSystemBalance, BalanceSummary } from "../../../actions/balance-check"
import { getProductBranchTags, deleteProductTag } from "../../../actions/stock-admin"
import { Scale, RefreshCw, Loader2, Package, CheckCircle2, AlertTriangle, AlertCircle, Hash, Search, Filter, ChevronDown, ChevronRight, Store, Eye, Trash2, X, Barcode, Printer } from "lucide-react"
import { useRef, useCallback, useEffect as useEffectBarcode } from "react"
import JsBarcode from "jsbarcode"

const STORAGE_BUCKET = "product-images"
const PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://zexflchjcycxrpjkuews.supabase.co"

const QUICK_REASONS = [
  "Tag ชำรุด / สูญหาย",
  "ลบยอดที่สแกนซ้ำซ้อน",
  "นำไปติดสินค้าตัวอื่น",
  "ทดสอบระบบ",
  "อื่นๆ (ระบุเหตุผลเอง)"
]

// ─────────────────────────────────────────────────────────────────────────────
// Barcode Modal
// ─────────────────────────────────────────────────────────────────────────────
const BarcodeModal = ({ rfid, onClose }: { rfid: string; onClose: () => void }) => {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffectBarcode(() => {
    if (svgRef.current) {
      JsBarcode(svgRef.current, rfid, {
        format: "CODE128",
        width: 2,
        height: 80,
        displayValue: true,
        fontSize: 14,
        margin: 12,
        background: "#ffffff",
        lineColor: "#1e293b",
        font: "monospace",
      })
    }
  }, [rfid])

  const handlePrint = () => {
    const svg = svgRef.current
    if (!svg) return
    const svgData = new XMLSerializer().serializeToString(svg)
    const win = window.open("", "_blank", "width=500,height=300")
    if (!win) return
    win.document.write(`
      <html><head><title>Barcode: ${rfid}</title>
      <style>body{margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#fff;font-family:monospace}svg{max-width:100%}</style></head>
      <body>${svgData}<script>window.onload=()=>window.print()<\/script></body></html>
    `)
    win.document.close()
  }

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[70] animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-indigo-50 border-b border-indigo-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
              <Barcode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-indigo-800 text-sm">Barcode จาก RFID</h3>
              <p className="text-[10px] text-indigo-400 font-mono mt-0.5 truncate max-w-[200px]">{rfid}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/50 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Barcode */}
        <div className="p-6 flex flex-col items-center gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-inner w-full flex justify-center">
            <svg ref={svgRef} />
          </div>

          <div className="flex gap-2 w-full">
            <button
              onClick={handlePrint}
              className="flex-1 flex items-center justify-center gap-2 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs transition-all shadow-sm"
            >
              <Printer className="w-4 h-4" />
              พิมพ์ Barcode
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-xs transition-all"
            >
              ปิด
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const DeleteConfirmModal = ({
  deleteConfirmData,
  onClose,
  onConfirm
}: {
  deleteConfirmData: { tagId: string | number, rfid: string }
  onClose: () => void
  onConfirm: (reason: string) => Promise<void>
}) => {
  const [deleteReason, setDeleteReason] = useState<string>(QUICK_REASONS[0])
  const [customReason, setCustomReason] = useState<string>("")
  const [isDeleting, setIsDeleting] = useState(false)

  const handleConfirm = async () => {
    let finalReason = deleteReason
    if (deleteReason === "อื่นๆ (ระบุเหตุผลเอง)") {
      if (!customReason.trim()) {
        alert("กรุณาระบุเหตุผลในการลบ")
        return
      }
      finalReason = customReason.trim()
    }
    setIsDeleting(true)
    await onConfirm(finalReason)
    setIsDeleting(false)
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-fade-in">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-sm overflow-hidden flex flex-col">
        <div className="p-4 bg-rose-50 border-b border-rose-100 flex items-center gap-3">
          <div className="w-10 h-10 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center shrink-0">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-rose-700 text-sm">ยืนยันการลบ Tag</h3>
            <p className="text-[10px] text-rose-500 font-mono mt-0.5">{deleteConfirmData.rfid}</p>
          </div>
        </div>

        <div className="p-5">
          <label className="block text-xs font-bold text-slate-700 mb-2">
            โปรดเลือกเหตุผลในการลบ:
          </label>
          <div className="flex flex-col gap-2">
            {QUICK_REASONS.map(reason => (
              <label key={reason} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
                <input 
                  type="radio" 
                  name="deleteReason" 
                  value={reason}
                  checked={deleteReason === reason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  className="text-rose-500 focus:ring-rose-500"
                />
                <span className="text-xs text-slate-700 font-medium">{reason}</span>
              </label>
            ))}
          </div>

          {deleteReason === "อื่นๆ (ระบุเหตุผลเอง)" && (
            <div className="mt-3">
              <input
                type="text"
                value={customReason}
                onChange={e => setCustomReason(e.target.value)}
                placeholder="พิมพ์เหตุผลที่นี่..."
                className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:outline-none focus:border-rose-400 focus:ring-1 focus:ring-rose-400"
                autoFocus
              />
            </div>
          )}
        </div>

        <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-all text-xs disabled:opacity-50"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleConfirm}
            disabled={isDeleting || (deleteReason === "อื่นๆ (ระบุเหตุผลเอง)" && !customReason.trim())}
            className="px-4 py-1.5 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 transition-all text-xs flex items-center gap-2 disabled:opacity-50"
          >
            {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
            ยืนยันการลบ
          </button>
        </div>
      </div>
    </div>
  )
}

function BalanceCheckContent() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<BalanceSummary | null>(null)
  
  // โหลดค่าเริ่มต้นของ search จาก URL ถ้ามี
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "")
  const [showOnlyMismatch, setShowOnlyMismatch] = useState(false)
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({})

  const handleSearchChange = (val: string) => {
    setSearchQuery(val)
    const params = new URLSearchParams(searchParams.toString())
    if (val) {
      params.set("q", val)
    } else {
      params.delete("q")
    }
    // อัปเดต URL โดยไม่รีโหลดหน้า
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  // สำหรับ Modal รายการ Tag
  const [tagModalData, setTagModalData] = useState<{ productId: number, productName: string, branchId: number, branchName: string } | null>(null)
  const [tagsList, setTagsList] = useState<any[]>([])
  const [loadingTags, setLoadingTags] = useState(false)

  // สำหรับ Modal เลือกลบ Tag
  const [deleteConfirmData, setDeleteConfirmData] = useState<{ tagId: string | number, rfid: string } | null>(null)

  // สำหรับ Barcode Modal
  const [barcodeRfid, setBarcodeRfid] = useState<string | null>(null)

  const openTagModal = async (productId: number, productName: string, branchId: number, branchName: string) => {
    setTagModalData({ productId, productName, branchId, branchName })
    setLoadingTags(true)
    const res = await getProductBranchTags(productId, branchId)
    setTagsList(res.data || [])
    setLoadingTags(false)
  }

  const promptDeleteTag = (tagId: string | number, rfid: string) => {
    setDeleteConfirmData({ tagId, rfid })
  }

  const handleDeleteTag = async (finalReason: string) => {
    if (!deleteConfirmData) return
    const res = await deleteProductTag(deleteConfirmData.tagId, finalReason)
    if (res.error) {
      alert("ลบไม่สำเร็จ: " + res.error)
    } else {
      setTagsList(prev => prev.filter(t => t.id !== deleteConfirmData.tagId))
      setDeleteConfirmData(null)
      loadData() // รีเฟรชยอดรวม
    }
  }

  const toggleRow = (id: number) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await getSystemBalance()
      if (res.error) {
        alert("เกิดข้อผิดพลาด: " + res.error)
      } else {
        setData(res.data)
      }
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อ")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const filteredItems = (data?.items || []).filter(p => {
    const isMismatch = p.diff_lot_stock !== 0 || p.diff_stock_rfid !== 0
    if (showOnlyMismatch && !isMismatch) return false

    if (!searchQuery.trim()) return true
    
    const q = searchQuery.toLowerCase()
    return (
      p.product_name.toLowerCase().includes(q) ||
      (p.product_sku && p.product_sku.toLowerCase().includes(q))
    )
  })

  return (
    <div className="p-6 bg-slate-50 min-h-screen font-sans text-slate-800 antialiased relative">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Scale className="w-6 h-6 text-indigo-600" />
              ตรวจสอบยอดรวมระบบ (Balance Check)
            </h1>
            <p className="text-slate-500 text-xs mt-1">
              เปรียบเทียบยอดรับเข้าจาก Lots ทั้งหมด, ยอดใน Stock ทั้งหมด, และจำนวน Tag RFID ทั้งหมด เพื่อหาจุดที่คลาดเคลื่อน
            </p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="ค้นหาชื่อ, SKU..."
                className="w-full pl-9 pr-4 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-xs"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>

            <button
              onClick={() => setShowOnlyMismatch(!showOnlyMismatch)}
              className={`p-2 rounded-xl border transition-all shadow-xs cursor-pointer flex items-center gap-2 text-xs font-semibold ${
                showOnlyMismatch 
                  ? "bg-amber-50 border-amber-200 text-amber-700" 
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
              title="สลับการแสดงผล"
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">เฉพาะรายการที่ไม่ตรง</span>
            </button>

            <button
              onClick={loadData}
              disabled={loading}
              className="p-2 bg-white hover:bg-slate-50 text-slate-600 rounded-xl border border-slate-200 transition-all shadow-xs cursor-pointer disabled:opacity-50"
              title="รีเฟรชข้อมูล"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* ข้อมูลสรุป Grand Total */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-3.5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -z-10 opacity-50"></div>
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ยอดรับเข้ารวมทั้งหมด (Lots)</p>
              <p className="text-2xl font-black text-slate-800 mt-0.5">
                {loading ? "-" : data?.grand_total_lot.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-3.5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full -z-10 opacity-50"></div>
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ยอดสต็อกรวมทั้งหมด (Stock)</p>
              <p className="text-2xl font-black text-slate-800 mt-0.5">
                {loading ? "-" : data?.grand_total_stock.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-3.5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50 rounded-bl-full -z-10 opacity-50"></div>
            <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center shrink-0">
              <Hash className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">จำนวน Tag รวมทั้งหมด (RFID)</p>
              <p className="text-2xl font-black text-slate-800 mt-0.5">
                {loading ? "-" : data?.grand_total_rfid.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* ยอดรวมแยกตามสาขา (Branch Grand Totals) */}
        {!loading && data?.branch_grand_totals && data.branch_grand_totals.length > 0 && (
          <div className="mb-6 bg-white p-4 rounded-2xl border border-slate-150 shadow-xs">
            <h2 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
              <Store className="w-4 h-4 text-indigo-500" />
              สรุปยอดรวมแยกตามสาขา
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {data.branch_grand_totals.map((b) => (
                <div key={b.branch_id} className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-col gap-1.5">
                  <div className="font-bold text-slate-800 text-xs border-b border-slate-200 pb-1.5 mb-1">
                    {b.branch_name}
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500">รับเข้า (Lots):</span>
                    <span className="font-bold text-blue-600">{b.lot_received.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500">สต็อก (Stock):</span>
                    <span className="font-black text-emerald-600">{b.stock.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500">แท็ก (RFID):</span>
                    <span className="font-bold text-purple-600">{b.rfid.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ตารางแสดงรายการ */}
        <div className="bg-white rounded-2xl border border-slate-150 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="py-24 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
                <p className="text-sm font-semibold">กำลังคำนวณและประมวลผลยอดทั่วทั้งระบบ...</p>
              </div>
            ) : (
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-[#1E293B] text-white font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4 text-center w-12">รูปภาพ</th>
                    <th className="py-3.5 px-4 w-40">รหัส SKU</th>
                    <th className="py-3.5 px-4">ชื่อสินค้า</th>
                    <th className="py-3.5 px-4 text-center w-28 text-blue-300">รับเข้า (Lots)</th>
                    <th className="py-3.5 px-4 text-center w-28 text-emerald-300">สต็อก (Stock)</th>
                    <th className="py-3.5 px-4 text-center w-28">จำนวน Tag (RFID)</th>
                    <th className="py-3.5 px-4 text-center w-24">Stock vs Lots</th>
                    <th className="py-3.5 px-4 text-center w-32">Tag vs (Stock)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-16 text-center text-slate-400">
                        ไม่พบข้อมูลสินค้าที่มีการเคลื่อนไหว หรือไม่พบตามคำค้นหา
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map(p => {
                      let publicUrl = ""
                      if (p.image_url) {
                        if (p.image_url.startsWith("http") || p.image_url.startsWith("blob:")) {
                          publicUrl = p.image_url
                        } else {
                          publicUrl = `${PUBLIC_SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${p.image_url}`
                        }
                      }

                      // diff_lot_stock = สต็อก - ลอต
                      // diff_stock_rfid = สต็อก - RFID
                      const isLotStockOk = p.diff_lot_stock === 0
                      const isStockRfidOk = p.diff_stock_rfid === 0

                      return (
                        <React.Fragment key={p.product_id}>
                          <tr className={`hover:bg-slate-50/50 transition-colors align-top ${expandedRows[p.product_id] ? "bg-slate-50/50" : ""}`}>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <button onClick={() => toggleRow(p.product_id)} className="p-1 hover:bg-slate-200 rounded-full text-slate-400 transition-colors">
                                  {expandedRows[p.product_id] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                </button>
                                <div className="w-10 h-10 bg-slate-50 border border-slate-200/80 rounded-lg overflow-hidden flex items-center justify-center shadow-xs">
                                  {publicUrl ? (
                                    <img src={publicUrl} alt={p.product_name} className="w-full h-full object-cover" />
                                  ) : (
                                    <Package className="w-4 h-4 text-slate-300" />
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-mono font-bold text-slate-800 text-[11px]">{p.product_sku || "ไม่มี"}</span>
                            </td>
                            <td className="py-3 px-4 font-bold text-slate-800 text-[12px]">
                              {p.product_name}
                            </td>
                            <td className="py-3 px-4 text-center font-bold text-blue-600 bg-blue-50/30">
                              {p.total_lot_received.toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-center font-black text-emerald-600 bg-emerald-50/30">
                              {p.total_stock.toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-center font-bold text-purple-600 bg-purple-50/30">
                              {p.total_rfid.toLocaleString()}
                            </td>
                            
                            <td className="py-3 px-4 text-center border-l border-slate-100">
                              {isLotStockOk ? (
                                <span className="text-slate-400 font-medium text-[11px] flex justify-center items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-500" /> ปกติ
                                </span>
                              ) : (
                                <span className={`font-mono font-bold text-[12px] ${p.diff_lot_stock > 0 ? "text-amber-500" : "text-rose-500"}`}>
                                  {p.diff_lot_stock > 0 ? `+${p.diff_lot_stock}` : p.diff_lot_stock}
                                </span>
                              )}
                            </td>

                            <td className="py-3 px-4 text-center">
                              {isStockRfidOk ? (
                                <span className="text-slate-400 font-medium text-[11px] flex justify-center items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-500" /> ปกติ
                                </span>
                              ) : (
                                <span className={`font-mono font-bold text-[12px] ${p.diff_stock_rfid > 0 ? "text-rose-500" : "text-blue-500"}`}>
                                  {p.diff_stock_rfid > 0 ? `สต็อกเกิน +${p.diff_stock_rfid}` : `Tagเกิน ${Math.abs(p.diff_stock_rfid)}`}
                                </span>
                              )}
                            </td>
                          </tr>

                          {/* Branch Details Row */}
                          {expandedRows[p.product_id] && p.branch_details && p.branch_details.length > 0 && (
                            <tr className="bg-slate-50/30 border-b border-slate-100">
                              <td colSpan={8} className="p-0">
                                <div className="pl-14 pr-4 py-3 bg-slate-50 border-t border-slate-100 shadow-inner">
                                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                                    <Store className="w-3 h-3" /> แจกแจงรายสาขา
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                    {p.branch_details.map((branch) => {
                                      const bLotOk = branch.lot_received === branch.stock
                                      const bRfidOk = branch.stock === branch.rfid
                                      return (
                                        <div key={branch.branch_id} className="bg-white p-2.5 rounded-lg border border-slate-200 flex flex-col gap-1.5 shadow-sm">
                                          <div className="font-bold text-slate-700 text-[11px] border-b border-slate-100 pb-1 mb-0.5 truncate">
                                            {branch.branch_name}
                                          </div>
                                          <div className="flex justify-between items-center text-[11px]">
                                            <span className="text-slate-500">รับเข้า (Lots):</span>
                                            <span className="font-bold text-blue-600">{branch.lot_received.toLocaleString()}</span>
                                          </div>
                                          <div className="flex justify-between items-center text-[11px]">
                                            <span className="text-slate-500">สต็อก (Stock):</span>
                                            <span className="font-black text-emerald-600">{branch.stock.toLocaleString()}</span>
                                          </div>
                                          <div className="flex justify-between items-center text-[11px]">
                                            <span className="text-slate-500">แท็ก (RFID):</span>
                                            <span className="font-bold text-purple-600">{branch.rfid.toLocaleString()}</span>
                                          </div>
                                          
                                          {/* แถบแจ้งเตือนระดับสาขา */}
                                          {(!bLotOk || !bRfidOk) && (
                                            <div className="mt-1 pt-1.5 border-t border-slate-100 flex flex-col gap-0.5">
                                              {!bLotOk && (
                                                <div className="text-[9px] font-bold text-amber-600 flex justify-between">
                                                  <span>Stock vs Lots</span>
                                                  <span>{branch.stock - branch.lot_received > 0 ? `+${branch.stock - branch.lot_received}` : branch.stock - branch.lot_received}</span>
                                                </div>
                                              )}
                                              {!bRfidOk && (
                                                <div className="text-[9px] font-bold text-rose-600 flex justify-between">
                                                  <span>Tag vs (Stock)</span>
                                                  <span>{branch.rfid - branch.stock > 0 ? `+${branch.rfid - branch.stock}` : branch.rfid - branch.stock}</span>
                                                </div>
                                              )}
                                            </div>
                                          )}
                                          
                                          {/* ปุ่มดูรายการ Tag */}
                                          {branch.rfid > 0 && (
                                            <div className="mt-2 text-right">
                                              <button 
                                                onClick={() => openTagModal(p.product_id, p.product_name, branch.branch_id, branch.branch_name)}
                                                className="inline-flex items-center gap-1 text-[10px] text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded border border-indigo-100 transition-colors font-medium"
                                              >
                                                <Eye className="w-3 h-3" /> ดูรายการ Tag
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      )
                                    })}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      )
                    })
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>

      {/* Modal ดูรายการ Tag และจัดการ */}
      {tagModalData && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]">
            
            {/* Modal Header */}
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Hash className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">รายการ Tag RFID</h3>
                  <p className="text-[10px] text-slate-500">สาขา: {tagModalData.branchName}</p>
                </div>
              </div>
              <button 
                onClick={() => setTagModalData(null)} 
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/50 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 flex-1 overflow-y-auto">
              <p className="font-bold text-slate-700 text-xs mb-3 pb-2 border-b border-slate-100">
                สินค้า: <span className="text-indigo-600">{tagModalData.productName}</span>
              </p>
              
              {loadingTags ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                  <span className="text-xs">กำลังโหลดข้อมูล Tag...</span>
                </div>
              ) : tagsList.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs bg-slate-50 rounded-xl border border-slate-100 border-dashed">
                  ไม่พบ Tag ในระบบสำหรับสินค้านี้
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {tagsList.map(t => (
                    <div key={t.id} className="flex items-center justify-between bg-white border border-slate-200 p-2.5 rounded-xl hover:border-indigo-300 transition-colors group shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-500 flex items-center justify-center shrink-0">
                          <Hash className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-mono font-bold text-slate-800 text-xs">{t.rfid}</span>
                          <span className="text-[10px] text-emerald-600 font-medium">● {t.status}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button
                          onClick={() => setBarcodeRfid(t.rfid)}
                          className="p-1.5 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                          title="สร้าง Barcode จาก RFID นี้"
                        >
                          <Barcode className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => promptDeleteTag(t.id, t.rfid)}
                          className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                          title="ลบ Tag นี้"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-100 text-right shrink-0">
              <span className="text-[10px] text-slate-400 mr-4">จำนวนทั้งหมด: {tagsList.length} รายการ</span>
              <button
                onClick={() => setTagModalData(null)}
                className="px-4 py-1.5 bg-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-300 transition-all cursor-pointer text-xs"
              >
                ปิดหน้าต่าง
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Barcode Modal */}
      {barcodeRfid && (
        <BarcodeModal
          rfid={barcodeRfid}
          onClose={() => setBarcodeRfid(null)}
        />
      )}

      {/* Modal เลือกลบเหตุผล */}
      {deleteConfirmData && (
        <DeleteConfirmModal
          deleteConfirmData={deleteConfirmData}
          onClose={() => setDeleteConfirmData(null)}
          onConfirm={handleDeleteTag}
        />
      )}
    </div>
  )
}

export default function BalanceCheckPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    }>
      <BalanceCheckContent />
    </Suspense>
  )
}
