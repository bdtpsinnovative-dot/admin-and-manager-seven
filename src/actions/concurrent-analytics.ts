"use server"

import { createClient } from "@/lib/supabase/server"
import {
  calculateHourlyConcurrentForDate,
  getAvailableConcurrentDates,
  recordLiveConcurrentPeak,
  type DayConcurrentMetrics,
} from "@/lib/algorithm-concurrent"

async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("กรุณาเข้าสู่ระบบ Admin")
  const { data: profile } = await supabase.from("profiles").select("role").eq("user_id", user.id).maybeSingle()
  if (!profile || !["admin", "super_admin"].includes(String(profile.role))) {
    throw new Error("ไม่มีสิทธิ์ดูข้อมูล Analytics")
  }
}

export async function getConcurrentAnalytics(dateStr?: string): Promise<DayConcurrentMetrics> {
  await requireAdmin()
  return await calculateHourlyConcurrentForDate(dateStr)
}

export async function getConcurrentAvailableDatesAction(): Promise<Array<{ date: string; label: string }>> {
  await requireAdmin()
  return await getAvailableConcurrentDates()
}

export async function recordLiveConcurrentPeakAction(
  count: number,
  mobileCount = 0,
  desktopCount = 0
): Promise<void> {
  await recordLiveConcurrentPeak(count, mobileCount, desktopCount)
}
