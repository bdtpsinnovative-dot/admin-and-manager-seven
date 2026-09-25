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
  if (item.status && item.status !== "active") return "bg-slate-100 text-slate-500 border border-slate-200"
  return item.availability === "available"
    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
    : "bg-amber-50 text-amber-700 border border-amber-200"
}

function productCountry(item: AlgorithmProductListItem) {
  if (!item.primaryCountry) return { name: "ไม่ระบุประเทศ", flag: "🌐" }
  if (item.primaryCountry.code) return { name: countryName(item.primaryCountry.code), flag: countryFlag(item.primaryCountry.code) }
  return { name: item.primaryCountry.label, flag: "🌐" }
}

function ProductThumb({ item }: { item: AlgorithmProductListItem }) {
  return (
    <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
      {item.imageUrl ? (
        <img src={item.imageUrl} alt="" className="h-full w-full object-contain p-1" />
      ) : (
        <PackageCheck className="h-5 w-5 text-slate-400" />
      )}
    </div>
  )
}

function ProductRow({ item }: { item: AlgorithmProductListItem }) {
  const country = productCountry(item)
  return (
    <tr className={`border-t border-slate-100 align-middle transition-colors hover:bg-slate-50/80 ${item.uniqueViews === 0 ? "opacity-60" : ""}`}>
      <td className="px-4 py-3.5 text-center font-mono text-xs font-bold tabular-nums text-slate-400">
        {item.rank ? `#${item.rank}` : "—"}
      </td>
      <td className="px-4 py-3.5">
        <Link href={`/algorithm/products/${item.id}`} className="flex min-w-[280px] items-center gap-3 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
          <ProductThumb item={item} />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
              {item.name}
            </span>
            <span className="mt-0.5 block truncate font-mono text-[11px] text-slate-400">
              {item.sku || "ไม่มี SKU"} · {item.collectionName}
            </span>
          </span>
        </Link>
      </td>
      <td className="px-4 py-3.5 text-right">
        <span className="font-mono text-sm font-bold tabular-nums text-slate-900">
          {number(item.uniqueViews)}
        </span>
        <span className="mt-0.5 block text-[10px] text-slate-400">ยอดดูไม่ซ้ำ</span>
      </td>
      <td className="px-4 py-3.5">
        <span className="flex items-center gap-2 whitespace-nowrap text-sm text-slate-700">
          <span aria-hidden="true" className="text-base leading-none">{country.flag}</span>
          {country.name}
        </span>
      </td>
      <td className="whitespace-nowrap px-4 py-3.5 text-xs text-slate-400">
        {dateTime(item.lastViewedAt)}
      </td>
      <td className="whitespace-nowrap px-4 py-3.5 text-right font-mono text-sm font-bold tabular-nums text-slate-900">
        {number(item.stockTotal)} ชิ้น
      </td>
      <td className="px-4 py-3.5">
        <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${statusClass(item)}`}>
          {statusLabel(item)}
        </span>
      </td>
      <td className="px-4 py-3.5 text-right">
        <Link
          href={`/algorithm/products/${item.id}`}
          className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
        >
          ดูรายละเอียด <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </td>
    </tr>
  )
}

export default function AlgorithmProductsList({ data }: { data: AlgorithmProductsPage }) {
  const query = (page: number, range = data.rangeDays) => `/algorithm/products?page=${page}&range=${range}`
  const rangeLinks: Array<{ days: AlgorithmRange; label: string }> = [
    { days: 1, label: "24 ชม." },
    { days: 7, label: "7 วัน" },
    { days: 30, label: "30 วัน" },
  ]

  return (
    <div className="w-full space-y-6">
      {/* Top Header / Navigation */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/algorithm"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            <ArrowLeft className="h-4 w-4" />
            กลับภาพรวม
          </Link>
          <div className="h-4 w-px bg-slate-200" />
          <nav className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            <Link
              href="/algorithm"
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            >
              ภาพรวม
            </Link>
            <Link
              href="/algorithm/audience"
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            >
              กลุ่มเป้าหมาย (Audience)
            </Link>
            <span
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm"
            >
              สินค้าทั้งหมด
            </span>
          </nav>
        </div>

        {/* Date Range Selector */}
        <div className="flex items-center gap-1 self-start sm:self-auto rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          {rangeLinks.map((range) => (
            <Link
              key={range.days}
              href={query(1, range.days)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
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

      {/* Hero / Summary Section */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-xs font-semibold text-blue-700">
              <Eye className="h-3.5 w-3.5 text-blue-600" />
              จัดเรียงตามความสนใจ (Interest-based)
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              สินค้าทั้งหมดของ Prop
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              แสดงสินค้า Prop ทั้งหมด เรียง Hot Item ก่อน และวางสินค้าที่ไม่มีข้อมูลการดูไว้ท้ายรายการ · ช่วง {rangeLabel(data.rangeDays)}
            </p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 px-5 py-4 text-left sm:text-right">
            <p className="font-mono text-3xl font-black tabular-nums text-slate-900">
              {data.error ? "—" : number(data.total)}
            </p>
            <p className="mt-0.5 text-xs font-medium text-slate-500">สินค้าทั้งหมดในระบบ</p>
          </div>
        </div>
      </div>

      {/* Error alert */}
      {data.error && (
        <div className="flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm" role="alert">
          <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <div>
            <p className="text-sm font-bold text-red-800">อ่านรายการสินค้าไม่สำเร็จ</p>
            <p className="mt-1 text-xs text-red-600">{data.error}</p>
          </div>
        </div>
      )}

      {/* Products Table Card */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {data.products.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-slate-400">
            <Globe2 className="mx-auto mb-3 h-8 w-8 text-slate-300" />
            ยังไม่มีสินค้า Prop ในข้อมูลปัจจุบัน
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] border-collapse text-left">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-center w-16">อันดับ</th>
                  <th className="px-4 py-3">สินค้า</th>
                  <th className="px-4 py-3 text-right">ยอดดู</th>
                  <th className="px-4 py-3">ประเทศหลัก</th>
                  <th className="px-4 py-3">ดูล่าสุด</th>
                  <th className="px-4 py-3 text-right">สต็อก</th>
                  <th className="px-4 py-3">สถานะ</th>
                  <th className="px-4 py-3 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.products.map((item) => (
                  <ProductRow key={item.id} item={item} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Card Footer */}
        <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/50 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between" aria-label="การแบ่งหน้าสินค้า">
          <p className="font-mono text-xs text-slate-500">
            หน้า {data.page} / {data.pageCount} · แสดงครั้งละ 50 รายการ
          </p>
          <div className="flex items-center gap-2">
            {data.page > 1 ? (
              <Link
                href={query(data.page - 1)}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              >
                <ChevronLeft className="h-4 w-4" />
                ก่อนหน้า
              </Link>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-xl border border-slate-100 bg-slate-50 px-3.5 py-1.5 text-xs font-medium text-slate-300 cursor-not-allowed">
                <ChevronLeft className="h-4 w-4" />
                ก่อนหน้า
              </span>
            )}
            {data.page < data.pageCount ? (
              <Link
                href={query(data.page + 1)}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              >
                ถัดไป
                <ChevronRight className="h-4 w-4" />
              </Link>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-xl border border-slate-100 bg-slate-50 px-3.5 py-1.5 text-xs font-medium text-slate-300 cursor-not-allowed">
                ถัดไป
                <ChevronRight className="h-4 w-4" />
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
