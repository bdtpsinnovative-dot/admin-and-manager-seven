"use server"

import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { isMainAnalyticsEvent, normalizeLocation } from "@/lib/algorithm-normalization"

type Range = 1 | 7 | 30

export type AudienceProduct = {
  id: number
  name: string
  sku: string | null
  imageUrl: string | null
  category: string
  collection: string
  color: string | null
  price: number | null
  status: string | null
  totalViews: number
  uniqueViews: number
  repeatViews: number
  avgActiveSeconds: number
  exitCount: number
  quickBounceCount: number
  continueProductCount: number
  continueCollectionCount: number
  continueOtherCount: number
  primaryDevice: string | null
  primaryDeviceShare: number
  primaryBrowser: string | null
  primaryBrowserShare: number
  primarySource: string | null
  primarySourceShare: number
  primaryLocation: string | null
  primaryLocationShare: number
  lastViewedAt: string | null
}

export type AudiencePersona = {
  identityKey: string
  identityType: "user" | "visitor"
  identityLabel: string
  firstSeenAt: string | null
  lastSeenAt: string | null
  location: string | null
  sessions: number
  pageViews: number
  uniquePages: number
  activeSeconds: number
  averageSessionSeconds: number
  averagePrice: number | null
  minPrice: number | null
  maxPrice: number | null
  device: string | null
  os: string | null
  browser: string | null
  firstTouchSource: string | null
  latestSource: string | null
  categories: string[]
  labels: string[]
  reasons: string[]
}

export type AudienceSummaryMetric = {
  value: string | null
  share: number
  count: number
}

export type AudienceProductSummary = {
  uniqueViews: number
  totalViews: number
  repeatViews: number
  averageActiveSeconds: number
  device: AudienceSummaryMetric
  browser: AudienceSummaryMetric
  source: AudienceSummaryMetric
  location: AudienceSummaryMetric
  category: AudienceSummaryMetric
  color: AudienceSummaryMetric
}

export type AudiencePersonaSummary = {
  viewers: number
  sessions: number
  pageViews: number
  averageSessionSeconds: number
  device: AudienceSummaryMetric
  os: AudienceSummaryMetric
  browser: AudienceSummaryMetric
  source: AudienceSummaryMetric
  location: AudienceSummaryMetric
  persona: AudienceSummaryMetric
}

type RawProfile = {
  user_id: string
  email: string | null
}

export type AudienceAnalytics = {
  rangeDays: Range
  offset?: number
  startTime?: string
  endTime?: string
  generatedAt: string
  productStartedAt: string
  products: AudienceProduct[]
  personas: AudiencePersona[]
  summary: {
    products: AudienceProductSummary
    personas: AudiencePersonaSummary
  }
  error: string | null
}

type RawProduct = {
  id: number
  name: string | null
  sku: string | null
  image_url: string | null
  price: number | string | null
  status: string | null
  collection_group_id: string | number | null
  color: string | null
  specs: Record<string, unknown> | null
  collection_groups?: { id: string | number; product_sup: string | null; tag: string | null } | Array<{ id: string | number; product_sup: string | null; tag: string | null }>
}

type RawEvent = {
  id: string
  product_id: number | null
  collection_group_id: string | number | null
  product_category_snapshot: string | null
  product_price_snapshot: number | string | null
  product_name_snapshot: string | null
  product_sku_snapshot: string | null
  product_color_snapshot: string | null
  product_material_snapshot: string | null
  identity_key: string | null
  identity_type: "user" | "visitor"
  user_id: string | null
  visitor_id: string | null
  session_id: string | null
  page_instance_id: string | null
  event_type: string
  page_type: string | null
  page_path: string | null
  created_at: string
  duration_seconds: number | null
  is_bounce: boolean
  is_quick_bounce: boolean
  activity_interval_id: string | null
  next_page_type: string | null
  journey_outcome: string | null
  is_countable: boolean
  traffic_type: string
  country_code: string | null
  country: string | null
  region: string | null
  city: string | null
  device_type: string | null
  os_name: string | null
  browser_name: string | null
  source_platform: string | null
  first_touch_source: string | null
  session_source: string | null
  referrer_host: string | null
  metadata: Record<string, unknown> | null
}

type RawActivity = {
  id: string
  identity_key: string
  session_id: string
  page_instance_id: string
  product_id: number | null
  active_seconds: number
  started_at: string
}

const dayMs = 24 * 60 * 60 * 1000

function normalizeRange(value: number): Range {
  return value === 1 || value === 7 ? value : 30
}

function number(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function countBy(values: Array<string | null>) {
  const counts = new Map<string, number>()
  for (const value of values) if (value) counts.set(value, (counts.get(value) || 0) + 1)
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null
}

function topWithShare(values: Array<string | null>) {
  const valid = values.filter((value): value is string => Boolean(value))
  const value = countBy(valid)
  const count = value ? valid.filter((item) => item === value).length : 0
  return { value, count, share: valid.length ? Math.round((count / valid.length) * 100) : 0 }
}

function emptySummaryMetric(): AudienceSummaryMetric {
  return { value: null, share: 0, count: 0 }
}

function emptySummary() {
  return {
    products: {
      uniqueViews: 0,
      totalViews: 0,
      repeatViews: 0,
      averageActiveSeconds: 0,
      device: emptySummaryMetric(),
      browser: emptySummaryMetric(),
      source: emptySummaryMetric(),
      location: emptySummaryMetric(),
      category: emptySummaryMetric(),
      color: emptySummaryMetric(),
    },
    personas: {
      viewers: 0,
      sessions: 0,
      pageViews: 0,
      averageSessionSeconds: 0,
      device: emptySummaryMetric(),
      os: emptySummaryMetric(),
      browser: emptySummaryMetric(),
      source: emptySummaryMetric(),
      location: emptySummaryMetric(),
      persona: emptySummaryMetric(),
    },
  }
}

function isIncluded(event: RawEvent) {
  return isMainAnalyticsEvent(event)
}

function activeValuesFallback(events: RawEvent[]) {
  return events.filter(isIncluded).map((event) => number(event.duration_seconds)).filter((value) => value > 0)
}

function buildViewerLinks(events: RawEvent[], linkRows: Array<{ user_id: string | null; metadata: Record<string, unknown> | null }>) {
  const links = new Map<string, string>()
  for (const row of linkRows) {
    const linkedVisitor = row.metadata && typeof row.metadata.linked_visitor_id === "string" ? row.metadata.linked_visitor_id : null
    if (row.user_id && linkedVisitor) links.set(linkedVisitor, `user:${row.user_id}`)
  }
  for (const event of events) {
    const linkedVisitor = event.metadata && typeof event.metadata.linked_visitor_id === "string"
      ? event.metadata.linked_visitor_id
      : event.visitor_id
    if (event.identity_type === "user" && event.user_id && linkedVisitor) links.set(linkedVisitor, `user:${event.user_id}`)
  }
  return links
}

function viewerKey(event: RawEvent, links: ReadonlyMap<string, string>) {
  if (event.identity_type === "user" && event.user_id) return `user:${event.user_id}`
  if (event.visitor_id && links.has(event.visitor_id)) return links.get(event.visitor_id)!
  if (event.identity_key?.startsWith("visitor:") && links.has(event.identity_key.slice("visitor:".length))) {
    return links.get(event.identity_key.slice("visitor:".length))!
  }
  return event.identity_key
}

function rollingUniqueViews(events: RawEvent[], links: ReadonlyMap<string, string>, cutoff: string) {
  const cutoffMs = new Date(cutoff).getTime()
  const sorted = events
    .filter((event) => event.identity_key && event.product_id && isIncluded(event))
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  const lastSeen = new Map<string, number>()
  const unique: RawEvent[] = []
  for (const event of sorted) {
    const key = `${viewerKey(event, links)}:${event.product_id}`
    const createdAt = new Date(event.created_at).getTime()
    const previousAt = lastSeen.get(key)
    if (createdAt >= cutoffMs && (previousAt === undefined || createdAt - previousAt >= dayMs)) unique.push(event)
    lastSeen.set(key, createdAt)
  }
  return unique
}

function productColor(product: RawProduct, bucket: RawEvent[]) {
  const snapshot = bucket.find((event) => event.product_color_snapshot)?.product_color_snapshot
  if (snapshot) return snapshot
  if (product.color?.trim()) return product.color.trim()
  const specs = product.specs && typeof product.specs === "object" ? product.specs : {}
  const value = specs.color ?? specs.colour ?? specs.colors ?? specs.colours ?? specs.tone ?? specs.color_tone ?? specs.colour_tone ?? specs.colorTone
  return value ? String(value) : null
}

function mask(value: string | null) {
  if (!value) return "ไม่ระบุ"
  if (value.length <= 10) return value
  return `${value.slice(0, 6)}…${value.slice(-4)}`
}

function location(event: RawEvent) {
  return normalizeLocation({ countryCode: event.country_code, country: event.country, region: event.region, city: event.city }).label
}

function sourceWithDetail(source: string | null, event: RawEvent | undefined) {
  if (!source) return null
  if (source !== "Referral") return source
  const detail = event?.metadata && typeof event.metadata.source_detail === "string"
    ? event.metadata.source_detail
    : event?.referrer_host
  return detail ? `Referral · ${detail}` : "Referral · ไม่ทราบเว็บไซต์ต้นทาง"
}

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("กรุณาเข้าสู่ระบบ Admin")
  const { data: profile } = await supabase.from("profiles").select("role").eq("user_id", user.id).maybeSingle()
  if (!profile || !["admin", "super_admin"].includes(String(profile.role))) throw new Error("ไม่มีสิทธิ์ดูข้อมูล Analytics")
}

async function fetchPagedAlgorithmEvents(cutoff: string, until?: string) {
  const pageSize = 1000
  let countReq = supabaseAdmin
    .from("algorithm_events")
    .select("id", { count: "exact", head: true })
    .eq("source_tag", "prop")
    .in("event_type", ["product_view", "page_view", "session_end", "journey", "cta"])
    .gte("created_at", cutoff)

  if (until) countReq = countReq.lte("created_at", until)

  const { count, error: countError } = await countReq

  if (countError) throw new Error(countError.message)
  const total = count || 0
  const pageCount = Math.ceil(total / pageSize)
  if (pageCount === 0) return []

  const pageIndexes = Array.from({ length: pageCount }, (_, i) => i)
  const results = await Promise.all(
    pageIndexes.map(async (pageIdx) => {
      const offset = pageIdx * pageSize
      let req = supabaseAdmin
        .from("algorithm_events")
        .select("id, product_id, collection_group_id, product_category_snapshot, product_price_snapshot, product_name_snapshot, product_sku_snapshot, product_color_snapshot, product_material_snapshot, identity_key, identity_type, user_id, visitor_id, session_id, page_instance_id, event_type, page_type, page_path, created_at, duration_seconds, is_bounce, is_quick_bounce, activity_interval_id, next_page_type, journey_outcome, is_countable, traffic_type, country_code, country, region, city, device_type, os_name, browser_name, source_platform, first_touch_source, session_source, referrer_host, metadata")
        .eq("source_tag", "prop")
        .in("event_type", ["product_view", "page_view", "session_end", "journey", "cta"])
        .gte("created_at", cutoff)

      if (until) req = req.lte("created_at", until)

      const { data, error } = await req
        .order("created_at", { ascending: false })
        .range(offset, offset + pageSize - 1)
      if (error) throw new Error(error.message)
      return (data || []) as unknown as RawEvent[]
    })
  )
  return results.flat()
}

async function fetchPagedActivities(cutoff: string, until?: string) {
  const pageSize = 1000
  let countReq = supabaseAdmin
    .from("algorithm_activity_intervals")
    .select("id", { count: "exact", head: true })
    .gte("started_at", cutoff)

  if (until) countReq = countReq.lte("started_at", until)

  const { count, error: countError } = await countReq

  if (countError) throw new Error(countError.message)
  const total = count || 0
  const pageCount = Math.ceil(total / pageSize)
  if (pageCount === 0) return []

  const pageIndexes = Array.from({ length: pageCount }, (_, i) => i)
  const results = await Promise.all(
    pageIndexes.map(async (pageIdx) => {
      const offset = pageIdx * pageSize
      let req = supabaseAdmin
        .from("algorithm_activity_intervals")
        .select("id, identity_key, session_id, page_instance_id, product_id, active_seconds, started_at")
        .gte("started_at", cutoff)

      if (until) req = req.lte("started_at", until)

      const { data, error } = await req
        .order("started_at", { ascending: false })
        .range(offset, offset + pageSize - 1)
      if (error) throw new Error(error.message)
      return (data || []) as unknown as RawActivity[]
    })
  )
  return results.flat()
}

async function fetchPagedPropProducts() {
  const pageSize = 1000
  const { count, error: countError } = await supabaseAdmin
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("category_id", "prop")

  if (countError) throw new Error(countError.message)
  const total = count || 0
  const pageCount = Math.ceil(total / pageSize)
  if (pageCount === 0) return []

  const pageIndexes = Array.from({ length: pageCount }, (_, i) => i)
  const results = await Promise.all(
    pageIndexes.map(async (pageIdx) => {
      const offset = pageIdx * pageSize
      const { data, error } = await supabaseAdmin
        .from("products")
        .select("id, name, sku, image_url, price, status, collection_group_id, color, specs, collection_groups!inner(id, product_sup, tag)")
        .eq("category_id", "prop")
        .ilike("collection_groups.tag", "%prop%")
        .order("id", { ascending: true })
        .range(offset, offset + pageSize - 1)
      if (error) throw new Error(error.message)
      return (data || []) as unknown as RawProduct[]
    })
  )
  return results.flat()
}

async function fetchPagedViewerLinks() {
  const pageSize = 1000
  const { count, error: countError } = await supabaseAdmin
    .from("algorithm_events")
    .select("id", { count: "exact", head: true })
    .eq("source_tag", "prop")
    .not("user_id", "is", null)

  if (countError) throw new Error(countError.message)
  const total = count || 0
  const pageCount = Math.ceil(total / pageSize)
  if (pageCount === 0) return []

  const pageIndexes = Array.from({ length: pageCount }, (_, i) => i)
  const results = await Promise.all(
    pageIndexes.map(async (pageIdx) => {
      const offset = pageIdx * pageSize
      const { data, error } = await supabaseAdmin
        .from("algorithm_events")
        .select("user_id, metadata")
        .eq("source_tag", "prop")
        .not("user_id", "is", null)
        .range(offset, offset + pageSize - 1)
      if (error) throw new Error(error.message)
      return (data || []) as unknown as Array<{ user_id: string | null; metadata: Record<string, unknown> | null }>
    })
  )
  return results.flat()
}

function productActiveValues(activities: RawActivity[], views: RawEvent[]) {
  const byOpening = new Map<string, number>()
  for (const activity of activities) {
    if (!activity.product_id || activity.active_seconds <= 0) continue
    const openingKey = activity.page_instance_id || `${activity.session_id}:${activity.product_id}`
    byOpening.set(openingKey, Math.max(byOpening.get(openingKey) || 0, number(activity.active_seconds)))
  }
  const values = [...byOpening.values()].filter((value) => value > 0)
  return values.length ? values : activeValuesFallback(views)
}

function productActiveValuesForSummary(activities: RawActivity[], events: RawEvent[]) {
  return productActiveValues(activities, events.filter((event) => event.event_type === "product_view" && isIncluded(event)))
}

function mergedActiveSeconds(activities: RawActivity[]) {
  const intervals = activities
    .map((activity) => {
      const start = new Date(activity.started_at).getTime()
      return { start, end: start + Math.max(0, number(activity.active_seconds)) * 1000 }
    })
    .filter((interval) => Number.isFinite(interval.start) && interval.end > interval.start)
    .sort((a, b) => a.start - b.start)
  let total = 0
  let currentStart: number | null = null
  let currentEnd = 0
  for (const interval of intervals) {
    if (currentStart === null) {
      currentStart = interval.start
      currentEnd = interval.end
    } else if (interval.start <= currentEnd) {
      currentEnd = Math.max(currentEnd, interval.end)
    } else {
      total += currentEnd - currentStart
      currentStart = interval.start
      currentEnd = interval.end
    }
  }
  if (currentStart !== null) total += currentEnd - currentStart
  return Math.round(total / 1000)
}

const audienceCache = new Map<string, { data: AudienceAnalytics; expiresAt: number }>()
const AUDIENCE_CACHE_TTL_MS = 3 * 60 * 1000 // 3 minutes

export async function getAudienceAnalytics(rangeValue: number, offset: number = 0): Promise<AudienceAnalytics> {
  const rangeDays = normalizeRange(rangeValue)
  const safeOffset = Math.max(0, Number(offset) || 0)
  const productStartedAt = "ข้อมูลชุดนี้เริ่มเก็บตั้งแต่วันที่ deploy Audience Analytics"

  const cacheKey = `${rangeDays}:${safeOffset}`
  const cached = audienceCache.get(cacheKey)
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data
  }

  const windowMs = rangeDays * dayMs
  const endTime = safeOffset > 0 ? new Date(Date.now() - safeOffset * windowMs).toISOString() : new Date().toISOString()
  const cutoff = new Date(new Date(endTime).getTime() - windowMs).toISOString()

  try {
    await requireAdmin()
    const [productRows, eventRows, activityRows, linkRows] = await Promise.all([
      fetchPagedPropProducts(),
      fetchPagedAlgorithmEvents(cutoff, endTime),
      fetchPagedActivities(cutoff, endTime),
      fetchPagedViewerLinks(),
    ])

    const currentProducts = productRows
    const events = eventRows as RawEvent[]
    const activities = activityRows as RawActivity[]
    const currentProductIds = new Set(currentProducts.map((product) => Number(product.id)))
    const historicalProducts = new Map<number, RawProduct>()
    for (const event of events) {
      if (event.event_type !== "product_view" || !event.product_id || currentProductIds.has(Number(event.product_id))) continue
      if (!event.product_name_snapshot && !event.product_sku_snapshot) continue
      historicalProducts.set(Number(event.product_id), {
        id: Number(event.product_id),
        name: event.product_name_snapshot || "สินค้าเดิมที่ถูกลบ",
        sku: event.product_sku_snapshot,
        image_url: null,
        price: null,
        status: "deleted",
        collection_group_id: event.collection_group_id,
        color: event.product_color_snapshot,
        specs: null,
        collection_groups: { id: event.collection_group_id || "historical", product_sup: event.product_category_snapshot, tag: "prop" },
      })
    }
    const products = [...currentProducts, ...historicalProducts.values()]
    
    // Background aggregate refresh (non-blocking)
    void supabaseAdmin.rpc("refresh_prop_analytics", {
      p_from: cutoff,
      p_to: new Date().toISOString(),
      p_range_days: rangeDays,
    }).then(({ error: refreshError }) => {
      if (refreshError) console.warn("[audience-analytics] aggregate refresh unavailable", refreshError.message)
    })
    const userIds = [...new Set(events.map((event) => event.user_id).filter((userId): userId is string => Boolean(userId)))]
    const { data: profileRows, error: profileError } = userIds.length
      ? await supabaseAdmin.from("profiles").select("user_id, email").in("user_id", userIds)
      : { data: [], error: null }
    if (profileError) console.warn("[audience-analytics] profile email lookup failed", profileError.message)
    const emailByUserId = new Map(((profileRows || []) as RawProfile[]).map((profile) => [profile.user_id, profile.email]))
    const productMap = new Map(products.map((product) => [Number(product.id), product]))
    const productBuckets = new Map<number, RawEvent[]>()
    const viewerBuckets = new Map<string, RawEvent[]>()
    const activityByProduct = new Map<number, RawActivity[]>()
    const activityByViewer = new Map<string, RawActivity[]>()
    const visitorToUser = buildViewerLinks(events, linkRows)
    const includedSessions = new Set(events.filter(isIncluded).map((event) => event.session_id).filter(Boolean))

    for (const activity of activities) {
      if (!includedSessions.has(activity.session_id)) continue
      if (activity.product_id && productMap.has(Number(activity.product_id))) {
        const bucket = activityByProduct.get(Number(activity.product_id)) || []
        bucket.push(activity)
        activityByProduct.set(Number(activity.product_id), bucket)
      }
      const linkedUserKey = activity.identity_key.startsWith("visitor:")
        ? visitorToUser.get(activity.identity_key.slice("visitor:".length))
        : null
      const canonicalKey = linkedUserKey || activity.identity_key
      const bucket = activityByViewer.get(canonicalKey) || []
      bucket.push(activity)
      activityByViewer.set(canonicalKey, bucket)
    }

    for (const event of events) {
      if (event.product_id && productMap.has(Number(event.product_id))) {
        const bucket = productBuckets.get(Number(event.product_id)) || []
        bucket.push(event)
        productBuckets.set(Number(event.product_id), bucket)
      }
      if (event.identity_key && isIncluded(event)) {
        const canonicalKey = viewerKey(event, visitorToUser) || event.identity_key
        const bucket = viewerBuckets.get(canonicalKey) || []
        bucket.push(event)
        viewerBuckets.set(canonicalKey, bucket)
      }
    }

    const productAnalytics: AudienceProduct[] = products.map((product) => {
      const productId = Number(product.id)
      const bucket = productBuckets.get(productId) || []
      const views = bucket.filter((event) => event.event_type === "product_view")
      const countableViews = views.filter(isIncluded)
      const uniqueCountableViews = rollingUniqueViews(views, visitorToUser, cutoff)
      const category = uniqueCountableViews.find((event) => event.product_category_snapshot)?.product_category_snapshot
        || (Array.isArray(product.collection_groups) ? product.collection_groups[0]?.product_sup : product.collection_groups?.product_sup)
        || "ไม่ระบุหมวด"
      const exitEvents = bucket.filter((event) => event.event_type === "session_end" && event.page_type === "product" && isIncluded(event))
      const quickBounce = exitEvents.filter((event) => event.is_quick_bounce || number(event.duration_seconds) < 15)
      const journeys = bucket.filter((event) => event.event_type === "journey" && isIncluded(event))
      const nextProduct = journeys.filter((event) => event.next_page_type === "product" || event.journey_outcome === "product")
      const nextCollection = journeys.filter((event) => event.next_page_type === "collection" || event.journey_outcome === "collection")
      const nextOther = journeys.filter((event) => event.next_page_type === "other" || event.journey_outcome === "other")
      const activeValues = productActiveValues(activityByProduct.get(productId) || [], countableViews)
      const device = topWithShare(uniqueCountableViews.map((event) => event.device_type))
      const browser = topWithShare(uniqueCountableViews.map((event) => event.browser_name))
      const source = topWithShare(uniqueCountableViews.map((event) => sourceWithDetail(event.source_platform, event)))
      const place = topWithShare(uniqueCountableViews.map(location))
      return {
        id: productId,
        name: product.name || bucket.find((event) => event.product_name_snapshot)?.product_name_snapshot || "ไม่ระบุชื่อสินค้า",
        sku: product.sku || bucket.find((event) => event.product_sku_snapshot)?.product_sku_snapshot || null,
        imageUrl: product.image_url || null,
        category: String(category),
        collection: Array.isArray(product.collection_groups) ? String(product.collection_groups[0]?.id || "") : String(product.collection_groups?.id || ""),
        color: productColor(product, uniqueCountableViews),
        price: (() => {
          const snapshotPrices = uniqueCountableViews.map((event) => number(event.product_price_snapshot)).filter((value) => value > 0)
          return snapshotPrices.length ? Math.round(snapshotPrices.reduce((sum, value) => sum + value, 0) / snapshotPrices.length) : (product.price === null ? null : number(product.price))
        })(),
        status: product.status,
        totalViews: countableViews.length,
        uniqueViews: uniqueCountableViews.length,
        repeatViews: Math.max(0, countableViews.length - uniqueCountableViews.length),
        avgActiveSeconds: activeValues.length ? Math.round(activeValues.reduce((sum, value) => sum + value, 0) / activeValues.length) : 0,
        exitCount: exitEvents.length,
        quickBounceCount: quickBounce.length,
        continueProductCount: nextProduct.length,
        continueCollectionCount: nextCollection.length,
        continueOtherCount: nextOther.length,
        primaryDevice: device.value,
        primaryDeviceShare: device.share,
        primaryBrowser: browser.value,
        primaryBrowserShare: browser.share,
        primarySource: source.value,
        primarySourceShare: source.share,
        primaryLocation: place.value,
        primaryLocationShare: place.share,
        lastViewedAt: countableViews.reduce<string | null>((latest, event) => !latest || event.created_at > latest ? event.created_at : latest, null),
      }
    }).sort((a, b) => b.uniqueViews - a.uniqueViews || b.totalViews - a.totalViews || a.name.localeCompare(b.name))

    const allAveragePrices = [...viewerBuckets.values()].map((bucket) => {
      const prices = rollingUniqueViews(bucket.filter((event) => event.event_type === "product_view"), visitorToUser, cutoff).map((event) => number(event.product_price_snapshot)).filter((price) => price > 0)
      return prices.length ? prices.reduce((sum, price) => sum + price, 0) / prices.length : 0
    }).filter(Boolean).sort((a, b) => a - b)
    const highPriceThreshold = allAveragePrices[Math.floor(allAveragePrices.length * 0.75)] || Infinity

    const personas: AudiencePersona[] = [...viewerBuckets.entries()].map(([identityKey, bucket]) => {
      const pageEvents = bucket.filter((event) => event.event_type === "page_view")
      const productViews = bucket.filter((event) => event.event_type === "product_view")
      const sessions = new Set(bucket.map((event) => event.session_id).filter(Boolean))
      const uniquePages = new Set(pageEvents.map((event) => event.page_path).filter(Boolean))
      const uniqueProductViews = rollingUniqueViews(productViews, visitorToUser, cutoff)
      const prices = uniqueProductViews.map((event) => number(event.product_price_snapshot)).filter((price) => price > 0)
      const categories = uniqueProductViews.map((event) => event.product_category_snapshot).filter(Boolean) as string[]
      const productSessions = new Map<string, Set<string>>()
      for (const event of productViews) {
        if (!event.product_id || !event.session_id) continue
        const sessionsForProduct = productSessions.get(String(event.product_id)) || new Set<string>()
        sessionsForProduct.add(event.session_id)
        productSessions.set(String(event.product_id), sessionsForProduct)
      }
      const returnedProductCount = [...productSessions.values()].filter((productSessionIds) => productSessionIds.size >= 2).length
      const categoryCounts = new Map<string, number>()
      categories.forEach((category) => categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1))
      const topCategory = [...categoryCounts.entries()].sort((a, b) => b[1] - a[1])[0]
      const activeSeconds = mergedActiveSeconds(activityByViewer.get(identityKey) || [])
      const averagePrice = prices.length ? prices.reduce((sum, price) => sum + price, 0) / prices.length : null
      const labels: string[] = []
      const reasons: string[] = []
      if (topCategory && uniqueProductViews.length >= 3 && topCategory[1] / uniqueProductViews.length >= 0.5) { labels.push("สนใจหมวดเฉพาะ"); reasons.push(`ดูหมวด ${topCategory[0]} ${Math.round((topCategory[1] / uniqueProductViews.length) * 100)}%`) }
      if (new Set(categories).size >= 3) { labels.push("สำรวจหลายหมวด"); reasons.push(`ดู ${new Set(categories).size} หมวด`) }
      if (returnedProductCount > 0) { labels.push("กลับมาดูสินค้า"); reasons.push(`กลับมาดูสินค้าเดิม ${returnedProductCount} รายการ`) }
      if (sessions.size >= 3) { labels.push("เข้าเว็บบ่อย"); reasons.push(`${sessions.size} ครั้งที่เข้าเว็บในช่วงที่เลือก`) }
      if (averagePrice !== null && averagePrice >= highPriceThreshold && uniqueProductViews.length >= 3) { labels.push("สนใจสินค้าราคาสูง"); reasons.push(`ราคาเฉลี่ย ${Math.round(averagePrice).toLocaleString()} บาท`) }
      if (activeSeconds / Math.max(sessions.size, 1) >= 60 || uniquePages.size >= 5 || uniqueProductViews.length >= 3) { labels.push("ผู้ชมมีส่วนร่วมสูง"); reasons.push("ใช้เวลา ดูหลายหน้า หรือดูหลายสินค้า") }
      if (bucket.some((event) => event.is_quick_bounce)) { labels.push("ผู้ชมออกเร็ว"); reasons.push("มีการออกภายใน 15 วินาทีโดยไม่มีหน้าถัดไป") }
      if (bucket.some((event) => event.event_type === "cta")) { labels.push("มีความสนใจสูง"); reasons.push("มีการกด CTA") }
      if (bucket.some((event) => ["LINE", "Instagram", "Facebook", "Meta Ads", "TikTok", "YouTube", "Pinterest", "X"].includes(event.source_platform || ""))) { labels.push("เคยตรวจพบ Social"); reasons.push("พบหลักฐาน Social จาก UTM, Click ID หรือ Referrer") }
      if (!labels.length) { labels.push("ยังจำแนกไม่ได้"); reasons.push("ข้อมูลพฤติกรรมยังไม่พอ") }
      const first = bucket[bucket.length - 1]
      const last = bucket[0]
      const userEvent = bucket.find((event) => event.identity_type === "user") || first
      const hadPreLoginHistory = bucket.some((event) => event.identity_type === "visitor") && Boolean(userEvent?.identity_type === "user")
      if (hadPreLoginHistory) {
        labels.push("เคยไม่ล็อกอิน")
        reasons.push("เชื่อมประวัติจาก visitor profile ก่อนล็อกอิน")
      }
      return {
        identityKey,
        identityType: userEvent?.identity_type === "user" ? "user" as const : "visitor" as const,
        identityLabel: userEvent?.identity_type === "user"
          ? emailByUserId.get(userEvent.user_id || "") || mask(userEvent.user_id)
          : `Visitor ${mask(userEvent?.visitor_id || identityKey)}`,
        firstSeenAt: first?.created_at || null,
        lastSeenAt: last?.created_at || null,
        location: countBy(bucket.map(location)),
        sessions: sessions.size,
        pageViews: pageEvents.length,
        uniquePages: uniquePages.size,
        activeSeconds,
        averageSessionSeconds: sessions.size ? Math.round(activeSeconds / sessions.size) : 0,
        averagePrice: averagePrice === null ? null : Math.round(averagePrice),
        minPrice: prices.length ? Math.min(...prices) : null,
        maxPrice: prices.length ? Math.max(...prices) : null,
        device: countBy(bucket.map((event) => event.device_type)),
        os: countBy(bucket.map((event) => event.os_name)),
        browser: countBy(bucket.map((event) => event.browser_name)),
        firstTouchSource: sourceWithDetail(first?.first_touch_source || null, first),
        latestSource: sourceWithDetail(last?.session_source || last?.source_platform || null, last),
        categories: [...new Set(categories)],
        labels,
        reasons,
      }
    }).sort((a, b) => new Date(b.lastSeenAt || 0).getTime() - new Date(a.lastSeenAt || 0).getTime())

    const productViewEvents = events.filter((event) => event.event_type === "product_view")
    const countableProductViews = productViewEvents.filter(isIncluded)
    const uniqueProductViews = rollingUniqueViews(productViewEvents, visitorToUser, cutoff)
    const allProductActiveValues = [...productMap.keys()].flatMap((productId) => productActiveValuesForSummary(activityByProduct.get(productId) || [], productBuckets.get(productId) || []))
    const productAverageActiveSeconds = allProductActiveValues.length
      ? Math.round(allProductActiveValues.reduce((sum, value) => sum + value, 0) / allProductActiveValues.length)
      : 0
    const productSummary: AudienceProductSummary = {
      uniqueViews: uniqueProductViews.length,
      totalViews: countableProductViews.length,
      repeatViews: Math.max(0, countableProductViews.length - uniqueProductViews.length),
      averageActiveSeconds: productAverageActiveSeconds,
      device: topWithShare(uniqueProductViews.map((event) => event.device_type)),
      browser: topWithShare(uniqueProductViews.map((event) => event.browser_name)),
      source: topWithShare(uniqueProductViews.map((event) => sourceWithDetail(event.source_platform || event.session_source || event.first_touch_source, event))),
      location: topWithShare(uniqueProductViews.map(location)),
      category: topWithShare(uniqueProductViews.map((event) => event.product_category_snapshot)),
      color: topWithShare(uniqueProductViews.map((event) => {
        if (event.product_color_snapshot) return event.product_color_snapshot
        const product = event.product_id ? productMap.get(Number(event.product_id)) : null
        return product?.color || null
      })),
    }

    const personaSessions = personas.reduce((sum, persona) => sum + persona.sessions, 0)
    const personaPageViews = personas.reduce((sum, persona) => sum + persona.pageViews, 0)
    const personaLabels = personas.map((persona) => persona.labels.find((label) => label !== "ยังจำแนกไม่ได้") || null)
    const personaSummary: AudiencePersonaSummary = {
      viewers: personas.length,
      sessions: personaSessions,
      pageViews: personaPageViews,
      averageSessionSeconds: personaSessions
        ? Math.round(personas.reduce((sum, persona) => sum + persona.activeSeconds, 0) / personaSessions)
        : 0,
      device: topWithShare(personas.map((persona) => persona.device)),
      os: topWithShare(personas.map((persona) => persona.os)),
      browser: topWithShare(personas.map((persona) => persona.browser)),
      source: topWithShare(personas.map((persona) => persona.firstTouchSource)),
      location: topWithShare(personas.map((persona) => persona.location)),
      persona: topWithShare(personaLabels),
    }

    const result: AudienceAnalytics = {
      rangeDays,
      offset: safeOffset,
      startTime: cutoff,
      endTime,
      generatedAt: new Date().toISOString(),
      productStartedAt,
      products: productAnalytics,
      personas,
      summary: { products: productSummary, personas: personaSummary },
      error: null,
    }
    audienceCache.set(cacheKey, { data: result, expiresAt: Date.now() + AUDIENCE_CACHE_TTL_MS })
    return result
  } catch (error) {
    console.error("[audience-analytics] query failed", error)
    return {
      rangeDays,
      offset: safeOffset,
      startTime: cutoff,
      endTime,
      generatedAt: new Date().toISOString(),
      productStartedAt,
      products: [],
      personas: [],
      summary: emptySummary(),
      error: error instanceof Error ? error.message : "ไม่สามารถอ่าน Audience Analytics ได้",
    }
  }
}
