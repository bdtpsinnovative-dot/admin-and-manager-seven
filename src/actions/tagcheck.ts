"use server"

import { createClient } from "@/lib/supabase/server"

export interface PropTagStatus {
  id: number
  name: string
  sku: string | null
  barcode: string | null
  color: string | null
  image_url: string | null
  specs: Record<string, unknown>
  qty: number | null  // null = ไม่มี stock record เลย
  tagged: boolean     // มี stock record ในสาขานี้
}

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

export async function getPropTagStatus(branchId: number): Promise<PropTagStatus[]> {
  const supabase = await createClient()

  const { data: props } = await supabase
    .from("products")
    .select("id, name, sku, barcode, color, image_url, specs")
    .eq("category_id", "prop")
    .eq("status", "active")
    .order("name", { ascending: true })

  if (!props || props.length === 0) return []

  const productIds = props.map(p => p.id)

  const { data: stocks } = await supabase
    .from("stock")
    .select("product_id, qty")
    .eq("branch_id", branchId)
    .in("product_id", productIds)

  const stockMap = new Map<number, number>(
    (stocks ?? []).map(s => [s.product_id, Number(s.qty)])
  )

  return props.map(p => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    barcode: p.barcode,
    color: p.color,
    image_url: p.image_url,
    specs: (p.specs as Record<string, unknown>) ?? {},
    qty: stockMap.has(p.id) ? stockMap.get(p.id)! : null,
    tagged: stockMap.has(p.id),
  }))
}
