"use client"

import React, { useState, useEffect, useRef } from "react"
import {
  Filter, Calendar, ChevronLeft, ChevronRight, X, RotateCcw,
  Search, SlidersHorizontal, ArrowRight, Check, User, ChevronDown, Tag
} from "lucide-react"

export type DateFilterMode =
  | 'ALL'
  | 'MONTH'
  | 'DAY'
  | 'RANGE'
  | 'TODAY'
  | 'YESTERDAY'
  | 'LAST_7_DAYS'
  | 'LAST_30_DAYS'
  | 'LAST_MONTH'

export interface DateFilterConfig {
  mode: DateFilterMode
  month: string // "YYYY-MM"
  day: string // "YYYY-MM-DD"
  startDate: string // "YYYY-MM-DD"
  endDate: string // "YYYY-MM-DD"
}

export interface OrderPrefixItem {
  prefix: string
  count: number
}

export interface SalesFilters {
  // General search
  search: string

  // Column specific filters
  orderCode: string
  orderCodePrefix: string
  branchId: 'ALL' | number
  shippingType: 'ALL' | 'DELIVERY' | 'PICKUP'

  // Date filters
  activeDateField: 'completedAt' | 'createdAt'
  completedDate: DateFilterConfig
  createdDate: DateFilterConfig

  // Other columns
  slipStatus: 'ALL' | 'HAS_SLIP' | 'NO_SLIP'
  saleName: 'ALL' | string
  hasDiscount: 'ALL' | 'YES' | 'NO'
  dropShip: 'ALL' | 'HAS_DROPSHIP' | 'NO_DROPSHIP'
  status: 'ALL' | 'COMPLETED' | 'PENDING' | 'CANCELLED'

  // Amounts
  minSubtotal: string
  maxSubtotal: string
  minTotalAmount: string
  maxTotalAmount: string
  minVatAmount: string
  maxVatAmount: string
  minBranchRevenue: string
  maxBranchRevenue: string
  minNetRevenue: string
  maxNetRevenue: string
}

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
]

const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
]

export function getTodayThaiString(): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return formatter.format(new Date()) // "YYYY-MM-DD"
}

export function getCurrentThaiMonthString(): string {
  return getTodayThaiString().substring(0, 7) // "YYYY-MM"
}

export function formatThaiMonth(ym: string): string {
  if (!ym || !ym.includes('-')) return ym || ''
  const [y, m] = ym.split('-').map(Number)
  const monthName = THAI_MONTHS[m - 1] || ''
  return `${monthName} ${y + 543}`
}

export function formatThaiDateShort(dStr: string): string {
  if (!dStr || !dStr.includes('-')) return dStr || ''
  const [y, m, d] = dStr.split('-').map(Number)
  const monthName = THAI_MONTHS_SHORT[m - 1] || ''
  return `${d} ${monthName} ${y + 543}`
}

export function prevMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  const py = m === 1 ? y - 1 : y
  const pm = m === 1 ? 12 : m - 1
  return `${py}-${String(pm).padStart(2, '0')}`
}

export function nextMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  const ny = m === 12 ? y + 1 : y
  const nm = m === 12 ? 1 : m + 1
  return `${ny}-${String(nm).padStart(2, '0')}`
}

export function prevDay(dStr: string): string {
  const [y, m, d] = dStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() - 1)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

export function nextDay(dStr: string): string {
  const [y, m, d] = dStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + 1)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

export const createDefaultDateConfig = (): DateFilterConfig => ({
  mode: 'ALL',
  month: getCurrentThaiMonthString(),
  day: getTodayThaiString(),
  startDate: '',
  endDate: '',
})

export const initialSalesFilters: SalesFilters = {
  search: '',
  orderCode: '',
  orderCodePrefix: '',
  branchId: 'ALL',
  shippingType: 'ALL',
  activeDateField: 'completedAt',
  completedDate: createDefaultDateConfig(),
  createdDate: createDefaultDateConfig(),
  slipStatus: 'ALL',
  saleName: 'ALL',
  hasDiscount: 'ALL',
  dropShip: 'ALL',
  status: 'ALL',
  minSubtotal: '',
  maxSubtotal: '',
  minTotalAmount: '',
  maxTotalAmount: '',
  minVatAmount: '',
  maxVatAmount: '',
  minBranchRevenue: '',
  maxBranchRevenue: '',
  minNetRevenue: '',
  maxNetRevenue: '',
}

export function matchDate(dateStr: string | null | undefined, config: DateFilterConfig): boolean {
  if (config.mode === 'ALL') return true
  if (!dateStr) return false

  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return false

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const orderDay = formatter.format(d) // "YYYY-MM-DD"
  const orderMonth = orderDay.substring(0, 7) // "YYYY-MM"

  const todayStr = getTodayThaiString()
  const [tY, tM, tD] = todayStr.split('-').map(Number)
  const todayDt = new Date(tY, tM - 1, tD)

  switch (config.mode) {
    case 'MONTH':
      return orderMonth === config.month
    case 'DAY':
      return orderDay === config.day
    case 'RANGE':
      if (config.startDate && orderDay < config.startDate) return false
      if (config.endDate && orderDay > config.endDate) return false
      return true
    case 'TODAY':
      return orderDay === todayStr
    case 'YESTERDAY': {
      const yest = new Date(todayDt)
      yest.setDate(yest.getDate() - 1)
      const yestStr = `${yest.getFullYear()}-${String(yest.getMonth() + 1).padStart(2, '0')}-${String(yest.getDate()).padStart(2, '0')}`
      return orderDay === yestStr
    }
    case 'LAST_7_DAYS': {
      const d7 = new Date(todayDt)
      d7.setDate(d7.getDate() - 6)
      const d7Str = `${d7.getFullYear()}-${String(d7.getMonth() + 1).padStart(2, '0')}-${String(d7.getDate()).padStart(2, '0')}`
      return orderDay >= d7Str && orderDay <= todayStr
    }
    case 'LAST_30_DAYS': {
      const d30 = new Date(todayDt)
      d30.setDate(d30.getDate() - 29)
      const d30Str = `${d30.getFullYear()}-${String(d30.getMonth() + 1).padStart(2, '0')}-${String(d30.getDate()).padStart(2, '0')}`
      return orderDay >= d30Str && orderDay <= todayStr
    }
    case 'LAST_MONTH': {
      const prevM = new Date(tY, tM - 2, 1)
      const prevMStr = `${prevM.getFullYear()}-${String(prevM.getMonth() + 1).padStart(2, '0')}`
      return orderMonth === prevMStr
    }
    default:
      return true
  }
}

export function filterSalesOrder(order: any, filters: SalesFilters): boolean {
  // Global search
  if (filters.search) {
    const q = filters.search.toLowerCase()
    const matchesGlobal =
      order.orderCode?.toLowerCase().includes(q) ||
      (order.shippingName && order.shippingName.toLowerCase().includes(q)) ||
      (order.branchName && order.branchName.toLowerCase().includes(q)) ||
      (order.saleName && order.saleName.toLowerCase().includes(q))
    if (!matchesGlobal) return false
  }

  // Order Code specific search
  if (filters.orderCode) {
    const q = filters.orderCode.toLowerCase()
    if (!order.orderCode?.toLowerCase().includes(q)) return false
  }

  // Order Code Prefix (4 ตัวหน้า หรือรหัสหัวใบขาย)
  if (filters.orderCodePrefix && filters.orderCodePrefix !== 'ALL') {
    const p = filters.orderCodePrefix.trim().toUpperCase()
    if (!order.orderCode) return false
    const codeUpper = order.orderCode.trim().toUpperCase()
    if (!codeUpper.startsWith(p) && codeUpper.slice(0, 4) !== p) return false
  }

  // Branch
  if (filters.branchId !== 'ALL') {
    if (order.branchId !== filters.branchId) return false
  }

  // Shipping Type
  if (filters.shippingType === 'DELIVERY' && !order.shippingName) return false
  if (filters.shippingType === 'PICKUP' && order.shippingName) return false

  // Status
  if (filters.status !== 'ALL' && order.status !== filters.status) return false

  // Sale Name
  if (filters.saleName !== 'ALL' && order.saleName !== filters.saleName) return false

  // Has discount
  if (filters.hasDiscount === 'YES' && (!order.discountAmount || order.discountAmount <= 0)) return false
  if (filters.hasDiscount === 'NO' && order.discountAmount && order.discountAmount > 0) return false

  // Drop ship
  if (filters.dropShip === 'HAS_DROPSHIP' && (!order.otherBranchRevenue || order.otherBranchRevenue <= 0)) return false
  if (filters.dropShip === 'NO_DROPSHIP' && order.otherBranchRevenue && order.otherBranchRevenue > 0) return false

  // Date filters
  // 1) Completed Date
  const closedAt = order.completedAt || order.discountSnapshot?.completed_at || (order.status === 'COMPLETED' ? order.createdAt : null)
  if (!matchDate(closedAt, filters.completedDate)) return false

  // 2) Created Date
  if (!matchDate(order.createdAt, filters.createdDate)) return false

  // Amounts
  if (filters.minSubtotal && order.subtotal < Number(filters.minSubtotal)) return false
  if (filters.maxSubtotal && order.subtotal > Number(filters.maxSubtotal)) return false

  if (filters.minTotalAmount && order.totalAmount < Number(filters.minTotalAmount)) return false
  if (filters.maxTotalAmount && order.totalAmount > Number(filters.maxTotalAmount)) return false

  if (filters.minVatAmount && order.vatAmount < Number(filters.minVatAmount)) return false
  if (filters.maxVatAmount && order.vatAmount > Number(filters.maxVatAmount)) return false

  if (filters.minBranchRevenue && order.myBranchRevenue < Number(filters.minBranchRevenue)) return false
  if (filters.maxBranchRevenue && order.myBranchRevenue > Number(filters.maxBranchRevenue)) return false

  if (filters.minNetRevenue && order.netBeforeVat < Number(filters.minNetRevenue)) return false
  if (filters.maxNetRevenue && order.netBeforeVat > Number(filters.maxNetRevenue)) return false

  return true
}

// ----------------------------------------------------
// UI: Quick Date Slider Bar (แถบเลื่อนวันที่และเดือน)
// ----------------------------------------------------
export function QuickDateSliderBar({
  filters,
  onChange,
  onResetAll,
  totalResults,
  saleNames,
  orderPrefixes,
}: {
  filters: SalesFilters
  onChange: (updater: (prev: SalesFilters) => SalesFilters) => void
  onResetAll: () => void
  totalResults: number
  saleNames?: string[]
  orderPrefixes?: { prefix: string; count: number }[]
}) {
  const activeField = filters.activeDateField
  const dateConfig = activeField === 'completedAt' ? filters.completedDate : filters.createdDate

  const updateActiveDate = (patch: Partial<DateFilterConfig>) => {
    onChange(prev => {
      const target = prev.activeDateField === 'completedAt' ? 'completedDate' : 'createdDate'
      return {
        ...prev,
        [target]: {
          ...prev[target],
          ...patch,
        },
      }
    })
  }

  const handlePrev = () => {
    if (dateConfig.mode === 'MONTH') {
      updateActiveDate({ month: prevMonth(dateConfig.month) })
    } else if (dateConfig.mode === 'DAY') {
      updateActiveDate({ day: prevDay(dateConfig.day) })
    } else if (dateConfig.mode === 'ALL') {
      updateActiveDate({ mode: 'MONTH', month: prevMonth(getCurrentThaiMonthString()) })
    }
  }

  const handleNext = () => {
    if (dateConfig.mode === 'MONTH') {
      updateActiveDate({ month: nextMonth(dateConfig.month) })
    } else if (dateConfig.mode === 'DAY') {
      updateActiveDate({ day: nextDay(dateConfig.day) })
    } else if (dateConfig.mode === 'ALL') {
      updateActiveDate({ mode: 'MONTH', month: nextMonth(getCurrentThaiMonthString()) })
    }
  }

  const activeDateLabel = () => {
    switch (dateConfig.mode) {
      case 'ALL':
        return 'ทุกช่วงเวลา'
      case 'MONTH':
        return formatThaiMonth(dateConfig.month)
      case 'DAY':
        return formatThaiDateShort(dateConfig.day)
      case 'TODAY':
        return `วันนี้ (${formatThaiDateShort(getTodayThaiString())})`
      case 'YESTERDAY':
        return `เมื่อวาน (${formatThaiDateShort(prevDay(getTodayThaiString()))})`
      case 'LAST_7_DAYS':
        return '7 วันล่าสุด'
      case 'LAST_30_DAYS':
        return '30 วันล่าสุด'
      case 'LAST_MONTH': {
        const cur = getCurrentThaiMonthString()
        return `เดือนที่แล้ว (${formatThaiMonth(prevMonth(cur))})`
      }
      case 'RANGE':
        if (dateConfig.startDate && dateConfig.endDate) {
          return `${formatThaiDateShort(dateConfig.startDate)} - ${formatThaiDateShort(dateConfig.endDate)}`
        }
        return 'กำหนดช่วงวันที่'
      default:
        return 'ทุกช่วงเวลา'
    }
  }

  const isFiltered =
    dateConfig.mode !== 'ALL' ||
    filters.branchId !== 'ALL' ||
    filters.status !== 'ALL' ||
    filters.saleName !== 'ALL' ||
    filters.orderCode !== '' ||
    filters.shippingType !== 'ALL' ||
    filters.hasDiscount !== 'ALL' ||
    filters.dropShip !== 'ALL' ||
    filters.minTotalAmount !== '' ||
    filters.maxTotalAmount !== ''

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-xs space-y-3">
      {/* แถวบน: สลับฟิลด์วันที่ + ตัวเลื่อนวัน/เดือน + พรีเซ็ตด่วน */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* เลือกฟิลด์วันที่ที่จะเลื่อน */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-700">
            <button
              type="button"
              onClick={() => onChange(prev => ({ ...prev, activeDateField: 'completedAt' }))}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeField === 'completedAt'
                  ? 'bg-white text-emerald-700 shadow-2xs font-black'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              วันที่ขายจริง (ปิดบิล)
            </button>
            <button
              type="button"
              onClick={() => onChange(prev => ({ ...prev, activeDateField: 'createdAt' }))}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeField === 'createdAt'
                  ? 'bg-white text-blue-700 shadow-2xs font-black'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              วันที่เปิดบิล
            </button>
          </div>

          {/* สลับโหมด: เดือน / วัน / ช่วง */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
            <button
              type="button"
              onClick={() => updateActiveDate({ mode: 'MONTH' })}
              className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                dateConfig.mode === 'MONTH' ? 'bg-white text-slate-900 shadow-2xs font-black' : 'hover:text-slate-900'
              }`}
            >
              ดูตามเดือน
            </button>
            <button
              type="button"
              onClick={() => updateActiveDate({ mode: 'DAY' })}
              className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                dateConfig.mode === 'DAY' ? 'bg-white text-slate-900 shadow-2xs font-black' : 'hover:text-slate-900'
              }`}
            >
              ดูตามวัน
            </button>
            <button
              type="button"
              onClick={() => updateActiveDate({ mode: 'RANGE' })}
              className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                dateConfig.mode === 'RANGE' ? 'bg-white text-slate-900 shadow-2xs font-black' : 'hover:text-slate-900'
              }`}
            >
              ช่วงวันที่
            </button>
          </div>
        </div>

        {/* ตัวเลื่อนเดือน / วัน (Slide Navigator) */}
        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2 py-1 rounded-xl shadow-3xs">
          <button
            type="button"
            onClick={handlePrev}
            className="p-1 rounded-lg hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
            title={dateConfig.mode === 'DAY' ? 'วันก่อนหน้า' : 'เดือนก่อนหน้า'}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="px-3 py-0.5 text-xs font-black text-slate-800 min-w-[130px] text-center select-none">
            {activeDateLabel()}
          </div>
          <button
            type="button"
            onClick={handleNext}
            className="p-1 rounded-lg hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
            title={dateConfig.mode === 'DAY' ? 'วันถัดไป' : 'เดือนถัดไป'}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* ตัวเลือกเซล (Sale) ด่วน */}
        {saleNames && saleNames.length > 0 && (
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-xl shadow-3xs">
            <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={filters.saleName}
              onChange={(e) => onChange(prev => ({ ...prev, saleName: e.target.value }))}
              className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer"
              title="กรองตามพนักงานขาย (Sale)"
            >
              <option value="ALL">พนักงานขายทั้งหมด ({saleNames.length} คน)</option>
              {saleNames.map(name => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* ตัวเลือกรหัสหน้า 4 ตัว (Prefix) ด่วน */}
        {orderPrefixes && orderPrefixes.length > 0 && (
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-xl shadow-3xs">
            <Tag className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={filters.orderCodePrefix}
              onChange={(e) => onChange(prev => ({ ...prev, orderCodePrefix: e.target.value }))}
              className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer"
              title="กรองตามรหัสหน้าใบขาย 4 ตัวแรก (Prefix)"
            >
              <option value="ALL">รหัสหน้า 4 ตัว ({orderPrefixes.length})</option>
              {orderPrefixes.map(({ prefix, count }) => (
                <option key={prefix} value={prefix}>
                  {prefix} ({count} บิล)
                </option>
              ))}
            </select>
          </div>
        )}

        {/* พรีเซ็ตด่วน */}
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => updateActiveDate({ mode: 'ALL' })}
            className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
              dateConfig.mode === 'ALL'
                ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            ทั้งหมด
          </button>
          <button
            type="button"
            onClick={() => updateActiveDate({ mode: 'TODAY' })}
            className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
              dateConfig.mode === 'TODAY'
                ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            วันนี้
          </button>
          <button
            type="button"
            onClick={() => updateActiveDate({ mode: 'YESTERDAY' })}
            className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
              dateConfig.mode === 'YESTERDAY'
                ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            เมื่อวาน
          </button>
          <button
            type="button"
            onClick={() => updateActiveDate({ mode: 'LAST_7_DAYS' })}
            className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
              dateConfig.mode === 'LAST_7_DAYS'
                ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            7 วัน
          </button>
          <button
            type="button"
            onClick={() => updateActiveDate({ mode: 'MONTH', month: getCurrentThaiMonthString() })}
            className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
              dateConfig.mode === 'MONTH' && dateConfig.month === getCurrentThaiMonthString()
                ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            เดือนนี้
          </button>
          <button
            type="button"
            onClick={() => updateActiveDate({ mode: 'LAST_MONTH' })}
            className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
              dateConfig.mode === 'LAST_MONTH'
                ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            เดือนก่อน
          </button>

          {isFiltered && (
            <button
              type="button"
              onClick={onResetAll}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-all cursor-pointer ml-1"
            >
              <RotateCcw className="w-3 h-3" /> ล้างตัวกรองทั้งหมด
            </button>
          )}
        </div>
      </div>

      {/* ถ้าเป็นโหมด RANGE หรือโหมดเจาะจง ให้แสดงกล่องเลือกวันที่ */}
      {dateConfig.mode === 'RANGE' && (
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs">
          <span className="font-bold text-slate-600">ระบุช่วงวันที่:</span>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateConfig.startDate}
              onChange={(e) => updateActiveDate({ startDate: e.target.value })}
              className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-none focus:border-blue-500"
            />
            <span className="text-slate-400">ถึง</span>
            <input
              type="date"
              value={dateConfig.endDate}
              onChange={(e) => updateActiveDate({ endDate: e.target.value })}
              className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-none focus:border-blue-500"
            />
          </div>
          <span className="text-slate-400 text-[11px]">
            (พบ {totalResults} รายการในช่วงเวลานี้)
          </span>
        </div>
      )}
    </div>
  )
}

// ----------------------------------------------------
// UI: Active Filter Pills (แสดงป้ายตัวกรองที่เลือกพร้อมปุ่มกากบาท)
// ----------------------------------------------------
export function ActiveFilterBadges({
  filters,
  branches,
  onChange,
  onResetAll,
}: {
  filters: SalesFilters
  branches: { id: number; branch_name: string }[]
  onChange: (updater: (prev: SalesFilters) => SalesFilters) => void
  onResetAll: () => void
}) {
  const pills: { key: string; label: string; onRemove: () => void }[] = []

  // Completed Date
  if (filters.completedDate.mode !== 'ALL') {
    let text = ''
    if (filters.completedDate.mode === 'MONTH') text = formatThaiMonth(filters.completedDate.month)
    else if (filters.completedDate.mode === 'DAY') text = formatThaiDateShort(filters.completedDate.day)
    else if (filters.completedDate.mode === 'TODAY') text = 'วันนี้'
    else if (filters.completedDate.mode === 'YESTERDAY') text = 'เมื่อวาน'
    else if (filters.completedDate.mode === 'LAST_7_DAYS') text = '7 วันล่าสุด'
    else if (filters.completedDate.mode === 'LAST_MONTH') text = 'เดือนที่แล้ว'
    else if (filters.completedDate.mode === 'RANGE') text = `${filters.completedDate.startDate} ถึง ${filters.completedDate.endDate}`
    pills.push({
      key: 'completedDate',
      label: `วันขายจริง: ${text}`,
      onRemove: () => onChange(p => ({ ...p, completedDate: createDefaultDateConfig() })),
    })
  }

  // Created Date
  if (filters.createdDate.mode !== 'ALL') {
    let text = ''
    if (filters.createdDate.mode === 'MONTH') text = formatThaiMonth(filters.createdDate.month)
    else if (filters.createdDate.mode === 'DAY') text = formatThaiDateShort(filters.createdDate.day)
    else if (filters.createdDate.mode === 'TODAY') text = 'วันนี้'
    else if (filters.createdDate.mode === 'RANGE') text = `${filters.createdDate.startDate} ถึง ${filters.createdDate.endDate}`
    else text = filters.createdDate.mode
    pills.push({
      key: 'createdDate',
      label: `วันเปิดบิล: ${text}`,
      onRemove: () => onChange(p => ({ ...p, createdDate: createDefaultDateConfig() })),
    })
  }

  // Branch
  if (filters.branchId !== 'ALL') {
    const bName = branches.find(b => b.id === filters.branchId)?.branch_name || `สาขา #${filters.branchId}`
    pills.push({
      key: 'branchId',
      label: `สาขา: ${bName}`,
      onRemove: () => onChange(p => ({ ...p, branchId: 'ALL' })),
    })
  }

  // Status
  if (filters.status !== 'ALL') {
    const statusMap: Record<string, string> = {
      COMPLETED: 'ขายสำเร็จ',
      PENDING: 'ยังไม่คิดเงิน',
      CANCELLED: 'ยกเลิกแล้ว',
    }
    pills.push({
      key: 'status',
      label: `สถานะ: ${statusMap[filters.status] || filters.status}`,
      onRemove: () => onChange(p => ({ ...p, status: 'ALL' })),
    })
  }

  // Sale Name
  if (filters.saleName !== 'ALL') {
    pills.push({
      key: 'saleName',
      label: `Sale: ${filters.saleName}`,
      onRemove: () => onChange(p => ({ ...p, saleName: 'ALL' })),
    })
  }

  // Order Code
  if (filters.orderCode) {
    pills.push({
      key: 'orderCode',
      label: `เลขบิล: ${filters.orderCode}`,
      onRemove: () => onChange(p => ({ ...p, orderCode: '' })),
    })
  }

  // Order Code Prefix
  if (filters.orderCodePrefix && filters.orderCodePrefix !== 'ALL') {
    pills.push({
      key: 'orderCodePrefix',
      label: `รหัสหน้า (Prefix): ${filters.orderCodePrefix}`,
      onRemove: () => onChange(p => ({ ...p, orderCodePrefix: '' })),
    })
  }

  // Shipping
  if (filters.shippingType !== 'ALL') {
    pills.push({
      key: 'shippingType',
      label: `จัดส่ง: ${filters.shippingType === 'DELIVERY' ? 'ส่งบ้าน' : 'หิ้วกลับเอง'}`,
      onRemove: () => onChange(p => ({ ...p, shippingType: 'ALL' })),
    })
  }

  // Drop Ship
  if (filters.dropShip !== 'ALL') {
    pills.push({
      key: 'dropShip',
      label: filters.dropShip === 'HAS_DROPSHIP' ? 'มีข้ามสาขา' : 'ไม่มีข้ามสาขา',
      onRemove: () => onChange(p => ({ ...p, dropShip: 'ALL' })),
    })
  }

  // Amounts
  if (filters.minTotalAmount || filters.maxTotalAmount) {
    pills.push({
      key: 'totalAmount',
      label: `ยอดเงิน: ${filters.minTotalAmount || '0'} - ${filters.maxTotalAmount || 'สูงสุด'} ฿`,
      onRemove: () => onChange(p => ({ ...p, minTotalAmount: '', maxTotalAmount: '' })),
    })
  }

  if (pills.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-1.5 py-1 text-xs">
      <span className="text-slate-400 font-bold text-[11px] mr-1">ตัวกรองที่เลือก:</span>
      {pills.map((p) => (
        <span
          key={p.key}
          className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-lg text-xs font-semibold"
        >
          {p.label}
          <button
            type="button"
            onClick={p.onRemove}
            className="hover:bg-blue-100 rounded p-0.5 text-blue-500 hover:text-blue-800 transition-colors cursor-pointer"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={onResetAll}
        className="text-[11px] font-bold text-slate-500 hover:text-red-600 underline ml-2 transition-colors cursor-pointer"
      >
        ล้างทั้งหมด
      </button>
    </div>
  )
}

// ----------------------------------------------------
// UI: Column Filter Popover Button (ปุ่มฟิลเตอร์ประจำหัวคอลัมน์)
// ----------------------------------------------------
export function ColumnFilterButton({
  columnKey,
  isActive,
  isOpen,
  onClick,
}: {
  columnKey: string
  isActive: boolean
  isOpen: boolean
  onClick: (e: React.MouseEvent) => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`p-1 rounded-md transition-all cursor-pointer relative shrink-0 ${
        isActive
          ? 'bg-blue-600 text-white shadow-xs'
          : isOpen
          ? 'bg-slate-200 text-slate-800'
          : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200/60'
      }`}
      title="กรองข้อมูลคอลัมน์นี้"
    >
      <Filter className="w-3.5 h-3.5" />
      {isActive && (
        <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-emerald-400 rounded-full ring-2 ring-white" />
      )}
    </button>
  )
}

// ----------------------------------------------------
// UI: Popover Content per Column
// ----------------------------------------------------
export function ColumnFilterPopover({
  columnKey,
  filters,
  branches,
  saleNames,
  orderPrefixes,
  onClose,
  onChange,
  align = 'left',
}: {
  columnKey: string
  filters: SalesFilters
  branches: { id: number; branch_name: string }[]
  saleNames: string[]
  orderPrefixes?: { prefix: string; count: number }[]
  onClose: () => void
  onChange: (updater: (prev: SalesFilters) => SalesFilters) => void
  align?: 'left' | 'right'
}) {
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [onClose])

  const renderContent = () => {
    switch (columnKey) {
      // 1) เลขที่ใบขาย & สาขา & รูปแบบจัดส่ง
      case 'orderCode':
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">ค้นหาเลขที่ใบขาย</label>
              <input
                type="text"
                placeholder="เช่น SO-2026..."
                value={filters.orderCode}
                onChange={(e) => onChange(p => ({ ...p, orderCode: e.target.value }))}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:bg-white focus:border-blue-500"
              />
            </div>

            {/* รหัสหน้าใบขาย 4 ตัวแรก (Prefix) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-slate-500">รหัสหน้า 4 ตัวแรก (Prefix)</label>
                {filters.orderCodePrefix && (
                  <button
                    type="button"
                    onClick={() => onChange(p => ({ ...p, orderCodePrefix: '' }))}
                    className="text-[10px] text-blue-600 hover:underline"
                  >
                    ล้างรหัสหน้า
                  </button>
                )}
              </div>
              <input
                type="text"
                placeholder="เช่น YING, LAD0, JAY..."
                value={filters.orderCodePrefix}
                onChange={(e) => onChange(p => ({ ...p, orderCodePrefix: e.target.value.toUpperCase() }))}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-blue-500 uppercase tracking-wider mb-1.5"
              />
              {orderPrefixes && orderPrefixes.length > 0 && (
                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pt-0.5">
                  {orderPrefixes.slice(0, 10).map(({ prefix, count }) => (
                    <button
                      key={prefix}
                      type="button"
                      onClick={() => onChange(p => ({ ...p, orderCodePrefix: p.orderCodePrefix === prefix ? '' : prefix }))}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                        filters.orderCodePrefix === prefix
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                      title={`${prefix} (${count} บิล)`}
                    >
                      {prefix} ({count})
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">สาขาที่ออกบิล</label>
              <select
                value={filters.branchId}
                onChange={(e) => onChange(p => ({ ...p, branchId: e.target.value === 'ALL' ? 'ALL' : Number(e.target.value) }))}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none cursor-pointer"
              >
                <option value="ALL">รวมทุกสาขา</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.branch_name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">รูปแบบการขาย/รับสินค้า</label>
              <div className="grid grid-cols-3 gap-1">
                {(['ALL', 'DELIVERY', 'PICKUP'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => onChange(p => ({ ...p, shippingType: type }))}
                    className={`py-1 px-1.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                      filters.shippingType === type
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {type === 'ALL' ? 'ทั้งหมด' : type === 'DELIVERY' ? 'ส่งบ้าน' : 'หิ้วกลับ'}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 flex justify-between border-t border-slate-100">
              <button
                type="button"
                onClick={() => onChange(p => ({ ...p, orderCode: '', orderCodePrefix: '', branchId: 'ALL', shippingType: 'ALL' }))}
                className="text-xs font-bold text-slate-500 hover:text-red-600"
              >
                ล้างคอลัมน์นี้
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800"
              >
                ตกลง
              </button>
            </div>
          </div>
        )

      // 2) วันที่เปิดบิล
      case 'createdAt':
      // 3) วันที่ขายจริง (ปิดบิล)
      case 'completedDate': {
        const target = columnKey === 'completedDate' ? 'completedDate' : 'createdDate'
        const dateConfig = filters[target]
        const updateDate = (patch: Partial<DateFilterConfig>) => {
          onChange(p => ({
            ...p,
            [target]: { ...p[target], ...patch },
          }))
        }

        return (
          <div className="space-y-3 min-w-[280px]">
            {/* โหมดเลือกวันที่ */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">โหมดการกรอง</label>
              <div className="grid grid-cols-4 gap-1">
                {(['ALL', 'MONTH', 'DAY', 'RANGE'] as const).map(mode => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => updateDate({ mode })}
                    className={`py-1 px-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                      dateConfig.mode === mode
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {mode === 'ALL' ? 'ทั้งหมด' : mode === 'MONTH' ? 'เดือน' : mode === 'DAY' ? 'วัน' : 'ช่วงวันที่'}
                  </button>
                ))}
              </div>
            </div>

            {/* ถ้าเป็นโหมด MONTH */}
            {dateConfig.mode === 'MONTH' && (
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-500">เลื่อนเดือน</label>
                <div className="flex items-center justify-between bg-slate-50 border border-slate-200 p-1.5 rounded-xl">
                  <button
                    type="button"
                    onClick={() => updateDate({ month: prevMonth(dateConfig.month) })}
                    className="p-1 rounded hover:bg-slate-200 text-slate-700 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-black text-slate-800">
                    {formatThaiMonth(dateConfig.month)}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateDate({ month: nextMonth(dateConfig.month) })}
                    className="p-1 rounded hover:bg-slate-200 text-slate-700 cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ถ้าเป็นโหมด DAY */}
            {dateConfig.mode === 'DAY' && (
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-500">เลื่อนวัน</label>
                <div className="flex items-center justify-between bg-slate-50 border border-slate-200 p-1.5 rounded-xl">
                  <button
                    type="button"
                    onClick={() => updateDate({ day: prevDay(dateConfig.day) })}
                    className="p-1 rounded hover:bg-slate-200 text-slate-700 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-black text-slate-800">
                    {formatThaiDateShort(dateConfig.day)}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateDate({ day: nextDay(dateConfig.day) })}
                    className="p-1 rounded hover:bg-slate-200 text-slate-700 cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <input
                  type="date"
                  value={dateConfig.day}
                  onChange={(e) => updateDate({ day: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none"
                />
              </div>
            )}

            {/* ถ้าเป็นโหมด RANGE */}
            {dateConfig.mode === 'RANGE' && (
              <div className="space-y-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-0.5">จากวันที่</label>
                  <input
                    type="date"
                    value={dateConfig.startDate}
                    onChange={(e) => updateDate({ startDate: e.target.value })}
                    className="w-full px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-0.5">ถึงวันที่</label>
                  <input
                    type="date"
                    value={dateConfig.endDate}
                    onChange={(e) => updateDate({ endDate: e.target.value })}
                    className="w-full px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none"
                  />
                </div>
              </div>
            )}

            {/* ปุ่มลัด */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">ปุ่มลัด</label>
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => updateDate({ mode: 'TODAY' })}
                  className="px-2 py-0.5 text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md"
                >
                  วันนี้
                </button>
                <button
                  type="button"
                  onClick={() => updateDate({ mode: 'YESTERDAY' })}
                  className="px-2 py-0.5 text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md"
                >
                  เมื่อวาน
                </button>
                <button
                  type="button"
                  onClick={() => updateDate({ mode: 'LAST_7_DAYS' })}
                  className="px-2 py-0.5 text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md"
                >
                  7 วันล่าสุด
                </button>
                <button
                  type="button"
                  onClick={() => updateDate({ mode: 'MONTH', month: getCurrentThaiMonthString() })}
                  className="px-2 py-0.5 text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md"
                >
                  เดือนนี้
                </button>
                <button
                  type="button"
                  onClick={() => updateDate({ mode: 'LAST_MONTH' })}
                  className="px-2 py-0.5 text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md"
                >
                  เดือนก่อน
                </button>
              </div>
            </div>

            <div className="pt-2 flex justify-between border-t border-slate-100">
              <button
                type="button"
                onClick={() => updateDate(createDefaultDateConfig())}
                className="text-xs font-bold text-slate-500 hover:text-red-600"
              >
                ล้างตัวกรอง
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800"
              >
                ตกลง
              </button>
            </div>
          </div>
        )
      }

      // 4) พนักงานขาย (Sale)
      case 'saleName':
        return (
          <div className="space-y-3 min-w-[240px]">
            <label className="block text-[11px] font-bold text-slate-500">เลือกพนักงานขาย</label>
            <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
              <button
                type="button"
                onClick={() => onChange(p => ({ ...p, saleName: 'ALL' }))}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between ${
                  filters.saleName === 'ALL' ? 'bg-blue-50 text-blue-700 font-bold' : 'hover:bg-slate-50 text-slate-700'
                }`}
              >
                <span>แสดงพนักงานขายทุกคน</span>
                {filters.saleName === 'ALL' && <Check className="w-3.5 h-3.5 text-blue-600" />}
              </button>
              {saleNames.map(name => (
                <button
                  key={name}
                  type="button"
                  onClick={() => onChange(p => ({ ...p, saleName: name }))}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between ${
                    filters.saleName === name ? 'bg-blue-50 text-blue-700 font-bold' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <span>{name}</span>
                  {filters.saleName === name && <Check className="w-3.5 h-3.5 text-blue-600" />}
                </button>
              ))}
            </div>

            <div className="pt-2 flex justify-between border-t border-slate-100">
              <button
                type="button"
                onClick={() => onChange(p => ({ ...p, saleName: 'ALL' }))}
                className="text-xs font-bold text-slate-500 hover:text-red-600"
              >
                ล้าง
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800"
              >
                ตกลง
              </button>
            </div>
          </div>
        )

      // 5) สถานะใบขาย
      case 'status':
        return (
          <div className="space-y-3 min-w-[220px]">
            <label className="block text-[11px] font-bold text-slate-500">เลือกสถานะใบขาย</label>
            <div className="space-y-1">
              {[
                { value: 'ALL', label: 'ทั้งหมดทุกสถานะ' },
                { value: 'COMPLETED', label: 'ขายสำเร็จแล้ว' },
                { value: 'PENDING', label: 'ยังไม่คิดเงิน / รอจัดส่ง' },
                { value: 'CANCELLED', label: 'ยกเลิกแล้ว' },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onChange(p => ({ ...p, status: opt.value as any }))}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between ${
                    filters.status === opt.value ? 'bg-blue-50 text-blue-700 font-bold' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <span>{opt.label}</span>
                  {filters.status === opt.value && <Check className="w-3.5 h-3.5 text-blue-600" />}
                </button>
              ))}
            </div>

            <div className="pt-2 flex justify-between border-t border-slate-100">
              <button
                type="button"
                onClick={() => onChange(p => ({ ...p, status: 'ALL' }))}
                className="text-xs font-bold text-slate-500 hover:text-red-600"
              >
                ล้าง
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800"
              >
                ตกลง
              </button>
            </div>
          </div>
        )

      // 6) ยอดรับเงินลูกค้า (Total Amount)
      case 'totalAmount':
        return (
          <div className="space-y-3 min-w-[240px]">
            <label className="block text-[11px] font-bold text-slate-500">ช่วงยอดรับเงินลูกค้า (รวม VAT)</label>
            <div className="space-y-2">
              <div>
                <label className="block text-[10px] text-slate-400 mb-0.5">ยอดขั้นต่ำ (฿)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={filters.minTotalAmount}
                  onChange={(e) => onChange(p => ({ ...p, minTotalAmount: e.target.value }))}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-0.5">ยอดสูงสุด (฿)</label>
                <input
                  type="number"
                  placeholder="เช่น 50000"
                  value={filters.maxTotalAmount}
                  onChange={(e) => onChange(p => ({ ...p, maxTotalAmount: e.target.value }))}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-between border-t border-slate-100">
              <button
                type="button"
                onClick={() => onChange(p => ({ ...p, minTotalAmount: '', maxTotalAmount: '' }))}
                className="text-xs font-bold text-slate-500 hover:text-red-600"
              >
                ล้าง
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800"
              >
                ตกลง
              </button>
            </div>
          </div>
        )

      // 7) ยอดเงินเข้าร้านก่อน VAT (Net Revenue)
      case 'netBeforeVat':
        return (
          <div className="space-y-3 min-w-[240px]">
            <label className="block text-[11px] font-bold text-slate-500">ช่วงยอดเงินแท้จริงเข้าร้าน (ก่อน VAT)</label>
            <div className="space-y-2">
              <div>
                <label className="block text-[10px] text-slate-400 mb-0.5">ยอดขั้นต่ำ (฿)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={filters.minNetRevenue}
                  onChange={(e) => onChange(p => ({ ...p, minNetRevenue: e.target.value }))}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-0.5">ยอดสูงสุด (฿)</label>
                <input
                  type="number"
                  placeholder="เช่น 50000"
                  value={filters.maxNetRevenue}
                  onChange={(e) => onChange(p => ({ ...p, maxNetRevenue: e.target.value }))}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-between border-t border-slate-100">
              <button
                type="button"
                onClick={() => onChange(p => ({ ...p, minNetRevenue: '', maxNetRevenue: '' }))}
                className="text-xs font-bold text-slate-500 hover:text-red-600"
              >
                ล้าง
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800"
              >
                ตกลง
              </button>
            </div>
          </div>
        )

      // 8) ยอดข้ามสาขา (Drop Ship)
      case 'dropShip':
        return (
          <div className="space-y-3 min-w-[220px]">
            <label className="block text-[11px] font-bold text-slate-500">ยอดข้ามสาขา (Drop Ship)</label>
            <div className="space-y-1">
              {[
                { value: 'ALL', label: 'ทั้งหมด' },
                { value: 'HAS_DROPSHIP', label: 'มีรายการข้ามสาขา (> 0)' },
                { value: 'NO_DROPSHIP', label: 'ไม่มีรายการข้ามสาขา' },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onChange(p => ({ ...p, dropShip: opt.value as any }))}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between ${
                    filters.dropShip === opt.value ? 'bg-blue-50 text-blue-700 font-bold' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <span>{opt.label}</span>
                  {filters.dropShip === opt.value && <Check className="w-3.5 h-3.5 text-blue-600" />}
                </button>
              ))}
            </div>

            <div className="pt-2 flex justify-between border-t border-slate-100">
              <button
                type="button"
                onClick={() => onChange(p => ({ ...p, dropShip: 'ALL' }))}
                className="text-xs font-bold text-slate-500 hover:text-red-600"
              >
                ล้าง
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800"
              >
                ตกลง
              </button>
            </div>
          </div>
        )

      // 9) ส่วนลด
      case 'discount':
        return (
          <div className="space-y-3 min-w-[220px]">
            <label className="block text-[11px] font-bold text-slate-500">ส่วนลดบิล</label>
            <div className="space-y-1">
              {[
                { value: 'ALL', label: 'ทั้งหมด' },
                { value: 'YES', label: 'มีส่วนลด (> 0)' },
                { value: 'NO', label: 'ไม่ได้รับส่วนลด (0%)' },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onChange(p => ({ ...p, hasDiscount: opt.value as any }))}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between ${
                    filters.hasDiscount === opt.value ? 'bg-blue-50 text-blue-700 font-bold' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <span>{opt.label}</span>
                  {filters.hasDiscount === opt.value && <Check className="w-3.5 h-3.5 text-blue-600" />}
                </button>
              ))}
            </div>

            <div className="pt-2 flex justify-between border-t border-slate-100">
              <button
                type="button"
                onClick={() => onChange(p => ({ ...p, hasDiscount: 'ALL' }))}
                className="text-xs font-bold text-slate-500 hover:text-red-600"
              >
                ล้าง
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800"
              >
                ตกลง
              </button>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div
      ref={popoverRef}
      className={`filter-popover-container absolute top-full mt-1.5 z-50 bg-white rounded-2xl border border-slate-200 shadow-xl p-3.5 min-w-[240px] text-left font-normal normal-case ${
        align === 'right' ? 'right-0' : 'left-0'
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      {renderContent()}
    </div>
  )
}
