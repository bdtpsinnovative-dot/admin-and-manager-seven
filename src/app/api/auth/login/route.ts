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
    let first_allowed_page: string | null = null

    if (data?.user) {
      let profile: any = null
      const pfRes = await supabase
        .from('profiles')
        .select('role, full_name, avatar_url, member_tags, allowed_pages')
        .eq('user_id', data.user.id)
        .single()

      if (pfRes.error && pfRes.error.message?.includes('allowed_pages')) {
        const pfFallback = await supabase
          .from('profiles')
          .select('role, full_name, avatar_url, member_tags')
          .eq('user_id', data.user.id)
          .single()
        profile = pfFallback.data
      } else {
        profile = pfRes.data
      }

      role = profile?.role || null
      full_name = profile?.full_name || data.user.email

      const rawMemberTags: string[] = Array.isArray(profile?.member_tags) ? profile.member_tags : []
      const pageTags = rawMemberTags.filter((t) => t.startsWith('PAGE:')).map((t) => t.slice(5))
      const pages: string[] =
        Array.isArray(profile?.allowed_pages) && profile.allowed_pages.length > 0
          ? profile.allowed_pages
          : pageTags

      if (pages.length > 0 && role !== 'manager' && role !== 'sale') {
        first_allowed_page = pages[0]
      }

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
      first_allowed_page,
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
