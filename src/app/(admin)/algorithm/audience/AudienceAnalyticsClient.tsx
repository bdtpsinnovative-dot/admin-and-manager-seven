"use client"

/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V4 */

import Link from "next/link"
import { useMemo, useState } from "react"
import { ArrowDown, ArrowLeft, ArrowUp, ArrowUpDown, Eye, Filter, RefreshCw, UsersRound } from "lucide-react"
import type { AudienceAnalytics, AudiencePersona, AudienceProduct, AudienceSummaryMetric } from "../../../../actions/audience-analytics"
import SourceBadge from "../SourceBadge"
import TechnologyBadge from "../TechnologyBadge"

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
  return <label className="flex min-w-[150px] flex-col gap-1 text-[10px] font-bold text-[var(--algorithm-muted)]"><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="h-10 rounded-xl border border-[var(--algorithm-rule)] bg-[var(--algorithm-surface)] px-3 text-xs font-semibold text-[var(--algorithm-ink)] outline-none focus:border-[var(--algorithm-blue)]"><option value="all">ทั้งหมด</option>{unique.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
}

function SortSelect<Key extends string>({ value, onChange, options }: { value: Key; onChange: (value: Key) => void; options: Array<{ value: Key; label: string }> }) {
  return <label className="flex min-w-[170px] flex-col gap-1 text-[10px] font-bold text-[var(--algorithm-muted)]"><span>เรียงตาม</span><select value={value} onChange={(event) => onChange(event.target.value as Key)} className="h-10 rounded-xl border border-[var(--algorithm-rule)] bg-[var(--algorithm-surface)] px-3 text-xs font-semibold text-[var(--algorithm-ink)] outline-none focus:border-[var(--algorithm-blue)]">{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
}

function DirectionSelect({ value, onChange }: { value: SortDirection; onChange: (value: SortDirection) => void }) {
  return <label className="flex min-w-[150px] flex-col gap-1 text-[10px] font-bold text-[var(--algorithm-muted)]"><span>ลำดับ</span><select value={value} onChange={(event) => onChange(event.target.value as SortDirection)} className="h-10 rounded-xl border border-[var(--algorithm-rule)] bg-[var(--algorithm-surface)] px-3 text-xs font-semibold text-[var(--algorithm-ink)] outline-none focus:border-[var(--algorithm-blue)]"><option value="desc">มาก → น้อย</option><option value="asc">น้อย → มาก</option></select></label>
}

function SummaryMetric({ label, metric, note }: { label: string; metric: AudienceSummaryMetric; note?: string }) {
  return <article className="min-w-0 rounded-2xl border border-[var(--algorithm-rule)] bg-[var(--algorithm-surface)] px-4 py-4 shadow-[0_8px_22px_rgba(34,55,47,0.04)]">
    <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--algorithm-muted)]">{label}</p>
    <p className="mt-2 truncate text-lg font-bold text-[var(--algorithm-ink)]" title={metric.value || "ยังไม่มีข้อมูล"}>{metric.value || "ยังไม่มีข้อมูล"}</p>
    <p className="mt-1 text-[10px] leading-4 text-[var(--algorithm-muted)]">{metric.count ? `${metric.share}% ของข้อมูลที่ระบุได้ · ${number(metric.count)} รายการ` : note || "ยังไม่มีข้อมูลในช่วงนี้"}</p>
  </article>
}

function SummaryStrip({ data, tab }: { data: AudienceAnalytics["summary"]; tab: "products" | "personas" }) {
  if (tab === "products") {
    const summary = data.products
    return <section className="mb-5 rounded-2xl border border-[var(--algorithm-rule)] bg-[var(--algorithm-surface-soft)] p-4 sm:p-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-[var(--font-display)] text-xl font-semibold tracking-[-0.04em]">ภาพรวมความสนใจของผู้ชม</h2>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <SummaryMetric label="อุปกรณ์ส่วนใหญ่" metric={summary.device} />
        <SummaryMetric label="เบราว์เซอร์ส่วนใหญ่" metric={summary.browser} />
        <SummaryMetric label="ช่องทางหลัก" metric={summary.source} />
        <SummaryMetric label="สถานที่หลัก" metric={summary.location} />
        <SummaryMetric label="หมวดหมู่หลัก" metric={summary.category} />
        <SummaryMetric label="สีที่พบมากสุด" metric={summary.color} />
      </div>
      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 border-t border-[var(--algorithm-rule)] pt-3 text-xs text-[var(--algorithm-muted)]"><span>ดูไม่ซ้ำ <strong className="font-mono text-[var(--algorithm-ink)]">{number(summary.uniqueViews)}</strong></span><span>ดูทั้งหมด <strong className="font-mono text-[var(--algorithm-ink)]">{number(summary.totalViews)}</strong></span><span>ดูซ้ำ <strong className="font-mono text-[var(--algorithm-ink)]">{number(summary.repeatViews)}</strong></span><span>เวลาเฉลี่ย <strong className="text-[var(--algorithm-ink)]">{seconds(summary.averageActiveSeconds)}</strong></span></div>
    </section>
  }

  const summary = data.personas
  return <section className="mb-5 rounded-2xl border border-[var(--algorithm-rule)] bg-[var(--algorithm-surface-soft)] p-4 sm:p-5">
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
      <h2 className="font-[var(--font-display)] text-xl font-semibold tracking-[-0.04em]">ภาพรวมพฤติกรรมผู้ชม</h2>
    </div>
    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <SummaryMetric label="อุปกรณ์ส่วนใหญ่" metric={summary.device} />
      <SummaryMetric label="ระบบปฏิบัติการ" metric={summary.os} />
      <SummaryMetric label="เบราว์เซอร์" metric={summary.browser} />
      <SummaryMetric label="ช่องทางแรก" metric={summary.source} />
      <SummaryMetric label="สถานที่หลัก" metric={summary.location} />
      <SummaryMetric label="กลุ่ม Persona" metric={summary.persona} />
    </div>
    <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 border-t border-[var(--algorithm-rule)] pt-3 text-xs text-[var(--algorithm-muted)]"><span>ผู้ชม <strong className="font-mono text-[var(--algorithm-ink)]">{number(summary.viewers)}</strong> โปรไฟล์</span><span>Sessions <strong className="font-mono text-[var(--algorithm-ink)]">{number(summary.sessions)}</strong></span><span>หน้าเข้าชม <strong className="font-mono text-[var(--algorithm-ink)]">{number(summary.pageViews)}</strong></span><span>เวลาเฉลี่ย <strong className="text-[var(--algorithm-ink)]">{seconds(summary.averageSessionSeconds)}</strong></span></div>
  </section>
}

function SortableHeader<Key extends string>({ label, sortKey, activeKey, direction, onSort, align = "left" }: { label: string; sortKey: Key; activeKey: Key; direction: SortDirection; onSort: (key: Key) => void; align?: "left" | "right" }) {
  const active = sortKey === activeKey
  const Icon = active ? direction === "desc" ? ArrowDown : ArrowUp : ArrowUpDown
  return <th className={`px-4 py-3 ${align === "right" ? "text-right" : "text-left"}`} aria-sort={active ? direction === "desc" ? "descending" : "ascending" : "none"}><button type="button" onClick={() => onSort(sortKey)} className={`inline-flex min-h-8 items-center gap-1 whitespace-nowrap rounded-lg px-1.5 transition-colors hover:bg-[var(--algorithm-accent-soft)] hover:text-[var(--algorithm-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--algorithm-blue)] ${align === "right" ? "ml-auto" : ""} ${active ? "text-[var(--algorithm-blue)]" : ""}`}>{label}<Icon className="h-3 w-3" /></button></th>
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
    <div className="algorithm-table-scroll rounded-2xl border border-[var(--algorithm-rule)]">
      <table className="w-full min-w-[2200px] border-collapse text-left">
        <thead className="bg-[var(--algorithm-surface-soft)] text-[10px] font-bold tracking-[0.08em] text-[var(--algorithm-muted)]"><tr><SortableHeader label="สินค้า / Product" sortKey="name" activeKey={sortKey} direction={direction} onSort={onSort} /><SortableHeader label="ดูทั้งหมด" sortKey="totalViews" activeKey={sortKey} direction={direction} onSort={onSort} align="right" /><SortableHeader label="ดูไม่ซ้ำ" sortKey="uniqueViews" activeKey={sortKey} direction={direction} onSort={onSort} align="right" /><SortableHeader label="ดูซ้ำ" sortKey="repeatViews" activeKey={sortKey} direction={direction} onSort={onSort} align="right" /><SortableHeader label="เวลาเฉลี่ย" sortKey="avgActiveSeconds" activeKey={sortKey} direction={direction} onSort={onSort} /><th className="px-4 py-3">สี</th><th className="px-4 py-3">Category</th><SortableHeader label="ราคา" sortKey="price" activeKey={sortKey} direction={direction} onSort={onSort} /><th className="px-4 py-3">อุปกรณ์</th><th className="px-4 py-3">Browser</th><th className="px-4 py-3"><div className="flex gap-1"><button type="button" onClick={() => onSort("quickBounceCount")} className={`inline-flex min-h-8 items-center gap-1 whitespace-nowrap rounded-lg px-1.5 hover:bg-[var(--algorithm-accent-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--algorithm-blue)] ${sortKey === "quickBounceCount" ? "text-[var(--algorithm-blue)]" : ""}`}>ตีกลับ{sortKey === "quickBounceCount" ? direction === "desc" ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" /> : <ArrowUpDown className="h-3 w-3" />}</button><span aria-hidden="true">/</span><button type="button" onClick={() => onSort("continueCount")} className={`inline-flex min-h-8 items-center gap-1 whitespace-nowrap rounded-lg px-1.5 hover:bg-[var(--algorithm-accent-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--algorithm-blue)] ${sortKey === "continueCount" ? "text-[var(--algorithm-blue)]" : ""}`}>ไปต่อ{sortKey === "continueCount" ? direction === "desc" ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" /> : <ArrowUpDown className="h-3 w-3" />}</button></div></th><th className="px-4 py-3">ช่องทางเข้าเว็บ</th><th className="px-4 py-3">กลุ่มคอลเลกชัน</th><th className="px-4 py-3">ภูมิภาค / เมือง</th></tr></thead>
        <tbody>{pageRows.map((product) => <tr key={product.id} className="border-t border-[var(--algorithm-rule)] align-top hover:bg-[var(--algorithm-surface-soft)]"><td className="px-4 py-4"><Link href={`/algorithm/products/${product.id}`} className="flex min-w-[300px] items-center gap-3 text-[var(--algorithm-ink)] hover:text-[var(--algorithm-blue)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--algorithm-blue)]"><span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl border border-[var(--algorithm-rule)] bg-[var(--algorithm-surface-soft)]">{product.imageUrl ? <img src={product.imageUrl} alt="" width={56} height={56} loading="lazy" decoding="async" className="h-full w-full object-contain p-1.5" /> : <Eye className="h-4 w-4 text-[var(--algorithm-muted)]" />}</span><span className="min-w-0"><span className="block truncate font-bold">{product.name}</span><span className="mt-1 block truncate font-mono text-[10px] font-normal text-[var(--algorithm-muted)]">{product.sku || "ไม่มี SKU"}</span><span className="mt-1 block text-[10px] font-normal text-[var(--algorithm-muted)]">{product.status === "active" ? "มีสินค้า" : product.status || "ไม่ระบุ"}</span></span></Link></td><td className="px-4 py-4 text-right font-mono text-sm">{number(product.totalViews)}</td><td className="px-4 py-4 text-right font-mono text-sm font-bold text-[var(--algorithm-accent-strong)]">{number(product.uniqueViews)}<span className="mt-1 block text-[10px] font-normal text-[var(--algorithm-muted)]">{percent(product.uniqueViews, product.totalViews)}</span></td><td className="px-4 py-4 text-right font-mono text-sm">{number(product.repeatViews)}</td><td className="whitespace-nowrap px-4 py-4 text-xs"><span className="block font-semibold">{seconds(product.avgActiveSeconds)}</span></td><td className="px-4 py-4 text-xs">{product.color || "ไม่ระบุสี"}</td><td className="px-4 py-4 text-xs font-semibold">{product.category || "ไม่ระบุหมวด"}</td><td className="whitespace-nowrap px-4 py-4 text-xs">{product.price === null ? "ไม่ระบุราคา" : `${number(product.price)} บาท`}</td><td className="px-4 py-4 text-xs"><TechnologyBadge kind="device" value={product.primaryDevice} note={`สัดส่วน ${product.primaryDeviceShare}%`} /></td><td className="px-4 py-4 text-xs"><TechnologyBadge kind="browser" value={product.primaryBrowser} note={`สัดส่วน ${product.primaryBrowserShare}%`} /></td><td className="px-4 py-4 text-xs"><span className="block">ตีกลับ {number(product.quickBounceCount)}</span><span className="mt-1 block text-[var(--algorithm-blue)]">ไปต่อ {number(product.continueProductCount + product.continueCollectionCount + product.continueOtherCount)}</span></td><td className="px-4 py-4 text-xs"><SourceBadge value={product.primarySource} note={`สัดส่วน ${product.primarySourceShare}%`} /></td><td className="px-4 py-4 text-xs">{product.collection || "ไม่ระบุกลุ่ม"}</td><td className="max-w-[200px] px-4 py-4 text-xs text-[var(--algorithm-muted)]">{share(product.primaryLocation, product.primaryLocationShare)}</td></tr>)}</tbody>
      </table>
      {rows.length === 0 && <div className="px-6 py-14 text-center text-sm text-[var(--algorithm-muted)]">ไม่พบสินค้าตามตัวกรองนี้</div>}
    </div>
    {rows.length > 0 && <div className="flex flex-col gap-3 rounded-2xl border border-[var(--algorithm-rule)] bg-[var(--algorithm-surface-soft)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-[var(--algorithm-muted)]">แสดง <span className="font-mono font-bold text-[var(--algorithm-ink)]">{number(startIndex + 1)}–{number(Math.min(startIndex + PRODUCT_PAGE_SIZE, rows.length))}</span> จาก {number(rows.length)} สินค้า · หน้าละ {PRODUCT_PAGE_SIZE}</p>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => setPagination({ key: paginationKey, page: Math.max(currentPage - 1, 1) })} disabled={currentPage === 1} className="inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-xl border border-[var(--algorithm-rule)] bg-[var(--algorithm-surface)] px-4 text-xs font-bold text-[var(--algorithm-ink)] transition-colors hover:bg-[var(--algorithm-accent-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--algorithm-blue)] active:bg-[var(--algorithm-rule)] disabled:cursor-not-allowed disabled:opacity-40">ก่อนหน้า</button>
        <span className="min-w-20 text-center font-mono text-xs font-bold text-[var(--algorithm-muted)]">{number(currentPage)} / {number(totalPages)}</span>
        <button type="button" onClick={() => setPagination({ key: paginationKey, page: Math.min(currentPage + 1, totalPages) })} disabled={currentPage === totalPages} className="inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-xl bg-[var(--algorithm-ink)] px-4 text-xs font-bold text-white transition-opacity hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--algorithm-blue)] focus-visible:ring-offset-2 active:opacity-70 disabled:cursor-not-allowed disabled:opacity-40">ถัดไป</button>
      </div>
    </div>}
  </div>
}
function PersonaTable({ personas, query, categoryFilter, behaviorFilter, sourceFilter, locationFilter, deviceFilter, osFilter, browserFilter, sortKey, direction, onSort }: { personas: AudiencePersona[]; query: string; categoryFilter: string; behaviorFilter: string; sourceFilter: string; locationFilter: string; deviceFilter: string; osFilter: string; browserFilter: string; sortKey: PersonaSortKey; direction: SortDirection; onSort: (key: PersonaSortKey) => void }) {
  const rows = personas.filter((persona) => `${persona.identityLabel} ${persona.location || ""} ${persona.categories.join(" ")} ${persona.labels.join(" ")}`.toLowerCase().includes(query.toLowerCase()) && (categoryFilter === "all" || persona.categories.includes(categoryFilter)) && (behaviorFilter === "all" || persona.labels.includes(behaviorFilter)) && (sourceFilter === "all" || persona.latestSource === sourceFilter || persona.firstTouchSource === sourceFilter) && (locationFilter === "all" || persona.location === locationFilter) && (deviceFilter === "all" || persona.device === deviceFilter) && (osFilter === "all" || persona.os === osFilter) && (browserFilter === "all" || persona.browser === browserFilter))
  return <div className="algorithm-table-scroll rounded-2xl border border-[var(--algorithm-rule)]"><table className="w-full min-w-[1900px] border-collapse text-left"><thead className="bg-[var(--algorithm-surface-soft)] text-[10px] font-bold tracking-[0.08em] text-[var(--algorithm-muted)]"><tr><SortableHeader label="วันที่" sortKey="lastSeenAt" activeKey={sortKey} direction={direction} onSort={onSort} /><th className="px-4 py-3">ID / ชื่อ</th><th className="px-4 py-3">สถานที่</th><SortableHeader label="ระยะเวลาการเข้า" sortKey="averageSessionSeconds" activeKey={sortKey} direction={direction} onSort={onSort} /><SortableHeader label="จำนวนครั้งที่เข้าเว็บ" sortKey="sessions" activeKey={sortKey} direction={direction} onSort={onSort} align="right" /><SortableHeader label="ราคาเฉลี่ย / ช่วง" sortKey="averagePrice" activeKey={sortKey} direction={direction} onSort={onSort} /><th className="px-4 py-3">อุปกรณ์</th><th className="px-4 py-3">ระบบ / Browser</th><SortableHeader label="จำนวนหน้า" sortKey="pageViews" activeKey={sortKey} direction={direction} onSort={onSort} align="right" /><th className="px-4 py-3">Persona</th><th className="px-4 py-3">แหล่งที่มา</th></tr></thead><tbody>{rows.map((persona) => <tr key={persona.identityKey} className="border-t border-[var(--algorithm-rule)] align-top hover:bg-[var(--algorithm-surface-soft)]"><td className="whitespace-nowrap px-4 py-4 text-xs text-[var(--algorithm-muted)]"><span className="block">พบครั้งแรก: {dateTime(persona.firstSeenAt)}</span><span className="mt-1 block">ดูล่าสุด: {dateTime(persona.lastSeenAt)}</span></td><td className="px-4 py-4"><span className="block font-bold">{persona.identityLabel}</span><span className="mt-1 block text-[10px] text-[var(--algorithm-muted)]">{persona.identityType === "user" ? "บัญชีที่ล็อกอิน" : "ผู้เข้าชมทั่วไป"}</span></td><td className="max-w-[180px] px-4 py-4 text-xs text-[var(--algorithm-muted)]">{persona.location || "ไม่ระบุ"}</td><td className="whitespace-nowrap px-4 py-4 text-xs"><span className="block font-semibold">{seconds(persona.averageSessionSeconds)}</span><span className="mt-1 block text-[10px] text-[var(--algorithm-muted)]">รวม {seconds(persona.activeSeconds)}</span></td><td className="px-4 py-4 text-right font-mono text-sm font-bold">{number(persona.sessions)}</td><td className="whitespace-nowrap px-4 py-4 text-xs">{persona.averagePrice === null ? "ไม่ระบุ" : `${number(persona.averagePrice)} บาท`}<span className="mt-1 block text-[10px] text-[var(--algorithm-muted)]">{persona.minPrice === null ? "—" : `${number(persona.minPrice)}–${number(persona.maxPrice || persona.minPrice)} บาท`}</span></td><td className="px-4 py-4 text-xs"><TechnologyBadge kind="device" value={persona.device} /></td><td className="px-4 py-4 text-xs"><div className="space-y-2"><TechnologyBadge kind="os" value={persona.os} /><TechnologyBadge kind="browser" value={persona.browser} /></div></td><td className="px-4 py-4 text-right font-mono text-sm"><span className="block">{number(persona.pageViews)}</span><span className="mt-1 block text-[10px] text-[var(--algorithm-muted)]">ไม่ซ้ำ {number(persona.uniquePages)}</span></td><td className="max-w-[280px] px-4 py-4"><div className="flex flex-wrap gap-1.5">{persona.labels.map((tag) => <span key={tag} className="rounded-full bg-[var(--algorithm-accent-soft)] px-2.5 py-1 text-[10px] font-bold text-[var(--algorithm-accent-strong)]" title={persona.reasons.join(" · ")}>{tag}</span>)}</div><p className="mt-2 text-[10px] leading-4 text-[var(--algorithm-muted)]">{persona.reasons.join(" · ")}</p></td><td className="px-4 py-4 text-xs"><span className="block text-[10px] text-[var(--algorithm-muted)]">ครั้งแรก</span><SourceBadge value={persona.firstTouchSource} /><span className="mt-2 block text-[10px] text-[var(--algorithm-muted)]">ล่าสุด</span><SourceBadge value={persona.latestSource} /></td></tr>)}</tbody></table>{rows.length === 0 && <div className="px-6 py-14 text-center text-sm text-[var(--algorithm-muted)]">ไม่พบผู้ชมตามตัวกรองนี้</div>}</div>
}

export default function AudienceAnalyticsClient({ data, embedded = false }: { data: AudienceAnalytics; embedded?: boolean }) {
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
  const [minSessions, setMinSessions] = useState("0")
  const [personaSortKey, setPersonaSortKey] = useState<PersonaSortKey>("lastSeenAt")
  const [personaSortDirection, setPersonaSortDirection] = useState<SortDirection>("desc")
  const filteredProducts = useMemo(() => data.products
    .filter((item) => (productCategory === "all" || item.category === productCategory) && (productDevice === "all" || item.primaryDevice === productDevice) && (productBrowser === "all" || item.primaryBrowser === productBrowser) && (productColor === "all" || item.color === productColor) && (productSource === "all" || item.primarySource === productSource) && (productLocation === "all" || item.primaryLocation === productLocation))
    .toSorted((left, right) => compareSortValues(productSortValue(left, productSortKey), productSortValue(right, productSortKey), productSortDirection) || sortCollator.compare(left.name, right.name)), [data.products, productCategory, productDevice, productBrowser, productColor, productSource, productLocation, productSortKey, productSortDirection])
  const filteredPersonas = useMemo(() => data.personas
    .filter((item) => item.sessions >= Number(minSessions || 0) && (personaCategory === "all" || item.categories.includes(personaCategory)) && (personaBehavior === "all" || item.labels.includes(personaBehavior)) && (personaSource === "all" || item.latestSource === personaSource || item.firstTouchSource === personaSource) && (personaLocation === "all" || item.location === personaLocation) && (personaDevice === "all" || item.device === personaDevice) && (personaOs === "all" || item.os === personaOs) && (personaBrowser === "all" || item.browser === personaBrowser))
    .toSorted((left, right) => compareSortValues(personaSortValue(left, personaSortKey), personaSortValue(right, personaSortKey), personaSortDirection) || sortCollator.compare(left.identityLabel, right.identityLabel)), [data.personas, minSessions, personaCategory, personaBehavior, personaSource, personaLocation, personaDevice, personaOs, personaBrowser, personaSortKey, personaSortDirection])
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

  const content = (
    <div className={embedded ? "mt-5 rounded-[2rem] border border-[var(--algorithm-rule)] bg-[var(--algorithm-surface)] p-3 shadow-[var(--algorithm-shadow)] sm:p-5 lg:p-7" : "rounded-[2rem] border border-[var(--algorithm-rule)] bg-[var(--algorithm-surface)] p-3 shadow-[var(--algorithm-shadow)] sm:p-5 lg:p-7"}>
      {!embedded && (
        <header className="flex flex-col gap-4 border-b border-[var(--algorithm-rule)] pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <Link href="/algorithm" className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[var(--algorithm-surface-soft)] px-4 text-xs font-bold hover:bg-[var(--algorithm-accent-soft)]">
              <ArrowLeft className="h-4 w-4" />กลับภาพรวม
            </Link>
            <div>
              <p className="font-[var(--font-display)] text-lg font-semibold">Audience Analytics</p>
            </div>
          </div>
          <div className="flex items-center gap-1 rounded-full border border-[var(--algorithm-rule)] p-1">
            {ranges.map((range) => (
              <Link key={range.days} href={`/algorithm/audience?range=${range.days}`} className={`rounded-full px-3 py-2 text-xs font-bold ${data.rangeDays === range.days ? "bg-[var(--algorithm-ink)] text-white" : "text-[var(--algorithm-muted)] hover:bg-[var(--algorithm-accent-soft)]"}`}>
                {range.label}
              </Link>
            ))}
          </div>
        </header>
      )}

      {!embedded && (
        <section className="flex flex-col justify-between gap-6 py-6 lg:flex-row lg:items-end">
          <div>
            <h1 className="font-[var(--font-display)] text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">Audience Analytics</h1>
            <p className="mt-2 text-sm text-[var(--algorithm-muted)]">ข้อมูลย้อนหลัง {data.rangeDays} วัน</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-right">
            <div className="rounded-2xl bg-[var(--algorithm-surface-soft)] px-5 py-3">
              <p className="font-mono text-2xl font-bold">{number(data.products.length)}</p>
              <p className="text-[10px] text-[var(--algorithm-muted)]">สินค้า</p>
            </div>
            <div className="rounded-2xl bg-[var(--algorithm-surface-soft)] px-5 py-3">
              <p className="font-mono text-2xl font-bold">{number(data.personas.length)}</p>
              <p className="text-[10px] text-[var(--algorithm-muted)]">ผู้ชม</p>
            </div>
          </div>
        </section>
      )}

      {data.error && <div className="mb-5 rounded-2xl border border-[var(--algorithm-danger)]/30 bg-[var(--algorithm-hot-soft)] p-4 text-sm text-[var(--algorithm-danger)]">{data.error}</div>}

      <div className={`${embedded ? "" : "mt-2"} mb-5 flex items-center gap-2 rounded-full bg-[var(--algorithm-surface-soft)] p-1`}>
        <button onClick={() => setTab("products")} className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold ${tab === "products" ? "bg-[var(--algorithm-ink)] text-white" : "text-[var(--algorithm-muted)]"}`}>
          <Eye className="h-3.5 w-3.5" />วิเคราะห์สินค้า
        </button>
        <button onClick={() => setTab("personas")} className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold ${tab === "personas" ? "bg-[var(--algorithm-ink)] text-white" : "text-[var(--algorithm-muted)]"}`}>
          <UsersRound className="h-3.5 w-3.5" />วิเคราะห์ผู้ชม (Persona)
        </button>
      </div>

      <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-[var(--algorithm-rule)] bg-[var(--algorithm-surface-soft)] p-4">
        {tab === "products" ? (
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex min-w-[240px] flex-1 flex-col gap-1 text-[10px] font-bold text-[var(--algorithm-muted)]">
              <span>ค้นหาสินค้า</span>
              <input value={productQuery} onChange={(event) => setProductQuery(event.target.value)} placeholder="ชื่อสินค้า, SKU, หมวด..." className="h-10 rounded-xl border border-[var(--algorithm-rule)] bg-white px-3 text-xs outline-none focus:border-[var(--algorithm-blue)]" />
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
            <label className="flex min-w-[240px] flex-1 flex-col gap-1 text-[10px] font-bold text-[var(--algorithm-muted)]">
              <span>ค้นหาผู้ชม</span>
              <input value={personaQuery} onChange={(event) => setPersonaQuery(event.target.value)} placeholder="ID, ชื่อ, สถานที่, Persona..." className="h-10 rounded-xl border border-[var(--algorithm-rule)] bg-white px-3 text-xs outline-none focus:border-[var(--algorithm-blue)]" />
            </label>
            <Select label="หมวดที่สนใจ" value={personaCategory} onChange={setPersonaCategory} options={personaCategoryOptions} />
            <Select label="กลุ่มพฤติกรรม" value={personaBehavior} onChange={setPersonaBehavior} options={labelOptions} />
            <Select label="ช่องทาง" value={personaSource} onChange={setPersonaSource} options={personaSourceOptions} />
            <Select label="สถานที่" value={personaLocation} onChange={setPersonaLocation} options={personaLocationOptions} />
            <Select label="อุปกรณ์" value={personaDevice} onChange={setPersonaDevice} options={data.personas.map((item) => item.device || "")} />
            <Select label="ระบบปฏิบัติการ" value={personaOs} onChange={setPersonaOs} options={data.personas.map((item) => item.os || "")} />
            <Select label="เบราว์เซอร์" value={personaBrowser} onChange={setPersonaBrowser} options={data.personas.map((item) => item.browser || "")} />
            <label className="flex min-w-[130px] flex-col gap-1 text-[10px] font-bold text-[var(--algorithm-muted)]">
              <span>ขั้นต่ำครั้งที่เข้าเว็บ</span>
              <input type="number" min="0" value={minSessions} onChange={(event) => setMinSessions(event.target.value)} className="h-10 rounded-xl border border-[var(--algorithm-rule)] bg-white px-3 text-xs outline-none focus:border-[var(--algorithm-blue)]" />
            </label>
            <SortSelect value={personaSortKey} onChange={setPersonaSortKey} options={personaSortOptions} />
            <DirectionSelect value={personaSortDirection} onChange={setPersonaSortDirection} />
          </div>
        )}
      </div>

      <SummaryStrip data={data.summary} tab={tab} />

      {tab === "products" ? (
        <ProductTable products={filteredProducts} query={productQuery} sortKey={productSortKey} direction={productSortDirection} onSort={changeProductSort} />
      ) : (
        <PersonaTable personas={filteredPersonas} query={personaQuery} categoryFilter={personaCategory} behaviorFilter={personaBehavior} sourceFilter={personaSource} locationFilter={personaLocation} deviceFilter={personaDevice} osFilter={personaOs} browserFilter={personaBrowser} sortKey={personaSortKey} direction={personaSortDirection} onSort={changePersonaSort} />
      )}
    </div>
  )

  if (embedded) return content

  return (
    <div className="algorithm-shell relative min-h-screen overflow-x-clip bg-[var(--algorithm-paper)] font-[var(--font-body)] text-[var(--algorithm-ink)]">
      <main className="relative mx-auto max-w-[1800px] px-3 py-3 sm:px-5 sm:py-5 lg:px-8 lg:py-8">
        {content}
      </main>
    </div>
  )
}
