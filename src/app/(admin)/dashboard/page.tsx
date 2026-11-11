import { redirect } from "next/navigation"
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
import {
  getDashboardData,
  type DashboardBranchSummary,
  type DashboardSalesTrend,
  type DashboardTrendPoint,
} from "../../../actions/dashboard"
import { getBrandInfo, type DashboardBrandKey } from "../../../lib/dashboardBrand"
import { formatDashboardBranchParam, parseDashboardBranchIds } from "../../../lib/dashboardBranch"
import DashboardBranchFilter from "../../../components/DashboardBranchFilter"
import DashboardMonthFilter from "../../../components/DashboardMonthFilter"
import DashboardPeriodFilter from "../../../components/DashboardPeriodFilter"
import DashboardBrandFilter from "../../../components/DashboardBrandFilter"
import { parseDashboardPeriod } from "../../../lib/dashboardPeriod"
import DashboardVatCard from "../../../components/DashboardVatCard"
import DashboardTopBranches from "../../../components/DashboardTopBranches"
import DashboardCategoryTable from "../../../components/DashboardCategoryTable"
import DashboardCategoryFilter from "../../../components/DashboardCategoryFilter"
import DashboardProductTable from "../../../components/DashboardProductTable"
import DashboardDamageCard from "../../../components/DashboardDamageCard"

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

export const dynamic = "force-dynamic"
export const revalidate = 0

const statusClass = (status: string) => {
  if (status === "COMPLETED") return "bg-emerald-50 text-emerald-700 border-emerald-200"
  if (status === "PROCESSING") return "bg-blue-50 text-blue-700 border-blue-200"
  if (status === "CANCELLED") return "bg-red-50 text-red-700 border-red-200"
  return "bg-amber-50 text-amber-700 border-amber-200"
}

const statusLabel = (status: string) => {
  if (status === "COMPLETED") return "สำเร็จแล้ว"
  if (status === "PROCESSING") return "รอแพ็คจัดส่ง"
  if (status === "CANCELLED") return "ยกเลิกแล้ว"
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
      <td className="px-5 py-4 text-right font-bold text-slate-700">฿{money(branch.netSales)}</td>
      <td className="px-5 py-4 text-right font-medium text-purple-700">฿{money(branch.totalVat)}</td>
      <td className="px-5 py-4 text-right font-black text-emerald-600 bg-emerald-50/20">฿{money(branch.netBeforeVat)}</td>
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
  searchParams?: Promise<{
    branch?: string | string[];
    brand?: string | string[];
    month?: string | string[];
    catType?: string | string[];
    cat?: string | string[];
    period?: string | string[];
    date?: string | string[];
    startDate?: string | string[];
    endDate?: string | string[];
    year?: string | string[];
    preset?: string | string[];
  }>
}) {
  const params = await searchParams

  // 🌟 ถ้าเปิดเข้ามาครั้งแรกโดยยังไม่ได้ระบุ brand ใน URL ให้เริ่มที่แบรนด์ TERRA (เทอร์รา) ทันที
  if (params?.brand === undefined) {
    const nextParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (k === "branch") {
          const branchParam = formatDashboardBranchParam(parseDashboardBranchIds(v))
          if (branchParam !== "ALL") nextParams.set("branch", branchParam)
        } else if (typeof v === "string" && v) {
          nextParams.set(k, v)
        } else if (Array.isArray(v) && v[0]) {
          nextParams.set(k, v[0])
        }
      })
    }
    nextParams.set("brand", "TERRA")
    redirect(`/dashboard?${nextParams.toString()}`)
  }

  const rawSelectedBranchIds = parseDashboardBranchIds(params?.branch)
  const selectedBranchParam = formatDashboardBranchParam(rawSelectedBranchIds)

  // วิเคราะห์ตัวกรองแบรนด์ (ZENSLAB, TERRA, EMBER_ASH หรือ ALL) โดยค่าเริ่มต้นคือ TERRA
  const rawBrand = typeof params?.brand === "string" && params.brand.length > 0 ? params.brand.toUpperCase() : "TERRA"
  const selectedBrand: DashboardBrandKey = (["ZENSLAB", "TERRA", "EMBER_ASH", "ALL"].includes(rawBrand) ? rawBrand : "TERRA") as DashboardBrandKey
  const brandInfo = getBrandInfo(selectedBrand)

  // วิเคราะห์ตัวกรองช่วงเวลา 3 ระดับ (รายวัน, รายเดือน, รายปี, กำหนดเอง, ทุกช่วงเวลา)
  const periodData = parseDashboardPeriod(params)
  const { filterState, dateFrom, dateTo, displayLabel, shortLabel } = periodData

  // หมวดหมู่ที่เลือก (ชื่อหมวดหมู่จริงๆ เช่น VASE & VESSELS, FIGURE หรือ ALL)
  const selectedCategoryKey = typeof params?.cat === "string" && params.cat.length > 0 ? params.cat : "ALL"

  const data = await getDashboardData(selectedBranchParam, dateFrom, dateTo, selectedCategoryKey, filterState.type, selectedBrand)
  const trendData: DashboardSalesTrend = data.salesTrend || {
    title: "แนวโน้มยอดขายรายเดือน",
    subtitle: "ยอดสุทธิจากใบขายย้อนหลัง 12 เดือน",
    mode: "monthly",
    points: (data.monthlySales || []).map((m) => ({
      label: m.label,
      fullLabel: m.label,
      amount: m.amount,
      key: m.monthKey || m.label,
    })),
    totalAmount: (data.monthlySales || []).reduce((acc, m) => acc + m.amount, 0),
  }
  const trendPoints: DashboardTrendPoint[] = trendData.points
  const maxTrendSales = Math.max(...trendPoints.map((p) => p.amount), 1)

  const selectedCategoryObj = data.categories.find(
    (c) =>
      c.key.trim().toLowerCase() === selectedCategoryKey.trim().toLowerCase() ||
      c.name.trim().toLowerCase() === selectedCategoryKey.trim().toLowerCase()
  )
  const selectedCategoryLabel = selectedCategoryObj
    ? selectedCategoryObj.name
    : selectedCategoryKey

  const scopeLabel = selectedCategoryKey !== "ALL"
    ? `หมวด ${selectedCategoryLabel}`
    : selectedBrand !== "ALL"
    ? `แบรนด์ ${brandInfo.name}`
    : null

  const rawBranchSet = new Set(rawSelectedBranchIds)
  const selectedBranches = data.availableBranches.filter((b) => rawBranchSet.has(b.id))
  const effectiveBranchIds = selectedBranches.map((b) => b.id)
  const isAllAvailableSelected = data.availableBranches.length > 0 && selectedBranches.length >= data.availableBranches.length
  const hasBranchFilter = rawSelectedBranchIds.length > 0 && !isAllAvailableSelected

  const branchSummaryText = !hasBranchFilter
    ? `ภาพรวมใบขายและยอดสุทธิแยกตามทุกสาขา (${displayLabel})`
    : selectedBranches.length === 1
    ? `ข้อมูลของ ${selectedBranches[0].name} (${displayLabel})`
    : selectedBranches.length > 1
    ? selectedBranches.length <= 3
      ? `ข้อมูลรวม ${selectedBranches.length} สาขา (${selectedBranches.map((b) => b.name).join(", ")}) (${displayLabel})`
      : `ข้อมูลรวม ${selectedBranches.length} สาขา (${selectedBranches.slice(0, 2).map((b) => b.name).join(", ")} และอีก ${selectedBranches.length - 2} สาขา) (${displayLabel})`
    : `ข้อมูลตามสาขาที่เลือก (${displayLabel})`

  const buildDashboardUrl = (overrides: {
    branchIds?: number[]
    brand?: DashboardBrandKey
    cat?: string
  }) => {
    const nextParams = new URLSearchParams()
    const nextBranchParam = formatDashboardBranchParam(
      overrides.branchIds !== undefined ? overrides.branchIds : rawSelectedBranchIds
    )
    const nextBrand = overrides.brand !== undefined ? overrides.brand : selectedBrand
    const nextCat = overrides.cat !== undefined ? overrides.cat : selectedCategoryKey

    if (nextBranchParam !== "ALL") nextParams.set("branch", nextBranchParam)
    // คง brand=ALL ไว้เสมอเมื่อไม่ได้เลือกแบรนด์ เพื่อไม่ให้ถูก redirect กลับไปเป็นค่าเริ่มต้น TERRA
    nextParams.set("brand", nextBrand)
    if (nextCat !== "ALL") nextParams.set("cat", nextCat)

    if (filterState.type === "daily" && filterState.date) {
      nextParams.set("period", "daily")
      nextParams.set("date", filterState.date)
    } else if (filterState.type === "custom" && filterState.startDate && filterState.endDate) {
      nextParams.set("period", "custom")
      nextParams.set("startDate", filterState.startDate)
      nextParams.set("endDate", filterState.endDate)
    } else if (filterState.type === "monthly" && filterState.month) {
      nextParams.set("period", "monthly")
      nextParams.set("month", filterState.month)
    } else if (filterState.type === "yearly" && filterState.year) {
      nextParams.set("period", "yearly")
      nextParams.set("year", filterState.year)
    }
    if (filterState.preset) nextParams.set("preset", filterState.preset)

    const qs = nextParams.toString()
    return qs ? `/dashboard?${qs}` : "/dashboard"
  }

  const clearCatUrl = buildDashboardUrl({ cat: "ALL" })
  const clearBrandUrl = buildDashboardUrl({ brand: "ALL" })

  return (
    <div className="min-h-screen bg-[#F4F7F9] p-4 font-sans md:px-6 md:py-6">
      <div className="w-full space-y-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-2xl font-black text-slate-800">Dashboard</h1>
            <p className="mt-1 text-sm text-slate-500">
              {branchSummaryText}
              {selectedBrand !== "ALL" && (
                <span className="ml-2 font-bold text-purple-700">
                  · แบรนด์: {brandInfo.emoji} {brandInfo.name} ({brandInfo.thaiName})
                </span>
              )}
              {selectedCategoryKey !== "ALL" && (
                <span className="ml-2 font-bold text-blue-600">
                  · หมวด: {selectedCategoryLabel}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* แถบปุ่มลัดและปฏิทินฟิลเตอร์มาตรฐาน 3 ระดับ (รายวัน, รายเดือน, รายปี, ทุกช่วงเวลา) */}
            <DashboardPeriodFilter currentPeriod={filterState} />

            {/* ฟิลเตอร์แบรนด์สินค้า */}
            <DashboardBrandFilter selectedBrand={selectedBrand} />

            {/* ฟิลเตอร์หมวดหมู่ */}
            <DashboardCategoryFilter
              selectedCatKey={selectedCategoryKey}
              categories={data.categories.map((c) => ({ key: c.key, name: c.name, groupType: c.groupType }))}
            />

            {selectedBrand !== "ALL" && (
              <Link
                href={clearBrandUrl}
                className="inline-flex items-center gap-1 rounded-xl border border-purple-200 bg-purple-50 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700 px-3 py-2 text-xs font-bold text-purple-700 transition-colors shadow-sm"
                title="คลิกเพื่อล้างตัวกรองแบรนด์ และดูทุกแบรนด์"
              >
                <span>✕ ล้างแบรนด์ ({brandInfo.name})</span>
              </Link>
            )}

            {selectedCategoryKey !== "ALL" && (
              <Link
                href={clearCatUrl}
                className="inline-flex items-center gap-1 rounded-xl border border-blue-200 bg-blue-50 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700 px-3 py-2 text-xs font-bold text-blue-700 transition-colors shadow-sm"
                title="คลิกเพื่อล้างตัวกรองหมวดหมู่ และดูทุกหมวดหมู่"
              >
                <span>✕ ล้างหมวดหมู่</span>
              </Link>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-black text-slate-800">ดูข้อมูลตามสาขา</p>
              <p className="mt-1 text-xs text-slate-400">เลือกดูได้ 1 สาขา หรือติ๊กเลือกหลายสาขาพร้อมกัน เพื่อกรองยอดขาย รายสินค้า และใบขายล่าสุด</p>
            </div>
            <DashboardBranchFilter
              branches={data.availableBranches}
              selectedBranchIds={rawSelectedBranchIds}
            />
          </div>

          {hasBranchFilter && selectedBranches.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
              <span className="text-xs font-bold text-slate-500">
                กำลังดู {selectedBranches.length} สาขา:
              </span>
              {selectedBranches.map((branch) => (
                <Link
                  key={branch.id}
                  href={buildDashboardUrl({
                    branchIds: effectiveBranchIds.filter((id) => id !== branch.id),
                  })}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                  title={`เอา ${branch.name} ออก`}
                >
                  <span>{branch.name}</span>
                  <span aria-hidden="true">✕</span>
                </Link>
              ))}
              <Link
                href={buildDashboardUrl({ branchIds: [] })}
                className="ml-auto text-xs font-bold text-slate-400 hover:text-rose-600 transition-colors"
              >
                ดูทุกสาขา
              </Link>
            </div>
          )}
        </div>

        {/* ซ่อนการ์ด 3 แบรนด์ตามที่แจ้งไว้ก่อน */}

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
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {scopeLabel ? `ยอดรับชำระ (${scopeLabel})` : "ยอดรับชำระจากลูกค้าทั้งหมด"}
                  </span>
                  <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
                    <CreditCard className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-3xl sm:text-4xl font-black text-slate-800 tracking-tight">
                  ฿{money(data.summary.netSales)}
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  {scopeLabel
                    ? `ยอดรวมรับจริงจากสินค้า${scopeLabel}`
                    : "ยอดรวมเงินสดและเงินโอนที่รับจริงจากลูกค้า"}
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
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                    {scopeLabel ? `เงินเข้าร้าน (${scopeLabel})` : "เงินแท้จริงเข้าร้าน (หัก VAT แล้ว)"}
                  </span>
                  <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-600">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-3xl sm:text-4xl font-black text-emerald-700 tracking-tight">
                  ฿{money(data.summary.netSalesBeforeVat)}
                </div>
                <p className="mt-1 text-xs text-emerald-600/90">
                  {scopeLabel
                    ? `รายรับสุทธิของ${scopeLabel} หลังหักภาษี`
                    : "รายรับสุทธิที่ร้านค้าได้รับจริงเป็นต้นทุนและกำไร"}
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
              <p className="mt-2 text-xs text-slate-400">
                {hasBranchFilter ? "จำนวนสาขาที่เลือกกรองอยู่" : "ทุกสาขาที่เปิดให้บริการ"}
              </p>
            </div>

            {/* 6. สินค้าชำรุด/เสียหาย */}
            <DashboardDamageCard damageSummary={data.damageSummary} />

          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          {/* 📊 กราฟแนวโน้มยอดขาย: ปรับอัตโนมัติตามช่วงเวลาที่เลือก (รายวัน=รายชั่วโมง, รายเดือน=รายวัน, รายปี=12เดือน) */}
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm xl:col-span-2">
            <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-800">{trendData.title}</h2>
                <p className="mt-1 text-xs text-slate-400">
                  {scopeLabel
                    ? `${trendData.subtitle} (เฉพาะ${scopeLabel})`
                    : trendData.subtitle}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-xl bg-blue-50 border border-blue-100 px-3 py-1.5 text-xs font-bold text-blue-700">
                  ยอดรวมช่วงนี้: ฿{money(trendData.totalAmount)}
                </span>
              </div>
            </div>

            <div className="flex h-64 items-end gap-1 sm:gap-2">
              {trendPoints.map((point, index) => {
                const heightPercent = maxTrendSales > 0 ? (point.amount / maxTrendSales) * 100 : 0
                return (
                  <div
                    key={point.key || `${point.label}-${index}`}
                    className="group relative flex h-full flex-1 flex-col items-center justify-end gap-1.5 min-w-0"
                  >
                    <div className="relative flex h-full w-full items-end justify-center">
                      <div
                        className={`w-full max-w-[28px] rounded-t-md transition-all ${
                          point.amount > 0
                            ? "bg-blue-500 hover:bg-blue-600 group-hover:bg-blue-600 shadow-xs"
                            : "bg-slate-100"
                        }`}
                        style={{
                          height: point.amount > 0
                            ? `${Math.max(heightPercent, 4)}%`
                            : "3px",
                        }}
                      >
                        {/* Tooltip on hover */}
                        <div className="absolute -top-12 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-xl bg-slate-900 px-3 py-1.5 text-center shadow-xl group-hover:block z-30 pointer-events-none">
                          <p className="text-[10px] text-slate-300 font-medium">
                            {point.fullLabel || point.label}
                          </p>
                          <p className="text-xs font-black text-white">
                            ฿{money(point.amount)}
                            {point.billCount !== undefined && point.billCount > 0 && (
                              <span className="text-[10px] font-normal text-slate-300 ml-1">
                                ({point.billCount} บิล)
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                    {/* Label ใต้แท่ง */}
                    <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 truncate w-full text-center">
                      {point.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          <DashboardTopBranches branches={data.branches} />
        </div>

        {/* --- สรุปอันดับหมวดหมู่ขายดี (Best-Selling Categories Ranking) --- */}
        <DashboardCategoryTable
          categories={data.categories}
          selectedCategoryKey={selectedCategoryKey}
        />

        {/* --- สรุปยอดรายสินค้า (เรียงลำดับได้ ลำดับอยู่หน้ารูปภาพ ยอดก่อน VAT ชัดเจน) --- */}
        <DashboardProductTable
          products={data.products}
          title={scopeLabel ? `สรุปยอดรายสินค้า (${scopeLabel})` : "สรุปยอดรายสินค้า"}
          subtitle={scopeLabel ? `รายการสินค้า${scopeLabel} ที่ขายได้` : "จำนวนที่ขายและยอดเงินของสินค้าแต่ละรายการ"}
        />

        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-2 border-b border-slate-100 p-6 md:flex-row md:items-center">
            <div>
              <h2 className="text-lg font-black text-slate-800">
                {scopeLabel ? `ยอดขาย${scopeLabel} แยกตามสาขา` : "ยอดขายแยกตามสาขา"}
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                {scopeLabel
                  ? `ยอดขายสินค้า${scopeLabel} รวมใบขายของทุกสาขาในระบบเดียวกัน`
                  : "รวมใบขายของทุกสาขาในระบบเดียวกัน (สูตรคำนวณ: [ยอดรับเงินลูกค้า] - [VAT 7%] = [เงินแท้จริงเข้าร้าน (ก่อน VAT)])"}
              </p>
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
                    <div>ยอดรับเงินลูกค้า</div>
                    <div className="text-[9px] font-medium text-slate-400 normal-case">(รวม VAT)</div>
                  </th>
                  <th className="px-4 py-4 text-right">
                    <div>VAT (7%)</div>
                    <div className="text-[9px] font-medium text-purple-600 normal-case">(ภาษีนำส่งรัฐ)</div>
                  </th>
                  <th className="px-4 py-4 text-right bg-emerald-50/50">
                    <div className="text-emerald-800 font-bold">เงินเข้าร้าน (ก่อน VAT)</div>
                    <div className="text-[9px] font-bold text-emerald-600 normal-case">(เงินแท้จริงที่ได้รับ)</div>
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
            <h2 className="text-lg font-black text-slate-800">
              {scopeLabel
                ? `ใบขายล่าสุดที่มีสินค้า${scopeLabel}`
                : hasBranchFilter
                ? "ใบขายล่าสุดจากสาขาที่เลือก"
                : "ใบขายล่าสุดจากทุกสาขา"}
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              {scopeLabel
                ? `แสดงเฉพาะใบขายที่มีสินค้า${scopeLabel} (คิดเฉพาะยอดสินค้าในขอบเขตนี้)`
                : "ใช้ตรวจสอบรายการล่าสุดได้อย่างรวดเร็ว เรียงตามวันที่ขายล่าสุด"}
            </p>
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
                    <td className="px-4 py-4 text-right font-bold text-slate-700">฿{money(order.totalAmount)}</td>
                    <td className="px-4 py-4 text-right text-purple-700 font-medium text-xs">
                      ฿{money(order.vatAmount)}
                    </td>
                    <td className="px-5 py-4 text-right font-black text-emerald-600 bg-emerald-50/20 text-xs">
                      ฿{money(order.netBeforeVat)}
                    </td>
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
