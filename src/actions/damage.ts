"use server"

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function getDamageHistory() {
  const cookieStore = await cookies()
  const supabase = createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    cookies: { getAll() { return cookieStore.getAll() } }
  })

  // 1. เช็ค User ที่ล็อกอิน
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Unauthorized" }

  // 2. หาสาขาของ User
  const { data: profile } = await supabase.from('profiles').select('branch_id').eq('user_id', user.id).single()
  const myBranchId = profile?.branch_id

  if (!myBranchId) return { success: false, error: "ไม่พบข้อมูลสาขาของคุณ รบกวนตรวจสอบในระบบ" }

 // ในไฟล์ src/actions/damage.ts ตรงส่วนที่ดึงประวัติ
  const { data: records, error } = await supabase
    .from('damaged_goods_records')
    .select(`
      id,
      qty,
      reason,
      created_at,
      profiles!damaged_goods_records_profile_fk (
        full_name
      ),
      products (
        id,
        name,
        barcode,
        image_url
      )
    `)
    .eq('branch_id', myBranchId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error("Error fetching damage history:", error)
    return { success: false, error: "ดึงข้อมูลประวัติล้มเหลว" }
  }

  return { 
    success: true, 
    data: records || [] 
  }
}