"use server"

import { unstable_cache } from "next/cache"
import { createClient } from "../lib/supabase/server"
import { supabaseAdmin } from "../lib/supabase/admin"
import { ADMIN_CACHE_TAGS, ADMIN_CACHE_TTL, getTodayBangkokISO } from "../lib/admin-cache"

// --- Helper: Check Auth ---
async function checkAuth(supabase: any) {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error("Unauthorized: กรุณาเข้าสู่ระบบ")
  return user
}

// 1. ดึง Profile + Role (ไม่แคช — ตรวจสิทธิ์สดทุกครั้ง)
export async function getUserProfile() {
  const supabase = await createClient()
  try {
    const user = await checkAuth(supabase)

    const { data: pf, error } = await supabase
      .from("profiles")
      .select("branch_id, full_name, role, branches(branch_name)")
      .eq("user_id", user.id)
      .single()

    if (error) throw new Error(error.message)

    return {
      user: { id: user.id, email: user.email },
      profile: {
        branch_id: pf.branch_id || 1,
        // @ts-ignore
        branch_name: pf.branches?.branch_name || "Unknown Branch",
        full_name: pf.full_name || user.email,
        role: pf.role,
      },
      error: null,
    }
  } catch (err: any) {
    return { user: null, profile: null, error: err.message }
  }
}

async function queryHistoricalSalesReportCached(
  fromDate: string,
  toDate: string,
  targetBranchId: string
) {
  const run = unstable_cache(
    async () => {
      let query = supabaseAdmin
        .from("sale_dasbrode")
        .select(`
          day, branch_id, bills, subtotal, discount, vat_amount,
          total, cash_total, promptpay_total, note, closed_at,
          branches ( branch_name )
        `)
        .gte("day", fromDate)
        .lte("day", toDate)
        .order("day", { ascending: true })

      if (targetBranchId !== "ALL") {
        query = query.eq("branch_id", Number(targetBranchId))
      }

      const { data, error } = await query
      if (error) throw new Error(error.message)
      return data || []
    },
    ["admin:sales-report:v1", fromDate, toDate, targetBranchId],
    {
      revalidate: ADMIN_CACHE_TTL.HISTORICAL_SALES_SECONDS,
      tags: [ADMIN_CACHE_TAGS.SALES_REPORT],
    }
  )
  return run()
}

// 2. ดึงข้อมูลรายงานยอดขาย (Smart Filter + แยกสิทธิ์ตามยศ + แคชเฉพาะอดีต)
export async function getSalesReport(
  mode: "day" | "month" | "year",
  year: number,
  month: number,
  requestedBranchId: string // Admin ส่ง "ALL" ได้, แต่ Manager/Staff จะถูก Override
) {
  const supabase = await createClient()

  try {
    const user = await checkAuth(supabase)

    // 🕵️‍♀️ ตรวจสอบ Role และ Branch สดทุกครั้งก่อนเข้าถึงข้อมูล
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, branch_id")
      .eq("user_id", user.id)
      .single()

    // ✨ Security Logic: บังคับสาขาตามสิทธิ์ (ไม่ปนข้ามยศ/ข้ามสาขาเด็ดขาด)
    let targetBranchId = requestedBranchId
    const role = (profile?.role || "").toLowerCase()

    if (role !== "admin" && role !== "data_analyst") {
      // Manager / Staff / Sale บังคับดูได้แค่สาขาตัวเองเท่านั้น
      targetBranchId = String(profile?.branch_id || "")
      if (!targetBranchId) {
        return { data: [], error: "ไม่พบสาขาของผู้ใช้งาน" }
      }
    }

    // --- คำนวณช่วงเวลา ---
    const pad2 = (n: number) => String(n).padStart(2, "0")
    let fromDate = "", toDate = ""

    if (mode === "day") {
      fromDate = `${year}-${pad2(month)}-01`
      const lastDay = new Date(year, month, 0).getDate()
      toDate = `${year}-${pad2(month)}-${pad2(lastDay)}`
    } else if (mode === "month") {
      fromDate = `${year}-01-01`
      toDate = `${year}-12-31`
    } else {
      fromDate = `${year - 4}-01-01`
      toDate = `${year}-12-31`
    }

    // ✅ แคชเฉพาะช่วงเวลาอดีตที่ปิดวันไปแล้ว (toDate < วันนี้ตามเวลาไทย)
    const todayBKK = getTodayBangkokISO()
    if (toDate < todayBKK) {
      const cachedData = await queryHistoricalSalesReportCached(fromDate, toDate, targetBranchId)
      return { data: cachedData, error: null }
    }

    // --- ช่วงเวลาที่มี "วันนี้" รวมอยู่ด้วย → ดึงสด 100% ---
    let query = supabase
      .from("sale_dasbrode")
      .select(`
        day, branch_id, bills, subtotal, discount, vat_amount,
        total, cash_total, promptpay_total, note, closed_at,
        branches ( branch_name )
      `)
      .gte("day", fromDate)
      .lte("day", toDate)
      .order("day", { ascending: true })

    if (targetBranchId !== "ALL") {
      query = query.eq("branch_id", Number(targetBranchId))
    }

    const { data, error } = await query
    if (error) throw new Error(error.message)

    return { data: data || [], error: null }
  } catch (err: any) {
    console.error("Sales Report Error:", err.message)
    return { data: [], error: err.message }
  }
}

const getCachedReportBranches = unstable_cache(
  async () => {
    const { data } = await supabaseAdmin.from("branches").select("id, branch_name").order("id")
    return data || []
  },
  ["admin:report-branches:v1"],
  {
    revalidate: ADMIN_CACHE_TTL.MASTER_SECONDS,
    tags: [ADMIN_CACHE_TAGS.BRANCHES],
  }
)

// ✅ 3. ดึงรายชื่อสาขา (เช็ค Auth สด แล้วใช้ Master Cache 1 ปี — ล้างอัตโนมัติเมื่อแก้สาขา)
export async function getReportBranches() {
  const supabase = await createClient()
  try {
    await checkAuth(supabase)
    return await getCachedReportBranches()
  } catch (err) {
    console.error("Fetch Branches Error:", err)
    return []
  }
}
