"use client"

import { useState, useEffect } from 'react'
import { getSalesHistory } from '@/actions/sales-check'
import { toast } from 'sonner'
import { BarChart3, DollarSign, Building2, Truck, Printer } from 'lucide-react'
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
}

export default function SalesCheckPage() {
  const [sales, setSales] = useState<SaleOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [printOrderCode, setPrintOrderCode] = useState<string | null>(null)

  useEffect(() => {
    loadSalesData()
  }, [])

  async function loadSalesData() {
    setLoading(true) // ✨ แก้บั๊ก setLoading ให้แล้วครับนาย
    const res = await getSalesHistory()
    if (res.success && res.data) {
      setSales(res.data)
    } else {
      toast.error("โหลดข้อมูลยอดขายล้มเหลว: " + res.error)
    }
    setLoading(false)
  }

  // ฟิลเตอร์ค้นหาจากเลขที่ใบขาย หรือ ชื่อลูกค้าจัดส่ง
  const filteredSales = sales.filter(s =>
    s.orderCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.shippingName && s.shippingName.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  // ✨ คำนวณยอดสรุปรวมทั้งหมดในหน้าจอ
  const totalInvoiced = filteredSales.reduce((sum, s) => sum + s.totalAmount, 0)
  const totalMyRevenue = filteredSales.reduce((sum, s) => sum + s.myBranchRevenue, 0)
  const totalDropShip = filteredSales.reduce((sum, s) => sum + s.otherBranchRevenue, 0)

  if (loading) return <div className="p-6 text-center font-bold text-slate-500 bg-[#F4F7F9] min-h-screen flex items-center justify-center">กำลังดึงประวัติใบขาย...</div>

  return (
    <div className="min-h-screen bg-[#F4F7F9] p-4 md:p-6 font-sans select-none pb-20">
      <div className="max-w-[1600px] mx-auto space-y-6">

        {/* หัวข้อหน้าจอ */}
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
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-5 py-3 bg-white rounded-2xl text-xs font-semibold shadow-sm border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
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
            <span className="text-[11px] font-black text-emerald-600 uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-emerald-500" /> ยอดเงินเข้าคลังเรา
            </span>
            <div className="text-2xl font-black text-emerald-600 mt-2">{totalMyRevenue.toLocaleString()} ฿</div>
            <span className="text-[10px] text-slate-400 block mt-1 font-medium">ยอดขายที่เป็นสินค้าจากสต็อกสาขาตัวเอง</span>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
            <span className="text-[11px] font-black text-orange-600 uppercase tracking-wider flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-orange-500" /> ยอดจัดส่งข้ามสาขา (Drop Ship)
            </span>
            <div className="text-2xl font-black text-orange-600 mt-2">{totalDropShip.toLocaleString()} ฿</div>
            <span className="text-[10px] text-slate-400 block mt-1 font-medium">ยอดเงินของสินค้าที่ต้องให้สาขาอื่นแพ็คส่ง</span>
          </div>
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
                  filteredSales.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
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
                        {order.myBranchRevenue.toLocaleString()} ฿
                      </td>

                      {/* ยอดเงินคลังเพื่อน (Drop Ship) */}
                      <td className="p-4 text-right bg-orange-50/30">
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
                            : 'bg-amber-50 text-amber-600 border border-amber-200 animate-pulse'
                          }`}>
                          {order.status === 'COMPLETED' ? '✓ สำเร็จแล้ว' : '⏳ รอสาขาแพ็ค'}
                        </span>
                      </td>
                    </tr>
                  ))
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