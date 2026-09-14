"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  getStockAudits,
  getStockAuditDetail,
  createStockAudit,
  submitAuditForApproval,
  getAuditBranchesAndUser,
  type StockAudit,
  type StockAuditItem,
  type StockAuditScan
} from "@/actions/stock-audit"
import {
  ClipboardCheck,
  Radio,
  ScanLine,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Plus,
  Send,
  Loader2,
  ChevronRight,
  Package,
  Building2,
  Calendar,
  User,
  ShieldCheck,
  Search,
  Filter,
  Layers,
  ArrowRight
} from "lucide-react"

const money = (val: number) =>
  val.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function ManagerStockAuditPage() {
  const [audits, setAudits] = useState<StockAudit[]>([])
  const [activeAuditId, setActiveAuditId] = useState<number | null>(null)
  const [auditDetail, setAuditDetail] = useState<{
    audit: StockAudit
    items: StockAuditItem[]
    scans: StockAuditScan[]
  } | null>(null)

  const [loadingList, setLoadingList] = useState(true)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  // Create Modal
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newTitle, setNewTitle] = useState("")

  // Submit Approval Modal
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [submitNotes, setSubmitNotes] = useState("")

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("")
  const [filterDiag, setFilterDiag] = useState<string>("ALL")

  // Branch state
  const [branches, setBranches] = useState<{ id: number; branch_name: string; branch_code: string }[]>([])
  const [selectedBranchId, setSelectedBranchId] = useState<number>(1)
  const [filterBranchId, setFilterBranchId] = useState<number>(0)

  // Load audit sessions list
  const loadAudits = async (bId?: number) => {
    setLoadingList(true)
    const targetBranch = typeof bId === "number" ? bId : filterBranchId
    const res = await getStockAudits(targetBranch > 0 ? targetBranch : undefined)
    if (!res.error && res.data) {
      setAudits(res.data)
      if (res.data.length > 0) {
        if (!activeAuditId || !res.data.some(a => a.id === activeAuditId)) {
          setActiveAuditId(res.data[0].id)
        }
      } else {
        setActiveAuditId(null)
        setAuditDetail(null)
      }
    }
    setLoadingList(false)
  }

  // Load active audit details
  const loadDetail = async (id: number) => {
    setLoadingDetail(true)
    const res = await getStockAuditDetail(id)
    if (!res.error && res.data) {
      setAuditDetail(res.data)
    }
    setLoadingDetail(false)
  }

  useEffect(() => {
    const initBranches = async () => {
      const bInfo = await getAuditBranchesAndUser()
      if (bInfo.branches && bInfo.branches.length > 0) {
        setBranches(bInfo.branches)
        const defaultBranch = bInfo.userBranchId || bInfo.branches[0].id
        setSelectedBranchId(defaultBranch)
      }
    }
    initBranches()
    loadAudits()
  }, [])

  useEffect(() => {
    if (activeAuditId) {
      loadDetail(activeAuditId)
    }
  }, [activeAuditId])

  // Handle Create Audit
  const handleCreate = async () => {
    if (!newTitle.trim() || actionLoading) return
    setActionLoading(true)
    const res = await createStockAudit(selectedBranchId, newTitle)
    if (res.error) {
      alert(res.error)
    } else if (res.data) {
      setShowCreateModal(false)
      setNewTitle("")
      await loadAudits(filterBranchId)
      setActiveAuditId(res.data.id)
    }
    setActionLoading(false)
  }

  // Handle Submit for Approval
  const handleSubmitApproval = async () => {
    if (!activeAuditId || actionLoading) return
    setActionLoading(true)
    const res = await submitAuditForApproval({
      auditId: activeAuditId,
      notes: submitNotes
    })
    if (res.error) {
      alert("เกิดข้อผิดพลาด: " + res.error)
    } else {
      setShowSubmitModal(false)
      setSubmitNotes("")
      await loadAudits()
      await loadDetail(activeAuditId)
      alert("ส่งคำขอปรับปรุงสต็อกไปยัง Admin เรียบร้อยแล้วครับ!")
    }
    setActionLoading(false)
  }

  const audit = auditDetail?.audit
  const items = auditDetail?.items || []

  // Filtering
  const filteredItems = items.filter(item => {
    const pName = item.products?.name?.toLowerCase() || ""
    const pSku = item.products?.sku?.toLowerCase() || ""
    const pBar = item.products?.barcode?.toLowerCase() || ""
    const q = searchQuery.toLowerCase()
    const matchesSearch = pName.includes(q) || pSku.includes(q) || pBar.includes(q)

    let matchesDiag = true
    if (filterDiag === "MISMATCH") matchesDiag = item.diff_qty !== 0 || item.diagnosis !== "MATCHED"
    else if (filterDiag === "TAG_MISSING") matchesDiag = item.diagnosis === "TAG_MISSING_SUSPECTED"
    else if (filterDiag === "SHRINKAGE") matchesDiag = item.diagnosis === "SHRINKAGE_LOST"
    else if (filterDiag === "MATCHED") matchesDiag = item.diagnosis === "MATCHED"

    return matchesSearch && matchesDiag
  })

  // Status Badge Helper
  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "IN_PROGRESS":
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1.5"><Radio className="w-3.5 h-3.5 animate-pulse text-blue-500" /> กำลังนับสต็อก</span>
      case "PENDING_APPROVAL":
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> รอ Admin อนุมัติ</span>
      case "APPROVED":
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> อนุมัติปรับสต็อกแล้ว</span>
      case "REJECTED":
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1.5"><XCircle className="w-3.5 h-3.5 text-rose-500" /> ตีกลับ/ไม่อนุมัติ</span>
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">{status || "-"}</span>
    }
  }

  // Diagnosis Badge
  const getDiagBadge = (diag: string) => {
    switch (diag) {
      case "MATCHED":
        return <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">✅ ตรงกันสมบูรณ์</span>
      case "TAG_MISSING_SUSPECTED":
        return <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300">⚠️ สงสัยแท็กหลุด (ของครบ)</span>
      case "SHRINKAGE_LOST":
        return <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-300">❌ ของหายจริง</span>
      case "UNEXPECTED_SURPLUS":
        return <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">➕ ของเกินระบบ</span>
      default:
        return <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-600">{diag}</span>
    }
  }

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* 🌟 Header & Breadcrumb */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <Link href="/manager/dashboard" className="hover:text-purple-600 transition-colors">ผู้จัดการ</Link>
              <span>/</span>
              <span className="font-semibold text-slate-700">ตรวจนับสต็อก 2 ทาง (RFID vs นับสด)</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 flex items-center gap-2.5">
              <ClipboardCheck className="w-7 h-7 text-purple-600" />
              ระบบตรวจสอบผลการนับสต็อก & ขออนุมัติปรับยอด
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              เปรียบเทียบ 3 เสา: ยอดในระบบ vs ยอดคนยิง RFID vs ยอดคนเดินนับสด พร้อมระบุแท็กหลุด
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              เปิดรอบตรวจนับใหม่
            </button>
          </div>
        </div>

        {/* 🧭 Main 2-Column Layout (Left: Audit Sessions List, Right: 3-Way Details) */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

          {/* Left Column: List of Audits */}
          <div className="lg:col-span-1 space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-purple-600" /> รอบการตรวจนับ ({audits.length})
              </span>
            </div>

            {loadingList ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
                <Loader2 className="w-6 h-6 animate-spin text-purple-600 mx-auto" />
                <span className="text-xs text-slate-400 mt-2 block">กำลังโหลดรายการ...</span>
              </div>
            ) : audits.length === 0 ? (
              <div className="p-6 text-center bg-white rounded-2xl border border-dashed border-slate-300">
                <p className="text-xs text-slate-500">ยังไม่มีรอบตรวจนับ</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="mt-3 text-xs text-purple-600 font-bold underline cursor-pointer"
                >
                  คลิกเพื่อเปิดรอบแรก
                </button>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[750px] overflow-y-auto pr-1">
                {audits.map((a) => {
                  const isActive = a.id === activeAuditId
                  return (
                    <div
                      key={a.id}
                      onClick={() => setActiveAuditId(a.id)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer text-left relative ${
                        isActive
                          ? "bg-purple-50/50 border-purple-300 shadow-sm"
                          : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-mono text-xs font-bold text-slate-800">
                          {a.audit_code}
                        </span>
                        {getStatusBadge(a.status)}
                      </div>
                      <h3 className="text-xs font-bold text-slate-700 line-clamp-1">
                        {a.title}
                      </h3>
                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-slate-400" />
                          {a.branches?.branch_name || "สาขาหลัก"}
                        </span>
                        <span>{new Date(a.started_at).toLocaleDateString("th-TH")}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Right Column: Active Audit Details & 3-Way Reconciliation */}
          <div className="lg:col-span-3 space-y-6">
            {loadingDetail ? (
              <div className="p-16 text-center bg-white rounded-3xl border border-slate-200 shadow-xs">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto" />
                <span className="text-xs text-slate-500 mt-3 block font-medium">กำลังคำนวณข้อมูลเปรียบเทียบ 3 เสา...</span>
              </div>
            ) : !audit ? (
              <div className="p-16 text-center bg-white rounded-3xl border border-dashed border-slate-300">
                <Package className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">เลือกรอบตรวจนับจากเมนูด้านซ้ายเพื่อดูผลการเปรียบเทียบ</p>
              </div>
            ) : (
              <>
                {/* 💳 Summary Header Cards */}
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-black text-slate-800">{audit.title}</h2>
                        {getStatusBadge(audit.status)}
                      </div>
                      <p className="text-xs text-slate-500 mt-1 flex items-center gap-3">
                        <span>รหัส: <strong className="font-mono text-slate-700">{audit.audit_code}</strong></span>
                        <span>•</span>
                        <span>สาขา: <strong>{audit.branches?.branch_name || "สาขาหลัก"}</strong></span>
                        <span>•</span>
                        <span>เริ่มนับ: {new Date(audit.started_at).toLocaleString("th-TH")}</span>
                      </p>
                    </div>

                    {/* ปุ่ม Action ประจำสถานะ */}
                    {audit.status === "IN_PROGRESS" && (
                      <button
                        onClick={() => setShowSubmitModal(true)}
                        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer self-start sm:self-auto"
                      >
                        <Send className="w-4 h-4" />
                        สรุปยอด & ส่งขออนุมัติปรับสต็อก
                      </button>
                    )}
                    {audit.status === "PENDING_APPROVAL" && (
                      <div className="text-xs text-amber-800 bg-amber-50 px-3.5 py-2 rounded-xl border border-amber-200 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>ส่งเรื่องไปแล้ว รอแอดมินกดอนุมัติที่หน้า Admin</span>
                      </div>
                    )}
                    {audit.status === "APPROVED" && (
                      <div className="text-xs text-emerald-800 bg-emerald-50 px-3.5 py-2 rounded-xl border border-emerald-200 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>อนุมัติและปรับสต็อกจริงเข้าตาราง stock เรียบร้อยแล้ว</span>
                      </div>
                    )}
                  </div>

                  {/* 📊 สรุปตัวเลข 4 การ์ดหลัก */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                      <span className="text-[11px] text-slate-500 font-bold block">1. ยอดในระบบเดิม</span>
                      <span className="text-xl sm:text-2xl font-black text-slate-800 font-mono">
                        {audit.total_system_qty.toLocaleString()}
                      </span>
                      <span className="text-[11px] text-slate-400 block mt-0.5">ชิ้น</span>
                    </div>

                    <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-200">
                      <span className="text-[11px] text-purple-700 font-bold block flex items-center gap-1">
                        <Radio className="w-3 h-3" /> 2. ยอดคนยิง RFID
                      </span>
                      <span className="text-xl sm:text-2xl font-black text-purple-700 font-mono">
                        {audit.total_rfid_qty.toLocaleString()}
                      </span>
                      <span className="text-[11px] text-purple-500 block mt-0.5">ชิ้นที่จับสัญญาณได้</span>
                    </div>

                    <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200">
                      <span className="text-[11px] text-blue-700 font-bold block flex items-center gap-1">
                        <ScanLine className="w-3 h-3" /> 3. ยอดคนนับสด
                      </span>
                      <span className="text-xl sm:text-2xl font-black text-blue-700 font-mono">
                        {audit.total_manual_qty.toLocaleString()}
                      </span>
                      <span className="text-[11px] text-blue-500 block mt-0.5">ชิ้นที่เดินนับจริง</span>
                    </div>

                    <div className={`p-4 rounded-2xl border ${
                      audit.total_variance_qty < 0
                        ? "bg-rose-50/60 border-rose-200 text-rose-700"
                        : audit.total_variance_qty > 0
                        ? "bg-emerald-50/60 border-emerald-200 text-emerald-700"
                        : "bg-slate-50 border-slate-200 text-slate-700"
                    }`}>
                      <span className="text-[11px] font-bold block">ผลต่างสุทธิ (เงินกระทบ)</span>
                      <span className="text-xl sm:text-2xl font-black font-mono">
                        {audit.total_variance_qty > 0 ? `+${audit.total_variance_qty}` : audit.total_variance_qty} ชิ้น
                      </span>
                      <span className="text-[11px] font-bold block mt-0.5">
                        {audit.total_variance_value < 0 ? `-฿${money(Math.abs(audit.total_variance_value))}` : `+฿${money(audit.total_variance_value)}`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 🔍 Filter & Search Bar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="relative flex-1 max-w-md">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="ค้นหาชื่อสินค้า, SKU, Barcode..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                    <button
                      onClick={() => setFilterDiag("ALL")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        filterDiag === "ALL" ? "bg-purple-100 text-purple-800" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      ทั้งหมด ({items.length})
                    </button>
                    <button
                      onClick={() => setFilterDiag("MISMATCH")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        filterDiag === "MISMATCH" ? "bg-amber-100 text-amber-900 border border-amber-300" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      ⚠️ ยอดไม่ตรง ({items.filter(i => i.diff_qty !== 0 || i.diagnosis !== "MATCHED").length})
                    </button>
                    <button
                      onClick={() => setFilterDiag("TAG_MISSING")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        filterDiag === "TAG_MISSING" ? "bg-amber-100 text-amber-900 border border-amber-300" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      🏷️ สงสัยแท็กหลุด ({items.filter(i => i.diagnosis === "TAG_MISSING_SUSPECTED").length})
                    </button>
                    <button
                      onClick={() => setFilterDiag("SHRINKAGE")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        filterDiag === "SHRINKAGE" ? "bg-rose-100 text-rose-800 border border-rose-300" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      ❌ ของหายจริง ({items.filter(i => i.diagnosis === "SHRINKAGE_LOST").length})
                    </button>
                  </div>
                </div>

                {/* 📋 Table: 3-Way Reconciliation */}
                <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-sans">
                      <thead className="bg-slate-50 text-[11px] text-slate-500 uppercase tracking-wider border-b border-slate-200 font-bold">
                        <tr>
                          <th className="p-4">สินค้า</th>
                          <th className="p-4 text-right">1. ยอดระบบ</th>
                          <th className="p-4 text-right text-purple-700">2. ยอด RFID</th>
                          <th className="p-4 text-right text-blue-700">3. ยอดนับสด</th>
                          <th className="p-4 text-right font-bold">ผลต่าง (ปรับ)</th>
                          <th className="p-4 text-center">การวินิจฉัย</th>
                          <th className="p-4 text-right">มูลค่าเงินกระทบ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredItems.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="p-12 text-center text-slate-400">
                              ไม่พบรายการสินค้าที่ตรงกับเงื่อนไข
                            </td>
                          </tr>
                        ) : (
                          filteredItems.map((item) => {
                            const p = item.products
                            return (
                              <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                                <td className="p-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                                      {p?.image_url ? (
                                        <img src={p.image_url} alt="" className="w-full h-full object-cover" />
                                      ) : (
                                        <Package className="w-5 h-5 text-slate-400" />
                                      )}
                                    </div>
                                    <div>
                                      <span className="font-bold text-slate-800 line-clamp-1">{p?.name || `สินค้า #${item.product_id}`}</span>
                                      <div className="text-[11px] text-slate-400 font-mono mt-0.5 flex items-center gap-2">
                                        <span>SKU: {p?.sku || "-"}</span>
                                        {p?.barcode && <span>• Barcode: {p.barcode}</span>}
                                      </div>
                                    </div>
                                  </div>
                                </td>

                                {/* เสา 1: ยอดระบบ */}
                                <td className="p-4 text-right font-mono text-sm text-slate-700">
                                  {item.system_qty_before}
                                </td>

                                {/* เสา 2: ยอด RFID */}
                                <td className="p-4 text-right font-mono text-sm font-bold text-purple-700 bg-purple-50/20">
                                  {item.rfid_qty}
                                </td>

                                {/* เสา 3: ยอดนับสด */}
                                <td className="p-4 text-right font-mono text-sm font-bold text-blue-700 bg-blue-50/20">
                                  {item.manual_qty}
                                </td>

                                {/* ผลต่าง */}
                                <td className="p-4 text-right font-mono text-sm font-black">
                                  <span className={
                                    item.diff_qty < 0
                                      ? "text-rose-600"
                                      : item.diff_qty > 0
                                      ? "text-emerald-600"
                                      : "text-slate-600"
                                  }>
                                    {item.diff_qty > 0 ? `+${item.diff_qty}` : item.diff_qty}
                                  </span>
                                </td>

                                {/* วินิจฉัย */}
                                <td className="p-4 text-center">
                                  {getDiagBadge(item.diagnosis)}
                                </td>

                                {/* มูลค่าเงิน */}
                                <td className="p-4 text-right font-mono text-xs font-bold">
                                  <span className={
                                    item.diff_value < 0
                                      ? "text-rose-600"
                                      : item.diff_value > 0
                                      ? "text-emerald-600"
                                      : "text-slate-400"
                                  }>
                                    {item.diff_value < 0 ? `-฿${money(Math.abs(item.diff_value))}` : item.diff_value > 0 ? `+฿${money(item.diff_value)}` : "฿0.00"}
                                  </span>
                                </td>
                              </tr>
                            )
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 📡 Live Scans Stream Card (ใครยิงอะไรเข้ามาบ้าง) */}
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                    <Radio className="w-4 h-4 text-purple-600" />
                    ประวัติการสแกนสดจากเครื่อง PDA ({auditDetail.scans.length} รายการล่าสุด)
                  </h3>
                  <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto font-mono text-xs">
                    {auditDetail.scans.map((s) => (
                      <div key={s.id} className="py-2.5 flex items-center justify-between text-slate-600">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            s.count_method === "RFID"
                              ? "bg-purple-100 text-purple-800"
                              : "bg-blue-100 text-blue-800"
                          }`}>
                            {s.count_method}
                          </span>
                          <span className="font-bold text-slate-800">{s.products?.name || `สินค้า #${s.product_id}`}</span>
                          <span className="text-slate-400 font-sans text-[11px]">({s.products?.sku})</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-slate-900">{s.scanned_qty} ชิ้น</span>
                          <span className="text-slate-400 text-[11px] font-sans flex items-center gap-1">
                            <User className="w-3 h-3" /> {s.counted_by_name || "พนักงาน"}
                          </span>
                          <span className="text-slate-400 text-[11px]">{new Date(s.scanned_at).toLocaleTimeString("th-TH")}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

        </div>

        {/* 🪄 Modal: เปิดรอบตรวจนับใหม่ */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-4">
              <div className="flex items-center gap-2.5 text-purple-700">
                <Plus className="w-6 h-6" />
                <h3 className="text-lg font-black text-slate-800">เปิดรอบตรวจนับสต็อกใหม่</h3>
              </div>
              <p className="text-xs text-slate-500">
                ระบบจะสร้างรอบตรวจนับ และดึงสต็อกปัจจุบันของทุกสินค้าในสาขามาเป็นฐานอ้างอิงให้ทันที
              </p>
              {branches.length > 1 && (
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">เลือกสาขา</label>
                  <select
                    value={selectedBranchId}
                    onChange={(e) => setSelectedBranchId(Number(e.target.value))}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-purple-500 bg-white"
                  >
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.branch_name} ({b.branch_code})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">ชื่อรอบตรวจนับ</label>
                <input
                  type="text"
                  placeholder="เช่น ตรวจนับสต็อกประจำเดือน ก.ย. 69"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-purple-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!newTitle.trim() || actionLoading}
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  ยืนยันเปิดรอบ
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 🪄 Modal: ส่งขออนุมัติปรับสต็อกไปยัง Admin */}
        {showSubmitModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <div className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-4">
              <div className="flex items-center gap-2.5 text-emerald-700">
                <Send className="w-6 h-6" />
                <h3 className="text-lg font-black text-slate-800">ยืนยันส่งเรื่องขออนุมัติปรับสต็อก</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                ยอดสต็อกที่นับได้จะถูกส่งต่อไปยัง <strong>Admin Dashboard</strong> เพื่อให้แอดมินตรวจสอบและกดยืนยันอนุมัติ
                <br />
                <span className="text-slate-500 mt-1 block">
                  *(สต็อกจริงในระบบจะยังไม่เปลี่ยนแปลงจนกว่าแอดมินจะกดอนุมัติ)*
                </span>
              </p>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">หมายเหตุ / สรุปผลจาก Manager ถึง Admin</label>
                <textarea
                  rows={3}
                  placeholder="เช่น ตรวจนับครบถ้วนแล้ว พบสินค้าขาด 2 ชิ้น และแท็กหลุด 1 ชิ้น..."
                  value={submitNotes}
                  onChange={(e) => setSubmitNotes(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowSubmitModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  ย้อนกลับ
                </button>
                <button
                  onClick={handleSubmitApproval}
                  disabled={actionLoading}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  ยืนยันส่งเรื่อง
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
