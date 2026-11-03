export interface PeriodFilterState {
  type: "daily" | "monthly" | "yearly" | "custom" | "all"
  preset?: string
  date?: string
  startDate?: string
  endDate?: string
  month?: string // "YYYY-MM"
  year?: string  // "YYYY"
  label: string
}

export interface ParsedDashboardPeriod {
  filterState: PeriodFilterState
  dateFrom: string | undefined
  dateTo: string | undefined
  displayLabel: string
  shortLabel: string
}

export function parseDashboardPeriod(params?: {
  period?: string | string[];
  date?: string | string[];
  startDate?: string | string[];
  endDate?: string | string[];
  month?: string | string[];
  year?: string | string[];
  preset?: string | string[];
}): ParsedDashboardPeriod {
  const getStr = (val: string | string[] | undefined): string | undefined =>
    typeof val === "string" ? val : Array.isArray(val) && typeof val[0] === "string" ? val[0] : undefined

  const period = getStr(params?.period)
  const date = getStr(params?.date)
  const startDate = getStr(params?.startDate)
  const endDate = getStr(params?.endDate)
  const month = getStr(params?.month)
  const year = getStr(params?.year)
  const preset = getStr(params?.preset)

  const now = new Date()
  const toLocalIso = (d: Date) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, "0")
    const day = String(d.getDate()).padStart(2, "0")
    return `${y}-${m}-${day}`
  }

  // 1. ระดับ "รายวัน" (Daily) หรือ "วันเดี่ยว"
  if (period === "daily" || (date && /^\d{4}-\d{2}-\d{2}$/.test(date))) {
    const targetDate = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : toLocalIso(now)
    const [y, m, d] = targetDate.split("-").map(Number)
    const dt = new Date(y, m - 1, d)
    const formatted = dt.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })

    const label = formatted
    return {
      filterState: {
        type: "daily",
        preset,
        date: targetDate,
        label,
      },
      dateFrom: `${targetDate}T00:00:00+07:00`,
      dateTo: `${targetDate}T23:59:59+07:00`,
      displayLabel: label,
      shortLabel: formatted,
    }
  }

  // 2. ระดับ "ช่วงวันที่" (Custom Date Range)
  if (period === "custom" || (startDate && endDate && /^\d{4}-\d{2}-\d{2}$/.test(startDate) && /^\d{4}-\d{2}-\d{2}$/.test(endDate))) {
    const sDate = startDate || toLocalIso(now)
    const eDate = endDate || toLocalIso(now)
    const [sy, sm, sd] = sDate.split("-").map(Number)
    const [ey, em, ed] = eDate.split("-").map(Number)
    const sDt = new Date(sy, sm - 1, sd)
    const eDt = new Date(ey, em - 1, ed)
    const sFormatted = sDt.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: sy !== ey ? "numeric" : undefined })
    const eFormatted = eDt.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })

    const label = `${sFormatted} – ${eFormatted}`
    return {
      filterState: {
        type: "custom",
        preset,
        startDate: sDate,
        endDate: eDate,
        label,
      },
      dateFrom: `${sDate}T00:00:00+07:00`,
      dateTo: `${eDate}T23:59:59+07:00`,
      displayLabel: label,
      shortLabel: label,
    }
  }

  // 3. ระดับ "รายปี" (Yearly)
  if (period === "yearly" || (year && /^\d{4}$/.test(year))) {
    const targetYear = year && /^\d{4}$/.test(year) ? Number(year) : now.getFullYear()
    const thaiYear = targetYear + 543
    const label = `ปี พ.ศ. ${thaiYear}`
    return {
      filterState: {
        type: "yearly",
        preset,
        year: String(targetYear),
        label,
      },
      dateFrom: `${targetYear}-01-01T00:00:00+07:00`,
      dateTo: `${targetYear}-12-31T23:59:59+07:00`,
      displayLabel: label,
      shortLabel: label,
    }
  }

  // 4. ระดับ "รายเดือน" (Monthly) - รองรับ month=YYYY-MM เดิมด้วย
  if (period === "monthly" || (month && /^\d{4}-\d{2}$/.test(month))) {
    const targetMonth = month && /^\d{4}-\d{2}$/.test(month) ? month : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
    const [y, m] = targetMonth.split("-").map(Number)
    const lastDay = new Date(y, m, 0).getDate()
    const dt = new Date(y, m - 1, 1)
    const formatted = dt.toLocaleDateString("th-TH", { month: "long", year: "numeric" })
    const label = formatted

    return {
      filterState: {
        type: "monthly",
        preset,
        month: targetMonth,
        label,
      },
      dateFrom: `${targetMonth}-01T00:00:00+07:00`,
      dateTo: `${targetMonth}-${String(lastDay).padStart(2, "0")}T23:59:59+07:00`,
      displayLabel: label,
      shortLabel: formatted,
    }
  }

  // 5. ค่าเริ่มต้น: "ทุกช่วงเวลา" (All Time)
  return {
    filterState: {
      type: "all",
      label: "ทุกช่วงเวลา",
    },
    dateFrom: undefined,
    dateTo: undefined,
    displayLabel: "ทุกช่วงเวลา",
    shortLabel: "ทุกช่วงเวลา",
  }
}
