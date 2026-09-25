"use client"

/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V4 */

import { useState } from "react"
import Link from "next/link"
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  ChevronLeft,
  ChevronRight,
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

function dateTimeRangeLabel(startTime?: string, endTime?: string, rangeDays: AlgorithmRange = 30) {
  if (!startTime || !endTime) return ""
  const start = new Date(startTime)
  const end = new Date(endTime)
  if (rangeDays === 1) {
    const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }
    return `${start.toLocaleDateString("th-TH", opts)} – ${end.toLocaleDateString("th-TH", opts)}`
  }
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "2-digit" }
  return `${start.toLocaleDateString("th-TH", opts)} – ${end.toLocaleDateString("th-TH", opts)}`
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

function MetricCard({
  icon: Icon,
  label,
  value,
  note,
  accent = "slate",
}: {
  icon: typeof Eye
  label: string
  value: string
  note: string
  accent?: "slate" | "blue" | "amber"
}) {
  const iconClass =
    accent === "blue"
      ? "bg-blue-50 text-blue-600"
      : accent === "amber"
      ? "bg-amber-50 text-amber-600"
      : "bg-slate-100 text-slate-700"

  return (
    <article className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${iconClass}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-4 truncate text-3xl font-black tracking-tight text-slate-900 tabular-nums">
        {value}
      </p>
      <p className="mt-1.5 truncate text-xs text-slate-400">{note}</p>
    </article>
  )
}

function TrendChart({
  trend,
  rangeDays,
  offset = 0,
  startTime,
  endTime,
}: {
  trend: TrendPoint[]
  rangeDays: AlgorithmRange
  offset?: number
  startTime?: string
  endTime?: string
}) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const maxViews = Math.max(...trend.map((point) => point.views), 1)
  const barWidth = trend.length > 0 ? Math.max(700 / trend.length - 5, 4) : 0
  const maxIndex = trend.reduce((best, point, index) => point.views > (trend[best]?.views ?? -1) ? index : best, 0)
  const labelStep = Math.max(Math.ceil(trend.length / 6), 1)
  const hoveredPoint = hoveredIndex === null ? null : trend[hoveredIndex]
  const hoveredX = hoveredIndex === null ? 50 : Math.min(Math.max(((hoveredIndex + 0.5) / Math.max(trend.length, 1)) * 100, 12), 88)

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600">
          <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
          <span>ยอดดูไม่ซ้ำ</span>
          {startTime && endTime && (
            <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 font-mono text-[11px] font-normal text-slate-700 shadow-sm">
              {dateTimeRangeLabel(startTime, endTime, rangeDays)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-slate-500">
            สูงสุด {number(Math.max(...trend.map((point) => point.views), 0))}
          </span>

          <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
            <Link
              href={`/algorithm?range=${rangeDays}&offset=${offset + 1}`}
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm transition-colors hover:bg-slate-50 hover:text-blue-600"
              title="ย้อนหลังช่วงก่อนหน้า"
            >
              <ChevronLeft className="h-4 w-4" />
            </Link>
            {offset > 0 ? (
              <Link
                href={`/algorithm?range=${rangeDays}&offset=${offset - 1}`}
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm transition-colors hover:bg-slate-50 hover:text-blue-600"
                title="ช่วงถัดไป"
              >
                <ChevronRight className="h-4 w-4" />
              </Link>
            ) : (
              <span
                className="inline-flex h-7 w-7 cursor-not-allowed items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-slate-400 opacity-50"
                title="ช่วงเวลาปัจจุบันแล้ว"
              >
                <ChevronRight className="h-4 w-4" />
              </span>
            )}
            {offset > 0 && (
              <Link
                href={`/algorithm?range=${rangeDays}&offset=0`}
                className="ml-1 inline-flex h-7 items-center justify-center rounded-lg border border-amber-300 bg-amber-50 px-2 text-[11px] font-bold text-amber-900 transition hover:bg-amber-100"
                title="กลับสู่ช่วงเวลาปัจจุบัน"
              >
                ปัจจุบัน
              </Link>
            )}
          </div>
        </div>
      </div>
      {trend.length === 0 ? (
        <div className="flex h-56 items-center justify-center text-sm text-slate-400">ยังไม่มีข้อมูลแนวโน้ม</div>
      ) : (
        <>
          <div className="relative mt-4">
            <svg viewBox="0 0 700 220" className="h-auto w-full" role="img" aria-label="กราฟยอดดูไม่ซ้ำตามช่วงเวลา">
              <line x1="0" x2="700" y1="28" y2="28" stroke="#e2e8f0" strokeWidth="1" />
              <line x1="0" x2="700" y1="103" y2="103" stroke="#e2e8f0" strokeWidth="1" />
              <line x1="0" x2="700" y1="178" y2="178" stroke="#cbd5e1" strokeWidth="1" />
              {trend.map((point, index) => {
                const height = Math.max((point.views / maxViews) * 150, point.views > 0 ? 5 : 1)
                const x = (index / trend.length) * 700 + 2
                const y = 178 - height
                const active = index === maxIndex && point.views > 0
                return (
                  <rect
                    key={point.bucket}
                    x={x}
                    y={y}
                    width={barWidth}
                    height={height}
                    rx="3"
                    fill={active ? "#1d4ed8" : "#3b82f6"}
                    opacity={hoveredIndex === index ? "1" : active ? "1" : "0.75"}
                    className="cursor-help"
                    onMouseEnter={() => setHoveredIndex(index)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    onFocus={() => setHoveredIndex(index)}
                    onBlur={() => setHoveredIndex(null)}
                    tabIndex={0}
                  >
                    <title>{`${trendTooltipLabel(point.bucket, rangeDays)} · ยอดดูไม่ซ้ำ ${number(point.views)} ครั้ง`}</title>
                  </rect>
                )
              })}
            </svg>
            {hoveredPoint && (
              <div
                className="pointer-events-none absolute top-2 z-10 -translate-x-1/2 rounded-xl border border-slate-200 bg-slate-900 px-3 py-2 text-center text-white shadow-lg"
                style={{ left: `${hoveredX}%` }}
              >
                <p className="whitespace-nowrap text-[10px] text-slate-300">{trendTooltipLabel(hoveredPoint.bucket, rangeDays)}</p>
                <p className="mt-0.5 whitespace-nowrap font-mono text-sm font-bold">{number(hoveredPoint.views)} ครั้ง</p>
                <p className="text-[10px] text-slate-300">ยอดดูไม่ซ้ำ</p>
              </div>
            )}
          </div>
          <div className="mt-1 flex justify-between gap-2 font-mono text-[10px] text-slate-400">
            {trend.map((point, index) =>
              index % labelStep === 0 || index === trend.length - 1 ? (
                <span key={point.bucket}>{trendLabel(point.bucket, rangeDays)}</span>
              ) : (
                <span key={point.bucket} aria-hidden="true" />
              )
            )}
          </div>
        </>
      )}
    </div>
  )
}

function ProductThumb({ item }: { item: HotItem }) {
  return (
    <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-slate-100 border border-slate-200">
      {item.imageUrl ? (
        <img src={item.imageUrl} alt="" className="h-full w-full object-contain p-1" />
      ) : (
        <PackageCheck className="h-5 w-5 text-slate-400" />
      )}
    </div>
  )
}

function StatusPill({ item }: { item: HotItem }) {
  const available = item.availability === "available"
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-bold ${
        available ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${available ? "bg-emerald-600" : "bg-amber-600"}`} />
      {availabilityLabel(item)}
    </span>
  )
}

function TopProductRow({ item }: { item: HotItem }) {
  return (
    <Link
      href={`/algorithm/products/${item.id}`}
      className="group flex items-center gap-3 rounded-xl p-2.5 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
    >
      <span className="w-5 shrink-0 font-mono text-xs font-bold tabular-nums text-slate-400">
        {String(item.rank).padStart(2, "0")}
      </span>
      <ProductThumb item={item} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-slate-800 transition-colors group-hover:text-blue-600">
          {item.name}
        </span>
        <span className="mt-0.5 block truncate text-xs text-slate-400">{item.collectionName}</span>
      </span>
      <span className="shrink-0 text-right">
        <span className="block font-mono text-sm font-bold tabular-nums text-blue-600">
          {number(item.uniqueViews)}
        </span>
        <span className="mt-0.5 block text-[10px] text-slate-400">ยอดดูไม่ซ้ำ</span>
      </span>
    </Link>
  )
}

function LocationBars({ data }: { data: AlgorithmOverview }) {
  const [expandedCountries, setExpandedCountries] = useState<Record<string, boolean>>({})
  const [showAllCountries, setShowAllCountries] = useState(false)
  const maxViews = Math.max(data.locationHierarchy[0]?.views ?? 1, 1)
  const hasLocation = data.locationHierarchy.length > 0 || data.unspecifiedLocationViews > 0

  if (!hasLocation) {
    return (
      <div className="mt-5 rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400">
        <MapPinned className="mx-auto mb-2 h-5 w-5" />
        ยังไม่มีข้อมูลสถานที่
      </div>
    )
  }

  const TOP_COUNTRIES_COUNT = 5
  const visibleCountries = showAllCountries ? data.locationHierarchy : data.locationHierarchy.slice(0, TOP_COUNTRIES_COUNT)
  const hiddenCountryCount = Math.max(data.locationHierarchy.length - TOP_COUNTRIES_COUNT, 0)

  return (
    <div className="mt-4 space-y-3">
      {visibleCountries.map((country, countryIndex) => {
        const displayName = country.label
        const displayFlag = country.code ? countryFlag(country.code) : "🌐"
        const countryKey = country.code || country.label
        const isExpanded = Boolean(expandedCountries[countryKey])
        const visibleRegions = isExpanded ? country.regions : country.regions.slice(0, 5)
        const hiddenRegionCount = Math.max(country.regions.length - 5, 0)
        return (
          <details
            key={country.code || country.label}
            open={countryIndex === 0}
            className="group rounded-xl border border-slate-200 bg-slate-50/70"
          >
            <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 marker:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500">
              <span aria-hidden="true" className="text-lg leading-none">{displayFlag}</span>
              <span className="min-w-0 flex-1 truncate text-sm font-bold text-slate-800" title={country.code ? `${displayName} (${country.code})` : displayName}>
                {displayName}
              </span>
              <span className="hidden h-2 w-16 overflow-hidden rounded-full bg-slate-200 sm:block">
                <span className="block h-full rounded-full bg-blue-600" style={{ width: `${Math.max((country.views / maxViews) * 100, 6)}%` }} />
              </span>
              <span className="font-mono text-xs font-bold tabular-nums text-slate-500">{number(country.views)}</span>
              <span aria-hidden="true" className="text-xs text-slate-400 transition-transform group-open:rotate-180">⌄</span>
            </summary>
            <div className="space-y-2 border-t border-slate-200 bg-white px-4 py-3 sm:pl-11 rounded-b-xl">
              <div className={isExpanded ? "max-h-[320px] overflow-y-auto space-y-2 pr-1" : "space-y-2"}>
                {visibleRegions.map((region) => {
                  const regionName = regionDisplayLabel(country.code, region.label)
                  const distinctCities = region.cities.filter((city) => !isSameRegionAndCity(country.code, region.label, city.label))
                  if (distinctCities.length === 0) {
                    return (
                      <div key={region.label} className="flex min-h-9 items-center justify-between gap-3 rounded-lg px-2 text-xs font-semibold text-slate-700">
                        <span className="truncate">{regionName}</span>
                        <span className="shrink-0 font-mono text-[10px] tabular-nums text-slate-400">{number(region.views)}</span>
                      </div>
                    )
                  }
                  return (
                    <details key={region.label} className="group/region rounded-lg bg-slate-50 border border-slate-100">
                      <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-lg px-3 text-xs font-semibold text-slate-700 marker:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                        <span className="min-w-0 flex-1 truncate">{regionName}</span>
                        <span className="shrink-0 font-mono text-[10px] tabular-nums text-slate-400">{number(region.views)}</span>
                        <span aria-hidden="true" className="text-[10px] text-slate-400 transition-transform group-open/region:rotate-180">⌄</span>
                      </summary>
                      <div className="space-y-1.5 border-t border-slate-200 bg-white px-3 py-2 rounded-b-lg">
                        {distinctCities.map((city) => (
                          <div key={city.label} className="flex items-center justify-between gap-3 text-xs text-slate-500">
                            <span className="truncate">{city.label}</span>
                            <span className="shrink-0 font-mono text-[10px] tabular-nums">{number(city.views)}</span>
                          </div>
                        ))}
                      </div>
                    </details>
                  )
                })}
              </div>
              {country.regions.length > 5 && (
                <button
                  type="button"
                  onClick={() => setExpandedCountries((current) => ({ ...current, [countryKey]: !isExpanded }))}
                  className="mt-1 inline-flex min-h-9 w-full items-center justify-center whitespace-nowrap rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-blue-600 transition-colors hover:bg-blue-50"
                >
                  {isExpanded ? "ย่อรายการจังหวัด" : `ดูเพิ่มอีก ${number(hiddenRegionCount)} จังหวัด/ภูมิภาค`}
                </button>
              )}
            </div>
          </details>
        )
      })}
      {hiddenCountryCount > 0 && (
        <button
          type="button"
          onClick={() => setShowAllCountries((prev) => !prev)}
          className="mt-2 inline-flex min-h-10 w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-slate-200 bg-slate-50 px-4 text-xs font-bold text-blue-600 transition-colors hover:bg-blue-50"
        >
          {showAllCountries
            ? "ย่อเหลือ Top 5 ประเทศ"
            : `ดูประเทศอื่นอีก ${number(hiddenCountryCount)} ประเทศ`}
        </button>
      )}
      {data.unspecifiedLocationViews > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-dashed border-slate-200 px-4 py-3 text-sm text-slate-400">
          <span aria-hidden="true" className="text-lg leading-none">🌐</span>
          <span className="min-w-0 flex-1 truncate">ไม่ระบุสถานที่</span>
          <span className="font-mono text-xs font-bold tabular-nums">{number(data.unspecifiedLocationViews)}</span>
        </div>
      )}
    </div>
  )
}

function HotItemTable({ items }: { items: HotItem[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 px-6 py-14 text-center text-sm text-slate-400">
        <RadioTower className="mx-auto mb-3 h-6 w-6" />
        ยังไม่มีข้อมูล Hot Item
      </div>
    )
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full min-w-[1040px] border-collapse text-left">
        <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
          <tr>
            <th className="px-4 py-3 text-center">อันดับ</th>
            <th className="px-4 py-3">สินค้า</th>
            <th className="px-4 py-3 text-right">ยอดดู</th>
            <th className="px-4 py-3">ดูล่าสุด</th>
            <th className="px-4 py-3 text-right">สต็อกจริง</th>
            <th className="px-4 py-3">สถานะ</th>
            <th className="px-4 py-3">เหตุผลอันดับ</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((item) => (
            <tr key={item.id} className="transition-colors hover:bg-slate-50">
              <td className="px-4 py-4 text-center font-mono text-xs font-bold tabular-nums text-slate-400">
                {String(item.rank).padStart(2, "0")}
              </td>
              <td className="px-4 py-4">
                <Link href={`/algorithm/products/${item.id}`} className="flex min-w-[250px] items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                  <ProductThumb item={item} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-slate-800 hover:text-blue-600 transition-colors">
                      {item.name}
                    </span>
                    <span className="mt-1 block truncate font-mono text-[10px] text-slate-400">
                      {item.sku || "ไม่มี SKU"} · {item.collectionName}
                    </span>
                  </span>
                </Link>
              </td>
              <td className="px-4 py-4 text-right font-mono text-sm font-bold tabular-nums text-slate-900">
                {number(item.uniqueViews)}
              </td>
              <td className="whitespace-nowrap px-4 py-4 text-xs text-slate-500">
                {dateTime(item.lastViewedAt)}
              </td>
              <td className="px-4 py-4 text-right font-mono text-sm font-bold tabular-nums text-slate-900">
                {number(item.stockTotal)} ชิ้น
              </td>
              <td className="px-4 py-4">
                <StatusPill item={item} />
              </td>
              <td className="px-4 py-4">
                <div className="max-w-[260px] space-y-1">
                  {rankingReasons(item).slice(0, 2).map((reason) => (
                    <p key={reason} className="text-xs leading-5 text-slate-600">{reason}</p>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function AlgorithmDashboard({ data }: { data: AlgorithmOverview }) {
  const topItem = data.topItems[0]
  const recommendationHref = topItem ? `/algorithm/products/${topItem.id}#related-products` : "/algorithm#hot-items"
  const rangeLinks: Array<{ days: AlgorithmRange; label: string }> = [
    { days: 1, label: "24 ชม." },
    { days: 7, label: "7 วัน" },
    { days: 30, label: "30 วัน" },
  ]

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              อัลกอริทึมและพฤติกรรมผู้ชม (Algorithm Analytics)
            </h1>
            <p className="mt-0.5 text-xs text-slate-500">
              {data.offset > 0
                ? `ย้อนหลัง ${data.offset} ช่วง (${dateTimeRangeLabel(data.startTime, data.endTime, data.rangeDays)})`
                : `ภาพรวมสินค้า Prop และการวิเคราะห์ความสนใจ (${rangeLabel(data.rangeDays)})`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <nav className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            <Link
              href="/algorithm"
              className="whitespace-nowrap rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white transition-colors"
            >
              ภาพรวม
            </Link>
            <Link
              href="/algorithm/audience"
              className="whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            >
              Audience Analytics
            </Link>
            <Link
              href="/algorithm/products"
              className="whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            >
              สินค้าทั้งหมด
            </Link>
          </nav>

          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            {rangeLinks.map((range) => (
              <Link
                key={range.days}
                href={`/algorithm?range=${range.days}&offset=0`}
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

          <div className="hidden items-center gap-1.5 text-xs font-medium text-slate-500 xl:flex">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span>อัปเดต {dateTime(data.generatedAt)}</span>
          </div>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <section className="grid min-w-0 grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          icon={Eye}
          label="ยอดดูไม่ซ้ำ"
          value={data.error ? "—" : number(data.totalUniqueViews)}
          note={rangeLabel(data.rangeDays)}
          accent="blue"
        />
        <MetricCard
          icon={Activity}
          label="ยอดดูทั้งหมด"
          value={data.error ? "—" : number(data.totalEvents)}
          note="จำนวนครั้งทั้งหมด"
          accent="blue"
        />
        <MetricCard
          icon={Globe2}
          label="พื้นที่ที่ระบุได้"
          value={data.error ? "—" : number(data.locationSummary.length)}
          note="จังหวัด / ภูมิภาค"
          accent="amber"
        />
        <MetricCard
          icon={TrendingUp}
          label="อันดับ 1 สินค้ายอดนิยม"
          value={data.error || !topItem ? "—" : "#1"}
          note={topItem ? topItem.name : "ยังไม่มีข้อมูล"}
          accent="slate"
        />
      </section>

      {data.error && (
        <section className="flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700" role="alert">
          <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <div>
            <p className="text-sm font-bold text-red-700">ยังอ่านข้อมูลอัลกอริทึมไม่ได้</p>
            <p className="mt-1 text-xs text-red-600">{data.error}</p>
          </div>
        </section>
      )}

      {/* Row 2: Trend Chart & Top Products */}
      <section className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.85fr)]">
        <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 md:p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-blue-600">แนวโน้ม</p>
              <h2 className="mt-1 text-lg font-bold text-slate-900 tracking-tight">ยอดดูไม่ซ้ำตามช่วงเวลา</h2>
            </div>
            <MoreHorizontal className="h-5 w-5 text-slate-400" />
          </div>
          <TrendChart
            trend={data.trend}
            rangeDays={data.rangeDays}
            offset={data.offset}
            startTime={data.startTime}
            endTime={data.endTime}
          />
        </article>

        <article className="flex flex-col justify-between min-w-0 rounded-2xl border border-slate-200 bg-white p-5 md:p-6 shadow-sm">
          <div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-blue-600">Hot Item</p>
                <h2 className="mt-1 text-lg font-bold text-slate-900 tracking-tight">สินค้ายอดนิยม</h2>
              </div>
              <BarChart3 className="h-5 w-5 text-slate-400" />
            </div>
            <div className="mt-4 divide-y divide-slate-100">
              {data.topItems.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">
                  ยังไม่มีข้อมูล Hot Item
                </div>
              ) : (
                data.topItems.slice(0, 7).map((item) => <TopProductRow key={item.id} item={item} />)
              )}
            </div>
          </div>
          {data.topItems.length > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-100">
              <Link
                href="/algorithm/products"
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-100 hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              >
                ดูสินค้าและความนิยมทั้งหมด ({data.topItems.length > 7 ? `Top ${data.topItems.length}` : "ทั้งหมด"}) <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}
        </article>
      </section>

      {/* Row 3: Location & Visitor Types */}
      <section className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)]">
        <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 md:p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-blue-600">สถานที่</p>
              <h2 className="mt-1 text-lg font-bold text-slate-900 tracking-tight">ผู้ชมมาจากที่ไหน</h2>
            </div>
            <MapPinned className="h-5 w-5 text-blue-600" />
          </div>
          <LocationBars data={data} />
        </article>

        <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 md:p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-600">ประเภทผู้เข้าชม</p>
              <h2 className="mt-1 text-lg font-bold text-slate-900 tracking-tight">สถานะผู้ชมและการคัดกรอง</h2>
            </div>
            <UsersRound className="h-5 w-5 text-amber-600" />
          </div>
          <div className="mt-5">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">สถานะการเข้าสู่ระบบ</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {(["user", "visitor"] as const).map((label) => (
                <div key={label} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-2xl font-black text-slate-900 tabular-nums">
                    {data.error ? "—" : number(identityCount(data, label))}
                  </p>
                  <p className="mt-1 truncate text-xs font-semibold text-slate-600">
                    {identityLabel(label)}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-5 border-t border-slate-100 pt-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">การคัดกรองทราฟฟิก</p>
              <div className="mt-3 grid grid-cols-3 gap-3">
                {["internal", "bot", "unknown"].map((label) => (
                  <div key={label} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <p className="text-xl font-bold text-slate-900 tabular-nums">
                      {data.error ? "—" : number(trafficCount(data, label))}
                    </p>
                    <p className="mt-1 truncate text-xs font-semibold text-slate-600">
                      {trafficLabel(label)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </article>
      </section>

      {/* Row 4: Hot Item Top 20 Table */}
      <section id="hot-items" className="scroll-mt-6 rounded-2xl border border-slate-200 bg-white p-5 md:p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-blue-600">รายการจัดอันดับ</p>
            <h2 className="mt-1 text-lg font-bold text-slate-900 tracking-tight">Hot Item · Top 20 สินค้ายอดนิยม</h2>
            <p className="text-xs text-slate-400 mt-0.5">20 อันดับสินค้าที่มีการเข้าชมสูงสุด</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/algorithm/products"
              className="inline-flex h-9 items-center justify-center gap-1 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900"
            >
              ดูสินค้าทั้งหมด <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/algorithm"
              className="inline-flex h-9 items-center justify-center gap-1 whitespace-nowrap rounded-xl bg-slate-900 px-3 text-xs font-bold text-white shadow-sm transition-opacity hover:opacity-90"
            >
              รีเฟรชข้อมูล <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
        <div className="mt-5">
          <HotItemTable items={data.topItems} />
        </div>
      </section>
    </div>
  )
}
