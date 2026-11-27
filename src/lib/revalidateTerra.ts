export type RevalidateTerraOptions = {
  scope?: 'discounts' | 'products' | 'promotions' | 'all'
  productIds?: Array<string | number>
  collection?: string
  reason?: string
}

export type RevalidateTerraResult = {
  ok: boolean
  skipped?: boolean
  status?: number
  error?: string
  results?: Array<{
    target: string
    ok: boolean
    status: number
    data?: any
    error?: string
  }>
}

export async function revalidateTerraCache(
  options: RevalidateTerraOptions = {}
): Promise<RevalidateTerraResult> {
  const defaultTargets = 'http://localhost:3000,https://terrahome-studio.com,https://www.terrahome-studio.com'
  const rawUrls = (
    process.env.TERRA_REVALIDATE_URL ||
    process.env.TERRA_WEB_URL ||
    defaultTargets
  ).trim()

  const secret = (
    process.env.TERRA_REVALIDATE_SECRET ||
    process.env.REVALIDATE_SECRET ||
    process.env.ZENSLAB_REVALIDATE_SECRET ||
    'inventoryeiei'
  ).trim()

  if (!secret) {
    console.warn('[revalidateTerraCache] Skipped: No secret configured')
    return {
      ok: false,
      skipped: true,
      error: 'Missing TERRA_REVALIDATE_SECRET / REVALIDATE_SECRET env',
    }
  }

  const targets = rawUrls
    .split(',')
    .map((u) => u.trim().replace(/\/+$/, ''))
    .filter(Boolean)

  if (targets.length === 0) {
    return { ok: false, skipped: true, error: 'No targets configured' }
  }

  const results = await Promise.all(
    targets.map(async (baseUrl) => {
      const endpoint = `${baseUrl}/api/revalidate`
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-revalidate-secret': secret,
          },
          body: JSON.stringify({
            scope: options.scope || 'discounts',
            productIds: options.productIds,
            collection: options.collection,
            reason: options.reason || 'admin-update',
          }),
          cache: 'no-store',
          signal: AbortSignal.timeout(6000),
        })

        const json = await res.json().catch(() => null)
        return {
          target: baseUrl,
          ok: res.ok,
          status: res.status,
          data: json,
        }
      } catch (err: any) {
        console.warn(`[revalidateTerraCache] Failed targeting ${baseUrl}:`, err?.message || err)
        return {
          target: baseUrl,
          ok: false,
          status: 502,
          error: err?.message || 'Network error',
        }
      }
    })
  )

  const anyOk = results.some((r) => r.ok)
  return {
    ok: anyOk,
    results,
  }
}
