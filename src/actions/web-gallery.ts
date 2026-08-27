"use server"

import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"

export interface JournalCategory {
  id: string
  slug: string
  sort_order: number
  title_en: string
  title_th: string | null
  description_en: string | null
  description_th: string | null
  category_query: string | null
  cover_image_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  images_count?: number
  preview_images?: string[]
}

export interface JournalImageItem {
  id: number
  category_id: string
  image_url: string
  alt_text: string | null
  sort_order: number
  product_id: number | null
  custom_link: string | null
  is_active: boolean
  created_at: string
  products?: {
    id: number
    name: string
    sku: string | null
    price: number | null
  } | null
}

// 1. ดึงหมวดหมู่ทั้งหมด พร้อมนับจำนวนรูปภาพ
export async function getJournalCategories(): Promise<{ data: JournalCategory[]; error: string | null }> {
  try {
    const { data: categories, error } = await supabaseAdmin
      .from("journal_categories")
      .select(`
        *,
        images:journal_images ( id, image_url, sort_order )
      `)
      .order("sort_order", { ascending: true })

    if (error) throw error

    const mapped: JournalCategory[] = (categories || []).map((cat: any) => {
      const imgs = cat.images || []
      imgs.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
      return {
        id: cat.id,
        slug: cat.slug,
        sort_order: cat.sort_order || 0,
        title_en: cat.title_en,
        title_th: cat.title_th,
        description_en: cat.description_en,
        description_th: cat.description_th,
        category_query: cat.category_query,
        cover_image_url: cat.cover_image_url,
        is_active: cat.is_active ?? true,
        created_at: cat.created_at,
        updated_at: cat.updated_at,
        images_count: imgs.length,
        preview_images: imgs.slice(0, 4).map((i: any) => i.image_url),
      }
    })

    return { data: mapped, error: null }
  } catch (err: any) {
    console.error("getJournalCategories error:", err)
    return { data: [], error: err.message || "Failed to fetch categories" }
  }
}

// 2. ดึงหมวดหมู่เฉพาะ 1 หมวด พร้อมรูปภาพทั้งหมดในหมวดนั้น
export async function getJournalCategoryWithImages(categoryId: string): Promise<{
  category: JournalCategory | null
  images: JournalImageItem[]
  error: string | null
}> {
  try {
    const { data: category, error: catError } = await supabaseAdmin
      .from("journal_categories")
      .select("*")
      .eq("id", categoryId)
      .single()

    if (catError || !category) throw new Error("ไม่พบหมวดหมู่นี้")

    const { data: images, error: imgError } = await supabaseAdmin
      .from("journal_images")
      .select(`
        *,
        products ( id, name, sku, price )
      `)
      .eq("category_id", categoryId)
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true })

    if (imgError) throw imgError

    return {
      category,
      images: (images as JournalImageItem[]) || [],
      error: null,
    }
  } catch (err: any) {
    console.error("getJournalCategoryWithImages error:", err)
    return { category: null, images: [], error: err.message }
  }
}

// 3. เพิ่ม หรือ แก้ไขข้อมูลหมวดหมู่ (Upsert)
export async function saveJournalCategory(categoryData: {
  id?: string
  slug: string
  sort_order: number
  title_en: string
  title_th?: string | null
  description_en?: string | null
  description_th?: string | null
  category_query?: string | null
  cover_image_url?: string | null
  is_active?: boolean
}) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Unauthorized")

    const payload = {
      slug: categoryData.slug.trim().toLowerCase(),
      sort_order: Number(categoryData.sort_order) || 0,
      title_en: categoryData.title_en.trim(),
      title_th: categoryData.title_th?.trim() || null,
      description_en: categoryData.description_en?.trim() || null,
      description_th: categoryData.description_th?.trim() || null,
      category_query: categoryData.category_query?.trim() || null,
      cover_image_url: categoryData.cover_image_url?.trim() || null,
      is_active: categoryData.is_active ?? true,
      updated_at: new Date().toISOString(),
    }

    if (categoryData.id) {
      // แก้ไข
      const { error } = await supabaseAdmin
        .from("journal_categories")
        .update(payload)
        .eq("id", categoryData.id)
      if (error) throw error
    } else {
      // สร้างใหม่
      const { error } = await supabaseAdmin
        .from("journal_categories")
        .insert(payload)
      if (error) throw error
    }

    revalidatePath("/web-gallery")
    return { success: true }
  } catch (err: any) {
    return { error: err.message || "Failed to save category" }
  }
}

// 4. ลบหมวดหมู่
export async function deleteJournalCategory(categoryId: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Unauthorized")

    const { error } = await supabaseAdmin
      .from("journal_categories")
      .delete()
      .eq("id", categoryId)

    if (error) throw error

    revalidatePath("/web-gallery")
    return { success: true }
  } catch (err: any) {
    return { error: err.message || "Failed to delete category" }
  }
}

// 5. เพิ่มรูปภาพหลายรูปพร้อมกัน (Bulk Add Images)
export async function addJournalImages(
  categoryId: string,
  imageUrls: string[]
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Unauthorized")

    const validUrls = imageUrls.map((u) => u.trim()).filter((u) => u.startsWith("http"))
    if (validUrls.length === 0) {
      throw new Error("ไม่มีรายการรูปภาพ")
    }

    // ดึงรูปทั้งหมดในหมวดเรียงตาม sort_order
    const { data: existing } = await supabaseAdmin
      .from("journal_images")
      .select("id, sort_order")
      .eq("category_id", categoryId)
      .order("sort_order", { ascending: true })

    const existingImages = existing || []

    if (existingImages.length === 0) {
      const insertItems = validUrls.map((url, idx) => ({
        category_id: categoryId,
        image_url: url,
        sort_order: idx + 1,
        is_active: true,
      }))

      const { error } = await supabaseAdmin.from("journal_images").insert(insertItems)
      if (error) throw error

      await supabaseAdmin
        .from("journal_categories")
        .update({ cover_image_url: validUrls[0] })
        .eq("id", categoryId)

      revalidatePath("/web-gallery")
      return { success: true, count: insertItems.length }
    } else {
      const newCount = validUrls.length
      const nonCoverImages = existingImages.slice(1)

      for (let idx = nonCoverImages.length - 1; idx >= 0; idx--) {
        const newSort = 1 + newCount + (idx + 1)
        await supabaseAdmin
          .from("journal_images")
          .update({ sort_order: newSort })
          .eq("id", nonCoverImages[idx].id)
      }

      const insertItems = validUrls.map((url, idx) => ({
        category_id: categoryId,
        image_url: url,
        sort_order: 2 + idx,
        is_active: true,
      }))

      const { error } = await supabaseAdmin.from("journal_images").insert(insertItems)
      if (error) throw error

      revalidatePath("/web-gallery")
      return { success: true, count: insertItems.length }
    }
  } catch (err: any) {
    return { error: err.message || "Failed to add images" }
  }
}

// 6. อัปเดตข้อมูลรูปภาพ (แก้ไข Alt, Sort, ลิงก์สินค้า)
export async function updateJournalImage(
  imageId: number,
  data: {
    alt_text?: string | null
    sort_order?: number
    is_active?: boolean
    custom_link?: string | null
    product_id?: number | null
  }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Unauthorized")

    const { error } = await supabaseAdmin
      .from("journal_images")
      .update(data)
      .eq("id", imageId)

    if (error) throw error

    revalidatePath("/web-gallery")
    return { success: true }
  } catch (err: any) {
    return { error: err.message || "Failed to update image" }
  }
}

// 7. ลบรูปภาพที่เลือก
export async function deleteJournalImages(imageIds: number[]) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Unauthorized")

    const { error } = await supabaseAdmin
      .from("journal_images")
      .delete()
      .in("id", imageIds)

    if (error) throw error

    revalidatePath("/web-gallery")
    return { success: true }
  } catch (err: any) {
    return { error: err.message || "Failed to delete images" }
  }
}

// 8. สลับลำดับรูปภาพ (Reorder)
export async function reorderJournalImages(
  items: { id: number; sort_order: number }[]
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Unauthorized")

    for (const item of items) {
      await supabaseAdmin
        .from("journal_images")
        .update({ sort_order: item.sort_order })
        .eq("id", item.id)
    }

    revalidatePath("/web-gallery")
    return { success: true }
  } catch (err: any) {
    return { error: err.message || "Failed to reorder images" }
  }
}

// 9. ย้ายรูปภาพไปยังหมวดหมู่อื่น (Move Images to another Category)
export async function moveJournalImages(
  imageIds: number[],
  targetCategoryId: string
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Unauthorized")

    if (!imageIds || imageIds.length === 0) {
      throw new Error("ไม่ได้เลือกรูปภาพ")
    }

    // ดึง sort_order สูงสุดของหมวดปลายทาง
    const { data: latestImg } = await supabaseAdmin
      .from("journal_images")
      .select("sort_order")
      .eq("category_id", targetCategoryId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle()

    let startSort = (latestImg?.sort_order || 0) + 1

    for (let i = 0; i < imageIds.length; i++) {
      await supabaseAdmin
        .from("journal_images")
        .update({
          category_id: targetCategoryId,
          sort_order: startSort + i,
        })
        .eq("id", imageIds[i])
    }

    revalidatePath("/web-gallery")
    return { success: true, count: imageIds.length }
  } catch (err: any) {
    return { error: err.message || "Failed to move images" }
  }
}

