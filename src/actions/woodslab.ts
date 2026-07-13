//src/actions/woodslab.ts

"use server"

import { createClient } from "../lib/supabase/server"
import { revalidatePath } from "next/cache"

const TABLE_NAME = "products"
const STORAGE_BUCKET = "product-images"

// --- Helper เช็คสิทธิ์ (ถ้าไม่ล็อกอิน จะ Error) ---
async function checkAuth(supabase: any) {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error("Unauthorized: กรุณาเข้าสู่ระบบ")
  return user
}

// ✅ 1. ฟังก์ชันอัปโหลดไฟล์ (ใช้โดย Form)
export async function uploadFile(formData: FormData) {
  const supabase = await createClient()
  // await checkAuth(supabase) // เปิดบรรทัดนี้ถ้าต้องการบังคับล็อกอินก่อนอัปโหลด

  const file = formData.get('file') as File
  const path = formData.get('path') as string

  if (!file || !path) return { error: "Missing file or path" }

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, { upsert: true, contentType: 'image/webp' })

  if (error) return { error: error.message }
  return { success: true }
}

// เปลี่ยนบรรทัดนี้ในไฟล์ actions/woodslab.ts
export async function getProducts(category?: string, specType?: string, searchQuery?: string, statusFilter?: string) {
  const supabase = await createClient()

  let query = supabase
    .from(TABLE_NAME)
    .select('*')
    .order('created_at', { ascending: false })

  if (category) {
    query = query.eq('category_id', category)
  }

  if (specType) {
    query = query.eq('specs->>type', specType)
  }

  if (statusFilter) {
    if (statusFilter === 'active') {
      query = query.or('status.eq.active,status.is.null')
    } else {
      query = query.eq('status', statusFilter)
    }
  }

  // 💡 ค้นหาจากชื่อ, SKU หรือ Barcode
  if (searchQuery) {
    query = query.or(`sku.ilike.%${searchQuery}%,name.ilike.%${searchQuery}%,barcode.ilike.%${searchQuery}%`)
  }

  const { data, error } = await query
  
  // ... โค้ดเดิมดึงรูปภาพด้านล่างปล่อยไว้เหมือนเดิมครับ ...

  if (error) {
    console.error("Error fetching products:", error)
    return { data: [], error: error.message }
  }

  // ... (โค้ดแปลง URL รูปภาพ เหมือนเดิม) ...
  const processedData = data.map((item) => {
    // ... (logic เดิม)
    let publicUrl = null
    if (item.image_url) {
       if(item.image_url.startsWith('http')) {
           publicUrl = item.image_url
       } else {
           const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(item.image_url)
           publicUrl = data.publicUrl
       }
    }
    return { ...item, image_url: publicUrl }
  })

  return { data: processedData, error: null }
}

// ✅ 3. ดึงสินค้าชิ้นเดียว (Edit Page ใช้ตัวนี้)
export async function getProductById(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.from(TABLE_NAME).select('*').eq('id', id).single()

  if (error) return { data: null, error: error.message }

  // 3.1 แปลงรูปหลัก
  if (data.image_url && !data.image_url.startsWith('http')) {
      const { data: imgData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(data.image_url)
      data.image_url = imgData.publicUrl
  }

  // 3.2 แปลงรูปย่อยใน Gallery
  if (data.specs && Array.isArray(data.specs.images)) {
      data.specs.images = data.specs.images.map((img: any) => {
          if (img.path && !img.path.startsWith('http')) {
              const { data: imgData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(img.path)
              return { ...img, path: imgData.publicUrl }
          }
          return img
      })
  }

  return { data, error: null }
}

// ✅ 4. สร้างสินค้าใหม่
export async function createInitialProduct(productData: any) {
  const supabase = await createClient()
  await checkAuth(supabase) 

  const { data, error } = await supabase.from(TABLE_NAME).insert([productData]).select('id').single()
  if (error) return { error: error.message }
  
  revalidatePath('/inventory')
  return { id: data.id }
}

// ✅ 5. อัปเดตสินค้า
export async function updateProduct(id: string | number, updateData: any) {
  const supabase = await createClient()
  await checkAuth(supabase)

  const { error } = await supabase.from(TABLE_NAME).update(updateData).eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/inventory')
  revalidatePath(`/inventory/${id}`)
  return { success: true }
}

// src/actions/woodslab.ts

// ... (ส่วนอื่นๆ เหมือนเดิม)

// ✅ 6. ลบสินค้า (แก้ไขให้ลบ Stock ก่อน)
export async function deleteProduct(id: string | number) {
    const supabase = await createClient()
    await checkAuth(supabase) // 🔒 บังคับล็อกอิน

    // 1. ลบรายการใน Stock ที่ผูกกับสินค้านี้ก่อน (ตารางลูก)
    const { error: stockError } = await supabase
        .from('stock') 
        .delete()
        .eq('product_id', id)

    // (ถ้า stockError เป็นเพราะไม่มีข้อมูล ก็ไม่เป็นไร แต่ถ้า error อื่นอาจต้องเช็ค)
    if (stockError) {
        console.warn("ลบ Stock ไม่สำเร็จ หรือไม่มีข้อมูล:", stockError.message)
        // ไม่ต้อง return error เพราะเราจะพยายามลบสินค้าต่อ
    }

    // 2. ลบสินค้า (ตารางแม่)
    const { error } = await supabase
        .from(TABLE_NAME)
        .delete()
        .eq('id', id)

    if (error) return { error: error.message }

    revalidatePath('/inventory')
    return { success: true }
}
// src/actions/woodslab.ts

export async function bulkCreateProducts(productsArray: any[]) {
  const supabase = await createClient()
  await checkAuth(supabase)

  // 1. ⚡ ดึงรหัส Collection Group (ID) และ Product Sup ออกมาจาก Excel
  const uniqueGroupsMap = new Map<string, any>()
  
  productsArray.forEach(p => {
    // 🎯 ห้ามยุ่งหรือบันทึกลง collection_groups เด็ดขาดสำหรับสินค้าประเภทอื่นที่ไม่ใช่ prop หรือ furniture
    if (p.collection_group_id && (p.category_id === 'prop' || p.category_id === 'furniture')) {
      const groupData: any = {
        id: p.collection_group_id, // รหัสกลุ่ม เช่น FA-D2089
        product_sup: p._temp_product_sup // ✅ คำหมวดหมู่ เช่น Doll Animal
      }
      if (p.category_id === 'prop') {
        groupData.tag = 'Props'
      } else if (p.category_id === 'furniture') {
        groupData.tag = 'Furniture'
      }
      uniqueGroupsMap.set(p.collection_group_id, groupData)
    }
  })
  
  const uniqueGroups = Array.from(uniqueGroupsMap.values())

  // 2. ⚡ บันทึกลงตาราง collection_groups (ถ้า ID ชน จะอัปเดตคำ product_sup ให้ใหม่)
  if (uniqueGroups.length > 0) {
    const { error: groupError } = await supabase
      .from('collection_groups')
      .upsert(uniqueGroups, { onConflict: 'id' }) 

    if (groupError) {
      console.error("Error upserting collection groups:", groupError.message)
      return { error: "เกิดข้อผิดพลาดในการบันทึกหมวดหมู่สินค้า: " + groupError.message }
    }
  }

  // 3. ⚡ ลบฟิลด์ _temp_product_sup ออกก่อนบันทึกลงตาราง Products หลัก
  const cleanProductsArray = productsArray.map(p => {
    const { _temp_product_sup, ...actualProductData } = p;
    return actualProductData;
  });

  // 4. บันทึกข้อมูลสินค้าลงตาราง products
  const { data, error } = await supabase
    .from('products')
    .upsert(cleanProductsArray, { onConflict: 'sku' }) 
    .select()

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/inventory')
  return { success: true, count: data?.length }
}
// ✅ ฟังก์ชันใหม่ เอาไว้เช็คว่า SKU ไหนมีในระบบแล้วบ้าง (เพื่อทำ Preview)
export async function checkExistingSkus(skus: string[]) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('sku')
    .in('sku', skus) // ค้นหาเฉพาะ SKU ที่เราส่งไป

  if (error) {
    console.error("Error checking SKUs:", error)
    return { existing: [] }
  }
  
  // ส่งกลับไปเฉพาะรายชื่อ SKU ที่เจอในระบบ
  return { existing: data.map((d: any) => d.sku) }
}

// ✅ ฟังก์ชันใหม่ เอาไว้เช็คว่า Collection Group ไหนมีในระบบแล้วบ้าง
export async function checkExistingGroups(groupIds: string[]) {
  if (!groupIds || groupIds.length === 0) return { existing: [] }
  
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('collection_groups')
    .select('id')
    .in('id', groupIds) // ค้นหาเฉพาะรหัสกลุ่มที่ส่งไป

  if (error) {
    console.error("Error checking Groups:", error)
    return { existing: [] }
  }
  
  return { existing: data.map((d: any) => d.id) }
}

// ✅ ฟังก์ชันลบสินค้าหลายรายการพร้อมกัน (Bulk Delete)
export async function deleteProductsBulk(ids: (string | number)[]) {
  const supabase = await createClient()
  await checkAuth(supabase)

  const { error } = await supabase
    .from(TABLE_NAME)
    .delete()
    .in('id', ids)

  if (error) {
    console.error("Bulk delete error:", error.message)
    return { error: error.message }
  }

  revalidatePath('/inventory')
  return { success: true }
}

// ✅ ดึงข้อมูลกลุ่มคอลเลกชันพร้อมจำนวนสินค้าในแต่ละกลุ่ม
export async function getCollectionGroupsWithCounts(tag: 'furniture' | 'prop') {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('collection_groups')
    .select('*, products(id)')
    .eq('tag', tag)
    .order('created_at', { ascending: false })

  if (error) {
    console.error("Error fetching collection groups:", error.message)
    return { data: [], error: error.message }
  }

  const processed = (data || []).map((g: any) => ({
    id: g.id,
    name: g.name,
    description: g.description,
    product_sup: g.product_sup,
    image_url: g.image_url,
    tag: g.tag,
    itemCount: g.products?.length || 0
  }))

  return { data: processed, error: null }
}

// ✅ ลบกลุ่มสินค้า (Cascade ลบสินค้าภายในผ่านทางโค้ดเท่านั้น โดยไม่ยุ่งกับสต็อก)
export async function deleteCollectionGroup(groupId: string) {
  const supabase = await createClient()
  await checkAuth(supabase)

  // 1. ดึงข้อมูลสินค้าที่ผูกอยู่กับกลุ่มนี้
  const { data: productsInGroup, error: fetchError } = await supabase
    .from(TABLE_NAME)
    .select('id')
    .eq('collection_group_id', groupId)

  if (fetchError) return { error: fetchError.message }

  if (productsInGroup && productsInGroup.length > 0) {
    const productIds = productsInGroup.map((p: any) => p.id)
    
    // 2. พยายามลบสินค้าตรงๆ (โดยไม่ลบสต็อก ตามคำสั่งเจ้านาย)
    const { error: productsDeleteError } = await supabase
      .from(TABLE_NAME)
      .delete()
      .in('id', productIds)

    if (productsDeleteError) {
      // ส่งคืนข้อผิดพลาดแจ้งเตือนผู้ใช้ เช่น ติดประวัติสต็อก/การอ้างอิง
      return { error: `ไม่สามารถลบกลุ่มสินค้าได้ เนื่องจากติดการอ้างอิงของสินค้าภายในกลุ่ม: ${productsDeleteError.message}` }
    }
  }

  // 3. ลบกลุ่มคอลเลกชันสินค้า
  const { error: groupDeleteError } = await supabase
    .from('collection_groups')
    .delete()
    .eq('id', groupId)

  if (groupDeleteError) {
    return { error: groupDeleteError.message }
  }

  revalidatePath('/inventory')
  return { success: true }
}