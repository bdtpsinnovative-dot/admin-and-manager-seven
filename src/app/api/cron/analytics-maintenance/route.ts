import { NextResponse } from "next/server"
import { executeMaintenanceWorkflow } from "@/lib/algorithm-maintenance"

export const dynamic = "force-dynamic"
export const maxDuration = 60 // Allow up to 60 seconds for processing

export async function GET(request: Request) {
  try {
    // 1. Verify Vercel Cron Secret (if configured)
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 2. Execute midnight maintenance workflow
    const result = await executeMaintenanceWorkflow("cron")

    return NextResponse.json(result, { status: result.success ? 200 : 207 })
  } catch (error: any) {
    console.error("[Cron Analytics Maintenance Error]:", error)
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Internal server error during maintenance",
      },
      { status: 500 }
    )
  }
}
