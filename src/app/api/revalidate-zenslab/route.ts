import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { revalidateZenslabCache } from '@/lib/revalidateZenslab'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  let body: any = {}
  try {
    body = await req.json()
  } catch {
    body = {}
  }

  const result = await revalidateZenslabCache({
    scope: body?.scope || 'all',
    productIds: Array.isArray(body?.productIds) ? body.productIds : undefined,
    includeAlgorithm: Boolean(body?.includeAlgorithm),
    purgeCloudflare: body?.purgeCloudflare !== false,
  })

  if (!result.ok) {
    const status = result.skipped ? 500 : result.status || 502
    return NextResponse.json(result, { status })
  }

  return NextResponse.json(result)
}
