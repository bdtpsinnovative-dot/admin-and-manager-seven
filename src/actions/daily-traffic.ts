"use server"

import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { normalizeLocation, sanitizeCategoryName } from "@/lib/algorithm-normalization"
import type { AlgorithmRange } from "./algorithm"
import type { AudienceBreakdownItem } from "./audience-analytics"

export type DailyTopProduct = {
  id: number
  name: string
  sku: string | null
  imageUrl: string | null
  views: number
}

export type DayAnalytics = {
  dateKey: string // YYYY-MM-DD
  dateLabel: string // e.g. "พุธ 25 มี.ค. 2026"
  shortDate: string // e.g. "25 มี.ค."
  totalViews: number
  uniqueViews: number
  sources: AudienceBreakdownItem[]
  devices: AudienceBreakdownItem[]
  browsers: AudienceBreakdownItem[]
  hourly: Array<{ hour: number; views: number }>
  topProducts: DailyTopProduct[]
}

export type DailyTrafficAnalytics = {
  rangeDays: AlgorithmRange
  offset: number
  startTime: string
  endTime: string
  generatedAt: string
  totalViews: number
  totalUniqueViews: number
  peakDay: { date: string; views: number } | null
  averageViewsPerDay: number
  topSourceOverall: AudienceBreakdownItem | null
  topDeviceOverall: AudienceBreakdownItem | null
  topBrowserOverall: AudienceBreakdownItem | null
  days: DayAnalytics[]
  error: string | null
}

const dayInMs = 24 * 60 * 60 * 1000

function normalizeRange(value: number): AlgorithmRange {
  return value === 1 || value === 7 ? value : 30
}

function formatThaiDate(dateStr: string, format: "short" | "full" = "full"): string {
  try {
    const d = new Date(dateStr)
    if (format === "short") {
      return new Intl.DateTimeFormat("th-TH", {
        timeZone: "Asia/Bangkok",
        day: "numeric",
        month: "short",
      }).format(d)
    }
    return new Intl.DateTimeFormat("th-TH", {
      timeZone: "Asia/Bangkok",
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(d)
  } catch {
    return dateStr
  }
}

function getBangkokDateKey(dateValue: string): string {
  try {
    const d = new Date(dateValue)
    // Format YYYY-MM-DD in Asia/Bangkok
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Bangkok",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d)
  } catch {
    return dateValue.slice(0, 10)
  }
}

function getBangkokHour(dateValue: string): number {
  try {
    const d = new Date(dateValue)
    const str = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Bangkok",
      hour: "numeric",
      hourCycle: "h23",
    }).format(d)
    const hour = parseInt(str, 10)
    return Number.isFinite(hour) ? hour : 0
  } catch {
    return new Date(dateValue).getUTCHours()
  }
}

function formatDevice(device: string | null | undefined): string {
  const raw = device?.trim().toLowerCase()
  if (!raw) return "ไม่ระบุอุปกรณ์"
  if (raw === "mobile" || raw === "smartphone") return "มือถือ (Mobile)"
  if (raw === "desktop" || raw === "pc" || raw === "computer") return "คอมพิวเตอร์ (Desktop)"
  if (raw === "tablet" || raw === "ipad") return "แท็บเล็ต (Tablet)"
  return device?.trim() || "ไม่ระบุอุปกรณ์"
}

function formatBrowser(browser: string | null | undefined): string {
  const raw = browser?.trim()
  if (!raw) return "ไม่ระบุ Browser"
  if (/mobile safari/i.test(raw)) return "Safari (Mobile)"
  return raw
}

function sourceWithDetail(source: string | null, metadata: Record<string, unknown> | null, referrerHost: string | null) {
  if (!source) return "Direct"
  const trimmed = source.trim()
  // Clean up sanitization or dummy artifacts
  if (!trimmed || trimmed === "null" || trimmed === "undefined" || trimmed.toLowerCase().includes("sanitized")) {
    return "Direct"
  }
  // Ignore 2-letter language codes erroneously logged as sources (e.g. 'th', 'en')
  if (/^[a-z]{2}$/i.test(trimmed)) {
    return "Direct"
  }
  if (trimmed !== "Referral") return trimmed
  const detail = metadata && typeof metadata.source_detail === "string" ? metadata.source_detail : referrerHost
  return detail ? `Referral · ${detail}` : "Referral"
}

function calculateBreakdownList(items: string[]): AudienceBreakdownItem[] {
  const counts = new Map<string, number>()
  for (const item of items) {
    counts.set(item, (counts.get(item) || 0) + 1)
  }
  const total = items.length
  return Array.from(counts.entries())
    .map(([name, count]) => ({
      name,
      count,
      share: total > 0 ? Math.round((count / total) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
}

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("กรุณาเข้าสู่ระบบ Admin")
  const { data: profile } = await supabase.from("profiles").select("role").eq("user_id", user.id).maybeSingle()
  if (!profile || !["admin", "super_admin"].includes(String(profile.role))) throw new Error("ไม่มีสิทธิ์ดูข้อมูล Analytics")
}

const cache = new Map<string, { data: DailyTrafficAnalytics; expiresAt: number }>()
const CACHE_TTL_MS = 2 * 60 * 1000 // 2 minutes

export async function getDailyTrafficAnalytics(
  rangeValue: number,
  offset: number = 0
): Promise<DailyTrafficAnalytics> {
  await requireAdmin()
  const rangeDays = normalizeRange(rangeValue)
  const safeOffset = Math.max(0, Number(offset) || 0)

  const cacheKey = `${rangeDays}:${safeOffset}`
  const cached = cache.get(cacheKey)
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data
  }

  const windowMs = rangeDays === 1 ? 24 * 60 * 60 * 1000 : rangeDays * dayInMs
  const endTime = safeOffset > 0 ? new Date(Date.now() - safeOffset * windowMs).toISOString() : new Date().toISOString()
  const cutoff = new Date(new Date(endTime).getTime() - windowMs).toISOString()

  try {
    // 1. Fetch countable events within time range with pagination (bypass Supabase 1000 limit)
    const pageSize = 1000
    const { count, error: countError } = await supabaseAdmin
      .from("algorithm_events")
      .select("id", { count: "exact", head: true })
      .eq("source_tag", "prop")
      .eq("event_type", "product_view")
      .eq("is_countable", true)
      .neq("traffic_type", "bot")
      .gte("created_at", cutoff)
      .lte("created_at", endTime)

    if (countError) throw new Error(countError.message)

    const totalEventsCount = count || 0
    const pageCount = Math.ceil(totalEventsCount / pageSize)

    let rawEvents: Array<{
      id: string
      product_id: number | null
      product_name_snapshot: string | null
      product_sku_snapshot: string | null
      identity_key: string | null
      session_id: string | null
      event_type: string
      created_at: string
      is_countable: boolean
      traffic_type: string
      device_type: string | null
      os_name: string | null
      browser_name: string | null
      source_platform: string | null
      first_touch_source: string | null
      session_source: string | null
      referrer_host: string | null
      metadata: Record<string, unknown> | null
    }> = []

    if (pageCount > 0) {
      const pageIndexes = Array.from({ length: pageCount }, (_, i) => i)
      const pageResults = await Promise.all(
        pageIndexes.map((pageIdx) => {
          const from = pageIdx * pageSize
          const to = from + pageSize - 1
          return supabaseAdmin
            .from("algorithm_events")
            .select(
              "id, product_id, product_name_snapshot, product_sku_snapshot, identity_key, session_id, event_type, created_at, is_countable, traffic_type, device_type, os_name, browser_name, source_platform, first_touch_source, session_source, referrer_host, metadata"
            )
            .eq("source_tag", "prop")
            .eq("event_type", "product_view")
            .eq("is_countable", true)
            .neq("traffic_type", "bot")
            .gte("created_at", cutoff)
            .lte("created_at", endTime)
            .order("created_at", { ascending: false })
            .range(from, to)
        })
      )

      rawEvents = pageResults.flatMap((res) => {
        if (res.error) throw new Error(res.error.message)
        return (res.data || []) as unknown as typeof rawEvents
      })
    }

    // 2. Group events by Bangkok date (YYYY-MM-DD)
    const dayBuckets = new Map<string, typeof rawEvents>()
    for (const ev of rawEvents) {
      const dateKey = getBangkokDateKey(ev.created_at)
      const list = dayBuckets.get(dateKey) || []
      list.push(ev)
      dayBuckets.set(dateKey, list)
    }

    // 3. Generate all expected day keys in the window
    const expectedDates: string[] = []
    const startMs = new Date(cutoff).getTime()
    const endMs = new Date(endTime).getTime()
    const step = 24 * 60 * 60 * 1000
    for (let time = startMs; time <= endMs; time += step) {
      const key = getBangkokDateKey(new Date(time).toISOString())
      if (!expectedDates.includes(key)) expectedDates.push(key)
    }
    const endKey = getBangkokDateKey(endTime)
    if (!expectedDates.includes(endKey)) expectedDates.push(endKey)
    expectedDates.sort().reverse() // Most recent first

    // 4. Calculate day analytics
    let totalViewsCount = 0
    let totalUniqueCount = 0
    const allSources: string[] = []
    const allDevices: string[] = []
    const allBrowsers: string[] = []

    const days: DayAnalytics[] = expectedDates.map((dateKey) => {
      const dayEvents = dayBuckets.get(dateKey) || []
      const totalViews = dayEvents.length
      totalViewsCount += totalViews

      // Unique views (unique identity_key on that day)
      const uniqueKeys = new Set(dayEvents.map((e) => e.identity_key).filter(Boolean))
      const uniqueViews = uniqueKeys.size || totalViews
      totalUniqueCount += uniqueViews

      // Sources
      const daySources = dayEvents.map((e) => {
        const raw = e.source_platform || e.session_source || e.first_touch_source
        const s = sourceWithDetail(raw, (e.metadata as Record<string, unknown>) || null, e.referrer_host)
        allSources.push(s)
        return s
      })

      // Devices
      const dayDevices = dayEvents.map((e) => {
        const d = formatDevice(e.device_type)
        allDevices.push(d)
        return d
      })

      // Browsers
      const dayBrowsers = dayEvents.map((e) => {
        const b = formatBrowser(e.browser_name)
        allBrowsers.push(b)
        return b
      })

      // Hourly (0-23)
      const hourCounts = new Array(24).fill(0)
      for (const e of dayEvents) {
        const h = getBangkokHour(e.created_at)
        if (h >= 0 && h < 24) hourCounts[h] += 1
      }
      const hourly = hourCounts.map((views, hour) => ({ hour, views }))

      // Top products of the day
      const productCounts = new Map<number, { name: string; sku: string | null; views: number }>()
      for (const e of dayEvents) {
        const pid = Number(e.product_id)
        if (!Number.isSafeInteger(pid) || pid <= 0) continue
        const cur = productCounts.get(pid) || {
          name: e.product_name_snapshot || `สินค้า #${pid}`,
          sku: e.product_sku_snapshot || null,
          views: 0,
        }
        cur.views += 1
        productCounts.set(pid, cur)
      }
      const topProducts: DailyTopProduct[] = Array.from(productCounts.entries())
        .map(([id, item]) => ({
          id,
          name: item.name,
          sku: item.sku,
          imageUrl: null,
          views: item.views,
        }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 5)

      return {
        dateKey,
        dateLabel: formatThaiDate(dateKey + "T12:00:00Z", "full"),
        shortDate: formatThaiDate(dateKey + "T12:00:00Z", "short"),
        totalViews,
        uniqueViews,
        sources: calculateBreakdownList(daySources),
        devices: calculateBreakdownList(dayDevices),
        browsers: calculateBreakdownList(dayBrowsers),
        hourly,
        topProducts,
      }
    })

    // Peak day
    const activeDays = days.filter((d) => d.totalViews > 0)
    const peakDay = activeDays.length > 0
      ? activeDays.reduce((best, cur) => (cur.totalViews > best.totalViews ? cur : best), activeDays[0])
      : null

    const averageViewsPerDay = days.length > 0 ? Math.round(totalViewsCount / days.length) : 0

    const topSourceOverall = calculateBreakdownList(allSources)[0] || null
    const topDeviceOverall = calculateBreakdownList(allDevices)[0] || null
    const topBrowserOverall = calculateBreakdownList(allBrowsers)[0] || null

    const result: DailyTrafficAnalytics = {
      rangeDays,
      offset: safeOffset,
      startTime: cutoff,
      endTime,
      generatedAt: new Date().toISOString(),
      totalViews: totalViewsCount,
      totalUniqueViews: totalUniqueCount,
      peakDay: peakDay ? { date: peakDay.dateLabel, views: peakDay.totalViews } : null,
      averageViewsPerDay,
      topSourceOverall,
      topDeviceOverall,
      topBrowserOverall,
      days,
      error: null,
    }

    cache.set(cacheKey, { data: result, expiresAt: Date.now() + CACHE_TTL_MS })
    return result
  } catch (error) {
    console.error("[daily-traffic] query failed", error)
    return {
      rangeDays,
      offset: safeOffset,
      startTime: cutoff,
      endTime,
      generatedAt: new Date().toISOString(),
      totalViews: 0,
      totalUniqueViews: 0,
      peakDay: null,
      averageViewsPerDay: 0,
      topSourceOverall: null,
      topDeviceOverall: null,
      topBrowserOverall: null,
      days: [],
      error: error instanceof Error ? error.message : "ไม่สามารถโหลดข้อมูลสถิติรายวันได้",
    }
  }
}
