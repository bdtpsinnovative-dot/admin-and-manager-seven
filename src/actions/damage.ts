"use server"

import { createClient } from '../lib/supabase/server'

export async function getDamageHistory(requestedBranchId?: number | "ALL") {
  const supabase = await createClient()

  // 1. เช็ค User ที่ล็อกอิน
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Unauthorized" }

  // 2. หา Role และสาขาของ User
  const { data: profile } = await supabase.from('profiles').select('role, branch_id').eq('user_id', user.id).single()
  const isAdmin = profile?.role === 'admin'
  const myBranchId = profile?.branch_id

  if (!isAdmin && !myBranchId) return { success: false, error: "ไม่พบข้อมูลสาขาของคุณ รบกวนตรวจสอบในระบบ" }

  let query = supabase
    .from('damaged_goods_records')
    .select(`
      id,
      qty,
      reason,
      created_at,
      branch_id,
      branches (
        id,
        branch_name
      ),
      profiles!damaged_goods_records_profile_fk (
        full_name
      ),
      products (
        id,
        name,
        barcode,
        image_url,
        price,
        cost
      )
    `)
    .order('created_at', { ascending: false })
    .limit(100)

  if (!isAdmin && myBranchId) {
    query = query.eq('branch_id', myBranchId)
  } else if (isAdmin && requestedBranchId && requestedBranchId !== "ALL") {
    query = query.eq('branch_id', Number(requestedBranchId))
  }

  const { data: records, error } = await query

  if (error) {
    console.error("Error fetching damage history:", error)
    return { success: false, error: "ดึงข้อมูลประวัติล้มเหลว" }
  }

  return { 
    success: true, 
    data: records || [] 
  }
}