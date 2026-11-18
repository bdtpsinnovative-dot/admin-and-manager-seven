import { revalidateTag } from 'next/cache'

export const ADMIN_CACHE_TTL = {
  ALGORITHM_SECONDS: 1800, // 30 minutes (auto-cleared on maintenance trigger)
  MASTER_SECONDS: 31536000, // 1 year (auto-cleared on every mutation)
  GALLERY_SECONDS: 86400, // 1 day (auto-cleared on upload/delete/rename/folder change)
  HISTORICAL_SALES_SECONDS: 86400, // 1 day (ONLY for strictly historical dates < today BKK)
} as const

export const ADMIN_CACHE_TAGS = {
  ALGORITHM: 'admin:algorithm',
  INVENTORY_META: 'admin:inventory-meta',
  FILTERS: 'admin:filters',
  BRANCHES: 'admin:branches',
  PROMOTIONS: 'admin:promotions',
  WEB_GALLERY: 'admin:web-gallery',
  R2_GALLERY: 'admin:r2-gallery',
  SALES_REPORT: 'admin:sales-report',
} as const

export function r2FolderTag(folder: string) {
  return `admin:r2-folder:${folder}`
}

export function invalidateAdminTags(...tags: string[]) {
  for (const tag of tags) {
    if (!tag) continue
    try {
      revalidateTag(tag, { expire: 0 })
    } catch (err) {
      console.warn('[admin-cache] revalidateTag failed for', tag, err)
    }
  }
}

/** Returns current YYYY-MM-DD in Asia/Bangkok timezone */
export function getTodayBangkokISO(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' })
}
