"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { BRAND_DEFINITIONS, type DashboardBrandKey } from "@/lib/dashboardBrand"

export const BRAND_OPTIONS = Object.values(BRAND_DEFINITIONS)

export default function DashboardBrandFilter({
  selectedBrand,
}: {
  selectedBrand: DashboardBrandKey
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const handleChange = (value: string) => {
    if (value === selectedBrand) return
    const params = new URLSearchParams(searchParams.toString())
    // 🌟 บันทึกแบรนด์ลงใน URL เสมอ เพื่อให้ URL จำค่าฟิลเตอร์ได้อย่างแม่นยำ
    params.set("brand", value)
    // เมื่อเปลี่ยนแบรนด์ ให้เคลียร์การกรองหมวดหมู่เดี่ยวเดิมออก เพื่อดูภาพรวมของแบรนด์ใหม่
    params.delete("cat")

    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

  return (
    <select
      value={selectedBrand}
      onChange={(e) => handleChange(e.target.value)}
      aria-label="เลือกแบรนด์สินค้า"
      className="min-w-44 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 shadow-sm cursor-pointer transition-colors hover:border-slate-300"
    >
      {BRAND_OPTIONS.map((b) => (
        <option key={b.key} value={b.key}>
          {b.emoji} {b.name} ({b.thaiName})
        </option>
      ))}
    </select>
  )
}
