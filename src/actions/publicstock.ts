// src/actions/publicstock.ts
"use server"

import { createClient } from "../lib/supabase/server" // ✅ ตรวจสอบ Path ให้ตรงกับไฟล์ server.ts ของคุณ
import { revalidatePath } from "next/cache"
import sharp from "sharp"

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
// ✅ 2. ฟังก์ชันที่แก้ไขแล้ว (ไม่ต้องสนว่าเป็นตัวเลขหรือตัวอักษร ให้ค้นหาคลุมให้หมด)
export async function getStockList(
  branchId: number,
  page: number = 1,
  pageSize: number = 30,
  search: string = "",
  onlyNegative: boolean = false
) {
  const supabase = await createClient() 
  
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

    if (onlyNegative) query = query.lt('qty', 0)

    // 🌟 นำกับดักตัวเลขออก ให้ค้นหาจาก ชื่อ, SKU, Barcode ไปเลยตรงๆ
    if (search) {
      query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%,barcode.ilike.%${search}%`, { foreignTable: 'products' })
    }

    // จัดเรียงและแบ่งหน้า
    query = query.order('qty', { ascending: false }).range(from, to)

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

// ✅ 5. ดึงข้อมูลทั้งหมดสำหรับ Export Excel
export async function getAllStockForExport(branchId: number) {
  const supabase = await createClient()
  try {
    const { data, error } = await supabase
      .from('stock')
      .select(`
        qty,
        products!inner (name, price, specs)
      `)
      .eq('branch_id', branchId)
      .order('qty', { ascending: false })

    if (error) throw error
    return data
  } catch (error: any) {
    console.error("Export error:", error.message)
    return []
  }
}

// ✅ 6. ดึงรูปภาพเป็น Base64 (เพื่อแก้ปัญหา CORS บน Browser) และแปลง WebP เป็น JPEG สำหรับ Excel
export async function getBase64Image(url: string) {
  try {
    if (!url) return null
    const res = await fetch(url)
    if (!res.ok) return null
    const arrayBuffer = await res.arrayBuffer()
    const inputBuffer = Buffer.from(arrayBuffer)

    // แปลงรูปเป็น JPEG เสมอ เพราะ Excel ไม่รองรับ WebP
    const outputBuffer = await sharp(inputBuffer).jpeg({ quality: 80 }).toBuffer()

    return outputBuffer.toString('base64')
  } catch (e) {
    console.error("Image conversion error:", e)
    return null
  }
}

import ExcelJS from "exceljs"

// ✅ 7. สร้างไฟล์ Excel บน Server เลย เพื่อให้ชัวร์ว่า exceljs และรูปภาพทำงานได้ 100%
export async function generateExcelFile(branchId: number, includeImages: boolean = false): Promise<string | null> {
  const supabase = await createClient()
  try {
    const { data, error } = await supabase
      .from('stock')
      .select(`
        qty,
        products!inner (name, price, specs, image_url, sku, barcode)
      `)
      .eq('branch_id', branchId)
      .order('qty', { ascending: false })

    if (error) throw error
    if (!data) return null

    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet("Stock")

    sheet.columns = [
      { header: 'No', key: 'no', width: 8 },
      { header: 'Image', key: 'image', width: 12 },
      { header: 'Product', key: 'product', width: 45 },
      { header: 'SKU', key: 'sku', width: 25 },
      { header: 'Barcode', key: 'barcode', width: 20 },
      { header: 'Size (cm)', key: 'size', width: 25 },
      { header: 'Qty', key: 'qty', width: 10 },
      { header: 'Price', key: 'price', width: 15 },
    ]

    sheet.getRow(1).font = { bold: true }
    sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' }

    for (let i = 0; i < data.length; i++) {
      const item = data[i] as any
      const specs = item.products?.specs || {}
      const w = specs.width_cm || "-"
      const d = specs.length_cm || "-"
      const h = specs.thickness_cm || "-"

      const row = sheet.addRow({
        no: i + 1,
        product: item.products?.name || "-",
        sku: item.products?.sku || "-",
        barcode: item.products?.barcode || "-",
        size: `W${w} x D${d} x H${h}`,
        qty: Number(item.qty) || 0,
        price: Number(item.products?.price) || 0
      })

      row.height = includeImages ? 60 : 24
      row.alignment = { vertical: 'middle' }

      if (includeImages) {
        let imageUrl = item.products?.image_url
        if (imageUrl) {
          if (imageUrl.startsWith('/')) {
              imageUrl = process.env.NEXT_PUBLIC_SITE_URL ? process.env.NEXT_PUBLIC_SITE_URL + imageUrl : "http://localhost:3000" + imageUrl
          }
          const base64str = await getBase64Image(imageUrl)
          if (base64str) {
            const imageId = workbook.addImage({
              base64: `data:image/jpeg;base64,${base64str}`,
              extension: 'jpeg'
            })
            
            sheet.addImage(imageId, {
              tl: { col: 1, row: row.number - 1 },
              ext: { width: 60, height: 60 },
              editAs: 'oneCell'
            })
          }
        }
      }
    }

    const buffer = await workbook.xlsx.writeBuffer()
    return Buffer.from(buffer).toString('base64')

  } catch (error: any) {
    console.error("Excel generation error:", error.message)
    return null
  }
}