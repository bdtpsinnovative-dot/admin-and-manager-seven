import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// ยายเปลี่ยนกลับเป็นแบบปกตินะลูก (ไม่ต้องเติม async ตรงนี้แล้ว)
export function createClient() {
  const cookieStore = cookies() // ดึงแบบนี้เลยจ้ะ ไม่ต้อง await ตรงนี้แล้วนะ

  return createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!, // กลับมาใช้ ANON_KEY เหมือนเดิมนะลูก ปลอดภัยกว่า
    {
      cookies: {
        // เติม async/await ตรงฟังก์ชัน get() ด้านในนี้แทนจ้ะ นี่คือจุดสำคัญ!
        async get(name: string) {
          const storedCookie = await cookieStore;
          return storedCookie.get(name)?.value;
        },
        // ถ้าอนาคตจะใช้ set/remove ก็ต้องเติม async/await แบบเดียวกันนะลูก
        // async set(name: string, value: string, options: CookieOptions) {
        //   try {
        //     const storedCookie = await cookieStore;
        //     storedCookie.set({ name, value, ...options })
        //   } catch (error) {
        //     // ...
        //   }
        // },
      },
    }
  )
}