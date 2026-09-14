"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  getStockAudits,
  getStockAuditDetail,
  approveStockAudit,
  rejectStockAudit,
  type StockAudit,
  type StockAuditItem,
  type StockAuditScan
} from "@/actions/stock-audit"
import {
  ShieldCheck,
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Building2,
  User,
  Radio,
  ScanLine,
  Package,
  Layers,
  Search,
  ArrowRight
} from "lucide-react"

const money = (val: number) =>
  val.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function AdminStockAuditPage() {
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

  // Approve & Reject Modals
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [approveNotes, setApproveNotes] = useState("")
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState("")

  const [searchQuery, setSearchQuery] = useState("")

  const loadAudits = async () => {
    setLoadingList(true)
    const res = await getStockAudits()
    if (!res.error && res.data) {
      setAudits(res.data)
      if (!activeAuditId && res.data.length > 0) {
        // Prioritize PENDING_APPROVAL first
        const pending = res.data.find(a => a.status === "PENDING_APPROVAL")
        setActiveAuditId(pending ? pending.id : res.data[0].id)
      }
    }
    setLoadingList(false)
  }

  const loadDetail = async (id: number) => {
    setLoadingDetail(true)
    const res = await getStockAuditDetail(id)
    if (!res.error && res.data) {
      setAuditDetail(res.data)
    }
    setLoadingDetail(false)
  }

  useEffect(() => {
    loadAudits()
  }, [])

  useEffect(() => {
    if (activeAuditId) {
      loadDetail(activeAuditId)
    }
  }, [activeAuditId])

  // Handle Approve
  const handleApprove = async () => {
    if (!activeAuditId || actionLoading) return
    setActionLoading(true)
    const res = await approveStockAudit(activeAuditId, approveNotes)
    if (res.error) {
      alert("เกิดข้อผิดพลาด: " + res.error)
    } else {
      setShowApproveModal(false)
      setApproveNotes("")
      await loadAudits()
      await loadDetail(activeAuditId)
      alert("อนุมัติและปรับปรุงสต็อกจริงเข้าตาราง stock เรียบร้อยแล้วครับ!")
    }
    setActionLoading(false)
  }

  // Handle Reject
  const handleReject = async () => {
    if (!activeAuditId || !rejectReason.trim() || actionLoading) return
    setActionLoading(true)
    const res = await rejectStockAudit(activeAuditId, rejectReason)
    if (res.error) {
      alert("เกิดข้อผิดพลาด: " + res.error)
    } else {
      setShowRejectModal(false)
      setRejectReason("")
      await loadAudits()
      await loadDetail(activeAuditId)
      alert("ตีกลับคำขอตรวจนับเรียบร้อยแล้ว")
    }
    setActionLoading(false)
  }

  const audit = auditDetail?.audit
  const items = auditDetail?.items || []

  const filteredItems = items.filter(i => {
    const pName = i.products?.name?.toLowerCase() || ""
    const pSku = i.products?.sku?.toLowerCase() || ""
    const q = searchQuery.toLowerCase()
    return pName.includes(q) || pSku.includes(q)
  })

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* 🌟 Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <Link href="/dashboard" className="hover:text-purple-600 transition-colors">แดชบอร์ดแอดมิน</Link>
              <span>/</span>
              <span className="font-semibold text-slate-700">ศูนย์อนุมัติการตรวจนับสต็อก</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 flex items-center gap-2.5">
              <ShieldCheck className="w-7 h-7 text-emerald-600" />
              ศูนย์อนุมัติการปรับปรุงสต็อก (Stock Audit Approval)
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              ตรวจสอบคำขอปรับสต็อกที่ผู้จัดการสาขาสรุปยอดเข้ามา ก่อนอนุมัติอัปเดตสต็อกจริงในคลัง
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/manager/stock-audit"
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <ClipboardCheck className="w-4 h-4 text-purple-600" />
              มุมมองผู้จัดการ
            </Link>
          </div>
        </div>

        {/* 🧭 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

          {/* Left Column: List of Audits */}
          <div className="lg:col-span-1 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 px-1">
              <Layers className="w-4 h-4 text-emerald-600" /> รอบนับที่ส่งเข้ามา ({audits.length})
            </span>

            {loadingList ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-600 mx-auto" />
              </div>
            ) : audits.length === 0 ? (
              <div className="p-6 text-center bg-white rounded-2xl border border-dashed border-slate-300">
                <p className="text-xs text-slate-500">ยังไม่มีรอบตรวจนับในระบบ</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[750px] overflow-y-auto pr-1">
                {audits.map((a) => {
                  const isActive = a.id === activeAuditId
                  const isPending = a.status === "PENDING_APPROVAL"
                  return (
                    <div
                      key={a.id}
                      onClick={() => setActiveAuditId(a.id)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer text-left ${
                        isActive
                          ? "bg-emerald-50/50 border-emerald-300 shadow-sm"
                          : isPending
                          ? "bg-amber-50/30 border-amber-200 hover:border-amber-300"
                          : "bg-white border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-mono text-xs font-bold text-slate-800">{a.audit_code}</span>
                        {isPending ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 animate-pulse">
                            รออนุมัติ
                          </span>
                        ) : a.status === "APPROVED" ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            อนุมัติแล้ว
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                            {a.status}
                          </span>
                        )}
                      </div>
                      <h3 className="text-xs font-bold text-slate-700 line-clamp-1">{a.title}</h3>
                      <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                        <span>{a.branches?.branch_name || "สาขาหลัก"}</span>
                        <span className="font-mono font-bold text-slate-700">
                          {a.total_variance_qty !== 0 ? `${a.total_variance_qty > 0 ? "+" : ""}${a.total_variance_qty} ชิ้น` : "ตรงเป๊ะ"}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Right Column: Review Details & Approve/Reject */}
          <div className="lg:col-span-3 space-y-6">
            {loadingDetail ? (
              <div className="p-16 text-center bg-white rounded-3xl border border-slate-200 shadow-xs">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto" />
                <span className="text-xs text-slate-500 mt-3 block">กำลังโหลดรายละเอียด...</span>
              </div>
            ) : !audit ? (
              <div className="p-16 text-center bg-white rounded-3xl border border-dashed border-slate-300">
                <p className="text-slate-500 text-sm">เลือกรอบตรวจนับเพื่อพิจารณาอนุมัติ</p>
              </div>
            ) : (
              <>
                {/* 🌟 Audit Info & Approval Actions Card */}
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-black text-slate-800">{audit.title}</h2>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 font-mono">
                          {audit.audit_code}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        สาขา: <strong>{audit.branches?.branch_name || "สาขาหลัก"}</strong> • เริ่มนับ: {new Date(audit.started_at).toLocaleString("th-TH")}
                      </p>
                    </div>

                    {/* ปุ่ม Approve / Reject สำหรับสถานะ PENDING_APPROVAL */}
                    {audit.status === "PENDING_APPROVAL" ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setShowRejectModal(true)}
                          className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <XCircle className="w-4 h-4" />
                          ไม่อนุมัติ / ให้ไปนับใหม่
                        </button>
                        <button
                          onClick={() => setShowApproveModal(true)}
                          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          อนุมัติปรับสต็อกจริง
                        </button>
                      </div>
                    ) : audit.status === "APPROVED" ? (
                      <div className="text-xs text-emerald-800 bg-emerald-50 px-4 py-2.5 rounded-xl border border-emerald-200 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <div>
                          <strong>อนุมัติเรียบร้อยแล้ว</strong>
                          <span className="block text-[11px] text-emerald-600">เมื่อ: {new Date(audit.approved_at || audit.updated_at).toLocaleString("th-TH")}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500 bg-slate-100 px-4 py-2 rounded-xl">
                        สถานะปัจจุบัน: <strong>{audit.status}</strong>
                      </div>
                    )}
                  </div>

                  {/* 📝 ข้อความสรุปจากผู้จัดการ */}
                  {audit.submit_notes && (
                    <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 text-xs space-y-1">
                      <span className="font-bold text-amber-900 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        รายงานสรุปจากผู้จัดการสาขา:
                      </span>
                      <p className="text-amber-800 leading-relaxed pl-5">
                        {audit.submit_notes}
                      </p>
                    </div>
                  )}

                  {/* 📊 สรุปผลต่าง & มูลค่าเงิน */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center font-mono">
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                      <span className="text-[11px] text-slate-500 block mb-0.5">ยอดเดิมในระบบ</span>
                      <span className="text-lg sm:text-xl font-black text-slate-800">{audit.total_system_qty}</span>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-purple-50/50 border border-purple-200 text-purple-800">
                      <span className="text-[11px] text-purple-600 block mb-0.5">สแกนเจอ (RFID)</span>
                      <span className="text-lg sm:text-xl font-black">{audit.total_rfid_qty}</span>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-blue-50/50 border border-blue-200 text-blue-800">
                      <span className="text-[11px] text-blue-600 block mb-0.5">นับสดเจอ (Manual)</span>
                      <span className="text-lg sm:text-xl font-black">{audit.total_manual_qty}</span>
                    </div>
                    <div className={`p-3.5 rounded-2xl border ${
                      audit.total_variance_qty < 0
                        ? "bg-rose-50/60 border-rose-200 text-rose-700"
                        : audit.total_variance_qty > 0
                        ? "bg-emerald-50/60 border-emerald-200 text-emerald-700"
                        : "bg-slate-50 border-slate-200 text-slate-700"
                    }`}>
                      <span className="text-[11px] font-bold block mb-0.5">ผลต่างสุทธิ</span>
                      <span className="text-lg sm:text-xl font-black">
                        {audit.total_variance_qty > 0 ? `+${audit.total_variance_qty}` : audit.total_variance_qty} ชิ้น
                      </span>
                    </div>
                  </div>
                </div>

                {/* 📋 รายการสินค้าที่มีผลต่าง (Mismatch Breakdown) */}
                <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
                  <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      รายการเปรียบเทียบและปรับปรุงสต็อก ({items.length} รายการ)
                    </h3>
                    <div className="relative w-64">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="ค้นหาชื่อ, SKU..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-sans">
                      <thead className="bg-slate-50 text-[11px] text-slate-500 uppercase border-b border-slate-200 font-bold">
                        <tr>
                          <th className="p-4">สินค้า</th>
                          <th className="p-4 text-right">ยอดเดิม</th>
                          <th className="p-4 text-right text-purple-700">RFID</th>
                          <th className="p-4 text-right text-blue-700">นับสด</th>
                          <th className="p-4 text-right font-bold">ยอดใหม่หลังปรับ</th>
                          <th className="p-4 text-right">ผลต่าง</th>
                          <th className="p-4 text-center">วินิจฉัย</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        {filteredItems.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50/80 font-sans">
                            <td className="p-4">
                              <span className="font-bold text-slate-800 block line-clamp-1">{item.products?.name || `สินค้า #${item.product_id}`}</span>
                              <span className="text-[11px] text-slate-400 font-mono">SKU: {item.products?.sku}</span>
                            </td>
                            <td className="p-4 text-right font-mono text-slate-600">{item.system_qty_before}</td>
                            <td className="p-4 text-right font-mono text-purple-700 font-bold bg-purple-50/20">{item.rfid_qty}</td>
                            <td className="p-4 text-right font-mono text-blue-700 font-bold bg-blue-50/20">{item.manual_qty}</td>
                            <td className="p-4 text-right font-mono font-black text-slate-900 bg-slate-50/50">{item.final_qty}</td>
                            <td className="p-4 text-right font-mono font-bold">
                              <span className={item.diff_qty < 0 ? "text-rose-600" : item.diff_qty > 0 ? "text-emerald-600" : "text-slate-400"}>
                                {item.diff_qty > 0 ? `+${item.diff_qty}` : item.diff_qty}
                              </span>
                            </td>
                            <td className="p-4 text-center">
                              {item.diagnosis === "TAG_MISSING_SUSPECTED" ? (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                  แท็กหลุด (ของครบ)
                                </span>
                              ) : item.diagnosis === "SHRINKAGE_LOST" ? (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                                  ของหายจริง
                                </span>
                              ) : item.diff_qty > 0 ? (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800">
                                  ของเกิน
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700">
                                  ตรงกัน
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>

        </div>

        {/* 🪄 Modal: อนุมัติปรับสต็อกจริง */}
        {showApproveModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-4">
              <div className="flex items-center gap-2.5 text-emerald-700">
                <CheckCircle2 className="w-6 h-6" />
                <h3 className="text-lg font-black text-slate-800">ยืนยันการอนุมัติปรับสต็อกจริง</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                ระบบจะนำยอดนับสุทธิไปเขียนทับสต็อกปัจจุบันในตาราง <strong>stock</strong> ทันที
                และบันทึกประวัติความเคลื่อนไหวใน <strong>stock_movements</strong> เป็นหลักฐานทางบัญชี
              </p>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">หมายเหตุการอนุมัติ (ถ้ามี)</label>
                <input
                  type="text"
                  placeholder="เช่น อนุมัติตามที่สาขาแจ้งยอดผลต่าง..."
                  value={approveNotes}
                  onChange={(e) => setApproveNotes(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowApproveModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleApprove}
                  disabled={actionLoading}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  ยืนยันอนุมัติสต็อกจริง
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 🪄 Modal: ไม่อนุมัติ (Reject) */}
        {showRejectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-4">
              <div className="flex items-center gap-2.5 text-rose-700">
                <XCircle className="w-6 h-6" />
                <h3 className="text-lg font-black text-slate-800">ตีกลับคำขอ / ไม่อนุมัติ</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                คำขอนี้จะถูกตีกลับไปยังผู้จัดการสาขา และสต็อกในระบบจะไม่มีการเปลี่ยนแปลง
              </p>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">เหตุผลที่ไม่อนุมัติ (จำเป็นต้องระบุ)</label>
                <textarea
                  rows={2}
                  placeholder="เช่น ผลต่างมากเกินไป กรุณาจัดทีมนับสดใหม่อีกครั้ง..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-rose-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowRejectModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleReject}
                  disabled={!rejectReason.trim() || actionLoading}
                  className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  ยืนยันการตีกลับ
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
