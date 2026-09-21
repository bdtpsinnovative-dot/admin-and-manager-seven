import Link from "next/link"
import {
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  FileText,
  MoreHorizontal,
  Package,
  Receipt,
  Scale,
  ShoppingBag,
  Store,
  Tag,
  TrendingUp,
  User,
  XCircle,
  Trash2,
  Truck,
} from "lucide-react"
import { getDashboardData } from "../../../../actions/dashboard"
import { createClient } from "../../../../lib/supabase/server"
import DashboardVatCard from "@/components/DashboardVatCard"
import DashboardProductTable from "@/components/DashboardProductTable"
import DashboardMonthFilter from "@/components/DashboardMonthFilter"

const money = (value: number) =>
  value.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const dateTime = (value: string) =>
  new Date(value).toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

const statusClass = (status: string) => {
  if (status === "COMPLETED") return "bg-emerald-50 text-emerald-700 border-emerald-200"
  if (status === "CANCELLED") return "bg-red-50 text-red-700 border-red-200"
  return "bg-amber-50 text-amber-700 border-amber-200"
}

const statusLabel = (status: string) => {
  if (status === "COMPLETED") return "สำเร็จแล้ว"
  if (status === "CANCELLED") return "ยกเลิกแล้ว"
  if (status === "PROCESSING") return "กำลังดำเนินการ"
  return status || "ไม่ระบุสถานะ"
}

export default async function SaleDashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ month?: string | string[] }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // ดึงข้อมูลสาขาและโปรไฟล์ของ Sale
  const { data: profile } = await supabase
    .from("profiles")
    .select("branch_id, full_name, branches(id, branch_name)")
    .eq("user_id", user?.id || "")
    .single()

  const branchName = (profile?.branches as any)?.branch_name || "สาขาประจำการ"
  const staffName = profile?.full_name || "เจ้าหน้าที่ฝ่ายขาย"
  
  // คำนวณ date range จาก month param (YYYY-MM หรือ ALL)
  const monthParam = typeof params?.month === "string" ? params.month : undefined
  const isAllTime = monthParam === "ALL"
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }))
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  const selectedMonth = isAllTime ? "ALL" : (monthParam && /^\d{4}-\d{2}$/.test(monthParam) ? monthParam : defaultMonth)

  let dateFrom: string | undefined = undefined
  let dateTo: string | undefined = undefined
  let mYear = 0
  let mMonth = 0

  if (selectedMonth !== "ALL") {
    const parts = selectedMonth.split("-").map(Number)
    mYear = parts[0]
    mMonth = parts[1]
    dateFrom = `${selectedMonth}-01T00:00:00+07:00`
    const lastDay = new Date(mYear, mMonth, 0).getDate()
    dateTo = `${selectedMonth}-${String(lastDay).padStart(2, "0")}T23:59:59+07:00`
  }

  // เรียกข้อมูล Dashboard (ระบบจะกรองเฉพาะสาขาของ Sale ให้อัตโนมัติ)
  const data = await getDashboardData("ALL", dateFrom, dateTo)
  const maxMonthlySales = Math.max(...data.monthlySales.map((month) => month.amount), 1)

  // คำนวณยอดขายเฉลี่ยต่อบิล
  const avgPerBill = data.summary.billCount > 0
    ? data.summary.netSales / data.summary.billCount
    : 0

  return (
    <div className="w-full space-y-6 font-sans">
        
        {/* --- Header & Quick Actions --- */}
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-bold mb-2">
              <Building2 className="w-3.5 h-3.5" />
              <span>{branchName}</span>
            </div>
            <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
              Sales Dashboard
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              ยินดีต้อนรับคุณ <span className="font-bold text-slate-700">{staffName}</span> · สรุปภาพรวมยอดขายสาขา {branchName} {selectedMonth === "ALL" ? "(ทุกช่วงเวลา)" : ""}
            </p>
          </div>
            <div className="flex items-center gap-3 flex-wrap">
              <DashboardMonthFilter selectedMonth={selectedMonth} />
              <Link
                href="/sale/pos"
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-xl font-bold text-sm shadow-md shadow-emerald-200 hover:shadow-lg hover:from-emerald-700 hover:to-teal-800 transition-all"
              >
                <Store className="w-4 h-4" />
                เปิดหน้าร้าน POS
              </Link>
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 shadow-sm">
                <Calendar className="h-4 w-4 text-emerald-600" />
                <span>{
                  selectedMonth === "ALL"
                    ? "ทุกช่วงเวลา"
                    : new Date(mYear, mMonth - 1, 1).toLocaleDateString("th-TH", { month: "long", year: "numeric" })
                }</span>
              </div>
            </div>
        </div>

        {/* --- Error Banner (ถ้ามี) --- */}
        {data.error && (
          <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <span>{data.error}</span>
          </div>
        )}

        {/* --- ส่วนที่ 1: การ์ดสรุปการเงินหลัก (Financial Overview) 3 ใบใหญ่ ชัดเจน อ่านง่าย ไม่แสดงสมการ --- */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* 1. ยอดเรียกเก็บลูกค้าทั้งหมด */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">ยอดรับชำระจากลูกค้าสาขา {branchName}</span>
                  <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
                    <CreditCard className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-3xl sm:text-4xl font-black text-slate-800 tracking-tight">
                  ฿{money(data.summary.netSales)}
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  ยอดเงินสดและเงินโอนที่เก็บได้จริงเฉพาะสาขานี้
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">จำนวนบิลที่รับเงิน</span>
                <span className="font-bold text-slate-700">{data.summary.billCount.toLocaleString()} บิล</span>
              </div>
            </div>

            {/* 2. ภาษีมูลค่าเพิ่ม VAT 7% (คลิกเพื่อเปิด Modal แจกแจงแบบไดนามิก) */}
            <DashboardVatCard
              totalVat={data.summary.totalVat}
              vatBreakdown={data.vatBreakdown}
            />

            {/* 3. เงินที่ได้จริงเข้าร้าน (หัก VAT แล้ว) - สว่าง คลีน สะอาดตา */}
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">เงินแท้จริงเข้าร้าน (หัก VAT แล้ว)</span>
                  <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-600">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-3xl sm:text-4xl font-black text-emerald-700 tracking-tight">
                  ฿{money(data.summary.netSalesBeforeVat)}
                </div>
                <p className="mt-1 text-xs text-emerald-600/90">
                  รายรับสุทธิของสาขา {branchName} หลังหักภาษี
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-emerald-200/60 flex items-center justify-between text-xs">
                <span className="text-emerald-700">สถานะเงิน</span>
                <span className="font-bold text-emerald-700">รายรับสุทธิร้านค้า</span>
              </div>
            </div>

          </div>

          {/* --- ส่วนที่ 2: สถิติการขายและสถานะบิล (Sales & Operations) 6 ใบ สะอาดตา --- */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            
            {/* 1. ยอดรวมก่อนลด */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">ยอดรวมก่อนลด</span>
                  <ShoppingBag className="h-4 w-4 text-slate-400" />
                </div>
                <p className="mt-2 text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">฿{money(data.summary.grossSales)}</p>
              </div>
              <p className="mt-2 text-xs text-slate-400">มูลค่าสินค้าราคาป้ายเต็ม</p>
            </div>

            {/* 2. ส่วนลดรวม */}
            <div className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-orange-600">ส่วนลดรวม</span>
                  <Tag className="h-4 w-4 text-orange-500" />
                </div>
                <p className="mt-2 text-2xl sm:text-3xl font-black text-orange-600 tracking-tight">-฿{money(data.summary.totalDiscount)}</p>
              </div>
              <p className="mt-2 text-xs text-slate-400">ส่วนลดพิเศษ & โปรโมชั่น</p>
            </div>

            {/* 3. ใบขายสำเร็จ */}
            <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600">ใบขายสำเร็จ</span>
                  <FileText className="h-4 w-4 text-emerald-500" />
                </div>
                <p className="mt-2 text-3xl sm:text-4xl font-black text-slate-800 tracking-tight flex items-baseline gap-1.5">
                  <span>{data.summary.billCount.toLocaleString()}</span>
                  <span className="text-sm font-bold text-slate-400">บิล</span>
                </p>
              </div>
              <p className="mt-2 text-xs text-emerald-600 font-semibold">รับชำระเงินเรียบร้อย</p>
            </div>

            {/* 4. ยอดเฉลี่ยต่อบิล */}
            <div className="rounded-2xl border border-teal-100 bg-white p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">เฉลี่ยต่อบิล</span>
                  <TrendingUp className="h-4 w-4 text-teal-600" />
                </div>
                <p className="mt-2 text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">฿{money(avgPerBill)}</p>
              </div>
              <p className="mt-2 text-xs text-slate-400">Average Ticket Size</p>
            </div>

            {/* 5. บิลยกเลิก */}
            <div className="rounded-2xl border border-red-100 bg-white p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-red-500">บิลยกเลิก</span>
                  <XCircle className="h-4 w-4 text-red-500" />
                </div>
                <p className="mt-2 text-3xl sm:text-4xl font-black text-red-600 tracking-tight flex items-baseline gap-1.5">
                  <span>{data.summary.cancelledCount.toLocaleString()}</span>
                  <span className="text-sm font-bold text-red-400">บิล</span>
                </p>
              </div>
              <p className="mt-2 text-xs font-semibold text-red-500">มูลค่ายกเลิก: ฿{money(data.summary.cancelledSales)}</p>
            </div>

            {/* 6. สินค้าชำรุด/เสียหาย */}
            <Link 
              href="/manager/damage-history" 
              className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm hover:shadow-md hover:border-rose-300 transition-all group block flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-rose-600">สินค้าชำรุด/เสียหาย</span>
                  <Trash2 className="h-4 w-4 text-rose-500 group-hover:scale-110 transition-transform" />
                </div>
                <p className="mt-2 text-3xl sm:text-4xl font-black text-rose-600 tracking-tight flex items-baseline gap-1.5">
                  <span>{(data.damageSummary?.totalQty || 0).toLocaleString()}</span>
                  <span className="text-sm font-bold text-rose-400">ชิ้น</span>
                </p>
              </div>
              <div className="mt-2 pt-2 border-t border-rose-50 space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">ต้นทุน:</span>
                  <span className="font-bold text-slate-800">฿{money(data.damageSummary?.totalCostValue || 0)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">ราคาขาย:</span>
                  <span className="font-black text-rose-600">฿{money(data.damageSummary?.totalRetailValue || 0)}</span>
                </div>
              </div>
            </Link>

          </div>

          {/* สรุปค่าจัดส่ง (เราจ่าย vs ลูกค้าจ่าย) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-5 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-indigo-100 text-indigo-600">
                  <Truck className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-900 block">ค่าส่งที่เราออกให้ (ยอด 20k+)</span>
                  <span className="text-2xl sm:text-3xl font-black text-indigo-700">฿{money(data.shippingSummary?.companyPaidTotal || 0)}</span>
                </div>
              </div>
              <span className="text-sm font-bold text-indigo-700 bg-white border border-indigo-200 px-3 py-1.5 rounded-xl shadow-xs">
                {(data.shippingSummary?.companyPaidCount || 0).toLocaleString()} บิล
              </span>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-slate-100 text-slate-600">
                  <Truck className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">ค่าส่งที่ลูกค้าชำระ</span>
                  <span className="text-2xl sm:text-3xl font-black text-slate-800">฿{money(data.shippingSummary?.customerPaidTotal || 0)}</span>
                </div>
              </div>
              <span className="text-sm font-bold text-slate-700 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl shadow-xs">
                {(data.shippingSummary?.customerPaidCount || 0).toLocaleString()} บิล
              </span>
            </div>
          </div>
        </div>


        {/* --- 3. Charts & Top Products Row --- */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          
          {/* กราฟยอดขายรายเดือน 12 เดือน (เดิมที่ชอบ) */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800">แนวโน้มยอดขายรายเดือน (12 เดือนล่าสุด)</h3>
                <p className="text-xs text-slate-400">ยอดขายจริงเฉพาะสาขา {branchName}</p>
              </div>
              <DollarSign className="h-5 w-5 text-slate-400" />
            </div>

            <div className="mt-8 flex h-64 items-end gap-2 sm:gap-4 border-b border-slate-100 pb-2">
              {data.monthlySales.map((month, index) => {
                const heightPercent = maxMonthlySales > 0 ? (month.amount / maxMonthlySales) * 100 : 0
                return (
                  <div key={index} className="group relative flex flex-1 flex-col items-center h-full justify-end">
                    
                    {/* Hover Tooltip */}
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 scale-0 rounded-lg bg-slate-900 px-2 py-1 text-[11px] font-bold text-white shadow-md transition-all group-hover:scale-100 whitespace-nowrap z-10">
                      ฿{money(month.amount)}
                    </div>

                    {/* Bar */}
                    <div
                      style={{ height: `${Math.max(heightPercent, 2)}%` }}
                      className={`w-full max-w-[40px] rounded-t-md transition-all group-hover:opacity-80 ${
                        month.amount > 0 ? "bg-gradient-to-t from-emerald-600 to-teal-500 shadow-sm" : "bg-slate-100"
                      }`}
                    />
                    
                    {/* Label */}
                    <span className="mt-2 text-[10px] sm:text-xs font-semibold text-slate-400 truncate w-full text-center">
                      {month.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Top 5 สินค้าขายดีในสาขา */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800">สินค้าขายดีในสาขา Top 5</h3>
              <ShoppingBag className="h-5 w-5 text-slate-400" />
            </div>
            
            <div className="mt-6 space-y-4">
              {data.products.slice(0, 5).map((prod, index) => (
                <div key={prod.key} className="flex items-center justify-between border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50 text-xs font-black text-emerald-700">
                      {index + 1}
                    </span>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                      {prod.imageUrl ? (
                        <img src={prod.imageUrl} alt={prod.name} className="h-full w-full object-contain p-1" />
                      ) : (
                        <Package className="h-5 w-5 text-slate-300" />
                      )}
                    </div>
                    <div className="min-w-0 max-w-[140px]">
                      <p className="truncate text-xs font-bold text-slate-700">{prod.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{prod.sku || "-"}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-slate-800">฿{money(prod.sales)}</p>
                    <p className="text-[10px] text-emerald-600 font-bold">{prod.quantity.toLocaleString()} ชิ้น</p>
                  </div>
                </div>
              ))}

              {data.products.length === 0 && (
                <div className="py-12 text-center text-xs text-slate-400 font-medium">
                  ยังไม่มีประวัติการขายสินค้าในสาขานี้
                </div>
              )}
            </div>
          </div>

        </div>

        {/* --- 4. Product Sales Breakdown Table --- */}
        <DashboardProductTable
          products={data.products}
          title="สรุปยอดขายแยกตามสินค้าในสาขา"
          subtitle={`รายการสินค้าทั้งหมดที่มียอดขายในสาขา ${branchName} (ลำดับอยู่หน้ารูปภาพ เรียงลำดับได้ ยอดก่อน VAT ชัดเจน)`}
        />

        {/* --- 5. Recent Branch Orders Table --- */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 p-6 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-slate-800">ใบขายล่าสุดในสาขา</h3>
              <p className="text-xs text-slate-400">รายการขายที่เกิดขึ้นในสาขา {branchName} เรียงตามวันที่ขายล่าสุด</p>
            </div>
            <Link
              href="/sale/sales-history"
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
            >
              ดูประวัติการขายทั้งหมด →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[950px] w-full text-left text-sm">
              <thead className="bg-slate-50/50 text-[11px] font-black uppercase text-slate-400 tracking-wider">
                <tr>
                  <th className="px-6 py-4">รหัสใบขาย</th>
                  <th className="px-6 py-4">วันที่ / เวลา</th>
                  <th className="px-6 py-4 text-right">ยอดก่อนลด</th>
                  <th className="px-6 py-4 text-right">ส่วนลด (%)</th>
                  <th className="px-6 py-4 text-center">ค่าส่ง (ผู้จ่าย)</th>
                  <th className="px-6 py-4 text-right">
                    <div>ยอดรับเงินลูกค้า</div>
                    <div className="text-[9px] font-medium text-slate-400 normal-case">(รวม VAT)</div>
                  </th>
                  <th className="px-6 py-4 text-right">
                    <div>VAT (7%)</div>
                    <div className="text-[9px] font-medium text-purple-600 normal-case">(ภาษีนำส่งรัฐ)</div>
                  </th>
                  <th className="px-6 py-4 text-right bg-emerald-50/50">
                    <div className="text-emerald-800 font-bold">เงินเข้าร้าน (ก่อน VAT)</div>
                    <div className="text-[9px] font-bold text-emerald-600 normal-case">(เงินแท้จริงที่ได้รับ)</div>
                  </th>
                  <th className="px-6 py-4 text-center">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
                {data.recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-slate-800">
                      {order.orderCode}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {dateTime(order.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-right text-slate-500 font-medium">
                      ฿{money(order.subtotal)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {order.discountAmount > 0 ? (
                        <div className="inline-flex flex-col items-end">
                          <span className="inline-flex items-center gap-1 font-bold text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-md text-xs">
                            <Tag className="w-3 h-3" />
                            -฿{money(order.discountAmount)}
                          </span>
                          <span className="text-[10px] font-bold text-orange-500 mt-0.5">ลด {order.discountPercent}%</span>
                        </div>
                      ) : (
                        <span className="text-slate-300 font-mono text-xs">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {order.shippingCost && order.shippingCost > 0 ? (
                        order.shippingPayer === 'COMPANY' ? (
                          <span className="inline-flex items-center gap-1 font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md text-xs" title="ยอดสินค้าหลังลด >= 20,000 ทางเราออกค่าจัดส่งให้">
                            <Truck className="w-3 h-3 text-indigo-500" />
                            เราจ่าย ฿{money(order.shippingCost)}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md text-xs" title="ลูกค้าเป็นผู้ชำระค่าจัดส่ง">
                            <Truck className="w-3 h-3 text-slate-500" />
                            ลูกค้าจ่าย ฿{money(order.shippingCost)}
                          </span>
                        )
                      ) : (
                        <span className="text-slate-300 font-mono text-xs">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-slate-700">
                      ฿{money(order.totalAmount)}
                    </td>
                    <td className="px-6 py-4 text-right text-purple-700 font-medium text-xs">
                      ฿{money(order.vatAmount)}
                    </td>
                    <td className="px-6 py-4 text-right font-black text-emerald-600 bg-emerald-50/20 text-xs">
                      ฿{money(order.netBeforeVat)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-block rounded-lg border px-2.5 py-1 text-xs font-bold ${statusClass(order.status)}`}>
                        {statusLabel(order.status)}
                      </span>
                    </td>
                  </tr>
                ))}
                {data.recentOrders.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-xs text-slate-400 italic">
                      ไม่พบประวัติการขายในสาขานี้
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
    </div>
  )
}
