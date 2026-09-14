import { NextRequest, NextResponse } from "next/server"
import { MobilePosAuthController } from "@/api/mobile_pos/auth"
import { MobilePosSalesController } from "@/api/mobile_pos/sales"
import { MobileRfidService } from "@/api/mobile_rfid/service"

function withCors(request: NextRequest, response: NextResponse) {
  const origin = request.headers.get("origin")
  const allowedOrigins = (process.env.MOBILE_POS_ALLOWED_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
  const isLocalDevelopmentOrigin = Boolean(
    origin && process.env.NODE_ENV !== "production" && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
  )

  if (origin && (allowedOrigins.includes(origin) || isLocalDevelopmentOrigin)) {
    response.headers.set("Access-Control-Allow-Origin", origin)
    response.headers.set("Vary", "Origin")
    response.headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type")
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
  }
  response.headers.set("Cache-Control", "no-store")
  return response
}

function unauthorized(request: NextRequest) {
  return withCors(request, NextResponse.json({ success: false, message: "ต้องเข้าสู่ระบบก่อนใช้งาน" }, { status: 401 }))
}

async function dispatch(request: NextRequest, path: string[]) {
  const subpath = path.join("/")
  if (request.method === "POST" && subpath === "auth/login") {
    return withCors(request, await MobilePosAuthController.login(request))
  }
  if (request.method === "POST" && subpath === "auth/refresh") {
    return withCors(request, await MobilePosAuthController.refresh(request))
  }
  if (request.method === "GET" && subpath === "auth/profile") {
    const authorization = request.headers.get("authorization")
    const token = authorization?.startsWith("Bearer ") ? authorization.slice(7).trim() : ""
    if (!token) return unauthorized(request)
    return withCors(request, await MobilePosAuthController.profile(token))
  }

  const authorization = request.headers.get("authorization")
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7).trim() : ""
  if (!token) return unauthorized(request)

  try {
    const user = await MobileRfidService.verifyToken(token)
    if (request.method === "GET" && subpath === "products") {
      return withCors(request, await MobilePosSalesController.products(user))
    }
    if (request.method === "POST" && subpath === "quotes") {
      return withCors(request, await MobilePosSalesController.createQuote(user, await request.json()))
    }
  } catch (error) {
    console.error("Mobile POS authorization error:", error)
    return unauthorized(request)
  }

  return withCors(request, NextResponse.json({ success: false, message: "ไม่พบ Mobile POS API endpoint นี้" }, { status: 404 }))
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return dispatch(request, (await params).path)
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return dispatch(request, (await params).path)
}

export async function OPTIONS(request: NextRequest) {
  return withCors(request, new NextResponse(null, { status: 204 }))
}
