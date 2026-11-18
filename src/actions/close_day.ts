"use server"

import { createClient } from "../lib/supabase/server"
import { revalidatePath } from "next/cache"
import { ADMIN_CACHE_TAGS, invalidateAdminTags } from "../lib/admin-cache"

// --- Helper Functions (ย้ายมา Server) ---
const bangkokDayKeyFromSoldAt = (iso: string) => {
  if (!iso) return ""
  // แปลง Timezone ที่ Server ให้ตรงกับไทย
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" })
}

const isPromptpay = (pm: string | null) => {
  const s = String(pm || "").toUpperCase()
  return s.includes("PROMPT") || s.includes("QR") || s.includes("TRANSFER")
}

// ✅ [เพิ่ม] ฟังก์ชันดึง Profile ของคนล็อกอิน (ทำที่ Server)
export async function getUserProfile() {
  const supabase = await createClient()
  
  try {
    // 1. Check User
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) throw new Error("Unauthorized")

    // 2. Get Profile & Branch
    const { data: pf, error: dbError } = await supabase
      .from("profiles")
      .select("branch_id, full_name, branches(branch_name)")
      .eq("user_id", user.id)
      .single()

    if (dbError) throw new Error(dbError.message)

    // 3. Format Data
    const profileData = {
      branch_id: pf.branch_id || 1,
      // @ts-ignore
      branch_name: pf.branches?.branch_name || "Unknown Branch",
      full_name: pf.full_name || user.email
    }

    return { 
      user: { id: user.id, email: user.email }, 
      profile: profileData, 
      error: null 
    }

  } catch (err: any) {
    return { user: null, profile: null, error: err.message }
  }
}

// 1. ดึงรายการค้างปิดรอบ (Get Pending Sales)
export async function getPendingDays(branchId: number) {
  const supabase = await createClient()
  
  try {
    const since = new Date(Date.now() - 90 * 86400000).toISOString()
    
    const { data, error } = await supabase
      .from("sales")
      .select("sold_at, total, payment_method, status, note")
      .eq("status", "PAID")
      .eq("branch_id", branchId)
      .or("note.is.null,note.eq.") 
      .gte("sold_at", since)
      .order("sold_at", { ascending: false })

    if (error) throw new Error(error.message)

    // Grouping Logic
    const m = new Map()
    data?.forEach((r) => {
        const dayKey = bangkokDayKeyFromSoldAt(r.sold_at)
        
        if (!m.has(dayKey)) {
            m.set(dayKey, { dayKey, bills: 0, total: 0, cash_total: 0, promptpay_total: 0 })
        }
        
        const cur = m.get(dayKey)
        const amt = Number(r.total) || 0
        
        cur.bills += 1
        cur.total += amt
        
        const pm = (r.payment_method || "").toUpperCase()
        if (pm === "CASH") cur.cash_total += amt
        else if (isPromptpay(pm)) cur.promptpay_total += amt
    })

    const days = Array.from(m.values()).sort((a: any, b: any) => a.dayKey.localeCompare(b.dayKey))
    return { data: days, error: null }

  } catch (err: any) {
    return { data: [], error: err.message }
  }
}

// 2. ปิดยอดรายวัน (Close Day Transaction)
export async function closeDayAction(branchId: number, dayKey: string) {
  const supabase = await createClient()
  
  try {
    // 1. Check Auth (สำคัญมากสำหรับการเงิน)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Unauthorized")

    const noteText = `ปิดวัน ${dayKey}` // รูปแบบ YYYY-MM-DD
    const startISO = new Date(`${dayKey}T00:00:00+07:00`).toISOString()
    const endISO = new Date(`${dayKey}T23:59:59.999+07:00`).toISOString()

    // 2. Mark Bills (Update)
    const { error: upErr } = await supabase
        .from("sales")
        .update({ note: noteText })
        .eq("branch_id", branchId)
        .eq("status", "PAID")
        .or("note.is.null,note.eq.") 
        .gte("sold_at", startISO)
        .lte("sold_at", endISO)

    if (upErr) throw new Error("Mark Error: " + upErr.message)

    // 3. Recalculate (Select)
    const { data: allSales, error: sumErr } = await supabase
        .from("sales")
        .select("total, payment_method")
        .eq("branch_id", branchId)
        .eq("status", "PAID")
        .gte("sold_at", startISO)
        .lte("sold_at", endISO)

    if (sumErr) throw new Error("Calc Error: " + sumErr.message)

    let grandTotal = 0, cash = 0, promptpay = 0, bills = 0
    allSales?.forEach(s => {
        const amt = Number(s.total) || 0
        grandTotal += amt
        bills++
        const pm = (s.payment_method || "").toUpperCase()
        if (pm === "CASH") cash += amt
        else if (isPromptpay(pm)) promptpay += amt
    })

    // 4. Save Dashboard (Upsert)
    const payload = {
        day: dayKey,
        branch_id: branchId,
        bills: bills,
        total: grandTotal, 
        cash_total: cash,
        promptpay_total: promptpay,
        closed_at: new Date().toISOString(),
        note: noteText,
        closed_by: user.id
    }

    const { error: dbErr } = await supabase
        .from("sale_dasbrode")
        .upsert(payload, { onConflict: "day,branch_id" })

    if (dbErr) throw new Error("Save Error: " + dbErr.message)

    revalidatePath('/close_day') // Refresh หน้า
    invalidateAdminTags(ADMIN_CACHE_TAGS.SALES_REPORT)
    return { success: true, total: grandTotal, error: null }

  } catch (err: any) {
    return { success: false, total: 0, error: err.message }
  }
}