/* Hallmark · component: raw-event table · genre: modern-minimal · theme: existing Algorithm Cobalt */
/* Hallmark · pre-emit critique: P5 H5 E4 S5 R5 V4 */

import Link from "next/link"
import {
  ArrowLeft,
  ArrowUpRight,
  Bot,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Eye,
  Globe2,
  PackageCheck,
  ShieldCheck,
  UserRound,
} from "lucide-react"
import type { AlgorithmEventRow, AlgorithmProductDetail, RelatedProduct } from "../../../../../actions/algorithm"
import SourceBadge from "../../SourceBadge"
import TechnologyBadge from "../../TechnologyBadge"

function number(value: number) {
  return new Intl.NumberFormat("th-TH").format(value)
}

function dateTime(value: string) {
  return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
}

function statusLabel(availability: "available" | "preorder") {
  return availability === "available" ? "มีของ" : "พรีออเดอร์"
}

function identityLabel(identityType: "user" | "visitor") {
  return identityType === "user" ? "บัญชีที่ล็อกอิน" : "ผู้เข้าชมที่ไม่ได้ล็อกอิน"
}

function trafficLabel(trafficType: string) {
  return ({ internal: "ภายในบริษัท", bot: "บอท", unknown: "ผู้เข้าชมที่นับได้", customer: "ผู้เข้าชมที่นับได้" } as Record<string, string>)[trafficType] || trafficType
}

function countryName(code: string) {
  try {
    return new Intl.DisplayNames(["th"], { type: "region" }).of(code) || code
  } catch {
    return code
  }
}

function countryFlag(code: string) {
  return /^[A-Z]{2}$/.test(code)
    ? code.split("").map((letter) => String.fromCodePoint(127397 + letter.charCodeAt(0))).join("")
    : "🌐"
}

function countableLabel(isCountable: boolean) {
  return isCountable ? "นับคะแนน" : "ไม่นับคะแนน"
}

function sourceEvidenceLabel(value: string | null) {
  return ({ utm: "UTM", click_id: "Click ID", referrer: "Referrer", direct: "ไม่มีข้อมูลต้นทาง" } as Record<string, string>)[value || ""] || "ไม่ระบุหลักฐาน"
}

function sourceConfidenceLabel(value: string | null) {
  return ({ high: "ความมั่นใจสูง", medium: "ความมั่นใจปานกลาง", low: "ระบุไม่ได้แน่ชัด" } as Record<string, string>)[value || ""] || "ไม่ระบุความมั่นใจ"
}

type EventTechnology = {
  device: string
  os: string
  browser: string
}

function parseUserAgent(userAgent: string | null): EventTechnology {
  if (!userAgent) return { device: "ไม่ระบุอุปกรณ์", os: "ไม่ระบุระบบ", browser: "ไม่ระบุ Browser" }

  const device = /ipad|tablet|macintosh.*mobile/i.test(userAgent)
    ? "แท็บเล็ต"
    : /mobile|iphone|ipod|android/i.test(userAgent)
      ? "มือถือ"
      : /windows|macintosh|linux|cros/i.test(userAgent)
        ? "คอมพิวเตอร์"
        : "อุปกรณ์อื่น"

  const androidVersion = userAgent.match(/Android\s([\d.]+)/i)?.[1]
  const iosVersion = userAgent.match(/(?:CPU (?:iPhone )?OS|iPhone OS)\s([\d_]+)/i)?.[1]?.replaceAll("_", ".")
  const macVersion = userAgent.match(/Mac OS X\s([\d_]+)/i)?.[1]?.replaceAll("_", ".")
  const os = androidVersion
    ? `Android ${androidVersion}`
    : iosVersion
      ? `iOS ${iosVersion}`
      : /Windows NT/i.test(userAgent)
        ? "Windows"
        : macVersion
          ? `macOS ${macVersion}`
          : /CrOS/i.test(userAgent)
            ? "ChromeOS"
            : /Linux/i.test(userAgent)
              ? "Linux"
              : "ไม่ระบุระบบ"

  const edgeVersion = userAgent.match(/Edg(?:A|iOS)?\/([\d.]+)/i)?.[1]
  const operaVersion = userAgent.match(/(?:OPR|Opera)\/([\d.]+)/i)?.[1]
  const samsungVersion = userAgent.match(/SamsungBrowser\/([\d.]+)/i)?.[1]
  const firefoxVersion = userAgent.match(/(?:Firefox|FxiOS)\/([\d.]+)/i)?.[1]
  const chromeVersion = userAgent.match(/(?:Chrome|CriOS)\/([\d.]+)/i)?.[1]
  const safariVersion = userAgent.match(/Version\/([\d.]+).*Safari/i)?.[1]
  const browser = edgeVersion
    ? `Microsoft Edge ${edgeVersion}`
    : operaVersion
      ? `Opera ${operaVersion}`
      : samsungVersion
        ? `Samsung Internet ${samsungVersion}`
        : firefoxVersion
          ? `Firefox ${firefoxVersion}`
          : chromeVersion
            ? `Chrome ${chromeVersion}`
            : safariVersion
              ? `Safari ${safariVersion}`
              : "ไม่ระบุ Browser"

  return { device, os, browser }
}

function sourceValue(event: AlgorithmEventRow) {
  return event.sessionSource || event.sourcePlatform || "Direct"
}

function countryValue(event: AlgorithmEventRow) {
  if (event.countryCode) return `${countryFlag(event.countryCode)} ${countryName(event.countryCode)}`
  return event.country || "ไม่ระบุประเทศ"
}

function ProductImage({ src, alt, size = "medium" }: { src: string | null; alt: string; size?: "small" | "medium" }) {
  const sizeClass = size === "small" ? "h-12 w-12 rounded-xl" : "h-24 w-24 rounded-2xl sm:h-32 sm:w-32"
  return <div className={`grid shrink-0 place-items-center overflow-hidden bg-[var(--algorithm-surface-soft)] ${sizeClass}`}>{src ? <img src={src} alt={alt} width={128} height={128} className="h-full w-full object-contain p-2" /> : <PackageCheck className="h-7 w-7 text-[var(--algorithm-muted)]" />}</div>
}

function RelatedCard({ item }: { item: RelatedProduct }) {
  return (
    <Link
      href={`/algorithm/products/${item.id}`}
      className="group block rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-500 hover:shadow-md"
    >
      <div className="flex items-start gap-3">
        <ProductImage src={item.imageUrl} alt="" size="small" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{item.name}</p>
          <p className="mt-0.5 truncate font-mono text-[10px] text-slate-400">{item.sku || "ไม่มี SKU"}</p>
          <p className="mt-1.5 text-xs text-blue-600 font-medium">{item.reason}</p>
        </div>
        <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-400 transition-colors group-hover:text-blue-600" />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3">
        <div>
          <p className="font-mono text-sm font-bold tabular-nums text-slate-900">
            {item.availability === "available" ? `มีสต็อก ${number(item.stockTotal)}` : "พรีออเดอร์"}
          </p>
          <p className="text-[10px] text-slate-400">สถานะสินค้า</p>
        </div>
        <div>
          <p className="font-mono text-sm font-bold tabular-nums text-slate-900">{number(item.sequentialViews)}</p>
          <p className="text-[10px] text-slate-400">ดูต่อทันที</p>
        </div>
        <div>
          <p className="font-mono text-sm font-bold tabular-nums text-slate-900">{number(item.categoryViews)}</p>
          <p className="text-[10px] text-slate-400">หมวดเดียวกัน</p>
        </div>
      </div>
    </Link>
  )
}

function TechnicalDetails({ event }: { event: AlgorithmEventRow }) {
  return (
    <details className="group min-w-[180px] text-xs text-slate-500">
      <summary className="inline-flex min-h-8 cursor-pointer list-none items-center whitespace-nowrap rounded-lg border border-slate-200 bg-white px-2.5 text-[10px] font-bold text-blue-600 shadow-sm hover:bg-blue-50">
        ดูข้อมูลเทคนิค
      </summary>
      <div className="mt-2 space-y-1.5 border-l-2 border-slate-200 pl-3 text-[10px]">
        <p><span className="font-bold text-slate-700">เครือข่าย:</span> {event.isp || "ไม่ระบุ ISP"}{event.asn ? ` · ASN ${event.asn}` : ""}</p>
        <p className="break-all font-mono"><span className="font-sans font-bold text-slate-700">IP hash:</span> {event.ipHash || "—"}</p>
        <p><span className="font-bold text-slate-700">หลักฐานช่องทาง:</span> {sourceEvidenceLabel(event.sourceEvidence)} · {sourceConfidenceLabel(event.sourceConfidence)}</p>
        {(event.sourceDetail || event.referrerHost) && <p className="break-all font-mono"><span className="font-sans font-bold text-slate-700">รายละเอียด:</span> {event.sourceDetail || event.referrerHost}</p>}
        {event.userAgent && <p className="break-all font-mono"><span className="font-sans font-bold text-slate-700">User Agent:</span> {event.userAgent}</p>}
      </div>
    </details>
  )
}

function EventCard({ event }: { event: AlgorithmEventRow }) {
  const technology = parseUserAgent(event.userAgent)

  const facts = [
    ["สถานะผู้ชม", identityLabel(event.identityType)],
    [event.identityType === "user" ? "อีเมล" : "รหัสผู้ชม", event.identityLabel],
    ["ประเทศ", countryValue(event)],
    ["จังหวัด / ภูมิภาค", event.region || "—"],
    ["เมือง", event.city || "—"],
    ["ทราฟฟิก", trafficLabel(event.trafficType)],
    ["เซสชัน", event.sessionLabel || "—"],
  ]

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="font-mono text-xs tabular-nums text-slate-400">{dateTime(event.createdAt)}</p>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${event.isCountable ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
          {countableLabel(event.isCountable)}
        </span>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 border-t border-slate-100">
        {facts.map(([label, value]) => (
          <div key={label} className="min-w-0 border-b border-slate-100 py-2.5">
            <dt className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</dt>
            <dd className="mt-0.5 break-words text-xs font-semibold text-slate-800">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="grid grid-cols-2 gap-x-4 border-b border-slate-100 py-3">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ช่องทาง</p>
          <div className="mt-1"><SourceBadge value={sourceValue(event)} /></div>
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">สถานะทราฟฟิก</p>
          <div className="mt-1 flex flex-wrap gap-1 text-[10px] font-bold">
            {event.isBot && <span className="rounded-full bg-red-50 text-red-600 border border-red-200 px-2 py-0.5">บอท</span>}
            {event.isInternal && <span className="rounded-full bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5">ภายในบริษัท</span>}
            {!event.isBot && !event.isInternal && <span className="text-slate-500">ทั่วไป</span>}
          </div>
        </div>
      </div>
      <div className="grid gap-3 border-b border-slate-100 py-3 sm:grid-cols-3">
        <TechnologyBadge kind="device" value={technology.device} />
        <TechnologyBadge kind="os" value={technology.os} />
        <TechnologyBadge kind="browser" value={technology.browser} />
      </div>
      <div className="pt-3"><TechnicalDetails event={event} /></div>
    </article>
  )
}

function EventRow({ event }: { event: AlgorithmEventRow }) {
  const technology = parseUserAgent(event.userAgent)

  return (
    <tr className="align-top hover:bg-slate-50 transition-colors">
      <td className="whitespace-nowrap px-4 py-4 font-mono text-[10px] tabular-nums text-slate-400">{dateTime(event.createdAt)}</td>
      <td className="px-4 py-4"><div className="flex min-w-[150px] items-center gap-2 text-xs font-bold text-slate-900">{event.identityType === "user" ? <UserRound className="h-3.5 w-3.5 shrink-0 text-blue-600" /> : <Eye className="h-3.5 w-3.5 shrink-0 text-slate-400" />}{identityLabel(event.identityType)}</div></td>
      <td className="px-4 py-4 font-mono text-[10px] text-slate-500">{event.identityLabel}</td>
      <td className="whitespace-nowrap px-4 py-4 text-xs text-slate-700"><span className="inline-flex items-center gap-2"><Globe2 className="h-3.5 w-3.5 shrink-0 text-blue-600" />{countryValue(event)}</span></td>
      <td className="min-w-[150px] px-4 py-4 text-xs text-slate-600">{event.region || "—"}</td>
      <td className="min-w-[130px] px-4 py-4 text-xs text-slate-600">{event.city || "—"}</td>
      <td className="min-w-[140px] px-4 py-4"><SourceBadge value={sourceValue(event)} /></td>
      <td className="min-w-[140px] px-4 py-4"><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 border border-slate-200">{trafficLabel(event.trafficType)}</span>{(event.isBot || event.isInternal) && <p className="mt-1 text-[10px] font-bold text-red-500">{event.isBot ? "บอท" : "ภายในบริษัท"}</p>}</td>
      <td className={`whitespace-nowrap px-4 py-4 text-[10px] font-bold ${event.isCountable ? "text-emerald-600" : "text-amber-600"}`}>{countableLabel(event.isCountable)}</td>
      <td className="min-w-[150px] px-4 py-4 text-xs"><TechnologyBadge kind="device" value={technology.device} /></td>
      <td className="min-w-[170px] px-4 py-4 text-xs"><TechnologyBadge kind="os" value={technology.os} /></td>
      <td className="min-w-[190px] px-4 py-4 text-xs"><TechnologyBadge kind="browser" value={technology.browser} /></td>
      <td className="px-4 py-4 font-mono text-[10px] text-slate-400">{event.sessionLabel || "—"}</td>
      <td className="px-4 py-4"><TechnicalDetails event={event} /></td>
    </tr>
  )
}

export default function ProductAlgorithmDetail({ detail }: { detail: AlgorithmProductDetail }) {
  const { product, filters } = detail
  const query = (page: number) => {
    const params = new URLSearchParams({
      range: String(filters.rangeDays),
      traffic: filters.trafficType,
      countable: filters.countable,
      identity: filters.identityType,
      location: filters.location,
      page: String(page),
    })
    return `/algorithm/products/${product.id}?${params.toString()}`
  }

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/algorithm"
            className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" /> กลับไปหน้าอันดับ
          </Link>
          <nav className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            <Link
              href="/algorithm"
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            >
              ภาพรวม
            </Link>
            <Link
              href="/algorithm#hot-items"
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            >
              Hot Item
            </Link>
            <Link
              href="#related-products"
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm"
            >
              สินค้าแนะนำ
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          ข้อมูลสำหรับ Admin แบบอ่านอย่างเดียว
        </div>
      </div>

      {/* Product Overview Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-4 sm:gap-6">
            <ProductImage src={product.imageUrl} alt={product.name} />
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
                รายละเอียดการวิเคราะห์สินค้า / ID: {product.id}
              </p>
              <h1 className="mt-1 break-words text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                {product.name}
              </h1>
              <p className="mt-1 truncate font-mono text-xs text-slate-400">
                {product.sku || "ไม่มี SKU"} · {product.collectionName}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                product.availability === "available"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-amber-50 text-amber-700 border border-amber-200"
              }`}
            >
              {statusLabel(product.availability)}
            </span>
            <span className="font-mono text-xs font-bold text-slate-600">
              สต็อก {number(product.stockTotal)} ชิ้น
            </span>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-slate-100 pt-5 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5">
            <p className="font-mono text-2xl font-black text-slate-900 tabular-nums">
              {number(detail.relatedProducts.length)}
            </p>
            <p className="mt-0.5 text-xs text-slate-500 font-medium">สินค้าแนะนำที่ใกล้เคียง</p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5">
            <p className="font-mono text-2xl font-black text-blue-600 tabular-nums">
              {number(detail.eventTotal)}
            </p>
            <p className="mt-0.5 text-xs text-slate-500 font-medium">เหตุการณ์ตามตัวกรอง</p>
          </div>
          <div className="col-span-2 rounded-xl border border-slate-100 bg-slate-50 p-3.5 sm:col-span-1">
            <p className="font-mono text-2xl font-black text-slate-900 tabular-nums">
              {filters.rangeDays === 1 ? "24 ชม." : `${filters.rangeDays} วัน`}
            </p>
            <p className="mt-0.5 text-xs text-slate-500 font-medium">ช่วงเวลาที่กำลังดู</p>
          </div>
        </div>
      </div>

      {/* Related Products Section */}
      <section id="related-products" className="scroll-mt-6 rounded-2xl border border-slate-200 bg-white p-5 md:p-6 shadow-sm">
        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-wider text-blue-600">สินค้าใกล้เคียง / 01</p>
          <h2 className="mt-1 text-lg font-bold text-slate-900 tracking-tight">สินค้าแนะนำที่ใกล้เคียง</h2>
          <p className="mt-0.5 text-xs text-slate-400">ระบบคัดเลือกจากประเภท โทนสี การกดดูต่อ และสต็อกสินค้า</p>
        </div>

        {detail.relatedError ? (
          <div className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700" role="alert">
            <CircleAlert className="h-5 w-5 shrink-0 text-red-600" />
            <div>
              <p className="text-sm font-bold">ยังอ่านสินค้าแนะนำไม่ได้</p>
              <p className="mt-1 text-xs text-red-600">{detail.relatedError}</p>
            </div>
          </div>
        ) : detail.relatedProducts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">
            ยังไม่มีสินค้าที่ใกล้เคียงหรือข้อมูลเพียงพอ
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {detail.relatedProducts.map((item) => (
              <RelatedCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </section>

      {/* Raw Events Section */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6 shadow-sm">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-blue-600">เหตุการณ์การเข้าชม / 02</p>
          <h2 className="mt-1 text-lg font-bold text-slate-900 tracking-tight">ทุกการเข้าชมสินค้าที่บันทึกไว้</h2>
          <p className="mt-0.5 text-xs text-slate-400">ข้อมูลดิบแบบอ่านอย่างเดียว · {number(detail.eventTotal)} เหตุการณ์ตามตัวกรอง</p>
        </div>

        {/* Filter Form */}
        <form method="get" className="mt-5 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2 lg:grid-cols-5">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            ช่วงเวลา
            <select
              name="range"
              defaultValue={String(filters.rangeDays)}
              className="mt-1.5 block h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 shadow-sm"
            >
              <option value="1">24 ชั่วโมง</option>
              <option value="7">7 วัน</option>
              <option value="30">30 วัน</option>
            </select>
          </label>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            การคัดกรองทราฟฟิก
            <select
              name="traffic"
              defaultValue={filters.trafficType}
              className="mt-1.5 block h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 shadow-sm"
            >
              <option value="all">ทั้งหมด</option>
              <option value="unknown">ผู้เข้าชมที่นับได้</option>
              <option value="internal">ภายในบริษัท</option>
              <option value="bot">บอท</option>
            </select>
          </label>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            การนับคะแนน
            <select
              name="countable"
              defaultValue={filters.countable}
              className="mt-1.5 block h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 shadow-sm"
            >
              <option value="all">ทั้งหมด</option>
              <option value="countable">นับคะแนน</option>
              <option value="excluded">ไม่นับคะแนน</option>
            </select>
          </label>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            สถานะการเข้าสู่ระบบ
            <select
              name="identity"
              defaultValue={filters.identityType}
              className="mt-1.5 block h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 shadow-sm"
            >
              <option value="all">ทั้งหมด</option>
              <option value="user">บัญชีที่ล็อกอิน</option>
              <option value="visitor">ไม่ได้ล็อกอิน</option>
            </select>
          </label>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            สถานที่
            <input
              name="location"
              defaultValue={filters.location}
              placeholder="เมือง / ภูมิภาค / ประเทศ"
              className="mt-1.5 block h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 outline-none placeholder:text-slate-400 focus:border-blue-500 shadow-sm"
            />
          </label>
          <div className="sm:col-span-2 lg:col-span-5 flex justify-end">
            <button
              type="submit"
              className="h-10 rounded-xl bg-slate-900 px-5 text-xs font-bold text-white shadow-sm transition-opacity hover:opacity-90"
            >
              ใช้ตัวกรอง
            </button>
          </div>
        </form>

        {detail.eventError ? (
          <div className="mt-5 flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700" role="alert">
            <CircleAlert className="h-5 w-5 shrink-0 text-red-600" />
            <div>
              <p className="text-sm font-bold">อ่านเหตุการณ์การเข้าชมไม่สำเร็จ</p>
              <p className="mt-1 text-xs text-red-600">{detail.eventError}</p>
            </div>
          </div>
        ) : detail.events.length === 0 ? (
          <div className="mt-5 rounded-xl border border-dashed border-slate-200 bg-white p-12 text-center">
            <Bot className="mx-auto h-7 w-7 text-slate-400" />
            <p className="mt-3 text-sm font-bold text-slate-700">ไม่พบเหตุการณ์ตามตัวกรอง</p>
            <p className="mt-1 text-xs text-slate-400">ลองเปลี่ยนช่วงเวลา หรือประเภททราฟฟิก</p>
          </div>
        ) : (
          <>
            <div className="mt-5 grid gap-3 lg:hidden">
              {detail.events.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
            <div className="mt-5 hidden overflow-x-auto overscroll-x-contain rounded-xl border border-slate-200 bg-white shadow-sm lg:block">
              <table className="w-full min-w-[2240px] border-collapse text-left">
                <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">เวลาที่เกิดเหตุการณ์</th>
                    <th className="px-4 py-3">สถานะผู้ชม</th>
                    <th className="px-4 py-3">อีเมล / รหัสผู้ชม</th>
                    <th className="px-4 py-3">ประเทศ</th>
                    <th className="px-4 py-3">จังหวัด / ภูมิภาค</th>
                    <th className="px-4 py-3">เมือง</th>
                    <th className="px-4 py-3">ช่องทาง</th>
                    <th className="px-4 py-3">ประเภททราฟฟิก</th>
                    <th className="px-4 py-3">การนับคะแนน</th>
                    <th className="px-4 py-3">อุปกรณ์</th>
                    <th className="px-4 py-3">ระบบ</th>
                    <th className="px-4 py-3">เบราว์เซอร์</th>
                    <th className="px-4 py-3">เซสชัน</th>
                    <th className="px-4 py-3">รายละเอียด</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {detail.events.map((event) => (
                    <EventRow key={event.id} event={event} />
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <nav className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4" aria-label="การแบ่งหน้าเหตุการณ์">
          <p className="font-mono text-xs text-slate-500">
            หน้า {detail.eventPage} / {detail.eventPageCount}
          </p>
          <div className="flex items-center gap-2">
            {detail.eventPage > 1 ? (
              <Link
                href={query(detail.eventPage - 1)}
                className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
              >
                <ChevronLeft className="h-4 w-4" /> ก่อนหน้า
              </Link>
            ) : (
              <span className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-300 shadow-sm opacity-50 cursor-not-allowed">
                <ChevronLeft className="h-4 w-4" /> ก่อนหน้า
              </span>
            )}
            {detail.eventPage < detail.eventPageCount ? (
              <Link
                href={query(detail.eventPage + 1)}
                className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
              >
                ถัดไป <ChevronRight className="h-4 w-4" />
              </Link>
            ) : (
              <span className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-300 shadow-sm opacity-50 cursor-not-allowed">
                ถัดไป <ChevronRight className="h-4 w-4" />
              </span>
            )}
          </div>
        </nav>
      </section>

      <footer className="text-center text-xs text-slate-400 py-4">
        เหตุการณ์อัลกอริทึม · สำหรับ Admin เท่านั้น · ไม่มีการเก็บ IP จริง
      </footer>
    </div>
  )
}
