import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { paymentSlipKey, paymentSlipThumbnailKey, requestR2Object } from '@/lib/r2'

const MAX_SLIP_SIZE = 8 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

async function getAuthenticatedClient() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } },
  )
  const { data: { user } } = await supabase.auth.getUser()
  return { supabase, user }
}

async function getOrderAccess(
  supabase: Awaited<ReturnType<typeof getAuthenticatedClient>>['supabase'],
  userId: string,
  orderId: number,
) {
  const [{ data: profile }, { data: order }] = await Promise.all([
    supabase.from('profiles').select('role, branch_id').eq('user_id', userId).single(),
    supabase
      .from('orders')
      .select('id, status, branch_id, order_items(fulfill_branch_id)')
      .eq('id', orderId)
      .single(),
  ])

  if (!profile || !order) return { profile, order, canAccess: false }
  const relatedToBranch = Number(order.branch_id) === Number(profile.branch_id)
    || order.order_items?.some(item => Number(item.fulfill_branch_id) === Number(profile.branch_id))
  const canAccess = profile.role === 'admin'
    || (['sale', 'manager'].includes(profile.role) && relatedToBranch)
  return { profile, order, canAccess }
}

function parseOrderId(value: string) {
  const orderId = Number(value)
  return Number.isSafeInteger(orderId) && orderId > 0 ? orderId : null
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ orderId: string }> },
) {
  const { supabase, user } = await getAuthenticatedClient()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const orderId = parseOrderId((await context.params).orderId)
  if (!orderId) return NextResponse.json({ error: 'เลขออเดอร์ไม่ถูกต้อง' }, { status: 400 })

  try {
    const { canAccess } = await getOrderAccess(supabase, user.id, orderId)
    if (!canAccess) return NextResponse.json({ error: 'ไม่มีสิทธิ์ดูสลิปนี้' }, { status: 403 })

    const wantsThumbnail = request.nextUrl.searchParams.get('thumbnail') === '1'
    let response = await requestR2Object(
      'GET',
      wantsThumbnail ? paymentSlipThumbnailKey(orderId) : paymentSlipKey(orderId),
    )
    // รองรับสลิปเก่าที่อัปโหลดก่อนมีไฟล์ thumbnail
    if (wantsThumbnail && response.status === 404) {
      response = await requestR2Object('GET', paymentSlipKey(orderId))
    }
    if (response.status === 404) return new NextResponse(null, { status: 404 })
    if (!response.ok) return NextResponse.json({ error: 'โหลดสลิปไม่สำเร็จ' }, { status: 502 })

    return new NextResponse(response.body, {
      headers: {
        'content-type': response.headers.get('content-type') || 'image/jpeg',
        'cache-control': 'private, no-store',
        'content-disposition': `inline; filename="payment-slip-${orderId}.jpg"`,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'โหลดสลิปไม่สำเร็จ' },
      { status: 500 },
    )
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ orderId: string }> },
) {
  const { supabase, user } = await getAuthenticatedClient()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const orderId = parseOrderId((await context.params).orderId)
  if (!orderId) return NextResponse.json({ error: 'เลขออเดอร์ไม่ถูกต้อง' }, { status: 400 })

  const { profile, order, canAccess } = await getOrderAccess(supabase, user.id, orderId)
  if (profile?.role !== 'sale' || !canAccess) {
    return NextResponse.json({ error: 'เฉพาะพนักงานขายเท่านั้นที่แนบสลิปได้' }, { status: 403 })
  }
  if (!order) return NextResponse.json({ error: 'ไม่พบออเดอร์นี้' }, { status: 404 })
  if (!['PENDING', 'PROCESSING'].includes(order.status)) {
    return NextResponse.json({ error: 'แนบหรือเปลี่ยนสลิปได้เฉพาะบิลที่รอชำระเงินหรือรอแพ็คจัดส่ง' }, { status: 409 })
  }

  const formData = await request.formData()
  const file = formData.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'กรุณาเลือกไฟล์สลิป' }, { status: 400 })
  }
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return NextResponse.json({ error: 'รองรับเฉพาะไฟล์ JPG, PNG และ WebP' }, { status: 415 })
  }
  if (file.size > MAX_SLIP_SIZE) {
    return NextResponse.json({ error: 'ไฟล์สลิปต้องมีขนาดไม่เกิน 8 MB' }, { status: 413 })
  }

  try {
    const body = Buffer.from(await file.arrayBuffer())
    const response = await requestR2Object('PUT', paymentSlipKey(orderId), {
      body,
      contentType: 'image/jpeg',
    })
    if (!response.ok) {
      const detail = await response.text()
      console.error('R2 slip upload failed:', response.status, detail)
      return NextResponse.json({ error: 'อัปโหลดสลิปเข้า R2 ไม่สำเร็จ' }, { status: 502 })
    }

    try {
      const thumbnail = await sharp(body)
        .resize({ width: 160, height: 214, fit: 'cover' })
        .jpeg({ quality: 72 })
        .toBuffer()
      const thumbnailResponse = await requestR2Object('PUT', paymentSlipThumbnailKey(orderId), {
        body: thumbnail,
        contentType: 'image/jpeg',
      })
      if (!thumbnailResponse.ok) console.error('R2 slip thumbnail upload failed:', thumbnailResponse.status)
    } catch (thumbnailError) {
      console.error('Create slip thumbnail failed:', thumbnailError)
    }

    return NextResponse.json({
      success: true,
      url: `/api/payment-slips/${orderId}?v=${Date.now()}`,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'อัปโหลดสลิปไม่สำเร็จ' },
      { status: 500 },
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ orderId: string }> },
) {
  const { supabase, user } = await getAuthenticatedClient()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const orderId = parseOrderId((await context.params).orderId)
  if (!orderId) return NextResponse.json({ error: 'เลขออเดอร์ไม่ถูกต้อง' }, { status: 400 })

  const { profile, order, canAccess } = await getOrderAccess(supabase, user.id, orderId)
  if (profile?.role !== 'sale' || !canAccess) {
    return NextResponse.json({ error: 'เฉพาะพนักงานขายเท่านั้นที่ลบสลิปได้' }, { status: 403 })
  }
  if (!order) return NextResponse.json({ error: 'ไม่พบออเดอร์นี้' }, { status: 404 })
  if (!['PENDING', 'PROCESSING'].includes(order.status)) {
    return NextResponse.json({ error: 'ลบสลิปได้เฉพาะบิลที่รอชำระเงินหรือรอแพ็คจัดส่ง' }, { status: 409 })
  }

  try {
    const [response, thumbnailResponse] = await Promise.all([
      requestR2Object('DELETE', paymentSlipKey(orderId)),
      requestR2Object('DELETE', paymentSlipThumbnailKey(orderId)),
    ])
    if (!response.ok && response.status !== 404) {
      const detail = await response.text()
      console.error('R2 slip delete failed:', response.status, detail)
      return NextResponse.json({ error: 'ลบสลิปออกจาก R2 ไม่สำเร็จ' }, { status: 502 })
    }
    if (!thumbnailResponse.ok && thumbnailResponse.status !== 404) {
      console.error('R2 slip thumbnail delete failed:', thumbnailResponse.status)
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'ลบสลิปไม่สำเร็จ' },
      { status: 500 },
    )
  }
}
