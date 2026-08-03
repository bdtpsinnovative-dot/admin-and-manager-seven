"use client"

import { usePathname, useRouter } from "next/navigation"
import { useTransition } from "react"

interface BranchOption {
  id: number
  name: string
}

export default function DashboardBranchFilter({
  branches,
  selectedBranch,
}: {
  branches: BranchOption[]
  selectedBranch: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()

  const handleChange = (value: string) => {
    const url = value === "ALL" ? pathname : `${pathname}?branch=${encodeURIComponent(value)}`
    startTransition(() => router.push(url))
  }

  return (
    <select
      value={selectedBranch}
      disabled={isPending}
      onChange={(event) => handleChange(event.target.value)}
      aria-label="เลือกสาขา"
      className="min-w-56 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-wait disabled:opacity-60"
    >
      <option value="ALL">ทุกสาขา</option>
      {branches.map((branch) => (
        <option key={branch.id} value={branch.id}>{branch.name}</option>
      ))}
    </select>
  )
}
