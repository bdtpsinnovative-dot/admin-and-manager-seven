"use server"

import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"

export interface Branch {
  id: number
  branch_name: string
}

export interface RawStockInItem {
  code: string
  qty: number
}

export interface StockInPreviewItem {
  id: string
  code: string
  productId: number | null
  name: string
  sku: string | null
  barcode: string | null
  imageUrl: string | null
  category: string | null
  currentStock: number
  inboundQty: number
  newStock: number
  isValid: boolean
  errorMsg?: string
}

// 1. ดึงรายชื่อสาขาทั้งหมด
export async function getBranches(): Promise<Branch[]> {
  const { data, error } = await supabaseAdmin
    .from("branches")
    .select("id, branch_name")
    .order("branch_name")

  if (error) {
    console.error("Error fetching branches:", error)
    return []
  }
  return (data ?? []) as Branch[]
}

// 2. ตรวจสอบข้อมูลสินค้าและดึงสต็อกปัจจุบันเพื่อทำ Preview
export async function lookupStockInItems(
  branchId: number,
  rawItems: RawStockInItem[]
): Promise<{ items: StockInPreviewItem[]; summary: { total: number; valid: number; invalid: number; totalInboundQty: number } }> {
  if (!rawItems || rawItems.length === 0) {
    return {
      items: [],
      summary: { total: 0, valid: 0, invalid: 0, totalInboundQty: 0 },
    }
  }

  // รวมยอดสินค้าที่ใส่ Barcode หรือ SKU ซ้ำกันในไฟล์เดียวกัน
  const aggregatedMap = new Map<string, number>()
  for (const item of rawItems) {
    const cleanCode = String(item.code || "").trim()
    if (!cleanCode) continue
    const cleanQty = Math.max(0, Number(item.qty) || 0)
    const current = aggregatedMap.get(cleanCode) || 0
    aggregatedMap.set(cleanCode, current + cleanQty)
  }

  const distinctCodes = Array.from(aggregatedMap.keys())
  if (distinctCodes.length === 0) {
    return {
      items: [],
      summary: { total: 0, valid: 0, invalid: 0, totalInboundQty: 0 },
    }
  }

  // ค้นหาสินค้าจาก Barcode หรือ SKU
  const [resBarcode, resSku] = await Promise.all([
    supabaseAdmin
      .from("products")
      .select("id, name, sku, barcode, image_url, category_id, status")
      .in("barcode", distinctCodes),
    supabaseAdmin
      .from("products")
      .select("id, name, sku, barcode, image_url, category_id, status")
      .in("sku", distinctCodes),
  ])

  const productMap = new Map<string, any>()

  for (const p of resBarcode.data ?? []) {
    if (p.barcode) productMap.set(p.barcode.trim().toLowerCase(), p)
  }
  for (const p of resSku.data ?? []) {
    if (p.sku) productMap.set(p.sku.trim().toLowerCase(), p)
  }

  // รวบรวม Product ID ทั้งหมดที่เจอเพื่อดึงสต็อกปัจจุบันของสาขานั้น
  const foundProductIds = Array.from(
    new Set(Array.from(productMap.values()).map((p) => p.id))
  )

  const stockMap = new Map<number, number>()
  if (foundProductIds.length > 0) {
    const { data: stocks } = await supabaseAdmin
      .from("stock")
      .select("product_id, qty")
      .eq("branch_id", branchId)
      .in("product_id", foundProductIds)

    for (const s of stocks ?? []) {
      stockMap.set(s.product_id, Number(s.qty) || 0)
    }
  }

  // สร้าง Preview Items
  const previewItems: StockInPreviewItem[] = []
  let validCount = 0
  let invalidCount = 0
  let totalInboundQty = 0

  for (const [code, inboundQty] of aggregatedMap.entries()) {
    const product = productMap.get(code.toLowerCase())
    const isValidProduct = !!product
    const hasValidQty = inboundQty > 0
    const isValid = isValidProduct && hasValidQty

    let errorMsg: string | undefined
    if (!isValidProduct) {
      errorMsg = `ไม่พบรหัสสินค้า "${code}" ในระบบ`
    } else if (!hasValidQty) {
      errorMsg = "จำนวนที่รับเข้าต้องมากกว่า 0"
    }

    const currentStock = product ? stockMap.get(product.id) || 0 : 0
    const newStock = currentStock + inboundQty

    if (isValid) {
      validCount++
      totalInboundQty += inboundQty
    } else {
      invalidCount++
    }

    previewItems.push({
      id: `${code}_${Date.now()}_${Math.random()}`,
      code,
      productId: product ? product.id : null,
      name: product ? product.name : "ไม่พบข้อมูลสินค้า",
      sku: product ? product.sku : null,
      barcode: product ? product.barcode : null,
      imageUrl: product ? product.image_url : null,
      category: product ? product.category_id : null,
      currentStock,
      inboundQty,
      newStock,
      isValid,
      errorMsg,
    })
  }

  return {
    items: previewItems,
    summary: {
      total: previewItems.length,
      valid: validCount,
      invalid: invalidCount,
      totalInboundQty,
    },
  }
}

// 3. กดยืนยันบันทึกรับสินค้าเข้าสต็อก (อัปเดต stock + บันทึก stock_movements)
export async function confirmStockIn(payload: {
  branchId: number
  items: { productId: number; qty: number; code?: string }[]
  note?: string
}): Promise<{ success: boolean; count: number; totalQty: number; error?: string }> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, count: 0, totalQty: 0, error: "กรุณาเข้าสู่ระบบก่อนทำรายการ" }
    }

    if (!payload.branchId) {
      return { success: false, count: 0, totalQty: 0, error: "กรุณาเลือกสาขาที่ต้องการรับเข้า" }
    }

    const validItems = payload.items.filter((i) => i.productId && i.qty > 0)
    if (validItems.length === 0) {
      return { success: false, count: 0, totalQty: 0, error: "ไม่มีรายการสินค้าที่ถูกต้องให้รับเข้า" }
    }

    // ดึงชื่อสาขาเพื่อใส่ใน Note
    const { data: branch } = await supabaseAdmin
      .from("branches")
      .select("branch_name")
      .eq("id", payload.branchId)
      .single()

    const branchName = branch?.branch_name || `สาขา ID: ${payload.branchId}`

    // ดึงชื่อพนักงานผู้ทำรายการ
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("user_id", user.id)
      .single()

    const userName = profile?.full_name || user.email || "Admin"
    const nowIso = new Date().toISOString()
    let totalQty = 0

    // อัปเดตสต็อกทีละชิ้น และสร้าง Log ใน stock_movements
    for (const item of validItems) {
      const { data: currentStock } = await supabaseAdmin
        .from("stock")
        .select("id, qty")
        .eq("product_id", item.productId)
        .eq("branch_id", payload.branchId)
        .maybeSingle()

      if (currentStock) {
        await supabaseAdmin
          .from("stock")
          .update({
            qty: Number(currentStock.qty) + Number(item.qty),
            updated_at: nowIso,
          })
          .eq("id", currentStock.id)
      } else {
        await supabaseAdmin.from("stock").insert({
          product_id: item.productId,
          branch_id: payload.branchId,
          qty: item.qty,
          updated_at: nowIso,
        })
      }

      // บันทึก Log การรับเข้าใน stock_movements
      const baseNote = payload.note?.trim()
        ? `${payload.note.trim()} (รับเข้า ${branchName})`
        : `รับสินค้าเข้าสต็อกผ่าน Excel (${branchName})`

      await supabaseAdmin.from("stock_movements").insert({
        product_id_bigint: item.productId,
        branch_id: payload.branchId,
        type: "IN",
        qty: item.qty,
        note: baseNote,
        ref_type: "WEB_EXCEL_INBOUND",
        created_by: user.id,
        created_by_name: userName,
      })

      totalQty += item.qty
    }

    // Revalidate paths ที่เกี่ยวข้อง
    revalidatePath("/stock-in")
    revalidatePath("/inventory")
    revalidatePath("/stock-all")
    revalidatePath("/stockmovement")

    return {
      success: true,
      count: validItems.length,
      totalQty,
    }
  } catch (err: any) {
    console.error("Execute stock in error:", err)
    return {
      success: false,
      count: 0,
      totalQty: 0,
      error: err.message || "เกิดข้อผิดพลาดในการบันทึกรับเข้าสต็อก",
    }
  }
}
