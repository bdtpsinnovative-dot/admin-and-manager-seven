import { supabaseAdmin } from "@/lib/supabase/admin"

export type MaintenanceRunStatus = "success" | "warning" | "error" | "repaired"

export type DailyAuditItem = {
  date: string
  status: "complete" | "repaired" | "pending" | "failed"
  productsCount: number
  totalViews: number
  uniqueViews: number
  lastUpdated: string | null
  bugNote?: string | null
  attempts: number
}

export type MaintenanceState = {
  last_run_at: string | null
  last_run_status: MaintenanceRunStatus
  last_run_duration_ms: number
  total_days_summarized: number
  raw_events_count: number
  raw_events_oldest: string | null
  raw_events_newest: string | null
  active_bugs_count: number
  repaired_bugs_count: number
  recent_logs: Array<{
    timestamp: string
    action: string
    status: MaintenanceRunStatus
    message: string
    duration_ms: number
    days_processed?: string[]
  }>
}

// Helper: Sleep for retry backoff
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Run single day rollup with Immediate Auto-Retry (up to 3 times)
 */
export async function rollupSingleDayWithRetry(
  dateStr: string,
  maxRetries = 3
): Promise<{
  success: boolean
  attempts: number
  products: number
  personas: number
  repaired: boolean
  error?: string
}> {
  const dayStart = `${dateStr}T00:00:00.000Z`
  const dayEnd = `${dateStr}T23:59:59.999Z`

  let attempts = 0
  let lastError = ""

  while (attempts < maxRetries) {
    attempts++
    try {
      const { data, error } = await supabaseAdmin.rpc("refresh_prop_analytics", {
        p_from: dayStart,
        p_to: dayEnd,
        p_range_days: 1,
      })

      if (error) {
        lastError = error.message
        if (attempts < maxRetries) {
          // Exponential backoff: 2s, 4s
          await sleep(attempts * 2000)
          continue
        }
      } else {
        const products = (data as any)?.products ?? 0
        const personas = (data as any)?.personas ?? 0
        return {
          success: true,
          attempts,
          products,
          personas,
          repaired: attempts > 1, // If took more than 1 attempt, it was auto-repaired immediately!
        }
      }
    } catch (err: any) {
      lastError = err?.message || String(err)
      if (attempts < maxRetries) {
        await sleep(attempts * 2000)
      }
    }
  }

  return {
    success: false,
    attempts,
    products: 0,
    personas: 0,
    repaired: false,
    error: lastError,
  }
}

/**
 * Execute the Complete Midnight / Manual Maintenance Workflow
 * - Auto-Catchup unsummarized days
 * - Immediate Retries on failure
 * - Watermark-protected retention pruning (Never deletes unsummarized days)
 * - State and Audit recording
 */
export async function executeMaintenanceWorkflow(triggerType: "cron" | "manual" = "cron"): Promise<{
  success: boolean
  message: string
  daysProcessed: string[]
  repairedDays: string[]
  failedDays: string[]
  purgedEvents: number
  durationMs: number
}> {
  const startTime = Date.now()
  const daysProcessed: string[] = []
  const repairedDays: string[] = []
  const failedDays: string[] = []

  // 1. Identify Target Days (yesterday + today + any missed days within 14 days)
  const today = new Date().toISOString().slice(0, 10)
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const targetDays = new Set<string>([yesterday, today])

  // Look for any missing days in the last 14 days from daily metrics
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const { data: existingMetrics } = await supabaseAdmin
    .from("algorithm_product_daily_metrics")
    .select("metric_date")
    .gte("metric_date", fourteenDaysAgo)

  const existingDates = new Set(existingMetrics?.map((m) => m.metric_date) || [])

  // Check which days in the last 14 days are missing
  for (let d = 1; d <= 14; d++) {
    const checkDate = new Date(Date.now() - d * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    if (!existingDates.has(checkDate)) {
      targetDays.add(checkDate)
    }
  }

  const sortedTargetDays = Array.from(targetDays).sort()

  // 2. Process Rollup Day by Day with Immediate Retry
  let totalProducts = 0
  for (const day of sortedTargetDays) {
    const result = await rollupSingleDayWithRetry(day, 3)
    if (result.success) {
      daysProcessed.push(day)
      totalProducts += result.products
      if (result.repaired) {
        repairedDays.push(day)
      }
    } else {
      failedDays.push(day)
    }
  }

  // 3. Safe Watermark Pruning (Only purge if no failed days are blocking the cutoff)
  let purgedEvents = 0
  let purgedIntervals = 0
  let purgedSessions = 0

  const tenDaysAgoStr = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()

  // SAFETY RULE: If any day older than 10 days failed to summarize, STOP purge to preserve raw data!
  const hasOldFailedDay = failedDays.some((f) => f <= tenDaysAgoStr.slice(0, 10))

  if (!hasOldFailedDay) {
    // Safe to purge raw events older than 10 days
    const { count: delEv } = await supabaseAdmin
      .from("algorithm_events")
      .delete({ count: "exact" })
      .lt("created_at", tenDaysAgoStr)
    purgedEvents = delEv || 0

    const { count: delInt } = await supabaseAdmin
      .from("algorithm_activity_intervals")
      .delete({ count: "exact" })
      .lt("started_at", tenDaysAgoStr)
    purgedIntervals = delInt || 0

    const { count: delSess } = await supabaseAdmin
      .from("algorithm_sessions")
      .delete({ count: "exact" })
      .lt("last_activity_at", tenDaysAgoStr)
    purgedSessions = delSess || 0
  }

  const durationMs = Date.now() - startTime
  const isOverallSuccess = failedDays.length === 0
  const runStatus: MaintenanceRunStatus = isOverallSuccess
    ? repairedDays.length > 0
      ? "repaired"
      : "success"
    : "warning"

  // 4. Fetch updated database state
  const { count: rawEventsCount } = await supabaseAdmin
    .from("algorithm_events")
    .select("*", { count: "exact", head: true })

  const { data: oldestEv } = await supabaseAdmin
    .from("algorithm_events")
    .select("created_at")
    .order("created_at", { ascending: true })
    .limit(1)

  const { data: newestEv } = await supabaseAdmin
    .from("algorithm_events")
    .select("created_at")
    .order("created_at", { ascending: false })
    .limit(1)

  const { count: totalDailyMetrics } = await supabaseAdmin
    .from("algorithm_product_daily_metrics")
    .select("*", { count: "exact", head: true })

  // 5. Update State in `system_settings`
  const { data: oldSetting } = await supabaseAdmin
    .from("system_settings")
    .select("value")
    .eq("key", "algorithm_maintenance_state")
    .maybeSingle()

  const existingState = oldSetting?.value || {}
  const existingLogs = Array.isArray(existingState.recent_logs) ? existingState.recent_logs : []

  const newLogEntry = {
    timestamp: new Date().toISOString(),
    action: triggerType === "cron" ? "Scheduled Midnight Cron" : "Manual Dashboard Trigger",
    status: runStatus,
    message: isOverallSuccess
      ? `สรุปยอดสำเร็จ ${daysProcessed.length} วัน (${totalProducts} รายการสินค้า), ล้างข้อมูลดิบหมดอายุ ${purgedEvents} แถว${repairedDays.length > 0 ? ` (ซ่อมแซมอัตโนมัติ: ${repairedDays.join(", ")})` : ""}`
      : `พบปัญหาในวันที่: ${failedDays.join(", ")} ระงับการลบข้อมูลดิบชั่วคราวเพื่อป้องกันข้อมูลสูญหาย`,
    duration_ms: durationMs,
    days_processed: daysProcessed,
  }

  const updatedLogs = [newLogEntry, ...existingLogs].slice(0, 30) // Keep last 30 logs

  const newState: MaintenanceState = {
    last_run_at: new Date().toISOString(),
    last_run_status: runStatus,
    last_run_duration_ms: durationMs,
    total_days_summarized: totalDailyMetrics || 0,
    raw_events_count: rawEventsCount || 0,
    raw_events_oldest: oldestEv?.[0]?.created_at || null,
    raw_events_newest: newestEv?.[0]?.created_at || null,
    active_bugs_count: failedDays.length,
    repaired_bugs_count: (existingState.repaired_bugs_count || 0) + repairedDays.length,
    recent_logs: updatedLogs,
  }

  await supabaseAdmin.from("system_settings").upsert({
    key: "algorithm_maintenance_state",
    value: newState,
    updated_at: new Date().toISOString(),
  })

  return {
    success: isOverallSuccess,
    message: newLogEntry.message,
    daysProcessed,
    repairedDays,
    failedDays,
    purgedEvents,
    durationMs,
  }
}

/**
 * Fetch Full Health & Daily Audit Information for UI
 */
export async function getAlgorithmHealthAudit(): Promise<{
  state: MaintenanceState
  dailyAudit: DailyAuditItem[]
}> {
  // 1. Get state from system_settings
  const { data: settingRow } = await supabaseAdmin
    .from("system_settings")
    .select("value")
    .eq("key", "algorithm_maintenance_state")
    .maybeSingle()

  const defaultState: MaintenanceState = {
    last_run_at: null,
    last_run_status: "success",
    last_run_duration_ms: 0,
    total_days_summarized: 0,
    raw_events_count: 0,
    raw_events_oldest: null,
    raw_events_newest: null,
    active_bugs_count: 0,
    repaired_bugs_count: 0,
    recent_logs: [],
  }

  const state: MaintenanceState = settingRow?.value ? { ...defaultState, ...settingRow.value } : defaultState

  // 2. Fetch live metrics from algorithm_product_daily_metrics for the past 30 days (paginated)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  
  const dateSummaryMap = new Map<
    string,
    {
      productsCount: number
      totalViews: number
      uniqueViews: number
      lastUpdated: string | null
    }
  >()

  let fromOffset = 0
  const pageSize = 1000

  while (true) {
    const { data: metricsPage, error: pErr } = await supabaseAdmin
      .from("algorithm_product_daily_metrics")
      .select("metric_date, total_views, unique_views, updated_at")
      .gte("metric_date", thirtyDaysAgo)
      .order("metric_date", { ascending: false })
      .range(fromOffset, fromOffset + pageSize - 1)

    if (pErr || !metricsPage || metricsPage.length === 0) break

    for (const row of metricsPage) {
      const existing = dateSummaryMap.get(row.metric_date) || {
        productsCount: 0,
        totalViews: 0,
        uniqueViews: 0,
        lastUpdated: row.updated_at,
      }
      existing.productsCount += 1
      existing.totalViews += row.total_views || 0
      existing.uniqueViews += row.unique_views || 0
      if (row.updated_at && (!existing.lastUpdated || row.updated_at > existing.lastUpdated)) {
        existing.lastUpdated = row.updated_at
      }
      dateSummaryMap.set(row.metric_date, existing)
    }

    if (metricsPage.length < pageSize) break
    fromOffset += pageSize
  }

  // 3. Build a continuous 30-day timeline to detect missing or buggy dates
  const dailyAudit: DailyAuditItem[] = []
  const today = new Date()

  for (let i = 0; i < 30; i++) {
    const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000)
    const dateStr = d.toISOString().slice(0, 10)
    const summary = dateSummaryMap.get(dateStr)

    if (summary && summary.productsCount > 0) {
      dailyAudit.push({
        date: dateStr,
        status: "complete",
        productsCount: summary.productsCount,
        totalViews: summary.totalViews,
        uniqueViews: summary.uniqueViews,
        lastUpdated: summary.lastUpdated,
        bugNote: null,
        attempts: 1,
      })
    } else {
      // Check if it's today (in progress) or past day (missing/needs repair)
      const isToday = i === 0
      dailyAudit.push({
        date: dateStr,
        status: isToday ? "pending" : "pending",
        productsCount: 0,
        totalViews: 0,
        uniqueViews: 0,
        lastUpdated: null,
        bugNote: isToday ? "กำลังสะสมข้อมูลระหว่างวัน (จะสรุปตอนเที่ยงคืน)" : "ยังไม่ได้สรุปยอด (รอคิว Auto-Catchup)",
        attempts: 0,
      })
    }
  }

  // Update real-time counts in state
  const { count: currentRawEvents } = await supabaseAdmin
    .from("algorithm_events")
    .select("*", { count: "exact", head: true })
  state.raw_events_count = currentRawEvents || state.raw_events_count

  return { state, dailyAudit }
}
