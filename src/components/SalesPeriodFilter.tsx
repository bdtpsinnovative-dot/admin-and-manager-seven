"use client"

import React, { useState, useEffect, useRef } from "react"
import { Calendar as CalendarIcon, ChevronDown, ChevronLeft, ChevronRight, X, Check } from "lucide-react"
import {
  type SalesFilters,
  type DateFilterConfig,
  formatThaiMonth,
  formatThaiDateShort,
  getCurrentThaiMonthString,
  getTodayThaiString,
  prevMonth,
  nextMonth,
  prevDay,
  nextDay,
} from "./SalesTableFilters"

const THAI_MONTHS = [
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

export default function SalesPeriodFilter({
  filters,
  onChange,
}: {
  filters: SalesFilters
  onChange: (updater: (prev: SalesFilters) => SalesFilters) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)

  const activeField = filters.activeDateField
  const activeConfig = activeField === "completedAt" ? filters.completedDate : filters.createdDate

  // State ภายใน Popover สำหรับแก้ไขก่อนกดยืนยัน
  const [selectedField, setSelectedField] = useState<"completedAt" | "createdAt">(activeField)
  const [tempMode, setTempMode] = useState<DateFilterConfig["mode"]>(activeConfig.mode)
  const [tempMonth, setTempMonth] = useState<string>(activeConfig.month || getCurrentThaiMonthString())
  const [tempDay, setTempDay] = useState<string>(activeConfig.day || getTodayThaiString())
  const [tempStartDate, setTempStartDate] = useState<string>(activeConfig.startDate || "")
  const [tempEndDate, setTempEndDate] = useState<string>(activeConfig.endDate || "")

  // Sync state เมื่อเปิด Popover
  useEffect(() => {
    if (isOpen) {
      setSelectedField(filters.activeDateField)
      const cur = filters.activeDateField === "completedAt" ? filters.completedDate : filters.createdDate
      setTempMode(cur.mode)
      setTempMonth(cur.month || getCurrentThaiMonthString())
      setTempDay(cur.day || getTodayThaiString())
      setTempStartDate(cur.startDate || "")
      setTempEndDate(cur.endDate || "")
    }
  }, [isOpen, filters])

  // คลิกข้างนอกเพื่อปิด
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isOpen])

  // ข้อความแสดงบนปุ่ม
  const buttonLabel = () => {
    const fieldPrefix = activeField === "completedAt" ? "วันขายจริง" : "วันเปิดบิล"
    switch (activeConfig.mode) {
      case "ALL":
        return `ทุกช่วงเวลา (${fieldPrefix})`
      case "MONTH":
        return `${formatThaiMonth(activeConfig.month)} (${fieldPrefix})`
      case "DAY":
        return `${formatThaiDateShort(activeConfig.day)} (${fieldPrefix})`
      case "TODAY":
        return `วันนี้ (${fieldPrefix})`
      case "YESTERDAY":
        return `เมื่อวาน (${fieldPrefix})`
      case "LAST_7_DAYS":
        return `7 วันล่าสุด (${fieldPrefix})`
      case "LAST_MONTH":
        return `เดือนก่อน (${fieldPrefix})`
      case "RANGE":
        if (activeConfig.startDate && activeConfig.endDate) {
          return `${formatThaiDateShort(activeConfig.startDate)} - ${formatThaiDateShort(activeConfig.endDate)}`
        }
        return `ช่วงวันที่ (${fieldPrefix})`
      default:
        return `ทุกช่วงเวลา (${fieldPrefix})`
    }
  }

  // กดใช้งานตัวกรอง
  const handleApply = (overridePatch?: Partial<DateFilterConfig>, overrideField?: "completedAt" | "createdAt") => {
    const targetField = overrideField || selectedField
    const configToSave: DateFilterConfig = {
      mode: overridePatch?.mode ?? tempMode,
      month: overridePatch?.month ?? tempMonth,
      day: overridePatch?.day ?? tempDay,
      startDate: overridePatch?.startDate ?? tempStartDate,
      endDate: overridePatch?.endDate ?? tempEndDate,
    }

    onChange((prev) => {
      // 🌟 สำคัญ: เมื่อเลือก activeDateField ใด ให้เคลียร์อีกฟิลด์เป็น 'ALL'
      // เพื่อป้องกันไม่ให้เกิด bug กรองชนกัน 2 วันที่ซ้ำซ้อน
      if (targetField === "completedAt") {
        return {
          ...prev,
          activeDateField: "completedAt",
          completedDate: configToSave,
          createdDate: {
            ...prev.createdDate,
            mode: "ALL",
          },
        }
      } else {
        return {
          ...prev,
          activeDateField: "createdAt",
          createdDate: configToSave,
          completedDate: {
            ...prev.completedDate,
            mode: "ALL",
          },
        }
      }
    })
    setIsOpen(false)
  }

  // เลือกพรีเซ็ตด่วน (กดปุ๊บ ใช้ปั๊บ)
  const handleQuickPreset = (mode: DateFilterConfig["mode"]) => {
    let patch: Partial<DateFilterConfig> = { mode }
    if (mode === "MONTH") {
      patch.month = getCurrentThaiMonthString()
    } else if (mode === "DAY" || mode === "TODAY") {
      patch.mode = "TODAY"
      patch.day = getTodayThaiString()
    } else if (mode === "YESTERDAY") {
      patch.day = prevDay(getTodayThaiString())
    }
    handleApply(patch)
  }

  return (
    <div className="relative inline-block" ref={popoverRef}>
      {/* 🔘 ปุ่มกดเปิดตัวกรองช่วงเวลา (หน้าตาแบบ Dashboard) */}
      <button
        type="button"
        onClick={() => setIsOpen((p) => !p)}
        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 outline-none hover:border-slate-300 shadow-xs cursor-pointer transition-colors"
      >
        <CalendarIcon className="h-4 w-4 text-blue-600 shrink-0" />
        <span className="truncate max-w-[200px]">{buttonLabel()}</span>
        <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
      </button>

      {/* 📋 Popover Window */}
      {isOpen && (
        <div className="absolute left-0 mt-2 z-50 w-80 sm:w-96 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl animate-in fade-in zoom-in-95 duration-100">
          
          {/* 1. สลับฟิลด์วันที่: วันขายจริง (ปิดบิล) vs วันที่เปิดบิล */}
          <div className="mb-3">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
              📌 กรองตามวันที่
            </span>
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setSelectedField("completedAt")}
                className={`py-1.5 px-2 rounded-lg transition-all text-center flex items-center justify-center gap-1 ${
                  selectedField === "completedAt"
                    ? "bg-white text-emerald-700 shadow-xs font-black"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {selectedField === "completedAt" && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                <span>วันขายจริง (ปิดบิล)</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedField("createdAt")}
                className={`py-1.5 px-2 rounded-lg transition-all text-center flex items-center justify-center gap-1 ${
                  selectedField === "createdAt"
                    ? "bg-white text-blue-700 shadow-xs font-black"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {selectedField === "createdAt" && <Check className="w-3.5 h-3.5 text-blue-600" />}
                <span>วันที่เปิดบิล</span>
              </button>
            </div>
          </div>

          {/* 2. พรีเซ็ตด่วน (กดปุ๊บ ปรับทันที) */}
          <div className="mb-3">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
              ⚡ พรีเซ็ตด่วน
            </span>
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => handleQuickPreset("MONTH")}
                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors"
              >
                เดือนนี้
              </button>
              <button
                type="button"
                onClick={() => handleQuickPreset("TODAY")}
                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors"
              >
                วันนี้
              </button>
              <button
                type="button"
                onClick={() => handleQuickPreset("YESTERDAY")}
                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors"
              >
                เมื่อวาน
              </button>
              <button
                type="button"
                onClick={() => handleQuickPreset("LAST_7_DAYS")}
                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors"
              >
                7 วัน
              </button>
              <button
                type="button"
                onClick={() => handleQuickPreset("LAST_MONTH")}
                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors"
              >
                เดือนก่อน
              </button>
              <button
                type="button"
                onClick={() => handleQuickPreset("ALL")}
                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
              >
                ทั้งหมด
              </button>
            </div>
          </div>

          {/* 3. แท็บเลือกรูปแบบ (รายเดือน / รายวัน / ช่วงวันที่) */}
          <div className="border-t border-slate-100 pt-3 space-y-3">
            <div className="flex rounded-lg bg-slate-100 p-0.5 text-xs font-bold">
              <button
                type="button"
                onClick={() => setTempMode("MONTH")}
                className={`flex-1 py-1 rounded-md transition-all text-center ${
                  tempMode === "MONTH"
                    ? "bg-white text-blue-700 shadow-xs font-black"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                รายเดือน
              </button>
              <button
                type="button"
                onClick={() => setTempMode("DAY")}
                className={`flex-1 py-1 rounded-md transition-all text-center ${
                  tempMode === "DAY"
                    ? "bg-white text-blue-700 shadow-xs font-black"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                รายวัน
              </button>
              <button
                type="button"
                onClick={() => setTempMode("RANGE")}
                className={`flex-1 py-1 rounded-md transition-all text-center ${
                  tempMode === "RANGE"
                    ? "bg-white text-blue-700 shadow-xs font-black"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                ช่วงวันที่
              </button>
            </div>

            {/* เนื้อหาแท็บรายเดือน */}
            {tempMode === "MONTH" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-1.5">
                  <button
                    type="button"
                    onClick={() => setTempMonth((m) => prevMonth(m))}
                    className="p-1 rounded-lg hover:bg-slate-200 text-slate-700"
                    title="เดือนก่อนหน้า"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-black text-slate-800">
                    {formatThaiMonth(tempMonth)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setTempMonth((m) => nextMonth(m))}
                    className="p-1 rounded-lg hover:bg-slate-200 text-slate-700"
                    title="เดือนถัดไป"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-1 pt-1">
                  {THAI_MONTHS.map((m) => {
                    const year = tempMonth.split("-")[0] || String(new Date().getFullYear())
                    const isSelected = tempMonth === `${year}-${m.key}`
                    return (
                      <button
                        key={m.key}
                        type="button"
                        onClick={() => setTempMonth(`${year}-${m.key}`)}
                        className={`py-1.5 text-[11px] font-bold rounded-lg transition-colors ${
                          isSelected
                            ? "bg-blue-600 text-white shadow-xs"
                            : "bg-slate-50 hover:bg-slate-100 text-slate-700"
                        }`}
                      >
                        {m.full.slice(0, 4)}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* เนื้อหาแท็บรายวัน */}
            {tempMode === "DAY" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-1.5">
                  <button
                    type="button"
                    onClick={() => setTempDay((d) => prevDay(d))}
                    className="p-1 rounded-lg hover:bg-slate-200 text-slate-700"
                    title="วันก่อนหน้า"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-black text-slate-800">
                    {formatThaiDateShort(tempDay)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setTempDay((d) => nextDay(d))}
                    className="p-1 rounded-lg hover:bg-slate-200 text-slate-700"
                    title="วันถัดไป"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <input
                  type="date"
                  value={tempDay}
                  onChange={(e) => setTempDay(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>
            )}

            {/* เนื้อหาแท็บช่วงวันที่ */}
            {tempMode === "RANGE" && (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 block mb-1">จากวันที่</span>
                    <input
                      type="date"
                      value={tempStartDate}
                      onChange={(e) => setTempStartDate(e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 block mb-1">ถึงวันที่</span>
                    <input
                      type="date"
                      value={tempEndDate}
                      onChange={(e) => setTempEndDate(e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 4. Footer ตกลง / ยกเลิก / ดูทั้งหมด */}
          <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => handleQuickPreset("ALL")}
              className="text-xs font-bold text-slate-400 hover:text-slate-700 transition-colors"
            >
              ดูทั้งหมด
            </button>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => handleApply()}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-xs transition-colors"
              >
                ตกลง
              </button>
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
