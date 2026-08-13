"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"

export type AlgorithmRange = 1 | 7 | 30

export type AlgorithmProduct = {
  id: number
  name: string
  sku: string | null
  imageUrl: string | null
  status: string | null
  collectionGroupId: string
  collectionName: string
  stockTotal: number
  availability: "available" | "preorder"
}

export type HotItem = AlgorithmProduct & {
  rank: number
  uniqueViews: number
  recencyScore: number
  stockFactor: number
  score: number
  lastViewedAt: string | null
}

export type AlgorithmProductListItem = AlgorithmProduct & {
  rank: number | null
  uniqueViews: number
  lastViewedAt: string | null
  primaryCountry: CountrySummary | null
}

export type AlgorithmProductsPage = {
  rangeDays: AlgorithmRange
  page: number
  pageCount: number
  total: number
  products: AlgorithmProductListItem[]
  error: string | null
}

export type LocationSummary = {
  label: string
  views: number
}

export type CountrySummary = {
  code: string | null
  label: string
  views: number
}

export type LocationCitySummary = {
  label: string
  views: number
}

export type LocationRegionSummary = {
  label: string
  views: number
  cities: LocationCitySummary[]
}

export type CountryLocationSummary = CountrySummary & {
  regions: LocationRegionSummary[]
}

export type TrendPoint = {
  bucket: string
  views: number
}

export type IdentitySummary = {
  label: "user" | "visitor"
  count: number
}

export type AlgorithmOverview = {
  rangeDays: AlgorithmRange
  generatedAt: string
  topItems: HotItem[]
  totalUniqueViews: number
  totalEvents: number
  locationSummary: LocationSummary[]
  countrySummary: CountrySummary[]
  locationHierarchy: CountryLocationSummary[]
  unspecifiedLocationViews: number
  identitySummary: IdentitySummary[]
  trafficSummary: { label: string; count: number }[]
  trend: TrendPoint[]
  error: string | null
}

export type AlgorithmEventFilters = {
  rangeDays: AlgorithmRange
  trafficType: "all" | "internal" | "bot" | "unknown"
  countable: "all" | "countable" | "excluded"
  identityType: "all" | "user" | "visitor"
  location: string
  page: number
}

export type AlgorithmEventRow = {
  id: string
  createdAt: string
  identityType: "user" | "visitor"
  identityLabel: string
  ipHash: string | null
  countryCode: string | null
  location: string
  country: string | null
  region: string | null
  city: string | null
  isp: string | null
  asn: string | null
  trafficType: string
  isCountable: boolean
  isBot: boolean
  isInternal: boolean
  userAgent: string | null
  referrer: string | null
  sourcePlatform: string | null
  sessionSource: string | null
  referrerHost: string | null
  sourceEvidence: string | null
  sourceConfidence: string | null
  sourceDetail: string | null
  sessionLabel: string | null
  previousProductId: number | null
}

export type RelatedProduct = AlgorithmProduct & {
  score: number
  sequentialViews: number
  categoryViews: number
  reason: string
}

export type AlgorithmProductDetail = {
  product: AlgorithmProduct
  relatedProducts: RelatedProduct[]
  relatedError: string | null
  events: AlgorithmEventRow[]
  eventTotal: number
  eventPage: number
  eventPageCount: number
  eventError: string | null
  filters: AlgorithmEventFilters
}

type ScoreEvent = {
  product_id: number
  identity_key: string
  identity_type: "user" | "visitor"
  view_bucket: number
  created_at: string
  traffic_type: string
  is_countable: boolean
  country_code: string | null
  country: string | null
  region: string | null
  city: string | null
}

type ProductRow = {
  id: number
  name: string | null
  sku: string | null
  image_url: string | null
  status: string | null
  category_id: string | null
  collection_group_id: string | number | null
}

type CollectionRow = {
  id: string | number
  product_sup: string | null
  tag: string | null
}

type StockRow = {
  product_id: number
  qty: number | string | null
}

const EVENT_FIELDS = [
  "id",
  "product_id",
  "collection_group_id",
  "user_id",
  "visitor_id",
  "identity_type",
  "ip_hash",
  "country_code",
  "country",
  "region",
  "city",
  "isp",
  "asn",
  "user_agent",
  "referrer",
  "source_platform",
  "session_source",
  "referrer_host",
  "metadata",
  "traffic_type",
  "is_bot",
  "is_internal",
  "is_countable",
  "created_at",
  "session_id",
  "previous_product_id",
  "event_type",
  "source_tag",
  "view_bucket",
].join(",")

const dayInMs = 24 * 60 * 60 * 1000
const rawPageSize = 50

function getCutoff(rangeDays: AlgorithmRange) {
  return new Date(Date.now() - rangeDays * dayInMs).toISOString()
}

function getRecencyWeight(createdAt: string) {
  const ageDays = Math.max(0, (Date.now() - new Date(createdAt).getTime()) / dayInMs)
  return Math.pow(0.5, ageDays / 7)
}

function getTrafficWeight(trafficType: string, isCountable: boolean) {
  if (!isCountable || trafficType === "bot" || trafficType === "internal") return 0
  return 1
}

function rollingUniqueScoreEvents(events: ScoreEvent[]) {
  const sorted = [...events]
    .filter((event) => event.is_countable && event.identity_key && event.product_id)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  const lastSeen = new Map<string, number>()
  const unique: ScoreEvent[] = []
  for (const event of sorted) {
    const key = `${event.product_id}:${event.identity_key}`
    const createdAt = new Date(event.created_at).getTime()
    const previousAt = lastSeen.get(key)
    if (previousAt === undefined || createdAt - previousAt >= dayInMs) unique.push(event)
    lastSeen.set(key, createdAt)
  }
  return unique
}

function formatLocation(country: string | null, region: string | null, city: string | null) {
  const values = [city, region, country].filter(Boolean)
  return values.length > 0 ? values.join(", ") : "ไม่ระบุ location"
}

function normalizeCountryCode(value: unknown) {
  const normalized = typeof value === "string" ? value.trim().toUpperCase() : ""
  if (/^[A-Z]{2}$/.test(normalized) && normalized !== "XX") return normalized

  const legacyCountryAliases: Record<string, string> = {
    THAILAND: "TH",
    "ประเทศไทย": "TH",
    "ไทย": "TH",
  }
  return legacyCountryAliases[normalized] || null
}

function maskIdentifier(value: string | null | undefined) {
  if (!value) return "ไม่ระบุ"
  return value.length > 12 ? `${value.slice(0, 8)}…${value.slice(-4)}` : value
}

function maskIpHash(value: string | null | undefined) {
  if (!value) return null
  return value.length > 14 ? `${value.slice(0, 8)}…${value.slice(-6)}` : value
}

function normalizeRange(value: number): AlgorithmRange {
  if (value === 1 || value === 7 || value === 30) return value
  return 30
}

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle()

  if (profile?.role !== "admin") redirect("/login")
}

async function fetchScoreEvents(cutoff: string) {
  const rows: ScoreEvent[] = []
  const pageSize = 1000

  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabaseAdmin
      .from("algorithm_events")
      .select("product_id, identity_key, identity_type, view_bucket, created_at, traffic_type, is_countable, country_code, country, region, city")
      .eq("source_tag", "prop")
      .eq("event_type", "product_view")
      .gte("created_at", cutoff)
      .order("created_at", { ascending: false })
      .range(offset, offset + pageSize - 1)

    if (error) throw new Error(error.message)
    const batch = (data ?? []) as ScoreEvent[]
    rows.push(...batch)
    if (batch.length < pageSize) break
  }

  return rows
}

async function fetchPropProducts(productIds: number[], includeInactive = false) {
  const productMap = new Map<number, AlgorithmProduct>()
  const cleanIds = Array.from(new Set(productIds.filter(Number.isSafeInteger)))
  if (cleanIds.length === 0) return productMap

  const { data: productRows, error: productError } = await supabaseAdmin
    .from("products")
    .select("id, name, sku, image_url, status, category_id, collection_group_id")
    .in("id", cleanIds)
    .eq("category_id", "prop")

  if (productError) throw new Error(productError.message)

  const products = (productRows ?? []) as ProductRow[]
  const groupIds = products
    .map((product) => product.collection_group_id)
    .filter((id): id is string | number => id !== null && id !== undefined)

  if (groupIds.length === 0) return productMap

  const [{ data: groupRows, error: groupError }, { data: stockRows, error: stockError }] = await Promise.all([
    supabaseAdmin
      .from("collection_groups")
      .select("id, product_sup, tag")
      .in("id", groupIds)
      .ilike("tag", "%prop%"),
    supabaseAdmin
      .from("stock")
      .select("product_id, qty")
      .in("product_id", cleanIds),
  ])

  if (groupError) throw new Error(groupError.message)
  if (stockError) throw new Error(stockError.message)

  const groups = (groupRows ?? []) as CollectionRow[]
  const groupMap = new Map(groups.map((group) => [String(group.id), group]))
  const stockByProduct = new Map<number, number>()

  for (const stock of (stockRows ?? []) as StockRow[]) {
    stockByProduct.set(stock.product_id, (stockByProduct.get(stock.product_id) ?? 0) + Number(stock.qty ?? 0))
  }

  for (const product of products) {
    const group = product.collection_group_id === null
      ? null
      : groupMap.get(String(product.collection_group_id))
    if (!group || !group.tag?.toLowerCase().includes("prop")) continue
    if (!includeInactive && product.status && product.status !== "active") continue

    const stockTotal = stockByProduct.get(product.id) ?? 0
    productMap.set(product.id, {
      id: product.id,
      name: product.name || "ไม่ระบุชื่อสินค้า",
      sku: product.sku,
      imageUrl: product.image_url,
      status: product.status,
      collectionGroupId: String(product.collection_group_id),
      collectionName: group.product_sup || "ไม่ระบุหมวดหมู่",
      stockTotal,
      availability: stockTotal > 0 ? "available" : "preorder",
    })
  }

  return productMap
}

async function fetchAllPropProductIds() {
  const productIds: number[] = []
  const pageSize = 1000

  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabaseAdmin
      .from("products")
      .select("id")
      .eq("category_id", "prop")
      .order("id", { ascending: true })
      .range(offset, offset + pageSize - 1)

    if (error) throw new Error(error.message)
    const batch = (data ?? []) as Array<{ id: number }>
    productIds.push(...batch.map((product) => Number(product.id)))
    if (batch.length < pageSize) break
  }

  return productIds
}

function emptyOverview(rangeDays: AlgorithmRange, error: string | null): AlgorithmOverview {
  return {
    rangeDays,
    generatedAt: new Date().toISOString(),
    topItems: [],
    totalUniqueViews: 0,
    totalEvents: 0,
    locationSummary: [],
    countrySummary: [],
    locationHierarchy: [],
    unspecifiedLocationViews: 0,
    identitySummary: [],
    trafficSummary: [],
    trend: [],
    error,
  }
}

function getTrendBucket(dateValue: string, rangeDays: AlgorithmRange) {
  const date = new Date(dateValue)
  if (rangeDays === 1) {
    date.setMinutes(0, 0, 0)
  } else {
    date.setHours(0, 0, 0, 0)
  }
  return date.toISOString()
}

function getTrendSlots(rangeDays: AlgorithmRange) {
  const slotCount = rangeDays === 1 ? 24 : rangeDays
  const step = rangeDays === 1 ? 60 * 60 * 1000 : dayInMs
  const now = new Date()
  if (rangeDays === 1) now.setMinutes(0, 0, 0)
  else now.setHours(0, 0, 0, 0)

  return Array.from({ length: slotCount }, (_, index) => {
    const slot = new Date(now.getTime() - (slotCount - 1 - index) * step)
    return slot.toISOString()
  })
}

type ProductAggregate = {
  uniqueViews: number
  recencyScore: number
  lastViewedAt: string | null
  countryCounts: Map<string, number>
}

function getCountryKey(event: ScoreEvent) {
  const countryCode = normalizeCountryCode(event.country_code) || normalizeCountryCode(event.country)
  return countryCode || (event.country?.trim().toLowerCase() || null)
}

function normalizeLocationPart(value: string | null) {
  const normalized = value?.trim()
  return normalized || null
}

function countryLabel(key: string) {
  const code = normalizeCountryCode(key)
  if (code) {
    try {
      return new Intl.DisplayNames(["th"], { type: "region" }).of(code) || code
    } catch {
      return code
    }
  }
  return key
}

type LocationAggregate = {
  views: number
  regions: Map<string, { views: number; cities: Map<string, number> }>
}

function locationHierarchyFromAggregates(aggregates: Map<string, LocationAggregate>): CountryLocationSummary[] {
  return Array.from(aggregates.entries())
    .map(([key, aggregate]) => ({
      code: normalizeCountryCode(key),
      label: countryLabel(key),
      views: aggregate.views,
      regions: Array.from(aggregate.regions.entries())
        .map(([region, regionAggregate]) => ({
          label: region,
          views: regionAggregate.views,
          cities: Array.from(regionAggregate.cities.entries())
            .map(([city, views]) => ({ label: city, views }))
            .sort((a, b) => b.views - a.views || a.label.localeCompare(b.label)),
        }))
        .sort((a, b) => b.views - a.views || a.label.localeCompare(b.label)),
    }))
    .sort((a, b) => b.views - a.views || (a.code || a.label).localeCompare(b.code || b.label))
}

function countrySummaryFromCounts(countryCounts: Map<string, number>): CountrySummary | null {
  const top = Array.from(countryCounts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]
  if (!top) return null

  const [key, views] = top
  return {
    code: normalizeCountryCode(key),
    label: normalizeCountryCode(key) ? key : key.replace(/\b\w/g, (letter) => letter.toUpperCase()),
    views,
  }
}

function rankProductCatalog(events: ScoreEvent[], productMap: Map<number, AlgorithmProduct>): AlgorithmProductListItem[] {
  const uniqueEvents = rollingUniqueScoreEvents(events)

  const aggregate = new Map<number, ProductAggregate>()
  for (const event of uniqueEvents) {
    const productId = Number(event.product_id)
    if (!productMap.has(productId)) continue
    const current = aggregate.get(productId) ?? {
      uniqueViews: 0,
      recencyScore: 0,
      lastViewedAt: null,
      countryCounts: new Map<string, number>(),
    }
    current.uniqueViews += 1
    current.recencyScore += getRecencyWeight(event.created_at) * getTrafficWeight(event.traffic_type, event.is_countable)
    if (!current.lastViewedAt || new Date(event.created_at).getTime() > new Date(current.lastViewedAt).getTime()) {
      current.lastViewedAt = event.created_at
    }
    const countryKey = getCountryKey(event)
    if (countryKey) current.countryCounts.set(countryKey, (current.countryCounts.get(countryKey) ?? 0) + 1)
    aggregate.set(productId, current)
  }

  const ranked = Array.from(productMap.entries())
    .map(([productId, product]) => {
      const score = aggregate.get(productId)
      const isActive = !product.status || product.status === "active"
      const stockFactor = product.availability === "available" ? 1 : 0.6
      return {
        ...product,
        rank: null,
        uniqueViews: score?.uniqueViews ?? 0,
        lastViewedAt: score?.lastViewedAt ?? null,
        primaryCountry: score ? countrySummaryFromCounts(score.countryCounts) : null,
        score: (score?.recencyScore ?? 0) * stockFactor,
        isActive,
      }
    })
    .sort((a, b) => Number(b.uniqueViews > 0) - Number(a.uniqueViews > 0) || Number(b.isActive) - Number(a.isActive) || b.score - a.score || b.uniqueViews - a.uniqueViews || a.id - b.id)

  let rank = 0
  return ranked.map(({ isActive, score: _score, ...item }) => ({
    ...item,
    rank: isActive && item.uniqueViews > 0 ? ++rank : null,
  }))
}

export async function getAlgorithmOverview(rangeValue: number): Promise<AlgorithmOverview> {
  await requireAdmin()
  const rangeDays = normalizeRange(rangeValue)

  try {
    const events = await fetchScoreEvents(getCutoff(rangeDays))
    let uniqueEvents: ScoreEvent[] = []
    const identityCounts = new Map<"user" | "visitor", number>()
    const trafficCounts = new Map<string, number>()
    const countryCounts = new Map<string, number>()
    const locationAggregates = new Map<string, LocationAggregate>()
    let unspecifiedLocationViews = 0

    for (const event of events) {
      const identityType = event.identity_type === "user" ? "user" : "visitor"
      identityCounts.set(identityType, (identityCounts.get(identityType) ?? 0) + 1)
      const trafficType = event.traffic_type === "customer" ? "unknown" : event.traffic_type || "unknown"
      trafficCounts.set(trafficType, (trafficCounts.get(trafficType) ?? 0) + 1)
    }

    uniqueEvents = rollingUniqueScoreEvents(events)

    const productMap = await fetchPropProducts(uniqueEvents.map((event) => Number(event.product_id)))
    const aggregate = new Map<number, { uniqueViews: number; recencyScore: number; lastViewedAt: string; location: Map<string, number> }>()
    const trendTotals = new Map<string, number>()

    for (const event of uniqueEvents) {
      const productId = Number(event.product_id)
      if (!productMap.has(productId)) continue
      const current = aggregate.get(productId) ?? {
        uniqueViews: 0,
        recencyScore: 0,
        lastViewedAt: event.created_at,
        location: new Map<string, number>(),
      }
      const weightedRecency = getRecencyWeight(event.created_at) * getTrafficWeight(event.traffic_type, event.is_countable)
      current.uniqueViews += 1
      current.recencyScore += weightedRecency
      if (new Date(event.created_at).getTime() > new Date(current.lastViewedAt).getTime()) current.lastViewedAt = event.created_at
      const location = formatLocation(event.country, event.region, event.city)
      current.location.set(location, (current.location.get(location) ?? 0) + 1)
      const countryCode = normalizeCountryCode(event.country_code) || normalizeCountryCode(event.country)
      const countryKey = countryCode || (event.country?.trim().toLowerCase() || null)
      if (countryKey) {
        countryCounts.set(countryKey, (countryCounts.get(countryKey) ?? 0) + 1)
        const locationAggregate = locationAggregates.get(countryKey) ?? { views: 0, regions: new Map() }
        locationAggregate.views += 1
        const regionKey = normalizeLocationPart(event.region) || "ไม่ระบุภูมิภาค"
        const regionAggregate = locationAggregate.regions.get(regionKey) ?? { views: 0, cities: new Map<string, number>() }
        regionAggregate.views += 1
        const cityKey = normalizeLocationPart(event.city)
        if (cityKey) regionAggregate.cities.set(cityKey, (regionAggregate.cities.get(cityKey) ?? 0) + 1)
        locationAggregate.regions.set(regionKey, regionAggregate)
        locationAggregates.set(countryKey, locationAggregate)
      } else {
        unspecifiedLocationViews += 1
      }
      aggregate.set(productId, current)
      const trendBucket = getTrendBucket(event.created_at, rangeDays)
      trendTotals.set(trendBucket, (trendTotals.get(trendBucket) ?? 0) + 1)
    }

    const ranked = Array.from(aggregate.entries())
      .map(([productId, score]) => {
        const product = productMap.get(productId)!
        const stockFactor = product.availability === "available" ? 1 : 0.6
        return {
          ...product,
          rank: 0,
          uniqueViews: score.uniqueViews,
          recencyScore: score.recencyScore,
          stockFactor,
          score: score.recencyScore * stockFactor,
          lastViewedAt: score.lastViewedAt,
        }
      })
      .sort((a, b) => b.score - a.score || b.uniqueViews - a.uniqueViews || a.id - b.id)
      .slice(0, 20)
      .map((item, index) => ({ ...item, rank: index + 1 }))

    const locationTotals = new Map<string, number>()
    for (const score of aggregate.values()) {
      for (const [location, views] of score.location.entries()) {
        locationTotals.set(location, (locationTotals.get(location) ?? 0) + views)
      }
    }

    return {
      rangeDays,
      generatedAt: new Date().toISOString(),
      topItems: ranked,
      totalUniqueViews: Array.from(aggregate.values()).reduce((total, item) => total + item.uniqueViews, 0),
      totalEvents: events.length,
      locationSummary: Array.from(locationTotals.entries())
        .filter(([label]) => label !== "ไม่ระบุ location")
        .map(([label, views]) => ({ label, views }))
        .sort((a, b) => b.views - a.views || a.label.localeCompare(b.label)),
      countrySummary: Array.from(countryCounts.entries())
        .map(([key, views]) => ({
          code: normalizeCountryCode(key),
          label: countryLabel(key),
          views,
        }))
        .sort((a, b) => b.views - a.views || (a.code || a.label).localeCompare(b.code || b.label)),
      locationHierarchy: locationHierarchyFromAggregates(locationAggregates),
      unspecifiedLocationViews,
      identitySummary: (["user", "visitor"] as const).map((label) => ({
        label,
        count: identityCounts.get(label) ?? 0,
      })),
      trafficSummary: Array.from(trafficCounts.entries())
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count),
      trend: getTrendSlots(rangeDays).map((bucket) => ({
        bucket,
        views: trendTotals.get(bucket) ?? 0,
      })),
      error: null,
    }
  } catch (error) {
    console.error("[algorithm-admin] overview query failed", error)
    return emptyOverview(rangeDays, error instanceof Error ? error.message : "ไม่สามารถอ่านข้อมูล Algorithm ได้")
  }
}

function emptyProductsPage(rangeDays: AlgorithmRange, page: number, error: string | null): AlgorithmProductsPage {
  return {
    rangeDays,
    page,
    pageCount: 1,
    total: 0,
    products: [],
    error,
  }
}

export async function getAlgorithmProducts(rangeValue: number, pageValue: number): Promise<AlgorithmProductsPage> {
  await requireAdmin()
  const rangeDays = normalizeRange(rangeValue)
  const page = Number.isSafeInteger(pageValue) && pageValue > 0 ? pageValue : 1
  const pageSize = 50

  try {
    const [events, productIds] = await Promise.all([
      fetchScoreEvents(getCutoff(rangeDays)),
      fetchAllPropProductIds(),
    ])
    const productMap = await fetchPropProducts(productIds, true)
    const rankedProducts = rankProductCatalog(events, productMap)
    const pageCount = Math.max(1, Math.ceil(rankedProducts.length / pageSize))
    const safePage = Math.min(page, pageCount)

    return {
      rangeDays,
      page: safePage,
      pageCount,
      total: rankedProducts.length,
      products: rankedProducts.slice((safePage - 1) * pageSize, safePage * pageSize),
      error: null,
    }
  } catch (error) {
    console.error("[algorithm-admin] product list query failed", error)
    return emptyProductsPage(rangeDays, page, error instanceof Error ? error.message : "ไม่สามารถอ่านรายการสินค้าได้")
  }
}

function normalizeEventFilters(input: Partial<AlgorithmEventFilters>): AlgorithmEventFilters {
  const trafficType = ["all", "internal", "bot", "unknown"].includes(input.trafficType || "")
    ? input.trafficType!
    : "all"
  const countable = ["all", "countable", "excluded"].includes(input.countable || "")
    ? input.countable!
    : "all"
  const identityType = ["all", "user", "visitor"].includes(input.identityType || "")
    ? input.identityType!
    : "all"
  const page = Number.isSafeInteger(input.page) && Number(input.page) > 0 ? Number(input.page) : 1

  return {
    rangeDays: normalizeRange(Number(input.rangeDays)),
    trafficType: trafficType as AlgorithmEventFilters["trafficType"],
    countable: countable as AlgorithmEventFilters["countable"],
    identityType: identityType as AlgorithmEventFilters["identityType"],
    location: input.location?.trim().slice(0, 80) || "",
    page,
  }
}

function mapEventRow(event: Record<string, unknown>): AlgorithmEventRow {
  const identityType = event.identity_type === "user" ? "user" : "visitor"
  const identityValue = identityType === "user" ? event.user_id : event.visitor_id
  const country = typeof event.country === "string" ? event.country : null
  const region = typeof event.region === "string" ? event.region : null
  const city = typeof event.city === "string" ? event.city : null
  const countryCode = normalizeCountryCode(event.country_code) || normalizeCountryCode(country)
  const metadata = event.metadata && typeof event.metadata === "object" && !Array.isArray(event.metadata)
    ? event.metadata as Record<string, unknown>
    : {}

  return {
    id: String(event.id),
    createdAt: String(event.created_at),
    identityType,
    identityLabel: maskIdentifier(typeof identityValue === "string" ? identityValue : null),
    ipHash: maskIpHash(typeof event.ip_hash === "string" ? event.ip_hash : null),
    countryCode,
    location: formatLocation(country, region, city),
    country,
    region,
    city,
    isp: typeof event.isp === "string" ? event.isp : null,
    asn: typeof event.asn === "string" ? event.asn : null,
    trafficType: typeof event.traffic_type === "string" ? event.traffic_type : "unknown",
    isCountable: Boolean(event.is_countable),
    isBot: Boolean(event.is_bot),
    isInternal: Boolean(event.is_internal),
    userAgent: typeof event.user_agent === "string" ? event.user_agent : null,
    referrer: typeof event.referrer === "string" ? event.referrer : null,
    sourcePlatform: typeof event.source_platform === "string" ? event.source_platform : null,
    sessionSource: typeof event.session_source === "string" ? event.session_source : null,
    referrerHost: typeof event.referrer_host === "string" ? event.referrer_host : null,
    sourceEvidence: typeof metadata.source_evidence === "string" ? metadata.source_evidence : null,
    sourceConfidence: typeof metadata.source_confidence === "string" ? metadata.source_confidence : null,
    sourceDetail: typeof metadata.source_detail === "string" ? metadata.source_detail : null,
    sessionLabel: maskIdentifier(typeof event.session_id === "string" ? event.session_id : null),
    previousProductId: typeof event.previous_product_id === "number" ? event.previous_product_id : null,
  }
}

export async function getAlgorithmProductDetail(
  productIdValue: number,
  inputFilters: Partial<AlgorithmEventFilters>,
): Promise<AlgorithmProductDetail | null> {
  await requireAdmin()
  const productId = Number(productIdValue)
  const filters = normalizeEventFilters(inputFilters)
  const products = await fetchPropProducts([productId])
  const product = products.get(productId)
  if (!product) return null

  let relatedProducts: RelatedProduct[] = []
  let relatedError: string | null = null

  try {
    const { data, error } = await supabaseAdmin.rpc("get_prop_related_products", {
      current_product_id: productId,
      limit_count: 5,
    })
    if (error) throw new Error(error.message)

    const relatedRows = (data ?? []) as Array<{ product_id: number; score: number; sequential_views: number; category_views: number }>
    const relatedMap = await fetchPropProducts(relatedRows.map((row) => Number(row.product_id)))
    relatedProducts = relatedRows
      .map((row) => {
        const related = relatedMap.get(Number(row.product_id))
        if (!related) return null
        const sequentialViews = Number(row.sequential_views) || 0
        const categoryViews = Number(row.category_views) || 0
        const reason = sequentialViews > 0 && categoryViews > 0
          ? "ถูกกดต่อบ่อย · อยู่หมวดเดียวกัน"
          : sequentialViews > 0
            ? "ถูกกดต่อบ่อย"
            : "อยู่หมวดเดียวกัน"
        return {
          ...related,
          score: Number(row.score) || 0,
          sequentialViews,
          categoryViews,
          reason,
        }
      })
      .filter((row): row is RelatedProduct => row !== null)
  } catch (error) {
    relatedError = error instanceof Error ? error.message : "ไม่สามารถอ่าน Related Product ได้"
  }

  let eventQuery = supabaseAdmin
    .from("algorithm_events")
    .select(EVENT_FIELDS, { count: "exact" })
    .eq("source_tag", "prop")
    .eq("event_type", "product_view")
    .eq("product_id", productId)
    .eq("collection_group_id", product.collectionGroupId)
    .gte("created_at", getCutoff(filters.rangeDays))

  if (filters.trafficType !== "all") eventQuery = eventQuery.eq("traffic_type", filters.trafficType)
  if (filters.countable === "countable") eventQuery = eventQuery.eq("is_countable", true)
  if (filters.countable === "excluded") eventQuery = eventQuery.eq("is_countable", false)
  if (filters.identityType !== "all") eventQuery = eventQuery.eq("identity_type", filters.identityType)

  if (filters.location) {
    const safeLocation = filters.location.replace(/[,%()]/g, " ").replace(/\s+/g, " ").trim()
    if (safeLocation) {
      eventQuery = eventQuery.or(`country.ilike.%${safeLocation}%,region.ilike.%${safeLocation}%,city.ilike.%${safeLocation}%`)
    }
  }

  const from = (filters.page - 1) * rawPageSize
  const { data: eventRows, error: eventError, count } = await eventQuery
    .order("created_at", { ascending: false })
    .range(from, from + rawPageSize - 1)

  return {
    product,
    relatedProducts,
    relatedError,
    events: eventError ? [] : (eventRows ?? []).map((event) => mapEventRow(event as unknown as Record<string, unknown>)),
    eventTotal: count ?? 0,
    eventPage: filters.page,
    eventPageCount: Math.max(1, Math.ceil((count ?? 0) / rawPageSize)),
    eventError: eventError?.message ?? null,
    filters,
  }
}
