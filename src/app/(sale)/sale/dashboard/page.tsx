import Link from "next/link"
import {
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  FileText,
  MoreHorizontal,
  Package,
  ShoppingBag,
  Store,
  TrendingUp,
  Truck,
  User,
  XCircle,
} from "lucide-react"
import { getDashboardData } from "../../../../actions/dashboard"
import { createClient } from "../../../../lib/supabase/server"

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

export default async function SaleDashboardPage() {
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
  
  // เรียกข้อมูล Dashboard (ระบบจะกรองเฉพาะสาขาของ Sale ให้อัตโนมัติ)
  const data = await getDashboardData()
  const maxMonthlySales = Math.max(...data.monthlySales.map((month) => month.amount), 1)

  // คำนวณยอดขายเฉลี่ยต่อบิล
  const avgPerBill = data.summary.billCount > 0
    ? data.summary.netSales / data.summary.billCount
    : 0

  return (
    <div className="min-h-screen bg-[#F4F7F9] p-4 font-sans md:p-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        
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
              ยินดีต้อนรับคุณ <span className="font-bold text-slate-700">{staffName}</span> · สรุปภาพรวมยอดขายสาขา {branchName}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Link
              href="/sale/pos"
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-xl font-bold text-sm shadow-md shadow-emerald-200 hover:shadow-lg hover:from-emerald-700 hover:to-teal-800 transition-all"
            >
              <Store className="w-4 h-4" />
              เปิดหน้าร้าน POS
            </Link>
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 shadow-sm">
              <Calendar className="h-4 w-4 text-emerald-600" />
              <span>ข้อมูลสะสมทั้งหมด</span>
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

        {/* --- 1. KPI Stats Cards (4 การ์ดหลัก) --- */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          
          {/* การ์ด 1: ยอดขายสุทธิ */}
          <div className="rounded-2xl bg-slate-900 p-5 text-white shadow-sm hover:shadow-md transition-shadow">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-400">ยอดขายสุทธิสาขา</p>
            <p className="mt-2 text-3xl font-black">฿{money(data.summary.netSales)}</p>
            <p className="mt-3 text-xs text-slate-400">เฉพาะบิลขายสำเร็จในสาขา {branchName}</p>
          </div>

          {/* การ์ด 2: ใบขายสำเร็จ */}
          <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">ใบขายที่สำเร็จ</p>
              <FileText className="h-5 w-5 text-emerald-500" />
            </div>
            <p className="mt-2 text-3xl font-black text-slate-800">{data.summary.billCount.toLocaleString()} บิล</p>
            <p className="mt-3 text-xs text-slate-400">บิลที่ถูกนำมาคำนวณยอดสุทธิ</p>
          </div>

          {/* การ์ด 3: บิลยกเลิก */}
          <div className="rounded-2xl border border-red-100 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-red-500">บิลยกเลิก</p>
              <XCircle className="h-5 w-5 text-red-500" />
            </div>
            <p className="mt-2 text-3xl font-black text-red-600">{data.summary.cancelledCount.toLocaleString()} บิล</p>
            <p className="mt-3 text-xs text-red-400">มูลค่า ฿{money(data.summary.cancelledSales)}</p>
          </div>

          {/* การ์ด 4: ยอดเฉลี่ยต่อบิล */}
          <div className="rounded-2xl border border-teal-100 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">ยอดเฉลี่ยต่อบิล</p>
              <TrendingUp className="h-5 w-5 text-teal-600" />
            </div>
            <p className="mt-2 text-3xl font-black text-slate-800">฿{money(avgPerBill)}</p>
            <p className="mt-3 text-xs text-slate-400">Average Ticket Size ของสาขา</p>
          </div>

        </div>

        {/* --- 2. Quick Links Row --- */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            href="/sale/pos"
            className="flex items-center gap-4 p-4 rounded-2xl bg-white border border-slate-200 shadow-sm hover:border-emerald-500 hover:shadow-md transition-all group"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <p className="font-bold text-slate-800 text-sm">ระบบขายสินค้า (POS)</p>
              <p className="text-xs text-slate-400">เปิดบิลขายหน้าร้านและออกใบเสร็จ</p>
            </div>
          </Link>
          <Link
            href="/sale/vanguard-dispatch"
            className="flex items-center gap-4 p-4 rounded-2xl bg-white border border-slate-200 shadow-sm hover:border-blue-500 hover:shadow-md transition-all group"
          >
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <p className="font-bold text-slate-800 text-sm">มอนิเตอร์ค้างส่ง</p>
              <p className="text-xs text-slate-400">ตรวจสอบสถานะการจัดส่งสินค้า</p>
            </div>
          </Link>
          <Link
            href="/sale/publicstock"
            className="flex items-center gap-4 p-4 rounded-2xl bg-white border border-slate-200 shadow-sm hover:border-teal-500 hover:shadow-md transition-all group"
          >
            <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center group-hover:bg-teal-600 group-hover:text-white transition-colors">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <p className="font-bold text-slate-800 text-sm">สต็อกหน้าร้าน</p>
              <p className="text-xs text-slate-400">เช็คจำนวนคงเหลือของสินค้าในสาขา</p>
            </div>
          </Link>
        </div>

        {/* --- 3. Charts & Top Products Row --- */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          
          {/* กราฟยอดขายรายเดือน 12 เดือน */}
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
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 p-6">
            <h3 className="font-bold text-slate-800">สรุปยอดขายแยกตามสินค้าในสาขา</h3>
            <p className="text-xs text-slate-400">รายการสินค้าทั้งหมดที่มียอดขายในสาขา {branchName}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/50 text-[11px] font-black uppercase text-slate-400 tracking-wider">
                <tr>
                  <th className="px-6 py-4">สินค้า</th>
                  <th className="px-6 py-4 text-right">จำนวนที่ขายได้</th>
                  <th className="px-6 py-4 text-right">จำนวนบิล</th>
                  <th className="px-6 py-4 text-right">ยอดเงินรวม</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
                {data.products.map((prod) => (
                  <tr key={prod.key} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                          {prod.imageUrl ? (
                            <img src={prod.imageUrl} alt={prod.name} className="h-full w-full object-contain p-1" />
                          ) : (
                            <Package className="h-6 w-6 text-slate-300" />
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 text-sm">{prod.name}</p>
                          <p className="text-xs text-slate-400 font-mono">{prod.sku || "-"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-slate-700">
                      {prod.quantity.toLocaleString()} ชิ้น
                    </td>
                    <td className="px-6 py-4 text-right text-slate-500">
                      {prod.billCount.toLocaleString()} บิล
                    </td>
                    <td className="px-6 py-4 text-right font-black text-emerald-700">
                      ฿{money(prod.sales)}
                    </td>
                  </tr>
                ))}
                {data.products.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-xs text-slate-400 italic">
                      ไม่พบข้อมูลสินค้าที่ขายในสาขานี้
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* --- 5. Recent Branch Orders Table --- */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 p-6 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-slate-800">ใบขายล่าสุดในสาขา</h3>
              <p className="text-xs text-slate-400">รายการขายที่เกิดขึ้นในสาขา {branchName}</p>
            </div>
            <Link
              href="/sale/sales-history"
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
            >
              ดูประวัติการขายทั้งหมด →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/50 text-[11px] font-black uppercase text-slate-400 tracking-wider">
                <tr>
                  <th className="px-6 py-4">รหัสใบขาย</th>
                  <th className="px-6 py-4">วันที่ / เวลา</th>
                  <th className="px-6 py-4 text-right">ยอดรวม</th>
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
                    <td className="px-6 py-4 text-right font-black text-slate-800">
                      ฿{money(order.totalAmount)}
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
                    <td colSpan={4} className="py-12 text-center text-xs text-slate-400 italic">
                      ไม่พบประวัติการขายในสาขานี้
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}
