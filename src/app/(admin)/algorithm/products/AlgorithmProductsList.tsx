import Link from "next/link"
import { ArrowLeft, ArrowUpRight, ChevronLeft, ChevronRight, CircleAlert, Eye, Globe2, PackageCheck } from "lucide-react"
import type { AlgorithmProductsPage, AlgorithmRange, AlgorithmProductListItem } from "../../../../actions/algorithm"

function number(value: number) {
  return new Intl.NumberFormat("th-TH").format(value)
}

function dateTime(value: string | null) {
  if (!value) return "ยังไม่มีข้อมูล"
  return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
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

function rangeLabel(days: AlgorithmRange) {
  return days === 1 ? "24 ชั่วโมง" : `${days} วัน`
}

function statusLabel(item: AlgorithmProductListItem) {
  if (item.status && item.status !== "active") return item.status
  return item.availability === "available" ? "มีของ" : "พรีออเดอร์"
}

function statusClass(item: AlgorithmProductListItem) {
  if (item.status && item.status !== "active") return "bg-[var(--algorithm-surface-soft)] text-[var(--algorithm-muted)]"
  return item.availability === "available"
    ? "bg-[var(--algorithm-accent-soft)] text-[var(--algorithm-accent-strong)]"
    : "bg-[var(--algorithm-hot-soft)] text-[var(--algorithm-hot)]"
}

function productCountry(item: AlgorithmProductListItem) {
  if (!item.primaryCountry) return { name: "ไม่ระบุประเทศ", flag: "🌐" }
  if (item.primaryCountry.code) return { name: countryName(item.primaryCountry.code), flag: countryFlag(item.primaryCountry.code) }
  return { name: item.primaryCountry.label, flag: "🌐" }
}

function ProductThumb({ item }: { item: AlgorithmProductListItem }) {
  return <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-[var(--algorithm-surface-soft)]">{item.imageUrl ? <img src={item.imageUrl} alt="" className="h-full w-full object-contain p-1" /> : <PackageCheck className="h-5 w-5 text-[var(--algorithm-muted)]" />}</div>
}

function ProductRow({ item }: { item: AlgorithmProductListItem }) {
  const country = productCountry(item)
  return <tr className={`border-t border-[var(--algorithm-rule)] align-middle transition-colors hover:bg-[var(--algorithm-surface-soft)] ${item.uniqueViews === 0 ? "opacity-75" : ""}`}><td className="px-4 py-4 text-center font-mono text-xs font-bold tabular-nums text-[var(--algorithm-muted)]">{item.rank ? `#${item.rank}` : "—"}</td><td className="px-4 py-4"><Link href={`/algorithm/products/${item.id}`} className="flex min-w-[280px] items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--algorithm-blue)]"><ProductThumb item={item} /><span className="min-w-0"><span className="block truncate text-sm font-bold text-[var(--algorithm-ink)]">{item.name}</span><span className="mt-1 block truncate font-mono text-[10px] text-[var(--algorithm-muted)]">{item.sku || "ไม่มี SKU"} · {item.collectionName}</span></span></Link></td><td className="px-4 py-4 text-right"><span className="font-mono text-sm font-bold tabular-nums text-[var(--algorithm-ink)]">{number(item.uniqueViews)}</span><span className="mt-1 block text-[10px] text-[var(--algorithm-muted)]">ยอดดูไม่ซ้ำ</span></td><td className="px-4 py-4"><span className="flex items-center gap-2 whitespace-nowrap text-sm text-[var(--algorithm-ink-soft)]"><span aria-hidden="true" className="text-lg leading-none">{country.flag}</span>{country.name}</span></td><td className="whitespace-nowrap px-4 py-4 text-xs text-[var(--algorithm-muted)]">{dateTime(item.lastViewedAt)}</td><td className="whitespace-nowrap px-4 py-4 text-right font-mono text-sm font-bold tabular-nums text-[var(--algorithm-ink)]">{number(item.stockTotal)} ชิ้น</td><td className="px-4 py-4"><span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-bold ${statusClass(item)}`}>{statusLabel(item)}</span></td><td className="px-4 py-4"><Link href={`/algorithm/products/${item.id}`} className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-bold text-[var(--algorithm-blue)] hover:underline">ดูรายละเอียด <ArrowUpRight className="h-3.5 w-3.5" /></Link></td></tr>
}

export default function AlgorithmProductsList({ data }: { data: AlgorithmProductsPage }) {
  const query = (page: number, range = data.rangeDays) => `/algorithm/products?page=${page}&range=${range}`
  const rangeLinks: Array<{ days: AlgorithmRange; label: string }> = [{ days: 1, label: "24 ชม." }, { days: 7, label: "7 วัน" }, { days: 30, label: "30 วัน" }]

  return <div className="algorithm-shell relative min-h-screen overflow-x-clip bg-[var(--algorithm-paper)] font-[var(--font-body)] text-[var(--algorithm-ink)]"><div className="pointer-events-none absolute -left-24 top-20 h-72 w-72 rounded-full bg-[var(--algorithm-paper-deep)] opacity-80 blur-3xl" /><div className="pointer-events-none absolute -right-28 bottom-24 h-96 w-96 rounded-full bg-[var(--algorithm-paper-blue)] opacity-80 blur-3xl" /><main className="relative mx-auto max-w-[1680px] px-3 py-3 sm:px-5 sm:py-5 lg:px-8 lg:py-8"><div className="rounded-[2rem] border border-[var(--algorithm-rule)] bg-[var(--algorithm-surface)] p-3 shadow-[var(--algorithm-shadow)] sm:p-5 lg:p-7"><header className="flex flex-col gap-4 border-b border-[var(--algorithm-rule)] pb-5 lg:flex-row lg:items-center lg:justify-between"><div className="flex min-w-0 items-center gap-3"><Link href="/algorithm" className="inline-flex min-h-10 items-center gap-2 whitespace-nowrap rounded-full bg-[var(--algorithm-surface-soft)] px-4 text-xs font-bold text-[var(--algorithm-ink-soft)] transition-colors hover:bg-[var(--algorithm-accent-soft)] hover:text-[var(--algorithm-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--algorithm-blue)]"><ArrowLeft className="h-4 w-4" />กลับภาพรวม</Link><div className="hidden h-8 w-px bg-[var(--algorithm-rule)] sm:block" /><div><p className="font-[var(--font-display)] text-lg font-semibold tracking-[-0.04em]">สินค้าทั้งหมด</p><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--algorithm-muted)]">Prop catalog</p></div></div><div className="flex items-center gap-1 rounded-full border border-[var(--algorithm-rule)] bg-[var(--algorithm-surface)] p-1">{rangeLinks.map((range) => <Link key={range.days} href={query(1, range.days)} className={`whitespace-nowrap rounded-full px-3 py-2 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--algorithm-blue)] ${data.rangeDays === range.days ? "bg-[var(--algorithm-ink)] text-[var(--algorithm-surface)]" : "text-[var(--algorithm-muted)] hover:bg-[var(--algorithm-accent-soft)] hover:text-[var(--algorithm-ink)]"}`}>{range.label}</Link>)}</div></header><section className="flex flex-col justify-between gap-5 py-7 sm:py-9 lg:flex-row lg:items-end"><div><div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[var(--algorithm-accent-soft)] px-3 py-1.5 text-[10px] font-bold text-[var(--algorithm-accent-strong)]"><Eye className="h-3.5 w-3.5" />จัดเรียงตามความสนใจ</div><h1 className="font-[var(--font-display)] text-4xl font-semibold leading-[1.05] tracking-[-0.06em] text-[var(--algorithm-ink)] sm:text-5xl">ดูสินค้าทุกชิ้นของ Prop</h1><p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--algorithm-muted)]">แสดงสินค้า Prop ทั้งหมด เรียง Hot Item ก่อน และวางสินค้าที่ไม่มีข้อมูลการดูไว้ท้ายรายการ · ช่วง {rangeLabel(data.rangeDays)}</p></div><div className="text-right"><p className="font-mono text-3xl font-semibold tabular-nums text-[var(--algorithm-ink)]">{data.error ? "—" : number(data.total)}</p><p className="mt-1 text-xs text-[var(--algorithm-muted)]">สินค้าทั้งหมด</p></div></section>{data.error && <section className="mb-5 flex gap-3 rounded-2xl border border-[var(--algorithm-danger)]/25 bg-[var(--algorithm-hot-soft)] p-4" role="alert"><CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-[var(--algorithm-danger)]" /><div><p className="text-sm font-bold text-[var(--algorithm-danger)]">อ่านรายการสินค้าไม่สำเร็จ</p><p className="mt-1 text-xs leading-5 text-[var(--algorithm-ink-soft)]">{data.error}</p></div></section>}{data.products.length === 0 ? <div className="rounded-2xl border border-dashed border-[var(--algorithm-rule-strong)] px-6 py-16 text-center text-sm text-[var(--algorithm-muted)]"><Globe2 className="mx-auto mb-3 h-6 w-6" />ยังไม่มีสินค้า Prop ในข้อมูลปัจจุบัน</div> : <div className="overflow-x-auto rounded-2xl border border-[var(--algorithm-rule)]"><table className="w-full min-w-[1220px] border-collapse text-left"><thead className="bg-[var(--algorithm-surface-soft)] text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--algorithm-muted)]"><tr><th className="px-4 py-3 text-center">อันดับ</th><th className="px-4 py-3">สินค้า</th><th className="px-4 py-3 text-right">ยอดดู</th><th className="px-4 py-3">ประเทศหลัก</th><th className="px-4 py-3">ดูล่าสุด</th><th className="px-4 py-3 text-right">สต็อก</th><th className="px-4 py-3">สถานะ</th><th className="px-4 py-3">ลิงก์</th></tr></thead><tbody>{data.products.map((item) => <ProductRow key={item.id} item={item} />)}</tbody></table></div>}<nav className="mt-6 flex flex-col gap-3 border-t border-[var(--algorithm-rule)] pt-4 sm:flex-row sm:items-center sm:justify-between" aria-label="การแบ่งหน้าสินค้า"><p className="font-mono text-[10px] text-[var(--algorithm-muted)]">หน้า {data.page} / {data.pageCount} · แสดงครั้งละ 50 รายการ</p><div className="flex items-center gap-2">{data.page > 1 ? <Link href={query(data.page - 1)} className="inline-flex min-h-10 items-center gap-1 rounded-full border border-[var(--algorithm-rule-strong)] px-4 text-xs font-bold text-[var(--algorithm-ink-soft)] hover:border-[var(--algorithm-blue)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--algorithm-blue)]"><ChevronLeft className="h-4 w-4" />ก่อนหน้า</Link> : <span className="inline-flex min-h-10 items-center gap-1 rounded-full border border-[var(--algorithm-rule)] px-4 text-xs font-bold text-[var(--algorithm-muted)] opacity-50"><ChevronLeft className="h-4 w-4" />ก่อนหน้า</span>}{data.page < data.pageCount ? <Link href={query(data.page + 1)} className="inline-flex min-h-10 items-center gap-1 rounded-full border border-[var(--algorithm-rule-strong)] px-4 text-xs font-bold text-[var(--algorithm-ink-soft)] hover:border-[var(--algorithm-blue)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--algorithm-blue)]">ถัดไป<ChevronRight className="h-4 w-4" /></Link> : <span className="inline-flex min-h-10 items-center gap-1 rounded-full border border-[var(--algorithm-rule)] px-4 text-xs font-bold text-[var(--algorithm-muted)] opacity-50">ถัดไป<ChevronRight className="h-4 w-4" /></span>}</div></nav></div></main></div>
}
