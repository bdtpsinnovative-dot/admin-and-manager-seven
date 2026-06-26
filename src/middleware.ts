import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  // ✅ ใช้ Env ฝั่ง Server (ถูกต้องแล้วครับ)
  const supabase = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          response = NextResponse.next({ request: { headers: request.headers } })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname

  // --- นิยาม Path ---
  const isLoginPage = path === '/login'
  const isAdminPath = path.startsWith('/dashboard') || 
                      path.startsWith('/employees') || 
                      path.startsWith('/branches') ||
                      path.startsWith('/inventory')
  const isManagerPath = path.startsWith('/manager')
  const isSalePath = path.startsWith('/sale')

  // 1. ถ้ายังไม่ Login แต่จะเข้าหน้าหวงห้าม -> ไป Login
  if (!user && (isAdminPath || isManagerPath || isSalePath)) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 2. ถ้า Login แล้ว
  if (user) {
    // ดึง Role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()
    
    const role = profile?.role

    // ✅ ถ้า Login แล้วแต่อยู่หน้า Login -> ดีดไปหน้า Dashboard ตาม Role
    if (isLoginPage) {
        if (role === 'admin') return NextResponse.redirect(new URL('/dashboard', request.url))
        if (role === 'manager') return NextResponse.redirect(new URL('/manager/dashboard', request.url))
        if (role === 'sale') return NextResponse.redirect(new URL('/sale/pos', request.url))
    }

    // ⛔ Admin Path Check
    if (isAdminPath && role !== 'admin') {
      if (role === 'manager') return NextResponse.redirect(new URL('/manager/dashboard', request.url))
      if (role === 'sale') return NextResponse.redirect(new URL('/sale/pos', request.url))
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // ⛔ Manager Path Check
    if (isManagerPath && role !== 'manager') {
       if (role === 'admin') return NextResponse.redirect(new URL('/dashboard', request.url)) 
       if (role === 'sale') return NextResponse.redirect(new URL('/sale/pos', request.url))
       return NextResponse.redirect(new URL('/login', request.url))
    }

    // ⛔ Sale Path Check
    if (isSalePath && role !== 'sale') {
       if (role === 'admin') return NextResponse.redirect(new URL('/dashboard', request.url))
       if (role === 'manager') return NextResponse.redirect(new URL('/manager/dashboard', request.url))
       return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/dashboard/:path*', 
    '/inventory/:path*', 
    '/employees/:path*', 
    '/branches/:path*',
    '/manager/:path*',
    '/sale/:path*',
    '/login'
  ],
};