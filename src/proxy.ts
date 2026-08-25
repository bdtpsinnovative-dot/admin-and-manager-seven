import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const COOKIE_MAX_AGE = 60 * 60 * 24 * 400 // 400 วัน (ค่าสูงสุดของ Browser / รีเซ็ตยืดเวลาให้ใหม่ทุกครั้งที่เปิดเว็บ)

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname

  // นิยาม Protected Path และ Login Page
  const isLoginPage = path === '/login'
  const isAdminPath = path.startsWith('/dashboard') || 
                      path.startsWith('/employees') || 
                      path.startsWith('/branches') ||
                      path.startsWith('/inventory') ||
                      path.startsWith('/lots') ||
                      path.startsWith('/props') ||
                      path.startsWith('/CheckRfid') ||
                      path.startsWith('/rfid-mismatch')
  const isManagerPath = path.startsWith('/manager')
  const isSalePath = path.startsWith('/sale')
  const isProtectedPath = isAdminPath || isManagerPath || isSalePath

  // ถ้าไม่ใช่ path ที่ต้อง protect และไม่ใช่หน้า login → ปล่อยผ่านทันที
  if (!isProtectedPath && !isLoginPage) {
    return NextResponse.next()
  }

  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  // ✅ ใช้งาน Supabase SSR Client สำหรับ Proxy / Middleware
  const supabase = createServerClient(
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

  // 🔄 Rolling Session: ยืดอายุคุกกี้ Token ทุกครั้งที่มีการใช้งานเว็บ เพื่อไม่ให้มีวันหมดอายุ
  if (user) {
    request.cookies.getAll().forEach((cookie) => {
      if (cookie.name.includes('auth-token') || cookie.name.startsWith('sb-')) {
        response.cookies.set(cookie.name, cookie.value, {
          maxAge: COOKIE_MAX_AGE,
          sameSite: 'lax',
          path: '/',
        })
      }
    })
  }

  // 🛠️ Helper สำหรับ Redirect โดยรักษาคุกกี้ทั้งหมดครบถ้วน ไม่ให้เซสชันหลุด
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
  if (!user && isProtectedPath) {
    return redirectWithCookies('/login')
  }

  // 2. ถ้า Login แล้วแต่อยู่หน้า /login -> ปล่อยให้ผ่านไปหน้าแรกหรือ Layout จัดการ
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
     * - favicon.ico, images, etc.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};