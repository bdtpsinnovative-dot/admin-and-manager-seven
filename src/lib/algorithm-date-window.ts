export type DateWindowType = "preset" | "month" | "custom"

export type ResolvedDateWindow = {
  type: DateWindowType
  rangeDays: number
  offset: number
  monthKey?: string
  fromDate?: string
  toDate?: string
  startTime: string
  endTime: string
  daysCount: number
  label: string
}

const THAI_MONTHS = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
]

export function getThaiMonthLabel(monthKey: string): string {
  const [yearStr, monthStr] = monthKey.split("-")
  const mIndex = parseInt(monthStr, 10) - 1
  const year = parseInt(yearStr, 10)
  return `${THAI_MONTHS[mIndex] || monthStr} ${year}`
}

export function getAvailableMonths(): Array<{ key: string; label: string }> {
  // Returns list of past available months
  return [
    { key: "2026-10", label: "ตุลาคม 2026 (เดือนปัจจุบัน)" },
    { key: "2026-09", label: "กันยายน 2026 (เดือนที่แล้ว)" },
    { key: "2026-08", label: "สิงหาคม 2026" },
  ]
}

export function resolveDateWindow(params: {
  range?: string | number | string[]
  month?: string | string[]
  from?: string | string[]
  to?: string | string[]
  offset?: string | number | string[]
}): ResolvedDateWindow {
  const now = new Date()
  const monthParam = typeof params.month === "string" ? params.month : Array.isArray(params.month) ? params.month[0] : undefined
  const fromParam = typeof params.from === "string" ? params.from : Array.isArray(params.from) ? params.from[0] : undefined
  const toParam = typeof params.to === "string" ? params.to : Array.isArray(params.to) ? params.to[0] : undefined
  const rangeParam = typeof params.range === "string" ? Number(params.range) : typeof params.range === "number" ? params.range : undefined
  const offsetParam = typeof params.offset === "string" ? Math.max(0, parseInt(params.offset, 10) || 0) : typeof params.offset === "number" ? params.offset : 0

  // 1. Month Mode (?month=2026-09)
  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    const [yearStr, monthStr] = monthParam.split("-")
    const year = parseInt(yearStr, 10)
    const month = parseInt(monthStr, 10)

    const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0))
    // Last day of month
    const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999))
    const clampedEnd = end.getTime() > now.getTime() ? now : end
    const daysCount = Math.max(1, Math.round((clampedEnd.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)))

    return {
      type: "month",
      rangeDays: daysCount,
      offset: 0,
      monthKey: monthParam,
      startTime: start.toISOString(),
      endTime: clampedEnd.toISOString(),
      daysCount,
      label: `เดือน ${getThaiMonthLabel(monthParam)}`,
    }
  }

  // 2. Custom Date Range Mode (?from=2026-09-01&to=2026-09-20)
  if (fromParam && toParam && /^\d{4}-\d{2}-\d{2}$/.test(fromParam) && /^\d{4}-\d{2}-\d{2}$/.test(toParam)) {
    const start = new Date(`${fromParam}T00:00:00.000Z`)
    const end = new Date(`${toParam}T23:59:59.999Z`)
    const clampedEnd = end.getTime() > now.getTime() ? now : end
    const daysCount = Math.max(1, Math.round((clampedEnd.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)))

    return {
      type: "custom",
      rangeDays: daysCount,
      offset: 0,
      fromDate: fromParam,
      toDate: toParam,
      startTime: start.toISOString(),
      endTime: clampedEnd.toISOString(),
      daysCount,
      label: `${fromParam} – ${toParam}`,
    }
  }

  // 3. Preset Range Mode (24 ชม, 7 วัน, 30 วัน, 60 วัน, 90 วัน)
  const allowedRanges = [1, 7, 30, 60, 90]
  const rangeDays = rangeParam && allowedRanges.includes(rangeParam) ? rangeParam : 30
  const offset = offsetParam || 0

  const windowMs = rangeDays === 1 ? 24 * 60 * 60 * 1000 : rangeDays * 24 * 60 * 60 * 1000
  const end = offset > 0 ? new Date(now.getTime() - offset * windowMs) : now
  const start = new Date(end.getTime() - windowMs)

  return {
    type: "preset",
    rangeDays,
    offset,
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    daysCount: rangeDays,
    label: rangeDays === 1 ? "24 ชั่วโมงล่าสุด" : `${rangeDays} วันล่าสุด`,
  }
}
