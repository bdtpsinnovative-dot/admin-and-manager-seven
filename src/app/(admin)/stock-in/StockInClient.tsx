"use client"

import React, { useState, useRef, useTransition, useMemo } from "react"
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  Package,
  Layers,
  MapPin,
  ArrowRight,
  Trash2,
  RotateCw,
  Search,
  Check,
  X,
  FileText,
  Boxes,
  TrendingUp,
  AlertCircle,
  Eye,
} from "lucide-react"
import * as XLSX from "xlsx"
import { toast } from "sonner"
import {
  type Branch,
  type StockInPreviewItem,
  lookupStockInItems,
  confirmStockIn,
} from "@/actions/stock-in"

interface Props {
  branches: Branch[]
}

export default function StockInClient({ branches }: Props) {
  const [selectedBranchId, setSelectedBranchId] = useState<number>(
    branches[0]?.id || 0
  )
  const [note, setNote] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [previewItems, setPreviewItems] = useState<StockInPreviewItem[]>([])
  const [isParsing, setIsParsing] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [filterTab, setFilterTab] = useState<"all" | "valid" | "invalid">("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [successResult, setSuccessResult] = useState<{
    count: number
    totalQty: number
    branchName: string
  } | null>(null)

  // Zoomed Image Modal
  const [zoomedImage, setZoomedImage] = useState<{ url: string; name: string } | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const selectedBranch = useMemo(
    () => branches.find((b) => b.id === selectedBranchId),
    [branches, selectedBranchId]
  )

  // สรุปตัวเลขสถิติ
  const summary = useMemo(() => {
    const total = previewItems.length
    const valid = previewItems.filter((i) => i.isValid).length
    const invalid = total - valid
    const totalInboundQty = previewItems
      .filter((i) => i.isValid)
      .reduce((sum, i) => sum + i.inboundQty, 0)
    return { total, valid, invalid, totalInboundQty }
  }, [previewItems])

  // ดาวน์โหลดไฟล์เทมเพลต Excel
  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new()
    const sampleRows = [
      {
        "Barcode": "ML-VA-CR-3D102672W06",
        "SKU": "TR-VA-ML3D102672W06",
        "จำนวนรับเข้า (Qty)": 10,
        "หมายเหตุ": "ของเข้าลอตใหม่",
      },
      {
        "Barcode": "BX001",
        "SKU": "WOODSLABS-001",
        "จำนวนรับเข้า (Qty)": 5,
        "หมายเหตุ": "แผ่นไม้ตัวอย่าง",
      },
      {
        "Barcode": "RW001",
        "SKU": "ROUGH-001",
        "จำนวนรับเข้า (Qty)": 20,
        "หมายเหตุ": "ไม้ดิบนำเข้า",
      },
    ]

    const ws = XLSX.utils.json_to_sheet(sampleRows)
    // จัดความกว้างคอลัมน์ให้อ่านง่าย
    ws["!cols"] = [{ wch: 25 }, { wch: 25 }, { wch: 20 }, { wch: 30 }]
    XLSX.utils.book_append_sheet(wb, ws, "Stock_In_Template")
    XLSX.writeFile(wb, "stock_in_template.xlsx")
    toast.success("ดาวน์โหลดเทมเพลตเรียบร้อยแล้ว")
  }

  // อ่านไฟล์ Excel / CSV
  const handleFileUpload = async (selectedFile: File) => {
    if (!selectedBranchId) {
      toast.error("กรุณาเลือกสาขาที่ต้องการรับเข้าก่อนอัปโหลดไฟล์")
      return
    }

    setFile(selectedFile)
    setIsParsing(true)
    setSuccessResult(null)

    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: "binary" })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet)

        if (!jsonData || jsonData.length === 0) {
          toast.error("ไม่พบข้อมูลในไฟล์ที่เลือก")
          setIsParsing(false)
          return
        }

        const rawItems: { code: string; qty: number }[] = []

        for (const row of jsonData) {
          // ดึงรหัส Barcode หรือ SKU จากหลายชื่อคอลัมน์ที่เป็นไปได้
          const codeVal =
            row["Barcode"] ||
            row["barcode"] ||
            row["BARCODE"] ||
            row["SKU"] ||
            row["sku"] ||
            row["Code"] ||
            row["code"] ||
            row["รหัสสินค้า"] ||
            row["รหัส"] ||
            row["Item NO."] ||
            ""

          // ดึงจำนวนรับเข้า (Qty)
          const qtyVal =
            row["จำนวนรับเข้า (Qty)"] ||
            row["จำนวนรับเข้า"] ||
            row["จำนวน"] ||
            row["Qty"] ||
            row["qty"] ||
            row["QTY"] ||
            row["Quantity"] ||
            row["quantity"] ||
            row["ยอดรับ"] ||
            0

          const cleanCode = String(codeVal).trim()
          const cleanQty = Number(String(qtyVal).replace(/[^0-9.]/g, "")) || 0

          if (cleanCode) {
            rawItems.push({ code: cleanCode, qty: cleanQty })
          }
        }

        if (rawItems.length === 0) {
          toast.error("ไม่พบคอลัมน์ Barcode หรือ SKU ในไฟล์ Excel กรุณาใช้ไฟล์เทมเพลต")
          setIsParsing(false)
          return
        }

        // ตรวจสอบและดึงสต็อกจริงของสาขาผ่าน Server Action
        const res = await lookupStockInItems(selectedBranchId, rawItems)
        setPreviewItems(res.items)

        if (res.summary.invalid > 0) {
          toast.warning(
            `พบข้อมูล ${res.summary.total} รายการ (พร้อมรับ ${res.summary.valid}, ไม่พบรหัส ${res.summary.invalid} รายการ)`
          )
        } else {
          toast.success(`ตรวจสอบข้อมูลสำเร็จ ${res.summary.valid} รายการ พร้อมรับเข้าสต็อก`)
        }
      } catch (err: any) {
        console.error("Excel parse error:", err)
        toast.error("อ่านไฟล์ไม่สำเร็จ: " + (err.message || "รูปแบบไฟล์ไม่ถูกต้อง"))
      } finally {
        setIsParsing(false)
      }
    }

    reader.readAsBinaryString(selectedFile)
  }

  // เปลี่ยนสาขา ➔ รีเฟรชสต็อกเดิมของสินค้าทั้งหมด
  const handleBranchChange = async (newBranchId: number) => {
    setSelectedBranchId(newBranchId)
    if (previewItems.length > 0) {
      setIsParsing(true)
      try {
        const rawItems = previewItems.map((i) => ({ code: i.code, qty: i.inboundQty }))
        const res = await lookupStockInItems(newBranchId, rawItems)
        setPreviewItems(res.items)
        toast.info("ปรับเทียบสต็อกตามสาขาใหม่เรียบร้อยแล้ว")
      } catch (err) {
        console.error(err)
      } finally {
        setIsParsing(false)
      }
    }
  }

  // แก้ไขจำนวนรับเข้าของแต่ละแถว
  const handleQtyChange = (id: string, newQty: number) => {
    setPreviewItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const validQty = Math.max(0, newQty)
          const isValid = !!item.productId && validQty > 0
          return {
            ...item,
            inboundQty: validQty,
            newStock: item.currentStock + validQty,
            isValid,
            errorMsg: validQty <= 0 ? "จำนวนต้องมากกว่า 0" : undefined,
          }
        }
        return item
      })
    )
  }

  // ลบแถว
  const handleRemoveRow = (id: string) => {
    setPreviewItems((prev) => prev.filter((i) => i.id !== id))
    toast.info("ลบรายการออกจากตารางแล้ว")
  }

  // ล้างทั้งหมด
  const handleReset = () => {
    setFile(null)
    setPreviewItems([])
    setSuccessResult(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  // ยืนยันบันทึกรับเข้าสต็อก
  const handleConfirmSubmit = () => {
    const validItems = previewItems.filter((i) => i.isValid && i.productId)
    if (validItems.length === 0) {
      toast.error("ไม่มีรายการสินค้าที่ถูกต้องสำหรับรับเข้าสต็อก")
      return
    }

    startTransition(async () => {
      try {
        const payload = {
          branchId: selectedBranchId,
          items: validItems.map((i) => ({
            productId: i.productId!,
            qty: i.inboundQty,
            code: i.code,
          })),
          note,
        }

        const res = await confirmStockIn(payload)

        if (!res.success) {
          toast.error(res.error || "เกิดข้อผิดพลาดในการบันทึก")
          return
        }

        setSuccessResult({
          count: res.count,
          totalQty: res.totalQty,
          branchName: selectedBranch?.branch_name || `สาขา ID ${selectedBranchId}`,
        })
        setShowConfirmModal(false)
        setPreviewItems([])
        setFile(null)
        setNote("")
        toast.success(`รับสินค้าเข้าสต็อกสำเร็จ ${res.count} รายการ (+${res.totalQty} ชิ้น)!`)
      } catch (err: any) {
        toast.error("เกิดข้อผิดพลาด: " + err.message)
      }
    })
  }

  // กรองรายการสินค้าตาม Tab และคำค้นหา
  const filteredItems = useMemo(() => {
    return previewItems.filter((item) => {
      if (filterTab === "valid" && !item.isValid) return false
      if (filterTab === "invalid" && item.isValid) return false

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchName = item.name.toLowerCase().includes(q)
        const matchSku = item.sku?.toLowerCase().includes(q) || false
        const matchBarcode = item.barcode?.toLowerCase().includes(q) || false
        const matchCode = item.code.toLowerCase().includes(q)
        return matchName || matchSku || matchBarcode || matchCode
      }
      return true
    })
  }, [previewItems, filterTab, searchQuery])

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      {/* --- Header Banner --- */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#7B6A55] uppercase tracking-wider mb-1">
            <Boxes className="w-4 h-4" />
            <span>คลังสินค้า & สต็อกสินค้า</span>
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">
            รับสินค้าเข้าสต็อกด่วน (Stock In via Sheet)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            นำเข้าและบวกสต็อกสินค้าด้วย Excel/CSV โดยไม่ต้องใช้ RFID Tag พร้อมดูรูปพรีวิวก่อนยืนยัน
          </p>
        </div>

        <button
          onClick={downloadTemplate}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl font-bold text-sm transition-all shadow-sm active:scale-95 shrink-0"
        >
          <Download className="w-4 h-4 text-emerald-600" />
          <span>ดาวน์โหลดเทมเพลต Excel</span>
        </button>
      </div>

      {/* --- Control Panel (เลือกสาขา & หมายเหตุ) --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* เลือกสาขา */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm md:col-span-1">
          <label className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase mb-2">
            <MapPin className="w-4 h-4 text-[#7B6A55]" />
            <span>สาขาปลายทางที่รับเข้า <span className="text-red-500">*</span></span>
          </label>
          <select
            value={selectedBranchId}
            onChange={(e) => handleBranchChange(Number(e.target.value))}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-[#7B6A55]/30 focus:border-[#7B6A55] transition"
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                📍 {b.branch_name}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-400 mt-1.5">
            สต็อกเดิมจะถูกคำนวณและปรับเข้าสาขานี้โดยตรง
          </p>
        </div>

        {/* หมายเหตุบันทึก */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm md:col-span-2">
          <label className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase mb-2">
            <FileText className="w-4 h-4 text-slate-400" />
            <span>หมายเหตุ / เอกสารอ้างอิง (Optional)</span>
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="เช่น ใบสั่งซื้อ PO-2026-009, สินค้าเติมสต็อกล็อตใหม่จากโรงงาน..."
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#7B6A55]/30 focus:border-[#7B6A55] transition"
          />
          <p className="text-[11px] text-slate-400 mt-1.5">
            ข้อความนี้จะถูกบันทึกลงในตารางประวัติสต็อก (Stock Movements) เพื่อใช้ตรวจสอบย้อนหลัง
          </p>
        </div>
      </div>

      {/* --- Drag & Drop Upload Zone --- */}
      {previewItems.length === 0 && !successResult && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            const droppedFile = e.dataTransfer.files[0]
            if (droppedFile) handleFileUpload(droppedFile)
          }}
          onClick={() => fileInputRef.current?.click()}
          className="bg-white border-2 border-dashed border-slate-300 hover:border-[#7B6A55] rounded-3xl p-12 text-center cursor-pointer transition-all duration-200 group hover:bg-[#7B6A55]/5 shadow-sm"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx, .xls, .csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) handleFileUpload(f)
            }}
          />

          <div className="w-20 h-20 bg-slate-100 group-hover:bg-[#7B6A55]/10 group-hover:text-[#7B6A55] text-slate-400 rounded-3xl flex items-center justify-center mx-auto mb-4 transition-all duration-200 group-hover:scale-105 shadow-inner">
            {isParsing ? (
              <RotateCw className="w-10 h-10 animate-spin text-[#7B6A55]" />
            ) : (
              <UploadCloud className="w-10 h-10" />
            )}
          </div>

          <h3 className="text-lg font-bold text-slate-700 group-hover:text-slate-900 transition">
            {isParsing ? "กำลังอ่านไฟล์และดึงรูปภาพสินค้า..." : "ลากไฟล์ Excel / CSV มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์"}
          </h3>
          <p className="text-xs text-slate-400 mt-1.5">
            รองรับไฟล์ .xlsx, .xls และ .csv (มีคอลัมน์ Barcode หรือ SKU และจำนวนรับเข้า)
          </p>

          <div className="flex items-center justify-center gap-2 mt-4 text-xs font-semibold text-slate-500 bg-slate-100/70 inline-flex px-3 py-1.5 rounded-full mx-auto">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>อ่าน Barcode, SKU, และ Qty อัตโนมัติ</span>
          </div>
        </div>
      )}

      {/* --- Success Screen --- */}
      {successResult && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-8 text-center shadow-sm">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-sm">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-emerald-900">
            บันทึกรับสินค้าเข้าสต็อกสำเร็จแล้ว!
          </h2>
          <p className="text-sm text-emerald-700 mt-1">
            เพิ่มสต็อกเข้าคลัง <strong>{successResult.branchName}</strong> เรียบร้อยแล้ว
          </p>

          <div className="flex items-center justify-center gap-6 mt-6 max-w-md mx-auto">
            <div className="bg-white px-6 py-3 rounded-2xl border border-emerald-100 shadow-sm">
              <p className="text-xs text-slate-400 font-bold uppercase">จำนวนรายการ</p>
              <p className="text-2xl font-black text-slate-800">{successResult.count} รายการ</p>
            </div>
            <div className="bg-white px-6 py-3 rounded-2xl border border-emerald-100 shadow-sm">
              <p className="text-xs text-slate-400 font-bold uppercase">สต็อกที่เพิ่มรวม</p>
              <p className="text-2xl font-black text-emerald-600">+{successResult.totalQty.toLocaleString()} ชิ้น</p>
            </div>
          </div>

          <button
            onClick={handleReset}
            className="mt-8 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-200 transition-all active:scale-95"
          >
            ทำรายการรับสินค้าไฟล์อื่นต่อ
          </button>
        </div>
      )}

      {/* --- Preview & Verification Section --- */}
      {previewItems.length > 0 && (
        <div className="space-y-4">
          {/* Summary Badges Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase">ทั้งหมดในไฟล์</span>
                <Boxes className="w-4 h-4 text-slate-400" />
              </div>
              <p className="text-2xl font-black text-slate-800 mt-1">
                {summary.total} <span className="text-xs text-slate-400 font-normal">รายการ</span>
              </p>
            </div>

            <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-600 uppercase">พร้อมรับเข้า</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-black text-emerald-700 mt-1">
                {summary.valid} <span className="text-xs text-emerald-500 font-normal">รายการ</span>
              </p>
            </div>

            <div className={`p-4 rounded-2xl border shadow-sm ${summary.invalid > 0 ? "bg-red-50/70 border-red-200" : "bg-slate-50 border-slate-200"}`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold uppercase ${summary.invalid > 0 ? "text-red-600" : "text-slate-400"}`}>
                  ไม่พบในระบบ
                </span>
                <AlertTriangle className={`w-4 h-4 ${summary.invalid > 0 ? "text-red-500" : "text-slate-300"}`} />
              </div>
              <p className={`text-2xl font-black mt-1 ${summary.invalid > 0 ? "text-red-600" : "text-slate-400"}`}>
                {summary.invalid} <span className="text-xs font-normal">รายการ</span>
              </p>
            </div>

            <div className="bg-blue-50/70 p-4 rounded-2xl border border-blue-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-600 uppercase">สต็อกที่เพิ่มรวม</span>
                <TrendingUp className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-2xl font-black text-blue-700 mt-1">
                +{summary.totalInboundQty.toLocaleString()} <span className="text-xs text-blue-500 font-normal">ชิ้น</span>
              </p>
            </div>
          </div>

          {/* Filtering & Search Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0">
              <button
                onClick={() => setFilterTab("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterTab === "all" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
              >
                ทั้งหมด ({summary.total})
              </button>
              <button
                onClick={() => setFilterTab("valid")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterTab === "valid" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
              >
                พร้อมรับ ({summary.valid})
              </button>
              {summary.invalid > 0 && (
                <button
                  onClick={() => setFilterTab("invalid")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterTab === "invalid" ? "bg-red-600 text-white shadow-sm" : "text-red-500 hover:text-red-700"}`}
                >
                  มีปัญหา ({summary.invalid})
                </button>
              )}
            </div>

            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาชื่อสินค้า, SKU, Barcode ในตาราง..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#7B6A55]/30 focus:border-[#7B6A55] transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Reset Button */}
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-red-600 px-3 py-2 rounded-xl hover:bg-slate-50 transition shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>ล้างรายการ</span>
            </button>
          </div>

          {/* Table Container */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-slate-50/90 sticky top-0 z-10 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4 w-12 text-center">#</th>
                    <th className="py-3 px-4 w-20">รูปสินค้า</th>
                    <th className="py-3 px-4">ข้อมูลสินค้า (Name / SKU / Barcode)</th>
                    <th className="py-3 px-4 w-28 text-center">สต็อกเดิม</th>
                    <th className="py-3 px-4 w-36 text-center">จำนวนรับเข้า (+Qty)</th>
                    <th className="py-3 px-4 w-28 text-center">สต็อกใหม่</th>
                    <th className="py-3 px-4 w-32 text-center">สถานะ</th>
                    <th className="py-3 px-4 w-12 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredItems.map((item, idx) => {
                    const rowClass = !item.isValid ? "bg-red-50/30" : "hover:bg-slate-50/60"

                    return (
                      <tr key={item.id} className={`${rowClass} transition-colors`}>
                        {/* Index */}
                        <td className="py-3 px-4 text-center font-mono text-xs text-slate-400">
                          {idx + 1}
                        </td>

                        {/* Image with zoom thumbnail */}
                        <td className="py-3 px-4">
                          <div
                            onClick={() => {
                              if (item.imageUrl) setZoomedImage({ url: item.imageUrl, name: item.name })
                            }}
                            className="w-14 h-14 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0 cursor-pointer hover:opacity-90 relative group"
                          >
                            {item.imageUrl ? (
                              <>
                                <img
                                  src={item.imageUrl}
                                  alt={item.name}
                                  className="w-full h-full object-cover transition-transform group-hover:scale-110"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = "none"
                                  }}
                                />
                                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                  <Eye className="w-3.5 h-3.5" />
                                </div>
                              </>
                            ) : (
                              <Package className="w-6 h-6 text-slate-300" />
                            )}
                          </div>
                        </td>

                        {/* Product Info */}
                        <td className="py-3 px-4">
                          <p className="font-bold text-slate-800 leading-snug line-clamp-2">
                            {item.name}
                          </p>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            {item.barcode && (
                              <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200">
                                Barcode: {item.barcode}
                              </span>
                            )}
                            {item.sku && (
                              <span className="font-mono text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md border border-indigo-100 font-bold">
                                SKU: {item.sku}
                              </span>
                            )}
                            {item.category && (
                              <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md border border-amber-100">
                                {item.category}
                              </span>
                            )}
                          </div>
                          {item.errorMsg && (
                            <p className="text-xs text-red-500 font-semibold mt-1 flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                              <span>{item.errorMsg}</span>
                            </p>
                          )}
                        </td>

                        {/* Current Stock */}
                        <td className="py-3 px-4 text-center">
                          <span className="font-bold text-slate-700 font-mono text-sm">
                            {item.currentStock.toLocaleString()}
                          </span>
                        </td>

                        {/* Inbound Qty (Editable input) */}
                        <td className="py-3 px-4 text-center">
                          <input
                            type="number"
                            min={0}
                            value={item.inboundQty}
                            disabled={!item.productId}
                            onChange={(e) => handleQtyChange(item.id, Number(e.target.value))}
                            className={`w-24 px-3 py-1.5 text-center font-black text-sm rounded-xl border font-mono transition focus:outline-none focus:ring-2 ${
                              item.isValid
                                ? "bg-white border-slate-300 text-slate-800 focus:ring-emerald-500/20 focus:border-emerald-500"
                                : "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                            }`}
                          />
                        </td>

                        {/* New Stock */}
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`font-black font-mono text-sm px-2.5 py-1 rounded-lg ${
                              item.isValid
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                : "bg-slate-100 text-slate-400"
                            }`}
                          >
                            {item.newStock.toLocaleString()}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4 text-center">
                          {item.isValid ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                              <Check className="w-3 h-3" /> พร้อมรับ
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                              <X className="w-3 h-3" /> ไม่พบสินค้า
                            </span>
                          )}
                        </td>

                        {/* Remove Action */}
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleRemoveRow(item.id)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                            title="ลบแถวนี้"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}

                  {filteredItems.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400 text-sm">
                        ไม่พบรายการที่ตรงตามเงื่อนไข
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sticky Bottom Action Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4 sticky bottom-4 z-20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#7B6A55]/10 text-[#7B6A55] flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase">สาขาปลายทาง</p>
                <p className="text-sm font-black text-slate-800">
                  {selectedBranch?.branch_name || "ไม่ได้เลือกสาขา"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <button
                onClick={handleReset}
                disabled={isPending}
                className="px-4 py-2.5 text-slate-600 hover:text-slate-800 font-bold text-sm rounded-xl hover:bg-slate-100 transition"
              >
                ยกเลิก
              </button>

              <button
                onClick={() => setShowConfirmModal(true)}
                disabled={summary.valid === 0 || isPending}
                className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-8 py-3 bg-[#7B6A55] hover:bg-[#685844] disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl font-bold text-sm shadow-lg shadow-[#7B6A55]/20 transition-all active:scale-95"
              >
                {isPending ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin" />
                    <span>กำลังบันทึกสต็อก...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      ยืนยันรับเข้าสต็อก ({summary.valid} รายการ / +{summary.totalInboundQty.toLocaleString()} ชิ้น)
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Confirmation Dialog Modal --- */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-4">
              <Package className="w-7 h-7" />
            </div>

            <h3 className="text-xl font-black text-slate-800 text-center">
              ยืนยันการรับสินค้าเข้าสต็อก?
            </h3>
            <p className="text-xs text-slate-500 text-center mt-1">
              ระบบจะเพิ่มจำนวนสินค้าเข้าคลัง และบันทึกประวัติการรับเข้าทันที
            </p>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 my-5 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold">สาขาที่รับเข้า:</span>
                <span className="font-bold text-slate-800">{selectedBranch?.branch_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold">รายการสินค้าที่พร้อมรับ:</span>
                <span className="font-bold text-emerald-600">{summary.valid} รายการ</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold">สต็อกที่เพิ่มรวม:</span>
                <span className="font-bold text-emerald-600">+{summary.totalInboundQty.toLocaleString()} ชิ้น</span>
              </div>
              {summary.invalid > 0 && (
                <div className="flex justify-between text-red-500">
                  <span className="font-bold">รายการที่จะถูกข้าม (ไม่พบรหัส):</span>
                  <span className="font-bold">{summary.invalid} รายการ</span>
                </div>
              )}
              {note && (
                <div className="pt-2 border-t border-slate-200">
                  <span className="text-slate-400 font-bold block mb-0.5">หมายเหตุ:</span>
                  <span className="text-slate-700 italic">{note}</span>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                disabled={isPending}
                className="flex-1 py-3 text-slate-600 hover:bg-slate-100 rounded-xl font-bold text-sm transition"
              >
                ย้อนกลับ
              </button>
              <button
                onClick={handleConfirmSubmit}
                disabled={isPending}
                className="flex-1 py-3 bg-[#7B6A55] hover:bg-[#685844] text-white rounded-xl font-bold text-sm shadow-lg shadow-[#7B6A55]/20 transition active:scale-95 flex items-center justify-center gap-2"
              >
                {isPending ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin" />
                    <span>กำลังบันทึก...</span>
                  </>
                ) : (
                  <span>ยืนยันรับเข้า</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Image Zoom Modal --- */}
      {zoomedImage && (
        <div
          onClick={() => setZoomedImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl overflow-hidden max-w-lg w-full shadow-2xl relative"
          >
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h4 className="font-bold text-sm text-slate-800 truncate pr-4">{zoomedImage.name}</h4>
              <button
                onClick={() => setZoomedImage(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 bg-slate-50 flex items-center justify-center">
              <img
                src={zoomedImage.url}
                alt={zoomedImage.name}
                className="max-h-[70vh] object-contain rounded-xl"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
