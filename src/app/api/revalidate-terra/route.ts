import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { revalidateTerraCache } from '@/lib/revalidateTerra'

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

  const result = await revalidateTerraCache({
    scope: body?.scope || 'discounts',
    productIds: Array.isArray(body?.productIds) ? body.productIds : undefined,
    collection: body?.collection,
    reason: body?.reason || 'manual-admin-purge',
  })

  if (!result.ok) {
    const status = result.skipped ? 500 : result.status || 502
    return NextResponse.json(result, { status })
  }

  return NextResponse.json(result)
}
