"use server"

import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"

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

type RawProfile = {
  user_id: string
  email: string | null
}

export type AudienceAnalytics = {
  rangeDays: Range
  generatedAt: string
  productStartedAt: string
  products: AudienceProduct[]
  personas: AudiencePersona[]
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
  specs: Record<string, unknown> | null
  collection_groups?: { id: string | number; product_sup: string | null; tag: string | null } | Array<{ id: string | number; product_sup: string | null; tag: string | null }>
}

type RawEvent = {
  id: string
  product_id: number | null
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
  return { value, share: valid.length ? Math.round((count / valid.length) * 100) : 0 }
}

function activeValuesFallback(events: RawEvent[]) {
  return events.map((event) => number(event.duration_seconds)).filter((value) => value > 0)
}

function rollingUniqueViews(events: RawEvent[]) {
  const sorted = events
    .filter((event) => event.identity_key && event.product_id && event.is_countable && event.traffic_type !== "bot" && event.traffic_type !== "internal")
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  const lastSeen = new Map<string, number>()
  const unique: RawEvent[] = []
  for (const event of sorted) {
    const key = `${event.identity_key}:${event.product_id}`
    const createdAt = new Date(event.created_at).getTime()
    const previousAt = lastSeen.get(key)
    if (previousAt === undefined || createdAt - previousAt >= dayMs) unique.push(event)
    lastSeen.set(key, createdAt)
  }
  return unique
}

function productColor(product: RawProduct, bucket: RawEvent[]) {
  const snapshot = bucket.find((event) => event.product_color_snapshot)?.product_color_snapshot
  if (snapshot) return snapshot
  const specs = product.specs && typeof product.specs === "object" ? product.specs : {}
  const value = specs.color ?? specs.colour ?? specs.colors ?? specs.colours ?? specs.tone
  return value ? String(value) : null
}

function mask(value: string | null) {
  if (!value) return "ไม่ระบุ"
  if (value.length <= 10) return value
  return `${value.slice(0, 6)}…${value.slice(-4)}`
}

function location(event: RawEvent) {
  const region = event.region?.trim() || null
  const city = event.city?.trim() || null
  const normalizedRegion = region?.toLowerCase().replace(/[\s.\-_/()]/g, "")
  const normalizedCity = city?.toLowerCase().replace(/[\s.\-_/()]/g, "")
  const sameBangkok = event.country?.trim().toUpperCase() === "TH"
    && ["10", "กรุงเทพ", "กรุงเทพมหานคร", "bangkok"].includes(normalizedRegion || "")
    && ["กรุงเทพ", "กรุงเทพมหานคร", "bangkok"].includes(normalizedCity || "")
  return [event.country, region, sameBangkok ? null : city].filter(Boolean).join(" / ") || null
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

export async function getAudienceAnalytics(rangeValue: number): Promise<AudienceAnalytics> {
  const rangeDays = normalizeRange(rangeValue)
  const productStartedAt = "ข้อมูลชุดนี้เริ่มเก็บตั้งแต่วันที่ deploy Audience Analytics"
  try {
    await requireAdmin()
    const cutoff = new Date(Date.now() - rangeDays * dayMs).toISOString()
    const [{ data: productRows, error: productError }, { data: eventRows, error: eventError }, { data: activityRows, error: activityError }, { data: linkRows, error: linkError }] = await Promise.all([
      supabaseAdmin
        .from("products")
        .select("id, name, sku, image_url, price, status, collection_group_id, specs, collection_groups!inner(id, product_sup, tag)")
        .eq("category_id", "prop")
        .ilike("collection_groups.tag", "%prop%"),
      supabaseAdmin
        .from("algorithm_events")
        .select("id, product_id, product_category_snapshot, product_price_snapshot, product_name_snapshot, product_sku_snapshot, product_color_snapshot, product_material_snapshot, identity_key, identity_type, user_id, visitor_id, session_id, event_type, page_type, page_path, created_at, duration_seconds, is_bounce, is_quick_bounce, activity_interval_id, next_page_type, journey_outcome, is_countable, traffic_type, country, region, city, device_type, os_name, browser_name, source_platform, first_touch_source, session_source, referrer_host, metadata")
        .eq("source_tag", "prop")
        .gte("created_at", cutoff)
        .order("created_at", { ascending: false })
        .limit(50000),
      supabaseAdmin
        .from("algorithm_activity_intervals")
        .select("id, identity_key, session_id, product_id, active_seconds, started_at")
        .gte("started_at", cutoff)
        .order("started_at", { ascending: false })
        .limit(50000),
      supabaseAdmin
        .from("algorithm_events")
        .select("user_id, metadata")
        .eq("source_tag", "prop")
        .not("user_id", "is", null)
        .limit(50000),
    ])
    if (productError) throw new Error(productError.message)
    if (eventError) throw new Error(eventError.message)
    if (activityError) throw new Error(activityError.message)
    if (linkError) throw new Error(linkError.message)

    const products = (productRows || []) as unknown as RawProduct[]
    const events = (eventRows || []) as unknown as RawEvent[]
    const activities = (activityRows || []) as unknown as RawActivity[]
    const { error: refreshError } = await supabaseAdmin.rpc("refresh_prop_analytics", {
      p_from: cutoff,
      p_to: new Date().toISOString(),
      p_range_days: rangeDays,
    })
    if (refreshError) console.warn("[audience-analytics] aggregate refresh unavailable", refreshError.message)
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
    const visitorToUser = new Map<string, string>()

    for (const row of (linkRows || []) as Array<{ user_id: string | null; metadata: Record<string, unknown> | null }>) {
      const linkedVisitor = row.metadata && typeof row.metadata.linked_visitor_id === "string" ? row.metadata.linked_visitor_id : null
      if (row.user_id && linkedVisitor) visitorToUser.set(linkedVisitor, `user:${row.user_id}`)
    }

    for (const event of events) {
      const linkedVisitor = event.metadata && typeof event.metadata.linked_visitor_id === "string" ? event.metadata.linked_visitor_id : null
      if (event.identity_type === "user" && event.user_id && linkedVisitor) visitorToUser.set(linkedVisitor, `user:${event.user_id}`)
    }

    for (const activity of activities) {
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
      if (event.identity_key) {
        const canonicalKey = event.identity_type === "visitor" && event.visitor_id && visitorToUser.has(event.visitor_id)
          ? visitorToUser.get(event.visitor_id)!
          : event.identity_key
        const bucket = viewerBuckets.get(canonicalKey) || []
        bucket.push(event)
        viewerBuckets.set(canonicalKey, bucket)
      }
    }

    const productAnalytics: AudienceProduct[] = products.map((product) => {
      const productId = Number(product.id)
      const bucket = productBuckets.get(productId) || []
      const views = bucket.filter((event) => event.event_type === "product_view")
      const countableViews = views.filter((event) => event.is_countable && event.traffic_type !== "bot" && event.traffic_type !== "internal")
      const uniqueCountableViews = rollingUniqueViews(countableViews)
      const category = bucket.find((event) => event.product_category_snapshot)?.product_category_snapshot
        || (Array.isArray(product.collection_groups) ? product.collection_groups[0]?.product_sup : product.collection_groups?.product_sup)
        || "ไม่ระบุหมวด"
      const exitEvents = bucket.filter((event) => event.event_type === "session_end" && event.page_type === "product" && event.is_countable && event.traffic_type !== "bot" && event.traffic_type !== "internal")
      const quickBounce = exitEvents.filter((event) => event.is_quick_bounce || number(event.duration_seconds) < 15)
      const journeys = bucket.filter((event) => event.event_type === "journey")
      const nextProduct = journeys.filter((event) => event.next_page_type === "product" || event.journey_outcome === "product")
      const nextCollection = journeys.filter((event) => event.next_page_type === "collection" || event.journey_outcome === "collection")
      const nextOther = journeys.filter((event) => event.next_page_type === "other" || event.journey_outcome === "other")
      const intervalValues = (activityByProduct.get(productId) || []).map((activity) => number(activity.active_seconds)).filter((value) => value > 0)
      const activeValues = intervalValues.length ? intervalValues : activeValuesFallback(views)
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
        color: productColor(product, bucket),
        price: product.price === null ? null : number(product.price),
        status: product.status,
        totalViews: views.length,
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
        lastViewedAt: views[0]?.created_at || null,
      }
    }).sort((a, b) => b.uniqueViews - a.uniqueViews || b.totalViews - a.totalViews || a.name.localeCompare(b.name))

    const allAveragePrices = [...viewerBuckets.values()].map((bucket) => {
      const prices = rollingUniqueViews(bucket.filter((event) => event.event_type === "product_view")).map((event) => number(event.product_price_snapshot)).filter((price) => price > 0)
      return prices.length ? prices.reduce((sum, price) => sum + price, 0) / prices.length : 0
    }).filter(Boolean).sort((a, b) => a - b)
    const highPriceThreshold = allAveragePrices[Math.floor(allAveragePrices.length * 0.75)] || Infinity

    const personas: AudiencePersona[] = [...viewerBuckets.entries()].map(([identityKey, bucket]) => {
      const pageEvents = bucket.filter((event) => event.event_type === "page_view")
      const productViews = bucket.filter((event) => event.event_type === "product_view")
      const sessions = new Set(bucket.map((event) => event.session_id).filter(Boolean))
      const uniquePages = new Set(pageEvents.map((event) => event.page_path).filter(Boolean))
      const uniqueProductViews = rollingUniqueViews(productViews)
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
      const activeSeconds = (activityByViewer.get(identityKey) || []).reduce((sum, activity) => sum + number(activity.active_seconds), 0)
      const averagePrice = prices.length ? prices.reduce((sum, price) => sum + price, 0) / prices.length : null
      const labels: string[] = []
      const reasons: string[] = []
      if (topCategory && uniqueProductViews.length >= 3 && topCategory[1] / uniqueProductViews.length >= 0.5) { labels.push("สนใจหมวดเฉพาะ"); reasons.push(`ดูหมวด ${topCategory[0]} ${Math.round((topCategory[1] / uniqueProductViews.length) * 100)}%`) }
      if (new Set(categories).size >= 3) { labels.push("นักสำรวจหลายหมวด"); reasons.push(`ดู ${new Set(categories).size} หมวด`) }
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

    return { rangeDays, generatedAt: new Date().toISOString(), productStartedAt, products: productAnalytics, personas, error: null }
  } catch (error) {
    console.error("[audience-analytics] query failed", error)
    return { rangeDays, generatedAt: new Date().toISOString(), productStartedAt, products: [], personas: [], error: error instanceof Error ? error.message : "ไม่สามารถอ่าน Audience Analytics ได้" }
  }
}
