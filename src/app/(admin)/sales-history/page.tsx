"use client"

import React, { useState, useEffect } from 'react'
import { getSalesHistory, getAllBranches, hideCancelledOrder, restoreHiddenOrder } from '@/actions/sales-check'
import {
  History, DollarSign, Truck, User, Check, Clock, ChevronDown, ChevronUp,
  Printer, XCircle, EyeOff, Eye, Loader2, ArrowLeft, Building2, Search
} from 'lucide-react'
import { toast } from 'sonner'
import PrintDispatchModal from '@/components/PrintDispatchModal'
import PaymentSlipViewer from '@/components/PaymentSlipViewer'

interface RemoteDetail {
  branch_name: string;
  amount: number;
  qty: number;
}

interface SaleOrder {
  id: number;
  orderCode: string;
  createdAt: string;
  saleName: string;
  branchId?: number;
  branchName?: string;
  subtotal: number;
  discountAmount: number;
  discountPercent: number;
  netBeforeVat: number;
  vatAmount: number;
  totalAmount: number;
  status: string;
  shippingName: string | null;
  myBranchRevenue: number;
  otherBranchRevenue: number;
  remoteDetails: RemoteDetail[];
  discountSnapshot?: any;
  items?: {
    id: number;
    qty: number;
    priceAtSale: number;
    totalItemAmount: number;
    productName: string;
    productSku: string;
    imageUrl: string | null;
    fulfillBranchName: string;
  }[];
}

interface Branch {
  id: number;
  branch_name: string;
}

export default function AdminSalesHistoryPage() {
  const [sales, setSales] = useState<SaleOrder[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [selectedBranch, setSelectedBranch] = useState<'ALL' | number>('ALL')
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'COMPLETED' | 'CANCELLED'>('ALL')
  const [expandedOrders, setExpandedOrders] = useState<number[]>([])
  const [printOrderCode, setPrintOrderCode] = useState<string | null>(null)
  const [showHidden, setShowHidden] = useState(false)
  const [hiddenCount, setHiddenCount] = useState(0)
  const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null)

  // โหลดรายชื่อสาขาทั้งหมดครั้งแรก
  useEffect(() => {
    getAllBranches().then(res => {
      if (res.success && res.data) {
        setBranches(res.data)
      }
    })
  }, [])

  // โหลดข้อมูลยอดขายเมื่อสาขาหรือสถานะ showHidden เปลี่ยน
  useEffect(() => {
    let isActive = true
    setLoading(true)
    getSalesHistory(showHidden, selectedBranch).then(res => {
      if (!isActive) return
      if (res.success && res.data) {
        setSales(res.data)
        setHiddenCount(res.hiddenCount || 0)
      } else {
        toast.error("โหลดข้อมูลยอดขายล้มเหลว: " + res.error)
      }
      setLoading(false)
    })

    return () => { isActive = false }
  }, [showHidden, selectedBranch])

  const toggleExpand = (orderId: number) => {
    setExpandedOrders(prev =>
      prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
    )
  }

  async function handleVisibilityChange(order: SaleOrder) {
    setUpdatingOrderId(order.id)
    const res = showHidden
      ? await restoreHiddenOrder(order.id)
      : await hideCancelledOrder(order.id)

    if (res.success) {
      setSales(current => current.filter(item => item.id !== order.id))
      setHiddenCount(current => Math.max(0, current + (showHidden ? -1 : 1)))
      toast.success(showHidden ? 'นำบิลกลับมาแสดงแล้ว' : 'ซ่อนบิลจากรายการของคุณแล้ว')
    } else {
      toast.error(res.error || 'เปลี่ยนการแสดงผลไม่สำเร็จ')
    }
    setUpdatingOrderId(null)
  }

  // ฟิลเตอร์ค้นหาจากเลขที่ใบขาย, ชื่อลูกค้า หรือชื่อสาขา
  const filteredSales = sales.filter(s => {
    const searchLower = searchTerm.toLowerCase()
    const matchesSearch =
      s.orderCode.toLowerCase().includes(searchLower) ||
      (s.shippingName && s.shippingName.toLowerCase().includes(searchLower)) ||
      (s.branchName && s.branchName.toLowerCase().includes(searchLower)) ||
      (s.saleName && s.saleName.toLowerCase().includes(searchLower))

    const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter
    return matchesSearch && matchesStatus
  })

  // คำนวณยอดสรุปรวมทั้งหมดตามที่กรอง
  const baseSalesForTotals = sales.filter(s => {
    const searchLower = searchTerm.toLowerCase()
    return (
      s.orderCode.toLowerCase().includes(searchLower) ||
      (s.shippingName && s.shippingName.toLowerCase().includes(searchLower)) ||
      (s.branchName && s.branchName.toLowerCase().includes(searchLower)) ||
      (s.saleName && s.saleName.toLowerCase().includes(searchLower))
    )
  })

  const totalInvoiced = baseSalesForTotals.filter(s => s.status !== 'CANCELLED').reduce((sum, s) => sum + s.totalAmount, 0)
  const totalDropShip = baseSalesForTotals.filter(s => s.status !== 'CANCELLED').reduce((sum, s) => sum + s.otherBranchRevenue, 0)
  const totalCancelled = baseSalesForTotals.filter(s => s.status === 'CANCELLED').reduce((sum, s) => sum + s.totalAmount, 0)

  return (
    <div className="min-h-screen bg-[#F4F7F9] p-4 md:p-8 font-sans select-none pb-24">
      <div className="max-w-[1680px] mx-auto space-y-6">

        {/* --- Header Section --- */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                <History className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-black text-slate-800">
                  ประวัติการขายหน้าร้าน (สำหรับ Admin)
                </h1>
                <p className="text-slate-400 text-xs font-medium">
                  ตรวจสอบใบขาย ยอดเงิน และสลิปการโอนเงินแยกตามสาขาหรือดูรวมทุกสาขาทั่วประเทศ
                </p>
              </div>
            </div>
          </div>

          {/* Controls: Branch Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* ตัวเลือกสาขา */}
            <div className="relative min-w-[240px]">
              <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={selectedBranch}
                onChange={(e) => {
                  const val = e.target.value
                  setSelectedBranch(val === 'ALL' ? 'ALL' : Number(val))
                }}
                className="w-full pl-10 pr-9 py-2.5 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer appearance-none"
              >
                <option value="ALL">🏢 ดูรวมทุกสาขาทั่วประเทศ</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>
                    📍 {b.branch_name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* ช่องค้นหา */}
            <div className="relative min-w-[240px] sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="ค้นหาเลขใบขาย, ลูกค้า, สาขา..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 hover:bg-slate-100 focus:bg-white text-xs font-semibold text-slate-700 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
          </div>
        </div>

        {/* --- Stat Cards --- */}
        {!showHidden && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-blue-500" /> ยอดสุทธิใบขายรวม
              </span>
              <div className="text-2xl font-black text-blue-600 mt-2">
                {totalInvoiced.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿
              </div>
              <span className="text-[10px] text-slate-400 block mt-1 font-medium">
                {selectedBranch === 'ALL' ? 'รวมทุกสาขาทั่วประเทศ' : `สาขา: ${branches.find(b => b.id === selectedBranch)?.branch_name || 'สาขาที่เลือก'}`}
              </span>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
              <span className="text-[11px] font-black text-red-600 uppercase tracking-wider flex items-center gap-1.5">
                <XCircle className="w-3.5 h-3.5 text-red-500" /> ยอดเงินบิลยกเลิก
              </span>
              <div className="text-2xl font-black text-red-600 mt-2">
                {totalCancelled.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿
              </div>
              <span className="text-[10px] text-slate-400 block mt-1 font-medium">รวมมูลค่าบิลทั้งหมดที่ทำการยกเลิก</span>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
              <span className="text-[11px] font-black text-orange-600 uppercase tracking-wider flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-orange-600" /> ยอดจัดส่งข้ามสาขา (Drop Ship)
              </span>
              <div className="text-2xl font-black text-orange-600 mt-2">
                {totalDropShip.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿
              </div>
              <span className="text-[10px] text-slate-400 block mt-1 font-medium">ยอดเงินของสินค้าที่ให้สาขาอื่นแพ็คส่ง</span>
            </div>
          </div>
        )}

        {/* --- Filter Tabs & Hidden Toggle --- */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {!showHidden ? (
            <div className="flex gap-2 p-1 bg-white rounded-2xl w-full md:max-w-md border border-slate-100 shadow-3xs">
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`flex-1 py-2 px-4 text-xs font-black rounded-xl transition-all cursor-pointer ${
                  statusFilter === 'ALL'
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                ทั้งหมด ({sales.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('COMPLETED')}
                className={`flex-1 py-2 px-4 text-xs font-black rounded-xl transition-all cursor-pointer ${
                  statusFilter === 'COMPLETED'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                ขายสำเร็จ ({sales.filter(s => s.status === 'COMPLETED').length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('CANCELLED')}
                className={`flex-1 py-2 px-4 text-xs font-black rounded-xl transition-all cursor-pointer ${
                  statusFilter === 'CANCELLED'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                ยกเลิกแล้ว ({sales.filter(s => s.status === 'CANCELLED').length})
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
              <EyeOff className="w-4 h-4 text-slate-400" /> รายการที่ซ่อน ({hiddenCount})
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              setLoading(true)
              setShowHidden(current => !current)
              setStatusFilter('ALL')
            }}
            className="inline-flex items-center gap-1.5 self-start md:self-auto px-2 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 shadow-3xs transition-colors cursor-pointer"
          >
            {showHidden ? (
              <><ArrowLeft className="w-3.5 h-3.5" /> กลับรายการปกติ</>
            ) : (
              <><EyeOff className="w-3.5 h-3.5" /> รายการที่ซ่อน {hiddenCount > 0 ? `(${hiddenCount})` : ''}</>
            )}
          </button>
        </div>

        {/* --- Main Table --- */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 uppercase tracking-wider font-bold">
                <tr>
                  <th className="p-4 w-60">เลขที่ใบขาย / สาขา</th>
                  <th className="p-4">วันที่ออกเอกสาร</th>
                  <th className="p-4 text-center w-24">สลิป</th>
                  <th className="p-4">พนักงานขาย (Sale)</th>
                  <th className="p-4 text-right whitespace-nowrap">ยอดก่อนลด</th>
                  <th className="p-4 text-right whitespace-nowrap">ส่วนลด (%)</th>
                  <th className="p-4 text-right whitespace-nowrap">
                    <div>ยอดก่อน VAT</div>
                    <div className="text-[9px] font-medium text-slate-400 normal-case">(ไม่รวมภาษี)</div>
                  </th>
                  <th className="p-4 text-right whitespace-nowrap">
                    <div>VAT (7%)</div>
                    <div className="text-[9px] font-medium text-slate-400 normal-case">(ภาษีมูลค่าเพิ่ม)</div>
                  </th>
                  <th className="p-4 text-right whitespace-nowrap">ยอดสาขาออกบิล</th>
                  <th className="p-4 text-right whitespace-nowrap">ยอดข้ามสาขา (Drop Ship)</th>
                  <th className="p-4 text-right whitespace-nowrap">
                    <div>ยอดสุทธิ (รวม VAT)</div>
                    <div className="text-[9px] font-medium text-blue-600 normal-case">(ยอดหลังลด)</div>
                  </th>
                  <th className="p-4 text-center w-32">สถานะใบขาย</th>
                  <th className="p-2 w-12"><span className="sr-only">ตัวเลือก</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {loading ? (
                  <tr>
                    <td colSpan={13} className="p-16 text-center text-slate-400 font-bold">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                        <span>กำลังโหลดข้อมูลประวัติใบขาย...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredSales.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="p-16 text-center text-slate-400 font-bold">
                      {showHidden ? 'ยังไม่มีบิลที่ซ่อนไว้' : 'ไม่พบประวัติใบขายตามเงื่อนไขที่ค้นหา'}
                    </td>
                  </tr>
                ) : (
                  filteredSales.map((order) => {
                    const isExpanded = expandedOrders.includes(order.id)
                    return (
                      <React.Fragment key={order.id}>
                        <tr
                          className={`group transition-all cursor-pointer border-l-4 ${
                            order.status === 'CANCELLED'
                              ? 'bg-red-50/90 text-red-900 border-l-red-500 hover:bg-red-100/60'
                              : 'hover:bg-slate-50/50 border-l-transparent'
                          }`}
                          onClick={() => toggleExpand(order.id)}
                        >
                          {/* เลขที่ใบขาย & สาขา */}
                          <td className="p-4 font-bold text-slate-800">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                                )}
                                <span className="text-sm font-black block truncate">{order.orderCode}</span>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setPrintOrderCode(order.orderCode)
                                }}
                                className="text-[10px] text-slate-500 hover:text-blue-600 font-bold flex items-center gap-1 transition-colors px-2 py-0.5 rounded border border-slate-200 bg-white shadow-3xs cursor-pointer shrink-0"
                                title="พิมพ์ใบเสนอราคา/ใบเสร็จ"
                              >
                                <Printer className="w-3.5 h-3.5" /> พิมพ์
                              </button>
                            </div>

                            {/* ป้ายชื่อสาขาที่ออกบิล */}
                            <div className="mt-1 flex flex-wrap gap-1">
                              <span className="inline-flex items-center gap-1 text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-md border border-blue-100">
                                <Building2 className="w-3 h-3 text-blue-500" /> {order.branchName || 'ไม่ระบุสาขา'}
                              </span>

                              {/* ป้ายรูปแบบจัดส่ง */}
                              {order.shippingName ? (
                                <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-600 font-bold px-2 py-0.5 rounded-md border border-emerald-100">
                                  <Truck className="w-3 h-3 mr-0.5" /> ส่งบ้าน: {order.shippingName}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-md border border-slate-200">
                                  <User className="w-3 h-3 mr-0.5" /> หิ้วกลับเอง
                                </span>
                              )}
                            </div>
                          </td>

                          {/* วันที่ */}
                          <td className="p-4 text-slate-500 whitespace-nowrap">
                            {new Date(order.createdAt).toLocaleDateString('th-TH', {
                              year: 'numeric', month: 'short', day: 'numeric',
                              hour: '2-digit', minute: '2-digit'
                            })} น.
                          </td>

                          {/* สลิปโอนเงิน */}
                          <td className="p-3 text-center" onClick={event => event.stopPropagation()}>
                            <PaymentSlipViewer orderId={order.id} orderCode={order.orderCode} compact />
                          </td>

                          {/* ชื่อ Sale */}
                          <td className="p-4 text-slate-700 font-bold whitespace-nowrap">{order.saleName}</td>

                          {/* ยอดก่อนลด */}
                          <td className="p-4 text-right font-medium text-slate-700 text-xs whitespace-nowrap">
                            ฿{order.subtotal.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>

                          {/* ส่วนลด (%) */}
                          <td className="p-4 text-right whitespace-nowrap">
                            {order.discountAmount > 0 ? (
                              <div className="inline-flex flex-col items-end">
                                <span className="inline-flex items-center gap-1 font-bold text-orange-600 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded text-[11px]">
                                  -฿{order.discountAmount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                                <span className="text-[10px] font-bold text-orange-500 mt-0.5">ลด {order.discountPercent}%</span>
                              </div>
                            ) : (
                              <span className="text-slate-300 font-mono text-xs">-</span>
                            )}
                          </td>

                          {/* ยอดก่อน VAT */}
                          <td className="p-4 text-right font-semibold text-slate-700 text-xs whitespace-nowrap">
                            ฿{order.netBeforeVat.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>

                          {/* VAT (7%) */}
                          <td className="p-4 text-right font-medium text-purple-700 text-xs whitespace-nowrap">
                            ฿{order.vatAmount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>

                          {/* ยอดเงินสาขาออกบิล */}
                          <td className="p-4 text-right font-bold text-slate-800 text-xs whitespace-nowrap">
                            ฿{order.myBranchRevenue.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>

                          {/* ยอดเงินจัดส่งข้ามสาขา (Drop Ship) */}
                          <td className={`p-4 text-right whitespace-nowrap ${order.status === 'CANCELLED' ? '' : 'bg-orange-50/30'}`}>
                            {order.otherBranchRevenue > 0 ? (
                              <>
                                <span className="font-black text-orange-600 text-xs block">
                                  ฿{order.otherBranchRevenue.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                                <div className="space-y-0.5 mt-1">
                                  {order.remoteDetails.map((r, i) => (
                                    <span key={i} className="block text-[9px] text-slate-500 font-medium">
                                      ({r.branch_name} x{r.qty})
                                    </span>
                                  ))}
                                </div>
                              </>
                            ) : (
                              <span className="text-slate-300 font-bold">-</span>
                            )}
                          </td>

                          {/* ยอดสุทธิรวมของบิล (ยอดหลังลด) */}
                          <td className="p-4 text-right font-black text-blue-600 text-sm whitespace-nowrap">
                            ฿{order.totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>

                          {/* สถานะบิล */}
                          <td className="p-4 text-center">
                            <span className={`inline-block px-3 py-1.5 rounded-full text-[10px] font-black shadow-sm ${
                              order.status === 'COMPLETED'
                                ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                                : order.status === 'CANCELLED'
                                ? 'bg-red-50 text-red-600 border border-red-200'
                                : 'bg-amber-50 text-amber-600 border border-amber-200 animate-pulse'
                            }`}>
                              {order.status === 'COMPLETED' ? (
                                <span className="flex items-center justify-center gap-1"><Check className="w-3 h-3" /> สำเร็จแล้ว</span>
                              ) : order.status === 'CANCELLED' ? (
                                <span className="flex items-center justify-center gap-1"><XCircle className="w-3 h-3" /> ยกเลิกแล้ว</span>
                              ) : (
                                <span className="flex items-center justify-center gap-1"><Clock className="w-3 h-3" /> รอสาขาแพ็ค</span>
                              )}
                            </span>
                            {order.status === 'CANCELLED' && order.discountSnapshot?.cancel_reason && (
                              <div className="mt-1 text-[10px] font-medium text-red-700 bg-red-100/80 px-2 py-0.5 rounded max-w-[150px] mx-auto truncate" title={`เหตุผล: ${order.discountSnapshot.cancel_reason}`}>
                                โน้ต: {order.discountSnapshot.cancel_reason}
                              </div>
                            )}
                          </td>

                          {/* เมนูซ่อนบิลยกเลิก */}
                          <td className="p-2 text-center relative" onClick={event => event.stopPropagation()}>
                            {order.status === 'CANCELLED' && (
                              <button
                                type="button"
                                onClick={() => handleVisibilityChange(order)}
                                disabled={updatingOrderId === order.id}
                                className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-300 hover:text-slate-600 hover:bg-slate-100 opacity-35 group-hover:opacity-100 focus:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 disabled:opacity-50 transition-all cursor-pointer"
                                aria-label={showHidden ? `นำบิล ${order.orderCode} กลับมาแสดง` : `ซ่อนบิล ${order.orderCode} จากรายการ`}
                                title={showHidden ? 'นำกลับมาแสดง' : 'ซ่อนจากรายการ'}
                              >
                                {updatingOrderId === order.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : showHidden ? (
                                  <Eye className="w-4 h-4" />
                                ) : (
                                  <EyeOff className="w-4 h-4" />
                                )}
                              </button>
                            )}
                          </td>
                        </tr>

                        {/* กางดูรายละเอียดสินค้าในบิล */}
                        {isExpanded && (
                          <tr className="bg-slate-50/40">
                            <td colSpan={13} className="p-4 border-t border-slate-100">
                              <div className="space-y-2 pl-4 pr-4 md:pl-6 md:pr-6">
                                {/* แถบสรุปยอดบิลแบบย่อ ชัดเจน (ยอดก่อน VAT + VAT 7% = ยอดสุทธิ) */}
                                <div className="flex flex-wrap items-center gap-4 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs text-xs mb-3">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-slate-400 font-medium">ยอดก่อนลด:</span>
                                    <span className="font-bold text-slate-700">฿{order.subtotal.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-slate-400 font-medium">ส่วนลด:</span>
                                    <span className="font-bold text-orange-600">
                                      {order.discountAmount > 0 ? `-฿${order.discountAmount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (ลด ${order.discountPercent}%)` : '฿0.00 (0%)'}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-slate-400 font-medium">ยอดก่อน VAT:</span>
                                    <span className="font-bold text-slate-700">฿{order.netBeforeVat.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-slate-400 font-medium">VAT (7%):</span>
                                    <span className="font-bold text-purple-700">฿{order.vatAmount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-slate-400 font-medium">ยอดสุทธิ (รวม VAT):</span>
                                    <span className="font-black text-blue-600">฿{order.totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                  </div>
                                </div>
                                {order.status === 'CANCELLED' && order.discountSnapshot?.cancel_reason && (
                                  <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start gap-2">
                                    <XCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                                    <div>
                                      <span className="font-bold">เหตุผลการยกเลิก:</span> {order.discountSnapshot.cancel_reason}
                                      {order.discountSnapshot.cancelled_by_name && (
                                        <span className="text-red-500 text-[10px] ml-2 font-normal">(ยกเลิกโดย {order.discountSnapshot.cancelled_by_name})</span>
                                      )}
                                    </div>
                                  </div>
                                )}
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="font-bold text-xs text-slate-600 uppercase tracking-wider">
                                    รายการสินค้าในบิล ({order.items?.length || 0} รายการ):
                                  </h4>
                                  <span className="text-[11px] text-slate-400 font-medium">
                                    ออกบิลโดยสาขา: <strong className="text-slate-700">{order.branchName}</strong>
                                  </span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                  {order.items?.map((item, itemIndex) => (
                                    <div key={item.id || itemIndex} className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-slate-200 shadow-2xs">
                                      <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 overflow-hidden">
                                        {item.imageUrl ? (
                                          <img src={item.imageUrl} alt={item.productName} className="w-full h-full object-contain p-1" />
                                        ) : (
                                          <span className="text-[10px] text-slate-300">ไม่มีรูป</span>
                                        )}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <span className="text-xs font-bold text-slate-800 block truncate" title={item.productName}>
                                          {item.productName}
                                        </span>
                                        <span className="text-[10px] text-slate-400 block font-mono truncate">
                                          SKU: {item.productSku || '-'}
                                        </span>
                                        <span className="inline-block text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded mt-0.5">
                                          คลังแพ็คส่ง: {item.fulfillBranchName}
                                        </span>
                                      </div>
                                      <div className="text-right shrink-0">
                                        <span className="text-xs font-black text-slate-800 block">x{item.qty}</span>
                                        <span className="text-[11px] font-bold text-blue-600 block">
                                          {item.priceAtSale.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿
                                        </span>
                                      </div>
                                    </div>
                                  ))}
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
          </div>
        </div>

      </div>

      {/* โมดอลพิมพ์ใบเสนอราคา / ใบเสร็จ */}
      <PrintDispatchModal orderCode={printOrderCode} onClose={() => setPrintOrderCode(null)} />
    </div>
  )
}
