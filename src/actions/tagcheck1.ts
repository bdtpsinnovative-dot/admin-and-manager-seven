// src/actions/tagcheck1.ts
"use server"

import { createClient } from "../utils/supabase/server"

export type TagDiscrepancy = {
  product_id: number
  product_name: string
  barcode: string
  stock_qty: number
  tag_count: number
  diff: number
  image_url: string | null
}

export type TagSummary = {
  total_products: number
  total_stock_qty: number
  total_tag_count: number
  matched_products: number
}

export type FetchResult = {
  data: TagDiscrepancy[]
  summary: TagSummary | null
  error: string | null
}

async function getBranchId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { branchId: null, error: "ไม่มีใครล็อกอินอยู่ หรือ Auth มีปัญหา: " + authError?.message }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('branch_id')
    .eq('user_id', user.id)
    .single()

  if (profileError || !profile?.branch_id) return { branchId: null, error: "หาข้อมูลสาขาไม่เจอ: " + profileError?.message }

  return { branchId: profile.branch_id as number, error: null }
}

export async function fetchTagDiscrepancies(): Promise<FetchResult> {
  const supabase = await createClient()
  const { branchId, error: branchError } = await getBranchId(supabase)
  if (!branchId) return { data: [], summary: null, error: branchError }

  // ดึง discrepancies
  const { data: discData, error: discError } = await supabase
    .rpc("get_tag_discrepancies", { p_branch_id: branchId })
  if (discError) return { data: [], summary: null, error: "RPC error: " + discError.message + " (code: " + discError.code + ")" }

  // ดึง summary ยอดรวมทั้งหมด (stock)
  const { data: stockData, error: stockError } = await supabase
    .from("stock")
    .select("product_id, qty")
    .eq("branch_id", branchId)

  // นับ tag ทุก status ให้ตรงกับ RPC (RPC ไม่ได้กรอง status)
  const { data: tagData, error: tagError } = await supabase
    .from("product_rfid_tags")
    .select("product_id")
    .eq("branch_id", branchId)

  const discrepancies = (discData as TagDiscrepancy[]) ?? []

  let summary: TagSummary | null = null
  if (!stockError && !tagError && stockData && tagData) {
    const totalStockQty = stockData.reduce((sum, row) => sum + (Number(row.qty) ?? 0), 0)
    const totalTagCount = tagData.length
    const totalProducts = stockData.length

    const discrepantIds = new Set(discrepancies.map(d => d.product_id))
    const matchedProducts = totalProducts - discrepantIds.size

    summary = { total_products: totalProducts, total_stock_qty: totalStockQty, total_tag_count: totalTagCount, matched_products: matchedProducts }
  }

  return { data: discrepancies, summary, error: null }
}