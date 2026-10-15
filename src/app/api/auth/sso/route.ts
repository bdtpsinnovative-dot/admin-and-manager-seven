import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const COOKIE_MAX_AGE = 60 * 60 * 24 * 400

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token')
    const refreshToken = request.nextUrl.searchParams.get('refresh_token') || ''
    const redirectTo = request.nextUrl.searchParams.get('redirect_to') || '/'

    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    const cookieStore = await cookies()
    const targetUrl = new URL(redirectTo, request.url)
    const response = NextResponse.redirect(targetUrl)

    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    // 1. ตรวจสอบ Token กับ Supabase Singapore
    const { createClient } = await import('@supabase/supabase-js')
    const verifyClient = createClient(supabaseUrl, supabaseAnonKey)
    const { data: authUserData, error: authUserErr } = await verifyClient.auth.getUser(token)

    if (authUserErr || !authUserData?.user) {
      console.error('SSO Invalid Token:', authUserErr?.message)
      return NextResponse.redirect(new URL('/login?error=invalid_sso_token', request.url))
    }

    const verifiedEmail = authUserData.user.email

    // 2. สร้าง Server Client เพื่อเขียน Cookies ลง Browser
    const ssrClient = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
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
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, {
                ...options,
                maxAge: COOKIE_MAX_AGE,
                sameSite: 'lax',
                path: '/',
              })
              response.cookies.set(name, value, {
                ...options,
                maxAge: COOKIE_MAX_AGE,
                sameSite: 'lax',
                path: '/',
              })
            })
          },
        },
      }
    )

    // 3. ตั้งค่า Session เข้า Browser
    if (refreshToken) {
      const { error: sessErr } = await ssrClient.auth.setSession({
        access_token: token,
        refresh_token: refreshToken,
      })
      if (!sessErr) {
        return response
      }
      console.warn('setSession with refreshToken failed, falling back to magiclink:', sessErr.message)
    }

    // Fallback: หากไม่มี refresh_token หรือ session หมดอายุ ใช้ Service Role สร้าง Magic Link Token
    if (serviceRoleKey && verifiedEmail) {
      const adminClient = createAdminClient(supabaseUrl, serviceRoleKey)
      const { data: linkData, error: linkErr } = await adminClient.auth.admin.generateLink({
        type: 'magiclink',
        email: verifiedEmail,
      })

      if (!linkErr && linkData?.properties?.hashed_token) {
        const { error: verifyErr } = await ssrClient.auth.verifyOtp({
          token_hash: linkData.properties.hashed_token,
          type: 'magiclink',
        })
        if (!verifyErr) {
          return response
        }
        console.error('verifyOtp failed:', verifyErr.message)
      }
    }

    // Direct fallback setSession with token
    await ssrClient.auth.setSession({
      access_token: token,
      refresh_token: token,
    })

    return response
  } catch (err: any) {
    console.error('SSO error:', err)
    return NextResponse.redirect(new URL('/login?error=sso_server_error', request.url))
  }
}
