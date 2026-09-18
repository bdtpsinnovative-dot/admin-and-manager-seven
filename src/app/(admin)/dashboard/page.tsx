import Link from "next/link"
import {
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  Coins,
  CreditCard,
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
import { getDashboardData, type DashboardBranchSummary } from "../../../actions/dashboard"
import DashboardBranchFilter from "../../../components/DashboardBranchFilter"
import DashboardMonthFilter from "../../../components/DashboardMonthFilter"
import DashboardVatCard from "../../../components/DashboardVatCard"
import DashboardTopBranches from "../../../components/DashboardTopBranches"
import DashboardProductTable from "../../../components/DashboardProductTable"

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

function BranchRow({ branch }: { branch: DashboardBranchSummary }) {
  const discountPercent = branch.grossSales > 0 ? Math.round((branch.totalDiscount / branch.grossSales) * 1000) / 10 : 0

  return (
    <tr className="transition-colors hover:bg-slate-50">
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Building2 className="h-4 w-4" />
          </div>
          <div>
            <p className="font-bold text-slate-800">{branch.name}</p>
            <p className="text-[11px] text-slate-400">รหัสสาขา {branch.id}</p>
          </div>
        </div>
      </td>
      <td className="px-5 py-4 text-right font-bold text-slate-700">{branch.billCount.toLocaleString()}</td>
      <td className="px-5 py-4 text-right font-medium text-slate-700">฿{money(branch.grossSales)}</td>
      <td className="px-5 py-4 text-right">
        {branch.totalDiscount > 0 ? (
          <div className="inline-flex flex-col items-end">
            <span className="inline-flex items-center gap-1 font-bold text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-md text-xs">
              <Tag className="w-3 h-3" />
              -฿{money(branch.totalDiscount)}
            </span>
            <span className="text-[10px] font-bold text-orange-500 mt-0.5">ลด {discountPercent}%</span>
          </div>
        ) : (
          <span className="text-slate-300 font-mono text-xs">-</span>
        )}
      </td>
      <td className="px-5 py-4 text-right font-semibold text-slate-700">฿{money(branch.netBeforeVat)}</td>
      <td className="px-5 py-4 text-right font-medium text-purple-700">฿{money(branch.totalVat)}</td>
      <td className="px-5 py-4 text-right font-black text-emerald-600">฿{money(branch.netSales)}</td>
      <td className="px-5 py-4 text-right">
        {branch.cancelledCount > 0 ? (
          <span className="font-bold text-red-600">{branch.cancelledCount} บิล · ฿{money(branch.cancelledSales)}</span>
        ) : (
          <span className="text-slate-300">-</span>
        )}
      </td>
      <td className="px-5 py-4 text-right text-xs text-slate-400">
        {branch.lastSaleAt ? dateTime(branch.lastSaleAt) : "ยังไม่มีรายการ"}
      </td>
    </tr>
  )
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ branch?: string | string[]; month?: string | string[] }>
}) {
  const params = await searchParams
  const selectedBranch = typeof params?.branch === "string" && params.branch.length > 0 ? params.branch : "ALL"

  // คำนวณ date range จาก month param (YYYY-MM)
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }))
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  const selectedMonth = typeof params?.month === "string" && /^\d{4}-\d{2}$/.test(params.month) ? params.month : defaultMonth
  const [mYear, mMonth] = selectedMonth.split("-").map(Number)
  const dateFrom = `${selectedMonth}-01T00:00:00+07:00`
  const lastDay = new Date(mYear, mMonth, 0).getDate()
  const dateTo = `${selectedMonth}-${String(lastDay).padStart(2, "0")}T23:59:59+07:00`

  const data = await getDashboardData(selectedBranch, dateFrom, dateTo)
  const maxMonthlySales = Math.max(...data.monthlySales.map((month) => month.amount), 1)

  return (
    <div className="min-h-screen bg-[#F4F7F9] p-4 font-sans md:px-6 md:py-6">
      <div className="w-full space-y-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-2xl font-black text-slate-800">Dashboard</h1>
            <p className="mt-1 text-sm text-slate-500">
              {selectedBranch === "ALL" ? "ภาพรวมใบขายและยอดสุทธิแยกตามทุกสาขา" : `ข้อมูลของ ${data.branches[0]?.name || "สาขาที่เลือก"}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <DashboardMonthFilter selectedMonth={selectedMonth} />
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 shadow-sm">
              <Calendar className="h-4 w-4 text-blue-600" />
              <span>{
                selectedMonth === defaultMonth
                  ? new Date(mYear, mMonth - 1, 1).toLocaleDateString("th-TH", { month: "long", year: "numeric" })
                  : new Date(mYear, mMonth - 1, 1).toLocaleDateString("th-TH", { month: "long", year: "numeric" })
              }</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-black text-slate-800">ดูข้อมูลตามสาขา</p>
            <p className="mt-1 text-xs text-slate-400">เลือกสาขาเพื่อกรองยอดขาย รายสินค้า และใบขายล่าสุด ระบบจะโหลดให้อัตโนมัติ</p>
          </div>
          <DashboardBranchFilter branches={data.availableBranches} selectedBranch={selectedBranch} />
        </div>

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
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">ยอดรับชำระจากลูกค้าทั้งหมด</span>
                  <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
                    <CreditCard className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-3xl sm:text-4xl font-black text-slate-800 tracking-tight">
                  ฿{money(data.summary.netSales)}
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  ยอดรวมเงินสดและเงินโอนที่รับจริงจากลูกค้า
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
                  รายรับสุทธิที่ร้านค้าได้รับจริงเป็นต้นทุนและกำไร
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

            {/* 4. บิลยกเลิก */}
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

            {/* 5. สาขาที่ดูแล */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">สาขาที่ดูแล</span>
                  <Building2 className="h-4 w-4 text-emerald-500" />
                </div>
                <p className="mt-2 text-3xl sm:text-4xl font-black text-slate-800 tracking-tight flex items-baseline gap-1.5">
                  <span>{data.summary.branchCount.toLocaleString()}</span>
                  <span className="text-sm font-bold text-slate-400">สาขา</span>
                </p>
              </div>
              <p className="mt-2 text-xs text-slate-400">ทุกสาขาที่เปิดให้บริการ</p>
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
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm xl:col-span-2">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-800">แนวโน้มยอดขายรายเดือน</h2>
                <p className="mt-1 text-xs text-slate-400">ยอดสุทธิจากใบขายย้อนหลัง 12 เดือน</p>
              </div>
              <MoreHorizontal className="h-5 w-5 text-slate-300" />
            </div>
            <div className="flex h-64 items-end gap-2 sm:gap-3">
              {data.monthlySales.map((month) => (
                <div key={month.label} className="group flex h-full flex-1 flex-col items-center justify-end gap-2">
                  <div className="relative flex h-full w-full items-end">
                    <div
                      className="w-full rounded-t-lg bg-blue-100 transition-colors group-hover:bg-blue-500"
                      style={{ height: `${Math.max((month.amount / maxMonthlySales) * 100, month.amount ? 4 : 1)}%` }}
                    >
                      <span className="absolute -top-8 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-slate-800 px-2 py-1 text-[10px] font-bold text-white group-hover:block">
                        ฿{money(month.amount)}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400">{month.label}</span>
                </div>
              ))}
            </div>
          </div>

          <DashboardTopBranches branches={data.branches} />
        </div>

        {/* --- สรุปยอดรายสินค้า (เรียงลำดับได้ ลำดับอยู่หน้ารูปภาพ ยอดก่อน VAT ชัดเจน) --- */}
        <DashboardProductTable products={data.products} />

        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-2 border-b border-slate-100 p-6 md:flex-row md:items-center">
            <div>
              <h2 className="text-lg font-black text-slate-800">ยอดขายแยกตามสาขา</h2>
              <p className="mt-1 text-xs text-slate-400">รวมใบขายของทุกสาขาในระบบเดียวกัน (ตรวจสอบความถูกต้อง: ยอดก่อน VAT + VAT 7% = ยอดสุทธิ)</p>
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600"><CheckCircle2 className="h-4 w-4" /> อัปเดตจากข้อมูลจริง</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[1050px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-bold border-b border-slate-100">
                <tr>
                  <th className="px-5 py-4">สาขา</th>
                  <th className="px-4 py-4 text-right">ใบขายสำเร็จ</th>
                  <th className="px-4 py-4 text-right">
                    <div>ยอดก่อนลด</div>
                    <div className="text-[9px] font-medium text-slate-400 normal-case">(ราคาป้าย)</div>
                  </th>
                  <th className="px-4 py-4 text-right">
                    <div>ส่วนลด (%)</div>
                    <div className="text-[9px] font-medium text-slate-400 normal-case">(หักส่วนลด)</div>
                  </th>
                  <th className="px-4 py-4 text-right">
                    <div>ยอดก่อน VAT</div>
                    <div className="text-[9px] font-medium text-slate-400 normal-case">(ไม่รวมภาษี)</div>
                  </th>
                  <th className="px-4 py-4 text-right">
                    <div>VAT (7%)</div>
                    <div className="text-[9px] font-medium text-slate-400 normal-case">(ภาษีมูลค่าเพิ่ม)</div>
                  </th>
                  <th className="px-5 py-4 text-right">
                    <div>ยอดสุทธิ (รวม VAT)</div>
                    <div className="text-[9px] font-medium text-emerald-600 normal-case">(ยอดขายจริง)</div>
                  </th>
                  <th className="px-4 py-4 text-right">บิลยกเลิก</th>
                  <th className="px-4 py-4 text-right">รายการล่าสุด</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.branches.map((branch) => <BranchRow key={branch.id} branch={branch} />)}
                {data.branches.length === 0 && <tr><td colSpan={9} className="px-5 py-16 text-center text-slate-400">ไม่พบข้อมูลสาขา</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-6">
            <h2 className="text-lg font-black text-slate-800">ใบขายล่าสุดจากทุกสาขา</h2>
            <p className="mt-1 text-xs text-slate-400">ใช้ตรวจสอบรายการล่าสุดได้อย่างรวดเร็ว เรียงตามวันที่ขายล่าสุด</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[950px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-bold border-b border-slate-100">
                <tr>
                  <th className="px-5 py-4">เลขที่ใบขาย</th>
                  <th className="px-4 py-4">สาขา</th>
                  <th className="px-4 py-4">วันที่ออกบิล</th>
                  <th className="px-4 py-4 text-right">ยอดก่อนลด</th>
                  <th className="px-4 py-4 text-right">ส่วนลด (%)</th>
                  <th className="px-4 py-4 text-right">
                    <div>ยอดก่อน VAT</div>
                    <div className="text-[9px] font-medium text-slate-400 normal-case">(ไม่รวมภาษี)</div>
                  </th>
                  <th className="px-4 py-4 text-right">
                    <div>VAT (7%)</div>
                    <div className="text-[9px] font-medium text-slate-400 normal-case">(ภาษีมูลค่าเพิ่ม)</div>
                  </th>
                  <th className="px-5 py-4 text-right">
                    <div>ยอดสุทธิ (รวม VAT)</div>
                    <div className="text-[9px] font-medium text-emerald-600 normal-case">(ยอดขายจริง)</div>
                  </th>
                  <th className="px-4 py-4 text-center">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.recentOrders.map((order) => (
                  <tr key={order.id} className="transition-colors hover:bg-slate-50">
                    <td className="px-5 py-4 font-black text-slate-800">{order.orderCode}</td>
                    <td className="px-4 py-4 font-bold text-blue-600">{order.branchName}</td>
                    <td className="px-4 py-4 text-xs text-slate-500">{dateTime(order.createdAt)}</td>
                    <td className="px-4 py-4 text-right text-slate-600 font-medium">฿{money(order.subtotal)}</td>
                    <td className="px-4 py-4 text-right">
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
                    <td className="px-4 py-4 text-right text-slate-700 font-semibold text-xs">
                      ฿{money(order.netBeforeVat)}
                    </td>
                    <td className="px-4 py-4 text-right text-purple-700 font-medium text-xs">
                      ฿{money(order.vatAmount)}
                    </td>
                    <td className="px-5 py-4 text-right font-black text-emerald-700">฿{money(order.totalAmount)}</td>
                    <td className="px-4 py-4 text-center"><span className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black ${statusClass(order.status)}`}>{statusLabel(order.status)}</span></td>
                  </tr>
                ))}
                {data.recentOrders.length === 0 && <tr><td colSpan={9} className="px-5 py-16 text-center text-slate-400">ยังไม่มีใบขาย</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
