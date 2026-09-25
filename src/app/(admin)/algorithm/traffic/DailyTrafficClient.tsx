"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import {
  ArrowLeft,
  Calendar,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock,
  Eye,
  Globe2,
  Navigation,
  Package,
  Smartphone,
  TrendingUp,
} from "lucide-react"
import type {
  DailyTrafficAnalytics,
  DayAnalytics,
} from "../../../../actions/daily-traffic"
import SourceBadge from "../SourceBadge"
import TechnologyBadge from "../TechnologyBadge"

function number(value: number) {
  return new Intl.NumberFormat("th-TH").format(value)
}

export default function DailyTrafficClient({
  data,
  initialDate,
  initialType,
}: {
  data: DailyTrafficAnalytics
  initialDate?: string
  initialType?: "sources" | "devices" | "browsers"
}) {
  const availableDays = data.days

  const [activeDimension, setActiveDimension] = useState<"all" | "sources" | "devices" | "browsers">(
    initialType || "all"
  )
  const [selectedDayKey, setSelectedDayKey] = useState<string>(
    initialDate || availableDays[0]?.dateKey || ""
  )

  const matrixContainerRef = useRef<HTMLDivElement>(null)

  const selectedDay = useMemo(() => {
    return availableDays.find((d) => d.dateKey === selectedDayKey) || availableDays[0] || null
  }, [availableDays, selectedDayKey])

  const maxHourlyViews = useMemo(() => {
    if (!selectedDay) return 1
    return Math.max(...selectedDay.hourly.map((h) => h.views), 1)
  }, [selectedDay])

  // Pre-calculate grand totals across all days for each dimension
  const sourceTotals = useMemo(() => {
    const map = new Map<string, number>()
    availableDays.forEach((d) => {
      d.sources.forEach((s) => {
        map.set(s.name, (map.get(s.name) || 0) + s.count)
      })
    })
    return map
  }, [availableDays])

  const deviceTotals = useMemo(() => {
    const map = new Map<string, number>()
    availableDays.forEach((d) => {
      d.devices.forEach((dev) => {
        map.set(dev.name, (map.get(dev.name) || 0) + dev.count)
      })
    })
    return map
  }, [availableDays])

  const browserTotals = useMemo(() => {
    const map = new Map<string, number>()
    availableDays.forEach((d) => {
      d.browsers.forEach((b) => {
        map.set(b.name, (map.get(b.name) || 0) + b.count)
      })
    })
    return map
  }, [availableDays])

  // Extract all unique platform names across days for the matrix table,
  // excluding any items where the total views is 0 or dummy artifacts,
  // sorted by highest traffic volume first.
  const allSourceNames = useMemo(() => {
    const names = new Set<string>()
    availableDays.forEach((d) => d.sources.forEach((s) => names.add(s.name)))
    return Array.from(names)
      .filter((name) => {
        if (!name || name === "--sanitized--" || name.toLowerCase().includes("sanitized")) return false
        const total = sourceTotals.get(name) || 0
        return total > 0
      })
      .sort((a, b) => (sourceTotals.get(b) || 0) - (sourceTotals.get(a) || 0))
  }, [availableDays, sourceTotals])

  const allDeviceNames = useMemo(() => {
    const names = new Set<string>()
    availableDays.forEach((d) => d.devices.forEach((dev) => names.add(dev.name)))
    return Array.from(names)
      .filter((name) => (deviceTotals.get(name) || 0) > 0)
      .sort((a, b) => (deviceTotals.get(b) || 0) - (deviceTotals.get(a) || 0))
  }, [availableDays, deviceTotals])

  const allBrowserNames = useMemo(() => {
    const names = new Set<string>()
    availableDays.forEach((d) => d.browsers.forEach((b) => names.add(b.name)))
    return Array.from(names)
      .filter((name) => (browserTotals.get(name) || 0) > 0)
      .sort((a, b) => (browserTotals.get(b) || 0) - (browserTotals.get(a) || 0))
  }, [availableDays, browserTotals])

  // Mouse Drag-to-Scroll & Mouse Wheel state
  const isDraggingRef = useRef(false)
  const hasDraggedRef = useRef(false)
  const startXRef = useRef(0)
  const scrollLeftStartRef = useRef(0)
  const [isDragging, setIsDragging] = useState(false)
  const [wheelMode, setWheelMode] = useState<"horizontal" | "vertical">("horizontal")
  const wheelModeRef = useRef<"horizontal" | "vertical">(wheelMode)

  useEffect(() => {
    wheelModeRef.current = wheelMode
  }, [wheelMode])

  // Native non-passive wheel listener for smooth scroll left/right without browser warnings
  useEffect(() => {
    const container = matrixContainerRef.current
    if (!container) return

    const handleNativeWheel = (e: WheelEvent) => {
      if (wheelModeRef.current === "vertical") return
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return

      const isAtStart = container.scrollLeft <= 0
      const isAtEnd = Math.ceil(container.scrollLeft + container.clientWidth) >= container.scrollWidth - 1

      if ((e.deltaY > 0 && !isAtEnd) || (e.deltaY < 0 && !isAtStart)) {
        e.preventDefault()
        container.scrollLeft += e.deltaY
      }
    }

    container.addEventListener("wheel", handleNativeWheel, { passive: false })
    return () => {
      container.removeEventListener("wheel", handleNativeWheel)
    }
  }, [])

  // Ultra-responsive Window Drag Listeners with requestAnimationFrame (Zero Lag)
  useEffect(() => {
    let rAFId: number | null = null

    const handleWindowMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !matrixContainerRef.current) return

      const delta = e.pageX - startXRef.current
      if (Math.abs(delta) > 3) {
        hasDraggedRef.current = true
      }

      if (rAFId !== null) {
        cancelAnimationFrame(rAFId)
      }

      rAFId = requestAnimationFrame(() => {
        if (!matrixContainerRef.current) return
        matrixContainerRef.current.scrollLeft = scrollLeftStartRef.current - delta
      })
    }

    const handleWindowMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false
        setIsDragging(false)
        document.body.style.userSelect = ""
        document.body.style.cursor = ""
      }
      if (rAFId !== null) {
        cancelAnimationFrame(rAFId)
        rAFId = null
      }
      // Brief timeout to suppress accidental clicks on cell headers during drag release
      setTimeout(() => {
        hasDraggedRef.current = false
      }, 60)
    }

    window.addEventListener("mousemove", handleWindowMouseMove)
    window.addEventListener("mouseup", handleWindowMouseUp)

    return () => {
      window.removeEventListener("mousemove", handleWindowMouseMove)
      window.removeEventListener("mouseup", handleWindowMouseUp)
      if (rAFId !== null) {
        cancelAnimationFrame(rAFId)
      }
    }
  }, [])

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only primary left click
    if (e.button !== 0) return
    const target = e.target as HTMLElement
    // Ignore interactive elements
    if (target.closest("button") || target.closest("a")) return

    const container = matrixContainerRef.current
    if (!container) return

    isDraggingRef.current = true
    hasDraggedRef.current = false
    setIsDragging(true)
    startXRef.current = e.pageX
    scrollLeftStartRef.current = container.scrollLeft
    document.body.style.userSelect = "none"
  }

  const scrollLeftMatrix = () => {
    if (matrixContainerRef.current) {
      matrixContainerRef.current.scrollBy({ left: -400, behavior: "smooth" })
    }
  }

  const scrollRightMatrix = () => {
    if (matrixContainerRef.current) {
      matrixContainerRef.current.scrollBy({ left: 400, behavior: "smooth" })
    }
  }

  const scrollToFarLeft = () => {
    if (matrixContainerRef.current) {
      matrixContainerRef.current.scrollTo({ left: 0, behavior: "smooth" })
    }
  }

  const scrollToFarRight = () => {
    if (matrixContainerRef.current) {
      matrixContainerRef.current.scrollTo({ left: matrixContainerRef.current.scrollWidth, behavior: "smooth" })
    }
  }

  const rangeQuery = (range: number) => `/algorithm/traffic?range=${range}${activeDimension !== "all" ? `&type=${activeDimension}` : ""}`
  const rangeLinks = [
    { days: 1, label: "24 ชม." },
    { days: 7, label: "7 วัน" },
    { days: 30, label: "30 วัน" },
  ]

  return (
    <div className="w-full space-y-6">
      {/* Top Header & Navigation */}
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
          <nav className="flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
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
              Audience Analytics
            </Link>
            <Link
              href="/algorithm/products"
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            >
              สินค้าทั้งหมด
            </Link>
          </nav>
        </div>

        {/* Date Range Selector */}
        <div className="flex items-center gap-1 self-start sm:self-auto rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          {rangeLinks.map((range) => (
            <Link
              key={range.days}
              href={rangeQuery(range.days)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                data.rangeDays === range.days
                  ? "bg-blue-600 text-white shadow-sm font-bold"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              {range.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Hero Overview */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div>
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-xs font-semibold text-blue-700">
              <Calendar className="h-3.5 w-3.5 text-blue-600" />
              รายงานสถิติแจกแจงต่อวันในรอบ {data.rangeDays} วัน ({data.rangeDays === 30 ? "1 เดือนล่าสุด" : `${data.rangeDays} วันล่าสุด`})
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              สถิติรายวันแนวนอน (Horizontal Daily Traffic)
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              แสดงข้อมูลของแต่ละวันเรียงตามแนวนอน เลื่อนซ้าย-ขวาได้ ทั้งช่องทางเข้าเว็บ อุปกรณ์ และ Browser
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5 text-right">
              <p className="text-[11px] font-medium text-slate-400">เข้าชมรวม</p>
              <p className="mt-0.5 font-mono text-xl font-black text-slate-900 tabular-nums">
                {number(data.totalViews)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5 text-right">
              <p className="text-[11px] font-medium text-slate-400">ดูไม่ซ้ำ</p>
              <p className="mt-0.5 font-mono text-xl font-black text-blue-600 tabular-nums">
                {number(data.totalUniqueViews)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5 text-right">
              <p className="text-[11px] font-medium text-slate-400">เฉลี่ยต่อวัน</p>
              <p className="mt-0.5 font-mono text-xl font-black text-emerald-600 tabular-nums">
                {number(data.averageViewsPerDay)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5 text-right">
              <p className="text-[11px] font-medium text-slate-400">วันพีคสุด</p>
              <p className="mt-0.5 font-mono text-sm font-bold text-slate-800 truncate" title={data.peakDay?.date || "—"}>
                {data.peakDay ? `${number(data.peakDay.views)} ครั้ง` : "—"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {data.error && (
        <div className="flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm" role="alert">
          <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <div>
            <p className="text-sm font-bold text-red-800">เกิดข้อผิดพลาดในการโหลดข้อมูล</p>
            <p className="mt-1 text-xs text-red-600">{data.error}</p>
          </div>
        </div>
      )}

      {/* Control Bar: Filter Dimensions + Layout Mode + Horizontal Scroll Buttons */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        {/* Dimension Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveDimension("all")}
            className={`rounded-xl px-3 py-2 text-xs font-bold transition-all ${
              activeDimension === "all"
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            ครบทุกมิติ
          </button>
          <button
            type="button"
            onClick={() => setActiveDimension("sources")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all ${
              activeDimension === "sources"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <Navigation className="h-3.5 w-3.5" /> ช่องทางเข้าเว็บ
          </button>
          <button
            type="button"
            onClick={() => setActiveDimension("devices")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all ${
              activeDimension === "devices"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <Smartphone className="h-3.5 w-3.5" /> อุปกรณ์
          </button>
          <button
            type="button"
            onClick={() => setActiveDimension("browsers")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all ${
              activeDimension === "browsers"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <Globe2 className="h-3.5 w-3.5" /> เบราว์เซอร์
          </button>
        </div>

        {/* Horizontal Scroll Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Wheel Mode Toggle */}
          <button
            type="button"
            onClick={() => setWheelMode(wheelMode === "horizontal" ? "vertical" : "horizontal")}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all ${
              wheelMode === "horizontal"
                ? "border-blue-300 bg-blue-50 text-blue-700 shadow-xs hover:bg-blue-100"
                : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
            title="คลิกเพื่อสลับ: ให้ลูกกลิ้งเมาส์เลื่อนตารางซ้าย-ขวา หรือเลื่อนหน้าเว็บขึ้น-ลง"
          >
            <span>{wheelMode === "horizontal" ? "🖱️ ลูกกลิ้ง: เลื่อนตาราง ↔" : "🖱️ ลูกกลิ้ง: เลื่อนหน้าเว็บ ↕"}</span>
          </button>

          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={scrollToFarLeft}
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 active:scale-95 transition-all"
              title="กระโดดไปซ้ายสุด (วันล่าสุด)"
            >
              <span>⏮ ซ้ายสุด</span>
            </button>
            <div className="h-4 w-px bg-slate-200" />
            <button
              type="button"
              onClick={scrollLeftMatrix}
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 active:scale-95 transition-all"
              title="เลื่อนซ้าย"
            >
              <ChevronLeft className="h-4 w-4 text-blue-600" />
              <span>เลื่อนซ้าย</span>
            </button>
            <div className="h-4 w-px bg-slate-200" />
            <button
              type="button"
              onClick={scrollRightMatrix}
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 active:scale-95 transition-all"
              title="เลื่อนขวา"
            >
              <span>เลื่อนขวา</span>
              <ChevronRight className="h-4 w-4 text-blue-600" />
            </button>
            <div className="h-4 w-px bg-slate-200" />
            <button
              type="button"
              onClick={scrollToFarRight}
              className="inline-flex items-center gap-1 rounded-lg bg-blue-50 border border-blue-200 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 active:scale-95 transition-all"
              title="กระโดดไปขวาสุดเพื่อดูยอดรวม"
            >
              <span>ขวาสุด (ยอดรวม) ⏭</span>
            </button>
          </div>
        </div>
      </div>

      {/* HORIZONTAL TIMELINE MATRIX TABLE */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden space-y-3 p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-blue-600">เมทริกซ์แนวนอน</p>
              <h2 className="mt-0.5 text-lg font-bold text-slate-900 tracking-tight">
                ตารางเปรียบเทียบสถิติแนวนอน (Horizontal Timeline Matrix)
              </h2>
              <p className="text-xs text-slate-500">
                คอลัมน์แนวนอนคือวันที่ ({availableDays.length} วัน) · 🖱️ คลิกลากเมาส์เลื่อนได้ทันทีไม่หน่วง · 📊 ขวาสุดมียอดรวมรอบ {availableDays.length} วัน
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setWheelMode(wheelMode === "horizontal" ? "vertical" : "horizontal")}
                className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-bold transition-all ${
                  wheelMode === "horizontal"
                    ? "border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100"
                    : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                }`}
                title="คลิกเพื่อสลับ: ให้ลูกกลิ้งเมาส์เลื่อนตารางซ้าย-ขวา หรือเลื่อนหน้าเว็บขึ้น-ลง"
              >
                <span>{wheelMode === "horizontal" ? "🖱️ ลูกกลิ้ง: ตาราง ↔" : "🖱️ ลูกกลิ้ง: หน้าเว็บ ↕"}</span>
              </button>
              <button
                type="button"
                onClick={scrollToFarLeft}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100"
                title="ซ้ายสุด"
              >
                ⏮ ซ้ายสุด
              </button>
              <button
                type="button"
                onClick={scrollLeftMatrix}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> ซ้าย
              </button>
              <button
                type="button"
                onClick={scrollRightMatrix}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100"
              >
                ขวา <ChevronRight className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={scrollToFarRight}
                className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 hover:bg-blue-100"
                title="ขวาสุด มียอดรวม"
              >
                ขวาสุด (ยอดรวม) ⏭
              </button>
            </div>
          </div>

          <div
            ref={matrixContainerRef}
            onMouseDown={handleMouseDown}
            className={`overflow-x-auto rounded-xl border border-slate-200 ${
              isDragging ? "cursor-grabbing select-none" : "cursor-grab"
            }`}
          >
            <table className="min-w-full border-separate border-spacing-0 text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                <tr>
                  {/* Sticky Dimension Header - Uniform 250px width */}
                  <th className="sticky left-0 z-20 w-[250px] min-w-[250px] max-w-[250px] bg-slate-100 px-4 py-3 border-r border-b border-slate-200 shadow-[3px_0_8px_-2px_rgba(0,0,0,0.08)]">
                    มิติ / วันที่
                  </th>
                  {/* Horizontal Date Columns */}
                  {availableDays.map((day) => {
                    const isSelected = day.dateKey === selectedDayKey
                    return (
                      <th
                        key={day.dateKey}
                        onClick={() => {
                          if (!hasDraggedRef.current) {
                            setSelectedDayKey(day.dateKey)
                          }
                        }}
                        className={`w-[130px] min-w-[130px] max-w-[130px] px-3 py-3 text-center whitespace-nowrap border-r border-b cursor-pointer transition-colors ${
                          isSelected
                            ? "border-blue-300 bg-blue-600 text-white shadow-xs"
                            : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                        }`}
                        title={`คลิกเพื่อดูรายละเอียดเจาะลึก 24 ชม. ของ ${day.shortDate}`}
                      >
                        <span className="block font-bold">{day.shortDate}</span>
                        <span className={`block font-mono text-[9px] ${isSelected ? "text-blue-100" : "text-slate-400"}`}>
                          {day.dateKey.slice(5)}
                        </span>
                        {isSelected && (
                          <span className="mt-0.5 inline-block rounded-full bg-white/25 px-1.5 py-0.2 text-[8px] font-bold">
                            เลือกอยู่
                          </span>
                        )}
                      </th>
                    )
                  })}
                  {/* FAR RIGHT TOTAL COLUMN (ขวาสุด มียอดรวม) */}
                  <th className="w-[150px] min-w-[150px] max-w-[150px] px-3 py-3 text-center whitespace-nowrap border-l-2 border-b border-blue-300 bg-blue-100/90 text-blue-950 font-black">
                    <span className="block text-xs font-black">📊 ยอดรวม</span>
                    <span className="block font-mono text-[9px] text-blue-700">
                      ({availableDays.length} วัน)
                    </span>
                  </th>
                </tr>
              </thead>

              <tbody className="font-mono">
                {/* 1. Traffic Sources Rows */}
                {(activeDimension === "all" || activeDimension === "sources") && (
                  <>
                    <tr className="bg-slate-100/70 font-sans font-bold text-[11px] text-slate-700">
                      <td className="sticky left-0 z-10 w-[250px] min-w-[250px] max-w-[250px] bg-slate-100 px-4 py-2 uppercase tracking-wider border-r border-b border-slate-200 shadow-[3px_0_8px_-2px_rgba(0,0,0,0.08)]">
                        🧭 ช่องทางเข้าเว็บ ({allSourceNames.length})
                      </td>
                      <td colSpan={availableDays.length} className="bg-slate-50 px-4 py-2 text-[11px] font-semibold text-slate-500 border-b border-slate-200">
                        สถิติแยกตามช่องทางเข้าเว็บตลอด {availableDays.length} วัน
                      </td>
                      <td className="w-[150px] min-w-[150px] max-w-[150px] px-3 py-2 text-center border-l-2 border-b border-slate-200 bg-slate-100 font-sans text-[11px] font-bold text-slate-700">
                        รวมทุกช่องทาง
                      </td>
                    </tr>
                    {allSourceNames.map((sourceName) => (
                      <tr key={sourceName} className="hover:bg-slate-50 transition-colors">
                        <td className="sticky left-0 z-10 w-[250px] min-w-[250px] max-w-[250px] bg-white px-4 py-2.5 font-sans text-xs text-slate-800 border-r border-b border-slate-200 shadow-[3px_0_8px_-2px_rgba(0,0,0,0.08)]">
                          <SourceBadge value={sourceName} />
                        </td>
                        {availableDays.map((day) => {
                          const isSelected = day.dateKey === selectedDayKey
                          const item = day.sources.find((s) => s.name === sourceName)
                          return (
                            <td
                              key={day.dateKey}
                              onClick={() => setSelectedDayKey(day.dateKey)}
                              className={`w-[130px] min-w-[130px] max-w-[130px] px-3 py-2.5 text-center border-r border-b cursor-pointer transition-colors ${
                                isSelected
                                  ? "bg-blue-50/60 border-blue-100"
                                  : "border-slate-100 hover:bg-slate-50"
                              }`}
                            >
                              {item ? (
                                <span className="font-bold text-slate-900">
                                  {number(item.count)}
                                  <span className="text-[10px] text-slate-400 font-normal ml-0.5">({item.share}%)</span>
                                </span>
                              ) : (
                                <span className="text-slate-300 font-normal">-</span>
                              )}
                            </td>
                          )
                        })}
                        {/* Source Item Far Right Total */}
                        <td className="w-[150px] min-w-[150px] max-w-[150px] px-3 py-2.5 text-center border-l-2 border-b border-slate-200 bg-slate-50 font-mono font-bold text-slate-900">
                          {number(sourceTotals.get(sourceName) || 0)}
                          <span className="ml-1 text-[10px] font-normal text-slate-500">
                            ({data.totalViews > 0 ? Math.round(((sourceTotals.get(sourceName) || 0) / data.totalViews) * 100) : 0}%)
                          </span>
                        </td>
                      </tr>
                    ))}
                  </>
                )}

                {/* 4. Devices Rows */}
                {(activeDimension === "all" || activeDimension === "devices") && (
                  <>
                    <tr className="bg-emerald-50/70 font-sans font-bold text-[11px] text-emerald-800">
                      <td className="sticky left-0 z-10 w-[250px] min-w-[250px] max-w-[250px] bg-emerald-50 px-4 py-2 uppercase tracking-wider border-r border-b border-emerald-200 shadow-[3px_0_8px_-2px_rgba(0,0,0,0.08)]">
                        📱 อุปกรณ์ ({allDeviceNames.length})
                      </td>
                      <td colSpan={availableDays.length} className="bg-emerald-50/30 px-4 py-2 text-[11px] font-semibold text-emerald-700 border-b border-emerald-100">
                        สถิติแยกตามหมวดหมู่อุปกรณ์ตลอด {availableDays.length} วัน
                      </td>
                      <td className="w-[150px] min-w-[150px] max-w-[150px] px-3 py-2 text-center border-l-2 border-b border-emerald-200 bg-emerald-100 font-sans text-[11px] font-bold text-emerald-800">
                        รวมทุกอุปกรณ์
                      </td>
                    </tr>
                    {allDeviceNames.map((deviceName) => (
                      <tr key={deviceName} className="hover:bg-slate-50 transition-colors">
                        <td className="sticky left-0 z-10 w-[250px] min-w-[250px] max-w-[250px] bg-white px-4 py-2.5 font-sans text-xs text-slate-800 border-r border-b border-slate-200 shadow-[3px_0_8px_-2px_rgba(0,0,0,0.08)]">
                          <TechnologyBadge kind="device" value={deviceName} />
                        </td>
                        {availableDays.map((day) => {
                          const isSelected = day.dateKey === selectedDayKey
                          const item = day.devices.find((d) => d.name === deviceName)
                          return (
                            <td
                              key={day.dateKey}
                              onClick={() => setSelectedDayKey(day.dateKey)}
                              className={`w-[130px] min-w-[130px] max-w-[130px] px-3 py-2.5 text-center border-r border-b cursor-pointer transition-colors ${
                                isSelected
                                  ? "bg-emerald-50/60 border-emerald-100"
                                  : "border-slate-100 hover:bg-slate-50"
                              }`}
                            >
                              {item ? (
                                <span className="font-bold text-emerald-800">
                                  {number(item.count)}
                                  <span className="text-[10px] text-emerald-600 font-normal ml-0.5">({item.share}%)</span>
                                </span>
                              ) : (
                                <span className="text-slate-300 font-normal">-</span>
                              )}
                            </td>
                          )
                        })}
                        {/* Device Item Far Right Total */}
                        <td className="w-[150px] min-w-[150px] max-w-[150px] px-3 py-2.5 text-center border-l-2 border-b border-emerald-100 bg-emerald-50/50 font-mono font-bold text-emerald-800">
                          {number(deviceTotals.get(deviceName) || 0)}
                          <span className="ml-1 text-[10px] font-normal text-emerald-600">
                            ({data.totalViews > 0 ? Math.round(((deviceTotals.get(deviceName) || 0) / data.totalViews) * 100) : 0}%)
                          </span>
                        </td>
                      </tr>
                    ))}
                  </>
                )}

                {/* 5. Browsers Rows */}
                {(activeDimension === "all" || activeDimension === "browsers") && (
                  <>
                    <tr className="bg-indigo-50/70 font-sans font-bold text-[11px] text-indigo-800">
                      <td className="sticky left-0 z-10 w-[250px] min-w-[250px] max-w-[250px] bg-indigo-50 px-4 py-2 uppercase tracking-wider border-r border-b border-indigo-200 shadow-[3px_0_8px_-2px_rgba(0,0,0,0.08)]">
                        🌐 เบราว์เซอร์ ({allBrowserNames.length})
                      </td>
                      <td colSpan={availableDays.length} className="bg-indigo-50/30 px-4 py-2 text-[11px] font-semibold text-indigo-700 border-b border-indigo-100">
                        สถิติแยกตามเว็บเบราว์เซอร์ตลอด {availableDays.length} วัน
                      </td>
                      <td className="w-[150px] min-w-[150px] max-w-[150px] px-3 py-2 text-center border-l-2 border-b border-indigo-200 bg-indigo-100 font-sans text-[11px] font-bold text-indigo-800">
                        รวมทุกเบราว์เซอร์
                      </td>
                    </tr>
                    {allBrowserNames.map((browserName) => (
                      <tr key={browserName} className="hover:bg-slate-50 transition-colors">
                        <td className="sticky left-0 z-10 w-[250px] min-w-[250px] max-w-[250px] bg-white px-4 py-2.5 font-sans text-xs text-slate-800 border-r border-b border-slate-200 shadow-[3px_0_8px_-2px_rgba(0,0,0,0.08)]">
                          <TechnologyBadge kind="browser" value={browserName} />
                        </td>
                        {availableDays.map((day) => {
                          const isSelected = day.dateKey === selectedDayKey
                          const item = day.browsers.find((b) => b.name === browserName)
                          return (
                            <td
                              key={day.dateKey}
                              onClick={() => setSelectedDayKey(day.dateKey)}
                              className={`w-[130px] min-w-[130px] max-w-[130px] px-3 py-2.5 text-center border-r border-b cursor-pointer transition-colors ${
                                isSelected
                                  ? "bg-indigo-50/60 border-indigo-100"
                                  : "border-slate-100 hover:bg-slate-50"
                              }`}
                            >
                              {item ? (
                                <span className="font-bold text-indigo-800">
                                  {number(item.count)}
                                  <span className="text-[10px] text-indigo-600 font-normal ml-0.5">({item.share}%)</span>
                                </span>
                              ) : (
                                <span className="text-slate-300 font-normal">-</span>
                              )}
                            </td>
                          )
                        })}
                        {/* Browser Item Far Right Total */}
                        <td className="w-[150px] min-w-[150px] max-w-[150px] px-3 py-2.5 text-center border-l-2 border-b border-indigo-100 bg-indigo-50/50 font-mono font-bold text-indigo-800">
                          {number(browserTotals.get(browserName) || 0)}
                          <span className="ml-1 text-[10px] font-normal text-indigo-600">
                            ({data.totalViews > 0 ? Math.round(((browserTotals.get(browserName) || 0) / data.totalViews) * 100) : 0}%)
                          </span>
                        </td>
                      </tr>
                    ))}
                  </>
                )}

                {/* BOTTOM SUMMARY: Unique Views */}
                <tr className="bg-blue-50/40 font-bold border-t-2 border-blue-200 hover:bg-blue-50/70 transition-colors">
                  <td className="sticky left-0 z-10 w-[250px] min-w-[250px] max-w-[250px] bg-blue-50 px-4 py-3 font-sans text-xs text-blue-900 border-r border-b border-blue-200 shadow-[3px_0_8px_-2px_rgba(0,0,0,0.08)]">
                    👥 ยอดดูไม่ซ้ำ (Unique Views)
                  </td>
                  {availableDays.map((day) => {
                    const isSelected = day.dateKey === selectedDayKey
                    return (
                      <td
                        key={day.dateKey}
                        onClick={() => {
                          if (!hasDraggedRef.current) setSelectedDayKey(day.dateKey)
                        }}
                        className={`w-[130px] min-w-[130px] max-w-[130px] px-3 py-3 text-center border-r border-b font-bold cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-blue-100 text-blue-950 border-blue-300 font-black"
                            : "text-blue-600 border-blue-100 hover:bg-blue-50/60"
                        }`}
                      >
                        {number(day.uniqueViews)}
                      </td>
                    )
                  })}
                  {/* Unique Views Far Right */}
                  <td className="w-[150px] min-w-[150px] max-w-[150px] px-3 py-3 text-center border-l-2 border-b border-blue-200 bg-blue-100 font-mono font-black text-blue-950 text-sm">
                    {number(data.totalUniqueViews)}
                    <span className="block text-[9px] font-sans font-normal text-blue-700">คน</span>
                  </td>
                </tr>

                {/* BOTTOM SUMMARY: Total Views (แถวสุดท้าย - Grand Total Row) */}
                <tr className="bg-slate-100 font-black border-t-2 border-b-2 border-slate-300 hover:bg-slate-200/60 transition-colors">
                  <td className="sticky left-0 z-10 w-[250px] min-w-[250px] max-w-[250px] bg-slate-200 px-4 py-3.5 font-sans text-xs text-slate-900 border-r border-b-2 border-slate-300 shadow-[3px_0_8px_-2px_rgba(0,0,0,0.12)]">
                    📊 ยอดดูรวม (Total Views)
                  </td>
                  {availableDays.map((day) => {
                    const isSelected = day.dateKey === selectedDayKey
                    return (
                      <td
                        key={day.dateKey}
                        onClick={() => {
                          if (!hasDraggedRef.current) setSelectedDayKey(day.dateKey)
                        }}
                        className={`w-[130px] min-w-[130px] max-w-[130px] px-3 py-3.5 text-center border-r border-b-2 font-black cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-blue-600 text-white border-blue-700 shadow-inner"
                            : "bg-slate-100 text-slate-900 border-slate-200 hover:bg-slate-200/50"
                        }`}
                      >
                        {number(day.totalViews)}
                      </td>
                    )
                  })}
                  {/* Total Views Far Right */}
                  <td className="w-[150px] min-w-[150px] max-w-[150px] px-3 py-3.5 text-center border-l-2 border-b-2 border-blue-400 bg-blue-600 text-white font-mono font-black text-sm shadow-inner">
                    {number(data.totalViews)}
                    <span className="block text-[9px] font-sans font-normal text-blue-100">ครั้ง</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

      {/* SELECTED DAY DEEP-DIVE INSPECTOR (กราฟ 24 ชม. และ Top 5 สินค้า) */}
      {selectedDay && (
        <section className="space-y-4">
          <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50/60 to-white p-5 md:p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-blue-600 text-white shadow-md">
                  <Calendar className="h-6 w-6" />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-blue-600">รายละเอียดเจาะลึกประจำวัน</p>
                  <h2 className="mt-0.5 text-xl font-extrabold text-slate-900 tracking-tight sm:text-2xl">
                    {selectedDay.dateLabel}
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    ยอดดูรวม <strong className="font-mono text-slate-900">{number(selectedDay.totalViews)}</strong> ครั้ง · ดูไม่ซ้ำ <strong className="font-mono text-blue-600">{number(selectedDay.uniqueViews)}</strong> ครั้ง
                  </p>
                </div>
              </div>

              {/* Day Selector Dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">เลือกดูวันอื่น:</span>
                <select
                  value={selectedDayKey}
                  onChange={(e) => setSelectedDayKey(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm outline-none focus:border-blue-500"
                >
                  {availableDays.map((d) => (
                    <option key={d.dateKey} value={d.dateKey}>
                      {d.dateLabel} ({number(d.totalViews)} ครั้ง)
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 2-Column: 24h Hourly Distribution & Top 5 Products */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {/* 24h Distribution */}
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-amber-50 text-amber-600">
                  <Clock className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">การเข้าชมรายชั่วโมงในวันนั้น (00:00 - 23:00)</h3>
                  <p className="text-[11px] text-slate-400">ช่วงเวลาที่มีคนเข้าชมมากที่สุดของวันที่เลือก</p>
                </div>
              </div>

              <div className="mt-4 flex items-end gap-1 overflow-x-auto pb-1 pt-4">
                {selectedDay.hourly.map((h) => {
                  const barH = Math.max((h.views / maxHourlyViews) * 100, h.views > 0 ? 12 : 4)
                  const isTop = h.views === maxHourlyViews && h.views > 0
                  return (
                    <div key={h.hour} className="group flex flex-1 min-w-[18px] flex-col items-center gap-1.5">
                      <span className="font-mono text-[9px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        {h.views}
                      </span>
                      <div className="flex h-24 w-full items-end justify-center rounded bg-slate-50 p-0.5">
                        <div
                          className={`w-full rounded-sm transition-all ${
                            isTop ? "bg-amber-500" : h.views > 0 ? "bg-blue-500" : "bg-slate-200"
                          }`}
                          style={{ height: `${barH}%` }}
                          title={`เวลา ${String(h.hour).padStart(2, "0")}:00 · เข้าชม ${h.views} ครั้ง`}
                        />
                      </div>
                      <span className="font-mono text-[9px] text-slate-400">
                        {h.hour % 3 === 0 ? `${h.hour}น` : ""}
                      </span>
                    </div>
                  )
                })}
              </div>
            </article>

            {/* Top Products */}
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-rose-50 text-rose-600">
                  <Package className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">สินค้าที่มียอดดูสูงสุดในวันที่เลือก</h3>
                  <p className="text-[11px] text-slate-400">Top 5 สินค้าที่ได้รับความสนใจมากที่สุด</p>
                </div>
              </div>

              <div className="mt-4 divide-y divide-slate-100">
                {selectedDay.topProducts.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">ไม่มีข้อมูลสินค้าในวันที่เลือก</div>
                ) : (
                  selectedDay.topProducts.map((p, idx) => (
                    <Link
                      key={p.id}
                      href={`/algorithm/products/${p.id}`}
                      className="group flex items-center justify-between gap-3 py-2.5 hover:bg-slate-50 rounded-lg px-2 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="font-mono text-xs font-bold text-slate-400 w-5">
                          {String(idx + 1).padStart(2, "0")}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-800 truncate group-hover:text-blue-600">
                            {p.name}
                          </p>
                          {p.sku && <p className="font-mono text-[10px] text-slate-400">{p.sku}</p>}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className="font-mono text-xs font-bold text-blue-600">
                          {number(p.views)}
                        </span>
                        <span className="ml-1 text-[10px] text-slate-400">ครั้ง</span>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </article>
          </div>
        </section>
      )}
    </div>
  )
}
