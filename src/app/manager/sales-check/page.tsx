"use client"

import { useState, useEffect, useMemo } from 'react'
import { getSalesHistory } from '@/actions/sales-check'
import { toast } from 'sonner'
import { BarChart3, DollarSign, Building2, Truck, Printer, Check, XCircle, Clock, User, ChevronDown, Tag } from 'lucide-react'
import PrintDispatchModal from '@/components/PrintDispatchModal'
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
  totalAmount: number;
  status: string;
  shippingName: string | null;
  myBranchRevenue: number;
  otherBranchRevenue: number;
  remoteDetails: RemoteDetail[];
  discountSnapshot?: any;
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

export default function SalesCheckPage() {
  const [sales, setSales] = useState<SaleOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<SalesFilters>(initialSalesFilters)
  const [openFilterColumn, setOpenFilterColumn] = useState<string | null>(null)
  const [printOrderCode, setPrintOrderCode] = useState<string | null>(null)

  useEffect(() => {
    loadSalesData()
  }, [])

  async function loadSalesData() {
    setLoading(true)
    const res = await getSalesHistory()
    if (res.success && res.data) {
      setSales(res.data)
    } else {
      toast.error("โหลดข้อมูลยอดขายล้มเหลว: " + res.error)
    }
    setLoading(false)
  }

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

  const filteredSales = useMemo(() => {
    return sales.filter(s => filterSalesOrder(s, filters))
  }, [sales, filters])

  const baseSalesForTotals = useMemo(() => {
    const filtersWithoutStatus: SalesFilters = { ...filters, status: 'ALL' }
    return sales.filter(s => filterSalesOrder(s, filtersWithoutStatus))
  }, [sales, filters])

  const totalInvoiced = baseSalesForTotals.filter(s => s.status !== 'CANCELLED').reduce((sum, s) => sum + s.totalAmount, 0)
  const totalMyRevenue = baseSalesForTotals.filter(s => s.status !== 'CANCELLED').reduce((sum, s) => sum + s.myBranchRevenue, 0)
  const totalDropShip = baseSalesForTotals.filter(s => s.status !== 'CANCELLED').reduce((sum, s) => sum + s.otherBranchRevenue, 0)
  const totalCancelled = baseSalesForTotals.filter(s => s.status === 'CANCELLED').reduce((sum, s) => sum + s.totalAmount, 0)

  const handleResetAllFilters = () => {
    setFilters(initialSalesFilters)
  }

  if (loading) return <div className="p-6 text-center font-bold text-slate-500 bg-[#F4F7F9] min-h-screen flex items-center justify-center">กำลังดึงประวัติใบขาย...</div>

  return (
    <div className="min-h-screen bg-[#F4F7F9] p-4 md:p-6 font-sans select-none pb-20">
      <div className="max-w-[1600px] mx-auto space-y-6">

        {/* --- หัวข้อหน้าจอ & แผงควบคุมตัวกรอง (รวมเป็นกล่องเดียว) --- */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
          {/* แถวบน: หัวข้อหน้าจอ (ซ้าย) + ช่องค้นหา (ขวา) */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                <BarChart3 className="w-7 h-7 text-blue-600" />
                ตรวจสอบประวัติใบขาย
              </h1>
              <p className="text-slate-500 text-xs mt-1 font-medium">ดูรายการออเดอร์และยอดเงินแยกคลังที่เปิดบิลโดยสาขาของนาย</p>
            </div>
            <div className="w-full md:w-80">
              <input
                type="text"
                placeholder="ค้นหาเลขใบขาย หรือ ชื่อลูกค้า..."
                value={filters.search}
                onChange={(e) => setFilters(p => ({ ...p, search: e.target.value }))}
                className="w-full px-5 py-2.5 bg-slate-50 hover:bg-slate-100 focus:bg-white text-xs font-semibold text-slate-700 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          {/* แถวล่าง: แถบเลื่อนวันเดือน + เซลส์ + รหัสหน้า 4 ตัว + พรีเซ็ต + ป้ายตัวกรอง */}
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
              branches={[]}
              onChange={setFilters}
              onResetAll={handleResetAllFilters}
            />
          </div>
        </div>

        {/* ✨ Stat Cards: แผงสรุปกองเงินเพื่อให้บัญชีดูยอดรวมไวๆ */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-blue-500" /> ยอดสุทธิใบขายรวม
            </span>
            <div className="text-2xl font-black text-blue-600 mt-2">{totalInvoiced.toLocaleString()} ฿</div>
            <span className="text-[10px] text-slate-400 block mt-1 font-medium">รวมเม็ดเงินทั้งหมดที่เรียกเก็บจากออเดอร์</span>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
            <span className="text-[11px] font-black text-red-600 uppercase tracking-wider flex items-center gap-1.5 flex-row">
              <XCircle className="w-3.5 h-3.5 text-red-500" /> ยอดเงินบิลยกเลิก
            </span>
            <div className="text-2xl font-black text-red-600 mt-2">{totalCancelled.toLocaleString()} ฿</div>
            <span className="text-[10px] text-slate-400 block mt-1 font-medium">รวมมูลค่าบิลทั้งหมดที่ทำการยกเลิก</span>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
            <span className="text-[11px] font-black text-orange-600 uppercase tracking-wider flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-orange-500" /> ยอดจัดส่งข้ามสาขา (Drop Ship)
            </span>
            <div className="text-2xl font-black text-orange-600 mt-2">{totalDropShip.toLocaleString()} ฿</div>
            <span className="text-[10px] text-slate-400 block mt-1 font-medium">ยอดเงินของสินค้าที่ต้องให้สาขาอื่นแพ็คส่ง</span>
          </div>
        </div>

        {/* แท็บกรองสถานะ */}
        <div className="flex gap-2 p-1 bg-white rounded-2xl w-full md:max-w-md border border-slate-100 shadow-3xs overflow-x-auto">
          <button
            type="button"
            onClick={() => setFilters(p => ({ ...p, status: 'ALL' }))}
            className={`flex-1 py-2 px-4 text-xs font-black rounded-xl transition-all cursor-pointer whitespace-nowrap ${
              filters.status === 'ALL'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            ทั้งหมด ({baseSalesForTotals.length})
          </button>
          <button
            type="button"
            onClick={() => setFilters(p => ({ ...p, status: 'COMPLETED' }))}
            className={`flex-1 py-2 px-4 text-xs font-black rounded-xl transition-all cursor-pointer whitespace-nowrap ${
              filters.status === 'COMPLETED'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            ขายสำเร็จ ({baseSalesForTotals.filter(s => s.status === 'COMPLETED').length})
          </button>
          <button
            type="button"
            onClick={() => setFilters(p => ({ ...p, status: 'CANCELLED' }))}
            className={`flex-1 py-2 px-4 text-xs font-black rounded-xl transition-all cursor-pointer whitespace-nowrap ${
              filters.status === 'CANCELLED'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            ยกเลิกแล้ว ({baseSalesForTotals.filter(s => s.status === 'CANCELLED').length})
          </button>
        </div>

        {/* ตารางรายการหลัก */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <DraggableTableWrapper>
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 uppercase tracking-wider font-bold select-none">
                <tr>
                  {/* 1. เลขที่ใบขาย / รูปแบบ */}
                  <th className="p-4 w-48 relative">
                    <div className="flex items-center justify-between gap-1.5">
                      <span>เลขที่ใบขาย / รูปแบบ</span>
                      <ColumnFilterButton
                        columnKey="orderCode"
                        isActive={Boolean(filters.orderCode || (filters.orderCodePrefix && filters.orderCodePrefix !== 'ALL') || filters.shippingType !== 'ALL')}
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
                        branches={[]}
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
                        branches={[]}
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
                        branches={[]}
                        saleNames={uniqueSaleNames}
                        onClose={() => setOpenFilterColumn(null)}
                        onChange={setFilters}
                        align="left"
                      />
                    )}
                  </th>

                  {/* 4. พนักงานขาย (Sale) */}
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
                        branches={[]}
                        saleNames={uniqueSaleNames}
                        onClose={() => setOpenFilterColumn(null)}
                        onChange={setFilters}
                        align="left"
                      />
                    )}
                  </th>

                  {/* 5. ยอดคลังเรา */}
                  <th className="p-4 text-right">ยอดคลังเรา</th>

                  {/* 6. ยอดคลังอื่น (Drop Ship) */}
                  <th className="p-4 text-right whitespace-nowrap relative">
                    <div className="flex items-center justify-end gap-1.5">
                      <span>ยอดคลังอื่น (Drop Ship)</span>
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
                        branches={[]}
                        saleNames={uniqueSaleNames}
                        onClose={() => setOpenFilterColumn(null)}
                        onChange={setFilters}
                        align="right"
                      />
                    )}
                  </th>

                  {/* 7. ยอดสุทธิรวม */}
                  <th className="p-4 text-right whitespace-nowrap relative">
                    <div className="flex items-center justify-end gap-1.5">
                      <span>ยอดสุทธิรวม</span>
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
                        branches={[]}
                        saleNames={uniqueSaleNames}
                        onClose={() => setOpenFilterColumn(null)}
                        onChange={setFilters}
                        align="right"
                      />
                    )}
                  </th>

                  {/* 8. สถานะใบขาย */}
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
                        branches={[]}
                        saleNames={uniqueSaleNames}
                        onClose={() => setOpenFilterColumn(null)}
                        onChange={setFilters}
                        align="right"
                      />
                    )}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredSales.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-12 text-center text-slate-400 font-bold">ไม่พบประวัติใบขายตามเงื่อนไขที่ค้นหา</td>
                  </tr>
                ) : (
                  filteredSales.map((order) => (
                    <tr
                      key={order.id}
                      className={`transition-all border-l-4 ${
                        order.status === 'CANCELLED'
                          ? 'bg-red-50/90 text-red-900 border-l-red-500 hover:bg-red-100/60'
                          : 'hover:bg-slate-50/50 border-l-transparent'
                      }`}
                    >
                      {/* เลขที่ใบขาย & รูปแบบขาย */}
                      <td className="p-4 font-bold text-slate-800">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-black block">{order.orderCode}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPrintOrderCode(order.orderCode);
                            }}
                            className="text-[10px] text-slate-500 hover:text-blue-600 font-bold flex items-center gap-1 transition-colors px-2 py-0.5 rounded border border-slate-200 bg-white shadow-3xs cursor-pointer"
                            title="พิมพ์ใบเสนอราคา/ใบเสร็จ"
                          >
                            <Printer className="w-3.5 h-3.5" /> พิมพ์
                          </button>
                        </div>
                        {order.shippingName ? (
                          <span className="inline-flex items-center gap-1 mt-1 text-[10px] bg-blue-50 text-blue-600 font-bold px-2 py-0.5 rounded-md border border-blue-100">
                            🚚 ส่งบ้าน: {order.shippingName}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 mt-1 text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-md border border-slate-200">
                            🙋‍♂️ หิ้วกลับเอง
                          </span>
                        )}
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

                      {/* ชื่อ Sale */}
                      <td className="p-4 text-slate-700 font-bold">{order.saleName}</td>

                      {/* ยอดเงินคลังเรา */}
                      <td className="p-4 text-right font-black text-slate-800 text-sm">
                        {order.myBranchRevenue.toLocaleString()} ฿
                      </td>

                      {/* ยอดเงินคลังเพื่อน (Drop Ship) */}
                      <td className={`p-4 text-right ${order.status === 'CANCELLED' ? '' : 'bg-orange-50/30'}`}>
                        {order.otherBranchRevenue > 0 ? (
                          <>
                            <span className="font-black text-orange-600 text-sm block">
                              {order.otherBranchRevenue.toLocaleString()} ฿
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

                      {/* ยอดสุทธิรวมของบิล */}
                      <td className="p-4 text-right font-black text-blue-600 text-sm">
                        {order.totalAmount.toLocaleString()} ฿
                      </td>

                      {/* สถานะบิล */}
                      <td className="p-4 text-center">
                        <span className={`inline-block px-3 py-1.5 rounded-full text-[10px] font-black shadow-sm ${order.status === 'COMPLETED'
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
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </DraggableTableWrapper>
        </div>

      </div>
      <PrintDispatchModal orderCode={printOrderCode} onClose={() => setPrintOrderCode(null)} />
    </div>
  )
}