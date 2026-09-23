"use client"

import { useState, useEffect, useCallback } from "react"
import { 
  Receipt, Search, RefreshCcw, Eye, ChevronLeft, ChevronRight, Store, User 
} from "lucide-react"

// Import Server Actions
import { getReceipts, getSaleItems, getBranches, type SaleRecord, type SaleItem } from "@/actions/receipt"

// --- Helper Functions ---
const fmtMoney = (n: number | null) => 
  new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(Number(n || 0))

const fmtDT = (d: string) => 
  new Intl.DateTimeFormat("th-TH", { 
    year: '2-digit', month: 'short', day: 'numeric', 
    hour: '2-digit', minute: '2-digit' 
  }).format(new Date(d))

export default function AdminReceiptPage() {
  // --- State ---
  const [loading, setLoading] = useState(true)
  const [sales, setSales] = useState<SaleRecord[]>([])
  const [branches, setBranches] = useState<{id: number, branch_name: string}[]>([])
  
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const pageSize = 15
  
  const [searchQ, setSearchQ] = useState("")
  const [filterDate, setFilterDate] = useState("")
  const [filterPay, setFilterPay] = useState("ALL")
  const [filterBranch, setFilterBranch] = useState("ALL")

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedSale, setSelectedSale] = useState<SaleRecord | null>(null)
  const [saleItems, setSaleItems] = useState<SaleItem[]>([])
  const [itemsLoading, setItemsLoading] = useState(false)

  // --- 1. Load Branches ---
  useEffect(() => {
    getBranches().then(data => setBranches(data))
  }, [])

  // --- 2. Fetch Sales ---
  const fetchSales = useCallback(async () => {
    setLoading(true)
    
    const { data, count, error } = await getReceipts(page, pageSize, {
        search: searchQ,
        date: filterDate,
        payment: filterPay,
        branch: filterBranch
    })

    if (error) {
        alert("เกิดข้อผิดพลาดในการดึงข้อมูล: " + error)
    } else {
        setSales(data)
        setTotalCount(count)
    }
    
    setLoading(false)
  }, [page, searchQ, filterDate, filterPay, filterBranch])

  useEffect(() => { 
      const timer = setTimeout(() => {
          fetchSales()
      }, 500)
      return () => clearTimeout(timer)
  }, [fetchSales])

  // --- 3. View Detail ---
  const openDetail = async (sale: SaleRecord) => {
    setSelectedSale(sale)
    setIsModalOpen(true)
    setItemsLoading(true)
    
    const { data } = await getSaleItems(sale.id)
    setSaleItems(data)
    
    setItemsLoading(false)
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 p-6 min-h-screen bg-slate-50">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Receipt className="w-7 h-7 text-blue-600" />
            ตรวจสอบใบเสร็จ (Hidden Backend)
          </h1>
          <p className="text-slate-500 text-sm">ข้อมูลปลอดภัยด้วย Server Actions</p>
        </div>
        <button onClick={fetchSales} className="p-2 text-slate-400 hover:text-blue-600 bg-white border rounded-lg shadow-sm">
          <RefreshCcw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Branch Filter */}
            <div className="relative">
                <Store className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <select 
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer appearance-none"
                  value={filterBranch}
                  onChange={(e) => { setFilterBranch(e.target.value); setPage(1); }}
                >
                  <option value="ALL">ทุกสาขา</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.branch_name}</option>
                  ))}
                </select>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input 
                  type="text" 
                  placeholder="เลขที่บิล..." 
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100"
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
                />
            </div>
            
            {/* Date */}
            <input 
              type="date" 
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100"
              value={filterDate}
              onChange={(e) => { setFilterDate(e.target.value); setPage(1); }}
            />

            {/* Payment */}
            <select 
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer"
              value={filterPay}
              onChange={(e) => { setFilterPay(e.target.value); setPage(1); }}
            >
               <option value="ALL">ทุกช่องทาง</option>
               <option value="CASH">เงินสด</option>
               <option value="PROMPTPAY">สแกนจ่าย</option>
            </select>
          </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto min-h-[400px]">
            <table className="min-w-full">
               <thead className="bg-slate-50/50 border-b border-slate-100">
  <tr className="text-left text-[11px] uppercase tracking-widest text-slate-400 font-bold">
      <th className="px-6 py-4">สาขา</th>
      <th className="px-6 py-4">วัน-เวลา</th>
      <th className="px-6 py-4">เลขที่ใบเสร็จ</th>
      <th className="px-6 py-4">ผู้ขาย</th>
      <th className="px-6 py-4 text-right">ยอดสุทธิ</th>
      <th className="px-6 py-4 text-center">ดู</th>
  </tr>
</thead>
               <tbody className="divide-y divide-slate-50">
                  {sales.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-20 text-center text-slate-400 italic">
                        {loading ? "กำลังโหลดข้อมูล..." : "ไม่พบข้อมูลรายการขาย"}
                      </td>
                    </tr>
                  ) : (
                    sales.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 text-sm font-bold text-blue-600">
                          {r.branches?.branch_name || "-"}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500 font-mono">
                          {fmtDT(r.sold_at)}
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-slate-700 font-mono">
                          {r.receipt_no}
                        </td>
                        
                        {/* ✅ แสดงชื่อผู้ขาย cashier_name */}
                        <td className="px-6 py-4 text-sm text-slate-600 font-medium">
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                                    <User className="w-3 h-3"/>
                                </div>
                                {r.cashier_name || "ไม่ระบุ"}
                            </div>
                        </td>

                        <td className="px-6 py-4 text-right text-sm font-bold text-slate-800">
                          {fmtMoney(r.total)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button onClick={() => openDetail(r)} className="p-2 text-slate-400 hover:text-blue-600">
                             <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
               </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/30">
            <span className="text-xs font-bold text-slate-400 uppercase">หน้า {page} / {totalPages} (รวม {totalCount} รายการ)</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1} className="p-2 bg-white border rounded-lg disabled:opacity-50"><ChevronLeft className="w-4 h-4"/></button>
              <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages} className="p-2 bg-white border rounded-lg disabled:opacity-50"><ChevronRight className="w-4 h-4"/></button>
            </div>
          </div>
      </div>

      {/* Modal Detail */}
      {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setIsModalOpen(false)}>
              <div className="bg-white rounded-2xl w-full max-w-2xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
                  <h2 className="text-xl font-bold mb-4">รายละเอียดใบเสร็จ {selectedSale?.receipt_no}</h2>
                  {itemsLoading ? (
                      <div className="py-10 text-center text-slate-400">กำลังโหลดรายการ...</div>
                  ) : (
                      <table className="w-full text-sm">
                          <thead>
                              <tr className="border-b text-left text-slate-500"><th className="py-2">สินค้า</th><th className="py-2 text-right">ราคา</th><th className="py-2 text-right">จำนวน</th><th className="py-2 text-right">รวม</th></tr>
                          </thead>
                          <tbody>
                              {saleItems.map(item => (
                                  <tr key={item.id} className="border-b border-slate-100">
                                      <td className="py-2">{item.product_name}</td>
                                      <td className="py-2 text-right">{fmtMoney(item.unit_price)}</td>
                                      <td className="py-2 text-right">{item.qty}</td>
                                      <td className="py-2 text-right">{fmtMoney(item.line_total)}</td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  )}
                  <div className="mt-6 flex justify-end">
                      <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-slate-100 rounded-lg text-slate-700 font-bold hover:bg-slate-200">ปิดหน้าต่าง</button>
                  </div>
              </div>
          </div>
      )}

    </div>
  )
}