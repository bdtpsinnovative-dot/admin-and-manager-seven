"use server";

import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

async function checkAuth() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Error("Unauthorized - กรุณาเข้าสู่ระบบ");
  }
  return user;
}

export interface UpdateSkuResult {
  success?: boolean;
  error?: string;
  oldSku?: string;
  newSku?: string;
  productName?: string;
  productId?: number;
}

/**
 * 🏷️ อัปเดต SKU สินค้าโดยตรงในฐานข้อมูล
 * ไม่ลบสินค้า ไม่เคลียร์สต็อก ไม่กระทบประวัติการขายและ foreign keys
 */
export async function updateProductSku(
  productId: number | string,
  newSku: string
): Promise<UpdateSkuResult> {
  try {
    await checkAuth();
    const cleanSku = (newSku || "").trim();
    if (!cleanSku) {
      return { error: "กรุณาระบุ SKU ใหม่" };
    }

    const numId = Number(productId);
    if (isNaN(numId)) {
      return { error: "รหัสสินค้าไม่ถูกต้อง" };
    }

    // 1. ดึงข้อมูลสินค้าเดิม
    const { data: currentProduct, error: fetchErr } = await supabaseAdmin
      .from("products")
      .select("id, name, sku, category_id, barcode")
      .eq("id", numId)
      .single();

    if (fetchErr || !currentProduct) {
      return { error: "ไม่พบข้อมูลสินค้านี้ในระบบ" };
    }

    if (currentProduct.sku === cleanSku) {
      return {
        success: true,
        oldSku: currentProduct.sku,
        newSku: cleanSku,
        productName: currentProduct.name,
        productId: numId,
      };
    }

    // 2. ตรวจสอบว่า SKU ใหม่ซ้ำกับสินค้าตัวอื่นหรือไม่
    const { data: duplicate, error: dupErr } = await supabaseAdmin
      .from("products")
      .select("id, name, sku")
      .eq("sku", cleanSku)
      .neq("id", numId)
      .maybeSingle();

    if (duplicate) {
      return {
        error: `SKU "${cleanSku}" ซ้ำกับสินค้าตัวอื่นแล้ว: "${duplicate.name}" (ID: ${duplicate.id})`,
      };
    }

    // 3. ทำการอัปเดต SKU ที่ตาราง products โดยตรง
    const { error: updateErr } = await supabaseAdmin
      .from("products")
      .update({
        sku: cleanSku,
        updated_at: new Date().toISOString(),
      })
      .eq("id", numId);

    if (updateErr) {
      return { error: `อัปเดต SKU ไม่สำเร็จ: ${updateErr.message}` };
    }

    // Revalidate paths เพื่อให้หน้าต่างๆ โหลด SKU ใหม่ทันที
    revalidatePath("/inventory");
    revalidatePath(`/inventory/${numId}`);
    revalidatePath("/inventory/update-sku");
    revalidatePath("/props");
    revalidatePath("/propsfina");
    revalidatePath("/propsfinatest");
    revalidatePath("/propsfinatest2");

    return {
      success: true,
      oldSku: currentProduct.sku,
      newSku: cleanSku,
      productName: currentProduct.name,
      productId: numId,
    };
  } catch (err: any) {
    return { error: err.message || "เกิดข้อผิดพลาดในการอัปเดต SKU" };
  }
}

/**
 * 📁 อัปเดต SKU หลายรายการพร้อมกัน (จากไฟล์หรือตาราง)
 */
export async function bulkUpdateProductSkus(
  items: { productId?: number | string; oldSku?: string; newSku: string }[]
): Promise<{
  success: boolean;
  updatedCount: number;
  skippedCount: number;
  errors: string[];
}> {
  try {
    await checkAuth();
    if (!Array.isArray(items) || items.length === 0) {
      return { success: false, updatedCount: 0, skippedCount: 0, errors: ["ไม่มีรายการที่ต้องการอัปเดต"] };
    }

    let updatedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (const item of items) {
      const cleanNewSku = (item.newSku || "").trim();
      if (!cleanNewSku) {
        skippedCount++;
        continue;
      }

      let targetId: number | null = item.productId ? Number(item.productId) : null;

      if (!targetId && item.oldSku) {
        const { data: p } = await supabaseAdmin
          .from("products")
          .select("id")
          .eq("sku", item.oldSku.trim())
          .maybeSingle();
        if (p) targetId = p.id;
      }

      if (!targetId) {
        errors.push(`ไม่พบสินค้าสำหรับ SKU เดิม: "${item.oldSku || "-"}"`);
        skippedCount++;
        continue;
      }

      const res = await updateProductSku(targetId, cleanNewSku);
      if (res.error) {
        errors.push(res.error);
        skippedCount++;
      } else {
        updatedCount++;
      }
    }

    revalidatePath("/inventory");
    revalidatePath("/inventory/update-sku");
    return { success: updatedCount > 0, updatedCount, skippedCount, errors };
  } catch (err: any) {
    return { success: false, updatedCount: 0, skippedCount: 0, errors: [err.message || "เกิดข้อผิดพลาด"] };
  }
}

/**
 * 🔍 ค้นหาสินค้าเพื่อเตรียมอัปเดต SKU
 */
export async function getProductsForSkuUpdate({
  category = "prop",
  search = "",
  limit = 50,
}: {
  category?: string;
  search?: string;
  limit?: number;
}) {
  try {
    await checkAuth();
    const q = (search || "").trim();

    let query = supabaseAdmin
      .from("products")
      .select("id, name, sku, barcode, category_id, image_url, color, price, status, specs")
      .order("id", { ascending: false })
      .limit(limit);

    if (category && category !== "ALL") {
      query = query.eq("category_id", category);
    }

    if (q) {
      query = query.or(`name.ilike.%${q}%,sku.ilike.%${q}%,barcode.ilike.%${q}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return { data: data || [] };
  } catch (err: any) {
    return { data: [], error: err.message };
  }
}


/**
 * 🔍 ตรวจสอบความถูกต้องของคู่ SKU (Old SKU -> New SKU) ก่อนยืนยันบันทึกจริง
 * ดึงชื่อสินค้าและเช็คว่ามีตัวตนจริงหรือไม่ และ SKU ใหม่ซ้ำกับสินค้าอื่นหรือไม่
 */
export async function validateSkuPairs(
  pairs: { oldSku: string; newSku: string }[]
): Promise<{
  data: {
    oldSku: string;
    newSku: string;
    productId?: number;
    productName?: string;
    imageUrl?: string;
    status: 'ready' | 'not_found' | 'duplicate_new_sku' | 'same' | 'invalid';
    message?: string;
  }[];
  error?: string;
}> {
  try {
    await checkAuth();
    if (!Array.isArray(pairs) || pairs.length === 0) {
      return { data: [] };
    }

    const cleanPairs = pairs
      .map(p => ({
        oldSku: (p.oldSku || '').trim(),
        newSku: (p.newSku || '').trim()
      }))
      .filter(p => p.oldSku || p.newSku);

    const oldSkus = Array.from(new Set(cleanPairs.map(p => p.oldSku).filter(Boolean)));
    const newSkus = Array.from(new Set(cleanPairs.map(p => p.newSku).filter(Boolean)));
    const allSkusToCheck = Array.from(new Set([...oldSkus, ...newSkus]));

    // ดึงสินค้าทั้งหมดที่ตรงกับ oldSkus หรือ newSkus
    const { data: matchedProducts, error: pErr } = await supabaseAdmin
      .from('products')
      .select('id, name, sku, category_id, image_url')
      .in('sku', allSkusToCheck);

    if (pErr) throw pErr;

    const productBySkuMap = new Map<string, any>();
    (matchedProducts || []).forEach(p => {
      if (p.sku) {
        productBySkuMap.set(p.sku.toLowerCase(), p);
      }
    });

    const results = cleanPairs.map(pair => {
      const { oldSku, newSku } = pair;

      if (!newSku) {
        return {
          oldSku,
          newSku,
          status: 'invalid' as const,
          message: 'ไม่ได้ระบุ SKU ใหม่'
        };
      }

      if (oldSku.toLowerCase() === newSku.toLowerCase()) {
        const prod = productBySkuMap.get(oldSku.toLowerCase());
        return {
          oldSku,
          newSku,
          productId: prod?.id,
          productName: prod?.name,
          imageUrl: prod?.image_url,
          status: 'same' as const,
          message: 'SKU ใหม่เหมือนเดิม ไม่ต้องเปลี่ยนแปลง'
        };
      }

      const existingProd = productBySkuMap.get(oldSku.toLowerCase());
      if (!existingProd) {
        return {
          oldSku,
          newSku,
          status: 'not_found' as const,
          message: 'ไม่พบสินค้าที่มี SKU เดิมนี้ในระบบ'
        };
      }

      // เช็คว่า newSku ไปซ้ำกับสินค้าอื่นหรือไม่
      const duplicateProd = productBySkuMap.get(newSku.toLowerCase());
      if (duplicateProd && duplicateProd.id !== existingProd.id) {
        return {
          oldSku,
          newSku,
          productId: existingProd.id,
          productName: existingProd.name,
          imageUrl: existingProd.image_url,
          status: 'duplicate_new_sku' as const,
          message: `SKU ใหม่ซ้ำกับสินค้า "${duplicateProd.name}" (ID: ${duplicateProd.id})`
        };
      }

      return {
        oldSku,
        newSku,
        productId: existingProd.id,
        productName: existingProd.name,
        imageUrl: existingProd.image_url,
        status: 'ready' as const,
        message: 'พร้อมอัปเดต'
      };
    });

    return { data: results };
  } catch (err: any) {
    return { data: [], error: err.message };
  }
}
