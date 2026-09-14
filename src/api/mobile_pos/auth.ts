import { NextRequest, NextResponse } from "next/server"
import { MobileRfidService } from "@/api/mobile_rfid/service"

function loginError(error: unknown) {
  console.error("Mobile POS authentication error:", error)
  const message = error instanceof Error ? error.message.toLowerCase() : ""
  const isInvalidCredentials = message.includes("invalid login credentials")
  return NextResponse.json(
    {
      success: false,
      message: isInvalidCredentials
        ? "อีเมลหรือรหัสผ่านไม่ถูกต้อง"
        : "ไม่สามารถเข้าสู่ระบบได้ กรุณาลองใหม่อีกครั้ง",
    },
    { status: isInvalidCredentials ? 401 : 500 }
  )
}

function createSessionResponse(data: {
  session: { access_token: string; refresh_token: string; expires_in: number } | null
  user: { id: string; email?: string | null } | null
}) {
  if (!data.session || !data.user) {
    throw Object.assign(new Error("ไม่สามารถสร้างเซสชันสำหรับอุปกรณ์ได้"), { status: 401 })
  }

  return {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_in: data.session.expires_in,
    user: {
      id: data.user.id,
      email: data.user.email ?? null,
    },
  }
}

/** API contract for the Flutter POS app. Never return database credentials. */
export const MobilePosAuthController = {
  async login(request: NextRequest) {
    try {
      const body = await request.json()
      const email = typeof body.email === "string" ? body.email.trim() : ""
      const password = typeof body.password === "string" ? body.password : ""

      if (!email || !password) {
        return NextResponse.json(
          { success: false, message: "กรุณากรอกอีเมลและรหัสผ่าน" },
          { status: 422 }
        )
      }

      const data = await MobileRfidService.signIn(email, password)
      return NextResponse.json({ success: true, ...createSessionResponse(data) }, { status: 200 })
    } catch (error) {
      return loginError(error)
    }
  },

  async refresh(request: NextRequest) {
    try {
      const body = await request.json()
      const refreshToken = typeof body.refresh_token === "string" ? body.refresh_token : ""
      if (!refreshToken) {
        return NextResponse.json(
          { success: false, message: "ไม่พบ refresh token" },
          { status: 422 }
        )
      }

      const data = await MobileRfidService.refreshSession(refreshToken)
      return NextResponse.json({ success: true, ...createSessionResponse(data) }, { status: 200 })
    } catch (error) {
      console.error("Mobile POS refresh error:", error)
      return NextResponse.json(
        { success: false, message: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่" },
        { status: 401 }
      )
    }
  },

  async profile(token: string) {
    try {
      const user = await MobileRfidService.verifyToken(token)
      const profile = await MobileRfidService.fetchProfile(user.userId)

      return NextResponse.json({
        success: true,
        user: {
          id: user.userId,
          email: user.email ?? null,
          full_name: profile.full_name ?? null,
          role: user.role,
          branch_id: user.branchId,
          branch_name: profile.branches?.branch_name ?? null,
        },
      })
    } catch (error) {
      console.error("Mobile POS profile error:", error)
      return NextResponse.json(
        { success: false, message: "เซสชันไม่ถูกต้องหรือหมดอายุ" },
        { status: 401 }
      )
    }
  },
}
