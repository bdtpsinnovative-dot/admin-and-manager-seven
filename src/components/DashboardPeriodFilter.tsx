"use client"

import React, { useState, useEffect, useRef, useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react"
import { type PeriodFilterState } from "../lib/dashboardPeriod"

export type { PeriodFilterState }

interface DashboardPeriodFilterProps {
  currentPeriod: PeriodFilterState
}

// ฟังก์ชันแปลง Date เป็น YYYY-MM-DD
const toDateStr = (d: Date): string => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

const thaiMonths = [
  { key: "01", full: "มกราคม" },
  { key: "02", full: "กุมภาพันธ์" },
  { key: "03", full: "มีนาคม" },
  { key: "04", full: "เมษายน" },
  { key: "05", full: "พฤษภาคม" },
  { key: "06", full: "มิถุนายน" },
  { key: "07", full: "กรกฎาคม" },
  { key: "08", full: "สิงหาคม" },
  { key: "09", full: "กันยายน" },
  { key: "10", full: "ตุลาคม" },
  { key: "11", full: "พฤศจิกายน" },
  { key: "12", full: "ธันวาคม" },
]

export default function DashboardPeriodFilter({ currentPeriod }: DashboardPeriodFilterProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const [isOpen, setIsOpen] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)

  const today = new Date()
  const currentYear = today.getFullYear()
  const todayStr = toDateStr(today)

  // แท็บ 3 ระดับ: "daily" (รายวัน) | "monthly" (รายเดือน) | "yearly" (รายปี)
  const [activeTab, setActiveTab] = useState<"daily" | "monthly" | "yearly">(
    currentPeriod.type === "yearly" ? "yearly" : currentPeriod.type === "monthly" ? "monthly" : "daily"
  )

  // ตัวเลือกในแท็บรายวัน: "single" (วันเดียว) | "range" (ช่วงวันที่)
  const [dailyMode, setDailyMode] = useState<"single" | "range">(
    currentPeriod.type === "custom" ? "range" : "single"
  )
  const [singleDate, setSingleDate] = useState<string>(
    currentPeriod.type === "daily" && currentPeriod.date ? currentPeriod.date : todayStr
  )
  const [startDate, setStartDate] = useState<string>(
    currentPeriod.type === "custom" && currentPeriod.startDate ? currentPeriod.startDate : todayStr
  )
  const [endDate, setEndDate] = useState<string>(
    currentPeriod.type === "custom" && currentPeriod.endDate ? currentPeriod.endDate : todayStr
  )

  // ตัวเลือกในแท็บรายเดือน
  const initialMonthParts = (
    currentPeriod.month || `${currentYear}-${String(today.getMonth() + 1).padStart(2, "0")}`
  ).split("-")
  const [monthYear, setMonthYear] = useState<number>(Number(initialMonthParts[0]) || currentYear)
  const [monthKey, setMonthKey] = useState<string>(
    initialMonthParts[1] || String(today.getMonth() + 1).padStart(2, "0")
  )

  // ตัวเลือกในแท็บรายปี
  const [selectedYear, setSelectedYear] = useState<number>(
    Number(currentPeriod.year) || currentYear
  )

  // ซิงค์ค่าเมื่อ currentPeriod เปลี่ยน
  useEffect(() => {
    if (currentPeriod.type === "yearly") {
      setActiveTab("yearly")
      if (currentPeriod.year) setSelectedYear(Number(currentPeriod.year))
    } else if (currentPeriod.type === "monthly") {
      setActiveTab("monthly")
      if (currentPeriod.month) {
        const [y, m] = currentPeriod.month.split("-")
        if (y) setMonthYear(Number(y))
        if (m) setMonthKey(m)
      }
    } else {
      setActiveTab("daily")
      if (currentPeriod.type === "custom") {
        setDailyMode("range")
        if (currentPeriod.startDate) setStartDate(currentPeriod.startDate)
        if (currentPeriod.endDate) setEndDate(currentPeriod.endDate)
      } else {
        setDailyMode("single")
        if (currentPeriod.date) setSingleDate(currentPeriod.date)
      }
    }
  }, [currentPeriod])

  // ปิด popover เมื่อคลิกข้างนอก หรือกด Esc
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false)
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      document.addEventListener("keydown", handleKeyDown)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen])

  // ฟังก์ชันอัปเดต URL Params
  const applyFilter = (paramsToSet: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString())

    params.delete("period")
    params.delete("date")
    params.delete("startDate")
    params.delete("endDate")
    params.delete("month")
    params.delete("year")
    params.delete("preset")

    Object.entries(paramsToSet).forEach(([k, v]) => {
      if (v !== null && v !== undefined && v !== "") {
        params.set(k, v)
      }
    })

    const qs = params.toString()
    startTransition(() => {
      router.push(qs ? `${pathname}?${qs}` : pathname)
      setIsOpen(false)
    })
  }

  // นำตัวกรองไปใช้ (Apply)
  const handleApply = () => {
    if (activeTab === "daily") {
      if (dailyMode === "single") {
        applyFilter({ period: "daily", date: singleDate })
      } else {
        const s = startDate < endDate ? startDate : endDate
        const e = startDate < endDate ? endDate : startDate
        applyFilter({ period: "custom", startDate: s, endDate: e })
      }
    } else if (activeTab === "monthly") {
      applyFilter({ period: "monthly", month: `${monthYear}-${monthKey}` })
    } else if (activeTab === "yearly") {
      applyFilter({ period: "yearly", year: String(selectedYear) })
    }
  }

  // ล้างตัวกรองทั้งหมด (ดูทุกช่วงเวลา)
  const handleClearAll = () => {
    applyFilter({ month: "ALL" })
  }

  // รายการปีย้อนหลัง 6 ปี + ล่วงหน้า 1 ปี
  const availableYears = Array.from({ length: 7 }, (_, i) => currentYear + 1 - i)

  return (
    <div className="relative inline-block" ref={popoverRef}>
      {/* 🚀 ปุ่มตัวกรองช่วงเวลา: สไตล์มินิมอล คลีน พอดีและเข้าชุดกับ ทุกหมวดหมู่ */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isPending}
        className="flex items-center gap-2 min-w-44 h-[42px] rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 outline-none hover:bg-slate-50 hover:border-slate-300 shadow-sm transition-colors disabled:cursor-wait disabled:opacity-60"
      >
        <CalendarIcon className="w-4 h-4 text-slate-500 shrink-0" />
        <span className="truncate">{currentPeriod.label}</span>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 ml-auto shrink-0 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* 🌟 หน้าต่างป็อปอัปตัวเลือกช่วงเวลาแบบคลีน สบายตา */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 z-50 w-80 rounded-2xl border border-slate-200 bg-white shadow-xl p-4 animate-in fade-in zoom-in-95 duration-100">
          
          {/* แท็บสลับ 3 ระดับ: รายวัน / รายเดือน / รายปี */}
          <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-xl mb-4 text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab("daily")}
              className={`py-1.5 rounded-lg transition-all ${
                activeTab === "daily"
                  ? "bg-white text-blue-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              รายวัน
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("monthly")}
              className={`py-1.5 rounded-lg transition-all ${
                activeTab === "monthly"
                  ? "bg-white text-blue-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              รายเดือน
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("yearly")}
              className={`py-1.5 rounded-lg transition-all ${
                activeTab === "yearly"
                  ? "bg-white text-blue-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              รายปี
            </button>
          </div>

          {/* ========================================================= */}
          {/* 1. รายวัน: วันเดียว หรือ ช่วงวันที่ */}
          {/* ========================================================= */}
          {activeTab === "daily" && (
            <div className="space-y-3">
              {/* สลับ วันเดียว / กำหนดช่วงวันที่ ด้วย Segmented Button เรียบหรู */}
              <div className="flex rounded-lg bg-slate-100 p-0.5 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setDailyMode("single")}
                  className={`flex-1 py-1 rounded-md transition-all ${
                    dailyMode === "single"
                      ? "bg-white text-blue-700 font-bold shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  วันเดียว
                </button>
                <button
                  type="button"
                  onClick={() => setDailyMode("range")}
                  className={`flex-1 py-1 rounded-md transition-all ${
                    dailyMode === "range"
                      ? "bg-white text-blue-700 font-bold shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  กำหนดช่วงวัน
                </button>
              </div>

              {dailyMode === "single" ? (
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 block mb-1">เลือกวันที่</span>
                  <input
                    type="date"
                    value={singleDate}
                    onChange={(e) => setSingleDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 block mb-1">จากวันที่</span>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 block mb-1">ถึงวันที่</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* 2. รายเดือน: เลือกเดือน และปี */}
          {/* ========================================================= */}
          {activeTab === "monthly" && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[11px] font-semibold text-slate-400 block mb-1">เลือกเดือน</span>
                <select
                  value={monthKey}
                  onChange={(e) => setMonthKey(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
                >
                  {thaiMonths.map((m) => (
                    <option key={m.key} value={m.key}>
                      {m.full}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-slate-400 block mb-1">เลือกปี พ.ศ.</span>
                <select
                  value={monthYear}
                  onChange={(e) => setMonthYear(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
                >
                  {availableYears.map((y) => (
                    <option key={y} value={y}>
                      พ.ศ. {y + 543}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 3. รายปี: เลือกปี พ.ศ. */}
          {/* ========================================================= */}
          {activeTab === "yearly" && (
            <div>
              <span className="text-[11px] font-semibold text-slate-400 block mb-1">เลือกปี พ.ศ.</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
              >
                {availableYears.map((y) => (
                  <option key={y} value={y}>
                    ปี พ.ศ. {y + 543} ({y})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Footer ด้านล่าง: ล้างตัวกรอง / ยกเลิก / ตกลง */}
          <div className="flex items-center justify-between pt-3 mt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={handleClearAll}
              className="text-xs font-semibold text-slate-400 hover:text-slate-700 transition-colors"
            >
              ดูทั้งหมด
            </button>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleApply}
                disabled={isPending}
                className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
              >
                {isPending ? "กำลังกรอง..." : "ตกลง"}
              </button>
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
