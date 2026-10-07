"use client"

import React, { useState, useEffect, useMemo } from 'react'
import { getSalesHistory, getAllBranches, hideCancelledOrder, restoreHiddenOrder } from '@/actions/sales-check'
import {
  History, DollarSign, Truck, User, Check, Clock, ChevronDown, ChevronUp,
  Printer, XCircle, EyeOff, Eye, Loader2, ArrowLeft, Building2, Search, Tag
} from 'lucide-react'
import { toast } from 'sonner'
import PrintDispatchModal from '@/components/PrintDispatchModal'
import PaymentSlipViewer from '@/components/PaymentSlipViewer'
import DraggableTableWrapper from '@/components/DraggableTableWrapper'
import {
  SalesFilters,
  initialSalesFilters,
  filterSalesOrder,
  QuickDateSliderBar,
  ActiveFilterBadges,
  ColumnFilterButton,
  ColumnFilterPopover,
} from '@/components/SalesTableFilters'

interface RemoteDetail {
  branch_name: string;
  amount: number;
  qty: number;
}

interface SaleOrder {
  id: number;
  orderCode: string;
  createdAt: string;
  completedAt?: string | null;
  effectiveDate?: string;
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

function getCompletedDate(order: SaleOrder) {
  if (order.completedAt) return order.completedAt
  const snap = order.discountSnapshot
  if (snap) {
    if (typeof snap === 'object' && snap.completed_at) return snap.completed_at
    if (typeof snap === 'string') {
      try {
        const parsed = JSON.parse(snap)
        if (parsed.completed_at) return parsed.completed_at
      } catch (_) {}
    }
  }
  return null
}

export default function AdminSalesHistoryPage() {
  const [sales, setSales] = useState<SaleOrder[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [selectedBranch, setSelectedBranch] = useState<'ALL' | number>('ALL')
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<SalesFilters>(initialSalesFilters)
  const [openFilterColumn, setOpenFilterColumn] = useState<string | null>(null)
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

  // ดึงรายชื่อพนักงานขายทั้งหมดที่มีในระบบ
  const uniqueSaleNames = useMemo(() => {
    const set = new Set<string>()
    sales.forEach(s => {
      if (s.saleName) set.add(s.saleName)
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'th'))
  }, [sales])

  // ดึงรหัส 4 ตัวหน้า (Prefix) ของเลขที่ใบขายทั้งหมดที่มีในระบบ พร้อมนับจำนวนบิล
  const uniquePrefixes = useMemo(() => {
    const map = new Map<string, number>()
    sales.forEach(s => {
      if (s.orderCode && s.orderCode.trim().length >= 2) {
        const p4 = s.orderCode.trim().length >= 4
          ? s.orderCode.trim().slice(0, 4).toUpperCase()
          : s.orderCode.trim().toUpperCase()
        map.set(p4, (map.get(p4) || 0) + 1)
      }
    })
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([prefix, count]) => ({ prefix, count }))
  }, [sales])

  // ฟิลเตอร์รายการใบขายตามตัวกรองทั้งหมด
  const filteredSales = useMemo(() => {
    return sales.filter(s => filterSalesOrder(s, filters))
  }, [sales, filters])

  // คำนวณยอดสรุปรวมทั้งหมดตามที่กรอง (ยกเว้นฟิลเตอร์ status เพื่อให้การ์ดแสดงยอดครบทั้ง 4 สถานะ)
  const baseSalesForTotals = useMemo(() => {
    const filtersWithoutStatus: SalesFilters = { ...filters, status: 'ALL' }
    return sales.filter(s => filterSalesOrder(s, filtersWithoutStatus))
  }, [sales, filters])

  const totalInvoiced = baseSalesForTotals.filter(s => s.status === 'COMPLETED').reduce((sum, s) => sum + s.totalAmount, 0)
  const totalPending = baseSalesForTotals.filter(s => s.status === 'PENDING').reduce((sum, s) => sum + s.totalAmount, 0)
  const totalDropShip = baseSalesForTotals.filter(s => s.status !== 'CANCELLED').reduce((sum, s) => sum + s.otherBranchRevenue, 0)
  const totalCancelled = baseSalesForTotals.filter(s => s.status === 'CANCELLED').reduce((sum, s) => sum + s.totalAmount, 0)

  const handleResetAllFilters = () => {
    setFilters(initialSalesFilters)
    setSelectedBranch('ALL')
  }

  return (
    <div className="min-h-screen bg-[#F4F7F9] p-4 md:p-8 font-sans select-none pb-24">
      <div className="max-w-[1680px] mx-auto space-y-6">

        {/* --- Header Section (รวมการควบคุมและแถบเลื่อนวันที่ไว้ในกล่องเดียว) --- */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
          {/* แถวบน: หัวข้อหน้าจอ (ซ้าย) + ตัวเลือกสาขา และ ช่องค้นหา (ขวา) */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
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
                  value={filters.branchId}
                  onChange={(e) => {
                    const val = e.target.value
                    const bId = val === 'ALL' ? 'ALL' : Number(val)
                    setSelectedBranch(bId)
                    setFilters(p => ({ ...p, branchId: bId }))
                  }}
                  className="w-full pl-10 pr-9 py-2.5 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer appearance-none"
                >
                  <option value="ALL">ดูรวมทุกสาขาทั่วประเทศ</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.branch_name}
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
                  value={filters.search}
                  onChange={(e) => setFilters(p => ({ ...p, search: e.target.value }))}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 hover:bg-slate-100 focus:bg-white text-xs font-semibold text-slate-700 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            </div>
          </div>

          {/* แถวล่าง: แถบเลื่อนวันเดือน + เซลส์ + รหัสหน้า 4 ตัว + พรีเซ็ต + ป้ายตัวกรอง */}
          {!showHidden && (
            <div className="border-t border-slate-100 pt-3 space-y-2">
              <QuickDateSliderBar
                filters={filters}
                onChange={setFilters}
                onResetAll={handleResetAllFilters}
                totalResults={filteredSales.length}
                saleNames={uniqueSaleNames}
                orderPrefixes={uniquePrefixes}
              />
              <ActiveFilterBadges
                filters={filters}
                branches={branches}
                onChange={setFilters}
                onResetAll={handleResetAllFilters}
              />
            </div>
          )}
        </div>

        {/* --- Stat Cards --- */}
        {!showHidden && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
              <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-blue-500" /> ยอดขายสำเร็จ (Completed)
              </span>
              <div className="text-2xl font-black text-blue-600 mt-2">
                {totalInvoiced.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿
              </div>
              <span className="text-[10px] text-slate-400 block mt-1 font-medium">
                {selectedBranch === 'ALL' ? 'รวมทุกสาขาทั่วประเทศ' : `สาขา: ${branches.find(b => b.id === selectedBranch)?.branch_name || 'สาขาที่เลือก'}`}
              </span>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
              <span className="text-[11px] font-black text-amber-600 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-500" /> ยอดยังไม่คิดเงิน / รอจัดส่ง
              </span>
              <div className="text-2xl font-black text-amber-600 mt-2">
                {totalPending.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿
              </div>
              <span className="text-[10px] text-slate-400 block mt-1 font-medium">
                บิลที่ยังไม่ตัดสต็อก/คิดเงิน ({baseSalesForTotals.filter(s => s.status === 'PENDING').length} รายการ)
              </span>
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

            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
              <span className="text-[11px] font-black text-red-600 uppercase tracking-wider flex items-center gap-1.5">
                <XCircle className="w-3.5 h-3.5 text-red-500" /> ยอดเงินบิลยกเลิก
              </span>
              <div className="text-2xl font-black text-red-600 mt-2">
                {totalCancelled.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿
              </div>
              <span className="text-[10px] text-slate-400 block mt-1 font-medium">รวมมูลค่าบิลทั้งหมดที่ทำการยกเลิก</span>
            </div>
          </div>
        )}

        {/* --- Filter Tabs & Hidden Toggle --- */}
        {/* --- Status Filters & Hidden Toggle --- */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {!showHidden ? (
            <div className="flex gap-1.5 p-1 bg-white rounded-2xl w-full md:max-w-2xl border border-slate-100 shadow-3xs overflow-x-auto">
              <button
                type="button"
                onClick={() => setFilters(p => ({ ...p, status: 'ALL' }))}
                className={`py-2 px-3.5 text-xs font-black rounded-xl transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  filters.status === 'ALL'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                ทั้งหมด ({baseSalesForTotals.length})
              </button>
              <button
                type="button"
                onClick={() => setFilters(p => ({ ...p, status: 'COMPLETED' }))}
                className={`py-2 px-3.5 text-xs font-black rounded-xl transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  filters.status === 'COMPLETED'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                ขายสำเร็จ ({baseSalesForTotals.filter(s => s.status === 'COMPLETED').length})
              </button>
              <button
                type="button"
                onClick={() => setFilters(p => ({ ...p, status: 'PENDING' }))}
                className={`py-2 px-3.5 text-xs font-black rounded-xl transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  filters.status === 'PENDING'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                ยังไม่คิดเงิน / รอจัดส่ง ({baseSalesForTotals.filter(s => s.status === 'PENDING').length})
              </button>
              <button
                type="button"
                onClick={() => setFilters(p => ({ ...p, status: 'CANCELLED' }))}
                className={`py-2 px-3.5 text-xs font-black rounded-xl transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  filters.status === 'CANCELLED'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                ยกเลิกแล้ว ({baseSalesForTotals.filter(s => s.status === 'CANCELLED').length})
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
              handleResetAllFilters()
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
          <DraggableTableWrapper>
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 uppercase tracking-wider font-bold select-none">
                <tr>
                  {/* 1. เลขที่ใบขาย & สาขา */}
                  <th className="p-4 w-60 relative">
                    <div className="flex items-center justify-between gap-1.5">
                      <span>เลขที่ใบขาย / สาขา</span>
                      <ColumnFilterButton
                        columnKey="orderCode"
                        isActive={Boolean(filters.orderCode || (filters.orderCodePrefix && filters.orderCodePrefix !== 'ALL') || filters.branchId !== 'ALL' || filters.shippingType !== 'ALL')}
                        isOpen={openFilterColumn === 'orderCode'}
                        onClick={(e) => {
                          e.stopPropagation()
                          setOpenFilterColumn(prev => prev === 'orderCode' ? null : 'orderCode')
                        }}
                      />
                    </div>
                    {openFilterColumn === 'orderCode' && (
                      <ColumnFilterPopover
                        columnKey="orderCode"
                        filters={filters}
                        branches={branches}
                        saleNames={uniqueSaleNames}
                        orderPrefixes={uniquePrefixes}
                        onClose={() => setOpenFilterColumn(null)}
                        onChange={setFilters}
                        align="left"
                      />
                    )}
                  </th>

                  {/* 2. วันที่เปิดบิล */}
                  <th className="p-4 whitespace-nowrap relative">
                    <div className="flex items-center justify-between gap-1.5">
                      <span>วันที่เปิดบิล</span>
                      <ColumnFilterButton
                        columnKey="createdAt"
                        isActive={filters.createdDate.mode !== 'ALL'}
                        isOpen={openFilterColumn === 'createdAt'}
                        onClick={(e) => {
                          e.stopPropagation()
                          setOpenFilterColumn(prev => prev === 'createdAt' ? null : 'createdAt')
                        }}
                      />
                    </div>
                    {openFilterColumn === 'createdAt' && (
                      <ColumnFilterPopover
                        columnKey="createdAt"
                        filters={filters}
                        branches={branches}
                        saleNames={uniqueSaleNames}
                        onClose={() => setOpenFilterColumn(null)}
                        onChange={setFilters}
                        align="left"
                      />
                    )}
                  </th>

                  {/* 3. วันที่ขายจริง (ปิดบิล) */}
                  <th className="p-4 whitespace-nowrap bg-emerald-50/40 text-emerald-900 relative">
                    <div className="flex items-center justify-between gap-1.5">
                      <span>วันที่ขายจริง (ปิดบิล)</span>
                      <ColumnFilterButton
                        columnKey="completedDate"
                        isActive={filters.completedDate.mode !== 'ALL'}
                        isOpen={openFilterColumn === 'completedDate'}
                        onClick={(e) => {
                          e.stopPropagation()
                          setOpenFilterColumn(prev => prev === 'completedDate' ? null : 'completedDate')
                        }}
                      />
                    </div>
                    {openFilterColumn === 'completedDate' && (
                      <ColumnFilterPopover
                        columnKey="completedDate"
                        filters={filters}
                        branches={branches}
                        saleNames={uniqueSaleNames}
                        onClose={() => setOpenFilterColumn(null)}
                        onChange={setFilters}
                        align="left"
                      />
                    )}
                  </th>

                  {/* 4. สลิป */}
                  <th className="p-4 text-center w-24">
                    <span>สลิป</span>
                  </th>

                  {/* 5. พนักงานขาย (Sale) */}
                  <th className="p-4 relative">
                    <div className="flex items-center justify-between gap-1.5">
                      <span>พนักงานขาย (Sale)</span>
                      <ColumnFilterButton
                        columnKey="saleName"
                        isActive={filters.saleName !== 'ALL'}
                        isOpen={openFilterColumn === 'saleName'}
                        onClick={(e) => {
                          e.stopPropagation()
                          setOpenFilterColumn(prev => prev === 'saleName' ? null : 'saleName')
                        }}
                      />
                    </div>
                    {openFilterColumn === 'saleName' && (
                      <ColumnFilterPopover
                        columnKey="saleName"
                        filters={filters}
                        branches={branches}
                        saleNames={uniqueSaleNames}
                        onClose={() => setOpenFilterColumn(null)}
                        onChange={setFilters}
                        align="left"
                      />
                    )}
                  </th>

                  {/* 6. ยอดก่อนลด */}
                  <th className="p-4 text-right whitespace-nowrap">
                    <span>ยอดก่อนลด</span>
                  </th>

                  {/* 7. ส่วนลด (%) */}
                  <th className="p-4 text-right whitespace-nowrap relative">
                    <div className="flex items-center justify-end gap-1.5">
                      <span>ส่วนลด (%)</span>
                      <ColumnFilterButton
                        columnKey="discount"
                        isActive={filters.hasDiscount !== 'ALL'}
                        isOpen={openFilterColumn === 'discount'}
                        onClick={(e) => {
                          e.stopPropagation()
                          setOpenFilterColumn(prev => prev === 'discount' ? null : 'discount')
                        }}
                      />
                    </div>
                    {openFilterColumn === 'discount' && (
                      <ColumnFilterPopover
                        columnKey="discount"
                        filters={filters}
                        branches={branches}
                        saleNames={uniqueSaleNames}
                        onClose={() => setOpenFilterColumn(null)}
                        onChange={setFilters}
                        align="right"
                      />
                    )}
                  </th>

                  {/* 8. ยอดรับเงินลูกค้า (รวม VAT) */}
                  <th className="p-4 text-right whitespace-nowrap relative">
                    <div className="flex items-center justify-end gap-1.5">
                      <div>
                        <div>ยอดรับเงินลูกค้า</div>
                        <div className="text-[9px] font-medium text-slate-400 normal-case">(รวม VAT)</div>
                      </div>
                      <ColumnFilterButton
                        columnKey="totalAmount"
                        isActive={Boolean(filters.minTotalAmount || filters.maxTotalAmount)}
                        isOpen={openFilterColumn === 'totalAmount'}
                        onClick={(e) => {
                          e.stopPropagation()
                          setOpenFilterColumn(prev => prev === 'totalAmount' ? null : 'totalAmount')
                        }}
                      />
                    </div>
                    {openFilterColumn === 'totalAmount' && (
                      <ColumnFilterPopover
                        columnKey="totalAmount"
                        filters={filters}
                        branches={branches}
                        saleNames={uniqueSaleNames}
                        onClose={() => setOpenFilterColumn(null)}
                        onChange={setFilters}
                        align="right"
                      />
                    )}
                  </th>

                  {/* 9. VAT (7%) */}
                  <th className="p-4 text-right whitespace-nowrap">
                    <div>VAT (7%)</div>
                    <div className="text-[9px] font-medium text-purple-600 normal-case">(ภาษีนำส่งรัฐ)</div>
                  </th>

                  {/* 10. ยอดสาขาออกบิล */}
                  <th className="p-4 text-right whitespace-nowrap">
                    <span>ยอดสาขาออกบิล</span>
                  </th>

                  {/* 11. ยอดข้ามสาขา (Drop Ship) */}
                  <th className="p-4 text-right whitespace-nowrap relative">
                    <div className="flex items-center justify-end gap-1.5">
                      <span>ยอดข้ามสาขา (Drop Ship)</span>
                      <ColumnFilterButton
                        columnKey="dropShip"
                        isActive={filters.dropShip !== 'ALL'}
                        isOpen={openFilterColumn === 'dropShip'}
                        onClick={(e) => {
                          e.stopPropagation()
                          setOpenFilterColumn(prev => prev === 'dropShip' ? null : 'dropShip')
                        }}
                      />
                    </div>
                    {openFilterColumn === 'dropShip' && (
                      <ColumnFilterPopover
                        columnKey="dropShip"
                        filters={filters}
                        branches={branches}
                        saleNames={uniqueSaleNames}
                        onClose={() => setOpenFilterColumn(null)}
                        onChange={setFilters}
                        align="right"
                      />
                    )}
                  </th>

                  {/* 12. เงินเข้าร้าน (ก่อน VAT) */}
                  <th className="p-4 text-right whitespace-nowrap bg-emerald-50/50 relative">
                    <div className="flex items-center justify-end gap-1.5">
                      <div>
                        <div className="text-emerald-800 font-bold">เงินเข้าร้าน (ก่อน VAT)</div>
                        <div className="text-[9px] font-bold text-emerald-600 normal-case">(เงินแท้จริงที่ได้รับ)</div>
                      </div>
                      <ColumnFilterButton
                        columnKey="netBeforeVat"
                        isActive={Boolean(filters.minNetRevenue || filters.maxNetRevenue)}
                        isOpen={openFilterColumn === 'netBeforeVat'}
                        onClick={(e) => {
                          e.stopPropagation()
                          setOpenFilterColumn(prev => prev === 'netBeforeVat' ? null : 'netBeforeVat')
                        }}
                      />
                    </div>
                    {openFilterColumn === 'netBeforeVat' && (
                      <ColumnFilterPopover
                        columnKey="netBeforeVat"
                        filters={filters}
                        branches={branches}
                        saleNames={uniqueSaleNames}
                        onClose={() => setOpenFilterColumn(null)}
                        onChange={setFilters}
                        align="right"
                      />
                    )}
                  </th>

                  {/* 13. สถานะใบขาย */}
                  <th className="p-4 text-center w-32 relative">
                    <div className="flex items-center justify-center gap-1.5">
                      <span>สถานะใบขาย</span>
                      <ColumnFilterButton
                        columnKey="status"
                        isActive={filters.status !== 'ALL'}
                        isOpen={openFilterColumn === 'status'}
                        onClick={(e) => {
                          e.stopPropagation()
                          setOpenFilterColumn(prev => prev === 'status' ? null : 'status')
                        }}
                      />
                    </div>
                    {openFilterColumn === 'status' && (
                      <ColumnFilterPopover
                        columnKey="status"
                        filters={filters}
                        branches={branches}
                        saleNames={uniqueSaleNames}
                        onClose={() => setOpenFilterColumn(null)}
                        onChange={setFilters}
                        align="right"
                      />
                    )}
                  </th>

                  {/* 14. ตัวเลือก */}
                  <th className="p-2 w-12"><span className="sr-only">ตัวเลือก</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {loading ? (
                  <tr>
                    <td colSpan={14} className="p-16 text-center text-slate-400 font-bold">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                        <span>กำลังโหลดข้อมูลประวัติใบขาย...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredSales.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="p-16 text-center text-slate-400 font-bold">
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
                              : order.status === 'PENDING'
                              ? 'bg-amber-50/40 text-slate-800 border-l-amber-400 hover:bg-amber-50/70'
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

                          {/* วันที่เปิดบิล */}
                          <td className="p-4 text-slate-500 whitespace-nowrap">
                            <div className="font-semibold text-slate-600">
                              {new Date(order.createdAt).toLocaleDateString('th-TH', {
                                year: 'numeric', month: 'short', day: 'numeric',
                                hour: '2-digit', minute: '2-digit'
                              })} น.
                            </div>
                          </td>

                          {/* วันที่ขายจริง (ปิดบิล) */}
                          <td className="p-4 whitespace-nowrap bg-emerald-50/20">
                            {order.status === 'COMPLETED' ? (() => {
                              const closedAt = getCompletedDate(order)
                              const isCrossDay = closedAt && new Date(closedAt).toDateString() !== new Date(order.createdAt).toDateString()
                              const diffDays = closedAt ? Math.max(1, Math.round((new Date(closedAt).getTime() - new Date(order.createdAt).getTime()) / (1000 * 60 * 60 * 24))) : 0

                              return (
                                <div>
                                  <div className="font-bold text-emerald-700">
                                    {new Date(closedAt || order.createdAt).toLocaleDateString('th-TH', {
                                      year: 'numeric', month: 'short', day: 'numeric',
                                      hour: '2-digit', minute: '2-digit'
                                    })} น.
                                  </div>
                                  {isCrossDay && (
                                    <span className="text-[10px] text-amber-600 font-semibold block">
                                      (เปิดค้างไว้ {diffDays} วัน)
                                    </span>
                                  )}
                                </div>
                              )
                            })() : order.status === 'PENDING' ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                                <Clock className="w-3 h-3 text-amber-600" /> รอคิดเงิน
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                                <XCircle className="w-3 h-3 text-red-500" /> ยกเลิกแล้ว
                              </span>
                            )}
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

                          {/* ยอดรับเงินลูกค้า (รวม VAT) */}
                          <td className="p-4 text-right font-bold text-slate-700 text-xs whitespace-nowrap">
                            ฿{order.totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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

                          {/* ยอดก่อน VAT (เงินแท้จริงเข้าร้าน) -> ชิดขวา */}
                          <td className="p-4 text-right font-black text-emerald-600 bg-emerald-50/20 text-xs whitespace-nowrap">
                            ฿{order.netBeforeVat.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>

                          {/* สถานะบิล */}
                          <td className="p-4 text-center">
                            <span className={`inline-block px-3 py-1.5 rounded-full text-[10px] font-black shadow-2xs whitespace-nowrap ${
                              order.status === 'COMPLETED'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : order.status === 'CANCELLED'
                                ? 'bg-red-50 text-red-600 border border-red-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-300'
                            }`}>
                              {order.status === 'COMPLETED' ? (
                                <span className="flex items-center justify-center gap-1"><Check className="w-3 h-3 text-emerald-600" /> สำเร็จแล้ว</span>
                              ) : order.status === 'CANCELLED' ? (
                                <span className="flex items-center justify-center gap-1"><XCircle className="w-3 h-3 text-red-600" /> ยกเลิกแล้ว</span>
                              ) : (
                                <span className="flex items-center justify-center gap-1"><Clock className="w-3 h-3 text-amber-600" /> ยังไม่คิดเงิน</span>
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
                            <td colSpan={14} className="p-4 border-t border-slate-100">
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
                                   <div className="flex items-center gap-1.5 bg-emerald-50/70 px-2 py-0.5 rounded-lg border border-emerald-100">
                                     <span className="text-emerald-700 font-bold">เงินเข้าร้าน (ก่อน VAT):</span>
                                     <span className="font-black text-emerald-700">฿{order.netBeforeVat.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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
          </DraggableTableWrapper>
        </div>

      </div>

      {/* โมดอลพิมพ์ใบเสนอราคา / ใบเสร็จ */}
      <PrintDispatchModal orderCode={printOrderCode} onClose={() => setPrintOrderCode(null)} />
    </div>
  )
}
