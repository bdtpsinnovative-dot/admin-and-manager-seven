"use client"

/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V4 */

import Link from "next/link"
import { useMemo, useState } from "react"
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ArrowUpDown,
  ArrowUpRight,
  Calendar,
  ChevronDown,
  ChevronUp,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Filter,
  Globe2,
  Navigation,
  RefreshCw,
  Smartphone,
  UsersRound,
} from "lucide-react"
import { toast } from "sonner"
import {
  exportProductsExcel,
  exportProductsCsv,
  exportPersonasExcel,
  exportPersonasCsv,
  exportAllAudienceExcel,
} from "./audienceExport"
import type {
  AudienceAnalytics,
  AudienceBreakdownItem,
  AudienceBreakdowns,
  AudiencePersona,
  AudienceProduct,
  AudienceSummaryMetric,
} from "../../../../actions/audience-analytics"
import type { DailyTrafficAnalytics, DayAnalytics } from "../../../../actions/daily-traffic"
import SourceBadge from "../SourceBadge"
import TechnologyBadge from "../TechnologyBadge"
import DraggableScrollContainer from "../DraggableScrollContainer"

function number(value: number) { return new Intl.NumberFormat("th-TH").format(value) }
function seconds(value: number) { return value < 60 ? `${number(value)} วิ` : `${Math.floor(value / 60)} นาที ${value % 60} วิ` }
function dateTime(value: string | null) { return value ? new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "ไม่พบข้อมูล" }
function percent(value: number, total: number) { return total ? `${Math.round((value / total) * 100)}%` : "0%" }
function share(value: string | null, percentage: number) { return value ? `${value} ${percentage}%` : "ไม่ระบุ" }

const ranges = [{ days: 1, label: "24 ชม." }, { days: 7, label: "7 วัน" }, { days: 30, label: "30 วัน" }]

type SortDirection = "desc" | "asc"
type ProductSortKey = "name" | "totalViews" | "uniqueViews" | "repeatViews" | "avgActiveSeconds" | "price" | "quickBounceCount" | "continueCount"
type PersonaSortKey = "lastSeenAt" | "averageSessionSeconds" | "sessions" | "averagePrice" | "pageViews"
type SortValue = string | number | null

const sortCollator = new Intl.Collator("th-TH", { numeric: true, sensitivity: "base" })

const productSortOptions: Array<{ value: ProductSortKey; label: string }> = [
  { value: "name", label: "สินค้า" },
  { value: "totalViews", label: "ดูทั้งหมด" },
  { value: "uniqueViews", label: "ดูไม่ซ้ำ" },
  { value: "repeatViews", label: "ดูซ้ำ" },
  { value: "avgActiveSeconds", label: "เวลาเฉลี่ย" },
  { value: "price", label: "ราคา" },
  { value: "quickBounceCount", label: "ตีกลับเร็ว" },
  { value: "continueCount", label: "ไปต่อ" },
]

const personaSortOptions: Array<{ value: PersonaSortKey; label: string }> = [
  { value: "lastSeenAt", label: "ดูล่าสุด" },
  { value: "averageSessionSeconds", label: "ระยะเวลาการเข้า" },
  { value: "sessions", label: "จำนวนครั้งที่เข้าเว็บ" },
  { value: "averagePrice", label: "ราคาเฉลี่ย" },
  { value: "pageViews", label: "จำนวนหน้า" },
]

function compareSortValues(left: SortValue, right: SortValue, direction: SortDirection) {
  const leftMissing = left === null || left === ""
  const rightMissing = right === null || right === ""
  if (leftMissing !== rightMissing) return leftMissing ? 1 : -1
  if (leftMissing && rightMissing) return 0

  const comparison = typeof left === "number" && typeof right === "number"
    ? left - right
    : sortCollator.compare(String(left), String(right))
  return direction === "asc" ? comparison : -comparison
}

function productSortValue(product: AudienceProduct, key: ProductSortKey): SortValue {
  if (key === "continueCount") return product.continueProductCount + product.continueCollectionCount + product.continueOtherCount
  return product[key]
}

function personaSortValue(persona: AudiencePersona, key: PersonaSortKey): SortValue {
  if (key === "lastSeenAt") return persona.lastSeenAt ? new Date(persona.lastSeenAt).getTime() : null
  return persona[key]
}

function Select({ value, onChange, options, label }: { value: string; onChange: (value: string) => void; options: string[]; label: string }) {
  const unique = options.filter(Boolean).filter((option, index, all) => all.indexOf(option) === index)
  return <label className="flex min-w-[150px] flex-col gap-1 text-[10px] font-bold text-slate-500"><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 focus:bg-white shadow-sm"><option value="all">ทั้งหมด</option>{unique.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
}

export function isPersonaActionMatch(persona: AudiencePersona, actionFilter: string) {
  if (actionFilter === "all") return true
  if (actionFilter === "any_clicked") {
    return persona.labels.some((l) => l.startsWith("กด") || l === "เปิดเมนูติดต่อ" || l === "หยิบใส่ตะกร้า" || l.includes("CTA"))
  }
  return persona.labels.includes(actionFilter)
}

function ActionFilterSelect({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (value: string) => void
  options: Array<{ value: string; label: string }>
}) {
  return (
    <label className="flex min-w-[210px] flex-col gap-1 text-[10px] font-bold text-slate-500">
      <span className="flex items-center gap-1 text-blue-600 font-extrabold">
        🎯 การกดปุ่ม / สนใจติดต่อ
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 rounded-xl border border-blue-300 bg-blue-50/70 px-3 text-xs font-bold text-blue-900 outline-none focus:border-blue-500 focus:bg-white shadow-sm"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function SortSelect<Key extends string>({ value, onChange, options }: { value: Key; onChange: (value: Key) => void; options: Array<{ value: Key; label: string }> }) {
  return <label className="flex min-w-[170px] flex-col gap-1 text-[10px] font-bold text-slate-500"><span>เรียงตาม</span><select value={value} onChange={(event) => onChange(event.target.value as Key)} className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 focus:bg-white shadow-sm">{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
}

function DirectionSelect({ value, onChange }: { value: SortDirection; onChange: (value: SortDirection) => void }) {
  return <label className="flex min-w-[150px] flex-col gap-1 text-[10px] font-bold text-slate-500"><span>ลำดับ</span><select value={value} onChange={(event) => onChange(event.target.value as SortDirection)} className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 focus:bg-white shadow-sm"><option value="desc">มาก → น้อย</option><option value="asc">น้อย → มาก</option></select></label>
}

function SummaryMetric({ label, metric, note }: { label: string; metric: AudienceSummaryMetric; note?: string }) {
  return <article className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-between">
    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
    <p className="mt-2 truncate text-base font-bold text-slate-900" title={metric.value || "ยังไม่มีข้อมูล"}>{metric.value || "ยังไม่มีข้อมูล"}</p>
    <p className="mt-1 text-[10px] leading-4 text-slate-400">{metric.count ? `${metric.share}% ของที่ระบุได้ (${number(metric.count)})` : note || "ยังไม่มีข้อมูล"}</p>
  </article>
}

function SummaryStrip({ data, tab }: { data: AudienceAnalytics["summary"]; tab: "products" | "personas" }) {
  if (tab === "products") {
    const summary = data.products
    return <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-blue-600">ภาพรวมความสนใจ</p>
          <h2 className="mt-1 text-lg font-bold text-slate-900 tracking-tight">สรุปพฤติกรรมความสนใจต่อสินค้า</h2>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <SummaryMetric label="อุปกรณ์ส่วนใหญ่" metric={summary.device} />
        <SummaryMetric label="เบราว์เซอร์ส่วนใหญ่" metric={summary.browser} />
        <SummaryMetric label="ช่องทางหลัก" metric={summary.source} />
        <SummaryMetric label="สถานที่หลัก" metric={summary.location} />
        <SummaryMetric label="หมวดหมู่หลัก" metric={summary.category} />
        <SummaryMetric label="สีที่พบมากสุด" metric={summary.color} />
      </div>
      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
        <span>ดูไม่ซ้ำ <strong className="font-mono text-slate-900">{number(summary.uniqueViews)}</strong></span>
        <span>ดูทั้งหมด <strong className="font-mono text-slate-900">{number(summary.totalViews)}</strong></span>
        <span>ดูซ้ำ <strong className="font-mono text-slate-900">{number(summary.repeatViews)}</strong></span>
        <span>เวลาเฉลี่ย <strong className="text-slate-900">{seconds(summary.averageActiveSeconds)}</strong></span>
      </div>
    </section>
  }

  const summary = data.personas
  return <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-blue-600">ภาพรวมพฤติกรรม</p>
        <h2 className="mt-1 text-lg font-bold text-slate-900 tracking-tight">สรุปพฤติกรรมและกลุ่มผู้ชม (Persona)</h2>
      </div>
    </div>
    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <SummaryMetric label="อุปกรณ์ส่วนใหญ่" metric={summary.device} />
      <SummaryMetric label="ระบบปฏิบัติการ" metric={summary.os} />
      <SummaryMetric label="เบราว์เซอร์" metric={summary.browser} />
      <SummaryMetric label="ช่องทางแรก" metric={summary.source} />
      <SummaryMetric label="สถานที่หลัก" metric={summary.location} />
      <SummaryMetric label="กลุ่ม Persona" metric={summary.persona} />
    </div>
    <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
      <span>ผู้ชม <strong className="font-mono text-slate-900">{number(summary.viewers)}</strong> โปรไฟล์</span>
      <span>Sessions <strong className="font-mono text-slate-900">{number(summary.sessions)}</strong></span>
      <span>หน้าเข้าชม <strong className="font-mono text-slate-900">{number(summary.pageViews)}</strong></span>
      <span>เวลาเฉลี่ย <strong className="text-slate-900">{seconds(summary.averageSessionSeconds)}</strong></span>
    </div>
  </section>
}

function BreakdownCard({
  title,
  subtitle,
  icon: Icon,
  badgeText,
  badgeColor = "text-blue-700 bg-blue-50 border-blue-200",
  barColor = "bg-blue-600",
  items,
  type,
  rangeDays,
}: {
  title: string
  subtitle: string
  icon: React.ComponentType<{ className?: string }>
  badgeText: string
  badgeColor?: string
  barColor?: string
  items: AudienceBreakdownItem[]
  type: "source" | "device" | "browser"
  rangeDays?: number
}) {
  const [showAll, setShowAll] = useState(false)
  const displayItems = showAll ? items : items.slice(0, 5)
  const hasMore = items.length > 5
  const dimKey = type === "source" ? "sources" : type === "device" ? "devices" : "browsers"
  const dailyUrl = `/algorithm/traffic?range=${rangeDays || 30}&type=${dimKey}`

  return (
    <article className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-blue-300 hover:shadow-md">
      <div>
        <div className="flex items-start justify-between gap-3">
          <Link
            href={dailyUrl}
            className="group/title flex items-center gap-2.5 text-left transition-opacity hover:opacity-85"
            title={`คลิกเพื่อเปลี่ยนหน้าไปดูสถิติ ${title} แนวนอน`}
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-700 group-hover/title:bg-blue-600 group-hover/title:text-white transition-colors">
              <Icon className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-slate-900 group-hover/title:text-blue-600 transition-colors flex items-center gap-1">
                {title}
                <ArrowUpRight className="h-3 w-3 opacity-50 group-hover/title:opacity-100" />
              </h3>
              <p className="text-[11px] text-slate-400">{subtitle}</p>
            </div>
          </Link>
          <Link
            href={dailyUrl}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-blue-600 shadow-2xs transition-colors hover:bg-blue-600 hover:text-white hover:border-blue-600"
            title={`คลิกเพื่อเปลี่ยนหน้าไปดูสถิติ ${title} แนวนอน`}
          >
            ดูแนวนอน ↗
          </Link>
        </div>

        <div className="mt-2.5 flex items-center justify-between">
          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-bold ${badgeColor}`}>
            {badgeText}
          </span>
          <span className="text-[11px] text-slate-400">
            {items.length} รายการ
          </span>
        </div>

        <div className="mt-4 space-y-2">
          {items.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">ยังไม่มีข้อมูลในช่วงเวลานี้</div>
          ) : (
            displayItems.map((item) => (
              <Link
                key={item.name}
                href={dailyUrl}
                className="group/item block rounded-xl p-1.5 -mx-1.5 space-y-1 transition-colors hover:bg-slate-50 cursor-pointer"
                title={`คลิกเพื่อดูสถิติ ${item.name} แนวนอน`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1 truncate">
                    {type === "source" ? (
                      <SourceBadge value={item.name} />
                    ) : type === "device" ? (
                      <TechnologyBadge kind="device" value={item.name} />
                    ) : (
                      <TechnologyBadge kind="browser" value={item.name} />
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 text-right">
                    <span className="font-mono text-xs font-bold tabular-nums text-slate-900 group-hover/item:text-blue-600 transition-colors">
                      {number(item.count)}
                    </span>
                    <span className="text-[11px] font-medium text-slate-400">ครั้ง</span>
                    <span className="ml-1 inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-700">
                      {item.share}%
                    </span>
                  </div>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                    style={{ width: `${Math.max(item.share, 2)}%` }}
                  />
                </div>
              </Link>
            ))
          )}
        </div>
      </div>

      <div className="mt-5 space-y-2 border-t border-slate-100 pt-3">
        {hasMore && (
          <button
            type="button"
            onClick={() => setShowAll((prev) => !prev)}
            className="inline-flex w-full items-center justify-center gap-1 text-center text-[11px] font-bold text-slate-600 hover:text-slate-900"
          >
            {showAll ? (
              <>ย่อรายการเหลือ 5 อันดับ <ChevronUp className="h-3 w-3" /></>
            ) : (
              <>ดูทั้งหมดอีก {items.length - 5} รายการ <ChevronDown className="h-3 w-3" /></>
            )}
          </button>
        )}

        <Link
          href={dailyUrl}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 py-2.5 text-xs font-bold text-blue-700 shadow-sm transition-all hover:bg-blue-600 hover:text-white hover:border-blue-600 hover:shadow-md"
        >
          เปิดดูสถิติ{title}แยกรายวัน (แนวนอน เลื่อนซ้าย-ขวา) ↗
        </Link>
      </div>
    </article>
  )
}

function AudienceBreakdownSection({
  breakdowns,
  tab,
  rangeDays,
}: {
  breakdowns?: AudienceBreakdowns
  tab: "products" | "personas"
  rangeDays?: number
  dailyTraffic?: DailyTrafficAnalytics
}) {
  if (!breakdowns) return null

  const sourcesTotal = breakdowns.sources.reduce((sum, s) => sum + s.count, 0)
  const devicesTotal = breakdowns.devices.reduce((sum, d) => sum + d.count, 0)
  const browsersTotal = breakdowns.browsers.reduce((sum, b) => sum + b.count, 0)
  const grandTotal = Math.max(sourcesTotal, devicesTotal, browsersTotal, breakdowns.totalCount)

  return (
    <section className="mb-6 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
            จำแนกข้อมูลสถิติ (Traffic & Platform Breakdown)
          </p>
          <h2 className="mt-0.5 text-lg font-bold text-slate-900 tracking-tight">
            ช่องทางเข้าเว็บ · อุปกรณ์ · Browser
          </h2>
          <p className="text-xs text-slate-500">
            {tab === "products"
              ? "จำแนกตามยอดดูสินค้าไม่ซ้ำ (Unique Product Views) เพื่อดูว่าคนสนใจสินค้ามาจากที่ไหน ใช้อุปกรณ์และเบราว์เซอร์อะไร"
              : "จำแนกตามข้อมูลกลุ่มผู้ชม (Personas) ทั้งหมดในช่วงเวลาที่เลือก"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm">
            ยอดรวม: <strong className="font-mono text-blue-600">{number(grandTotal)}</strong> {tab === "products" ? "ครั้ง" : "โปรไฟล์"}
          </div>
          <Link
            href={`/algorithm/traffic?range=${rangeDays || 30}`}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-blue-700 hover:shadow-md"
          >
            เปิดดูสถิติแนวนอนรายวัน (ตลอด {rangeDays || 30} วัน) ↗
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <BreakdownCard
          title="ช่องทางเข้าเว็บ"
          subtitle="Traffic Sources & Referrers"
          icon={Navigation}
          badgeText={`รวม ${number(sourcesTotal)} ครั้ง`}
          badgeColor="text-blue-700 bg-blue-50 border-blue-200"
          barColor="bg-blue-600"
          items={breakdowns.sources}
          type="source"
          rangeDays={rangeDays}
        />
        <BreakdownCard
          title="อุปกรณ์ที่ใช้งาน"
          subtitle="Device Categories"
          icon={Smartphone}
          badgeText={`รวม ${number(devicesTotal)} ครั้ง`}
          badgeColor="text-emerald-700 bg-emerald-50 border-emerald-200"
          barColor="bg-emerald-600"
          items={breakdowns.devices}
          type="device"
          rangeDays={rangeDays}
        />
        <BreakdownCard
          title="เบราว์เซอร์"
          subtitle="Web Browsers"
          icon={Globe2}
          badgeText={`รวม ${number(browsersTotal)} ครั้ง`}
          badgeColor="text-indigo-700 bg-indigo-50 border-indigo-200"
          barColor="bg-indigo-600"
          items={breakdowns.browsers}
          type="browser"
          rangeDays={rangeDays}
        />
      </div>
    </section>
  )
}

function SortableHeader<Key extends string>({
  label,
  sortKey,
  activeKey,
  direction,
  onSort,
  align = "left",
  className = "",
}: {
  label: string
  sortKey: Key
  activeKey: Key
  direction: SortDirection
  onSort: (key: Key) => void
  align?: "left" | "right"
  className?: string
}) {
  const active = sortKey === activeKey
  const Icon = active ? direction === "desc" ? ArrowDown : ArrowUp : ArrowUpDown
  return (
    <th
      className={`px-4 py-3 text-[11px] font-bold uppercase tracking-wider ${align === "right" ? "text-right" : "text-left"} ${active ? "text-blue-600" : "text-slate-500"} ${className}`}
      aria-sort={active ? direction === "desc" ? "descending" : "ascending" : "none"}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex min-h-8 items-center gap-1 whitespace-nowrap rounded-lg px-1.5 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${align === "right" ? "ml-auto" : ""} ${active ? "text-blue-600 font-bold" : ""}`}
      >
        {label}
        <Icon className="h-3 w-3" />
      </button>
    </th>
  )
}

const PRODUCT_PAGE_SIZE = 50

function ProductTable({ products, query, sortKey, direction, onSort }: { products: AudienceProduct[]; query: string; sortKey: ProductSortKey; direction: SortDirection; onSort: (key: ProductSortKey) => void }) {
  const rows = products.filter((product) => `${product.name} ${product.sku || ""} ${product.category} ${product.collection || ""} ${product.color || ""} ${product.primarySource || ""} ${product.primaryLocation || ""}`.toLowerCase().includes(query.toLowerCase()))
  const paginationKey = `${query}:${products.map((product) => product.id).join(",")}`
  const [pagination, setPagination] = useState({ key: paginationKey, page: 1 })
  const totalPages = Math.max(Math.ceil(rows.length / PRODUCT_PAGE_SIZE), 1)
  const requestedPage = pagination.key === paginationKey ? pagination.page : 1
  const currentPage = Math.min(requestedPage, totalPages)
  const startIndex = (currentPage - 1) * PRODUCT_PAGE_SIZE
  const pageRows = rows.slice(startIndex, startIndex + PRODUCT_PAGE_SIZE)

  return <div className="space-y-3">
    <DraggableScrollContainer helperText="🖱️ คลิกลากเมาส์ หรือหมุนลูกกลิ้งเพื่อเลื่อนดูตารางสินค้าแนวนอน">
      <table className="w-full min-w-[2200px] border-separate border-spacing-0 text-left">
        <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
          <tr>
            <SortableHeader
              label="สินค้า / Product"
              sortKey="name"
              activeKey={sortKey}
              direction={direction}
              onSort={onSort}
              className="sticky left-0 z-20 w-[300px] min-w-[300px] max-w-[300px] bg-slate-100 border-r border-b border-slate-200 shadow-[3px_0_8px_-2px_rgba(0,0,0,0.08)]"
            />
            <SortableHeader label="ดูทั้งหมด" sortKey="totalViews" activeKey={sortKey} direction={direction} onSort={onSort} align="right" className="border-b border-slate-200" />
            <SortableHeader label="ดูไม่ซ้ำ" sortKey="uniqueViews" activeKey={sortKey} direction={direction} onSort={onSort} align="right" className="border-b border-slate-200" />
            <SortableHeader label="ดูซ้ำ" sortKey="repeatViews" activeKey={sortKey} direction={direction} onSort={onSort} align="right" className="border-b border-slate-200" />
            <SortableHeader label="เวลาเฉลี่ย" sortKey="avgActiveSeconds" activeKey={sortKey} direction={direction} onSort={onSort} className="border-b border-slate-200" />
            <th className="px-4 py-3 border-b border-slate-200">สี</th>
            <th className="px-4 py-3 border-b border-slate-200">Category</th>
            <SortableHeader label="ราคา" sortKey="price" activeKey={sortKey} direction={direction} onSort={onSort} className="border-b border-slate-200" />
            <th className="px-4 py-3 border-b border-slate-200">อุปกรณ์</th>
            <th className="px-4 py-3 border-b border-slate-200">Browser</th>
            <th className="px-4 py-3 border-b border-slate-200">
              <div className="flex gap-1">
                <button type="button" onClick={() => onSort("quickBounceCount")} className={`inline-flex min-h-8 items-center gap-1 whitespace-nowrap rounded-lg px-1.5 hover:bg-slate-100 ${sortKey === "quickBounceCount" ? "text-blue-600 font-bold" : ""}`}>
                  ตีกลับ{sortKey === "quickBounceCount" ? direction === "desc" ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" /> : <ArrowUpDown className="h-3 w-3" />}
                </button>
                <span aria-hidden="true">/</span>
                <button type="button" onClick={() => onSort("continueCount")} className={`inline-flex min-h-8 items-center gap-1 whitespace-nowrap rounded-lg px-1.5 hover:bg-slate-100 ${sortKey === "continueCount" ? "text-blue-600 font-bold" : ""}`}>
                  ไปต่อ{sortKey === "continueCount" ? direction === "desc" ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" /> : <ArrowUpDown className="h-3 w-3" />}
                </button>
              </div>
            </th>
            <th className="px-4 py-3 border-b border-slate-200">ช่องทางเข้าเว็บ</th>
            <th className="px-4 py-3 border-b border-slate-200">กลุ่มคอลเลกชัน</th>
            <th className="px-4 py-3 border-b border-slate-200">ภูมิภาค / เมือง</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {pageRows.map((product) => (
            <tr key={product.id} className="group align-top hover:bg-slate-50 transition-colors">
              <td className="sticky left-0 z-10 w-[300px] min-w-[300px] max-w-[300px] bg-white group-hover:bg-slate-50 transition-colors px-4 py-4 border-r border-b border-slate-100 shadow-[3px_0_8px_-2px_rgba(0,0,0,0.08)]">
                <Link href={`/algorithm/products/${product.id}`} className="flex min-w-[280px] items-center gap-3 text-slate-900 hover:text-blue-600">
                  <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                    {product.imageUrl ? <img src={product.imageUrl} alt="" width={56} height={56} loading="lazy" decoding="async" className="h-full w-full object-contain p-1.5" /> : <Eye className="h-4 w-4 text-slate-400" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-bold text-slate-900">{product.name}</span>
                    <span className="mt-1 block truncate font-mono text-[10px] font-normal text-slate-400">{product.sku || "ไม่มี SKU"}</span>
                    <span className="mt-1 block text-[10px] font-normal text-slate-500">{product.status === "active" ? "มีสินค้า" : product.status || "ไม่ระบุ"}</span>
                  </span>
                </Link>
              </td>
              <td className="px-4 py-4 text-right font-mono text-sm text-slate-700 border-b border-slate-100">{number(product.totalViews)}</td>
              <td className="px-4 py-4 text-right font-mono text-sm font-bold text-blue-600 border-b border-slate-100">{number(product.uniqueViews)}<span className="mt-1 block text-[10px] font-normal text-slate-400">{percent(product.uniqueViews, product.totalViews)}</span></td>
              <td className="px-4 py-4 text-right font-mono text-sm text-slate-700 border-b border-slate-100">{number(product.repeatViews)}</td>
              <td className="whitespace-nowrap px-4 py-4 text-xs border-b border-slate-100"><span className="block font-semibold text-slate-700">{seconds(product.avgActiveSeconds)}</span></td>
              <td className="px-4 py-4 text-xs text-slate-600 border-b border-slate-100">{product.color || "ไม่ระบุสี"}</td>
              <td className="px-4 py-4 text-xs font-semibold text-slate-700 border-b border-slate-100">{product.category || "ไม่ระบุหมวด"}</td>
              <td className="whitespace-nowrap px-4 py-4 text-xs text-slate-700 border-b border-slate-100">{product.price === null ? "ไม่ระบุราคา" : `${number(product.price)} บาท`}</td>
              <td className="px-4 py-4 text-xs border-b border-slate-100"><TechnologyBadge kind="device" value={product.primaryDevice} note={`สัดส่วน ${product.primaryDeviceShare}%`} /></td>
              <td className="px-4 py-4 text-xs border-b border-slate-100"><TechnologyBadge kind="browser" value={product.primaryBrowser} note={`สัดส่วน ${product.primaryBrowserShare}%`} /></td>
              <td className="px-4 py-4 text-xs border-b border-slate-100"><span className="block text-slate-700">ตีกลับ {number(product.quickBounceCount)}</span><span className="mt-1 block text-blue-600 font-medium">ไปต่อ {number(product.continueProductCount + product.continueCollectionCount + product.continueOtherCount)}</span></td>
              <td className="px-4 py-4 text-xs border-b border-slate-100"><SourceBadge value={product.primarySource} note={`สัดส่วน ${product.primarySourceShare}%`} /></td>
              <td className="px-4 py-4 text-xs text-slate-600 border-b border-slate-100">{product.collection || "ไม่ระบุกลุ่ม"}</td>
              <td className="max-w-[200px] px-4 py-4 text-xs text-slate-500 border-b border-slate-100">{share(product.primaryLocation, product.primaryLocationShare)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && <div className="px-6 py-14 text-center text-sm text-slate-400">ไม่พบสินค้าตามตัวกรองนี้</div>}
    </DraggableScrollContainer>
    {rows.length > 0 && <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between shadow-sm">
      <p className="text-xs text-slate-500">แสดง <span className="font-mono font-bold text-slate-900">{number(startIndex + 1)}–{number(Math.min(startIndex + PRODUCT_PAGE_SIZE, rows.length))}</span> จาก {number(rows.length)} สินค้า · หน้าละ {PRODUCT_PAGE_SIZE}</p>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => setPagination({ key: paginationKey, page: Math.max(currentPage - 1, 1) })} disabled={currentPage === 1} className="inline-flex min-h-9 items-center justify-center whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">ก่อนหน้า</button>
        <span className="min-w-20 text-center font-mono text-xs font-bold text-slate-500">{number(currentPage)} / {number(totalPages)}</span>
        <button type="button" onClick={() => setPagination({ key: paginationKey, page: Math.min(currentPage + 1, totalPages) })} disabled={currentPage === totalPages} className="inline-flex min-h-9 items-center justify-center whitespace-nowrap rounded-lg bg-slate-900 px-3 text-xs font-bold text-white transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-40">ถัดไป</button>
      </div>
    </div>}
  </div>
}

const PERSONA_PAGE_SIZE = 25

function PersonaTable({
  personas,
  query,
  categoryFilter,
  behaviorFilter,
  actionFilter = "all",
  sourceFilter,
  locationFilter,
  deviceFilter,
  osFilter,
  browserFilter,
  sortKey,
  direction,
  onSort,
}: {
  personas: AudiencePersona[]
  query: string
  categoryFilter: string
  behaviorFilter: string
  actionFilter?: string
  sourceFilter: string
  locationFilter: string
  deviceFilter: string
  osFilter: string
  browserFilter: string
  sortKey: PersonaSortKey
  direction: SortDirection
  onSort: (key: PersonaSortKey) => void
}) {
  const rows = personas.filter((persona) => `${persona.identityLabel} ${persona.location || ""} ${persona.categories.join(" ")} ${persona.labels.join(" ")}`.toLowerCase().includes(query.toLowerCase()) && (categoryFilter === "all" || persona.categories.includes(categoryFilter)) && (behaviorFilter === "all" || persona.labels.includes(behaviorFilter)) && isPersonaActionMatch(persona, actionFilter) && (sourceFilter === "all" || persona.latestSource === sourceFilter || persona.firstTouchSource === sourceFilter) && (locationFilter === "all" || persona.location === locationFilter) && (deviceFilter === "all" || persona.device === deviceFilter) && (osFilter === "all" || persona.os === osFilter) && (browserFilter === "all" || persona.browser === browserFilter))
  const paginationKey = `${query}:${categoryFilter}:${behaviorFilter}:${actionFilter}:${sourceFilter}:${locationFilter}:${deviceFilter}:${osFilter}:${browserFilter}:${personas.map((p) => p.identityKey).slice(0, 10).join(",")}`
  const [pagination, setPagination] = useState({ key: paginationKey, page: 1 })
  const totalPages = Math.max(Math.ceil(rows.length / PERSONA_PAGE_SIZE), 1)
  const requestedPage = pagination.key === paginationKey ? pagination.page : 1
  const currentPage = Math.min(requestedPage, totalPages)
  const startIndex = (currentPage - 1) * PERSONA_PAGE_SIZE
  const pageRows = rows.slice(startIndex, startIndex + PERSONA_PAGE_SIZE)

  return <div className="space-y-3">
    <DraggableScrollContainer helperText="🖱️ คลิกลากเมาส์ หรือหมุนลูกกลิ้งเพื่อเลื่อนดูตารางผู้ชมแนวนอน">
      <table className="w-full min-w-[1900px] border-separate border-spacing-0 text-left">
        <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
          <tr>
            <SortableHeader
              label="วันที่"
              sortKey="lastSeenAt"
              activeKey={sortKey}
              direction={direction}
              onSort={onSort}
              className="sticky left-0 z-20 w-[190px] min-w-[190px] max-w-[190px] bg-slate-100 border-r border-b border-slate-200 shadow-[3px_0_8px_-2px_rgba(0,0,0,0.08)]"
            />
            <th className="px-4 py-3 border-b border-slate-200">ID / ชื่อ</th>
            <th className="px-4 py-3 border-b border-slate-200">สถานที่</th>
            <SortableHeader label="ระยะเวลาการเข้า" sortKey="averageSessionSeconds" activeKey={sortKey} direction={direction} onSort={onSort} className="border-b border-slate-200" />
            <SortableHeader label="จำนวนครั้งที่เข้าเว็บ" sortKey="sessions" activeKey={sortKey} direction={direction} onSort={onSort} align="right" className="border-b border-slate-200" />
            <SortableHeader label="ราคาเฉลี่ย / ช่วง" sortKey="averagePrice" activeKey={sortKey} direction={direction} onSort={onSort} className="border-b border-slate-200" />
            <th className="px-4 py-3 border-b border-slate-200">อุปกรณ์</th>
            <th className="px-4 py-3 border-b border-slate-200">ระบบ / Browser</th>
            <SortableHeader label="จำนวนหน้า" sortKey="pageViews" activeKey={sortKey} direction={direction} onSort={onSort} align="right" className="border-b border-slate-200" />
            <th className="px-4 py-3 border-b border-slate-200">Persona</th>
            <th className="px-4 py-3 border-b border-slate-200">แหล่งที่มา</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {pageRows.map((persona) => (
            <tr key={persona.identityKey} className="group align-top hover:bg-slate-50 transition-colors">
              <td className="sticky left-0 z-10 w-[190px] min-w-[190px] max-w-[190px] bg-white group-hover:bg-slate-50 transition-colors whitespace-nowrap px-4 py-4 text-xs text-slate-500 border-r border-b border-slate-100 shadow-[3px_0_8px_-2px_rgba(0,0,0,0.08)]">
                <span className="block font-medium">พบครั้งแรก: {dateTime(persona.firstSeenAt)}</span>
                <span className="mt-1 block">ดูล่าสุด: {dateTime(persona.lastSeenAt)}</span>
              </td>
              <td className="px-4 py-4 border-b border-slate-100">
                <span
                  className="block font-bold text-slate-900 cursor-help"
                  title={`รหัสเต็ม (UUID): ${persona.identityKey.replace(/^visitor:/, "")}`}
                >
                  {persona.identityLabel}
                </span>
                <span className="mt-1 block text-[10px] text-slate-400">
                  {persona.identityType === "user" ? "บัญชีที่ล็อกอิน" : "ผู้เข้าชมทั่วไป (ยังไม่ล็อกอิน)"}
                </span>
              </td>
              <td className="max-w-[180px] px-4 py-4 text-xs text-slate-600 border-b border-slate-100">{persona.location || "ไม่ระบุ"}</td>
              <td className="whitespace-nowrap px-4 py-4 text-xs border-b border-slate-100">
                <span className="block font-semibold text-slate-800">{seconds(persona.averageSessionSeconds)}</span>
                <span className="mt-1 block text-[10px] text-slate-400">รวม {seconds(persona.activeSeconds)}</span>
              </td>
              <td className="px-4 py-4 text-right font-mono text-sm font-bold text-slate-900 border-b border-slate-100">{number(persona.sessions)}</td>
              <td className="whitespace-nowrap px-4 py-4 text-xs text-slate-800 border-b border-slate-100">
                {persona.averagePrice === null ? "ไม่ระบุ" : `${number(persona.averagePrice)} บาท`}
                <span className="mt-1 block text-[10px] text-slate-400">{persona.minPrice === null ? "—" : `${number(persona.minPrice)}–${number(persona.maxPrice || persona.minPrice)} บาท`}</span>
              </td>
              <td className="px-4 py-4 text-xs border-b border-slate-100"><TechnologyBadge kind="device" value={persona.device} /></td>
              <td className="px-4 py-4 text-xs border-b border-slate-100">
                <div className="space-y-2">
                  <TechnologyBadge kind="os" value={persona.os} />
                  <TechnologyBadge kind="browser" value={persona.browser} />
                </div>
              </td>
              <td className="px-4 py-4 text-right font-mono text-sm text-slate-900 border-b border-slate-100">
                <span className="block font-bold">{number(persona.pageViews)}</span>
                <span className="mt-1 block text-[10px] text-slate-400">ไม่ซ้ำ {number(persona.uniquePages)}</span>
              </td>
              <td className="max-w-[280px] px-4 py-4 border-b border-slate-100">
                <div className="flex flex-wrap gap-1.5">
                  {persona.labels.map((tag) => {
                    let badgeClass = "bg-blue-50 border-blue-100 text-blue-700"
                    if (tag === "กดติดต่อ LINE") {
                      badgeClass = "bg-emerald-50 border-emerald-300 text-emerald-800 font-extrabold shadow-2xs"
                    } else if (tag === "กด Inbox Messenger") {
                      badgeClass = "bg-sky-50 border-sky-300 text-sky-800 font-extrabold shadow-2xs"
                    } else if (tag === "กดดู Instagram") {
                      badgeClass = "bg-pink-50 border-pink-300 text-pink-800 font-extrabold shadow-2xs"
                    } else if (tag === "หยิบใส่ตะกร้า") {
                      badgeClass = "bg-amber-50 border-amber-300 text-amber-900 font-extrabold shadow-2xs"
                    } else if (tag === "เปิดเมนูติดต่อ") {
                      badgeClass = "bg-indigo-50 border-indigo-200 text-indigo-700 font-bold"
                    }
                    return (
                      <span
                        key={tag}
                        className={`rounded-full border px-2.5 py-0.5 text-[10px] ${badgeClass}`}
                        title={persona.reasons.join(" · ")}
                      >
                        {tag}
                      </span>
                    )
                  })}
                </div>
                <p className="mt-2 text-[10px] leading-4 text-slate-500">{persona.reasons.join(" · ")}</p>
              </td>
              <td className="px-4 py-4 text-xs border-b border-slate-100">
                <span className="block text-[10px] text-slate-400">ครั้งแรก</span>
                <SourceBadge value={persona.firstTouchSource} />
                <span className="mt-2 block text-[10px] text-slate-400">ล่าสุด</span>
                <SourceBadge value={persona.latestSource} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && <div className="px-6 py-14 text-center text-sm text-slate-400">ไม่พบผู้ชมตามตัวกรองนี้</div>}
    </DraggableScrollContainer>
    {rows.length > 0 && <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between shadow-sm">
      <p className="text-xs text-slate-500">แสดง <span className="font-mono font-bold text-slate-900">{number(startIndex + 1)}–{number(Math.min(startIndex + PERSONA_PAGE_SIZE, rows.length))}</span> จาก {number(rows.length)} ผู้ชม · หน้าละ {PERSONA_PAGE_SIZE}</p>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => setPagination({ key: paginationKey, page: Math.max(currentPage - 1, 1) })} disabled={currentPage === 1} className="inline-flex min-h-9 items-center justify-center whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">ก่อนหน้า</button>
        <span className="min-w-20 text-center font-mono text-xs font-bold text-slate-500">{number(currentPage)} / {number(totalPages)}</span>
        <button type="button" onClick={() => setPagination({ key: paginationKey, page: Math.min(currentPage + 1, totalPages) })} disabled={currentPage === totalPages} className="inline-flex min-h-9 items-center justify-center whitespace-nowrap rounded-lg bg-slate-900 px-3 text-xs font-bold text-white transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-40">ถัดไป</button>
      </div>
    </div>}
  </div>
}

export default function AudienceAnalyticsClient({
  data,
  dailyTraffic,
  embedded = false,
}: {
  data: AudienceAnalytics
  dailyTraffic?: DailyTrafficAnalytics
  embedded?: boolean
}) {
  const [tab, setTab] = useState<"products" | "personas">("products")
  const [productQuery, setProductQuery] = useState("")
  const [productCategory, setProductCategory] = useState("all")
  const [productDevice, setProductDevice] = useState("all")
  const [productBrowser, setProductBrowser] = useState("all")
  const [productColor, setProductColor] = useState("all")
  const [productLocation, setProductLocation] = useState("all")
  const [productSource, setProductSource] = useState("all")
  const [productSortKey, setProductSortKey] = useState<ProductSortKey>("uniqueViews")
  const [productSortDirection, setProductSortDirection] = useState<SortDirection>("desc")
  const [personaQuery, setPersonaQuery] = useState("")
  const [personaDevice, setPersonaDevice] = useState("all")
  const [personaBrowser, setPersonaBrowser] = useState("all")
  const [personaOs, setPersonaOs] = useState("all")
  const [personaLocation, setPersonaLocation] = useState("all")
  const [personaSource, setPersonaSource] = useState("all")
  const [personaCategory, setPersonaCategory] = useState("all")
  const [personaBehavior, setPersonaBehavior] = useState("all")
  const [personaActionFilter, setPersonaActionFilter] = useState("all")
  const [minSessions, setMinSessions] = useState("0")
  const [personaSortKey, setPersonaSortKey] = useState<PersonaSortKey>("lastSeenAt")
  const [personaSortDirection, setPersonaSortDirection] = useState<SortDirection>("desc")

  const anyClickedCount = useMemo(
    () =>
      data.personas.filter((p) =>
        p.labels.some((l) => l.startsWith("กด") || l === "เปิดเมนูติดต่อ" || l === "หยิบใส่ตะกร้า" || l.includes("CTA"))
      ).length,
    [data.personas]
  )
  const lineCount = useMemo(() => data.personas.filter((p) => p.labels.includes("กดติดต่อ LINE")).length, [data.personas])
  const messengerCount = useMemo(() => data.personas.filter((p) => p.labels.includes("กด Inbox Messenger")).length, [data.personas])
  const igCount = useMemo(() => data.personas.filter((p) => p.labels.includes("กดดู Instagram")).length, [data.personas])
  const cartCount = useMemo(() => data.personas.filter((p) => p.labels.includes("หยิบใส่ตะกร้า")).length, [data.personas])
  const contactBoxCount = useMemo(() => data.personas.filter((p) => p.labels.includes("เปิดเมนูติดต่อ")).length, [data.personas])

  const actionFilterOptions = useMemo(() => [
    { value: "all", label: "ทั้งหมด (ไม่จำกัดการกด)" },
    { value: "any_clicked", label: `⚡ เฉพาะคนที่มีการกด (${anyClickedCount} คน)` },
    ...(lineCount > 0 ? [{ value: "กดติดต่อ LINE", label: `🟢 กดติดต่อ LINE (${lineCount} คน)` }] : []),
    ...(messengerCount > 0 ? [{ value: "กด Inbox Messenger", label: `🔵 กด Inbox Messenger (${messengerCount} คน)` }] : []),
    ...(igCount > 0 ? [{ value: "กดดู Instagram", label: `🟣 กดดู Instagram (${igCount} คน)` }] : []),
    ...(cartCount > 0 ? [{ value: "หยิบใส่ตะกร้า", label: `🛒 หยิบใส่ตะกร้า (${cartCount} คน)` }] : []),
    ...(contactBoxCount > 0 ? [{ value: "เปิดเมนูติดต่อ", label: `🟡 เปิดเมนูติดต่อ (${contactBoxCount} คน)` }] : []),
  ], [anyClickedCount, lineCount, messengerCount, igCount, cartCount, contactBoxCount])

  const filteredProducts = useMemo(() => data.products
    .filter((item) => (productCategory === "all" || item.category === productCategory) && (productDevice === "all" || item.primaryDevice === productDevice) && (productBrowser === "all" || item.primaryBrowser === productBrowser) && (productColor === "all" || item.color === productColor) && (productSource === "all" || item.primarySource === productSource) && (productLocation === "all" || item.primaryLocation === productLocation))
    .toSorted((left, right) => compareSortValues(productSortValue(left, productSortKey), productSortValue(right, productSortKey), productSortDirection) || sortCollator.compare(left.name, right.name)), [data.products, productCategory, productDevice, productBrowser, productColor, productSource, productLocation, productSortKey, productSortDirection])
  const filteredPersonas = useMemo(() => data.personas
    .filter((item) => item.sessions >= Number(minSessions || 0) && (personaCategory === "all" || item.categories.includes(personaCategory)) && (personaBehavior === "all" || item.labels.includes(personaBehavior)) && isPersonaActionMatch(item, personaActionFilter) && (personaSource === "all" || item.latestSource === personaSource || item.firstTouchSource === personaSource) && (personaLocation === "all" || item.location === personaLocation) && (personaDevice === "all" || item.device === personaDevice) && (personaOs === "all" || item.os === personaOs) && (personaBrowser === "all" || item.browser === personaBrowser))
    .toSorted((left, right) => compareSortValues(personaSortValue(left, personaSortKey), personaSortValue(right, personaSortKey), personaSortDirection) || sortCollator.compare(left.identityLabel, right.identityLabel)), [data.personas, minSessions, personaCategory, personaBehavior, personaActionFilter, personaSource, personaLocation, personaDevice, personaOs, personaBrowser, personaSortKey, personaSortDirection])

  const finalFilteredProducts = useMemo(() => {
    if (!productQuery.trim()) return filteredProducts
    const q = productQuery.toLowerCase()
    return filteredProducts.filter((p) =>
      `${p.name} ${p.sku || ""} ${p.category} ${p.collection || ""} ${p.color || ""} ${p.primarySource || ""} ${p.primaryLocation || ""}`
        .toLowerCase()
        .includes(q)
    )
  }, [filteredProducts, productQuery])

  const finalFilteredPersonas = useMemo(() => {
    if (!personaQuery.trim()) return filteredPersonas
    const q = personaQuery.toLowerCase()
    return filteredPersonas.filter((p) =>
      `${p.identityLabel} ${p.location || ""} ${p.categories.join(" ")} ${p.labels.join(" ")}`
        .toLowerCase()
        .includes(q)
    )
  }, [filteredPersonas, personaQuery])

  const [showExportMenu, setShowExportMenu] = useState(false)

  const handleExportCurrentExcel = () => {
    try {
      if (tab === "products") {
        const isFiltered = finalFilteredProducts.length !== data.products.length
        exportProductsExcel(
          finalFilteredProducts,
          `Audience_Products_${isFiltered ? "Filtered_" : ""}${data.rangeDays}D`,
          isFiltered ? "สินค้า (ตามตัวกรอง)" : "วิเคราะห์สินค้า"
        )
        toast.success(`ดาวน์โหลด Excel สินค้า (${number(finalFilteredProducts.length)} รายการ) เรียบร้อยแล้ว`)
      } else {
        const isFiltered = finalFilteredPersonas.length !== data.personas.length
        exportPersonasExcel(
          finalFilteredPersonas,
          `Audience_Personas_${isFiltered ? "Filtered_" : ""}${data.rangeDays}D`,
          isFiltered ? "Persona (ตามตัวกรอง)" : "วิเคราะห์ผู้ชม_Persona"
        )
        toast.success(`ดาวน์โหลด Excel ผู้ชม Persona (${number(finalFilteredPersonas.length)} รายการ) เรียบร้อยแล้ว`)
      }
    } catch (err: any) {
      toast.error(`ส่งออกไม่สำเร็จ: ${err?.message || err}`)
    }
  }

  const handleExportCurrentCsv = () => {
    try {
      if (tab === "products") {
        const isFiltered = finalFilteredProducts.length !== data.products.length
        exportProductsCsv(
          finalFilteredProducts,
          `Audience_Products_${isFiltered ? "Filtered_" : ""}${data.rangeDays}D`
        )
        toast.success(`ดาวน์โหลด CSV สินค้า (${number(finalFilteredProducts.length)} รายการ) เรียบร้อยแล้ว`)
      } else {
        const isFiltered = finalFilteredPersonas.length !== data.personas.length
        exportPersonasCsv(
          finalFilteredPersonas,
          `Audience_Personas_${isFiltered ? "Filtered_" : ""}${data.rangeDays}D`
        )
        toast.success(`ดาวน์โหลด CSV ผู้ชม Persona (${number(finalFilteredPersonas.length)} รายการ) เรียบร้อยแล้ว`)
      }
    } catch (err: any) {
      toast.error(`ส่งออกไม่สำเร็จ: ${err?.message || err}`)
    }
  }

  const handleExportAllWorkbook = () => {
    try {
      exportAllAudienceExcel(
        data.products,
        data.personas,
        `Audience_Analytics_Full_${data.rangeDays}D`
      )
      toast.success(`ดาวน์โหลด Excel รวม 2 ชีต (สินค้า ${number(data.products.length)} + Persona ${number(data.personas.length)}) เรียบร้อยแล้ว`)
    } catch (err: any) {
      toast.error(`ส่งออกไม่สำเร็จ: ${err?.message || err}`)
    }
  }
  const productSourceOptions = data.products.map((item) => item.primarySource || "")
  const personaSourceOptions = data.personas.flatMap((item) => [item.latestSource || "", item.firstTouchSource || ""])
  const labelOptions = data.personas.flatMap((item) => item.labels)
  const personaCategoryOptions = data.personas.flatMap((item) => item.categories)
  const productLocationOptions = data.products.map((item) => item.primaryLocation || "")
  const personaLocationOptions = data.personas.map((item) => item.location || "")

  const changeProductSort = (key: ProductSortKey) => {
    if (key === productSortKey) setProductSortDirection((current) => current === "desc" ? "asc" : "desc")
    else {
      setProductSortKey(key)
      setProductSortDirection("desc")
    }
  }

  const changePersonaSort = (key: PersonaSortKey) => {
    if (key === personaSortKey) setPersonaSortDirection((current) => current === "desc" ? "asc" : "desc")
    else {
      setPersonaSortKey(key)
      setPersonaSortDirection("desc")
    }
  }

  return (
    <div className="w-full space-y-6">
      {!embedded && (
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/algorithm"
              className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" /> กลับภาพรวม
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Audience Analytics</h1>
              <p className="text-xs text-slate-500 mt-0.5">วิเคราะห์พฤติกรรมผู้ชมและสถิติสินค้า (ย้อนหลัง {data.rangeDays} วัน)</p>
            </div>
          </div>
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            {ranges.map((range) => (
              <Link
                key={range.days}
                href={`/algorithm/audience?range=${range.days}`}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                  data.rangeDays === range.days
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {range.label}
              </Link>
            ))}
          </div>
        </div>
      )}

      {!embedded && (
        <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">สินค้าที่มีการเข้าชม</p>
            <p className="mt-3 font-mono text-3xl font-black text-slate-900">{number(data.products.length)}</p>
            <p className="mt-1 text-xs text-slate-400">ชิ้น</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">ผู้ชม Persona</p>
            <p className="mt-3 font-mono text-3xl font-black text-slate-900">{number(data.personas.length)}</p>
            <p className="mt-1 text-xs text-slate-400">โปรไฟล์</p>
          </div>
        </section>
      )}

      {data.error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
          {data.error}
        </div>
      )}

      {/* Tabs & Export Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm w-fit">
          <button
            onClick={() => setTab("products")}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-colors ${
              tab === "products"
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <Eye className="h-3.5 w-3.5" /> วิเคราะห์สินค้า ({number(data.products.length)})
          </button>
          <button
            onClick={() => setTab("personas")}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-colors ${
              tab === "personas"
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <UsersRound className="h-3.5 w-3.5" /> วิเคราะห์ผู้ชม Persona ({number(data.personas.length)})
          </button>
        </div>

        {/* Export Toolbar */}
        <div className="relative flex flex-wrap items-center gap-2">
          {/* Main Quick Excel */}
          <button
            type="button"
            onClick={handleExportCurrentExcel}
            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-800 shadow-sm transition-all hover:bg-emerald-100 hover:border-emerald-400 active:scale-95 cursor-pointer"
            title={`ดาวน์โหลดข้อมูล${tab === "products" ? "สินค้า" : "Persona"}ที่แสดงเป็น Excel (.xlsx)`}
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            <span>โหลด Excel (.xlsx)</span>
          </button>

          {/* Main Quick CSV */}
          <button
            type="button"
            onClick={handleExportCurrentCsv}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-900 active:scale-95 cursor-pointer"
            title={`ดาวน์โหลดข้อมูล${tab === "products" ? "สินค้า" : "Persona"}ที่แสดงเป็น CSV (.csv) แยกคอลัมน์ UTF-8`}
          >
            <FileText className="h-4 w-4 text-slate-500" />
            <span>โหลด CSV (.csv)</span>
          </button>

          {/* Dropdown Options */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowExportMenu((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50/70 px-3 py-2 text-xs font-bold text-blue-700 shadow-sm hover:bg-blue-100 transition-colors cursor-pointer"
              title="ตัวเลือกการส่งออกเพิ่มเติม และส่งออกรวมทั้งหมด"
            >
              <Download className="h-3.5 w-3.5 text-blue-600" />
              <span>ตัวเลือกส่งออก</span>
              <ChevronDown className={`h-3 w-3 text-blue-500 transition-transform ${showExportMenu ? "rotate-180" : ""}`} />
            </button>

            {showExportMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowExportMenu(false)}
                />
                <div className="absolute right-0 top-full mt-2 z-50 w-80 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl space-y-2 animate-in fade-in zoom-in-95 duration-100">
                  <div className="border-b border-slate-100 pb-2">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">ส่งออกทั้งหมดในเล่มเดียว</p>
                    <button
                      type="button"
                      onClick={() => {
                        handleExportAllWorkbook()
                        setShowExportMenu(false)
                      }}
                      className="mt-1.5 flex w-full items-center gap-2.5 rounded-xl bg-blue-50/80 px-3 py-2 text-left text-xs font-bold text-blue-900 hover:bg-blue-100 transition-colors cursor-pointer"
                    >
                      <FileSpreadsheet className="h-4 w-4 text-blue-600 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div>Excel รวม 2 ชีต (สินค้า + Persona)</div>
                        <div className="text-[10px] font-normal text-blue-600">
                          {number(data.products.length)} สินค้า · {number(data.personas.length)} Persona
                        </div>
                      </div>
                    </button>
                  </div>

                  <div className="border-b border-slate-100 pb-2 space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">หมวดสินค้า (Products)</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          exportProductsExcel(data.products, `Audience_Products_All_${data.rangeDays}D`, "สินค้าทั้งหมด")
                          toast.success(`โหลด Excel สินค้าทั้งหมด (${number(data.products.length)}) สำเร็จ`)
                          setShowExportMenu(false)
                        }}
                        className="flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 transition-colors cursor-pointer"
                      >
                        <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Excel ทั้งหมด</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          exportProductsCsv(data.products, `Audience_Products_All_${data.rangeDays}D`)
                          toast.success(`โหลด CSV สินค้าทั้งหมด (${number(data.products.length)}) สำเร็จ`)
                          setShowExportMenu(false)
                        }}
                        className="flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        <FileText className="h-3.5 w-3.5 text-slate-500" />
                        <span>CSV ทั้งหมด</span>
                      </button>
                    </div>
                    {finalFilteredProducts.length !== data.products.length && (
                      <div className="pt-1">
                        <div className="text-[10px] text-slate-500 mb-1">กรองอยู่ ({number(finalFilteredProducts.length)} สินค้า):</div>
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              exportProductsExcel(finalFilteredProducts, `Audience_Products_Filtered_${data.rangeDays}D`, "สินค้า (ตามตัวกรอง)")
                              toast.success(`โหลด Excel สินค้าที่กรอง (${number(finalFilteredProducts.length)}) สำเร็จ`)
                              setShowExportMenu(false)
                            }}
                            className="flex items-center justify-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50/50 px-2 py-1.5 text-[11px] font-bold text-emerald-800 hover:bg-emerald-100 transition-colors cursor-pointer"
                          >
                            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                            <span>Excel ที่กรอง</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              exportProductsCsv(finalFilteredProducts, `Audience_Products_Filtered_${data.rangeDays}D`)
                              toast.success(`โหลด CSV สินค้าที่กรอง (${number(finalFilteredProducts.length)}) สำเร็จ`)
                              setShowExportMenu(false)
                            }}
                            className="flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                          >
                            <FileText className="h-3.5 w-3.5 text-slate-500" />
                            <span>CSV ที่กรอง</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">หมวดผู้ชม (Personas)</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          exportPersonasExcel(data.personas, `Audience_Personas_All_${data.rangeDays}D`, "Persona ทั้งหมด")
                          toast.success(`โหลด Excel Persona ทั้งหมด (${number(data.personas.length)}) สำเร็จ`)
                          setShowExportMenu(false)
                        }}
                        className="flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 transition-colors cursor-pointer"
                      >
                        <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Excel ทั้งหมด</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          exportPersonasCsv(data.personas, `Audience_Personas_All_${data.rangeDays}D`)
                          toast.success(`โหลด CSV Persona ทั้งหมด (${number(data.personas.length)}) สำเร็จ`)
                          setShowExportMenu(false)
                        }}
                        className="flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        <FileText className="h-3.5 w-3.5 text-slate-500" />
                        <span>CSV ทั้งหมด</span>
                      </button>
                    </div>
                    {finalFilteredPersonas.length !== data.personas.length && (
                      <div className="pt-1">
                        <div className="text-[10px] text-slate-500 mb-1">กรองอยู่ ({number(finalFilteredPersonas.length)} คน):</div>
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              exportPersonasExcel(finalFilteredPersonas, `Audience_Personas_Filtered_${data.rangeDays}D`, "Persona (ตามตัวกรอง)")
                              toast.success(`โหลด Excel Persona ที่กรอง (${number(finalFilteredPersonas.length)}) สำเร็จ`)
                              setShowExportMenu(false)
                            }}
                            className="flex items-center justify-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50/50 px-2 py-1.5 text-[11px] font-bold text-emerald-800 hover:bg-emerald-100 transition-colors cursor-pointer"
                          >
                            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                            <span>Excel ที่กรอง</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              exportPersonasCsv(finalFilteredPersonas, `Audience_Personas_Filtered_${data.rangeDays}D`)
                              toast.success(`โหลด CSV Persona ที่กรอง (${number(finalFilteredPersonas.length)}) สำเร็จ`)
                              setShowExportMenu(false)
                            }}
                            className="flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                          >
                            <FileText className="h-3.5 w-3.5 text-slate-500" />
                            <span>CSV ที่กรอง</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Filters Box */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
        {tab === "products" ? (
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex min-w-[240px] flex-1 flex-col gap-1 text-[10px] font-bold text-slate-500">
              <span>ค้นหาสินค้า</span>
              <input
                value={productQuery}
                onChange={(event) => setProductQuery(event.target.value)}
                placeholder="ชื่อสินค้า, SKU, หมวด..."
                className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-800 outline-none focus:border-blue-500 focus:bg-white shadow-sm"
              />
            </label>
            <Select label="หมวดสินค้า" value={productCategory} onChange={setProductCategory} options={data.products.map((item) => item.category)} />
            <Select label="อุปกรณ์" value={productDevice} onChange={setProductDevice} options={data.products.map((item) => item.primaryDevice || "")} />
            <Select label="เบราว์เซอร์" value={productBrowser} onChange={setProductBrowser} options={data.products.map((item) => item.primaryBrowser || "")} />
            <Select label="สี" value={productColor} onChange={setProductColor} options={data.products.map((item) => item.color || "")} />
            <Select label="สถานที่" value={productLocation} onChange={setProductLocation} options={productLocationOptions} />
            <Select label="ช่องทาง" value={productSource} onChange={setProductSource} options={productSourceOptions} />
            <SortSelect value={productSortKey} onChange={setProductSortKey} options={productSortOptions} />
            <DirectionSelect value={productSortDirection} onChange={setProductSortDirection} />
          </div>
        ) : (
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex min-w-[240px] flex-1 flex-col gap-1 text-[10px] font-bold text-slate-500">
              <span>ค้นหาผู้ชม</span>
              <input
                value={personaQuery}
                onChange={(event) => setPersonaQuery(event.target.value)}
                placeholder="ID, ชื่อ, สถานที่, Persona..."
                className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-800 outline-none focus:border-blue-500 focus:bg-white shadow-sm"
              />
            </label>
            <ActionFilterSelect
              value={personaActionFilter}
              onChange={setPersonaActionFilter}
              options={actionFilterOptions}
            />
            <Select label="หมวดที่สนใจ" value={personaCategory} onChange={setPersonaCategory} options={personaCategoryOptions} />
            <Select label="กลุ่มพฤติกรรม" value={personaBehavior} onChange={setPersonaBehavior} options={labelOptions} />
            <Select label="ช่องทาง" value={personaSource} onChange={setPersonaSource} options={personaSourceOptions} />
            <Select label="สถานที่" value={personaLocation} onChange={setPersonaLocation} options={personaLocationOptions} />
            <Select label="อุปกรณ์" value={personaDevice} onChange={setPersonaDevice} options={data.personas.map((item) => item.device || "")} />
            <Select label="ระบบปฏิบัติการ" value={personaOs} onChange={setPersonaOs} options={data.personas.map((item) => item.os || "")} />
            <Select label="เบราว์เซอร์" value={personaBrowser} onChange={setPersonaBrowser} options={data.personas.map((item) => item.browser || "")} />
            <label className="flex min-w-[130px] flex-col gap-1 text-[10px] font-bold text-slate-500">
              <span>ขั้นต่ำครั้งที่เข้าเว็บ</span>
              <input
                type="number"
                min="0"
                value={minSessions}
                onChange={(event) => setMinSessions(event.target.value)}
                className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-800 outline-none focus:border-blue-500 focus:bg-white shadow-sm"
              />
            </label>
            <SortSelect value={personaSortKey} onChange={setPersonaSortKey} options={personaSortOptions} />
            <DirectionSelect value={personaSortDirection} onChange={setPersonaSortDirection} />
          </div>
        )}
      </div>

      {tab === "personas" && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mr-1">
            <span>🎯 ฟิลเตอร์ด่วน:</span>
          </span>
          <button
            type="button"
            onClick={() => setPersonaActionFilter("all")}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
              personaActionFilter === "all"
                ? "bg-slate-900 text-white shadow-sm"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            ทุกคน ({number(data.personas.length)})
          </button>
          <button
            type="button"
            onClick={() => setPersonaActionFilter("any_clicked")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
              personaActionFilter === "any_clicked"
                ? "bg-blue-600 text-white shadow-sm ring-2 ring-blue-400/40"
                : "border border-blue-200 bg-blue-50/70 text-blue-700 hover:bg-blue-100"
            }`}
          >
            <span>⚡ ดูแค่คนกดปุ่ม</span>
            <span className={`rounded-full px-1.5 py-0.2 font-mono text-[11px] font-black ${
              personaActionFilter === "any_clicked" ? "bg-white text-blue-800" : "bg-blue-200/60 text-blue-800"
            }`}>
              {number(anyClickedCount)}
            </span>
          </button>
          {lineCount > 0 && (
            <button
              type="button"
              onClick={() => setPersonaActionFilter("กดติดต่อ LINE")}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                personaActionFilter === "กดติดต่อ LINE"
                  ? "bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-400/40"
                  : "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              }`}
            >
              <span>🟢 คนกด LINE</span>
              <span className={`rounded-full px-1.5 py-0.2 font-mono text-[11px] font-black ${
                personaActionFilter === "กดติดต่อ LINE" ? "bg-white text-emerald-800" : "bg-emerald-200/60 text-emerald-800"
              }`}>
                {number(lineCount)}
              </span>
            </button>
          )}
          {messengerCount > 0 && (
            <button
              type="button"
              onClick={() => setPersonaActionFilter("กด Inbox Messenger")}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                personaActionFilter === "กด Inbox Messenger"
                  ? "bg-sky-600 text-white shadow-sm ring-2 ring-sky-400/40"
                  : "border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100"
              }`}
            >
              <span>🔵 คนกด Messenger</span>
              <span className={`rounded-full px-1.5 py-0.2 font-mono text-[11px] font-black ${
                personaActionFilter === "กด Inbox Messenger" ? "bg-white text-sky-800" : "bg-sky-200/60 text-sky-800"
              }`}>
                {number(messengerCount)}
              </span>
            </button>
          )}
          {igCount > 0 && (
            <button
              type="button"
              onClick={() => setPersonaActionFilter("กดดู Instagram")}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                personaActionFilter === "กดดู Instagram"
                  ? "bg-pink-600 text-white shadow-sm ring-2 ring-pink-400/40"
                  : "border border-pink-200 bg-pink-50 text-pink-700 hover:bg-pink-100"
              }`}
            >
              <span>🟣 คนกด Instagram</span>
              <span className={`rounded-full px-1.5 py-0.2 font-mono text-[11px] font-black ${
                personaActionFilter === "กดดู Instagram" ? "bg-white text-pink-800" : "bg-pink-200/60 text-pink-800"
              }`}>
                {number(igCount)}
              </span>
            </button>
          )}
          {cartCount > 0 && (
            <button
              type="button"
              onClick={() => setPersonaActionFilter("หยิบใส่ตะกร้า")}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                personaActionFilter === "หยิบใส่ตะกร้า"
                  ? "bg-amber-600 text-white shadow-sm ring-2 ring-amber-400/40"
                  : "border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
              }`}
            >
              <span>🛒 คนหยิบใส่ตะกร้า</span>
              <span className={`rounded-full px-1.5 py-0.2 font-mono text-[11px] font-black ${
                personaActionFilter === "หยิบใส่ตะกร้า" ? "bg-white text-amber-900" : "bg-amber-200/60 text-amber-900"
              }`}>
                {number(cartCount)}
              </span>
            </button>
          )}
          {contactBoxCount > 0 && (
            <button
              type="button"
              onClick={() => setPersonaActionFilter("เปิดเมนูติดต่อ")}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                personaActionFilter === "เปิดเมนูติดต่อ"
                  ? "bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-400/40"
                  : "border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
              }`}
            >
              <span>🟡 เปิดเมนูติดต่อ</span>
              <span className={`rounded-full px-1.5 py-0.2 font-mono text-[11px] font-black ${
                personaActionFilter === "เปิดเมนูติดต่อ" ? "bg-white text-indigo-800" : "bg-indigo-200/60 text-indigo-800"
              }`}>
                {number(contactBoxCount)}
              </span>
            </button>
          )}
          {personaActionFilter !== "all" && (
            <button
              type="button"
              onClick={() => setPersonaActionFilter("all")}
              className="ml-auto text-xs font-semibold text-slate-400 hover:text-slate-700 underline"
            >
              ล้างฟิลเตอร์การกด
            </button>
          )}
        </div>
      )}

      <SummaryStrip data={data.summary} tab={tab} />

      <AudienceBreakdownSection
        breakdowns={tab === "products" ? data.summary.products.breakdowns : data.summary.personas.breakdowns}
        tab={tab}
        rangeDays={data.rangeDays}
        dailyTraffic={dailyTraffic}
      />

      {tab === "products" ? (
        <ProductTable products={filteredProducts} query={productQuery} sortKey={productSortKey} direction={productSortDirection} onSort={changeProductSort} />
      ) : (
        <PersonaTable personas={filteredPersonas} query={personaQuery} categoryFilter={personaCategory} behaviorFilter={personaBehavior} actionFilter={personaActionFilter} sourceFilter={personaSource} locationFilter={personaLocation} deviceFilter={personaDevice} osFilter={personaOs} browserFilter={personaBrowser} sortKey={personaSortKey} direction={personaSortDirection} onSort={changePersonaSort} />
      )}
    </div>
  )
}
