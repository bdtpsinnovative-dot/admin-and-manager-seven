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
  Tag,
  TrendingUp,
  XCircle,
  Trash2,
} from "lucide-react"
import { getDashboardData } from "../../../../actions/dashboard"
import { createClient } from "../../../../lib/supabase/server"
import DashboardVatCard from "@/components/DashboardVatCard"
import DashboardProductTable from "@/components/DashboardProductTable"
import DashboardMonthFilter from "@/components/DashboardMonthFilter"
import DashboardDamageCard from "@/components/DashboardDamageCard"

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

export default async function ManagerDashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ month?: string | string[] }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // ดึงข้อมูลสาขาของ Manager
  const { data: profile } = await supabase
    .from("profiles")
    .select("branch_id, branches(id, branch_name)")
    .eq("user_id", user?.id || "")
    .single()

  const branchName = (profile?.branches as any)?.branch_name || "สาขาประจำการ"
  
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

  // เรียกข้อมูล Dashboard (ระบบจะกรองเฉพาะสาขาของ Manager ให้อัตโนมัติ)
  const data = await getDashboardData("ALL", dateFrom, dateTo)
  const maxMonthlySales = Math.max(...data.monthlySales.map((month) => month.amount), 1)

  // คำนวณยอดขายเฉลี่ยต่อบิล
  const avgPerBill = data.summary.billCount > 0
    ? data.summary.netSales / data.summary.billCount
    : 0

  return (
    <div className="w-full space-y-6 font-sans">
        
        {/* --- Header --- */}
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-blue-100/80 text-blue-800 text-xs font-bold mb-2">
              <Building2 className="w-3.5 h-3.5" />
              <span>{branchName}</span>
            </div>
            <h1 className="text-2xl font-black text-slate-800">Manager Dashboard</h1>
            <p className="mt-1 text-sm text-slate-500">
              ภาพรวมยอดขายและข้อมูลการดำเนินงานเฉพาะสาขา {branchName} {selectedMonth === "ALL" ? "(ทุกช่วงเวลา)" : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <DashboardMonthFilter selectedMonth={selectedMonth} />
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 shadow-sm">
              <Calendar className="h-4 w-4 text-blue-600" />
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
            <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600">ใบขายสำเร็จ</span>
                  <FileText className="h-4 w-4 text-blue-500" />
                </div>
                <p className="mt-2 text-3xl sm:text-4xl font-black text-slate-800 tracking-tight flex items-baseline gap-1.5">
                  <span>{data.summary.billCount.toLocaleString()}</span>
                  <span className="text-sm font-bold text-slate-400">บิล</span>
                </p>
              </div>
              <p className="mt-2 text-xs text-emerald-600 font-semibold">รับชำระเงินเรียบร้อย</p>
            </div>

            {/* 4. ยอดขายเฉลี่ยต่อบิล */}
            <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">เฉลี่ยต่อบิล</span>
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                </div>
                <p className="mt-2 text-2xl sm:text-3xl font-black text-emerald-600 tracking-tight">฿{money(avgPerBill)}</p>
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
            <DashboardDamageCard damageSummary={data.damageSummary} />

          </div>
        </div>

        {/* --- 2. กราฟยอดขายรายเดือน & สินค้าขายดี Top 5 --- */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          
          {/* กราฟแนวโน้มยอดขาย (เดิม) */}
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm xl:col-span-2">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-800">แนวโน้มยอดขายรายเดือน</h2>
                <p className="mt-1 text-xs text-slate-400">ยอดสุทธิของสาขา {branchName} ย้อนหลัง 12 เดือน</p>
              </div>
              <MoreHorizontal className="h-5 w-5 text-slate-300" />
            </div>
            <div className="flex h-64 items-end gap-2 sm:gap-3">
              {data.monthlySales.map((month) => (
                <div key={month.label} className="group flex h-full flex-1 flex-col items-center justify-end gap-2">
                  <div className="relative flex h-full w-full items-end">
                    <div
                      className="w-full rounded-t-lg bg-blue-100 transition-colors group-hover:bg-blue-600"
                      style={{ height: `${Math.max((month.amount / maxMonthlySales) * 100, month.amount ? 4 : 1)}%` }}
                    >
                      <span className="absolute -top-8 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-slate-800 px-2 py-1 text-[10px] font-bold text-white group-hover:block z-10">
                        ฿{money(month.amount)}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400">{month.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* สรุปสินค้าขายดี 5 อันดับแรก */}
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-black text-slate-800">สินค้าขายดีในสาขา</h2>
            <p className="mt-1 text-xs text-slate-400">เรียงตามยอดขายสุทธิสูงสุด</p>
            <div className="mt-5 space-y-4">
              {data.products.slice(0, 5).map((product, index) => (
                <div key={product.key} className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-black text-slate-500">
                    {index + 1}
                  </span>
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.name} className="h-full w-full object-contain p-1" />
                    ) : (
                      <Package className="h-5 w-5 text-slate-300" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-700">{product.name}</p>
                    <p className="text-[11px] text-slate-400">ขายได้ {product.quantity.toLocaleString()} ชิ้น ({product.billCount} บิล)</p>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-blue-500"
                        style={{
                          width: `${data.products[0]?.sales ? (product.sales / data.products[0].sales) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                  <span className="text-xs font-black text-blue-600 whitespace-nowrap">฿{money(product.sales)}</span>
                </div>
              ))}
              {data.products.length === 0 && (
                <p className="py-12 text-center text-sm text-slate-400">ยังไม่มีข้อมูลยอดขายสินค้าในสาขานี้</p>
              )}
            </div>
          </div>
        </div>

        {/* --- 3. ตารางสรุปยอดขายรายสินค้า (Product Sales Breakdown) --- */}
        <DashboardProductTable
          products={data.products}
          title="สรุปยอดขายแยกตามสินค้า"
          subtitle={`รายการสินค้าทั้งหมดที่ขายได้ในสาขา ${branchName} (ลำดับอยู่หน้ารูปภาพ เรียงลำดับได้ ยอดก่อน VAT ชัดเจน)`}
        />

        {/* --- 4. ตารางใบขายล่าสุดของสาขา (Recent Branch Orders) --- */}
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-2 border-b border-slate-100 p-6 md:flex-row md:items-center">
            <div>
              <h2 className="text-lg font-black text-slate-800">ใบขายล่าสุดในสาขา</h2>
              <p className="mt-1 text-xs text-slate-400">รายการใบขายที่เกิดขึ้นในสาขา {branchName} เรียงตามวันที่ขายล่าสุด</p>
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
              <CheckCircle2 className="h-4 w-4" /> อัปเดตข้อมูลจริง
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[950px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-bold border-b border-slate-100">
                <tr>
                  <th className="px-5 py-4">เลขที่ใบขาย</th>
                  <th className="px-5 py-4">สาขา</th>
                  <th className="px-5 py-4">วันที่ออกบิล</th>
                  <th className="px-5 py-4 text-right">ยอดก่อนลด</th>
                  <th className="px-5 py-4 text-right">ส่วนลด (%)</th>
                  <th className="px-4 py-4 text-right">
                    <div>ยอดรับเงินลูกค้า</div>
                    <div className="text-[9px] font-medium text-slate-400 normal-case">(รวม VAT)</div>
                  </th>
                  <th className="px-4 py-4 text-right">
                    <div>VAT (7%)</div>
                    <div className="text-[9px] font-medium text-purple-600 normal-case">(ภาษีนำส่งรัฐ)</div>
                  </th>
                  <th className="px-5 py-4 text-right bg-emerald-50/50">
                    <div className="text-emerald-800 font-bold">เงินเข้าร้าน (ก่อน VAT)</div>
                    <div className="text-[9px] font-bold text-emerald-600 normal-case">(เงินแท้จริงที่ได้รับ)</div>
                  </th>
                  <th className="px-5 py-4 text-center">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.recentOrders.map((order) => (
                  <tr key={order.id} className="transition-colors hover:bg-slate-50">
                    <td className="px-5 py-4 font-black text-slate-800">{order.orderCode}</td>
                    <td className="px-5 py-4 font-bold text-blue-600">{order.branchName}</td>
                    <td className="px-5 py-4 text-xs text-slate-500">{dateTime(order.createdAt)}</td>
                    <td className="px-5 py-4 text-right text-slate-600 font-medium">฿{money(order.subtotal)}</td>
                    <td className="px-5 py-4 text-right">
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
                    <td className="px-4 py-4 text-right font-bold text-slate-700">฿{money(order.totalAmount)}</td>
                    <td className="px-4 py-4 text-right text-purple-700 font-medium text-xs">
                      ฿{money(order.vatAmount)}
                    </td>
                    <td className="px-5 py-4 text-right font-black text-emerald-600 bg-emerald-50/20 text-xs">
                      ฿{money(order.netBeforeVat)}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black ${statusClass(order.status)}`}>
                        {statusLabel(order.status)}
                      </span>
                    </td>
                  </tr>
                ))}
                {data.recentOrders.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-5 py-16 text-center text-slate-400">
                      ยังไม่มีใบขายในสาขานี้
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