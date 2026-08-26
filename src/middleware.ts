import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const COOKIE_MAX_AGE = 60 * 60 * 24 * 400 // 400 วัน (ต่ออายุให้อัตโนมัติทุกครั้งที่เข้าเว็บ)

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  // หน้า Public ที่ไม่ต้องดักจับ
  const isLoginPage = path === '/login'
  const isPublicApi = path.startsWith('/api/mobile_rfid') || path.startsWith('/_next')
  const isPublicPath = isLoginPage || isPublicApi

  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  // สร้าง Supabase SSR Client เพื่อต่ออายุ Session
  const supabase = createServerClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        maxAge: COOKIE_MAX_AGE,
        sameSite: 'lax',
        path: '/',
      },
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request: { headers: request.headers } })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, {
              ...options,
              maxAge: COOKIE_MAX_AGE,
              sameSite: 'lax',
              path: '/',
            })
          )
        },
      },
    }
  )

  // ดึง User ผ่าน getUser() เพื่อ Refresh Token อัตโนมัติในเบื้องหลัง
  const { data: { user } } = await supabase.auth.getUser()

  // Helper สำหรับ Redirect โดยส่งคุกกี้ Session ไปด้วย
  const redirectWithCookies = (targetPath: string) => {
    const redirectResponse = NextResponse.redirect(new URL(targetPath, request.url))
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, {
        maxAge: COOKIE_MAX_AGE,
        sameSite: 'lax',
        path: '/',
      })
    })
    return redirectResponse
  }

  // 1. ถ้ายังไม่ Login แต่จะเข้าหน้าที่ต้องล็อกอิน -> ส่งไปหน้า /login
  if (!user && !isPublicPath) {
    return redirectWithCookies('/login')
  }

  // 2. ถ้า Login แล้วแต่อยู่หน้า /login -> ส่งไป Dashboard
  if (user && isLoginPage) {
    return redirectWithCookies('/dashboard')
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, images, fonts, etc.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot)$).*)',
  ],
}
