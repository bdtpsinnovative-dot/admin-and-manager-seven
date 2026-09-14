"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import Image from "next/image"
import { QRCodeSVG } from "qrcode.react"
import {
  getSimpleStockComparison,
  submitSimpleAuditToAdmin,
  clearSimpleCounts,
  getAuditBranchesAndUser,
  getStockAudits,
  type SimpleStockCompareItem,
  type SimpleStockCompareResult,
  type StockAudit,
  type TagItemDetail
} from "@/actions/stock-audit"
import {
  ClipboardCheck,
  Radio,
  ScanLine,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Send,
  Loader2,
  RefreshCw,
  Trash2,
  Search,
  Filter,
  Package,
  Building2,
  Lock,
  ArrowRight,
  Sparkles,
  History,
  Check,
  Tag,
  Copy,
  CheckCheck,
  X,
  Boxes,
  RotateCcw,
  QrCode
} from "lucide-react"

export default function ManagerStockAuditPage() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [data, setData] = useState<SimpleStockCompareResult | null>(null)
  
  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState<"ALL" | "COUNTED" | "MISMATCH" | "MATCH">("ALL")

  // Branches & User
  const [branches, setBranches] = useState<{ id: number; branch_name: string; branch_code: string }[]>([])
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null)
  const [userBranchName, setUserBranchName] = useState("")
  const [userRole, setUserRole] = useState("")
  const [isBranchLocked, setIsBranchLocked] = useState(true)

  // Active View Tab: "COMPARE" (เทียบยอดสด 2 ทาง) | "HISTORY" (ประวัติที่เคยส่ง)
  const [viewTab, setViewTab] = useState<"COMPARE" | "HISTORY">("COMPARE")
  const [historyAudits, setHistoryAudits] = useState<StockAudit[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  // Submit Modal
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [submitNotes, setSubmitNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null)

  // Clear Confirmation State
  const [clearTarget, setClearTarget] = useState<"rfid" | "manual" | "all" | null>(null)
  const [clearing, setClearing] = useState(false)
  const [clearNotice, setClearNotice] = useState<string | null>(null)

  // RFID Tag & QR Modal
  const [selectedTagModalItem, setSelectedTagModalItem] = useState<SimpleStockCompareItem | null>(null)
  const [activeQrValue, setActiveQrValue] = useState<string>("")
  const [qrType, setQrType] = useState<"TAG" | "BARCODE">("TAG")
  const [tagModalFilter, setTagModalFilter] = useState<"ALL" | "MISSING" | "FOUND">("ALL")
  const [copiedTag, setCopiedTag] = useState<string | null>(null)
  const [copiedAll, setCopiedAll] = useState(false)

  // Open Tag / QR Modal Handler
  const openTagModal = (item: SimpleStockCompareItem, defaultTag?: string, initialFilter: "ALL" | "MISSING" | "FOUND" = "ALL") => {
    setSelectedTagModalItem(item)
    setTagModalFilter(initialFilter)
    if (defaultTag) {
      setActiveQrValue(defaultTag)
      setQrType("TAG")
    } else if (item.tagDetails && item.tagDetails.length > 0) {
      if (initialFilter === "MISSING") {
        const firstMissing = item.tagDetails.find(t => !t.isScanned)
        setActiveQrValue(firstMissing ? firstMissing.epc : item.tagDetails[0].epc)
      } else if (initialFilter === "FOUND") {
        const firstFound = item.tagDetails.find(t => t.isScanned)
        setActiveQrValue(firstFound ? firstFound.epc : item.tagDetails[0].epc)
      } else {
        const firstMissing = item.tagDetails.find(t => !t.isScanned)
        setActiveQrValue(firstMissing ? firstMissing.epc : item.tagDetails[0].epc)
      }
      setQrType("TAG")
    } else if (item.rfidTags && item.rfidTags.length > 0) {
      setActiveQrValue(item.rfidTags[0])
      setQrType("TAG")
    } else {
      const code = (item.barcode && item.barcode !== "-") ? item.barcode : item.sku
      setActiveQrValue(code)
      setQrType("BARCODE")
    }
  }

  // Load Comparison Data
  const loadData = useCallback(async (isSilent = false) => {
    if (!selectedBranchId) return
    if (!isSilent) setLoading(true)
    else setRefreshing(true)

    const res = await getSimpleStockComparison(selectedBranchId)
    if (res.data) {
      setData(res.data)
    }
    setLoading(false)
    setRefreshing(false)
  }, [selectedBranchId])

  // Load Past History
  const loadHistory = useCallback(async () => {
    if (!selectedBranchId) return
    setLoadingHistory(true)
    const res = await getStockAudits(selectedBranchId)
    if (res.data) {
      setHistoryAudits(res.data)
    }
    setLoadingHistory(false)
  }, [selectedBranchId])

  // Initial Load
  useEffect(() => {
    const init = async () => {
      const info = await getAuditBranchesAndUser()
      setBranches(info.branches || [])
      const branchId = info.userBranchId || 14
      setSelectedBranchId(branchId)
      if (info.userBranchName) setUserBranchName(info.userBranchName)
      if (info.userRole) setUserRole(info.userRole)
      setIsBranchLocked(info.isLocked ?? (info.userRole !== "admin"))
    }
    init()
  }, [])

  useEffect(() => {
    if (!selectedBranchId) return
    if (viewTab === "COMPARE") {
      loadData()
    } else {
      loadHistory()
    }
  }, [selectedBranchId, viewTab, loadData, loadHistory])

  // Submit Handler
  const handleSubmitToAdmin = async () => {
    if (!data || !data.summary.allMatch || !selectedBranchId) return
    setSubmitting(true)
    const res = await submitSimpleAuditToAdmin({
      branchId: selectedBranchId,
      notes: submitNotes.trim()
    })
    setSubmitting(false)

    if (res.success) {
      setSubmitSuccess(res.auditCode || "ส่งเรื่องสำเร็จ")
      setShowSubmitModal(false)
      setSubmitNotes("")
      loadData()
    } else {
      alert(res.error || "เกิดข้อผิดพลาดในการส่งเรื่อง")
    }
  }

  // Clear Handler
  const handleConfirmClear = async () => {
    if (!clearTarget || !selectedBranchId) return
    setClearing(true)
    await clearSimpleCounts(selectedBranchId, clearTarget)
    setClearing(false)
    
    const label = clearTarget === "rfid" ? "ยอดนับ RFID" : clearTarget === "manual" ? "ยอดนับ แมนนวล" : "ยอดนับทั้งหมด"
    setClearNotice(`ล้าง${label}เรียบร้อยแล้ว`)
    setTimeout(() => setClearNotice(null), 3000)

    setClearTarget(null)
    loadData()
  }

  // Copy Tag Handler
  const handleCopyTag = (tag: string) => {
    navigator.clipboard.writeText(tag)
    setCopiedTag(tag)
    setTimeout(() => setCopiedTag(null), 1500)
  }

  const handleCopyAllTags = (tags: string[]) => {
    navigator.clipboard.writeText(tags.join("\n"))
    setCopiedAll(true)
    setTimeout(() => setCopiedAll(false), 2000)
  }

  // Filter items
  const filteredItems = (data?.items || []).filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.barcode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.rfidTags && item.rfidTags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())))

    if (!matchesSearch) return false
    if (filterType === "COUNTED") return item.rfidQty > 0 || item.manualQty > 0
    if (filterType === "MISMATCH") return !item.isMatch
    if (filterType === "MATCH") return item.isMatch
    return true
  })

  const countedCount = (data?.items || []).filter(i => i.rfidQty > 0 || i.manualQty > 0).length

  const summary = data?.summary || {
    totalItems: 0,
    totalSystem: 0,
    totalRfid: 0,
    totalManual: 0,
    matchCount: 0,
    mismatchCount: 0,
    allMatch: false
  }

  return (
    <div className="min-h-screen bg-slate-50/60 p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* 🌟 Header Section */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <Link href="/manager/dashboard" className="hover:text-purple-600 transition-colors">ผู้จัดการ</Link>
              <span>/</span>
              <span className="font-semibold text-slate-700">ตรวจนับสต็อก 2 ทาง</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 flex items-center gap-2.5">
              <ClipboardCheck className="w-7 h-7 text-purple-600" />
              เทียบยอดนับสต็อก 2 ทาง: RFID vs แมนนวล
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              แสดงยอดสต็อกเดิมในระบบ • ยอดกวาด RFID • ยอดนับแมนนวล • ทั้ง 2 ยอดนับต้องตรงกัน 100% จึงจะส่งปรับยอดได้
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* สาขา: ถ้าเป็น Manager ให้ล็อคสาขาตัวเองเสมอ ไม่ต้องแสดง dropdown ให้เลือก */}
            {isBranchLocked ? (
              <div className="flex items-center gap-2 bg-purple-50/90 border border-purple-200/80 px-3.5 py-2 rounded-xl text-xs font-bold text-purple-900 shadow-2xs">
                <Building2 className="w-4 h-4 text-purple-600 shrink-0" />
                <span>สาขา: {userBranchName || branches.find(b => b.id === selectedBranchId)?.branch_name || "Showroom Terra Sukhumvit 26"}</span>
                <span className="inline-flex items-center gap-1 text-[10px] bg-purple-200/70 text-purple-800 px-1.5 py-0.5 rounded font-mono">
                  <Lock className="w-3 h-3 text-purple-700" /> ล็อคสาขา
                </span>
              </div>
            ) : branches.length > 1 ? (
              <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-2 rounded-xl text-xs font-bold text-slate-700">
                <Building2 className="w-4 h-4 text-slate-500" />
                <select
                  value={selectedBranchId || 14}
                  onChange={(e) => setSelectedBranchId(Number(e.target.value))}
                  className="bg-transparent border-none outline-none font-bold text-slate-800 cursor-pointer"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.branch_name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            {/* ปุ่มเปลี่ยน Tab ระหว่าง เทียบยอดสด vs ประวัติ */}
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setViewTab("COMPARE")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewTab === "COMPARE" ? "bg-white text-purple-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                เทียบยอดสด
              </button>
              <button
                onClick={() => setViewTab("HISTORY")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  viewTab === "HISTORY" ? "bg-white text-purple-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <History className="w-3.5 h-3.5" />
                ประวัติที่ส่งแล้ว
              </button>
            </div>

            {/* รีเฟรช */}
            <button
              onClick={() => (viewTab === "COMPARE" ? loadData(true) : loadHistory())}
              disabled={refreshing || loading}
              className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-600 transition-colors shadow-xs cursor-pointer"
              title="รีเฟรชข้อมูลล่าสุด"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-purple-600" : ""}`} />
            </button>
          </div>
        </div>

        {/* แจ้งเตือนเมื่อส่งสำเร็จ */}
        {submitSuccess && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-5 py-4 rounded-2xl flex items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
              <div>
                <strong className="font-bold text-sm block">ส่งเรื่องขออนุมัติปรับสต็อกเรียบร้อยแล้ว!</strong>
                <span className="text-xs text-emerald-700">
                  รหัสเอกสาร: <span className="font-mono font-bold">{submitSuccess}</span> รอดำเนินการอนุมัติจากแอดมิน
                </span>
              </div>
            </div>
            <button
              onClick={() => setSubmitSuccess(null)}
              className="text-xs text-emerald-700 hover:underline font-bold cursor-pointer"
            >
              ปิด
            </button>
          </div>
        )}

        {/* แจ้งเตือนเมื่อล้างยอดสำเร็จ */}
        {clearNotice && (
          <div className="bg-blue-50 border border-blue-200 text-blue-800 px-5 py-3 rounded-2xl flex items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-2.5 text-xs font-bold">
              <RotateCcw className="w-4 h-4 text-blue-600" />
              <span>{clearNotice}</span>
            </div>
            <button
              onClick={() => setClearNotice(null)}
              className="text-xs text-blue-600 hover:underline font-bold cursor-pointer"
            >
              ปิด
            </button>
          </div>
        )}

        {viewTab === "COMPARE" ? (
          <>
            {/* 📊 Summary Cards (5 การ์ดสรุปชัดเจน พร้อมปุ่มล้างด่วนประจำการ์ด) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
              {/* 1. สต็อกในระบบเดิม */}
              <div className="bg-white p-4.5 rounded-3xl border border-slate-200 shadow-xs relative overflow-hidden">
                <div className="flex items-center justify-between text-slate-600 mb-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Boxes className="w-4 h-4 text-slate-500" /> 1. สต็อกเดิมในระบบ
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-slate-800 font-mono">
                  {(summary.totalSystem || 0).toLocaleString()}
                </div>
                <span className="text-[11px] text-slate-400 mt-0.5 block">ชิ้นที่บันทึกในระบบ</span>
              </div>

              {/* 2. ยอด RFID (มีปุ่มล้างยอด RFID ในการ์ด) */}
              <div className="bg-white p-4.5 rounded-3xl border border-purple-200/80 shadow-xs relative overflow-hidden group">
                <div className="flex items-center justify-between text-purple-700 mb-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Radio className="w-4 h-4" /> 2. ยอดนับ RFID
                  </span>
                  <button
                    onClick={() => setClearTarget("rfid")}
                    className="p-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-600 transition-colors cursor-pointer"
                    title="ล้างยอดนับ RFID"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-purple-700 font-mono">
                  {summary.totalRfid.toLocaleString()}
                </div>
                <span className="text-[11px] text-slate-400 mt-0.5 block">ชิ้นที่กวาดสแกนได้</span>
              </div>

              {/* 3. ยอด แมนนวล (มีปุ่มล้างยอด แมนนวล ในการ์ด) */}
              <div className="bg-white p-4.5 rounded-3xl border border-blue-200/80 shadow-xs relative overflow-hidden group">
                <div className="flex items-center justify-between text-blue-700 mb-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <ScanLine className="w-4 h-4" /> 3. ยอดนับ แมนนวล
                  </span>
                  <button
                    onClick={() => setClearTarget("manual")}
                    className="p-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors cursor-pointer"
                    title="ล้างยอดนับ แมนนวล"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-blue-700 font-mono">
                  {summary.totalManual.toLocaleString()}
                </div>
                <span className="text-[11px] text-slate-400 mt-0.5 block">ชิ้นที่นับมือ/บาร์โค้ด</span>
              </div>

              {/* 4. รายการที่ตรงกัน */}
              <div className="bg-white p-4.5 rounded-3xl border border-emerald-100 shadow-xs relative overflow-hidden">
                <div className="flex items-center justify-between text-emerald-700 mb-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> 4. ตรงกันแล้ว
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-emerald-600 font-mono">
                  {summary.matchCount.toLocaleString()}
                </div>
                <span className="text-[11px] text-slate-400 mt-0.5 block">รายการที่ 100% เท่ากัน</span>
              </div>

              {/* 5. รายการที่ยังไม่ตรงกัน */}
              <div className={`p-4.5 rounded-3xl border shadow-xs relative overflow-hidden ${
                summary.mismatchCount > 0
                  ? "bg-rose-50/60 border-rose-200 text-rose-700"
                  : "bg-white border-slate-200 text-slate-700"
              }`}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" /> 5. ยังไม่ตรงกัน
                  </span>
                </div>
                <div className={`text-2xl sm:text-3xl font-black font-mono ${summary.mismatchCount > 0 ? "text-rose-600" : "text-slate-400"}`}>
                  {summary.mismatchCount.toLocaleString()}
                </div>
                <span className="text-[11px] text-slate-500 mt-0.5 block">
                  {summary.mismatchCount > 0 ? "ต้องตรวจนับให้ตรงก่อน" : "ตรงกันครบทุกตัว!"}
                </span>
              </div>
            </div>

            {/* 🧭 Control Bar (Search, Filter, Dedicated Clear Buttons & Submit) */}
            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              {/* Search Box */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อสินค้า, SKU, Barcode, รหัสแท็ก RFID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-500 focus:bg-white transition-all"
                />
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
                <button
                  onClick={() => setFilterType("ALL")}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    filterType === "ALL" ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  ทั้งหมด ({summary.totalItems})
                </button>
                <button
                  onClick={() => setFilterType("COUNTED")}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                    filterType === "COUNTED"
                      ? "bg-purple-600 text-white"
                      : "bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200"
                  }`}
                >
                  <Radio className="w-3.5 h-3.5" />
                  ที่มีการนับ ({countedCount})
                </button>
                <button
                  onClick={() => setFilterType("MISMATCH")}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                    filterType === "MISMATCH"
                      ? "bg-rose-600 text-white"
                      : "bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  ยังไม่ตรง ({summary.mismatchCount})
                </button>
                <button
                  onClick={() => setFilterType("MATCH")}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                    filterType === "MATCH"
                      ? "bg-emerald-600 text-white"
                      : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  ตรงกันแล้ว ({summary.matchCount})
                </button>
              </div>

              {/* 🔘 ปุ่มล้างข้อมูลแบบชัดเจน 2 ปุ่มแยกกัน (RFID / แมนนวล) */}
              <div className="flex items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 flex-wrap">
                {/* 1. ล้างยอด RFID */}
                <button
                  onClick={() => setClearTarget("rfid")}
                  className="px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  title="ล้างยอดนับ RFID ทั้งหมด"
                >
                  <Radio className="w-3.5 h-3.5 text-purple-600" />
                  ล้าง RFID
                </button>

                {/* 2. ล้างยอด แมนนวล */}
                <button
                  onClick={() => setClearTarget("manual")}
                  className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  title="ล้างยอดนับแมนนวลทั้งหมด"
                >
                  <ScanLine className="w-3.5 h-3.5 text-blue-600" />
                  ล้างแมนนวล
                </button>

                {/* ปุ่มส่งปรับยอดให้แอดมิน (ล็อคถ้าไม่ตรงกัน 100%) */}
                {summary.allMatch ? (
                  <button
                    onClick={() => setShowSubmitModal(true)}
                    className="px-4.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/20 flex items-center gap-1.5 cursor-pointer animate-pulse"
                  >
                    <Send className="w-3.5 h-3.5" />
                    ส่งปรับยอดแอดมิน
                  </button>
                ) : (
                  <button
                    disabled
                    className="px-4.5 py-2 bg-slate-200 text-slate-400 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-not-allowed opacity-80"
                    title="ทั้ง 2 ยอดต้องตรงกันทุกรายการ จึงจะสามารถส่งปรับยอดได้"
                  >
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    ส่งปรับยอด (ยังไม่ตรง {summary.mismatchCount})
                  </button>
                )}
              </div>
            </div>

            {/* 📋 Comparison Table (สินค้าเดียวกัน แถวเดียวกัน พร้อมสต็อกเดิมในระบบ) */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
              {loading ? (
                <div className="p-16 text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto" />
                  <span className="text-xs text-slate-500 mt-3 block font-medium">กำลังโหลดข้อมูลเปรียบเทียบ...</span>
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="p-16 text-center">
                  <Package className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-600 text-sm font-bold">ไม่พบรายการที่สแกนหรือค้นหา</p>
                  <p className="text-slate-400 text-xs mt-1">ใช้ PDA เมนู 7 (นับสต็อก) และ เมนู 3 (นับตั้งต้น) เดินสแกนสินค้าเข้ามาได้เลย</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        <th className="py-3.5 px-3 w-10 text-center">#</th>
                        <th className="py-3.5 px-4">สินค้า</th>
                        <th className="py-3.5 px-4 text-center w-28 bg-slate-100/70 text-slate-700 border-x border-slate-200/60">
                          <span className="flex items-center justify-center gap-1">
                            <Boxes className="w-3.5 h-3.5 text-slate-500" /> ยอดในระบบ
                          </span>
                        </th>
                        <th className="py-3.5 px-4 text-center w-28 bg-purple-50/40 text-purple-900 border-r border-purple-100/50">
                          <span className="flex items-center justify-center gap-1">
                            <Tag className="w-3.5 h-3.5 text-purple-600" /> แท็กที่สาขา
                          </span>
                        </th>
                        <th className="py-3.5 px-4 text-center w-28 bg-purple-50/30 text-purple-900 border-r border-purple-100/50">
                          <span className="flex items-center justify-center gap-1.5">
                            <Radio className="w-3.5 h-3.5 text-purple-600" /> ยอด RFID
                          </span>
                        </th>
                        <th className="py-3.5 px-4 text-center w-28 bg-blue-50/30 text-blue-900 border-r border-blue-100/50">
                          <span className="flex items-center justify-center gap-1.5">
                            <ScanLine className="w-3.5 h-3.5 text-blue-600" /> ยอด แมนนวล
                          </span>
                        </th>
                        <th className="py-3.5 px-3 text-center w-28">ผลต่าง 2 ทาง</th>
                        <th className="py-3.5 px-3 text-center w-28">เทียบระบบ</th>
                        <th className="py-3.5 px-4 text-center w-32">สถานะ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {filteredItems.map((item, idx) => {
                        const isMatch = item.isMatch
                        const diff = item.diff
                        const sysDiff = item.systemDiff || 0
                        const tags = item.rfidTags || []
                        const details = item.tagDetails || []
                        const branchTagCount = details.length || tags.length || 0

                        return (
                          <tr
                            key={item.productId}
                            className={`transition-colors ${
                              !isMatch ? "bg-rose-50/30 hover:bg-rose-50/60" : "hover:bg-slate-50/60"
                            }`}
                          >
                            <td className="py-3.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                              {idx + 1}
                            </td>
                            
                            {/* สินค้า (รูปภาพ + ชื่อ + SKU + Barcode สะอาดตา) */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-start gap-3">
                                {item.imageUrl ? (
                                  <div className="w-11 h-11 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 relative mt-0.5">
                                    <Image
                                      src={item.imageUrl}
                                      alt={item.name}
                                      fill
                                      className="object-cover"
                                      unoptimized
                                    />
                                  </div>
                                ) : (
                                  <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 shrink-0 mt-0.5">
                                    <Package className="w-5 h-5" />
                                  </div>
                                )}
                                <div className="space-y-0.5 min-w-0">
                                  <div className="font-bold text-slate-800 line-clamp-1">{item.name}</div>
                                  <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2">
                                    <span>SKU: {item.sku}</span>
                                    {item.barcode && item.barcode !== "-" && (
                                      <>
                                        <span>•</span>
                                        <span>Barcode: {item.barcode}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* 📦 1. สต็อกเดิมในระบบ (ยอดที่มีจริงในระบบปัจจุบัน) */}
                            <td className="py-3.5 px-4 text-center font-mono font-bold text-sm bg-slate-50/90 text-slate-800 border-x border-slate-200/60">
                              <span>{(item.systemQty || 0).toLocaleString()}</span>
                              <span className="text-[10px] text-slate-400 block font-sans">ชิ้นเดิม</span>
                            </td>

                            {/* 🏷️ 2. จำนวนแท็กที่สาขา (แสดงเฉพาะตัวเลขจำนวนแท็กที่มีตามที่ต้องการ) */}
                            <td className="py-3.5 px-4 text-center font-mono font-bold text-sm bg-purple-50/20 text-purple-800 border-r border-purple-100/40">
                              <div className="flex flex-col items-center justify-center">
                                <button
                                  onClick={() => openTagModal(item)}
                                  className="cursor-pointer group flex flex-col items-center"
                                  title="คลิกเพื่อดูรหัสแท็กและ QR Code"
                                >
                                  <span className="text-sm font-black text-purple-700 group-hover:underline">
                                    {branchTagCount.toLocaleString()}
                                  </span>
                                  <span className="text-[10px] text-purple-400 group-hover:text-purple-600 font-sans flex items-center gap-0.5">
                                    แท็ก <QrCode className="w-2.5 h-2.5 opacity-60" />
                                  </span>
                                </button>
                              </div>
                            </td>

                            {/* 🟣 3. ยอด RFID */}
                            <td className="py-3.5 px-4 text-center font-mono font-black text-sm bg-purple-50/30 text-purple-700 border-r border-purple-100/50">
                              <div className="flex flex-col items-center justify-center">
                                <span>{item.rfidQty.toLocaleString()}</span>
                                <span className="text-[10px] text-purple-600 font-sans mt-0.5">ชิ้นที่อ่านได้</span>
                              </div>
                            </td>

                            {/* 🔵 4. ยอด แมนนวล */}
                            <td className="py-3.5 px-4 text-center font-mono font-black text-sm bg-blue-50/30 text-blue-700 border-r border-blue-100/50">
                              <div className="flex flex-col items-center justify-center">
                                <span>{item.manualQty.toLocaleString()}</span>
                                <span className="text-[10px] text-blue-400 block font-sans">นับมือ/โค้ด</span>
                              </div>
                            </td>

                            {/* ผลต่าง 2 ทาง (RFID vs แมนนวล) */}
                            <td className="py-3.5 px-3 text-center font-mono font-bold">
                              {diff === 0 ? (
                                <span className="text-slate-400">0</span>
                              ) : diff > 0 ? (
                                <span className="text-purple-600">+{diff}</span>
                              ) : (
                                <span className="text-rose-600">{diff}</span>
                              )}
                            </td>

                            {/* เทียบกับระบบ (ผลต่างจากสต็อกเดิม) */}
                            <td className="py-3.5 px-3 text-center font-mono font-bold text-[11px]">
                              {sysDiff === 0 ? (
                                <span className="text-slate-400">เท่าเดิม</span>
                              ) : sysDiff > 0 ? (
                                <span className="text-emerald-600 font-black">+{sysDiff}</span>
                              ) : (
                                <span className="text-rose-600 font-black">{sysDiff}</span>
                              )}
                            </td>

                            {/* สถานะความถูกต้อง 2 ทาง */}
                            <td className="py-3.5 px-4 text-center">
                              {isMatch ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                                  <Check className="w-3 h-3" /> ตรงกัน
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                                  <AlertTriangle className="w-3 h-3" /> ต่าง {Math.abs(diff)} ตัว
                                </span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        ) : (
          /* 📜 History Tab */
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6">
            <h2 className="text-base font-black text-slate-800 mb-4 flex items-center gap-2">
              <History className="w-5 h-5 text-purple-600" />
              ประวัติรอบตรวจนับที่เคยส่งให้แอดมิน
            </h2>

            {loadingHistory ? (
              <div className="p-12 text-center">
                <Loader2 className="w-6 h-6 animate-spin text-purple-600 mx-auto" />
                <span className="text-xs text-slate-400 mt-2 block">กำลังโหลดประวัติ...</span>
              </div>
            ) : historyAudits.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                ยังไม่มีประวัติการส่งปรับยอด
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {historyAudits.map((a) => (
                  <div key={a.id} className="py-4 flex items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-800">{a.audit_code}</span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          a.status === "APPROVED"
                            ? "bg-emerald-100 text-emerald-800"
                            : a.status === "REJECTED"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-amber-100 text-amber-800"
                        }`}>
                          {a.status === "APPROVED" ? "อนุมัติแล้ว" : a.status === "REJECTED" ? "ไม่อนุมัติ" : "รอแอดมินอนุมัติ"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">{a.title}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        ส่งเมื่อ: {new Date(a.submitted_at || a.created_at).toLocaleString("th-TH")}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-mono font-bold text-slate-800">
                        {a.total_final_qty || a.total_rfid_qty || 0} ชิ้น
                      </span>
                      <span className="text-[10px] text-slate-400 block">ยอดตรวจนับสุทธิ</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* 🏷️ Modal แสดงรหัสแท็ก RFID ทั้งหมดของสินค้า พร้อม QR Code สำหรับสแกน (ดีไซน์ใหม่ 2 คอลัมน์ กว้าง ไม่เบียด แยกสีแดง=ยังไม่เจอ เขียว=เจอแล้ว) */}
      {selectedTagModalItem && (() => {
        const item = selectedTagModalItem
        const allDetails: TagItemDetail[] = item.tagDetails && item.tagDetails.length > 0
          ? item.tagDetails
          : (item.rfidTags || []).map(epc => ({ epc, isScanned: false }))

        const totalCount = allDetails.length
        const missingList = allDetails.filter(t => !t.isScanned)
        const foundList = allDetails.filter(t => t.isScanned)

        const filteredList = tagModalFilter === "MISSING"
          ? missingList
          : tagModalFilter === "FOUND"
          ? foundList
          : allDetails

        const currentTagDetail = allDetails.find(t => t.epc === activeQrValue)
        const isCurrentTagScanned = currentTagDetail ? currentTagDetail.isScanned : false

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-4xl rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 max-h-[92vh] flex flex-col">
              {/* Header */}
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3.5 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  {item.imageUrl ? (
                    <div className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 relative">
                      <Image
                        src={item.imageUrl}
                        alt={item.name}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600 shrink-0">
                      <Package className="w-6 h-6" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <h3 className="text-base font-black text-slate-800 truncate">
                      {item.name}
                    </h3>
                    <div className="text-xs text-slate-400 font-mono flex flex-wrap items-center gap-2 mt-0.5">
                      <span>SKU: <strong className="text-slate-600">{item.sku}</strong></span>
                      {item.barcode && item.barcode !== "-" && (
                        <>
                          <span>•</span>
                          <span>Barcode: <strong className="text-slate-600">{item.barcode}</strong></span>
                        </>
                      )}
                    </div>
                    {/* Badges สรุปสถานะแท็ก */}
                    <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs">
                      <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 font-bold rounded-lg text-[11px] border border-slate-200">
                        แท็กทั้งหมด: {totalCount} ตัว
                      </span>
                      <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 font-bold rounded-lg text-[11px] border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> สแกนเจอแล้ว: {foundList.length} ตัว
                      </span>
                      {missingList.length > 0 ? (
                        <span className="px-2.5 py-0.5 bg-rose-50 text-rose-700 font-bold rounded-lg text-[11px] border border-rose-200 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse"></span>
                          🔴 ยังไม่เจอ: {missingList.length} ตัว
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-lg text-[11px]">
                          สแกนครบ 100%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedTagModalItem(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                  title="ปิดหน้าต่าง"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body: 2 Columns */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 min-h-0">
                {/* คอลัมน์ซ้าย: รายการแท็ก RFID (7/12) */}
                <div className="lg:col-span-7 flex flex-col min-h-0">
                  {/* แถบตัวกรองสถานะแท็ก */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5 shrink-0">
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                      <button
                        onClick={() => setTagModalFilter("ALL")}
                        className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                          tagModalFilter === "ALL"
                            ? "bg-white text-slate-800 shadow-xs font-black"
                            : "text-slate-500 hover:text-slate-700"
                        }`}
                      >
                        ทั้งหมด ({totalCount})
                      </button>
                      <button
                        onClick={() => {
                          setTagModalFilter("MISSING")
                          if (missingList.length > 0) {
                            setActiveQrValue(missingList[0].epc)
                            setQrType("TAG")
                          }
                        }}
                        className={`px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                          tagModalFilter === "MISSING"
                            ? "bg-rose-600 text-white shadow-xs font-black"
                            : "text-rose-600 hover:bg-rose-50"
                        }`}
                      >
                        <span>🔴 ยังไม่เจอ ({missingList.length})</span>
                      </button>
                      <button
                        onClick={() => {
                          setTagModalFilter("FOUND")
                          if (foundList.length > 0) {
                            setActiveQrValue(foundList[0].epc)
                            setQrType("TAG")
                          }
                        }}
                        className={`px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                          tagModalFilter === "FOUND"
                            ? "bg-emerald-600 text-white shadow-xs font-black"
                            : "text-emerald-600 hover:bg-emerald-50"
                        }`}
                      >
                        <span>🟢 เจอแล้ว ({foundList.length})</span>
                      </button>
                    </div>

                    {/* ปุ่มคัดลอกรายการที่เลือก */}
                    {filteredList.length > 0 && (
                      <button
                        onClick={() => handleCopyAllTags(filteredList.map(t => t.epc))}
                        className="text-xs font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-purple-50 transition-colors cursor-pointer shrink-0"
                        title="คัดลอกรหัสแท็กทั้งหมดในรายการที่กำลังแสดง"
                      >
                        {copiedAll ? <CheckCheck className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedAll ? "คัดลอกแล้ว" : "คัดลอกรายการนี้"}</span>
                      </button>
                    )}
                  </div>

                  {/* คำอธิบายสั้นๆ */}
                  <div className="text-[11px] text-slate-400 mb-1.5 flex items-center justify-between shrink-0">
                    <span>คลิกที่รายการเพื่อดู QR Code สแกนได้ทันที</span>
                    <span className="font-mono text-slate-500">แสดง {filteredList.length} จาก {totalCount} แท็ก</span>
                  </div>

                  {/* กล่อง Scroll รายการแท็ก */}
                  <div className="flex-1 overflow-y-auto space-y-1.5 pr-1.5 max-h-[360px] min-h-[180px]">
                    {filteredList.length === 0 ? (
                      <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        {tagModalFilter === "MISSING" ? (
                          <div className="space-y-1">
                            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                            <p className="text-xs font-bold text-slate-700">🎉 สแกนครบถ้วนทุกแท็กแล้ว!</p>
                            <p className="text-[11px] text-slate-400">ไม่พบแท็กที่ยังขาด สินค้านี้มีแท็กครบตามระบบ</p>
                          </div>
                        ) : tagModalFilter === "FOUND" ? (
                          <div className="space-y-1">
                            <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto" />
                            <p className="text-xs font-bold text-slate-700">ยังไม่มีแท็กที่สแกนเจอ</p>
                            <p className="text-[11px] text-slate-400">ใช้เครื่อง PDA กวาดสแกน RFID หรือสแกน QR เพื่อบันทึก</p>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400">ไม่มีข้อมูลแท็ก RFID สำหรับสินค้านี้</p>
                        )}
                      </div>
                    ) : (
                      filteredList.map((tagObj, idx) => {
                        const isSelected = qrType === "TAG" && activeQrValue === tagObj.epc
                        return (
                          <div
                            key={tagObj.epc || idx}
                            onClick={() => {
                              setActiveQrValue(tagObj.epc)
                              setQrType("TAG")
                            }}
                            className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                              isSelected
                                ? "bg-purple-50/90 border-purple-400 ring-2 ring-purple-200 shadow-xs"
                                : tagObj.isScanned
                                ? "bg-white hover:bg-slate-50 border-slate-200"
                                : "bg-rose-50/40 hover:bg-rose-50/80 border-rose-200"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              {/* สถานะแท็ก: ยังไม่เจอ (แดง) vs สแกนเจอแล้ว (เขียว) */}
                              {tagObj.isScanned ? (
                                <span className="shrink-0 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-[10px] flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                                  เจอแล้ว
                                </span>
                              ) : (
                                <span className="shrink-0 px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-200 font-bold text-[10px] flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
                                  ยังไม่เจอ
                                </span>
                              )}

                              {/* รหัส EPC */}
                              <span className="font-mono text-xs font-bold text-slate-800 truncate select-all">
                                {tagObj.epc}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0 ml-2">
                              {isSelected ? (
                                <span className="px-2 py-0.5 rounded-md bg-purple-600 text-white font-bold text-[10px] flex items-center gap-1 shadow-xs">
                                  <QrCode className="w-3 h-3" /> QR แสดงอยู่
                                </span>
                              ) : (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setActiveQrValue(tagObj.epc)
                                    setQrType("TAG")
                                  }}
                                  className="px-2 py-0.5 rounded-md bg-white hover:bg-purple-50 text-purple-700 border border-purple-200 font-bold text-[10px] flex items-center gap-1 transition-colors cursor-pointer"
                                >
                                  <QrCode className="w-3 h-3" /> แสดง QR
                                </button>
                              )}

                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleCopyTag(tagObj.epc)
                                }}
                                className="p-1 text-slate-400 hover:text-purple-600 transition-colors cursor-pointer"
                                title="คัดลอกรหัสนี้"
                              >
                                {copiedTag === tagObj.epc ? (
                                  <Check className="w-4 h-4 text-emerald-600" />
                                ) : (
                                  <Copy className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>

                {/* คอลัมน์ขวา: กล่องแสดง QR Code คมชัด พอดีกรอบ ไม่เบียด (5/12) */}
                <div className="lg:col-span-5 bg-slate-50/80 rounded-2xl border border-slate-200/80 p-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    {/* สลับแท็ก RFID vs บาร์โค้ด */}
                    <div className="flex rounded-xl bg-slate-200/60 p-1 text-xs font-bold gap-1">
                      <button
                        onClick={() => {
                          setQrType("TAG")
                          if (activeQrValue && allDetails.some(t => t.epc === activeQrValue)) {
                            // keep active
                          } else if (allDetails.length > 0) {
                            const firstMissing = allDetails.find(t => !t.isScanned)
                            setActiveQrValue(firstMissing ? firstMissing.epc : allDetails[0].epc)
                          }
                        }}
                        className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          qrType === "TAG"
                            ? "bg-white text-purple-700 shadow-xs font-black"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        <Tag className="w-3.5 h-3.5 text-purple-600" />
                        <span>แท็ก RFID ({totalCount})</span>
                      </button>
                      <button
                        onClick={() => {
                          setQrType("BARCODE")
                          const code = (item.barcode && item.barcode !== "-") ? item.barcode : item.sku
                          setActiveQrValue(code)
                        }}
                        className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          qrType === "BARCODE"
                            ? "bg-white text-blue-700 shadow-xs font-black"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        <ScanLine className="w-3.5 h-3.5 text-blue-600" />
                        <span>บาร์โค้ด / SKU</span>
                      </button>
                    </div>

                    {/* สถานะของรหัส QR ที่กำลังแสดง */}
                    {qrType === "TAG" ? (
                      currentTagDetail ? (
                        currentTagDetail.isScanned ? (
                          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>แท็กนี้: สแกนตรวจนับแล้ว (Found)</span>
                          </div>
                        ) : (
                          <div className="bg-rose-50 border border-rose-200 text-rose-800 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 animate-pulse">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                            <span>แท็กนี้: 🔴 ยังไม่เจอ (Missing)</span>
                          </div>
                        )
                      ) : (
                        <div className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-xl text-xs font-bold text-center">
                          รหัสแท็ก RFID
                        </div>
                      )
                    ) : (
                      <div className="bg-blue-50 border border-blue-200 text-blue-800 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5">
                        <ScanLine className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>สำหรับนับแมนนวล (เมนู 3)</span>
                      </div>
                    )}

                    {/* กล่อง QR Code คมชัด ขนาดกะทัดรัด (135px) */}
                    <div className="flex justify-center my-1">
                      <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-200 inline-block">
                        <QRCodeSVG
                          value={activeQrValue || "-"}
                          size={135}
                          level="M"
                          includeMargin={true}
                        />
                      </div>
                    </div>

                    {/* ข้อความรหัส + ปุ่มคัดลอก */}
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-bold text-slate-800 bg-white px-3 py-1.5 rounded-xl border border-slate-200 select-all truncate flex-1 text-center">
                        {activeQrValue || "-"}
                      </span>
                      <button
                        onClick={() => handleCopyTag(activeQrValue)}
                        className="px-3 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shrink-0"
                        title="คัดลอกรหัสนี้"
                      >
                        {copiedTag === activeQrValue ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedTag === activeQrValue ? "คัดลอกแล้ว" : "คัดลอก"}</span>
                      </button>
                    </div>
                  </div>

                  {/* คำแนะนำการใช้งาน */}
                  <div className="text-[11px] text-slate-500 mt-3 pt-3 border-t border-slate-200/60 flex items-start gap-1.5">
                    <QrCode className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
                    <span>
                      {qrType === "TAG"
                        ? "📱 เล็งกล้อง PDA หรือเครื่องสแกนบาร์โค้ดที่ QR Code นี้ เพื่อส่งรหัสแท็กเข้าเครื่องได้ทันที"
                        : "📱 ใช้กล้อง PDA สแกนในเมนู '3. นับตั้งต้น' (นับแมนนวล) เพื่อบวกยอดสินค้า"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 shrink-0">
                <div className="text-xs text-slate-500 flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-rose-500"></span>
                  <span>สีแดง = แท็กที่ยังขาด (ยังไม่ได้สแกน) ให้มองหาแท็กตามรหัสนี้</span>
                </div>
                <button
                  onClick={() => setSelectedTagModalItem(null)}
                  className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* 🔴 Modal ยืนยันการล้างยอด (RFID / แมนนวล / ทั้งหมด) */}
      {clearTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-800">
                  {clearTarget === "rfid" ? "ยืนยันล้างยอด RFID?" : clearTarget === "manual" ? "ยืนยันล้างยอด แมนนวล?" : "ยืนยันล้างยอดทั้งหมด?"}
                </h3>
                <p className="text-xs text-slate-500">
                  {clearTarget === "rfid"
                    ? "ยอดที่กวาด RFID ทั้งหมดของสาขานี้จะถูกรีเซ็ตเป็น 0"
                    : clearTarget === "manual"
                    ? "ยอดที่นับมือ/บาร์โค้ดทั้งหมดของสาขานี้จะถูกรีเซ็ตเป็น 0"
                    : "ยอดนับทั้งหมดทั้ง 2 ฝั่งจะถูกรีเซ็ตเป็น 0 เพื่อเริ่มนับใหม่"}
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-600">
              <span>รายการที่ได้รับผลกระทบ: </span>
              <strong className="text-slate-800 font-bold">
                {clearTarget === "rfid" ? `${summary.totalRfid.toLocaleString()} ชิ้น (RFID)` : clearTarget === "manual" ? `${summary.totalManual.toLocaleString()} ชิ้น (แมนนวล)` : "ทุกรายการ"}
              </strong>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setClearTarget(null)}
                disabled={clearing}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleConfirmClear}
                disabled={clearing}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-rose-600/20 flex items-center gap-2 cursor-pointer"
              >
                {clearing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                ยืนยันล้างยอด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🟢 Modal ยืนยันส่งเรื่องให้แอดมิน */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-emerald-600">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-800">ส่งปรับยอดสต็อกให้แอดมิน</h3>
                <p className="text-xs text-slate-500">ยอด RFID และ แมนนวล ตรงกัน 100% เรียบร้อยแล้ว</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between text-slate-600">
                <span>จำนวนสินค้าทั้งหมด:</span>
                <strong className="font-mono">{summary.totalItems} รายการ</strong>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>ยอดตรวจนับรวม:</span>
                <strong className="font-mono text-emerald-700">{summary.totalRfid.toLocaleString()} ชิ้น</strong>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                หมายเหตุเพิ่มเติม (ถ้ามี)
              </label>
              <textarea
                rows={2}
                value={submitNotes}
                onChange={(e) => setSubmitNotes(e.target.value)}
                placeholder="เช่น ตรวจนับสต็อกประจำงวด สินค้าตรงกันครบถ้วน..."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setShowSubmitModal(false)}
                disabled={submitting}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSubmitToAdmin}
                disabled={submitting}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/20 flex items-center gap-2 cursor-pointer"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                ยืนยันส่งแอดมิน
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
