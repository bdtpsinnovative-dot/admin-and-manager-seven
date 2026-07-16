"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { getRfidStockMismatch, updateStockQty, bulkUpdateStockQty } from "../../../actions/stock-admin"
import { AlertTriangle, Search, Info, Package, RefreshCw, CheckCircle2, Edit2, Loader2, X } from "lucide-react"

const STORAGE_BUCKET = "product-images"
const PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://zexflchjcycxrpjkuews.supabase.co"

export default function RfidMismatchPage() {
  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState<any[]>([])
  const [branches, setBranches] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [editItem, setEditItem] = useState<{
    productId: number
    productName: string
    sku: string
    branchId: number
    branchName: string
    currentQty: number
  } | null>(null)
  const [newQtyVal, setNewQtyVal] = useState<string>("")
  const [isEditMode, setIsEditMode] = useState(false)
  const [editValues, setEditValues] = useState<Record<string, string>>({})
  const [showAllProducts, setShowAllProducts] = useState(false)

  // ฟังก์ชันโหลดข้อมูลหลัก
  const loadData = async () => {
    setLoading(true)
    try {
      const res = await getRfidStockMismatch()
      if (res.error) {
        alert("เกิดข้อผิดพลาด: " + res.error)
      } else {
        setProducts(res.data || [])
        setBranches(res.branches || [])
      }
    } catch (err: any) {
      console.error(err)
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อ")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // จัดการบันทึกแก้ไขจำนวนสต็อก
  const handleSaveQty = async () => {
    if (!editItem || submitting) return
    const newQty = Number(newQtyVal)
    if (isNaN(newQty) || newQty < 0) {
      alert("กรุณากรอกจำนวนที่ถูกต้อง (เป็นตัวเลขเชิงบวก)")
      return
    }

    setSubmitting(true)
    try {
      const result = await updateStockQty(editItem.productId, editItem.branchId, newQty)
      if (result.error) {
        alert("บันทึกไม่สำเร็จ: " + result.error)
      } else {
        alert("ปรับปรุงยอดสต็อกสำเร็จ!")
        setEditItem(null)
        // โหลดข้อมูลใหม่เพื่ออัปเดตหน้าจอ
        await loadData()
      }
    } catch (err: any) {
      console.error(err)
      alert("เกิดข้อผิดพลาดในการส่งข้อมูล")
    } finally {
      setSubmitting(false)
    }
  }

  // เปิดโหมดแก้ไขทั้งหมด
  const startEditMode = () => {
    const initialValues: Record<string, string> = {}
    for (const p of displayedProducts) {
      for (const b of p.branchBreakdown) {
        initialValues[`${p.id}-${b.branchId}`] = b.stock.toString()
      }
    }
    setEditValues(initialValues)
    setIsEditMode(true)
  }

  // จัดการบันทึกการแก้ไขในตารางโดยตรง
  const handleSaveInlineEdit = async () => {
    if (submitting) return

    const updates: { productId: number; branchId: number; newQty: number }[] = []
    
    for (const p of displayedProducts) {
      for (const b of p.branchBreakdown) {
        const valKey = `${p.id}-${b.branchId}`
        const valStr = editValues[valKey]
        if (valStr !== undefined) {
          const val = Number(valStr)
          if (isNaN(val) || val < 0) {
            alert(`กรุณากรอกจำนวนที่ถูกต้องสำหรับสินค้า "${p.name}" สาขา "${b.branchName}"`)
            return
          }
          if (val !== b.stock) {
            updates.push({
              productId: p.id,
              branchId: b.branchId,
              newQty: val
            })
          }
        }
      }
    }

    if (updates.length === 0) {
      alert("ไม่มีข้อมูลสต็อกที่เปลี่ยนแปลง")
      setIsEditMode(false)
      return
    }

    setSubmitting(true)
    try {
      const result = await bulkUpdateStockQty(updates)
      if (result.error) {
        alert("บันทึกไม่สำเร็จ: " + result.error)
      } else {
        alert(`บันทึกยอดสต็อกสำเร็จทั้งหมด ${updates.length} แถวข้อมูลเรียบร้อยแล้ว!`)
        setIsEditMode(false)
        await loadData()
      }
    } catch (err: any) {
      console.error(err)
      alert("เกิดข้อผิดพลาดในการส่งข้อมูล")
    } finally {
      setSubmitting(false)
    }
  }

  // แผนที่ชื่อสาขาเพื่อดึงข้อมูลง่ายๆ
  const branchMap = new Map(branches.map((b: any) => [b.id, b.branch_name]))

  // ประมวลผลหาความคลาดเคลื่อนและแยกรายสาขา
  const processedProducts = products.map(product => {
    // คำนวณสต็อกรวมทุกสาขา
    const totalStock = product.stock?.reduce((sum: number, s: any) => sum + (Number(s.qty) || 0), 0) || 0

    // คำนวณจำนวน Tag RFID ที่มีสถานะ IN_STOCK ทั้งหมด
    const activeRfidCount = product.product_rfid_tags?.filter((t: any) => t.status === "IN_STOCK").length || 0

    const diff = totalStock - activeRfidCount

    // คำนวณความคลาดเคลื่อนแยกเป็นรายสาขา
    const branchBreakdown: { branchId: number; branchName: string; stock: number; rfid: number; diff: number }[] = []
    
    const branchIds = new Set([
      ...(product.stock?.map((s: any) => s.branch_id) || []),
      ...(product.product_rfid_tags?.map((t: any) => t.branch_id) || [])
    ])

    branchIds.forEach(branchId => {
      const branchStock = product.stock?.filter((s: any) => s.branch_id === branchId).reduce((sum: number, s: any) => sum + (Number(s.qty) || 0), 0) || 0
      const branchRfid = product.product_rfid_tags?.filter((t: any) => t.branch_id === branchId && t.status === "IN_STOCK").length || 0
      const branchDiff = branchStock - branchRfid

      // เราสนใจทุึกสาขาที่มีข้อมูลสต็อกหรือ RFID อยู่
      branchBreakdown.push({
        branchId,
        branchName: branchMap.get(branchId) || `คลังสาขา #${branchId}`,
        stock: branchStock,
        rfid: branchRfid,
        diff: branchDiff
      })
    })

    // จัดการรูปภาพสินค้า
    let publicUrl = ""
    if (product.image_url) {
      if (product.image_url.startsWith("http") || product.image_url.startsWith("blob:")) {
        publicUrl = product.image_url
      } else {
        publicUrl = `${PUBLIC_SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${product.image_url}`
      }
    }

    return {
      ...product,
      image_url: publicUrl,
      totalStock,
      activeRfidCount,
      diff,
      branchBreakdown,
    }
  })

  // กรองรายการสินค้าที่จะแสดงผล
  const displayedProducts = processedProducts
    .filter(p => {
      // 1. กรองตามคำค้นหา
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        return (
          p.name.toLowerCase().includes(q) ||
          (p.sku && p.sku.toLowerCase().includes(q)) ||
          (p.barcode && p.barcode.toLowerCase().includes(q))
        )
      }
      return true
    })
    .filter(p => {
      // 2. ถ้าเปิดให้แสดงทั้งหมด หรือมีการค้นหาอยู่ ให้แสดงได้เลย (ไม่คัด diff === 0 ออก)
      if (showAllProducts || searchQuery.trim()) return true
      
      // ถ้าไม่ได้ตั้งค่าพิเศษ ให้แสดงเฉพาะยอดต่าง
      return p.diff !== 0
    })
    // เรียงลำดับจากจุดที่สต็อกเกินเยอะที่สุดลงมา
    .sort((a, b) => b.diff - a.diff)

  return (
    <div className="p-6 bg-slate-50 min-h-screen font-sans text-slate-800 antialiased relative">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-amber-500" />
              รายงานยอดต่าง RFID & สต็อกสินค้า
            </h1>
            <p className="text-slate-500 text-xs mt-1">
              ตรวจสอบยอดสต็อกสะสมกับจำนวนการลงทะเบียน Tag RFID ที่ใช้งานอยู่ (สถานะ IN_STOCK) แบบละเอียดรายสาขา พร้อมปุ่มแก้ไขสต็อก
            </p>
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap">
            {/* ปุ่มเปิดปิดการแสดงสินค้าที่ตรงกัน */}
            <button
              onClick={() => setShowAllProducts(!showAllProducts)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0 ${
                showAllProducts
                  ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{showAllProducts ? "แสดงสินค้าทั้งหมด" : "แสดงเฉพาะยอดต่าง"}</span>
            </button>

            {/* ฟอร์มค้นหาด่วน */}
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาชื่อ, SKU, บาร์โค้ด..."
                className="w-full pl-9 pr-4 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-xs"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>

            <button
              onClick={loadData}
              disabled={loading}
              className="p-2 bg-white hover:bg-slate-50 text-slate-600 rounded-xl border border-slate-200 transition-all shadow-xs cursor-pointer disabled:opacity-50 shrink-0"
              title="รีเฟรชข้อมูล"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* ข้อมูลสรุป */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-3.5">
            <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">รายการที่คลาดเคลื่อน</p>
              <p className="text-xl font-extrabold text-slate-800 mt-0.5">
                {loading ? "-" : processedProducts.length} รายการ
              </p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-3.5">
            <div className="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">สต็อกเกินกว่า Tag (ไม่มี RFID)</p>
              <p className="text-xl font-extrabold text-red-600 mt-0.5">
                {loading ? "-" : processedProducts.filter(p => p.diff > 0).length} รายการ
              </p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-3.5">
            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
              <Info className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tag เกินกว่าสต็อกในคลัง</p>
              <p className="text-xl font-extrabold text-blue-600 mt-0.5">
                {loading ? "-" : processedProducts.filter(p => p.diff < 0).length} รายการ
              </p>
            </div>
          </div>
        </div>

        {/* ตารางแสดงรายการ */}
        <div className="bg-white rounded-2xl border border-slate-150 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="py-24 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
                <p className="text-sm font-semibold">กำลังประมวลผลเปรียบเทียบข้อมูล...</p>
              </div>
            ) : (
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-[#1E293B] text-white font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4 text-center w-12">รูปภาพ</th>
                    <th className="py-3.5 px-4 w-40">รหัส SKU / บาร์โค้ด</th>
                    <th className="py-3.5 px-4">
                      <div className="flex items-center gap-2 justify-between">
                        <span>ชื่อสินค้า</span>
                        {!isEditMode && displayedProducts.length > 0 && (
                          <button
                            onClick={startEditMode}
                            className="px-2 py-0.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1"
                          >
                            <Edit2 className="w-2.5 h-2.5" /> แก้ไขทั้งหมด
                          </button>
                        )}
                      </div>
                    </th>
                    <th className="py-3.5 px-4 text-center w-28">ยอดสต็อกรวม</th>
                    <th className="py-3.5 px-4 text-center w-28">จำนวน Tag RFID</th>
                    <th className="py-3.5 px-4 text-center w-24">ผลต่าง</th>
                    <th className="py-3.5 px-4 w-48">สถานะการตรวจสอบ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayedProducts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-16 text-center text-slate-400">
                        <div className="flex flex-col items-center gap-2.5">
                          {searchQuery.trim() ? (
                            <>
                              <Search className="w-12 h-12 text-slate-300" />
                              <p className="font-bold text-slate-700">ไม่พบสินค้าที่ค้นหา</p>
                              <p className="text-xs text-slate-400">ลองตรวจสอบคำค้นหา หรือเปิดแสดงสินค้าทั้งหมด</p>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                              <p className="font-bold text-slate-700">ยินดีด้วยครับ! ข้อมูลตรงกันทั้งหมด</p>
                              <p className="text-xs text-slate-400">ไม่พบความคลาดเคลื่อนระหว่างสต็อกและ RFID ในระบบขณะนี้</p>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    displayedProducts.map(p => {
                      const currentTotalStock = p.branchBreakdown.reduce((sum: number, b: any) => {
                        if (isEditMode) {
                          const val = editValues[`${p.id}-${b.branchId}`]
                          return sum + (val !== undefined ? Number(val) : b.stock)
                        }
                        return sum + b.stock
                      }, 0)

                      const currentDiff = currentTotalStock - p.activeRfidCount
                      const isStockOver = currentDiff > 0
                      
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/50 transition-colors align-top">
                          {/* รูปภาพสินค้า */}
                          <td className="py-4 px-4">
                            <div className="w-12 h-12 bg-slate-50 border border-slate-200/80 rounded-lg overflow-hidden flex items-center justify-center shadow-xs mt-0.5">
                              {p.image_url ? (
                                <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                              ) : (
                                <Package className="w-5 h-5 text-slate-300" />
                              )}
                            </div>
                          </td>

                          {/* รหัส SKU / บาร์โค้ด */}
                          <td className="py-4 px-4">
                            <div className="flex flex-col gap-0.5 mt-0.5">
                              <span className="font-mono font-bold text-slate-800 text-[11px]">{p.sku || "ไม่มี SKU"}</span>
                              {p.barcode && <span className="font-mono text-slate-400 text-[10px]">{p.barcode}</span>}
                            </div>
                          </td>

                          {/* ชื่อสินค้า & รายละเอียด */}
                          <td className="py-4 px-4 flex flex-col">
                            <span className="font-bold text-slate-800 text-[13px]">{p.name}</span>
                            {/* แจกแจงรายสาขาพร้อมปุ่มแก้ไข */}
                            {p.branchBreakdown && p.branchBreakdown.length > 0 && (
                              <div className="mt-3 flex flex-col gap-2">
                                {p.branchBreakdown.filter((b: any) => b.stock > 0 || b.rfid > 0).map((b: any) => {
                                  const valKey = `${p.id}-${b.branchId}`
                                  const valStr = editValues[valKey] ?? b.stock.toString()

                                  return isEditMode ? (
                                    <div key={b.branchId} className="flex items-center justify-between bg-blue-50/40 border border-blue-100 p-2 rounded-lg gap-3">
                                      <div className="flex flex-col gap-0.5">
                                        <span className="text-[11px] font-bold text-slate-700">{b.branchName}</span>
                                        <span className="text-[10px] text-slate-400">Tag RFID: {b.rfid} ชิ้น</span>
                                      </div>
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-[10px] text-slate-400">สต็อก:</span>
                                        <input
                                          type="number"
                                          min="0"
                                          value={valStr}
                                          onChange={(e) => {
                                            const inputVal = e.target.value
                                            setEditValues(prev => ({
                                              ...prev,
                                              [valKey]: inputVal
                                            }))
                                          }}
                                          className="w-16 px-1.5 py-0.5 border border-slate-300 rounded text-center font-bold text-slate-850 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        />
                                      </div>
                                    </div>
                                  ) : (
                                    <div key={b.branchId} className="flex items-center justify-between bg-slate-50 border border-slate-100 p-2 rounded-lg">
                                      <div className="flex items-center gap-2">
                                        <span className="text-[11px] font-bold text-slate-700">{b.branchName}</span>
                                        <span className="text-[10px] text-slate-500">(สต็อก: {b.stock}, Tag: {b.rfid})</span>
                                      </div>
                                      <button
                                        onClick={() => {
                                          setEditItem({
                                            productId: p.id,
                                            productName: p.name,
                                            sku: p.sku,
                                            branchId: b.branchId,
                                            branchName: b.branchName,
                                            currentQty: b.stock
                                          })
                                          setNewQtyVal(b.stock.toString())
                                        }}
                                        className="text-[10px] text-blue-600 hover:text-blue-800 bg-white px-2 py-1 rounded border border-blue-100 transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                                      >
                                        <Edit2 className="w-3 h-3" /> แก้ไขสต็อก
                                      </button>
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </td>

                          {/* ยอดสต็อกรวม */}
                          <td className="py-4 px-4 text-center font-bold text-slate-700 text-[13px]">
                            {currentTotalStock} ชิ้น
                          </td>
 
                          {/* จำนวน Tag RFID */}
                          <td className="py-4 px-4 text-center font-bold text-slate-700 text-[13px]">
                            {p.activeRfidCount} ชิ้น
                          </td>
 
                          {/* ผลต่าง */}
                          <td className="py-4 px-4 text-center">
                            <span className={`inline-block font-mono font-extrabold text-[13px] ${isStockOver ? "text-red-500" : "text-blue-500"}`}>
                              {currentDiff === 0 ? "0" : isStockOver ? `+${currentDiff}` : currentDiff}
                            </span>
                          </td>
 
                          {/* สถานะการตรวจสอบ */}
                          <td className="py-4 px-4">
                            {currentDiff === 0 ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg font-bold border border-emerald-200/50 text-[10px]">
                                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                ยอดตรงกัน
                              </span>
                            ) : isStockOver ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-50 text-red-700 rounded-lg font-bold border border-red-200/50 text-[10px]">
                                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                สต็อกเกิน (ขาด RFID {currentDiff} ชิ้น)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg font-bold border border-blue-200/50 text-[10px]">
                                <Info className="w-3.5 h-3.5 shrink-0" />
                                Tag เกินกว่ายอดสต็อก {Math.abs(currentDiff)} ชิ้น
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>

      {/* Modal แก้ไขจำนวนสต็อก */}
      {editItem && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-sm overflow-hidden transform scale-95 transition-all">
            
            {/* Modal Header */}
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-blue-600" />
                <span className="font-bold text-slate-800 text-sm">แก้ไขจำนวนสต็อกด่วน</span>
              </div>
              <button 
                onClick={() => setEditItem(null)} 
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200/50 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 flex flex-col gap-3">
              <div className="text-[11px] text-slate-500">
                <p className="font-semibold text-slate-700 truncate">{editItem.productName}</p>
                <p className="font-mono mt-0.5">SKU: {editItem.sku || "ไม่มี"}</p>
                <p className="mt-1 font-bold text-blue-600">📍 {editItem.branchName}</p>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">จำนวนสต็อกในคลัง (ชิ้น)</label>
                <input
                  type="number"
                  min="0"
                  value={newQtyVal}
                  onChange={(e) => setNewQtyVal(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm font-bold text-slate-800"
                  autoFocus
                />
                <span className="text-[10px] text-slate-400 mt-0.5">ยอดเดิมคือ: {editItem.currentQty} ชิ้น</span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-100 flex gap-2 justify-end">
              <button
                onClick={() => setEditItem(null)}
                className="px-3.5 py-1.5 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-100 transition-all cursor-pointer text-xs"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSaveQty}
                disabled={submitting}
                className="px-3.5 py-1.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all cursor-pointer text-xs flex items-center gap-1 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    กำลังบันทึก...
                  </>
                ) : (
                  "บันทึกยอดแก้ไข"
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {isEditMode && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md border border-slate-200/80 px-6 py-3.5 rounded-2xl shadow-xl flex items-center gap-4 z-40 animate-slide-up">
          <span className="text-xs font-bold text-slate-700">กำลังอยู่ในโหมดแก้ไขสต็อกด่วนแบบตารางโดยตรง</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditMode(false)}
              className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-all cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              onClick={handleSaveInlineEdit}
              disabled={submitting}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  กำลังบันทึก...
                </>
              ) : (
                "บันทึกการแก้ไขทั้งหมด"
              )}
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
