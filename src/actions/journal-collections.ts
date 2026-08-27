"use server";

import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export type LinkedProduct = {
  id: number;
  name: string;
  sku: string | null;
  price: number | null;
  imageUrl: string | null;
  status: string | null;
  collectionGroupId: string | null;
  category: string | null;
  sortOrder: number;
};

export type JournalImageWithProducts = {
  id: number;
  categoryId: string;
  imageUrl: string;
  altText: string | null;
  sortOrder: number;
  isActive: boolean;
  linkedProducts: LinkedProduct[];
};

export type JournalCategoryWithImages = {
  id: string;
  slug: string;
  sortOrder: number;
  titleEn: string;
  titleTh: string;
  descriptionEn: string | null;
  descriptionTh: string | null;
  categoryQuery: string | null;
  coverImageUrl: string | null;
  isActive: boolean;
  images: JournalImageWithProducts[];
};

/**
 * 1. ดึงหมวดหมู่ Journal / Collection ทั้งหมด พร้อมรูปภาพ และสินค้าที่ผูกไว้
 */
export async function getJournalCategoriesWithImages(): Promise<JournalCategoryWithImages[]> {
  // ใช้ supabaseAdmin (service role) เพื่อ bypass RLS — หน้านี้อยู่หลัง middleware auth แล้ว
  const supabase = supabaseAdmin;

  // ดึง Categories
  const { data: categories, error: catError } = await supabase
    .from("journal_categories")
    .select("*")
    .order("sort_order", { ascending: true });

  if (catError) {
    console.error("[journal-collections] getCategories failed:", catError.message);
    return [];
  }

  // ดึง Images
  const { data: images, error: imgError } = await supabase
    .from("journal_images")
    .select("*")
    .order("sort_order", { ascending: true });

  if (imgError) {
    console.error("[journal-collections] getImages failed:", imgError.message);
    return [];
  }

  // ดึงความสัมพันธ์สินค้าจาก journal_image_products (ถ้ามีตาราง)
  const imageIds = (images || []).map((img) => img.id);
  const productsByImageId = new Map<number, LinkedProduct[]>();

  if (imageIds.length > 0) {
    const { data: links, error: linkError } = await supabase
      .from("journal_image_products")
      .select(`
        journal_image_id,
        sort_order,
        product:products (
          id,
          name,
          sku,
          price,
          image_url,
          status,
          collection_group_id,
          category_id
        )
      `)
      .in("journal_image_id", imageIds)
      .order("sort_order", { ascending: true });

    if (!linkError && links) {
      links.forEach((row: any) => {
        const imgId = Number(row.journal_image_id);
        const p = row.product;
        if (!p) return;

        const list = productsByImageId.get(imgId) || [];
        list.push({
          id: Number(p.id),
          name: p.name || "ไม่มีชื่อสินค้า",
          sku: p.sku || null,
          price: p.price !== null ? Number(p.price) : null,
          imageUrl: p.image_url || null,
          status: p.status || null,
          collectionGroupId: p.collection_group_id || null,
          category: p.category_id || null,
          sortOrder: Number(row.sort_order || 0),
        });
        productsByImageId.set(imgId, list);
      });
    }
  }

  // ประกอบข้อมูลเข้าด้วยกัน
  const result: JournalCategoryWithImages[] = (categories || []).map((cat) => {
    const catImages: JournalImageWithProducts[] = (images || [])
      .filter((img) => img.category_id === cat.id)
      .map((img) => ({
        id: Number(img.id),
        categoryId: img.category_id,
        imageUrl: img.image_url,
        altText: img.alt_text,
        sortOrder: Number(img.sort_order || 0),
        isActive: Boolean(img.is_active),
        linkedProducts: productsByImageId.get(Number(img.id)) || [],
      }));

    return {
      id: cat.id,
      slug: cat.slug,
      sortOrder: Number(cat.sort_order || 0),
      titleEn: cat.title_en,
      titleTh: cat.title_th || cat.title_en,
      descriptionEn: cat.description_en,
      descriptionTh: cat.description_th,
      categoryQuery: cat.category_query,
      coverImageUrl: cat.cover_image_url,
      isActive: Boolean(cat.is_active),
      images: catImages,
    };
  });

  return result;
}

/**
 * 2. ค้นหาสินค้า Prop สำหรับแสดงใน Modal เลือกสินค้า (กรอง category_id = 'prop' พร้อม Pagination & Search ลึก)
 */
import { CATEGORY_MAP } from "@/lib/propFilterModel";

export async function searchPropsProducts(
  query: string = "",
  page: number = 0,
  limit: number = 80,
  filterCategory: string = ""
): Promise<{
  products: Array<{
    id: number;
    name: string;
    sku: string | null;
    price: number | null;
    imageUrl: string | null;
    status: string | null;
    collectionGroupId: string | null;
    category: string | null;
  }>;
  totalCount: number;
  hasMore: boolean;
}> {
  const supabase = supabaseAdmin;
  const trimmed = query.trim();
  const catTrimmed = filterCategory.trim();

  const from = page * limit;
  const to = from + limit - 1;

  let req = supabase
    .from("products")
    .select("id, name, sku, price, image_url, status, collection_group_id, category_id", { count: "exact" })
    .eq("category_id", "prop");

  // 1. กรองตาม Category Logic เดียวกับฝั่ง PROP (เช็คจาก collection_groups.product_sup)
  if (catTrimmed && catTrimmed !== "all" && catTrimmed !== "All") {
    const allowedSups = CATEGORY_MAP[catTrimmed] || CATEGORY_MAP[catTrimmed.toUpperCase()];

    if (allowedSups && allowedSups.length > 0) {
      // ดึง collection_groups ที่มี product_sup ตรงตามหมวด
      const { data: matchedGroups } = await supabase
        .from("collection_groups")
        .select("id, product_sup")
        .ilike("tag", "%prop%");

      const allowedSet = new Set(allowedSups.map((s) => s.trim().toLowerCase()));
      const matchingGroupIds = (matchedGroups || [])
        .filter((g) => allowedSet.has(String(g.product_sup || "").trim().toLowerCase()))
        .map((g) => String(g.id));

      if (matchingGroupIds.length > 0) {
        req = req.in("collection_group_id", matchingGroupIds);
      } else {
        // ถ้าไม่พบ group ที่ตรงกัน ให้คืนค่าว่าง
        return { products: [], totalCount: 0, hasMore: false };
      }
    } else {
      // Fallback กรณีเป็น Keyword ทั่วไป
      const keywords = catTrimmed.split(/[,|\s]+/).map((k) => k.trim()).filter(Boolean);
      if (keywords.length > 0) {
        const orClauses = keywords
          .map((k) => `name.ilike.%${k}%,sku.ilike.%${k}%,collection_group_id.ilike.%${k}%,barcode.ilike.%${k}%`)
          .join(",");
        req = req.or(orClauses);
      }
    }
  }

  // 2. กรองตามคำค้นหาใน Search Bar
  if (trimmed) {
    req = req.or(
      `name.ilike.%${trimmed}%,sku.ilike.%${trimmed}%,barcode.ilike.%${trimmed}%,collection_group_id.ilike.%${trimmed}%`
    );
  }

  req = req
    .order("status", { ascending: true }) // active first
    .order("id", { ascending: false })
    .range(from, to);

  const { data, count, error } = await req;
  if (error) {
    console.error("[journal-collections] searchProducts failed:", error.message);
    return { products: [], totalCount: 0, hasMore: false };
  }

  const mapped = (data || []).map((p) => ({
    id: Number(p.id),
    name: p.name || "ไม่มีชื่อสินค้า",
    sku: p.sku || null,
    price: p.price !== null ? Number(p.price) : null,
    imageUrl: p.image_url || null,
    status: p.status || null,
    collectionGroupId: p.collection_group_id || null,
    category: p.category_id || null,
  }));

  const total = count || 0;
  const hasMore = to < total - 1;

  return {
    products: mapped,
    totalCount: total,
    hasMore,
  };
}

/**
 * 3. บันทึก/อัปเดตการผูกสินค้ากับรูปภาพ Collection นั้นๆ
 */
export async function syncJournalImageProducts(journalImageId: number, productIds: number[]) {
  // ตรวจสอบ auth ก่อน
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // ใช้ supabaseAdmin เพื่อ bypass RLS (ตาราง journal_image_products ไม่มี policy สำหรับ authenticated)
  // 1. ลบรายการเก่าของรูปนี้ออก
  const { error: deleteError } = await supabaseAdmin
    .from("journal_image_products")
    .delete()
    .eq("journal_image_id", journalImageId);

  if (deleteError) {
    console.error("[journal-collections] delete old links failed:", deleteError.message);
    throw new Error(`ไม่สามารถลบข้อมูลการผูกสินค้าเดิมได้: ${deleteError.message}`);
  }

  // 2. ถ้ามีสินค้าที่เลือกใหม่ ให้ Insert ลงไปตามลำดับ
  if (productIds.length > 0) {
    const rows = productIds.map((productId, idx) => ({
      journal_image_id: journalImageId,
      product_id: productId,
      sort_order: idx + 1,
    }));

    const { error: insertError } = await supabaseAdmin
      .from("journal_image_products")
      .insert(rows);

    if (insertError) {
      console.error("[journal-collections] insert links failed:", insertError.message);
      throw new Error(`ไม่สามารถบันทึกการผูกสินค้าใหม่ได้: ${insertError.message}`);
    }
  }

  revalidatePath("/web-gallery");
  revalidatePath("/app-management/collections");
  revalidatePath("/collections");
  revalidatePath("/journal");

  return { success: true, count: productIds.length };
}

/**
 * 4. เพิ่มรูปภาพใหม่ในหมวดหมู่ (รองรับการวางหลาย URL)
 */
export async function addJournalImages(categoryId: string, urls: string[]) {
  const supabase = supabaseAdmin;
  const validUrls = urls.map((u) => u.trim()).filter((u) => u.startsWith("http"));
  if (validUrls.length === 0) return { success: false, message: "ไม่มี URL ที่ถูกต้อง" };

  // หาลำดับสูงสุดเดิม
  const { data: existing } = await supabase
    .from("journal_images")
    .select("sort_order")
    .eq("category_id", categoryId)
    .order("sort_order", { ascending: false })
    .limit(1);

  const startOrder = existing && existing[0]?.sort_order ? Number(existing[0].sort_order) : 0;

  const rows = validUrls.map((url, idx) => ({
    category_id: categoryId,
    image_url: url,
    sort_order: startOrder + idx + 1,
    is_active: true,
  }));

  const { error } = await supabase.from("journal_images").insert(rows);
  if (error) throw new Error(error.message);

  revalidatePath("/web-gallery");
  return { success: true, added: validUrls.length };
}

/**
 * 5. ตั้งรูปภาพเป็นรูปปกของหมวดหมู่ (ย้ายไปอันดับ 1 และอัปเดต cover_image_url ใน journal_categories)
 */
export async function setJournalCoverImage(categoryId: string, imageId: number) {
  const supabase = supabaseAdmin;

  const { data: targetImage } = await supabase
    .from("journal_images")
    .select("image_url")
    .eq("id", imageId)
    .single();

  if (!targetImage) throw new Error("ไม่พบรูปภาพนี้");

  // อัปเดต category cover_image_url
  await supabase
    .from("journal_categories")
    .update({ cover_image_url: targetImage.image_url })
    .eq("id", categoryId);

  // ดึงรูปทั้งหมดในหมวดมาจัดเรียงใหม่
  const { data: images } = await supabase
    .from("journal_images")
    .select("id, sort_order")
    .eq("category_id", categoryId)
    .order("sort_order", { ascending: true });

  if (images) {
    const reordered = [
      images.find((i) => i.id === imageId),
      ...images.filter((i) => i.id !== imageId),
    ].filter(Boolean);

    for (let idx = 0; idx < reordered.length; idx++) {
      await supabase
        .from("journal_images")
        .update({ sort_order: idx + 1 })
        .eq("id", reordered[idx]!.id);
    }
  }

  revalidatePath("/web-gallery");
  return { success: true };
}

/**
 * 6. สลับลำดับรูปภาพขึ้น/ลง (Reorder)
 */
export async function reorderJournalImage(imageId: number, direction: "up" | "down", categoryId: string) {
  const supabase = supabaseAdmin;

  const { data: images } = await supabase
    .from("journal_images")
    .select("id, sort_order")
    .eq("category_id", categoryId)
    .order("sort_order", { ascending: true });

  if (!images || images.length <= 1) return { success: true };

  const currentIndex = images.findIndex((img) => img.id === imageId);
  if (currentIndex === -1) return { success: false };

  const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
  if (targetIndex < 0 || targetIndex >= images.length) return { success: true };

  // สลับตำแหน่ง
  const currentImg = images[currentIndex];
  const targetImg = images[targetIndex];

  await supabase.from("journal_images").update({ sort_order: targetImg.sort_order }).eq("id", currentImg.id);
  await supabase.from("journal_images").update({ sort_order: currentImg.sort_order }).eq("id", targetImg.id);

  revalidatePath("/web-gallery");
  return { success: true };
}

/**
 * 7. ย้ายรูปภาพข้ามหมวดหมู่
 */
export async function moveJournalImagesCategory(imageIds: number[], newCategoryId: string) {
  const supabase = supabaseAdmin;

  const { error } = await supabase
    .from("journal_images")
    .update({ category_id: newCategoryId })
    .in("id", imageIds);

  if (error) throw new Error(error.message);

  revalidatePath("/web-gallery");
  return { success: true };
}

/**
 * 8. ลบรูปภาพออกจากระบบ
 */
export async function deleteJournalImages(imageIds: number[]) {
  const supabase = supabaseAdmin;

  const { error } = await supabase
    .from("journal_images")
    .delete()
    .in("id", imageIds);

  if (error) throw new Error(error.message);

  revalidatePath("/web-gallery");
  return { success: true };
}

/**
 * 9. เพิ่มหมวดหมู่ Collection ใหม่
 */
export async function createJournalCategory(data: {
  titleEn: string;
  titleTh: string;
  slug: string;
  categoryQuery: string;
  descriptionEn?: string;
  descriptionTh?: string;
  coverImageUrl?: string;
}) {
  const supabase = supabaseAdmin;

  // หา sort_order ล่าสุด
  const { data: latest } = await supabase
    .from("journal_categories")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1);

  const nextOrder = latest && latest[0]?.sort_order ? Number(latest[0].sort_order) + 1 : 1;

  const { error } = await supabase.from("journal_categories").insert({
    title_en: data.titleEn,
    title_th: data.titleTh,
    slug: data.slug.toLowerCase().trim().replace(/\s+/g, "-"),
    category_query: data.categoryQuery,
    description_en: data.descriptionEn || null,
    description_th: data.descriptionTh || null,
    cover_image_url: data.coverImageUrl || null,
    sort_order: nextOrder,
    is_active: true,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/web-gallery");
  return { success: true };
}

/**
 * 10. แก้ไขข้อมูลหมวดหมู่ Collection
 */
export async function updateJournalCategory(id: string, data: {
  titleEn: string;
  titleTh: string;
  slug: string;
  categoryQuery: string;
  descriptionEn?: string;
  descriptionTh?: string;
  coverImageUrl?: string;
}) {
  const supabase = supabaseAdmin;

  const { error } = await supabase
    .from("journal_categories")
    .update({
      title_en: data.titleEn,
      title_th: data.titleTh,
      slug: data.slug.toLowerCase().trim().replace(/\s+/g, "-"),
      category_query: data.categoryQuery,
      description_en: data.descriptionEn || null,
      description_th: data.descriptionTh || null,
      cover_image_url: data.coverImageUrl || null,
    })
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/web-gallery");
  return { success: true };
}

/**
 * 11. เปิด/ปิดการแสดงผลของหมวดหมู่
 */
export async function toggleJournalCategoryActive(id: string, isActive: boolean) {
  const supabase = supabaseAdmin;

  const { error } = await supabase
    .from("journal_categories")
    .update({ is_active: isActive })
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/web-gallery");
  return { success: true };
}

/**
 * 12. ลบหมวดหมู่ Collection
 */
export async function deleteJournalCategory(id: string) {
  const supabase = supabaseAdmin;

  const { error } = await supabase
    .from("journal_categories")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/web-gallery");
  return { success: true };
}


