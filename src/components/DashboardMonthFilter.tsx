"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useTransition } from "react"

export default function DashboardMonthFilter({
  selectedMonth,
}: {
  selectedMonth: string // format: "ALL" | "YYYY-MM"
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  // สร้างรายการตัวเลือก: ทุกช่วงเวลา + 13 เดือนย้อนหลัง
  const options: { value: string; label: string }[] = [
    { value: "ALL", label: "ทุกช่วงเวลา" },
  ]
  const now = new Date()
  for (let i = 0; i < 13; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    const label = d.toLocaleDateString("th-TH", { month: "long", year: "numeric" })
    options.push({ value, label })
  }

  const handleChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === "ALL") {
      params.set("month", "ALL")
    } else {
      params.set("month", value)
    }
    const qs = params.toString()
    startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname))
  }

  return (
    <select
      value={selectedMonth}
      disabled={isPending}
      onChange={(e) => handleChange(e.target.value)}
      aria-label="เลือกช่วงเวลา"
      className="min-w-44 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-bold text-blue-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-wait disabled:opacity-60"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}
