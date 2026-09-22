"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useTransition } from "react"

interface CategoryOption {
  key: string
  name: string
  groupType: string
}

export default function DashboardCategoryFilter({
  selectedCatKey,
  categories,
}: {
  selectedCatKey: string
  categories: CategoryOption[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const handleChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === "ALL") {
      params.delete("cat")
    } else {
      params.set("cat", value)
    }
    const qs = params.toString()
    startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname))
  }

  return (
    <select
      value={selectedCatKey}
      disabled={isPending}
      onChange={(e) => handleChange(e.target.value)}
      aria-label="เลือกหมวดหมู่สินค้า"
      className="min-w-44 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:cursor-wait disabled:opacity-60 shadow-sm"
    >
      <option value="ALL">ทุกหมวดหมู่</option>
      {categories.map((cat) => (
        <option key={cat.key} value={cat.key}>
          {cat.name}
        </option>
      ))}
    </select>
  )
}
