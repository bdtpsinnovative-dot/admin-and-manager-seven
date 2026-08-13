"use client"

/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V4 */

import { useState } from "react"
import Link from "next/link"
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  CircleAlert,
  Eye,
  Globe2,
  MapPinned,
  MoreHorizontal,
  PackageCheck,
  RadioTower,
  Sparkles,
  TrendingUp,
  UsersRound,
} from "lucide-react"
import type { AlgorithmOverview, AlgorithmRange, HotItem, TrendPoint } from "../../../actions/algorithm"

function number(value: number) {
  return new Intl.NumberFormat("th-TH").format(value)
}

function dateTime(value: string | null) {
  if (!value) return "ยังไม่มีข้อมูล"
  return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
}

function rangeLabel(days: AlgorithmRange) {
  return days === 1 ? "24 ชั่วโมงล่าสุด" : `${days} วันล่าสุด`
}

function trafficLabel(value: string) {
  return ({ internal: "ภายในบริษัท", bot: "บอท", unknown: "ผู้เข้าชมที่นับได้" } as Record<string, string>)[value] || value
}

function trafficNote(value: string) {
  return ({ internal: "IP/CIDR บริษัท", bot: "ตรวจจาก User Agent", unknown: "ไม่พบสัญญาณว่าเป็นบอทหรือภายในบริษัท" } as Record<string, string>)[value] || ""
}

function trafficCount(data: AlgorithmOverview, label: string) {
  return data.trafficSummary.find((traffic) => traffic.label === label)?.count ?? 0
}

function identityCount(data: AlgorithmOverview, label: "user" | "visitor") {
  return data.identitySummary.find((identity) => identity.label === label)?.count ?? 0
}

function identityLabel(value: "user" | "visitor") {
  return value === "user" ? "บัญชีที่ล็อกอิน" : "ผู้เข้าชมที่ไม่ได้ล็อกอิน"
}

function countryFlag(code: string) {
  return /^[A-Z]{2}$/.test(code)
    ? code.split("").map((letter) => String.fromCodePoint(127397 + letter.charCodeAt(0))).join("")
    : "🌐"
}

const thaiProvinceLabels: Record<string, string> = {
  "10": "กรุงเทพมหานคร", "11": "สมุทรปราการ", "12": "นนทบุรี", "13": "ปทุมธานี", "14": "พระนครศรีอยุธยา",
  "15": "อ่างทอง", "16": "ลพบุรี", "17": "สิงห์บุรี", "18": "ชัยนาท", "19": "สระบุรี",
  "20": "ชลบุรี", "21": "ระยอง", "22": "จันทบุรี", "23": "ตราด", "24": "ฉะเชิงเทรา", "25": "ปราจีนบุรี",
  "26": "นครนายก", "27": "สระแก้ว", "30": "นครราชสีมา", "31": "บุรีรัมย์", "32": "สุรินทร์", "33": "ศรีสะเกษ",
  "34": "อุบลราชธานี", "35": "ยโสธร", "36": "ชัยภูมิ", "37": "อำนาจเจริญ", "38": "บึงกาฬ", "39": "หนองบัวลำภู",
  "40": "ขอนแก่น", "41": "อุดรธานี", "42": "เลย", "43": "หนองคาย", "44": "มหาสารคาม", "45": "ร้อยเอ็ด",
  "46": "กาฬสินธุ์", "47": "สกลนคร", "48": "นครพนม", "49": "มุกดาหาร", "50": "เชียงใหม่", "51": "ลำพูน",
  "52": "ลำปาง", "53": "อุตรดิตถ์", "54": "แพร่", "55": "น่าน", "56": "พะเยา", "57": "เชียงราย", "58": "แม่ฮ่องสอน",
  "60": "นครสวรรค์", "61": "อุทัยธานี", "62": "กำแพงเพชร", "63": "ตาก", "64": "สุโขทัย", "65": "พิษณุโลก",
  "66": "พิจิตร", "67": "เพชรบูรณ์", "70": "ราชบุรี", "71": "กาญจนบุรี", "72": "สุพรรณบุรี", "73": "นครปฐม",
  "74": "สมุทรสาคร", "75": "สมุทรสงคราม", "76": "เพชรบุรี", "77": "ประจวบคีรีขันธ์", "80": "นครศรีธรรมราช",
  "81": "กระบี่", "82": "พังงา", "83": "ภูเก็ต", "84": "สุราษฎร์ธานี", "85": "ระนอง", "86": "ชุมพร",
  "90": "สงขลา", "91": "สตูล", "92": "ตรัง", "93": "พัทลุง", "94": "ปัตตานี", "95": "ยะลา", "96": "นราธิวาส",
}

function regionDisplayLabel(countryCode: string | null, region: string) {
  if (countryCode === "TH" && thaiProvinceLabels[region]) return thaiProvinceLabels[region]
  return /^\d+$/.test(region) ? `รหัสพื้นที่ ${region}` : region
}

function normalizePlace(value: string) {
  return value.toLowerCase().replace(/[\s.\-_/()]/g, "")
}

function isSameRegionAndCity(countryCode: string | null, region: string, city: string) {
  const regionName = regionDisplayLabel(countryCode, region)
  const normalizedRegion = normalizePlace(regionName)
  const normalizedCity = normalizePlace(city)
  if (normalizedRegion === normalizedCity) return true
  if (countryCode === "TH" && normalizedRegion === "กรุงเทพมหานคร" && ["bangkok", "กรุงเทพ", "กรุงเทพมหานคร"].includes(normalizedCity)) return true
  return false
}

function trendLabel(value: string, rangeDays: AlgorithmRange) {
  return new Intl.DateTimeFormat("th-TH", rangeDays === 1 ? { hour: "2-digit" } : { day: "numeric", month: "short" }).format(new Date(value))
}

function trendTooltipLabel(value: string, rangeDays: AlgorithmRange) {
  return new Intl.DateTimeFormat("th-TH", rangeDays === 1
    ? { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }
    : { day: "numeric", month: "long", year: "numeric" }).format(new Date(value))
}

function availabilityLabel(item: HotItem) {
  return item.availability === "available" ? "มีของ" : "พรีออเดอร์"
}

function rankingReasons(item: HotItem) {
  return [
    `ยอดดูไม่ซ้ำ ${number(item.uniqueViews)} ครั้ง`,
    item.lastViewedAt ? `ดูล่าสุด ${dateTime(item.lastViewedAt)}` : "ยังไม่มีเวลาการดูล่าสุด",
    item.stockTotal > 0 ? `มีสต็อก ${number(item.stockTotal)} ชิ้น` : "พรีออเดอร์",
  ]
}

function MetricCard({ icon: Icon, label, value, note, accent = "green" }: { icon: typeof Eye; label: string; value: string; note: string; accent?: "green" | "blue" | "amber" }) {
  const iconClass = accent === "blue" ? "bg-[var(--algorithm-blue-soft)] text-[var(--algorithm-blue)]" : accent === "amber" ? "bg-[var(--algorithm-hot-soft)] text-[var(--algorithm-hot)]" : "bg-[var(--algorithm-accent-soft)] text-[var(--algorithm-accent-strong)]"
  return <article className="min-w-0 rounded-[1.35rem] border border-[var(--algorithm-rule)] bg-[var(--algorithm-surface)] p-4 shadow-[var(--algorithm-shadow-soft)] sm:p-5"><div className="flex items-start justify-between gap-3"><p className="text-sm font-semibold text-[var(--algorithm-ink-soft)]">{label}</p><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${iconClass}`}><Icon className="h-4 w-4" /></span></div><p className="mt-7 truncate font-[var(--font-display)] text-3xl font-semibold tracking-[-0.05em] tabular-nums text-[var(--algorithm-ink)]">{value}</p><p className="mt-2 truncate text-xs text-[var(--algorithm-muted)]">{note}</p></article>
}

function TrendChart({ trend, rangeDays }: { trend: TrendPoint[]; rangeDays: AlgorithmRange }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const maxViews = Math.max(...trend.map((point) => point.views), 1)
  const barWidth = trend.length > 0 ? Math.max(700 / trend.length - 5, 4) : 0
  const maxIndex = trend.reduce((best, point, index) => point.views > (trend[best]?.views ?? -1) ? index : best, 0)
  const labelStep = Math.max(Math.ceil(trend.length / 6), 1)
  const hoveredPoint = hoveredIndex === null ? null : trend[hoveredIndex]
  const hoveredX = hoveredIndex === null ? 50 : Math.min(Math.max(((hoveredIndex + 0.5) / Math.max(trend.length, 1)) * 100, 12), 88)

  return <div className="mt-5 rounded-[1.25rem] border border-[var(--algorithm-rule)] bg-[var(--algorithm-surface-soft)] p-4 sm:p-5"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2 text-xs font-semibold text-[var(--algorithm-muted)]"><span className="h-2.5 w-2.5 rounded-full bg-[var(--algorithm-accent)]" />ยอดดูไม่ซ้ำ</div><span className="font-mono text-[10px] text-[var(--algorithm-muted)]">สูงสุด {number(Math.max(...trend.map((point) => point.views), 0))}</span></div>{trend.length === 0 ? <div className="flex h-56 items-center justify-center text-sm text-[var(--algorithm-muted)]">ยังไม่มีข้อมูลแนวโน้ม</div> : <><div className="relative mt-4"><svg viewBox="0 0 700 220" className="h-auto w-full" role="img" aria-label="กราฟยอดดูไม่ซ้ำตามช่วงเวลา"><line x1="0" x2="700" y1="28" y2="28" stroke="var(--algorithm-rule)" strokeWidth="1" /><line x1="0" x2="700" y1="103" y2="103" stroke="var(--algorithm-rule)" strokeWidth="1" /><line x1="0" x2="700" y1="178" y2="178" stroke="var(--algorithm-rule-strong)" strokeWidth="1" />{trend.map((point, index) => { const height = Math.max((point.views / maxViews) * 150, point.views > 0 ? 5 : 1); const x = (index / trend.length) * 700 + 2; const y = 178 - height; const active = index === maxIndex && point.views > 0; return <rect key={point.bucket} x={x} y={y} width={barWidth} height={height} rx="3" fill={active ? "var(--algorithm-accent-strong)" : "var(--algorithm-accent)"} opacity={hoveredIndex === index ? "1" : active ? "1" : "0.75"} className="cursor-help" onMouseEnter={() => setHoveredIndex(index)} onMouseLeave={() => setHoveredIndex(null)} onFocus={() => setHoveredIndex(index)} onBlur={() => setHoveredIndex(null)} tabIndex={0}><title>{`${trendTooltipLabel(point.bucket, rangeDays)} · ยอดดูไม่ซ้ำ ${number(point.views)} ครั้ง`}</title></rect> })}</svg>{hoveredPoint && <div className="pointer-events-none absolute top-2 z-10 -translate-x-1/2 rounded-xl border border-[var(--algorithm-rule-strong)] bg-[var(--algorithm-ink)] px-3 py-2 text-center text-white shadow-lg" style={{ left: `${hoveredX}%` }}><p className="whitespace-nowrap text-[10px] text-white/70">{trendTooltipLabel(hoveredPoint.bucket, rangeDays)}</p><p className="mt-0.5 whitespace-nowrap font-mono text-sm font-bold">{number(hoveredPoint.views)} ครั้ง</p><p className="text-[10px] text-white/70">ยอดดูไม่ซ้ำ</p></div>}</div><div className="mt-1 flex justify-between gap-2 font-mono text-[10px] text-[var(--algorithm-muted)]">{trend.map((point, index) => index % labelStep === 0 || index === trend.length - 1 ? <span key={point.bucket}>{trendLabel(point.bucket, rangeDays)}</span> : <span key={point.bucket} aria-hidden="true" />)}</div></>}</div>
}

function ProductThumb({ item }: { item: HotItem }) {
  return <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-[var(--algorithm-surface-soft)]"><span className="h-1.5 w-1.5 rounded-full bg-[var(--algorithm-accent)]" />{item.imageUrl ? <img src={item.imageUrl} alt="" className="h-full w-full object-contain p-1" /> : <PackageCheck className="h-5 w-5 text-[var(--algorithm-muted)]" />}</div>
}

function StatusPill({ item }: { item: HotItem }) {
  const available = item.availability === "available"
  return <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-bold ${available ? "bg-[var(--algorithm-accent-soft)] text-[var(--algorithm-accent-strong)]" : "bg-[var(--algorithm-hot-soft)] text-[var(--algorithm-hot)]"}`}><span className={`h-1.5 w-1.5 rounded-full ${available ? "bg-[var(--algorithm-accent-strong)]" : "bg-[var(--algorithm-hot)]"}`} />{availabilityLabel(item)}</span>
}

function TopProductRow({ item }: { item: HotItem }) {
  return <Link href={`/algorithm/products/${item.id}`} className="group flex items-center gap-3 rounded-2xl px-2 py-3 transition-transform duration-[var(--dur-fast)] hover:-translate-y-0.5 hover:bg-[var(--algorithm-surface-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--algorithm-blue)]"><span className="w-5 shrink-0 font-mono text-xs font-bold tabular-nums text-[var(--algorithm-muted)]">{String(item.rank).padStart(2, "0")}</span><ProductThumb item={item} /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-[var(--algorithm-ink)]">{item.name}</span><span className="mt-1 block truncate text-xs text-[var(--algorithm-muted)]">{item.collectionName}</span></span><span className="shrink-0 text-right"><span className="block font-mono text-sm font-bold tabular-nums text-[var(--algorithm-accent-strong)]">{number(item.uniqueViews)}</span><span className="mt-1 block text-[10px] text-[var(--algorithm-muted)]">ยอดดูไม่ซ้ำ</span></span></Link>
}

function LocationBars({ data }: { data: AlgorithmOverview }) {
  const [expandedCountries, setExpandedCountries] = useState<Record<string, boolean>>({})
  const maxViews = Math.max(data.locationHierarchy[0]?.views ?? 1, 1)
  const hasLocation = data.locationHierarchy.length > 0 || data.unspecifiedLocationViews > 0

  if (!hasLocation) {
    return <div className="mt-5 rounded-2xl border border-dashed border-[var(--algorithm-rule-strong)] px-4 py-8 text-center text-sm text-[var(--algorithm-muted)]"><MapPinned className="mx-auto mb-2 h-5 w-5" />ยังไม่มีข้อมูลสถานที่</div>
  }

  return <div className="mt-5 space-y-3">
    <p className="text-[10px] font-semibold text-[var(--algorithm-muted)]">ยอดดูไม่ซ้ำ · แสดง 5 จังหวัด/ภูมิภาคแรก กดเพื่อดูเมืองเพิ่มเติม</p>
    {data.locationHierarchy.map((country, countryIndex) => {
      const displayName = country.label
      const displayFlag = country.code ? countryFlag(country.code) : "🌐"
      const countryKey = country.code || country.label
      const isExpanded = Boolean(expandedCountries[countryKey])
      const visibleRegions = isExpanded ? country.regions : country.regions.slice(0, 5)
      const hiddenRegionCount = Math.max(country.regions.length - visibleRegions.length, 0)
      return <details key={country.code || country.label} open={countryIndex === 0} className="group rounded-2xl border border-[var(--algorithm-rule)] bg-[var(--algorithm-surface-soft)]">
        <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 marker:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--algorithm-blue)]">
          <span aria-hidden="true" className="text-lg leading-none">{displayFlag}</span>
          <span className="min-w-0 flex-1 truncate text-sm font-bold text-[var(--algorithm-ink)]" title={country.code ? `${displayName} (${country.code})` : displayName}>{displayName}</span>
          <span className="hidden h-2 w-16 overflow-hidden rounded-full bg-[var(--algorithm-rule)] sm:block"><span className="block h-full rounded-full bg-[var(--algorithm-blue)]" style={{ width: `${Math.max((country.views / maxViews) * 100, 6)}%` }} /></span>
          <span className="font-mono text-xs font-bold tabular-nums text-[var(--algorithm-muted)]">{number(country.views)}</span>
          <span aria-hidden="true" className="text-xs text-[var(--algorithm-muted)] transition-transform group-open:rotate-180">⌄</span>
        </summary>
        <div className="space-y-2 border-t border-[var(--algorithm-rule)] px-4 py-3 sm:pl-11">
          {visibleRegions.map((region) => {
            const regionName = regionDisplayLabel(country.code, region.label)
            const distinctCities = region.cities.filter((city) => !isSameRegionAndCity(country.code, region.label, city.label))
            if (distinctCities.length === 0) return <div key={region.label} className="flex min-h-9 items-center justify-between gap-3 rounded-xl px-2 text-xs font-semibold text-[var(--algorithm-ink-soft)]"><span className="truncate">{regionName}</span><span className="shrink-0 font-mono text-[10px] tabular-nums text-[var(--algorithm-muted)]">{number(region.views)}</span></div>
            return <details key={region.label} className="group/region rounded-xl bg-[var(--algorithm-surface)]">
              <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-xl px-3 text-xs font-semibold text-[var(--algorithm-ink-soft)] marker:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--algorithm-blue)]"><span className="min-w-0 flex-1 truncate">{regionName}</span><span className="shrink-0 font-mono text-[10px] tabular-nums text-[var(--algorithm-muted)]">{number(region.views)}</span><span aria-hidden="true" className="text-[10px] text-[var(--algorithm-muted)] transition-transform group-open/region:rotate-180">⌄</span></summary>
              <div className="space-y-1.5 border-t border-[var(--algorithm-rule)] px-3 py-2">{distinctCities.map((city) => <div key={city.label} className="flex items-center justify-between gap-3 text-xs text-[var(--algorithm-muted)]"><span className="truncate">{city.label}</span><span className="shrink-0 font-mono text-[10px] tabular-nums">{number(city.views)}</span></div>)}</div>
            </details>
          })}
          {country.regions.length > 5 && <button type="button" onClick={() => setExpandedCountries((current) => ({ ...current, [countryKey]: !isExpanded }))} className="mt-1 inline-flex min-h-11 w-full items-center justify-center whitespace-nowrap rounded-xl border border-[var(--algorithm-rule)] bg-[var(--algorithm-surface)] px-3 text-xs font-bold text-[var(--algorithm-blue)] transition-colors hover:bg-[var(--algorithm-blue-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--algorithm-blue)] active:bg-[var(--algorithm-rule)]">{isExpanded ? "ย่อรายการจังหวัด/ภูมิภาค" : `ดูเพิ่มอีก ${number(hiddenRegionCount)} จังหวัด/ภูมิภาค`}</button>}
        </div>
      </details>
    })}
    {data.unspecifiedLocationViews > 0 && <div className="flex items-center gap-3 rounded-2xl border border-dashed border-[var(--algorithm-rule-strong)] px-4 py-3 text-sm text-[var(--algorithm-muted)]"><span aria-hidden="true" className="text-lg leading-none">🌐</span><span className="min-w-0 flex-1 truncate">ไม่ระบุสถานที่</span><span className="font-mono text-xs font-bold tabular-nums">{number(data.unspecifiedLocationViews)}</span></div>}
    <p className="pt-1 text-[10px] leading-4 text-[var(--algorithm-muted)]">สถานที่เป็นข้อมูลโดยประมาณจาก Proxy/CDN ไม่ใช่ที่อยู่จริงของผู้ชม</p>
  </div>
}

function HotItemTable({ items }: { items: HotItem[] }) {
  if (items.length === 0) return <div className="rounded-2xl border border-dashed border-[var(--algorithm-rule-strong)] px-6 py-14 text-center text-sm text-[var(--algorithm-muted)]"><RadioTower className="mx-auto mb-3 h-6 w-6" />ยังไม่มีข้อมูล Hot Item</div>
  return <div className="overflow-x-auto rounded-2xl border border-[var(--algorithm-rule)]"><table className="w-full min-w-[1040px] border-collapse text-left"><thead className="bg-[var(--algorithm-surface-soft)] text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--algorithm-muted)]"><tr><th className="px-4 py-3 text-center">อันดับ</th><th className="px-4 py-3">สินค้า</th><th className="px-4 py-3 text-right">ยอดดู</th><th className="px-4 py-3">ดูล่าสุด</th><th className="px-4 py-3 text-right">สต็อกจริง</th><th className="px-4 py-3">สถานะ</th><th className="px-4 py-3">เหตุผลอันดับ</th></tr></thead><tbody>{items.map((item) => <tr key={item.id} className="border-t border-[var(--algorithm-rule)] transition-colors hover:bg-[var(--algorithm-surface-soft)]"><td className="px-4 py-4 text-center font-mono text-xs font-bold tabular-nums text-[var(--algorithm-muted)]">{String(item.rank).padStart(2, "0")}</td><td className="px-4 py-4"><Link href={`/algorithm/products/${item.id}`} className="flex min-w-[250px] items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--algorithm-blue)]"><ProductThumb item={item} /><span className="min-w-0"><span className="block truncate text-sm font-bold text-[var(--algorithm-ink)]">{item.name}</span><span className="mt-1 block truncate font-mono text-[10px] text-[var(--algorithm-muted)]">{item.sku || "ไม่มี SKU"} · {item.collectionName}</span></span></Link></td><td className="px-4 py-4 text-right font-mono text-sm font-bold tabular-nums text-[var(--algorithm-ink)]">{number(item.uniqueViews)}</td><td className="whitespace-nowrap px-4 py-4 text-xs text-[var(--algorithm-muted)]">{dateTime(item.lastViewedAt)}</td><td className="px-4 py-4 text-right font-mono text-sm font-bold tabular-nums text-[var(--algorithm-ink)]">{number(item.stockTotal)} ชิ้น</td><td className="px-4 py-4"><StatusPill item={item} /></td><td className="px-4 py-4"><div className="max-w-[260px] space-y-1">{rankingReasons(item).slice(0, 2).map((reason) => <p key={reason} className="text-xs leading-5 text-[var(--algorithm-ink-soft)]">{reason}</p>)}</div></td></tr>)}</tbody></table></div>
}

export default function AlgorithmDashboard({ data }: { data: AlgorithmOverview }) {
  const topItem = data.topItems[0]
  const recommendationHref = topItem ? `/algorithm/products/${topItem.id}#related-products` : "/algorithm#hot-items"
  const rangeLinks: Array<{ days: AlgorithmRange; label: string }> = [{ days: 1, label: "24 ชม." }, { days: 7, label: "7 วัน" }, { days: 30, label: "30 วัน" }]

  return <div className="algorithm-shell relative min-h-screen overflow-x-clip bg-[var(--algorithm-paper)] font-[var(--font-body)] text-[var(--algorithm-ink)]"><div className="pointer-events-none absolute -left-24 top-20 h-72 w-72 rounded-full bg-[var(--algorithm-paper-deep)] opacity-80 blur-3xl" /><div className="pointer-events-none absolute -right-28 bottom-24 h-96 w-96 rounded-full bg-[var(--algorithm-paper-blue)] opacity-80 blur-3xl" /><main className="relative mx-auto max-w-[1680px] px-3 py-3 sm:px-5 sm:py-5 lg:px-8 lg:py-8"><div className="rounded-[2rem] border border-[var(--algorithm-rule)] bg-[var(--algorithm-surface)] p-3 shadow-[var(--algorithm-shadow)] sm:p-5 lg:p-7">
    <header className="flex flex-col gap-4 border-b border-[var(--algorithm-rule)] pb-5 lg:flex-row lg:items-center lg:justify-between"><div className="flex items-center gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--algorithm-ink)] text-lg font-black text-[var(--algorithm-surface)]">W</div><div><p className="font-[var(--font-display)] text-lg font-semibold tracking-[-0.04em]">Dashboard</p><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--algorithm-muted)]">Algorithm</p></div></div><nav className="order-3 flex min-w-0 items-center gap-1 overflow-x-auto rounded-full bg-[var(--algorithm-surface-soft)] p-1 lg:order-none" aria-label="เมนู Algorithm"><Link href="/algorithm" className="whitespace-nowrap rounded-full bg-[var(--algorithm-accent)] px-4 py-2 text-xs font-bold text-[var(--algorithm-ink)]">ภาพรวม</Link><Link href="/algorithm/audience" className="whitespace-nowrap rounded-full px-3 py-2 text-xs font-semibold text-[var(--algorithm-muted)] transition-colors hover:bg-[var(--algorithm-surface)] hover:text-[var(--algorithm-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--algorithm-blue)]">Audience Analytics</Link><Link href="/algorithm#hot-items" className="whitespace-nowrap rounded-full px-3 py-2 text-xs font-semibold text-[var(--algorithm-muted)] transition-colors hover:bg-[var(--algorithm-surface)] hover:text-[var(--algorithm-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--algorithm-blue)]">Hot Item</Link><Link href={recommendationHref} className="whitespace-nowrap rounded-full px-3 py-2 text-xs font-semibold text-[var(--algorithm-muted)] transition-colors hover:bg-[var(--algorithm-surface)] hover:text-[var(--algorithm-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--algorithm-blue)]">สินค้าแนะนำ</Link></nav><div className="flex items-center justify-between gap-3 lg:justify-end"><div className="flex items-center gap-1 rounded-full border border-[var(--algorithm-rule)] bg-[var(--algorithm-surface)] p-1">{rangeLinks.map((range) => <Link key={range.days} href={`/algorithm?range=${range.days}`} className={`whitespace-nowrap rounded-full px-3 py-2 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--algorithm-blue)] ${data.rangeDays === range.days ? "bg-[var(--algorithm-ink)] text-[var(--algorithm-surface)]" : "text-[var(--algorithm-muted)] hover:bg-[var(--algorithm-accent-soft)] hover:text-[var(--algorithm-ink)]"}`}>{range.label}</Link>)}</div><div className="hidden items-center gap-2 sm:flex"><span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--algorithm-blue-soft)] text-xs font-bold text-[var(--algorithm-blue)]">A</span><span className="hidden text-right xl:block"><span className="block text-xs font-bold text-[var(--algorithm-ink)]">Admin</span><span className="block text-[10px] text-[var(--algorithm-muted)]">ดูข้อมูลอย่างเดียว</span></span></div></div></header>

    <section className="flex flex-col justify-between gap-6 py-7 sm:py-9 lg:flex-row lg:items-end"><div className="max-w-2xl"><div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[var(--algorithm-accent-soft)] px-3 py-1.5 text-[10px] font-bold text-[var(--algorithm-accent-strong)]"><Sparkles className="h-3.5 w-3.5" /></div><h1 className="max-w-xl break-words font-[var(--font-display)] text-4xl font-semibold leading-[1.05] tracking-[-0.06em] text-[var(--algorithm-ink)] sm:text-5xl">ภาพรวมการจัดอันดับสินค้า Prop</h1><p className="mt-4 max-w-xl text-sm leading-6 text-[var(--algorithm-muted)]"> {rangeLabel(data.rangeDays)}</p></div><div className="flex items-center gap-3 text-xs text-[var(--algorithm-muted)]"><span className="h-2 w-2 rounded-full bg-[var(--algorithm-accent-strong)]" />อัปเดต {dateTime(data.generatedAt)}</div></section>

    <section className="grid min-w-0 grid-cols-2 gap-3 lg:grid-cols-4"><MetricCard icon={Eye} label="การดูสินค้าไม่ซ้ำ" value={data.error ? "—" : number(data.totalUniqueViews)} note={`ผู้ชม + สินค้า + 24 ชม. · ${rangeLabel(data.rangeDays)}`} /><MetricCard icon={Activity} label="การเข้าชมทั้งหมด" value={data.error ? "—" : number(data.totalEvents)} note="Raw event ทั้งหมดในช่วงเวลานี้" accent="blue" /><MetricCard icon={Globe2} label="พื้นที่ที่ระบุได้" value={data.error ? "—" : number(data.locationSummary.length)} note="ประเทศ / ภูมิภาค / เมืองที่มีข้อมูล" accent="amber" /><MetricCard icon={TrendingUp} label="สินค้าที่ขึ้นอันดับ 1" value={data.error || !topItem ? "—" : "#1"} note={topItem ? topItem.name : "ยังไม่มีสินค้า"} /></section>

    {data.error && <section className="mt-5 flex gap-3 rounded-2xl border border-[var(--algorithm-danger)]/25 bg-[var(--algorithm-hot-soft)] p-4" role="alert"><CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-[var(--algorithm-danger)]" /><div><p className="text-sm font-bold text-[var(--algorithm-danger)]">ยังอ่านข้อมูลอัลกอริทึมไม่ได้</p><p className="mt-1 text-xs leading-5 text-[var(--algorithm-ink-soft)]">ตรวจสอบ migration ของ `algorithm_events` และ RPC ใน Supabase แล้วลองใหม่ · {data.error}</p></div></section>}

    <section className="mt-5 grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.75fr)]"><article className="min-w-0 rounded-[1.5rem] border border-[var(--algorithm-rule)] bg-[var(--algorithm-surface)] p-4 sm:p-6"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--algorithm-blue)]">แนวโน้มการเข้าชม</p><h2 className="mt-2 text-xl font-semibold tracking-[-0.04em]">ยอดดูไม่ซ้ำตามช่วงเวลา</h2><p className="mt-1 text-xs text-[var(--algorithm-muted)]">นับจาก visitor หรือ user ต่อสินค้าในช่วงเวลา 24 ชั่วโมง</p></div><span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[var(--algorithm-muted)]"><MoreHorizontal className="h-5 w-5" /></span></div><TrendChart trend={data.trend} rangeDays={data.rangeDays} /></article><article className="min-w-0 rounded-[1.5rem] border border-[var(--algorithm-rule)] bg-[var(--algorithm-surface)] p-4 sm:p-6"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--algorithm-accent-strong)]">Hot Item</p><h2 className="mt-2 text-xl font-semibold tracking-[-0.04em]">สินค้ายอดนิยม</h2><p className="mt-1 text-xs text-[var(--algorithm-muted)]">5 อันดับแรกจากทั้งหมด {number(data.topItems.length)} รายการ</p></div><BarChart3 className="h-5 w-5 text-[var(--algorithm-muted)]" /></div><div className="mt-4">{data.topItems.length === 0 ? <div className="rounded-2xl border border-dashed border-[var(--algorithm-rule-strong)] px-4 py-10 text-center text-sm text-[var(--algorithm-muted)]">ยังไม่มีข้อมูล Hot Item</div> : data.topItems.slice(0, 5).map((item) => <TopProductRow key={item.id} item={item} />)}</div>{data.topItems.length > 5 && <p className="mt-3 border-t border-[var(--algorithm-rule)] pt-3 text-center text-xs font-bold text-[var(--algorithm-muted)]">แสดง 5 รายการแรก · ดูตาราง Top 20 ด้านล่าง</p>}</article></section>

    <section className="mt-5 grid min-w-0 gap-5 lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)]"><article className="min-w-0 rounded-[1.5rem] border border-[var(--algorithm-rule)] bg-[var(--algorithm-surface)] p-4 sm:p-6"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--algorithm-blue)]">ผู้ชม / สถานที่</p><h2 className="mt-2 text-xl font-semibold tracking-[-0.04em]">ผู้ชมมาจากที่ไหน</h2></div><MapPinned className="h-5 w-5 text-[var(--algorithm-blue)]" /></div><LocationBars data={data} /></article><article className="min-w-0 rounded-[1.5rem] border border-[var(--algorithm-rule)] bg-[var(--algorithm-surface)] p-4 sm:p-6"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--algorithm-hot)]">คุณภาพข้อมูล</p><h2 className="mt-2 text-xl font-semibold tracking-[-0.04em]">สถานะผู้ชมและการคัดกรอง</h2><p className="mt-1 text-xs leading-5 text-[var(--algorithm-muted)]">แยกสถานะการล็อกอินออกจากการตรวจทราฟฟิกบริษัทและบอท</p></div><UsersRound className="h-5 w-5 text-[var(--algorithm-hot)]" /></div><div className="mt-5"><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--algorithm-muted)]">สถานะการเข้าสู่ระบบ</p><div className="mt-3 grid grid-cols-2 gap-3">{(["user", "visitor"] as const).map((label) => <div key={label} className="rounded-2xl bg-[var(--algorithm-surface-soft)] p-4"><p className="font-[var(--font-display)] text-2xl font-semibold tabular-nums text-[var(--algorithm-ink)]">{data.error ? "—" : number(identityCount(data, label))}</p><p className="mt-1 truncate text-xs font-semibold text-[var(--algorithm-ink-soft)]">{identityLabel(label)}</p><p className="mt-1 truncate text-[10px] text-[var(--algorithm-muted)]">จาก identity ของ event</p></div>)}</div><div className="mt-5 border-t border-[var(--algorithm-rule)] pt-4"><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--algorithm-muted)]">การคัดกรองทราฟฟิก</p><div className="mt-3 grid grid-cols-3 gap-3">{["internal", "bot", "unknown"].map((label) => <div key={label} className="rounded-2xl bg-[var(--algorithm-surface-soft)] p-3"><p className="font-[var(--font-display)] text-xl font-semibold tabular-nums text-[var(--algorithm-ink)]">{data.error ? "—" : number(trafficCount(data, label))}</p><p className="mt-1 truncate text-xs font-semibold text-[var(--algorithm-ink-soft)]">{trafficLabel(label)}</p><p className="mt-1 truncate text-[10px] text-[var(--algorithm-muted)]">{trafficNote(label)}</p></div>)}</div></div></div></article></section>

    <section id="hot-items" className="mt-5 scroll-mt-6 rounded-[1.5rem] border border-[var(--algorithm-rule)] bg-[var(--algorithm-surface)] p-4 sm:p-6"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--algorithm-accent-strong)]">รายการจัดอันดับ</p><h2 className="mt-2 text-xl font-semibold tracking-[-0.04em]">Hot Item · Top 20</h2><p className="mt-1 text-xs text-[var(--algorithm-muted)]">แสดงสรุป 20 อันดับแรกจากสินค้า Prop ทั้งหมด ดูรายการสินค้าครบทุกชิ้นได้จากปุ่มด้านขวา</p></div><div className="flex flex-wrap items-center gap-2"><Link href="/algorithm/products" className="inline-flex min-h-10 items-center justify-center gap-1 whitespace-nowrap rounded-full border border-[var(--algorithm-rule-strong)] px-4 text-xs font-bold text-[var(--algorithm-ink-soft)] transition-colors hover:border-[var(--algorithm-blue)] hover:text-[var(--algorithm-blue)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--algorithm-blue)]">ดูสินค้าทั้งหมด <ArrowUpRight className="h-3.5 w-3.5" /></Link><Link href="/algorithm" className="inline-flex min-h-10 items-center justify-center gap-1 whitespace-nowrap rounded-full bg-[var(--algorithm-ink)] px-4 text-xs font-bold text-[var(--algorithm-surface)] transition-transform duration-[var(--dur-fast)] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--algorithm-blue)]">รีเฟรชข้อมูล <ArrowUpRight className="h-3.5 w-3.5" /></Link></div></div><div className="mt-5"><HotItemTable items={data.topItems} /></div></section>

    <footer className="flex flex-col gap-2 border-t border-[var(--algorithm-rule)] pt-5 text-[10px] text-[var(--algorithm-muted)] sm:flex-row sm:items-center sm:justify-between"><span>Algorithm studio · สำหรับ Admin เท่านั้น · ไม่มีการเก็บ IP จริง</span><span>ประมวลผลล่าสุด {dateTime(data.generatedAt)}</span></footer>
  </div></main></div>
}
