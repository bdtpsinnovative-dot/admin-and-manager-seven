import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { paymentSlipKey, requestR2Object } from '@/lib/r2'

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

function parseOrderId(value: string) {
  const orderId = Number(value)
  return Number.isSafeInteger(orderId) && orderId > 0 ? orderId : null
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ orderId: string }> },
) {
  const { user } = await getAuthenticatedClient()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const orderId = parseOrderId((await context.params).orderId)
  if (!orderId) return NextResponse.json({ error: 'เลขออเดอร์ไม่ถูกต้อง' }, { status: 400 })

  try {
    const response = await requestR2Object('GET', paymentSlipKey(orderId))
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

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single()
  if (profile?.role !== 'sale') {
    return NextResponse.json({ error: 'เฉพาะพนักงานขายเท่านั้นที่แนบสลิปได้' }, { status: 403 })
  }

  const { data: order } = await supabase.from('orders').select('id, status').eq('id', orderId).single()
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

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single()
  if (profile?.role !== 'sale') {
    return NextResponse.json({ error: 'เฉพาะพนักงานขายเท่านั้นที่ลบสลิปได้' }, { status: 403 })
  }

  const { data: order } = await supabase.from('orders').select('id, status').eq('id', orderId).single()
  if (!order) return NextResponse.json({ error: 'ไม่พบออเดอร์นี้' }, { status: 404 })
  if (!['PENDING', 'PROCESSING'].includes(order.status)) {
    return NextResponse.json({ error: 'ลบสลิปได้เฉพาะบิลที่รอชำระเงินหรือรอแพ็คจัดส่ง' }, { status: 409 })
  }

  try {
    const response = await requestR2Object('DELETE', paymentSlipKey(orderId))
    if (!response.ok && response.status !== 404) {
      const detail = await response.text()
      console.error('R2 slip delete failed:', response.status, detail)
      return NextResponse.json({ error: 'ลบสลิปออกจาก R2 ไม่สำเร็จ' }, { status: 502 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'ลบสลิปไม่สำเร็จ' },
      { status: 500 },
    )
  }
}
