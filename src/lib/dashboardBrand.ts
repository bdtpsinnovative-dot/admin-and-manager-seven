export type DashboardBrandKey = 'ALL' | 'ZENSLAB' | 'TERRA' | 'EMBER_ASH'

export interface DashboardBrandInfo {
  key: DashboardBrandKey
  name: string
  thaiName: string
  emoji: string
  englishSubtitle: string
}

export const BRAND_DEFINITIONS: Record<DashboardBrandKey, DashboardBrandInfo> = {
  ALL: {
    key: "ALL",
    name: "ทุกแบรนด์",
    thaiName: "ทั้งหมด",
    emoji: "🏢",
    englishSubtitle: "All Brands Portfolio",
  },
  ZENSLAB: {
    key: "ZENSLAB",
    name: "ZenSlab",
    thaiName: "สแลป & ไม้ดิบ",
    emoji: "🌲",
    englishSubtitle: "Live Edge & Raw Wood Slabs",
  },
  TERRA: {
    key: "TERRA",
    name: "Terra",
    thaiName: "พร็อพของแต่งบ้าน",
    emoji: "🏺",
    englishSubtitle: "Home Decor & Props",
  },
  EMBER_ASH: {
    key: "EMBER_ASH",
    name: "Ember & Ash",
    thaiName: "เฟอร์นิเจอร์",
    emoji: "🛋️",
    englishSubtitle: "Modern Furniture Collection",
  },
}

export function isMatchingBrand(groupType?: string | null, targetBrand?: string | null): boolean {
  if (!targetBrand || targetBrand === "ALL") return true
  const upper = targetBrand.trim().toUpperCase()
  if (upper === "ZENSLAB") return groupType === "wood"
  if (upper === "TERRA") return groupType === "prop"
  if (upper === "EMBER_ASH") return groupType === "furniture"
  return true
}

export function getBrandInfo(brandKey?: string | null): DashboardBrandInfo {
  const upper = (brandKey || "ALL").trim().toUpperCase() as DashboardBrandKey
  return BRAND_DEFINITIONS[upper] || BRAND_DEFINITIONS.ALL
}
