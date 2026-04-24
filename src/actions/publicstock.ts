// src/actions/publicstock.ts
"use server"

import { createClient } from "../lib/supabase/server" // ✅ ตรวจสอบ Path ให้ตรงกับไฟล์ server.ts ของคุณ
import { revalidatePath } from "next/cache"

// --- Types ---
export interface ProductStock {
  id: number
  product_id: number
  qty: number
  updated_at: string
  products: {
    name: string
    sku: string | null
    barcode: string | null
    unit: string | null
    image_url: string | null
  } | null
}

export interface StockStats {
  totalSku: number
  negativeItems: number
}

// ✅ 1. เพิ่ม Action สำหรับดึง Profile (เพราะ Client เรียกตรงๆ ไม่ได้แล้ว)
export async function getInitialProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from("profiles")
    .select("branch_id, branches(branch_name)")
    .eq("user_id", user.id)
    .single()

  return {
    branch_id: data?.branch_id || 1,
    branch_name: (data?.branches as any)?.branch_name || "Unknown Branch"
  }
}

// ✅ 2. ฟังก์ชันเดิม ปรับการเรียกใช้ supabase
export async function getStockList(
  branchId: number,
  page: number = 1,
  pageSize: number = 30,
  search: string = "",
  onlyNegative: boolean = false
) {
  const supabase = await createClient() // ✅ ปลอดภัยเพราะรันบน Server เท่านั้น
  
  try {
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = supabase
      .from('stock')
      .select(`
        id, product_id, qty, updated_at,
        products!inner (name, sku, barcode, unit, image_url)
      `, { count: 'exact' })
      .eq('branch_id', branchId)
      .order('qty', { ascending: false })
      .range(from, to)

    if (onlyNegative) query = query.lt('qty', 0)

    if (search) {
      if (/^\d+$/.test(search)) {
        query = query.eq('product_id', parseInt(search))
      } else {
        query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%,barcode.ilike.%${search}%`, { foreignTable: 'products' })
      }
    }

    const { data, count, error } = await query
    if (error) throw error

    return { data: data as unknown as ProductStock[], total: count || 0 }
  } catch (error: any) {
    return { data: [], total: 0, error: error.message }
  }
}

// ✅ 3. ดึง Stats
export async function getStockStats(branchId: number): Promise<StockStats> {
  const supabase = await createClient()
  try {
    const { count: totalSku } = await supabase.from('stock').select('id', { count: 'exact', head: true }).eq('branch_id', branchId)
    const { count: negativeItems } = await supabase.from('stock').select('id', { count: 'exact', head: true }).eq('branch_id', branchId).lt('qty', 0)
    return { totalSku: totalSku || 0, negativeItems: negativeItems || 0 }
  } catch {
    return { totalSku: 0, negativeItems: 0 }
  }
}

// ✅ 4. ยอดรวมชิ้นทั้งหมดในสาขา
export async function getTotalQty(branchId: number): Promise<number> {
  const supabase = await createClient()
  try {
    const { data } = await supabase
      .from('stock')
      .select('qty')
      .eq('branch_id', branchId)
      .gt('qty', 0)
    return (data ?? []).reduce((sum, r) => sum + Number(r.qty), 0)
  } catch {
    return 0
  }
}