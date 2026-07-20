"use client"

import React, { useState, useEffect } from 'react'
import { getSalesHistory } from '@/actions/sales-check'
import { History, DollarSign, Building2, Truck, User, Check, Clock, ChevronDown, ChevronUp, Printer, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import PrintDispatchModal from '@/components/PrintDispatchModal'

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
  totalAmount: number;
  status: string;
  shippingName: string | null;
  myBranchRevenue: number;
  otherBranchRevenue: number;
  remoteDetails: RemoteDetail[];
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

export default function SaleSalesHistoryPage() {
  const [sales, setSales] = useState<SaleOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'COMPLETED' | 'CANCELLED'>('ALL')
  const [expandedOrders, setExpandedOrders] = useState<number[]>([])
  const [printOrderCode, setPrintOrderCode] = useState<string | null>(null)

  const toggleExpand = (orderId: number) => {
    setExpandedOrders(prev =>
      prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
    )
  }

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

  // ฟิลเตอร์ค้นหาจากเลขที่ใบขาย หรือ ชื่อลูกค้าจัดส่ง และสถานะที่เลือกกรอง
  const filteredSales = sales.filter(s => {
    const matchesSearch = s.orderCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.shippingName && s.shippingName.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter
    return matchesSearch && matchesStatus
  })

  // คำนวณยอดสรุปรวมทั้งหมดในหน้าจอ (ไม่รวมออเดอร์ที่ถูกยกเลิก โดยอ้างอิงตามคำค้นหา)
  const baseSalesForTotals = sales.filter(s => 
    s.orderCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.shippingName && s.shippingName.toLowerCase().includes(searchTerm.toLowerCase()))
  )
  const totalInvoiced = baseSalesForTotals.filter(s => s.status !== 'CANCELLED').reduce((sum, s) => sum + s.totalAmount, 0)
  const totalMyRevenue = baseSalesForTotals.filter(s => s.status !== 'CANCELLED').reduce((sum, s) => sum + s.myBranchRevenue, 0)
  const totalDropShip = baseSalesForTotals.filter(s => s.status !== 'CANCELLED').reduce((sum, s) => sum + s.otherBranchRevenue, 0)
  const totalCancelled = baseSalesForTotals.filter(s => s.status === 'CANCELLED').reduce((sum, s) => sum + s.totalAmount, 0)

  if (loading) return <div className="p-6 text-center font-bold text-slate-500 bg-[#F4F7F9] min-h-screen flex items-center justify-center">กำลังดึงประวัติใบขาย...</div>

  return (
    <div className="min-h-screen bg-[#F4F7F9] p-4 md:p-6 font-sans select-none pb-20">
      <div className="max-w-[1600px] mx-auto space-y-6">

        {/* หัวข้อหน้าจอ */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
              <History className="w-7 h-7 text-emerald-600" />
              ประวัติการขายหน้าร้าน
            </h1>
            <p className="text-slate-500 text-xs mt-1 font-medium">ดูรายการออเดอร์และยอดเงินแยกคลังที่เปิดบิลโดยสาขาของพนักงาน</p>
          </div>
          <div className="w-full md:w-80">
            <input
              type="text"
              placeholder="ค้นหาเลขใบขาย หรือ ชื่อลูกค้า..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-5 py-3 bg-white rounded-2xl text-xs font-semibold shadow-sm border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-slate-400" /> ยอดสุทธิใบขายรวม
            </span>
            <div className="text-2xl font-black text-emerald-600 mt-2">{totalInvoiced.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿</div>
            <span className="text-[10px] text-slate-400 block mt-1 font-medium">รวมเม็ดเงินทั้งหมดที่เรียกเก็บจากออเดอร์</span>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
            <span className="text-[11px] font-black text-red-600 uppercase tracking-wider flex items-center gap-1">
              <XCircle className="w-3.5 h-3.5 text-red-500" /> ยอดเงินบิลยกเลิก
            </span>
            <div className="text-2xl font-black text-red-600 mt-2">{totalCancelled.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿</div>
            <span className="text-[10px] text-slate-400 block mt-1 font-medium">รวมมูลค่าบิลทั้งหมดที่ทำการยกเลิก</span>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
            <span className="text-[11px] font-black text-orange-600 uppercase tracking-wider flex items-center gap-1">
              <Truck className="w-3.5 h-3.5 text-orange-600" /> ยอดจัดส่งข้ามสาขา (Drop Ship)
            </span>
            <div className="text-2xl font-black text-orange-600 mt-2">{totalDropShip.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿</div>
            <span className="text-[10px] text-slate-400 block mt-1 font-medium">ยอดเงินของสินค้าที่ต้องให้สาขาอื่นแพ็คส่ง</span>
          </div>
        </div>

        {/* แท็บกรองสถานะ */}
        <div className="flex gap-2 p-1 bg-white rounded-2xl w-full md:max-w-md border border-slate-100 shadow-3xs">
          <button
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

        {/* ตารางรายการหลัก */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 uppercase tracking-wider font-bold">
                <tr>
                  <th className="p-4 w-48">เลขที่ใบขาย / รูปแบบ</th>
                  <th className="p-4">วันที่ออกเอกสาร</th>
                  <th className="p-4">พนักงานขาย (Sale)</th>
                  <th className="p-4 text-right">ยอดคลังเรา</th>
                  <th className="p-4 text-right">ยอดคลังอื่น (Drop Ship)</th>
                  <th className="p-4 text-right">ยอดสุทธิรวม</th>
                  <th className="p-4 text-center w-32">สถานะใบขาย</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredSales.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-slate-400 font-bold">ไม่พบประวัติใบขายตามเงื่อนไขที่ค้นหา</td>
                  </tr>
                ) : (
                  filteredSales.map((order) => {
                    const isExpanded = expandedOrders.includes(order.id)
                    return (
                      <React.Fragment key={order.id}>
                        <tr
                          className={`transition-all cursor-pointer border-l-4 ${
                            order.status === 'CANCELLED'
                              ? 'bg-red-50/90 text-red-900 border-l-red-500 hover:bg-red-100/60'
                              : 'hover:bg-slate-50/50 border-l-transparent'
                          }`}
                          onClick={() => toggleExpand(order.id)}
                        >
                          {/* เลขที่ใบขาย & รูปแบบขาย */}
                          <td className="p-4 font-bold text-slate-800">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
                                <span className="text-sm font-black block truncate">{order.orderCode}</span>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPrintOrderCode(order.orderCode);
                                }}
                                className="text-[10px] text-slate-500 hover:text-emerald-600 font-bold flex items-center gap-1 transition-colors px-2 py-0.5 rounded border border-slate-200 bg-white shadow-3xs cursor-pointer shrink-0"
                                title="พิมพ์ใบเสนอราคา/ใบเสร็จ"
                              >
                                <Printer className="w-3.5 h-3.5" /> พิมพ์
                              </button>
                            </div>
                            {order.shippingName ? (
                              <span className="inline-flex items-center gap-1 mt-1 text-[10px] bg-emerald-50 text-emerald-600 font-bold px-2 py-0.5 rounded-md border border-emerald-100">
                                <Truck className="w-3 h-3 mr-0.5" /> ส่งบ้าน: {order.shippingName}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 mt-1 text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-md border border-slate-200">
                                <User className="w-3 h-3 mr-0.5" /> หิ้วกลับเอง
                              </span>
                            )}
                          </td>

                          {/* วันที่ */}
                          <td className="p-4 text-slate-500">
                            {new Date(order.createdAt).toLocaleDateString('th-TH', {
                              year: 'numeric', month: 'short', day: 'numeric',
                              hour: '2-digit', minute: '2-digit'
                            })} น.
                          </td>

                          {/* ชื่อ Sale */}
                          <td className="p-4 text-slate-700 font-bold">{order.saleName}</td>

                          {/* ยอดเงินคลังเรา */}
                          <td className="p-4 text-right font-black text-slate-800 text-sm">
                            {order.myBranchRevenue.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿
                          </td>

                          {/* ยอดเงินคลังเพื่อน (Drop Ship) */}
                          <td className={`p-4 text-right ${order.status === 'CANCELLED' ? '' : 'bg-orange-50/30'}`}>
                            {order.otherBranchRevenue > 0 ? (
                              <>
                                <span className="font-black text-orange-600 text-sm block">
                                  {order.otherBranchRevenue.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿
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
                          <td className="p-4 text-right font-black text-emerald-600 text-sm">
                            {order.totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿
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
                        {isExpanded && (
                          <tr className="bg-slate-50/30">
                            <td colSpan={7} className="p-4 border-t border-slate-100">
                              <div className="space-y-2 pl-6 pr-6">
                                <h4 className="font-bold text-xs text-slate-500 uppercase tracking-wider mb-2">รายการสินค้าในบิล:</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {order.items?.map((item: any, itemIndex: number) => (
                                    <div key={item.id || itemIndex} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                                      <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 overflow-hidden">
                                        {item.imageUrl ? (
                                          <img src={item.imageUrl} alt={item.productName} className="w-full h-full object-contain p-1" />
                                        ) : (
                                          <span className="text-[10px] text-slate-300">ไม่มีรูป</span>
                                        )}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <span className="text-xs font-bold text-slate-800 block truncate">{item.productName}</span>
                                        <span className="text-[10px] text-slate-400 block font-mono">SKU: {item.productSku || '-'} | คลัง: {item.fulfillBranchName}</span>
                                      </div>
                                      <div className="text-right shrink-0">
                                        <span className="text-xs font-black text-slate-800 block">x{item.qty}</span>
                                        <span className="text-[10px] font-bold text-emerald-600 block">{item.priceAtSale.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿</span>
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
      <PrintDispatchModal orderCode={printOrderCode} onClose={() => setPrintOrderCode(null)} />
    </div>
  )
}
