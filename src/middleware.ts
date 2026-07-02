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

  // 🛠️ Helper สำหรับ Redirect โดยรักษาคุกกี้ (ป้องกันเซสชันหลุดเมื่อถูก Redirect)
  const redirect = (targetPath: string) => {
    const redirectResponse = NextResponse.redirect(new URL(targetPath, request.url))
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, {
        path: cookie.path,
        domain: cookie.domain,
        maxAge: cookie.maxAge,
        expires: cookie.expires,
        secure: cookie.secure,
        httpOnly: cookie.httpOnly,
        sameSite: cookie.sameSite,
      })
    })
    return redirectResponse
  }

  // --- นิยาม Path ---
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

  // ถ้าไม่ใช่ path ที่ต้อง protect (เช่น API, public pages) → ปล่อยผ่าน (แต่ token ถูก refresh ไปแล้ว)
  if (!isProtectedPath && !isLoginPage) {
    return response
  }

  // 1. ถ้ายังไม่ Login แต่จะเข้าหน้าหวงห้าม -> ไป Login
  if (!user && isProtectedPath) {
    return redirect('/login')
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
        if (role === 'admin') return redirect('/dashboard')
        if (role === 'manager') return redirect('/manager/dashboard')
        if (role === 'sale') return redirect('/sale/pos')
    }

    // ⛔ Admin Path Check
    if (isAdminPath && role !== 'admin') {
      if (role === 'manager') return redirect('/manager/dashboard')
      if (role === 'sale') return redirect('/sale/pos')
      return redirect('/login')
    }

    // ⛔ Manager Path Check
    if (isManagerPath && role !== 'manager') {
       if (role === 'admin') return redirect('/dashboard') 
       if (role === 'sale') return redirect('/sale/pos')
       return redirect('/login')
    }

    // ⛔ Sale Path Check
    if (isSalePath && role !== 'sale') {
       if (role === 'admin') return redirect('/dashboard')
       if (role === 'manager') return redirect('/manager/dashboard')
       return redirect('/login')
    }
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