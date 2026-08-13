import Link from "next/link"
import { ArrowUpRight, Clock3, Eye, UsersRound } from "lucide-react"
import type { AudienceAnalytics, AudiencePersona, AudienceProduct } from "../../../actions/audience-analytics"
import SourceBadge from "./SourceBadge"
import TechnologyBadge from "./TechnologyBadge"

function number(value: number) { return new Intl.NumberFormat("th-TH").format(value) }
function dateTime(value: string | null) { return value ? new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "ยังไม่มีข้อมูล" }
function seconds(value: number) { return value < 60 ? `${number(value)} วิ` : `${Math.floor(value / 60)} นาที ${value % 60} วิ` }

function PersonaHomeTable({ personas }: { personas: AudiencePersona[] }) {
  const rows = personas.slice(0, 8)
  return (
    <div className="overflow-x-auto rounded-2xl border border-[var(--algorithm-rule)]">
      <table className="w-full min-w-[980px] border-collapse text-left">
        <thead className="bg-[var(--algorithm-surface-soft)] text-[10px] font-bold tracking-[0.08em] text-[var(--algorithm-muted)]">
          <tr><th className="px-4 py-3">วันที่</th><th className="px-4 py-3">ผู้ชม</th><th className="px-4 py-3">สถานที่</th><th className="px-4 py-3 text-right">จำนวนครั้งที่เข้าเว็บ</th><th className="px-4 py-3 text-right">หน้า</th><th className="px-4 py-3">เวลาเฉลี่ย</th><th className="px-4 py-3">ช่วงราคาที่ดู</th><th className="px-4 py-3">อุปกรณ์ / ระบบ</th><th className="px-4 py-3">ช่องทางล่าสุด</th></tr>
        </thead>
        <tbody>{rows.map((persona) => <tr key={persona.identityKey} className="border-t border-[var(--algorithm-rule)] align-top hover:bg-[var(--algorithm-surface-soft)]"><td className="whitespace-nowrap px-4 py-4 text-xs text-[var(--algorithm-muted)]"><span className="block">พบ {dateTime(persona.firstSeenAt)}</span><span className="mt-1 block">ล่าสุด {dateTime(persona.lastSeenAt)}</span></td><td className="px-4 py-4"><span className="block max-w-[180px] truncate text-sm font-bold text-[var(--algorithm-ink)]">{persona.identityLabel}</span><span className="mt-1 block text-[10px] text-[var(--algorithm-muted)]">{persona.identityType === "user" ? "บัญชีที่ล็อกอิน" : "โปรไฟล์เบราว์เซอร์ที่ไม่ได้ล็อกอิน"}</span><span className="mt-2 inline-flex rounded-full bg-[var(--algorithm-accent-soft)] px-2 py-1 text-[10px] font-bold text-[var(--algorithm-accent-strong)]">{persona.labels[0] || "ยังจำแนกไม่ได้"}</span></td><td className="max-w-[160px] px-4 py-4 text-xs text-[var(--algorithm-muted)]">{persona.location || "ไม่ระบุ"}</td><td className="px-4 py-4 text-right font-mono text-sm font-bold">{number(persona.sessions)}</td><td className="px-4 py-4 text-right font-mono text-sm">{number(persona.pageViews)}<span className="mt-1 block text-[10px] text-[var(--algorithm-muted)]">ไม่ซ้ำ {number(persona.uniquePages)}</span></td><td className="whitespace-nowrap px-4 py-4 text-xs"><span className="inline-flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5 text-[var(--algorithm-blue)]" />{seconds(persona.averageSessionSeconds)}</span></td><td className="whitespace-nowrap px-4 py-4 text-xs">{persona.minPrice === null ? "ไม่ระบุ" : `${number(persona.minPrice)}–${number(persona.maxPrice || persona.minPrice)} บาท`}<span className="mt-1 block text-[10px] text-[var(--algorithm-muted)]">เฉลี่ย {persona.averagePrice === null ? "—" : `${number(persona.averagePrice)} บาท`}</span></td><td className="px-4 py-4 text-xs"><div className="space-y-2"><TechnologyBadge kind="device" value={persona.device} /><TechnologyBadge kind="os" value={persona.os} /><TechnologyBadge kind="browser" value={persona.browser} /></div></td><td className="px-4 py-4 text-xs"><SourceBadge value={persona.latestSource} /></td></tr>)}</tbody>
      </table>
      {rows.length === 0 && <div className="px-6 py-12 text-center text-sm text-[var(--algorithm-muted)]">ยังไม่มีข้อมูล Persona</div>}
    </div>
  )
}

function ProductHomeTable({ products }: { products: AudienceProduct[] }) {
  const rows = products.slice(0, 10)
  return (
    <div className="overflow-x-auto rounded-2xl border border-[var(--algorithm-rule)]">
      <table className="w-full min-w-[1120px] border-collapse text-left">
        <thead className="bg-[var(--algorithm-surface-soft)] text-[10px] font-bold tracking-[0.08em] text-[var(--algorithm-muted)]">
          <tr><th className="px-4 py-3">สินค้า</th><th className="px-4 py-3">หมวด / สี / ราคา</th><th className="px-4 py-3 text-right">ดูไม่ซ้ำ</th><th className="px-4 py-3 text-right">ดูซ้ำ</th><th className="px-4 py-3">เวลาเฉลี่ย</th><th className="px-4 py-3">ออก / ไปต่อ</th><th className="px-4 py-3">ช่องทางหลัก</th><th className="px-4 py-3">อุปกรณ์หลัก</th><th className="px-4 py-3">ดูล่าสุด</th></tr>
        </thead>
        <tbody>{rows.map((product) => <tr key={product.id} className="border-t border-[var(--algorithm-rule)] align-top hover:bg-[var(--algorithm-surface-soft)]"><td className="px-4 py-4"><Link href={`/algorithm/products/${product.id}`} className="flex min-w-[220px] items-center gap-3"><div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-[var(--algorithm-surface-soft)]">{product.imageUrl ? <img src={product.imageUrl} alt="" className="h-full w-full object-contain p-1" /> : <Eye className="h-4 w-4 text-[var(--algorithm-muted)]" />}</div><span className="min-w-0"><span className="block truncate text-sm font-bold text-[var(--algorithm-ink)]">{product.name}</span><span className="mt-1 block truncate font-mono text-[10px] text-[var(--algorithm-muted)]">{product.sku || "ไม่มี SKU"}</span><span className="mt-1 block text-[10px] text-[var(--algorithm-muted)]">{product.status || "ไม่ระบุสถานะ"}</span></span></Link></td><td className="px-4 py-4 text-xs"><span className="block font-semibold">{product.category}</span><span className="mt-1 block text-[var(--algorithm-muted)]">{product.color || "ไม่ระบุสี"}</span><span className="mt-1 block font-mono">{product.price === null ? "ไม่ระบุราคา" : `${number(product.price)} บาท`}</span></td><td className="px-4 py-4 text-right font-mono text-sm font-bold text-[var(--algorithm-accent-strong)]">{number(product.uniqueViews)}</td><td className="px-4 py-4 text-right font-mono text-sm">{number(product.repeatViews)}</td><td className="whitespace-nowrap px-4 py-4 text-xs">{seconds(product.avgActiveSeconds)}</td><td className="px-4 py-4 text-xs"><span className="block">ออก {number(product.exitCount)}</span><span className="block text-[var(--algorithm-blue)]">ไปต่อ {number(product.continueProductCount + product.continueCollectionCount + product.continueOtherCount)}</span></td><td className="px-4 py-4 text-xs"><SourceBadge value={product.primarySource} note={`สัดส่วน ${product.primarySourceShare}%`} /></td><td className="px-4 py-4 text-xs"><TechnologyBadge kind="device" value={product.primaryDevice} note={`สัดส่วน ${product.primaryDeviceShare}%`} /></td><td className="whitespace-nowrap px-4 py-4 text-xs text-[var(--algorithm-muted)]">{dateTime(product.lastViewedAt)}</td></tr>)}</tbody>
      </table>
      {rows.length === 0 && <div className="px-6 py-12 text-center text-sm text-[var(--algorithm-muted)]">ยังไม่มีข้อมูล Product Analytics</div>}
    </div>
  )
}

export default function AudienceHomeTables({ data }: { data: AudienceAnalytics }) {
  return (
    <div className="algorithm-shell relative min-h-screen overflow-x-clip bg-[var(--algorithm-paper)] px-3 py-3 sm:px-5 sm:py-5 lg:px-8 lg:py-8">
      <main className="mx-auto max-w-[1680px]">
        <section className="space-y-5">
          <article className="min-w-0 rounded-[1.5rem] border border-[var(--algorithm-rule)] bg-[var(--algorithm-surface)] p-4 shadow-[var(--algorithm-shadow)] sm:p-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--algorithm-blue)]">Persona Analytics · {data.rangeDays} วันล่าสุด</p>
                <h2 className="mt-2 flex items-center gap-2 text-xl font-semibold tracking-[-0.04em]"><UsersRound className="h-5 w-5 text-[var(--algorithm-blue)]" />ผู้ชมและพฤติกรรมล่าสุด</h2>
                <p className="mt-1 text-xs text-[var(--algorithm-muted)]">เรียงวันที่ก่อน เพื่อให้เห็นผู้ชมที่เข้ามาล่าสุดก่อน</p>
              </div>
              <Link href="/algorithm/audience" className="inline-flex min-h-10 items-center justify-center gap-1 whitespace-nowrap rounded-full border border-[var(--algorithm-rule-strong)] px-4 text-xs font-bold hover:border-[var(--algorithm-blue)] hover:text-[var(--algorithm-blue)]">ดู Persona ทั้งหมด <ArrowUpRight className="h-3.5 w-3.5" /></Link>
            </div>
            <div className="mt-5"><PersonaHomeTable personas={data.personas} /></div>
          </article>

          <article className="min-w-0 rounded-[1.5rem] border border-[var(--algorithm-rule)] bg-[var(--algorithm-surface)] p-4 shadow-[var(--algorithm-shadow)] sm:p-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--algorithm-accent-strong)]">Product Analytics · {data.rangeDays} วันล่าสุด</p>
                <h2 className="mt-2 flex items-center gap-2 text-xl font-semibold tracking-[-0.04em]"><Eye className="h-5 w-5 text-[var(--algorithm-accent-strong)]" />สินค้าและพฤติกรรมการดู</h2>
                <p className="mt-1 text-xs text-[var(--algorithm-muted)]">เรียงจากยอดดูไม่ซ้ำ พร้อมรูปสินค้าและช่องทางที่พาคนเข้ามาดู</p>
              </div>
              <Link href="/algorithm/audience" className="inline-flex min-h-10 items-center justify-center gap-1 whitespace-nowrap rounded-full border border-[var(--algorithm-rule-strong)] px-4 text-xs font-bold hover:border-[var(--algorithm-blue)] hover:text-[var(--algorithm-blue)]">ดู Product Analytics ทั้งหมด <ArrowUpRight className="h-3.5 w-3.5" /></Link>
            </div>
            <div className="mt-5"><ProductHomeTable products={data.products} /></div>
          </article>
        </section>
      </main>
    </div>
  )
}
