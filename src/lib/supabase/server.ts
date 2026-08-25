import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const COOKIE_MAX_AGE = 60 * 60 * 24 * 400 // 400 วัน (ค่าสูงสุดที่ Browser อนุญาต / ต่ออายุอัตโนมัติทุกครั้งที่เข้าเว็บ)

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        maxAge: COOKIE_MAX_AGE,
        sameSite: 'lax',
        path: '/',
      },
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, {
                ...options,
                maxAge: COOKIE_MAX_AGE,
                sameSite: 'lax',
                path: '/',
              })
            )
          } catch {
            // Server Component calls will throw — safe to ignore
          }
        },
      },
    }
  )
}