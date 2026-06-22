"use server"

import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// 💡 1. ฟังก์ชันหา Branch ID จากคุกกี้ของคนที่ล็อกอินอยู่
async function getCurrentBranchId() {
  
  // 🔴 เติมคำว่า await ตรงบรรทัดนี้ครับนาย!
  const cookieStore = await cookies()
  
  // ใช้ SSR Client เพื่ออ่าน Session จากคุกกี้
  const supabaseAuth = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() }
      }
    }
  )

  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return 1 

  // ดึง branch_id จากตาราง profiles
  const { data: profile } = await supabaseAuth
    .from('profiles')
    .select('branch_id')
    .eq('user_id', user.id)
    .single()

  return profile?.branch_id || 1
}

// 💡 2. Client ตัวแรง (Service Role) ทะลุ RLS สำหรับดึงและอัปเดตข้อมูล
function getAdminClient() {
  const supabaseUrl = process.env.SUPABASE_URL!
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!
  return createClient(supabaseUrl, supabaseKey)
}

export async function getComparisonData() {
  try {
    const branchId = await getCurrentBranchId()
    const supabase = getAdminClient()

    console.log("🔵 กำลังดึงสต๊อกทั้งหมด และยอดสแกน ของสาขา:", branchId)

    // 🔴 1. ดึงของที่มีในระบบทั้งหมด (ตาราง stock)
    const { data: systemStock, error: err1 } = await supabase
      .from('stock')
      .select('qty, product_id, products (id, sku, name, image_url, specs)')
      .eq('branch_id', branchId)

    if (err1) throw err1

    // 🔴 2. ดึงของที่สแกนได้ทั้งหมด (ตาราง reader_stock)
    const { data: scannedStock, error: err2 } = await supabase
      .from('reader_stock')
      .select('qty, product_id, products (id, sku, name, image_url, specs)')
      .eq('branch_id', branchId)

    if (err2) throw err2

    // 🔴 3. จับข้อมูล 2 ตารางมาชนกัน (ด้วย Map) เพื่อหาว่าอะไรขาด อะไรเกิน
    const itemMap = new Map()

    // เอาของในระบบมาตั้งโต๊ะก่อน (ให้ยอดสแกนเริ่มต้นเป็น 0)
    if (systemStock) {
      systemStock.forEach((item: any) => {
        const prod = Array.isArray(item.products) ? item.products[0] : item.products || {}
        itemMap.set(item.product_id, {
          productId: item.product_id,
          sku: prod.sku || 'N/A',
          name: prod.name || 'ไม่ทราบชื่อสินค้า',
          imageUrl: prod.image_url || null,
          specs: prod.specs || {},
          systemQty: Number(item.qty) || 0,
          countedQty: 0 
        })
      })
    }

    // เอาของที่สแกนมาเติมใส่
    if (scannedStock) {
      scannedStock.forEach((item: any) => {
        const countedQty = Number(item.qty) || 0
        const prod = Array.isArray(item.products) ? item.products[0] : item.products || {}

        if (itemMap.has(item.product_id)) {
          // ถ้ามีในระบบอยู่แล้ว ก็แค่อัปเดตยอดสแกนเข้าไป
          itemMap.get(item.product_id).countedQty = countedQty
        } else {
          // ถ้าสแกนเจอ "ของใหม่" ที่ไม่มีในสต๊อกระบบเลย! (ยอดระบบเป็น 0)
          itemMap.set(item.product_id, {
            productId: item.product_id,
            sku: prod.sku || 'N/A',
            name: prod.name || 'ไม่ทราบชื่อสินค้า',
            imageUrl: prod.image_url || null,
            specs: prod.specs || {},
            systemQty: 0, 
            countedQty: countedQty
          })
        }
      })
    }

    // 🔴 4. แปลงข้อมูลทั้งหมด ส่งกลับไปให้หน้าจอ UI คำนวณผลต่าง
    const finalData = Array.from(itemMap.values()).map(item => ({
      ...item,
      diff: item.countedQty - item.systemQty
    }))

    return finalData
  } catch (error) {
    console.error("Action Error (getComparisonData):", error)
    return []
  }
}
// 🔴 ไม่ต้องรับค่า branchId จากหน้าเว็บแล้ว!
export async function syncStockData() {
  try {
    const branchId = await getCurrentBranchId() // ให้ Server ดึงเองเลย
    const supabase = getAdminClient()

    const { data: readerStock, error: fetchError } = await supabase
      .from('reader_stock')
      .select('product_id, qty')
      .eq('branch_id', branchId)

    if (fetchError || !readerStock) throw fetchError

    for (const item of readerStock) {
      await supabase
        .from('stock')
        .update({ qty: item.qty, updated_at: new Date().toISOString() })
        .eq('product_id', item.product_id)
        .eq('branch_id', branchId)
    }

    return { success: true, message: `อัปเดตสต๊อกสาขาที่ ${branchId} เรียบร้อยแล้ว` }
  } catch (error) {
    console.error("Action Error (syncStockData):", error)
    return { success: false, message: 'เกิดข้อผิดพลาดในการซิงค์ข้อมูล' }
  }
}