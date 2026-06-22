"use server"

import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// 💡 1. ฟังก์ชันสร้าง SSR Client แบบไดนามิก (อัปเดตรองรับ Next.js 15+)
async function getSsrClient() {
  // 🔴 ต้องใส่ await ตรงนี้ Next.js ถึงจะยอมให้ผ่าน
  const cookieStore = await cookies() 
  
  return createServerClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_ANON_KEY || '',
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch (error) {
            // ดัก Error ไว้เผื่อกรณีฟังก์ชันนี้ถูกเรียกใช้ใน Server Component ที่ห้าม Set คุกกี้
          }
        },
      }
    }
  )
}

// 💡 2. ฟังก์ชันหาสาขาแบบไดนามิกแท้ (ไม่มีฮาร์ดโค้ดเลข 1 แฝง)
async function getCurrentBranchId(): Promise<number> {
  const supabaseAuth = await getSsrClient()
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
  
  // ถ้าระบบตรวจสอบแล้วไม่พบ Session ของพนักงาน ให้สั่งตัดการทำงานทันที
  if (authError || !user) {
    throw new Error("UNAUTHORIZED: เซสชันหมดอายุหรือหาบัญชีผู้ใช้ไม่พบ")
  }

  const { data: profile, error: profileError } = await supabaseAuth
    .from('profiles')
    .select('branch_id')
    .eq('user_id', user.id)
    .single()

  // ถ้าไม่มีสาขาผูกอยู่กับโปรไฟล์นี้ ให้ Throw ข้อผิดพลาดแจ้งเตือนแอดมิน
  if (profileError || !profile?.branch_id) {
    throw new Error("BRANCH_NOT_FOUND: บัญชีนี้ยังไม่ได้ตั้งค่ารหัสสาขาในระบบ")
  }

  return profile.branch_id
}

// 💡 3. ฟังก์ชันสร้าง Admin Client (เรียกเมื่อทำงานเท่านั้น)
function getAdminClient() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error("ลืมตั้งค่า Env ในไฟล์ .env.local ครับนาย")
  }
  return createClient(url, key)
}

// 🟢 1. [ปรับปรุง] ค้นหาสินค้าจากฝั่ง Server (แนะนำให้ใช้แทนการโหลดสินค้าทั้งหมด)
// รองรับการค้นหาทั้งจาก ชื่อสินค้า (name) หรือรหัสสินค้า (sku) ดึงมา 50 รายการที่ตรงที่สุด
export async function searchProducts(keyword: string) {
  try {
    if (!keyword || keyword.trim() === "") return []
    
    const supabase = getAdminClient()
    const cleanKeyword = `%${keyword.trim()}%`

    const { data, error } = await supabase
      .from('products')
      .select('id, name, sku, image_url')
      .or(`name.ilike.${cleanKeyword},sku.ilike.${cleanKeyword}`) // ค้นหาได้ทั้งชื่อและ SKU
      .order('name')
      .limit(50) // จำกัดความเร็ว ดึงเฉพาะที่จำเป็นมาแสดงผล
      
    if (error) throw error
    return data || []
  } catch (error) {
    console.error("🔴 SearchProducts Error:", error)
    return []
  }
}

// 🟢 2. ดึงรายการสินค้าทั้งหมดที่มีในระบบ (เพิ่มลิมิตให้เป็น 10,000 แถวเพื่อแก้ปัญหาค้นหาไม่เจอชั่วคราว)
export async function getAllProducts() {
  try {
    const supabase = getAdminClient()
    const { data, error } = await supabase
      .from('products')
      .select('id, name, sku, image_url')
      .order('name')
      .limit(10000) // ขยายลิมิตเป็น 10,000 แถว ป้องกันปัญหาสินค้าตกหล่น
      
    if (error) throw error
    return data || []
  } catch (error) {
    console.error("🔴 GetAllProducts Error:", error)
    return []
  }
}

// 🟢 3. ดึงรายการที่กำลังถูกสั่งค้นหาอยู่ ณ ตอนนี้ของสาขานั้น แบบไดนามิก
export async function getActiveSearchTargets() {
  try {
    const branchId = await getCurrentBranchId()
    const supabase = getAdminClient()
    
    const { data, error } = await supabase
      .from('search_targets')
      .select('id, product_id, products(name, sku, image_url)')
      .eq('branch_id', branchId)
    
    if (error) throw error
    
    return data ? data.map((item: any) => ({
      ...item,
      products: Array.isArray(item.products) ? item.products[0] : item.products
    })) : []
    
  } catch (error: any) {
    console.error("🔴 GetActiveTargets Error:", error.message)
    return []
  }
}

// 🟢 4. กดเพิ่มสินค้าเข้าไปในตารางเป้าหมายการค้นหา แบบไดนามิกสาขา
export async function addSearchTarget(productId: number) {
  try {
    const branchId = await getCurrentBranchId()
    const supabase = getAdminClient()
    
    const { error } = await supabase
      .from('search_targets')
      .upsert(
        { product_id: productId, branch_id: branchId }, 
        { onConflict: 'product_id,branch_id' }
      )
    
    if (error) throw error
    return { success: true }
  } catch (error: any) {
    console.error("🔴 AddTarget Error:", error.message)
    return { 
      success: false, 
      message: error.message.includes("UNAUTHORIZED") 
        ? "กรุณาเข้าสู่ระบบใหม่อีกครั้ง" 
        : "สินค้าตัวนี้อยู่ในรายการค้นหาของสาขานี้แล้วครับ" 
    }
  }
}

// 🟢 5. [ปรับปรุงเรื่องความปลอดภัย] ลบสินค้าออกจากรายการค้นหา (ล็อกเช็ค branch_id ของสาขาตัวเองด้วย)
export async function removeSearchTarget(id: number) {
  try {
    const branchId = await getCurrentBranchId() // ดึงรหัสสาขาของผู้ลบมาตรวจสอบเพื่อความปลอดภัย
    const supabase = getAdminClient()
    
    const { error } = await supabase
      .from('search_targets')
      .delete()
      .eq('id', id)
      .eq('branch_id', branchId) // ต้องเป็นของสาขาตัวเองเท่านั้นถึงจะลบได้
      
    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error("🔴 RemoveTarget Error:", error)
    return { success: false }
  }
}

// 🟢 6. เช็ค SKU แบบกลุ่ม (ดึงจากที่ก๊อปปี้ Excel มาวาง)
export async function verifyProductsBySkuList(skus: string[]) {
  try {
    if (!skus || skus.length === 0) return []
    
    // ทำความสะอาดข้อมูล SKU เผื่อมีช่องว่างติดมาจาก Excel
    const cleanSkus = skus.map(sku => sku.trim()).filter(Boolean)
    if (cleanSkus.length === 0) return []

    const supabase = getAdminClient()
    const { data, error } = await supabase
      .from('products')
      .select('id, name, sku, image_url')
      .in('sku', cleanSkus)
      
    if (error) throw error
    return data || []
  } catch (error) {
    console.error("🔴 Bulk Verify Error:", error)
    return []
  }
}

// 🟢 7. แอดเข้าตารางเป้าหมายแบบกลุ่ม แบบไดนามิกสาขา
export async function bulkAddSearchTargets(productIds: number[]) {
  try {
    if (!productIds || productIds.length === 0) {
      return { success: false, message: 'ไม่มีข้อมูลให้เพิ่ม' }
    }
    
    const branchId = await getCurrentBranchId()
    const supabase = getAdminClient()
    
    const rowsToInsert = productIds.map(id => ({
      product_id: id,
      branch_id: branchId
    }))

    const { error } = await supabase
      .from('search_targets')
      .upsert(rowsToInsert, { onConflict: 'product_id,branch_id' })
    
    if (error) throw error
    return { success: true }
  } catch (error: any) {
    console.error("🔴 Bulk Add Error:", error.message)
    return { 
      success: false, 
      message: error.message.includes("UNAUTHORIZED") 
        ? "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่" 
        : "เกิดข้อผิดพลาดในการบันทึกข้อมูลคิวกลุ่ม" 
    }
  }
}