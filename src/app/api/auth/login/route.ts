import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const COOKIE_MAX_AGE = 60 * 60 * 24 * 400 // 400 วัน

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const email = (body.email || '').trim()
    const password = body.password || ''

    if (!email || !password) {
      return NextResponse.json({ error: 'กรุณากรอกอีเมลและรหัสผ่าน' }, { status: 400 })
    }

    const cookieStore = await cookies()

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
              // Ignore in contexts where cookies cannot be set
            }
          },
        },
      }
    )

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      console.error('Login API error:', error.message)
      if (error.message.includes('Invalid login credentials')) {
        return NextResponse.json({ error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' }, { status: 401 })
      }
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    let role = null
    let full_name = null
    let avatar_url = null

    if (data?.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, full_name, avatar_url')
        .eq('user_id', data.user.id)
        .single()

      role = profile?.role || null
      full_name = profile?.full_name || data.user.email

      if (profile?.avatar_url) {
        const path = profile.avatar_url
        if (path.startsWith('http') || path.startsWith('blob:')) {
          avatar_url = path
        } else {
          const baseUrl = `${process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public`
          if (path.startsWith('profiles/')) {
            avatar_url = `${baseUrl}/${path}`
          } else {
            avatar_url = `${baseUrl}/profiles/${path}`
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      role,
      user: {
        id: data?.user?.id,
        email: data?.user?.email,
        full_name,
        avatar_url,
        role,
      },
    })
  } catch (err: any) {
    console.error('Login API exception:', err)
    return NextResponse.json({ error: 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง' }, { status: 500 })
  }
}
