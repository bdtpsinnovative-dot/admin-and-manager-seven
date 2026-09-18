import { createClient } from '@supabase/supabase-js'

// สร้าง Admin Client ครั้งเดียวแล้วส่งออกไปใช้เลย
export const supabaseAdmin = createClient(
  (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // ต้องใช้ Key ลับตัวนี้เท่านั้น (ห้ามใช้ใน client component)
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)