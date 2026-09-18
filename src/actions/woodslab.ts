//src/actions/woodslab.ts

"use server"

import { createClient } from "../lib/supabase/server"
import { revalidatePath } from "next/cache"
import { CATEGORY_MAP } from "@/lib/propFilterModel"

const TABLE_NAME = "products"
const STORAGE_BUCKET = "product-images"

// ⚡ Cache ข้อมูลกลุ่มหมวดหมู่ (collection_groups) เพื่อความเร็วและประหยัด Database
let colGroupsCache: { data: Array<{ id: string; product_sup: string | null; tag: string | null }>; timestamp: number } | null = null
const COL_CACHE_TTL = 5 * 60 * 1000

async function getCachedCollectionGroups(supabase: any) {
  if (colGroupsCache && Date.now() - colGroupsCache.timestamp < COL_CACHE_TTL) {
    return colGroupsCache.data
  }
  const { data } = await supabase.from('collection_groups').select('id, product_sup, tag')
  const list = (data || []) as Array<{ id: string; product_sup: string | null; tag: string | null }>
  colGroupsCache = { data: list, timestamp: Date.now() }
  return list
}

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

export interface ProductExtraFilters {
  material?: string
  grade?: string
  craft?: string
  color?: string
  brand?: string
  size?: string
  minH?: number
  maxH?: number
  minW?: number
  maxW?: number
  minL?: number
  maxL?: number
}

export async function getProducts(
  category?: string, 
  specType?: string, 
  searchQuery?: string, 
  statusFilter?: string,
  extraFilters?: ProductExtraFilters,
  costFilter?: string,
  offset: number = 0,
  limit: number = 250
) {
  const supabase = await createClient()

  let query = supabase
    .from(TABLE_NAME)
    .select('*, collection_groups(id, name, cover_image_url, product_sup)', { count: 'exact' })
    .order('cost', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (category) {
    query = query.eq('category_id', category)
  }

  if (specType) {
    const trimmedType = specType.trim()
    if (category === 'prop') {
      const allowed = (CATEGORY_MAP[trimmedType] || CATEGORY_MAP[trimmedType.toUpperCase()] || [trimmedType.toLowerCase()]).map(s => s.trim().toLowerCase())
      const colGroups = await getCachedCollectionGroups(supabase)
      const matchedIds = colGroups
        .filter(c => c.product_sup && allowed.some(a => c.product_sup!.toLowerCase().includes(a) || a.includes(c.product_sup!.toLowerCase().trim())))
        .map(c => c.id)

      if (matchedIds.length > 0) {
        query = query.in('collection_group_id', matchedIds)
      } else {
        query = query.or(`specs->>type.ilike.%${trimmedType}%,specs->>spec_type.ilike.%${trimmedType}%`)
      }
    } else if (category === 'furniture') {
      const lower = trimmedType.toLowerCase()
      const colGroups = await getCachedCollectionGroups(supabase)
      const matchedIds = colGroups
        .filter(c => c.product_sup && c.product_sup.toLowerCase().includes(lower))
        .map(c => c.id)

      if (matchedIds.length > 0) {
        query = query.in('collection_group_id', matchedIds)
      } else {
        query = query.or(`specs->>type.ilike.%${trimmedType}%,specs->>spec_type.ilike.%${trimmedType}%`)
      }
    } else {
      query = query.or(`specs->>type.ilike.%${trimmedType}%,specs->>spec_type.ilike.%${trimmedType}%`)
    }
  }

  if (statusFilter) {
    if (statusFilter === 'active') {
      query = query.or('status.eq.active,status.is.null')
    } else {
      query = query.eq('status', statusFilter)
    }
  }

  // 💰 ฟิลเตอร์ต้นทุน (Cost)
  if (costFilter === 'has_cost') {
    query = query.gt('cost', 0)
  } else if (costFilter === 'no_cost') {
    query = query.or('cost.eq.0,cost.is.null')
  }

  if (extraFilters?.material) {
    query = query.ilike('specs->>material', `%${extraFilters.material.trim()}%`)
  }
  if (extraFilters?.grade) {
    query = query.ilike('specs->>grade', `%${extraFilters.grade.trim()}%`)
  }
  if (extraFilters?.craft) {
    query = query.ilike('specs->>panel_craft', `%${extraFilters.craft.trim()}%`)
  }
  if (extraFilters?.color) {
    query = query.ilike('color', `%${extraFilters.color.trim()}%`)
  }
  if (extraFilters?.brand) {
    query = query.ilike('specs->>brand', `%${extraFilters.brand.trim()}%`)
  }
  if (extraFilters?.size) {
    const s = extraFilters.size.trim()
    if (category === 'prop' || category === 'furniture') {
      const isStd = ['s', 'm', 'l', 'xl', 'xxl'].includes(s.toLowerCase())
      if (isStd) {
        query = query.ilike('specs->>group_size', s)
      } else {
        query = query.or(`specs->>group_size.ilike.%${s}%,specs->>size.ilike.%${s}%`)
      }
    } else if (category === 'SLABS') {
      query = query.ilike('specs->>size', `%${s}%`)
    } else if (category === 'rough_wood') {
      query = query.or(`specs->>size_raw.ilike.%${s}%,specs->>size.ilike.%${s}%`)
    } else {
      query = query.or(`specs->>group_size.ilike.${s},specs->>size.ilike.%${s}%,specs->>size_raw.ilike.%${s}%`)
    }
  }

  // 📏 Custom Dimensions (แบบรูปที่ 2: ความสูง, ความกว้าง, ความลึก/ความยาว Min - Max ซม.)
  const isMmUnit = category === 'SLABS' || category === 'rough_wood'

  if (extraFilters?.minH !== undefined && !isNaN(extraFilters.minH)) {
    const val = isMmUnit && extraFilters.minH < 500 ? extraFilters.minH * 10 : extraFilters.minH
    query = query.gte('specs->thickness_cm', val)
  }
  if (extraFilters?.maxH !== undefined && !isNaN(extraFilters.maxH)) {
    const val = isMmUnit && extraFilters.maxH < 500 ? extraFilters.maxH * 10 : extraFilters.maxH
    query = query.lte('specs->thickness_cm', val)
  }

  if (extraFilters?.minW !== undefined && !isNaN(extraFilters.minW)) {
    const val = isMmUnit && extraFilters.minW < 500 ? extraFilters.minW * 10 : extraFilters.minW
    query = query.gte('specs->width_cm', val)
  }
  if (extraFilters?.maxW !== undefined && !isNaN(extraFilters.maxW)) {
    const val = isMmUnit && extraFilters.maxW < 500 ? extraFilters.maxW * 10 : extraFilters.maxW
    query = query.lte('specs->width_cm', val)
  }

  if (extraFilters?.minL !== undefined && !isNaN(extraFilters.minL)) {
    const val = isMmUnit && extraFilters.minL < 500 ? extraFilters.minL * 10 : extraFilters.minL
    query = query.gte('specs->length_cm', val)
  }
  if (extraFilters?.maxL !== undefined && !isNaN(extraFilters.maxL)) {
    const val = isMmUnit && extraFilters.maxL < 500 ? extraFilters.maxL * 10 : extraFilters.maxL
    query = query.lte('specs->length_cm', val)
  }

  // 💡 ค้นหาจากชื่อ, SKU หรือ Barcode
  if (searchQuery) {
    query = query.or(`sku.ilike.%${searchQuery}%,name.ilike.%${searchQuery}%,barcode.ilike.%${searchQuery}%`)
  }

  // ⚡ แบ่งหน้าทีละ limit รายการ (เช่น 250) เพื่อประหยัด Database
  const from = Math.max(0, offset)
  const to = from + limit - 1
  query = query.range(from, to)

  const { data, count, error } = await query

  if (error) {
    console.error("Error fetching products:", error)
    return { data: [], count: 0, hasMore: false, nextOffset: offset, error: error.message }
  }

  const processedData = (data || []).map((item) => {
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

  const totalCount = count ?? 0
  const returnedCount = processedData.length
  const hasMore = from + returnedCount < totalCount

  return { 
    data: processedData, 
    count: totalCount, 
    hasMore, 
    nextOffset: from + returnedCount, 
    error: null 
  }
}

// ⚡ Server Action สำหรับโหลดข้อมูลเพิ่มทีละ 250 รายการจาก Client
export async function loadMoreProducts(params: {
  category?: string
  specType?: string
  searchQuery?: string
  statusFilter?: string
  extraFilters?: ProductExtraFilters
  costFilter?: string
  offset: number
  limit?: number
}) {
  return await getProducts(
    params.category,
    params.specType,
    params.searchQuery,
    params.statusFilter,
    params.extraFilters,
    params.costFilter,
    params.offset,
    params.limit || 250
  )
}

export async function getCategoryCounts(category: string) {
  try {
    const supabase = await createClient()
    const [
      { count: totalCount },
      { count: withCostCount }
    ] = await Promise.all([
      supabase.from(TABLE_NAME).select('*', { count: 'exact', head: true }).eq('category_id', category),
      supabase.from(TABLE_NAME).select('*', { count: 'exact', head: true }).eq('category_id', category).gt('cost', 0)
    ])
    const total = totalCount ?? 0
    const withCost = withCostCount ?? 0
    const noCost = Math.max(0, total - withCost)
    return { total, withCost, noCost }
  } catch (err) {
    console.error("Error fetching category counts:", err)
    return { total: 0, withCost: 0, noCost: 0 }
  }
}

export async function getCategoryTotalCount(category: string) {
  try {
    const supabase = await createClient()
    const { count, error } = await supabase
      .from(TABLE_NAME)
      .select('id', { count: 'exact', head: true })
      .eq('category_id', category)
    if (error) throw error
    return count ?? 0
  } catch (err) {
    console.error("Error fetching category total count:", err)
    return 0
  }
}

// ⚡ Cache สำหรับตัวเลือกฟิลเตอร์ในแต่ละหมวดหมู่ (5 นาที) เพื่อความรวดเร็วและครอบคลุมทุกรายการ
const filterOptionsCache: Record<string, { data: any; timestamp: number }> = {}
const FILTER_CACHE_TTL_MS = 5 * 60 * 1000

export async function getCategoryFilterOptions(category: string) {
  if (
    filterOptionsCache[category] && 
    (Date.now() - filterOptionsCache[category].timestamp < FILTER_CACHE_TTL_MS)
  ) {
    return filterOptionsCache[category].data
  }

  const supabase = await createClient()

  const types = new Set<string>()
  const materials = new Set<string>()
  const grades = new Set<string>()
  const crafts = new Set<string>()
  const colors = new Set<string>()
  const brands = new Set<string>()
  const sizes = new Set<string>()

  let from = 0
  const step = 1000

  while (true) {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('color, specs')
      .eq('category_id', category)
      .range(from, from + step - 1)

    if (error || !data || data.length === 0) break

    for (const item of data) {
      const specs = item.specs || {}
      const t = specs.type || specs.spec_type
      if (t && typeof t === 'string' && t.trim() !== '' && t.trim() !== '-') types.add(t.trim())

      const m = specs.material
      if (m && typeof m === 'string' && m.trim() !== '' && m.trim() !== '-') materials.add(m.trim())

      const g = specs.grade
      if (g && typeof g === 'string' && g.trim() !== '' && g.trim() !== '-') grades.add(g.trim())

      const c = specs.panel_craft
      if (c && typeof c === 'string' && c.trim() !== '' && c.trim() !== '-') crafts.add(c.trim())

      if (item.color && typeof item.color === 'string' && item.color.trim() !== '' && item.color.trim() !== '-') {
        colors.add(item.color.trim())
      }

      const b = specs.brand
      if (b && typeof b === 'string' && b.trim() !== '' && b.trim() !== '-') brands.add(b.trim())

      const s = specs.group_size || specs.size
      if (s && typeof s === 'string' && s.trim() !== '' && s.trim() !== '-') sizes.add(s.trim())
    }

    if (data.length < step) break
    from += step
  }

  // เติมหมวดหมู่สินค้าสำหรับ Props และ Furniture จากกลุ่มสินค้า (collection_groups)
  if (category === 'prop') {
    const colGroups = await getCachedCollectionGroups(supabase)
    colGroups.forEach(c => {
      if (c.product_sup && (c.tag?.toLowerCase().includes('prop') || !c.tag)) {
        types.add(c.product_sup.trim())
      }
    })
  } else if (category === 'furniture') {
    const colGroups = await getCachedCollectionGroups(supabase)
    colGroups.forEach(c => {
      if (c.product_sup && (c.tag?.toLowerCase().includes('furn') || !c.tag?.toLowerCase().includes('prop'))) {
        types.add(c.product_sup.trim())
      }
    })
  }

  // จัดเรียงไซส์มาตรฐาน S, M, L, XL, XXL ให้อยู่บนสุดเสมอ
  const sizePriority: Record<string, number> = { 'S': 1, 'M': 2, 'L': 3, 'XL': 4, 'XXL': 5 }
  const sortedSizes = Array.from(sizes).sort((a, b) => {
    const prioA = sizePriority[a.toUpperCase()] ?? 99
    const prioB = sizePriority[b.toUpperCase()] ?? 99
    if (prioA !== prioB) return prioA - prioB
    return a.localeCompare(b)
  })

  const result = {
    types: Array.from(types).sort(),
    materials: Array.from(materials).sort(),
    grades: Array.from(grades).sort(),
    crafts: Array.from(crafts).sort(),
    colors: Array.from(colors).sort(),
    brands: Array.from(brands).sort(),
    sizes: sortedSizes
  }

  filterOptionsCache[category] = {
    data: result,
    timestamp: Date.now()
  }

  return result
}

export async function getAllProductsForExport() {
  const supabase = await createClient()
  let allData: any[] = []
  let hasMore = true
  let page = 0
  const limit = 1000

  while (hasMore) {
    const from = page * limit
    const to = from + limit - 1

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*, collection_groups(id, name, cover_image_url, product_sup)')
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) {
      console.error("Error fetching all products:", error)
      return { data: [], error: error.message }
    }

    if (data && data.length > 0) {
      allData = [...allData, ...data]
      if (data.length < limit) {
        hasMore = false
      } else {
        page++
      }
    } else {
      hasMore = false
    }
  }

  const processedData = allData.map((item) => {
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

// ✅ 6. ลบสินค้า (แก้ไขให้ลบ Stock ก่อน)
export async function deleteProduct(id: string | number) {
    const supabase = await createClient()
    await checkAuth(supabase) // 🔒 บังคับล็อกอิน

    // 1. ลบรายการใน Stock ที่ผูกกับสินค้านี้ก่อน (ตารางลูก)
    const { error: stockError } = await supabase
        .from('stock') 
        .delete()
        .eq('product_id', id)

    if (stockError) {
        console.warn("ลบ Stock ไม่สำเร็จ หรือไม่มีข้อมูล:", stockError.message)
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

export async function bulkCreateProducts(productsArray: any[]) {
  const supabase = await createClient()
  await checkAuth(supabase)

  // 1. ⚡ ดึงรหัส Collection Group (ID) และ Product Sup ออกมาจาก Excel
  const uniqueGroupsMap = new Map<string, any>()
  
  productsArray.forEach(p => {
    // 🎯 ห้ามยุ่งหรือบันทึกลง collection_groups เด็ดขาดสำหรับสินค้าประเภทอื่นที่ไม่ใช่ prop หรือ furniture
    if (p.collection_group_id && (p.category_id === 'prop' || p.category_id === 'furniture')) {
      const groupData: any = {
        id: p.collection_group_id,
        product_sup: p._temp_product_sup
      }
      if (p._temp_name_image_group) {
        groupData.name = p._temp_name_image_group
      }
      if (p._temp_image_group) {
        groupData.cover_image_url = p._temp_image_group
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

  // 3. ⚡ ลบฟิลด์ชั่วคราวออกก่อนบันทึกลงตาราง Products หลัก
  const cleanProductsArray = productsArray.map(p => {
    const { _temp_product_sup, _temp_name_image_group, _temp_image_group, ...actualProductData } = p;
    return actualProductData;
  });

  // 4. บันทึกข้อมูลสินค้าลงตาราง products (แบ่ง Chunk ทีละ 100 เพื่อความเสถียร)
  let totalSaved = 0
  const CHUNK_SIZE = 100

  for (let i = 0; i < cleanProductsArray.length; i += CHUNK_SIZE) {
    const chunk = cleanProductsArray.slice(i, i + CHUNK_SIZE)
    const { data, error } = await supabase
      .from('products')
      .upsert(chunk, { onConflict: 'sku' }) 
      .select('id')

    if (error) {
      console.error("Error upserting products chunk:", error.message)
      return { error: error.message }
    }
    totalSaved += (data?.length || 0)
  }

  revalidatePath('/inventory')
  return { success: true, count: totalSaved }
}

// ✅ ฟังก์ชันตรวจว่า SKU ไหนมีในระบบแล้วบ้าง (แบ่ง Chunk ทีละ 100 เพื่อป้องกัน URL ยาวเกินจนเกิด Bad Request)
export async function checkExistingSkus(skus: string[]): Promise<{ existing: string[]; error?: string }> {
  try {
    if (!skus || skus.length === 0) return { existing: [] }

    const cleanSkus = Array.from(new Set(
      skus
        .map(s => String(s || '').trim())
        .filter(s => s.length > 0)
    ))

    if (cleanSkus.length === 0) return { existing: [] }

    const supabase = await createClient()
    const CHUNK_SIZE = 100
    let allExisting: string[] = []

    for (let i = 0; i < cleanSkus.length; i += CHUNK_SIZE) {
      const chunk = cleanSkus.slice(i, i + CHUNK_SIZE)
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('sku')
        .in('sku', chunk)

      if (error) {
        console.error("Error checking SKUs chunk:", error)
        return { existing: allExisting, error: error.message }
      }

      if (data && data.length > 0) {
        allExisting = allExisting.concat(data.map((d: any) => d.sku))
      }
    }

    return { existing: allExisting }
  } catch (error) {
    console.error("Unexpected error checking SKUs:", error)
    return { existing: [], error: error instanceof Error ? error.message : 'ไม่สามารถเชื่อมต่อฐานข้อมูลได้' }
  }
}

// ✅ ฟังก์ชันตรวจว่า Collection Group ไหนมีในระบบแล้วบ้าง (แบ่ง Chunk ทีละ 100)
export async function checkExistingGroups(groupIds: string[]): Promise<{ existing: string[]; error?: string }> {
  try {
    if (!groupIds || groupIds.length === 0) return { existing: [] }
    
    const cleanGroupIds = Array.from(new Set(
      groupIds
        .map(g => String(g || '').trim())
        .filter(g => g.length > 0)
    ))

    if (cleanGroupIds.length === 0) return { existing: [] }

    const supabase = await createClient()
    const CHUNK_SIZE = 100
    let allExisting: string[] = []

    for (let i = 0; i < cleanGroupIds.length; i += CHUNK_SIZE) {
      const chunk = cleanGroupIds.slice(i, i + CHUNK_SIZE)
      const { data, error } = await supabase
        .from('collection_groups')
        .select('id')
        .in('id', chunk)

      if (error) {
        console.error("Error checking Groups chunk:", error)
        return { existing: allExisting, error: error.message }
      }

      if (data && data.length > 0) {
        allExisting = allExisting.concat(data.map((d: any) => d.id))
      }
    }

    return { existing: allExisting }
  } catch (error) {
    console.error("Unexpected error checking Groups:", error)
    return { existing: [], error: error instanceof Error ? error.message : 'ไม่สามารถเชื่อมต่อฐานข้อมูลได้' }
  }
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
    cover_image_url: g.cover_image_url,
    image_url: g.cover_image_url || g.image_url,
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
