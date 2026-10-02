"use client"

import { useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Calendar, ChevronDown, Clock, Filter, X } from "lucide-react"
import { getAvailableMonths } from "@/lib/algorithm-date-window"

const PRESETS = [
  { days: 1, label: "24 ชม." },
  { days: 7, label: "7 วัน" },
  { days: 30, label: "30 วัน" },
  { days: 60, label: "60 วัน" },
  { days: 90, label: "90 วัน" },
]

export default function AlgorithmDateFilter({ className = "" }: { className?: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const currentRange = searchParams.get("range")
  const currentMonth = searchParams.get("month")
  const currentFrom = searchParams.get("from")
  const currentTo = searchParams.get("to")

  const [isCustomOpen, setIsCustomOpen] = useState(false)
  const [fromDate, setFromDate] = useState(currentFrom || "")
  const [toDate, setToDate] = useState(currentTo || "")

  const availableMonths = getAvailableMonths()

  function updateQuery(newParams: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString())

    // Clear conflicting date params
    params.delete("range")
    params.delete("month")
    params.delete("from")
    params.delete("to")
    params.delete("offset")

    for (const [key, val] of Object.entries(newParams)) {
      if (val !== null && val !== undefined && val !== "") {
        params.set(key, val)
      }
    }

    router.push(`${pathname}?${params.toString()}`)
  }

  function handlePresetClick(days: number) {
    setIsCustomOpen(false)
    updateQuery({ range: String(days) })
  }

  function handleMonthChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value
    setIsCustomOpen(false)
    if (val) {
      updateQuery({ month: val })
    } else {
      updateQuery({ range: "30" })
    }
  }

  function handleCustomSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!fromDate || !toDate) return
    setIsCustomOpen(false)
    updateQuery({ from: fromDate, to: toDate })
  }

  const isPresetActive = (days: number) => {
    if (currentMonth || (currentFrom && currentTo)) return false
    if (!currentRange && days === 30) return true
    return currentRange === String(days)
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {/* 1. Preset Buttons */}
      <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
        {PRESETS.map((p) => {
          const active = isPresetActive(p.days)
          return (
            <button
              key={p.days}
              type="button"
              onClick={() => handlePresetClick(p.days)}
              className={`whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors ${
                active
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              {p.label}
            </button>
          )
        })}
      </div>

      {/* 2. Month Selector Dropdown */}
      <div className="relative">
        <select
          value={currentMonth || ""}
          onChange={handleMonthChange}
          aria-label="เลือกดูข้อมูลตามเดือน"
          className={`h-9 appearance-none rounded-xl border pl-8 pr-8 text-xs font-bold shadow-sm transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            currentMonth
              ? "border-blue-600 bg-blue-50 text-blue-700 font-extrabold"
              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          <option value="">📅 เลือกตามเดือน...</option>
          {availableMonths.map((m) => (
            <option key={m.key} value={m.key}>
              {m.label}
            </option>
          ))}
        </select>
        <Calendar className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
      </div>

      {/* 3. Custom Date Range Trigger */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsCustomOpen(!isCustomOpen)}
          className={`inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-bold shadow-sm transition-colors ${
            currentFrom && currentTo
              ? "border-blue-600 bg-blue-50 text-blue-700 font-extrabold"
              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          <Clock className="h-3.5 w-3.5 text-slate-400" />
          <span>
            {currentFrom && currentTo ? `${currentFrom} – ${currentTo}` : "ระบุช่วงวันที่"}
          </span>
          <ChevronDown className="h-3 w-3 text-slate-400" />
        </button>

        {/* Custom Range Popover */}
        {isCustomOpen && (
          <form
            onSubmit={handleCustomSubmit}
            className="absolute right-0 top-11 z-50 w-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl animate-fadeIn"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-bold text-slate-800">ระบุช่วงวันที่เอง</span>
              <button
                type="button"
                onClick={() => setIsCustomOpen(false)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="mt-3 space-y-2 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">จากวันที่:</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 p-1.5 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">ถึงวันที่:</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 p-1.5 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsCustomOpen(false)
                  setFromDate("")
                  setToDate("")
                  updateQuery({ range: "30" })
                }}
                className="rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100"
              >
                ล้างค่า
              </button>
              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-bold text-white shadow-sm hover:bg-blue-700"
              >
                แสดงผล
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
