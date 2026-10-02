"use client"

import { useEffect, useState, useMemo } from "react"
import {
  Flame,
  Users,
  Clock,
  Calendar,
  RefreshCw,
  Monitor,
  Smartphone,
  ChevronDown,
  TrendingUp,
} from "lucide-react"
import {
  getConcurrentAnalytics,
  getConcurrentAvailableDatesAction,
  recordLiveConcurrentPeakAction,
} from "@/actions/concurrent-analytics"
import type { DayConcurrentMetrics, HourlyConcurrentPoint } from "@/lib/algorithm-concurrent"

function number(val: number) {
  return new Intl.NumberFormat("th-TH").format(val)
}

function getTodayBangkokDateStr(): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Bangkok",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date())
  } catch {
    return new Date().toISOString().slice(0, 10)
  }
}

function getCurrentBangkokHour(): number {
  try {
    const str = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Bangkok",
      hour: "numeric",
      hourCycle: "h23",
    }).format(new Date())
    return parseInt(str, 10) || 0
  } catch {
    return new Date().getUTCHours()
  }
}

export default function ConcurrentTimelineChart({
  currentLiveCount = 0,
}: {
  currentLiveCount?: number
}) {
  const todayStr = useMemo(() => getTodayBangkokDateStr(), [])
  const currentHour = useMemo(() => getCurrentBangkokHour(), [])

  const [selectedDate, setSelectedDate] = useState<string>(todayStr)
  const [data, setData] = useState<DayConcurrentMetrics | null>(null)
  const [availableDates, setAvailableDates] = useState<Array<{ date: string; label: string }>>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  // Load available dates on mount
  useEffect(() => {
    let isMounted = true
    getConcurrentAvailableDatesAction()
      .then((dates) => {
        if (isMounted) setAvailableDates(dates)
      })
      .catch((err) => console.error("[ConcurrentTimelineChart] fetch dates error:", err))
    return () => {
      isMounted = false
    }
  }, [])

  // Load metrics when selectedDate changes
  const loadData = async (date: string) => {
    setIsLoading(true)
    try {
      const res = await getConcurrentAnalytics(date)
      setData(res)
    } catch (err) {
      console.error("[ConcurrentTimelineChart] load metrics error:", err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadData(selectedDate)
  }, [selectedDate])

  // If live count is higher than current peak of today, update real-time
  useEffect(() => {
    if (currentLiveCount <= 0 || !data || !data.isToday) return

    const currentHourPoint = data.hourly[currentHour]
    if (currentHourPoint && currentLiveCount > currentHourPoint.peakConcurrent) {
      setData((prev) => {
        if (!prev) return prev
        const newHourly = [...prev.hourly]
        newHourly[currentHour] = {
          ...newHourly[currentHour],
          peakConcurrent: currentLiveCount,
        }
        const newPeak = Math.max(prev.dayPeak, currentLiveCount)
        const newPeakHour = currentLiveCount >= prev.dayPeak ? currentHour : prev.dayPeakHour

        return {
          ...prev,
          dayPeak: newPeak,
          dayPeakHour: newPeakHour,
          dayPeakHourLabel: `${String(newPeakHour).padStart(2, "0")}:00 - ${String((newPeakHour + 1) % 24).padStart(2, "0")}:00 น.`,
          hourly: newHourly,
        }
      })

      // Inform server
      void recordLiveConcurrentPeakAction(currentLiveCount)
    }
  }, [currentLiveCount, currentHour, data])

  const maxPeak = Math.max(data?.dayPeak || 0, 5)
  const hoveredPoint: HourlyConcurrentPoint | null =
    hoveredIndex !== null && data?.hourly ? data.hourly[hoveredIndex] : null

  // SVG Chart Layout
  const chartWidth = 720
  const chartHeight = 170
  const barAreaHeight = 120
  const barBottomY = 135
  const barWidth = 18
  const slotWidth = chartWidth / 24

  return (
    <div className="rounded-xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/50 p-4 md:p-5 shadow-sm space-y-4">
      {/* 1. Header & Date Switcher */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
            <TrendingUp className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm md:text-base font-bold text-slate-900">
                สถิติคนเข้าดูพร้อมกันตามช่วงเวลา (Peak Concurrent Viewers)
              </h3>
              {data?.isToday && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Realtime Peak
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500">
              {data?.thaiDateLabel || "กำลังโหลด..."} · ยอดคนเปิดเว็บพร้อมกันสูงสุดในแต่ละชั่วโมง
            </p>
          </div>
        </div>

        {/* Date Selector Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-auto">
          {availableDates.slice(0, 2).map((d) => (
            <button
              key={d.date}
              type="button"
              onClick={() => setSelectedDate(d.date)}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                selectedDate === d.date
                  ? "bg-blue-600 text-white shadow-sm font-bold"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
              }`}
            >
              {d.date === todayStr ? "วันนี้" : "เมื่อวาน"}
            </button>
          ))}

          {/* More dates dropdown */}
          {availableDates.length > 2 && (
            <div className="relative inline-flex items-center">
              <select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="appearance-none rounded-lg border border-slate-200 bg-white py-1 pl-2.5 pr-7 text-xs font-semibold text-slate-700 shadow-sm outline-none hover:bg-slate-50 focus:border-blue-500"
                aria-label="เลือกวันที่ดูสถิติคนเข้าพร้อมกัน"
              >
                {availableDates.map((d) => (
                  <option key={d.date} value={d.date}>
                    {d.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 h-3.5 w-3.5 text-slate-400" />
            </div>
          )}

          <button
            type="button"
            onClick={() => loadData(selectedDate)}
            title="รีเฟรชข้อมูล"
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* 2. Highlight Cards */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {/* Peak Hour */}
        <div className="rounded-xl border border-amber-200/80 bg-gradient-to-br from-amber-50/70 to-orange-50/40 p-3 shadow-xs">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-900">
            <Flame className="h-4 w-4 text-orange-600 fill-orange-500" />
            ช่วงเวลาพีคสุดของวัน
          </div>
          <p className="mt-1 font-mono text-base md:text-lg font-black text-amber-950">
            {data?.dayPeak && data.dayPeak > 0 ? data.dayPeakHourLabel : "—"}
          </p>
          <p className="text-[10px] text-amber-700 font-medium">มีคนเปิดดูพร้อมกันมากที่สุด</p>
        </div>

        {/* Peak Concurrent Count */}
        <div className="rounded-xl border border-blue-200/80 bg-gradient-to-br from-blue-50/70 to-indigo-50/40 p-3 shadow-xs">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-blue-900">
            <Users className="h-4 w-4 text-blue-600" />
            คนดูพร้อมกันสูงสุด
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="font-mono text-2xl font-black text-blue-700">
              {data ? number(data.dayPeak) : "—"}
            </span>
            <span className="text-xs text-blue-800/80 font-medium">คน</span>
          </div>
          <p className="text-[10px] text-blue-600 font-medium">Peak Simultaneous Viewers</p>
        </div>

        {/* Total Sessions */}
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700">
            <Clock className="h-4 w-4 text-slate-500" />
            คนเข้าชมรวมทั้งวัน
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="font-mono text-2xl font-black text-slate-800">
              {data ? number(data.totalSessions) : "—"}
            </span>
            <span className="text-xs text-slate-500">เซสชัน</span>
          </div>
          <p className="text-[10px] text-slate-400 font-medium">ครอบคลุมทุกช่วงเวลาของวัน</p>
        </div>

        {/* Peak Device Ratio */}
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700">
            <Monitor className="h-4 w-4 text-slate-500" />
            อุปกรณ์ช่วงพีค
          </div>
          <div className="mt-1 flex items-center gap-2">
            <div className="flex items-center gap-1 text-xs font-bold text-slate-700">
              <Monitor className="h-3.5 w-3.5 text-slate-400" />
              <span>{data?.peakDesktopPercent ?? 0}%</span>
            </div>
            <span className="text-slate-300">/</span>
            <div className="flex items-center gap-1 text-xs font-bold text-slate-700">
              <Smartphone className="h-3.5 w-3.5 text-slate-400" />
              <span>{data?.peakMobilePercent ?? 0}%</span>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 font-medium">คอมพิวเตอร์ / มือถือ</p>
        </div>
      </div>

      {/* 3. 24-Hour Peak Concurrent Bar Chart */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-700">
            กราฟแสดงคนดูพร้อมกันสูงสุดในแต่ละชั่วโมง (00:00 – 23:00 น.)
          </span>
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            ชี้ที่แท่งเพื่อดูรายละเอียดแต่ละชั่วโมง
          </span>
        </div>

        <div className="relative pt-2">
          {/* Tooltip Overlay */}
          {hoveredPoint && (
            <div
              className="pointer-events-none absolute -top-12 z-20 -translate-x-1/2 rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-center text-white shadow-xl transition-all"
              style={{
                left: `${Math.min(Math.max((hoveredIndex! / 24) * 100 + 2, 8), 92)}%`,
              }}
            >
              <p className="whitespace-nowrap font-mono text-[10px] text-slate-300 font-semibold">
                ช่วง {hoveredPoint.hourRangeLabel} น.
              </p>
              <div className="mt-0.5 flex items-center justify-center gap-1.5 whitespace-nowrap">
                <span className="text-xs font-bold text-amber-400">
                  พร้อมกัน {number(hoveredPoint.peakConcurrent)} คน
                </span>
                <span className="text-[10px] text-slate-400">·</span>
                <span className="text-[10px] text-slate-300">
                  รวม {number(hoveredPoint.sessionsCount)} เซสชัน
                </span>
              </div>
            </div>
          )}

          {/* SVG Chart */}
          <div className="w-full overflow-x-auto">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="h-auto w-full min-w-[580px]"
              role="img"
              aria-label="กราฟคนเข้าดูพร้อมกัน 24 ชั่วโมง"
            >
              {/* Reference Grid lines */}
              <line x1="0" x2={chartWidth} y1="20" y2="20" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="0" x2={chartWidth} y1="75" y2="75" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="0" x2={chartWidth} y1={barBottomY} y2={barBottomY} stroke="#e2e8f0" strokeWidth="1.5" />

              {/* 24 Hourly Bars */}
              {(data?.hourly || []).map((point, index) => {
                const height =
                  point.peakConcurrent > 0
                    ? Math.max((point.peakConcurrent / maxPeak) * barAreaHeight, 8)
                    : 2

                const x = index * slotWidth + (slotWidth - barWidth) / 2
                const y = barBottomY - height
                const isDayPeak = point.hour === data?.dayPeakHour && point.peakConcurrent > 0
                const isCurrent = data?.isToday && point.hour === currentHour
                const isHovered = hoveredIndex === index

                // Bar fill color
                let fill = "#cbd5e1" // default inactive
                if (point.peakConcurrent > 0) {
                  if (isDayPeak) fill = "#2563eb" // royal blue for peak
                  else if (isCurrent) fill = "#059669" // emerald for current hour
                  else fill = "#60a5fa" // light blue for regular active
                }

                return (
                  <g key={point.hour}>
                    {/* Hover highlight background */}
                    <rect
                      x={index * slotWidth}
                      y="10"
                      width={slotWidth}
                      height={barBottomY - 5}
                      fill={isHovered ? "#f8fafc" : "transparent"}
                      className="cursor-pointer transition-colors"
                      onMouseEnter={() => setHoveredIndex(index)}
                      onMouseLeave={() => setHoveredIndex(null)}
                    />

                    {/* Bar */}
                    <rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={height}
                      rx="4"
                      fill={fill}
                      opacity={isHovered ? "1" : isDayPeak ? "1" : "0.85"}
                      className="cursor-pointer transition-all duration-200"
                      onMouseEnter={() => setHoveredIndex(index)}
                      onMouseLeave={() => setHoveredIndex(null)}
                    />

                    {/* Peak badge indicator above peak bar */}
                    {isDayPeak && (
                      <g transform={`translate(${x + barWidth / 2}, ${y - 8})`}>
                        <text
                          textAnchor="middle"
                          fill="#ea580c"
                          fontSize="9"
                          fontWeight="bold"
                          fontFamily="sans-serif"
                        >
                          🔥 {point.peakConcurrent}
                        </text>
                      </g>
                    )}

                    {/* Live indicator on current hour bar */}
                    {isCurrent && !isDayPeak && point.peakConcurrent > 0 && (
                      <g transform={`translate(${x + barWidth / 2}, ${y - 6})`}>
                        <circle r="3" fill="#10b981" />
                      </g>
                    )}

                    {/* X-axis Hour Label */}
                    {(index % 3 === 0 || index === 23) && (
                      <text
                        x={x + barWidth / 2}
                        y={barBottomY + 18}
                        textAnchor="middle"
                        fill="#94a3b8"
                        fontSize="9.5"
                        fontFamily="monospace"
                        fontWeight={isCurrent || isDayPeak ? "bold" : "normal"}
                      >
                        {point.label}
                      </text>
                    )}
                  </g>
                )
              })}
            </svg>
          </div>
        </div>
      </div>

      {/* 4. Top Peak Hours List */}
      {data?.topPeakHours && data.topPeakHours.length > 0 && (
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
            <span>🏆 ช่วงเวลาที่มีคนเข้าพร้อมกันมากที่สุด (Top Peak Hours)</span>
            <span className="text-[11px] text-slate-400 font-normal">เรียงตามยอดเข้าชมพร้อมกันสูงสุด</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {data.topPeakHours.slice(0, 3).map((top, idx) => {
              const medals = ["🥇", "🥈", "🥉"]
              const percentOfMax = maxPeak > 0 ? Math.round((top.peakConcurrent / maxPeak) * 100) : 0
              return (
                <div
                  key={top.hour}
                  className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <span>{medals[idx]}</span>
                      <span>ช่วง {top.hourRangeLabel} น.</span>
                    </span>
                    <span className="font-mono text-xs font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                      พร้อมกัน {number(top.peakConcurrent)} คน
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-600"
                      style={{ width: `${percentOfMax}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                    <span>ทั้งหมด {number(top.sessionsCount)} เซสชัน</span>
                    <span>
                      🖥️ {top.desktop} · 📱 {top.mobile}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
