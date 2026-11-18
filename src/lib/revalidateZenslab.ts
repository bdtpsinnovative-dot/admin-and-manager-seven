export type RevalidateZenslabOptions = {
  scope?: 'products' | 'discounts' | 'algorithm' | 'all'
  productIds?: Array<string | number>
  includeAlgorithm?: boolean
  purgeCloudflare?: boolean
}

export type RevalidateZenslabResult = {
  ok: boolean
  skipped?: boolean
  status?: number
  error?: string
  cloudflare?: {
    skipped?: boolean
    ok?: boolean
    status?: number
    error?: string
  }
}

export async function revalidateZenslabCache(
  options: RevalidateZenslabOptions = {}
): Promise<RevalidateZenslabResult> {
  const baseUrl = (
    process.env.ZENSLAB_WEB_URL ||
    process.env.NEXT_PUBLIC_ZENSLAB_WEB_URL ||
    'https://www.zen-slab.com'
  )
    .trim()
    .replace(/\/+$/, '')

  const secret = (
    process.env.ZENSLAB_REVALIDATE_SECRET ||
    process.env.REVALIDATE_SECRET ||
    ''
  ).trim()

  if (!secret) {
    return {
      ok: false,
      skipped: true,
      error: 'Missing ZENSLAB_REVALIDATE_SECRET / REVALIDATE_SECRET env',
    }
  }

  try {
    const res = await fetch(`${baseUrl}/api/revalidate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-revalidate-secret': secret,
      },
      body: JSON.stringify({
        scope: options.scope || 'products',
        productIds: options.productIds,
        includeAlgorithm: Boolean(options.includeAlgorithm),
        purgeCloudflare: options.purgeCloudflare !== false,
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    })

    const json = await res.json().catch(() => null)
    if (!res.ok) {
      console.warn('[revalidateZenslabCache] Failed:', res.status, json)
      return {
        ok: false,
        status: res.status,
        error: json?.error || `HTTP ${res.status}`,
      }
    }

    return {
      ok: true,
      status: res.status,
      cloudflare: json?.cloudflare,
    }
  } catch (err: any) {
    console.warn('[revalidateZenslabCache] Request error:', err?.message || err)
    return {
      ok: false,
      error: err?.message || 'Network error while calling Zen-Slab revalidate',
    }
  }
}
