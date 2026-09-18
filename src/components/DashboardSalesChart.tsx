"use client"

import React, { useState, useMemo, useRef } from 'react'
import { Calendar, X, Award, TrendingUp, DollarSign } from 'lucide-react'
import { DashboardMonthBreakdown, DashboardDaySale } from '@/actions/dashboard'

interface DashboardSalesChartProps {
  monthlyBreakdowns: DashboardMonthBreakdown[]
  branchName: string
  themeColor?: 'emerald' | 'blue'
}

const money = (value: number) =>
  value.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const formatShortMoney = (val: number) => {
  if (val >= 1000000) return `฿${(val / 1000000).toFixed(1)}M`
  if (val >= 1000) return `฿${(val / 1000).toFixed(1)}k`
  return `฿${val.toLocaleString()}`
}

export default function DashboardSalesChart({
  monthlyBreakdowns,
  branchName,
  themeColor = 'emerald'
}: DashboardSalesChartProps) {
  const defaultMonthKey = monthlyBreakdowns[0]?.monthKey || ''
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>(defaultMonthKey)
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [hoveredDay, setHoveredDay] = useState<DashboardDaySale | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)

  const isEmerald = themeColor === 'emerald'
  const activeBg = isEmerald ? 'bg-emerald-600 text-white shadow-emerald-200' : 'bg-blue-600 text-white shadow-blue-200'
  const strokeColor = isEmerald ? '#059669' : '#2563eb'
  const fillGradientId = isEmerald ? 'emeraldGradient' : 'blueGradient'

  // Current selected month
  const currentMonth = useMemo(() => {
    return monthlyBreakdowns.find(m => m.monthKey === selectedMonthKey) || monthlyBreakdowns[0] || null
  }, [monthlyBreakdowns, selectedMonthKey])

  const days = currentMonth?.days || []

  // Highest sales day
  const bestDay = useMemo(() => {
    if (!days || days.length === 0) return null
    let max = days[0]
    for (const d of days) {
      if (d.amount > max.amount) max = d
    }
    return max.amount > 0 ? max : null
  }, [days])

  // Days that have actual sales (> 0), sorted by day
  const activeSalesDays = useMemo(() => {
    return days.filter(d => d.amount > 0).sort((a, b) => b.amount - a.amount)
  }, [days])

  // Selected day data
  const selectedDayData = useMemo(() => {
    if (!currentMonth || selectedDay === null) return null
    return days.find(d => d.day === selectedDay) || null
  }, [currentMonth, selectedDay, days])

  // SVG dimensions
  const svgWidth = 1000
  const svgHeight = 320
  const padLeft = 80
  const padRight = 35
  const padTop = 45
  const padBottom = 45

  const chartWidth = svgWidth - padLeft - padRight
  const chartHeight = svgHeight - padTop - padBottom
  const baselineY = padTop + chartHeight

  // Max scale calculation
  const maxSales = useMemo(() => {
    const rawMax = Math.max(...days.map(d => d.amount), 0)
    if (rawMax <= 0) return 10000
    // Round up to nice ceiling (e.g. 18,100 -> 20,000 or 25,000)
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawMax)))
    const factor = Math.ceil((rawMax * 1.25) / magnitude) * magnitude
    return factor > 0 ? factor : 10000
  }, [days])

  // Coordinate mapper
  const points = useMemo(() => {
    if (days.length === 0) return []
    return days.map((d, index) => {
      const x = padLeft + (index / Math.max(days.length - 1, 1)) * chartWidth
      const yRatio = d.amount / maxSales
      const y = baselineY - (yRatio * chartHeight)
      return { x, y, day: d }
    })
  }, [days, maxSales, chartWidth, chartHeight, baselineY])

  // Smooth curve path generator (monotone cubic bezier)
  const { linePath, areaPath } = useMemo(() => {
    if (points.length === 0) return { linePath: '', areaPath: '' }
    if (points.length === 1) {
      const p = points[0]
      return {
        linePath: `M ${p.x} ${p.y}`,
        areaPath: `M ${p.x} ${p.y} L ${p.x} ${baselineY} Z`
      }
    }

    let d = `M ${points[0].x} ${points[0].y}`
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i]
      const p1 = points[i + 1]
      const midX = (p0.x + p1.x) / 2
      d += ` C ${midX} ${p0.y}, ${midX} ${p1.y}, ${p1.x} ${p1.y}`
    }

    const area = `${d} L ${points[points.length - 1].x} ${baselineY} L ${points[0].x} ${baselineY} Z`
    return { linePath: d, areaPath: area }
  }, [points, baselineY])

  // Y-Axis Ticks
  const yTicks = [
    { value: maxSales, y: padTop },
    { value: Math.round(maxSales * 0.66), y: padTop + chartHeight * 0.34 },
    { value: Math.round(maxSales * 0.33), y: padTop + chartHeight * 0.67 },
    { value: 0, y: baselineY }
  ]

  // Hover detection
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || points.length === 0) return
    const rect = svgRef.current.getBoundingClientRect()
    const scaleX = svgWidth / rect.width
    const mouseX = (e.clientX - rect.left) * scaleX

    // Find closest point
    let closest = points[0]
    let minDist = Math.abs(points[0].x - mouseX)
    for (const pt of points) {
      const dist = Math.abs(pt.x - mouseX)
      if (dist < minDist) {
        minDist = dist
        closest = pt
      }
    }
    setHoveredDay(closest.day)
  }

  const handleTouchMove = (e: React.TouchEvent<SVGSVGElement>) => {
    if (!svgRef.current || points.length === 0 || !e.touches[0]) return
    const touch = e.touches[0]
    const rect = svgRef.current.getBoundingClientRect()
    const scaleX = svgWidth / rect.width
    const touchX = (touch.clientX - rect.left) * scaleX

    let closest = points[0]
    let minDist = Math.abs(points[0].x - touchX)
    for (const pt of points) {
      const dist = Math.abs(pt.x - touchX)
      if (dist < minDist) {
        minDist = dist
        closest = pt
      }
    }
    setHoveredDay(closest.day)
  }

  const handleMouseLeave = () => {
    setHoveredDay(null)
  }

  const hoveredPt = useMemo(() => {
    if (!hoveredDay || points.length === 0) return null
    return points.find(p => p.day.day === hoveredDay.day) || null
  }, [hoveredDay, points])

  const tooltipTransform = useMemo(() => {
    if (!hoveredPt) return ''
    const isNearTop = hoveredPt.y < 85
    const isNearLeft = hoveredPt.x < 140
    const isNearRight = hoveredPt.x > (svgWidth - 140)

    let translateX = '-50%'
    if (isNearLeft) translateX = '-10%'
    else if (isNearRight) translateX = '-90%'

    const translateY = isNearTop ? '15px' : '-115%'
    return `translate(${translateX}, ${translateY})`
  }, [hoveredPt, svgWidth])

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
      <div>
        {/* --- Header Section --- */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-xl ${isEmerald ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-800 text-base">
                    กราฟยอดขายรายวัน · {currentMonth?.fullLabel || currentMonth?.label || 'เลือกเดือน'}
                  </h3>
                  {currentMonth && (
                    <span className={`text-xs font-black px-2.5 py-0.5 rounded-full ${isEmerald ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-blue-700 border-blue-200'} border`}>
                      ฿{money(currentMonth.totalAmount)}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  กราฟเส้นแสดงการขึ้นลงของยอดขายในแต่ละวัน {currentMonth ? `(ขายได้จริง ${activeSalesDays.length} วัน / ${currentMonth.billCount} บิล)` : ''} · สาขา {branchName}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs font-bold">
              <Calendar className={`w-3.5 h-3.5 ${isEmerald ? 'text-emerald-600' : 'text-blue-600'}`} />
              <span>{currentMonth?.label || 'เลือกเดือน'}</span>
            </span>
          </div>
        </div>

        {/* --- Month Filter Buttons (ปุ่มฟิลเตอร์เลือกแต่ละเดือน) --- */}
        <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
          <span className="text-xs font-bold text-slate-400 shrink-0 mr-1 flex items-center gap-1">
            <span>เลือกเดือน:</span>
          </span>
          {monthlyBreakdowns.map((m) => {
            const isSelected = m.monthKey === selectedMonthKey
            return (
              <button
                key={m.monthKey}
                type="button"
                onClick={() => {
                  setSelectedMonthKey(m.monthKey)
                  setSelectedDay(null)
                  setHoveredDay(null)
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 border ${
                  isSelected
                    ? `${activeBg} shadow-sm border-transparent`
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                <span>{m.label}</span>
                {m.totalAmount > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                      isSelected ? 'bg-white/20 text-white font-black' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    ฿{formatShortMoney(m.totalAmount)}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* --- Main Smooth Area Line Chart --- */}
        <div className="mt-6">
          <div className="flex justify-between items-center text-xs text-slate-400 mb-2">
            <span className="flex items-center gap-2">
              <span className={`inline-block w-3 h-0.5 ${isEmerald ? 'bg-emerald-600' : 'bg-blue-600'} rounded`}></span>
              <span>เลื่อนเมาส์ชี้บนกราฟเพื่อดูยอดแต่ละวัน · คลิกเพื่อดูรายการบิล</span>
            </span>
            {selectedDay !== null && (
              <button
                type="button"
                onClick={() => setSelectedDay(null)}
                className={`text-xs font-bold ${isEmerald ? 'text-emerald-600 hover:text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-blue-600 hover:text-blue-700 bg-blue-50 border-blue-200'} flex items-center gap-1 cursor-pointer px-2 py-0.5 rounded-md border`}
              >
                <X className="w-3 h-3" /> แสดงทั้งเดือน (เลือกวันที่ {selectedDay})
              </button>
            )}
          </div>

          {/* SVG Chart Container */}
          <div className="w-full overflow-hidden bg-slate-50/50 rounded-2xl border border-slate-100 p-2 sm:p-4">
            <div className="relative w-full">
              <svg
                ref={svgRef}
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="w-full h-auto overflow-visible select-none cursor-crosshair"
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleMouseLeave}
              >
                <defs>
                  <linearGradient id={fillGradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={isEmerald ? '#10b981' : '#3b82f6'} stopOpacity="0.22" />
                    <stop offset="85%" stopColor={isEmerald ? '#10b981' : '#3b82f6'} stopOpacity="0.02" />
                    <stop offset="100%" stopColor={isEmerald ? '#10b981' : '#3b82f6'} stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Grid Lines & Y-Axis Labels */}
                {yTicks.map((tick, i) => (
                  <g key={i}>
                    <line
                      x1={padLeft}
                      y1={tick.y}
                      x2={svgWidth - padRight}
                      y2={tick.y}
                      stroke="#f1f5f9"
                      strokeWidth="1"
                      strokeDasharray={tick.value === 0 ? "none" : "3 3"}
                    />
                    <text
                      x={padLeft - 12}
                      y={tick.y + 4}
                      textAnchor="end"
                      fontSize="11"
                      fontWeight="bold"
                      fill="#94a3b8"
                    >
                      {formatShortMoney(tick.value)}
                    </text>
                  </g>
                ))}

                {/* Area Gradient Fill */}
                {areaPath && (
                  <path d={areaPath} fill={`url(#${fillGradientId})`} />
                )}

                {/* Main Line (Clean, Crisp, Sharp - No Blur/Glow) */}
                {linePath && (
                  <path
                    d={linePath}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Hover Crosshair Vertical Line & Highlight Point */}
                {hoveredPt && (
                  <g className="pointer-events-none">
                    <line
                      x1={hoveredPt.x}
                      y1={padTop}
                      x2={hoveredPt.x}
                      y2={baselineY}
                      stroke="#cbd5e1"
                      strokeWidth="1.5"
                      strokeDasharray="3 3"
                    />
                    <circle
                      cx={hoveredPt.x}
                      cy={hoveredPt.y}
                      r="8"
                      fill={strokeColor}
                      opacity="0.2"
                    />
                    <circle
                      cx={hoveredPt.x}
                      cy={hoveredPt.y}
                      r="5"
                      fill="#ffffff"
                      stroke={strokeColor}
                      strokeWidth="3"
                    />
                  </g>
                )}

                {/* Data Points on Curve */}
                {points.map((pt) => {
                  const hasSales = pt.day.amount > 0
                  const isSelected = selectedDay === pt.day.day
                  const isBest = bestDay && bestDay.day === pt.day.day
                  const isHovered = hoveredPt?.day.day === pt.day.day

                  return (
                    <g
                      key={pt.day.day}
                      onClick={() => setSelectedDay(selectedDay === pt.day.day ? null : pt.day.day)}
                      className="cursor-pointer group"
                    >
                      {/* Interactive Click Area */}
                      <rect
                        x={pt.x - 12}
                        y={padTop}
                        width="24"
                        height={chartHeight + padBottom}
                        fill="transparent"
                      />

                      {/* Point Circle on Active Days */}
                      {hasSales && (
                        <>
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r={isSelected ? "6" : isHovered ? "5" : "4"}
                            fill={isSelected ? strokeColor : "#ffffff"}
                            stroke={strokeColor}
                            strokeWidth={isSelected ? "3" : "2"}
                          />

                          {/* Star for best day (clean & subtle) */}
                          {isBest && !isSelected && (
                            <text
                              x={pt.x}
                              y={pt.y - 9}
                              textAnchor="middle"
                              fontSize="11"
                              fill="#f59e0b"
                              fontWeight="black"
                            >
                              ★
                            </text>
                          )}
                        </>
                      )}

                      {/* Selected Day Highlight Ring & Badge (เฉพาะวันที่คลิกเลือกเท่านั้น ไม่รก) */}
                      {isSelected && (
                        <g>
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r="10"
                            fill="none"
                            stroke={strokeColor}
                            strokeWidth="2"
                            strokeDasharray="2 2"
                          />
                          <g transform={`translate(${pt.x}, ${pt.y - 12})`}>
                            <rect
                              x="-26"
                              y="-16"
                              width="52"
                              height="17"
                              rx="5"
                              fill={strokeColor}
                            />
                            <text
                              x="0"
                              y="-4"
                              textAnchor="middle"
                              fontSize="9.5"
                              fontWeight="bold"
                              fill="#ffffff"
                            >
                              {formatShortMoney(pt.day.amount)}
                            </text>
                          </g>
                        </g>
                      )}

                      {/* X-Axis Day Labels */}
                      <text
                        x={pt.x}
                        y={baselineY + 20}
                        textAnchor="middle"
                        fontSize="10"
                        fontWeight={isSelected || isHovered ? "900" : hasSales ? "700" : "500"}
                        fill={isSelected || isHovered ? strokeColor : hasSales ? "#0f172a" : "#94a3b8"}
                      >
                        {pt.day.day}
                      </text>

                      {/* Dot under active days */}
                      {hasSales && (
                        <circle
                          cx={pt.x}
                          cy={baselineY + 28}
                          r="2"
                          fill={isSelected || isHovered ? strokeColor : "#cbd5e1"}
                        />
                      )}
                    </g>
                  )
                })}
              </svg>

              {/* Dynamic Floating Tooltip Card (แสดงเมื่อเลื่อนเมาส์ชี้เท่านั้น ไม่ขึ้นค้างให้รก) */}
              {hoveredPt && (
                <div
                  className="absolute pointer-events-none z-20 transition-all duration-75 ease-out"
                  style={{
                    left: `${(hoveredPt.x / svgWidth) * 100}%`,
                    top: `${(hoveredPt.y / svgHeight) * 100}%`,
                    transform: tooltipTransform
                  }}
                >
                  <div className="bg-slate-900/95 text-white px-3.5 py-2 rounded-xl shadow-2xl border border-slate-700/60 backdrop-blur-md whitespace-nowrap text-center">
                    <div className="text-[10px] text-slate-400 font-medium">
                      วันที่ {hoveredPt.day.day} {currentMonth?.label} ({hoveredPt.day.dayOfWeek})
                    </div>
                    <div className={`text-sm font-black my-0.5 ${isEmerald ? 'text-emerald-400' : 'text-blue-400'}`}>
                      ฿{money(hoveredPt.day.amount)}
                    </div>
                    <div className="text-[10px] font-semibold text-slate-300">
                      {hoveredPt.day.billCount > 0 ? `${hoveredPt.day.billCount} บิลขาย` : 'ไม่มียอดขาย'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Month Metrics */}
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
              <span className="text-[10px] text-slate-400 font-bold block">ยอดขายเดือนนี้</span>
              <span className="text-base font-black text-slate-800">฿{money(currentMonth?.totalAmount || 0)}</span>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
              <span className="text-[10px] text-slate-400 font-bold block">จำนวนบิลขาย</span>
              <span className="text-base font-black text-slate-800">{currentMonth?.billCount || 0} บิล</span>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
              <span className="text-[10px] text-slate-400 font-bold block">เฉลี่ยต่อวัน</span>
              <span className="text-base font-black text-slate-800">
                ฿{money((currentMonth?.totalAmount || 0) / (currentMonth?.daysCount || 1))}
              </span>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
              <span className="text-[10px] text-amber-600 font-bold block flex items-center gap-1">
                <Award className="w-3 h-3" /> วันที่ขายดีสุด
              </span>
              <span className="text-base font-black text-slate-800">
                {bestDay ? `วันที่ ${bestDay.day} (฿${money(bestDay.amount)})` : '-'}
              </span>
            </div>
          </div>
        </div>

        {/* --- รายการวันทีมียอดขายในเดือนนี้ (Active Days Quick Cards - เห็นตัวเลขยอดของทุกวันได้ในพริบตา) --- */}
        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-600">
              วันทีมียอดขายในเดือนนี้ ({activeSalesDays.length} วัน):
            </span>
            <span className="text-[11px] text-slate-400">คลิกที่วันเพื่อดูบิล</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {activeSalesDays.map((d) => {
              const isSelected = selectedDay === d.day
              return (
                <button
                  key={d.day}
                  type="button"
                  onClick={() => setSelectedDay(selectedDay === d.day ? null : d.day)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-2 ${
                    isSelected
                      ? `${activeBg} shadow-sm border-transparent`
                      : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  <span className="text-[11px] opacity-80">วันที่ {d.day} ({d.dayOfWeek})</span>
                  <span className={`font-black ${isSelected ? 'text-white' : isEmerald ? 'text-emerald-700' : 'text-blue-700'}`}>
                    ฿{money(d.amount)}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded ${isSelected ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>
                    {d.billCount} บิล
                  </span>
                </button>
              )
            })}
            {activeSalesDays.length === 0 && (
              <span className="text-xs text-slate-400 italic">ยังไม่มียอดขายในเดือนนี้</span>
            )}
          </div>
        </div>

        {/* --- Selected Day Details Panel (กล่องแสดงรายละเอียดเมื่อเลือกวัน) --- */}
        {selectedDayData && (
          <div className={`mt-4 p-4 rounded-2xl ${isEmerald ? 'bg-emerald-50/50 border-emerald-200/80' : 'bg-blue-50/50 border-blue-200/80'} border animate-fade-in`}>
            <div className={`flex items-center justify-between border-b ${isEmerald ? 'border-emerald-200/60' : 'border-blue-200/60'} pb-3`}>
              <div className="flex items-center gap-2">
                <div className={`w-9 h-9 rounded-xl ${isEmerald ? 'bg-emerald-600' : 'bg-blue-600'} text-white flex items-center justify-center font-black text-sm shadow-sm`}>
                  {selectedDayData.day}
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">
                    สรุปยอดขายวันที่ {selectedDayData.day} {currentMonth?.label} ({selectedDayData.dayOfWeek})
                  </h4>
                  <p className="text-xs text-slate-500">
                    ยอดขายรวม: <strong className={`${isEmerald ? 'text-emerald-700' : 'text-blue-700'} font-bold`}>฿{money(selectedDayData.amount)}</strong> ({selectedDayData.billCount} บิล)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDay(null)}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 bg-white border border-slate-200 px-2.5 py-1 rounded-lg cursor-pointer shadow-3xs"
              >
                ปิด
              </button>
            </div>

            <div className="mt-3 space-y-2">
              {selectedDayData.orders.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {selectedDayData.orders.map((ord) => (
                    <div
                      key={ord.id}
                      className="p-3 bg-white rounded-xl border border-emerald-100 shadow-3xs flex items-center justify-between"
                    >
                      <div>
                        <span className="font-mono font-bold text-xs text-slate-800 block">{ord.orderCode}</span>
                        <span className="text-[10px] text-slate-400 block">{ord.time}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-xs text-emerald-700 block">฿{money(ord.amount)}</span>
                        <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                          {ord.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-xs text-slate-400 italic">
                  ไม่มีรายการบิลขายที่เสร็จสมบูรณ์ในวันนี้
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
