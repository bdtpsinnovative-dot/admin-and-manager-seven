import { supabaseAdmin } from "./supabase/admin"

export type HourlyConcurrentPoint = {
  hour: number // 0..23
  label: string // "00:00"
  hourRangeLabel: string // "00:00 - 01:00"
  sessionsCount: number
  peakConcurrent: number
  mobile: number
  desktop: number
}

export type DayConcurrentMetrics = {
  dateStr: string // "YYYY-MM-DD"
  thaiDateLabel: string // e.g. "ศุกร์ 2 ต.ค. 2026"
  totalSessions: number
  dayPeak: number
  dayPeakHour: number
  dayPeakHourLabel: string // "11:00 - 12:00 น."
  peakMobilePercent: number
  peakDesktopPercent: number
  activeHoursCount: number
  averageConcurrent: number
  hourly: HourlyConcurrentPoint[]
  topPeakHours: HourlyConcurrentPoint[]
  isToday: boolean
}

// In-memory live peak cache for current day
const livePeakCache = new Map<string, { peak: number; mobile: number; desktop: number }>()

function getBangkokDateStr(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date)
  return parts // "YYYY-MM-DD"
}

function getBangkokHour(date: Date = new Date()): number {
  const str = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Bangkok",
    hour: "numeric",
    hourCycle: "h23",
  }).format(date)
  return parseInt(str, 10) || 0
}

function formatThaiDate(dateStr: string): string {
  try {
    const d = new Date(`${dateStr}T12:00:00+07:00`)
    return new Intl.DateTimeFormat("th-TH", {
      timeZone: "Asia/Bangkok",
      weekday: "long",
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(d)
  } catch {
    return dateStr
  }
}

function getBangkokDayBounds(dateStr: string) {
  const startUtc = new Date(`${dateStr}T00:00:00+07:00`)
  const endUtc = new Date(startUtc.getTime() + 24 * 3600000)
  return { startUtc, endUtc }
}

/**
 * Record a live concurrent presence snapshot from LiveAudienceWidget
 */
export async function recordLiveConcurrentPeak(
  count: number,
  mobileCount = 0,
  desktopCount = 0
): Promise<void> {
  if (count <= 0) return

  const todayStr = getBangkokDateStr()
  const currentHour = getBangkokHour()
  const key = `${todayStr}:${currentHour}`

  const existing = livePeakCache.get(key)
  if (!existing || count > existing.peak) {
    livePeakCache.set(key, {
      peak: count,
      mobile: mobileCount,
      desktop: desktopCount,
    })
  }
}

/**
 * Calculate concurrent metrics for a given Bangkok date
 */
export async function calculateHourlyConcurrentForDate(
  dateStr?: string
): Promise<DayConcurrentMetrics> {
  const todayStr = getBangkokDateStr()
  const targetDateStr = dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? dateStr : todayStr
  const isToday = targetDateStr === todayStr

  // If viewing past date, check archive first in system_settings
  if (!isToday) {
    try {
      const { data: setting } = await supabaseAdmin
        .from("system_settings")
        .select("value")
        .eq("key", `concurrent_metrics:${targetDateStr}`)
        .maybeSingle()

      if (setting?.value && typeof setting.value === "object") {
        return setting.value as DayConcurrentMetrics
      }
    } catch (err) {
      console.warn("[algorithm-concurrent] archive lookup warning:", err)
    }
  }

  // Calculate from algorithm_sessions
  const { startUtc, endUtc } = getBangkokDayBounds(targetDateStr)

  const { data: rawSessions, error } = await supabaseAdmin
    .from("algorithm_sessions")
    .select("session_id, first_seen_at, last_activity_at, device_type")
    .gte("first_seen_at", startUtc.toISOString())
    .lt("first_seen_at", endUtc.toISOString())
    .order("first_seen_at", { ascending: true })

  if (error) {
    console.error("[algorithm-concurrent] query failed:", error)
    throw new Error(error.message)
  }

  const sessions = rawSessions || []
  const currentHourNow = isToday ? getBangkokHour() : -1

  const hourly: HourlyConcurrentPoint[] = []
  let dayMax = 0
  let dayMaxHour = 0
  let totalActiveHours = 0
  let sumConcurrent = 0

  for (let h = 0; h < 24; h++) {
    const hStart = startUtc.getTime() + h * 3600000
    const hEnd = hStart + 3600000

    let sessionsCount = 0
    let mobile = 0
    let desktop = 0
    const sweepEvents: Array<{ time: number; type: 1 | -1 }> = []

    for (const s of sessions) {
      const sStart = new Date(s.first_seen_at).getTime()
      // If session had activity, window is up to last_activity_at; minimum active duration is 60s
      const sEnd = Math.max(new Date(s.last_activity_at || s.first_seen_at).getTime(), sStart + 60000)

      if (sStart < hEnd && sEnd > hStart) {
        sessionsCount++
        if (s.device_type === "mobile") mobile++
        else desktop++

        sweepEvents.push({ time: Math.max(sStart, hStart), type: 1 })
        sweepEvents.push({ time: Math.min(sEnd, hEnd), type: -1 })
      }
    }

    sweepEvents.sort((a, b) => a.time - b.time || b.type - a.type)
    let cur = 0
    let peak = 0
    for (const ev of sweepEvents) {
      cur += ev.type
      if (cur > peak) peak = cur
    }

    // Merge in-memory live peak if today and matching current hour
    if (isToday && h === currentHourNow) {
      const livePeak = livePeakCache.get(`${targetDateStr}:${h}`)
      if (livePeak && livePeak.peak > peak) {
        peak = livePeak.peak
        mobile = Math.max(mobile, livePeak.mobile)
        desktop = Math.max(desktop, livePeak.desktop)
      }
    }

    if (peak > dayMax) {
      dayMax = peak
      dayMaxHour = h
    }

    if (peak > 0) {
      totalActiveHours++
      sumConcurrent += peak
    }

    const hourStr = String(h).padStart(2, "0")
    const nextHourStr = String((h + 1) % 24).padStart(2, "0")

    hourly.push({
      hour: h,
      label: `${hourStr}:00`,
      hourRangeLabel: `${hourStr}:00 - ${nextHourStr}:00`,
      sessionsCount,
      peakConcurrent: peak,
      mobile,
      desktop,
    })
  }

  const topPeakHours = [...hourly]
    .filter((h) => h.peakConcurrent > 0)
    .sort((a, b) => b.peakConcurrent - a.peakConcurrent || b.sessionsCount - a.sessionsCount)
    .slice(0, 5)

  const peakPoint = hourly[dayMaxHour]
  const peakTotalDevice = (peakPoint?.mobile || 0) + (peakPoint?.desktop || 0)
  const peakMobilePercent = peakTotalDevice > 0 ? Math.round(((peakPoint?.mobile || 0) / peakTotalDevice) * 100) : 0
  const peakDesktopPercent = peakTotalDevice > 0 ? 100 - peakMobilePercent : 0

  const startHourStr = String(dayMaxHour).padStart(2, "0")
  const endHourStr = String((dayMaxHour + 1) % 24).padStart(2, "0")

  const result: DayConcurrentMetrics = {
    dateStr: targetDateStr,
    thaiDateLabel: formatThaiDate(targetDateStr),
    totalSessions: sessions.length,
    dayPeak: dayMax,
    dayPeakHour: dayMaxHour,
    dayPeakHourLabel: `${startHourStr}:00 - ${endHourStr}:00 น.`,
    peakMobilePercent,
    peakDesktopPercent,
    activeHoursCount: totalActiveHours,
    averageConcurrent: totalActiveHours > 0 ? Math.round((sumConcurrent / totalActiveHours) * 10) / 10 : 0,
    hourly,
    topPeakHours,
    isToday,
  }

  // If past date, archive in system_settings so we never need to recompute from raw sessions
  if (!isToday && sessions.length > 0) {
    try {
      await supabaseAdmin.from("system_settings").upsert({
        key: `concurrent_metrics:${targetDateStr}`,
        value: result,
        updated_at: new Date().toISOString(),
      })
    } catch (saveErr) {
      console.warn("[algorithm-concurrent] save archive warning:", saveErr)
    }
  }

  return result
}

/**
 * Get available dates list that have concurrent session data
 */
export async function getAvailableConcurrentDates(): Promise<Array<{ date: string; label: string }>> {
  const todayStr = getBangkokDateStr()
  const dates: Array<{ date: string; label: string }> = []

  // Generate last 10 days
  for (let i = 0; i < 10; i++) {
    const d = new Date(Date.now() - i * 24 * 3600000)
    const dateStr = getBangkokDateStr(d)
    const label = i === 0 ? "วันนี้ (Today)" : i === 1 ? "เมื่อวาน (Yesterday)" : formatThaiDate(dateStr)
    dates.push({ date: dateStr, label })
  }

  return dates
}
