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
  return <Link href={`/algorithm/products/${item.id}`} className="group block rounded-2xl border border-[var(--algorithm-rule)] bg-[var(--algorithm-surface)] p-4 transition-transform duration-[var(--dur-fast)] hover:-translate-y-0.5 hover:border-[var(--algorithm-blue)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--algorithm-blue)]"><div className="flex items-start gap-3"><ProductImage src={item.imageUrl} alt="" size="small" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-[var(--algorithm-ink)]">{item.name}</p><p className="mt-1 truncate font-mono text-[10px] text-[var(--algorithm-muted)]">{item.sku || "ไม่มี SKU"}</p><p className="mt-2 text-xs leading-5 text-[var(--algorithm-accent-strong)]">{item.reason}</p></div><ArrowUpRight className="h-4 w-4 shrink-0 text-[var(--algorithm-muted)] transition-colors group-hover:text-[var(--algorithm-blue)]" /></div><div className="mt-4 grid grid-cols-3 gap-2 border-t border-[var(--algorithm-rule)] pt-3"><div><p className="font-mono text-sm font-bold tabular-nums text-[var(--algorithm-ink)]">{item.availability === "available" ? `มีสต็อก ${number(item.stockTotal)}` : "พรีออเดอร์"}</p><p className="text-[10px] text-[var(--algorithm-muted)]">สถานะสินค้า</p></div><div><p className="font-mono text-sm font-bold tabular-nums text-[var(--algorithm-ink)]">{number(item.sequentialViews)}</p><p className="text-[10px] text-[var(--algorithm-muted)]">ดูต่อทันที</p></div><div><p className="font-mono text-sm font-bold tabular-nums text-[var(--algorithm-ink)]">{number(item.categoryViews)}</p><p className="text-[10px] text-[var(--algorithm-muted)]">หมวดเดียวกัน</p></div></div></Link>
}

function TechnicalDetails({ event }: { event: AlgorithmEventRow }) {
  return <details className="group min-w-[180px] text-xs text-[var(--algorithm-muted)]"><summary className="inline-flex min-h-10 cursor-pointer list-none items-center whitespace-nowrap rounded-full border border-[var(--algorithm-rule)] px-3 text-[10px] font-bold text-[var(--algorithm-blue)] marker:hidden hover:border-[var(--algorithm-blue)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--algorithm-blue)]">ดูข้อมูลเทคนิค</summary><div className="mt-2 space-y-1.5 border-l border-[var(--algorithm-rule-strong)] pl-3 text-[10px]"><p><span className="font-bold text-[var(--algorithm-ink-soft)]">เครือข่าย:</span> {event.isp || "ไม่ระบุ ISP"}{event.asn ? ` · ASN ${event.asn}` : ""}</p><p className="break-all font-mono"><span className="font-sans font-bold text-[var(--algorithm-ink-soft)]">IP hash:</span> {event.ipHash || "—"}</p><p><span className="font-bold text-[var(--algorithm-ink-soft)]">หลักฐานช่องทาง:</span> {sourceEvidenceLabel(event.sourceEvidence)} · {sourceConfidenceLabel(event.sourceConfidence)}</p>{(event.sourceDetail || event.referrerHost) && <p className="break-all font-mono"><span className="font-sans font-bold text-[var(--algorithm-ink-soft)]">รายละเอียด:</span> {event.sourceDetail || event.referrerHost}</p>}{event.userAgent && <p className="break-all font-mono"><span className="font-sans font-bold text-[var(--algorithm-ink-soft)]">User Agent:</span> {event.userAgent}</p>}</div></details>
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

  return <article className="rounded-2xl border border-[var(--algorithm-rule)] bg-[var(--algorithm-surface)] p-4"><div className="flex items-start justify-between gap-3"><p className="font-mono text-xs tabular-nums text-[var(--algorithm-muted)]">{dateTime(event.createdAt)}</p><span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${event.isCountable ? "bg-[var(--algorithm-accent-soft)] text-[var(--algorithm-accent-strong)]" : "bg-[var(--algorithm-hot-soft)] text-[var(--algorithm-hot)]"}`}>{countableLabel(event.isCountable)}</span></div><dl className="mt-4 grid grid-cols-2 gap-x-4 border-t border-[var(--algorithm-rule)]">{facts.map(([label, value]) => <div key={label} className="min-w-0 border-b border-[var(--algorithm-rule)] py-3"><dt className="text-[10px] font-bold text-[var(--algorithm-muted)]">{label}</dt><dd className="mt-1 break-words text-xs font-semibold text-[var(--algorithm-ink-soft)]">{value}</dd></div>)}</dl><div className="grid grid-cols-2 gap-x-4 border-b border-[var(--algorithm-rule)] py-3"><div><p className="text-[10px] font-bold text-[var(--algorithm-muted)]">ช่องทาง</p><div className="mt-1"><SourceBadge value={sourceValue(event)} /></div></div><div><p className="text-[10px] font-bold text-[var(--algorithm-muted)]">สถานะทราฟฟิก</p><div className="mt-1 flex flex-wrap gap-1 text-[10px] font-bold">{event.isBot && <span className="rounded-full bg-[var(--algorithm-hot-soft)] px-2 py-1 text-[var(--algorithm-hot)]">บอท</span>}{event.isInternal && <span className="rounded-full bg-[var(--algorithm-hot-soft)] px-2 py-1 text-[var(--algorithm-hot)]">ภายในบริษัท</span>}{!event.isBot && !event.isInternal && <span className="text-[var(--algorithm-muted)]">ทั่วไป</span>}</div></div></div><div className="grid gap-3 border-b border-[var(--algorithm-rule)] py-3 sm:grid-cols-3"><TechnologyBadge kind="device" value={technology.device} /><TechnologyBadge kind="os" value={technology.os} /><TechnologyBadge kind="browser" value={technology.browser} /></div><div className="pt-3"><TechnicalDetails event={event} /></div></article>
}

function EventRow({ event }: { event: AlgorithmEventRow }) {
  const technology = parseUserAgent(event.userAgent)

  return <tr className="border-t border-[var(--algorithm-rule)] align-top transition-colors hover:bg-[var(--algorithm-surface-soft)]"><td className="whitespace-nowrap px-4 py-4 font-mono text-[10px] tabular-nums text-[var(--algorithm-muted)]">{dateTime(event.createdAt)}</td><td className="px-4 py-4"><div className="flex min-w-[150px] items-center gap-2 text-xs font-bold text-[var(--algorithm-ink)]">{event.identityType === "user" ? <UserRound className="h-3.5 w-3.5 shrink-0 text-[var(--algorithm-blue)]" /> : <Eye className="h-3.5 w-3.5 shrink-0 text-[var(--algorithm-muted)]" />}{identityLabel(event.identityType)}</div></td><td className="px-4 py-4 font-mono text-[10px] text-[var(--algorithm-muted)]">{event.identityLabel}</td><td className="whitespace-nowrap px-4 py-4 text-xs text-[var(--algorithm-ink-soft)]"><span className="inline-flex items-center gap-2"><Globe2 className="h-3.5 w-3.5 shrink-0 text-[var(--algorithm-blue)]" />{countryValue(event)}</span></td><td className="min-w-[150px] px-4 py-4 text-xs text-[var(--algorithm-ink-soft)]">{event.region || "—"}</td><td className="min-w-[130px] px-4 py-4 text-xs text-[var(--algorithm-ink-soft)]">{event.city || "—"}</td><td className="min-w-[140px] px-4 py-4"><SourceBadge value={sourceValue(event)} /></td><td className="min-w-[140px] px-4 py-4"><span className="rounded-full bg-[var(--algorithm-surface-soft)] px-2 py-1 text-[10px] font-bold text-[var(--algorithm-muted)]">{trafficLabel(event.trafficType)}</span>{(event.isBot || event.isInternal) && <p className="mt-2 text-[10px] font-bold text-[var(--algorithm-hot)]">{event.isBot ? "บอท" : "ภายในบริษัท"}</p>}</td><td className={`whitespace-nowrap px-4 py-4 text-[10px] font-bold ${event.isCountable ? "text-[var(--algorithm-accent-strong)]" : "text-[var(--algorithm-hot)]"}`}>{countableLabel(event.isCountable)}</td><td className="min-w-[150px] px-4 py-4 text-xs"><TechnologyBadge kind="device" value={technology.device} /></td><td className="min-w-[170px] px-4 py-4 text-xs"><TechnologyBadge kind="os" value={technology.os} /></td><td className="min-w-[190px] px-4 py-4 text-xs"><TechnologyBadge kind="browser" value={technology.browser} /></td><td className="px-4 py-4 font-mono text-[10px] text-[var(--algorithm-muted)]">{event.sessionLabel || "—"}</td><td className="px-4 py-4"><TechnicalDetails event={event} /></td></tr>
}

export default function ProductAlgorithmDetail({ detail }: { detail: AlgorithmProductDetail }) {
  const { product, filters } = detail
  const query = (page: number) => {
    const params = new URLSearchParams({ range: String(filters.rangeDays), traffic: filters.trafficType, countable: filters.countable, identity: filters.identityType, location: filters.location, page: String(page) })
    return `/algorithm/products/${product.id}?${params.toString()}`
  }

  return <div className="algorithm-shell relative min-h-screen overflow-x-clip bg-[var(--algorithm-paper)] font-[var(--font-body)] text-[var(--algorithm-ink)]"><div className="pointer-events-none absolute -left-24 top-20 h-72 w-72 rounded-full bg-[var(--algorithm-paper-deep)] opacity-80 blur-3xl" /><div className="pointer-events-none absolute -right-28 bottom-24 h-96 w-96 rounded-full bg-[var(--algorithm-paper-blue)] opacity-80 blur-3xl" /><main className="relative mx-auto max-w-[1680px] px-3 py-3 sm:px-5 sm:py-5 lg:px-8 lg:py-8"><div className="rounded-[2rem] border border-[var(--algorithm-rule)] bg-[var(--algorithm-surface)] p-3 shadow-[var(--algorithm-shadow)] sm:p-5 lg:p-7">
    <header className="flex flex-col gap-4 border-b border-[var(--algorithm-rule)] pb-5 lg:flex-row lg:items-center lg:justify-between"><div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center"><Link href="/algorithm" className="inline-flex min-h-10 items-center gap-2 whitespace-nowrap rounded-full bg-[var(--algorithm-surface-soft)] px-4 text-xs font-bold text-[var(--algorithm-ink-soft)] transition-colors hover:bg-[var(--algorithm-accent-soft)] hover:text-[var(--algorithm-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--algorithm-blue)]"><ArrowLeft className="h-4 w-4" />กลับไปหน้าอันดับ</Link><nav className="flex min-w-0 items-center gap-1 overflow-x-auto rounded-full bg-[var(--algorithm-surface-soft)] p-1" aria-label="เมนู Algorithm"><Link href="/algorithm" className="whitespace-nowrap rounded-full px-3 py-2 text-xs font-semibold text-[var(--algorithm-muted)] transition-colors hover:bg-[var(--algorithm-surface)] hover:text-[var(--algorithm-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--algorithm-blue)]">ภาพรวม</Link><Link href="/algorithm#hot-items" className="whitespace-nowrap rounded-full px-3 py-2 text-xs font-semibold text-[var(--algorithm-muted)] transition-colors hover:bg-[var(--algorithm-surface)] hover:text-[var(--algorithm-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--algorithm-blue)]">Hot Item</Link><Link href="#related-products" className="whitespace-nowrap rounded-full bg-[var(--algorithm-accent)] px-3 py-2 text-xs font-bold text-[var(--algorithm-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--algorithm-blue)]">สินค้าแนะนำ</Link></nav></div><div className="flex items-center gap-2 text-xs text-[var(--algorithm-muted)]"><ShieldCheck className="h-4 w-4 text-[var(--algorithm-accent-strong)]" />ข้อมูลสำหรับ Admin แบบอ่านอย่างเดียว</div></header>

    <section className="flex flex-col gap-6 border-b border-[var(--algorithm-rule)] py-7 sm:py-9 lg:flex-row lg:items-end lg:justify-between"><div className="flex min-w-0 items-center gap-4 sm:gap-6"><ProductImage src={product.imageUrl} alt={product.name} /><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--algorithm-blue)]">รายละเอียดการวิเคราะห์สินค้า / {product.id}</p><h1 className="mt-2 break-words font-[var(--font-display)] text-3xl font-semibold tracking-[-0.06em] text-[var(--algorithm-ink)] sm:text-5xl">{product.name}</h1><p className="mt-2 truncate font-mono text-xs text-[var(--algorithm-muted)]">{product.sku || "ไม่มี SKU"} · {product.collectionName}</p></div></div><div className="flex flex-wrap items-center gap-3"><span className={`rounded-full px-3 py-1.5 text-[10px] font-bold ${product.availability === "available" ? "bg-[var(--algorithm-accent-soft)] text-[var(--algorithm-accent-strong)]" : "bg-[var(--algorithm-hot-soft)] text-[var(--algorithm-hot)]"}`}>{statusLabel(product.availability)}</span><span className="font-mono text-xs text-[var(--algorithm-muted)]">สต็อก {number(product.stockTotal)}</span></div></section>

    <section className="grid grid-cols-2 gap-3 border-b border-[var(--algorithm-rule)] py-5 sm:grid-cols-3"><div className="border-l-2 border-[var(--algorithm-accent)] pl-3"><p className="font-mono text-xl font-bold tabular-nums text-[var(--algorithm-ink)]">{number(detail.relatedProducts.length)}</p><p className="mt-1 text-xs text-[var(--algorithm-muted)]">สินค้าแนะนำ</p></div><div className="border-l-2 border-[var(--algorithm-blue)] pl-3"><p className="font-mono text-xl font-bold tabular-nums text-[var(--algorithm-ink)]">{number(detail.eventTotal)}</p><p className="mt-1 text-xs text-[var(--algorithm-muted)]">เหตุการณ์ตามตัวกรอง</p></div><div className="col-span-2 border-l-2 border-[var(--algorithm-hot)] pl-3 sm:col-span-1"><p className="font-mono text-xl font-bold tabular-nums text-[var(--algorithm-ink)]">{filters.rangeDays === 1 ? "24 ชม." : `${filters.rangeDays} วัน`}</p><p className="mt-1 text-xs text-[var(--algorithm-muted)]">ช่วงเวลาที่กำลังดู</p></div></section>

    <section id="related-products" className="scroll-mt-6 grid min-w-0 gap-5 border-b border-[var(--algorithm-rule)] py-7 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)] lg:py-9"><div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--algorithm-accent-strong)]">สินค้าใกล้เคียง / 01</p><h2 className="mt-2 text-2xl font-semibold tracking-[-0.05em]">สินค้าแนะนำที่ใกล้เคียง</h2><p className="mt-2 max-w-sm text-sm leading-6 text-[var(--algorithm-muted)]">ระบบคัดเลือกจากประเภท โทนสี การกดดูต่อ และสต็อกสินค้า</p></div><div>{detail.relatedError ? <div className="flex gap-3 rounded-2xl border border-[var(--algorithm-hot)]/25 bg-[var(--algorithm-hot-soft)] p-4" role="alert"><CircleAlert className="h-5 w-5 shrink-0 text-[var(--algorithm-hot)]" /><div><p className="text-sm font-bold">ยังอ่านสินค้าแนะนำไม่ได้</p><p className="mt-1 text-xs leading-5 text-[var(--algorithm-muted)]">ตรวจสอบ RPC `get_prop_related_products` ใน Supabase · {detail.relatedError}</p></div></div> : detail.relatedProducts.length === 0 ? <div className="rounded-2xl border border-dashed border-[var(--algorithm-rule-strong)] p-10 text-center text-sm text-[var(--algorithm-muted)]">ยังไม่มีสินค้าที่ใกล้เคียงหรือข้อมูลเพียงพอ</div> : <div className="grid gap-3 sm:grid-cols-2">{detail.relatedProducts.map((item) => <RelatedCard key={item.id} item={item} />)}</div>}</div></section>

    <section className="pt-7 lg:pt-9"><div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end"><div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--algorithm-blue)]">เหตุการณ์การเข้าชม / 02</p><h2 className="mt-2 text-2xl font-semibold tracking-[-0.05em]">ทุกการเข้าชมสินค้าที่บันทึกไว้</h2><p className="mt-2 text-sm text-[var(--algorithm-muted)]">ข้อมูลดิบแบบอ่านอย่างเดียว · {number(detail.eventTotal)} เหตุการณ์ตามตัวกรอง</p></div><div className="flex items-center gap-2 text-xs text-[var(--algorithm-muted)]"><ShieldCheck className="h-4 w-4 text-[var(--algorithm-accent-strong)]" />IP แสดงเป็น hash เท่านั้น</div></div>
      <form method="get" className="mt-6 grid gap-3 rounded-2xl border border-[var(--algorithm-rule)] bg-[var(--algorithm-surface-soft)] p-4 sm:grid-cols-2 lg:grid-cols-5"><label className="text-xs font-bold text-[var(--algorithm-ink-soft)]">ช่วงเวลา<select name="range" defaultValue={String(filters.rangeDays)} className="mt-2 block min-h-11 w-full rounded-xl border border-[var(--algorithm-rule-strong)] bg-[var(--algorithm-surface)] px-3 text-sm outline-none focus:border-[var(--algorithm-blue)] focus-visible:ring-2 focus-visible:ring-[var(--algorithm-blue)]"><option value="1">24 ชั่วโมง</option><option value="7">7 วัน</option><option value="30">30 วัน</option></select></label><label className="text-xs font-bold text-[var(--algorithm-ink-soft)]">การคัดกรองทราฟฟิก<select name="traffic" defaultValue={filters.trafficType} className="mt-2 block min-h-11 w-full rounded-xl border border-[var(--algorithm-rule-strong)] bg-[var(--algorithm-surface)] px-3 text-sm outline-none focus:border-[var(--algorithm-blue)] focus-visible:ring-2 focus-visible:ring-[var(--algorithm-blue)]"><option value="all">ทั้งหมด</option><option value="unknown">ผู้เข้าชมที่นับได้</option><option value="internal">ภายในบริษัท</option><option value="bot">บอท</option></select></label><label className="text-xs font-bold text-[var(--algorithm-ink-soft)]">การนับคะแนน<select name="countable" defaultValue={filters.countable} className="mt-2 block min-h-11 w-full rounded-xl border border-[var(--algorithm-rule-strong)] bg-[var(--algorithm-surface)] px-3 text-sm outline-none focus:border-[var(--algorithm-blue)] focus-visible:ring-2 focus-visible:ring-[var(--algorithm-blue)]"><option value="all">ทั้งหมด</option><option value="countable">นับคะแนน</option><option value="excluded">ไม่นับคะแนน</option></select></label><label className="text-xs font-bold text-[var(--algorithm-ink-soft)]">สถานะการเข้าสู่ระบบ<select name="identity" defaultValue={filters.identityType} className="mt-2 block min-h-11 w-full rounded-xl border border-[var(--algorithm-rule-strong)] bg-[var(--algorithm-surface)] px-3 text-sm outline-none focus:border-[var(--algorithm-blue)] focus-visible:ring-2 focus-visible:ring-[var(--algorithm-blue)]"><option value="all">ทั้งหมด</option><option value="user">บัญชีที่ล็อกอิน</option><option value="visitor">ไม่ได้ล็อกอิน</option></select></label><label className="text-xs font-bold text-[var(--algorithm-ink-soft)]">สถานที่<input name="location" defaultValue={filters.location} placeholder="เมือง / ภูมิภาค / ประเทศ" className="mt-2 block min-h-11 w-full rounded-xl border border-[var(--algorithm-rule-strong)] bg-[var(--algorithm-surface)] px-3 text-sm outline-none placeholder:text-[var(--algorithm-muted)] focus:border-[var(--algorithm-blue)] focus-visible:ring-2 focus-visible:ring-[var(--algorithm-blue)]" /></label><div className="sm:col-span-2 lg:col-span-5"><button type="submit" className="min-h-11 whitespace-nowrap rounded-full bg-[var(--algorithm-ink)] px-5 text-xs font-bold text-[var(--algorithm-surface)] transition-transform duration-[var(--dur-fast)] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--algorithm-blue)] active:translate-y-0">ใช้ตัวกรอง</button></div></form>

      {detail.eventError ? <div className="mt-6 flex gap-3 rounded-2xl border border-[var(--algorithm-danger)]/25 bg-[var(--algorithm-hot-soft)] p-4" role="alert"><CircleAlert className="h-5 w-5 shrink-0 text-[var(--algorithm-danger)]" /><div><p className="text-sm font-bold text-[var(--algorithm-danger)]">อ่านเหตุการณ์การเข้าชมไม่สำเร็จ</p><p className="mt-1 text-xs text-[var(--algorithm-ink-soft)]">{detail.eventError}</p></div></div> : detail.events.length === 0 ? <div className="mt-6 rounded-2xl border border-dashed border-[var(--algorithm-rule-strong)] bg-[var(--algorithm-surface)] p-12 text-center"><Bot className="mx-auto h-7 w-7 text-[var(--algorithm-muted)]" /><p className="mt-3 text-sm font-bold">ไม่พบเหตุการณ์ตามตัวกรอง</p><p className="mt-1 text-xs text-[var(--algorithm-muted)]">ลองเปลี่ยนช่วงเวลา หรือประเภททราฟฟิก</p></div> : <><div className="mt-6 grid gap-3 lg:hidden">{detail.events.map((event) => <EventCard key={event.id} event={event} />)}</div><div className="mt-6 hidden overflow-x-auto overscroll-x-contain rounded-2xl border border-[var(--algorithm-rule)] bg-[var(--algorithm-surface)] lg:block"><table className="w-full min-w-[2240px] border-collapse text-left"><thead className="bg-[var(--algorithm-surface-soft)] text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--algorithm-muted)]"><tr><th className="px-4 py-3">เวลาที่เกิดเหตุการณ์</th><th className="px-4 py-3">สถานะผู้ชม</th><th className="px-4 py-3">อีเมล / รหัสผู้ชม</th><th className="px-4 py-3">ประเทศ</th><th className="px-4 py-3">จังหวัด / ภูมิภาค</th><th className="px-4 py-3">เมือง</th><th className="px-4 py-3">ช่องทาง</th><th className="px-4 py-3">ประเภททราฟฟิก</th><th className="px-4 py-3">การนับคะแนน</th><th className="px-4 py-3">อุปกรณ์</th><th className="px-4 py-3">ระบบ</th><th className="px-4 py-3">เบราว์เซอร์</th><th className="px-4 py-3">เซสชัน</th><th className="px-4 py-3">รายละเอียด</th></tr></thead><tbody>{detail.events.map((event) => <EventRow key={event.id} event={event} />)}</tbody></table></div></>}

      <nav className="mt-6 flex items-center justify-between border-t border-[var(--algorithm-rule)] pt-4" aria-label="การแบ่งหน้าเหตุการณ์"><p className="font-mono text-[10px] text-[var(--algorithm-muted)]">หน้า {detail.eventPage} / {detail.eventPageCount}</p><div className="flex items-center gap-2">{detail.eventPage > 1 ? <Link href={query(detail.eventPage - 1)} className="inline-flex min-h-10 items-center gap-1 rounded-full border border-[var(--algorithm-rule-strong)] px-4 text-xs font-bold text-[var(--algorithm-ink-soft)] hover:border-[var(--algorithm-blue)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--algorithm-blue)]"><ChevronLeft className="h-4 w-4" />ก่อนหน้า</Link> : <span className="inline-flex min-h-10 items-center gap-1 rounded-full border border-[var(--algorithm-rule)] px-4 text-xs font-bold text-[var(--algorithm-muted)] opacity-50"><ChevronLeft className="h-4 w-4" />ก่อนหน้า</span>}{detail.eventPage < detail.eventPageCount ? <Link href={query(detail.eventPage + 1)} className="inline-flex min-h-10 items-center gap-1 rounded-full border border-[var(--algorithm-rule-strong)] px-4 text-xs font-bold text-[var(--algorithm-ink-soft)] hover:border-[var(--algorithm-blue)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--algorithm-blue)]">ถัดไป<ChevronRight className="h-4 w-4" /></Link> : <span className="inline-flex min-h-10 items-center gap-1 rounded-full border border-[var(--algorithm-rule)] px-4 text-xs font-bold text-[var(--algorithm-muted)] opacity-50">ถัดไป<ChevronRight className="h-4 w-4" /></span>}</div></nav>
    </section>
    <footer className="mt-12 border-t border-[var(--algorithm-rule)] pt-4 text-[10px] text-[var(--algorithm-muted)]">เหตุการณ์อัลกอริทึม · สำหรับ Admin เท่านั้น · ไม่มีการเก็บ IP จริง</footer>
  </div></main></div>
}
