"use server";

import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

/* =============================================================================
   TYPES
   ============================================================================= */

export type TerraPromotion = {
  id: string;
  title: string;
  description: string | null;
  promo_scope?: "set" | "global" | null;
  collection_group_id?: string | null; // references journal_images.id (sub-collection) when scope is 'set'
  collection_name?: string | null;      // ชื่อ category + alt_text ของรูป
  collection_image?: string | null;     // รูปภาพของ sub-collection นั้น
  collection_item_count?: number;       // จำนวนสินค้าที่ผูกกับรูปนั้น
  parent_category_name?: string | null; // ชื่อหมวดหลัก (journal_categories)
  trigger_type: "auto" | "coupon";
  coupon_code: string | null;
  discount_type: "percentage" | "fixed_amount";
  discount_value: number;
  min_sets: number;
  min_spend?: number | null;
  max_discount_amount: number | null;
  start_date: string | null;
  end_date: string | null;
  usage_limit: number | null;
  used_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type TerraCartItem = {
  id: number;
  sku: string | null;
  name: string;
  price: number;
  quantity: number;
  collection_group_id?: string | null;
  image_url?: string | null;
};

export type AppliedTerraPromotion = {
  promotionId: string;
  title: string;
  promoScope: "set" | "global";
  triggerType: "auto" | "coupon";
  couponCode: string | null;
  collectionGroupId?: string | null;
  collectionName?: string | null;
  completedSets?: number;
  eligibleAmount: number;
  discountAmount: number;
  description: string;
};

export type TerraDiscountResult = {
  appliedPromotions: AppliedTerraPromotion[];
  cartSubtotal: number;
  autoDiscountTotal: number;
  couponDiscountTotal: number;
  totalDiscount: number;
  finalTotal: number;
  bestDealType: "auto" | "coupon" | "none";
  bestDealNotice?: string | null;
  couponStatus: {
    isValid: boolean;
    message: string;
    code?: string | null;
  } | null;
};

/**
 * AvailableCollectionGroup = แต่ละรูป (journal_image) ที่มีสินค้าผูกอยู่
 * ไม่ใช่ทั้งหมวด (journal_category) แต่เป็น Sub-Collection ย่อยแต่ละรูป
 */
export type AvailableCollectionGroup = {
  id: string;               // journal_images.id (as string)
  name: string;             // "หมวดหลัก — รูป #N" หรือ alt_text
  imageUrl: string | null;  // journal_images.image_url
  tag: string | null;       // parent category slug
  parentCategoryName: string; // ชื่อหมวดหลัก
  itemCount: number;        // จำนวนสินค้าที่ผูก
  sampleSkus: string[];
};

/* =============================================================================
   ADMIN CRUD SERVER ACTIONS
   journal_images = sub-collection (แต่ละรูปที่มีสินค้าผูก)
   journal_image_products = สินค้าที่ผูกอยู่ในรูปนั้น
   journal_categories = หมวดหลัก (parent)
   ============================================================================= */

/**
 * 1. ดึงรายการโปรโมชัน/คูปองของ Terra ทั้งหมด
 */
export async function getTerraPromotions(): Promise<TerraPromotion[]> {
  try {
    const { data: promotions, error } = await supabaseAdmin
      .from("terra_collection_promotions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[terra-promotions] getTerraPromotions failed:", error.message);
      return [];
    }

    if (!promotions || promotions.length === 0) return [];

    // ดึง collection_group_id ที่เป็นตัวเลข (journal_images.id)
    const numericImageIds = [
      ...new Set(
        promotions
          .map((p) => Number(p.collection_group_id))
          .filter((n) => !isNaN(n) && n > 0)
      ),
    ];

    let catMap = new Map<string, any>();
    let imgMap = new Map<string, any>();
    let countByImage = new Map<string, number>();

    if (numericImageIds.length > 0) {
      const { data: images } = await supabaseAdmin
        .from("journal_images")
        .select("id, category_id, image_url, alt_text, sort_order")
        .in("id", numericImageIds);

      const categoryIds = [...new Set((images || []).map((img) => img.category_id))];
      const { data: categories } = await supabaseAdmin
        .from("journal_categories")
        .select("id, slug, title_en, title_th")
        .in("id", categoryIds);

      catMap = new Map(categories?.map((c) => [String(c.id), c]));
      imgMap = new Map(images?.map((img) => [String(img.id), img]));

      const { data: links } = await supabaseAdmin
        .from("journal_image_products")
        .select("journal_image_id, product_id")
        .in("journal_image_id", numericImageIds);

      links?.forEach((l) => {
        const key = String(l.journal_image_id);
        countByImage.set(key, (countByImage.get(key) || 0) + 1);
      });
    }

    return promotions.map((p) => {
      const isGlobal = p.promo_scope === "global" || !p.collection_group_id || p.collection_group_id === "global";
      if (isGlobal) {
        return {
          ...p,
          promo_scope: "global",
          collection_name: "ทั้งร้านค้า (Global Coupon)",
          collection_image: null,
          collection_item_count: 0,
          parent_category_name: "ร้านค้าออนไลน์ Terra",
        };
      }

      const imgId = String(p.collection_group_id);
      const img = imgMap.get(imgId);
      const cat = img ? catMap.get(String(img.category_id)) : null;
      const parentName = cat ? (cat.title_th || cat.title_en || cat.slug) : null;
      const imgLabel = img?.alt_text || `รูป #${img?.sort_order || imgId}`;
      const collectionName = parentName ? `${parentName} — ${imgLabel}` : imgLabel;

      return {
        ...p,
        promo_scope: p.promo_scope || "set",
        collection_name: collectionName,
        collection_image: img?.image_url || null,
        collection_item_count: countByImage.get(imgId) || 0,
        parent_category_name: parentName,
      };
    });
  } catch (err: any) {
    console.error("[terra-promotions] getTerraPromotions exception:", err.message);
    return [];
  }
}

/**
 * 2. ดึงรายการ Sub-Collection (journal_images) ที่มีสินค้าผูกอยู่
 */
export async function getAvailableCollectionGroups(): Promise<AvailableCollectionGroup[]> {
  try {
    const { data: categories, error: catErr } = await supabaseAdmin
      .from("journal_categories")
      .select("id, slug, title_en, title_th, is_active, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (catErr) throw catErr;
    if (!categories || categories.length === 0) return [];

    const catIds = categories.map((c) => String(c.id));
    const catMap = new Map(categories.map((c) => [String(c.id), c]));

    const { data: images, error: imgErr } = await supabaseAdmin
      .from("journal_images")
      .select("id, category_id, image_url, alt_text, sort_order, is_active")
      .in("category_id", catIds)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (imgErr) throw imgErr;
    if (!images || images.length === 0) return [];

    const imageIds = images.map((img) => Number(img.id));

    const { data: links, error: linkErr } = await supabaseAdmin
      .from("journal_image_products")
      .select(`
        journal_image_id,
        product:products ( id, sku, name, status )
      `)
      .in("journal_image_id", imageIds);

    if (linkErr) throw linkErr;

    const productsByImage = new Map<number, Array<{ id: number; sku: string | null; name: string }>>();

    links?.forEach((row: any) => {
      const imgId = Number(row.journal_image_id);
      const prod = row.product;
      if (!prod || prod.status !== "active") return;

      const list = productsByImage.get(imgId) || [];
      if (!list.some((p) => p.id === Number(prod.id))) {
        list.push({ id: Number(prod.id), sku: prod.sku, name: prod.name });
      }
      productsByImage.set(imgId, list);
    });

    const result: AvailableCollectionGroup[] = [];

    for (const img of images) {
      const prods = productsByImage.get(Number(img.id)) || [];
      if (prods.length === 0) continue;

      const cat = catMap.get(String(img.category_id));
      const parentName = cat ? (cat.title_th || cat.title_en || cat.slug) : `หมวด #${img.category_id}`;
      const imgLabel = img.alt_text || `รูป #${img.sort_order || img.id}`;
      const sampleSkus = prods.map((p) => p.sku || p.name).filter(Boolean).slice(0, 5) as string[];

      result.push({
        id: String(img.id),
        name: `${parentName} — ${imgLabel}`,
        imageUrl: img.image_url || null,
        tag: cat?.slug || null,
        parentCategoryName: parentName,
        itemCount: prods.length,
        sampleSkus,
      });
    }

    return result;
  } catch (err: any) {
    console.error("[terra-promotions] getAvailableCollectionGroups error:", err.message);
    return [];
  }
}

/**
 * 3. สร้างโปรโมชัน / คูปอง
 */
export async function createTerraPromotion(data: {
  title: string;
  description?: string | null;
  promo_scope?: "set" | "global";
  collection_group_id?: string | null;
  trigger_type?: "auto" | "coupon";
  coupon_code?: string | null;
  discount_type?: "percentage" | "fixed_amount";
  discount_value: number;
  min_sets?: number;
  min_spend?: number | null;
  max_discount_amount?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  usage_limit?: number | null;
  is_active?: boolean;
}) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized: กรุณาเข้าสู่ระบบ");

    if (!data.title?.trim()) throw new Error("กรุณากรอกชื่อโปรโมชัน");
    if (data.discount_value <= 0) throw new Error("มูลค่าส่วนลดต้องมากกว่า 0");

    const scope = data.promo_scope || "set";
    let triggerType = data.trigger_type;
    let cleanCode = data.coupon_code?.trim().toUpperCase() || null;
    let collectionGroupId = data.collection_group_id ? String(data.collection_group_id) : null;
    let discountType = data.discount_type || "percentage";

    if (scope === "set") {
      triggerType = "auto";
      cleanCode = null;
      discountType = "percentage"; // โปรโมชันเซ็ตลดเป็น % อัตโนมัติ
      if (!collectionGroupId) throw new Error("กรุณาเลือก Collection / รูปภาพสำหรับโปรโมชันเซ็ต");
    } else {
      // Global Coupon
      triggerType = "coupon";
      collectionGroupId = null;
      if (!cleanCode) throw new Error("กรุณากรอกรหัสคูปอง (Coupon Code)");
    }

    const payload: Record<string, any> = {
      title: data.title.trim(),
      description: data.description?.trim() || null,
      promo_scope: scope,
      collection_group_id: collectionGroupId,
      trigger_type: triggerType,
      coupon_code: cleanCode,
      discount_type: discountType,
      discount_value: Number(data.discount_value),
      min_sets: scope === "set" ? Math.max(1, Number(data.min_sets || 1)) : 1,
      min_spend: scope === "global" && data.min_spend ? Number(data.min_spend) : 0,
      max_discount_amount: data.max_discount_amount ? Number(data.max_discount_amount) : null,
      start_date: data.start_date ? new Date(data.start_date).toISOString() : null,
      end_date: data.end_date ? new Date(data.end_date).toISOString() : null,
      usage_limit: data.usage_limit ? Number(data.usage_limit) : null,
      is_active: data.is_active !== undefined ? data.is_active : true,
    };

    const { data: inserted, error } = await supabaseAdmin
      .from("terra_collection_promotions")
      .insert([payload])
      .select()
      .single();

    if (error) {
      if (error.code === "23505") throw new Error("รหัสคูปองนี้ถูกใช้งานแล้ว กรุณาใช้รหัสอื่น");
      throw error;
    }

    revalidatePath("/discounts");
    return { success: true, promotion: inserted };
  } catch (err: any) {
    return { success: false, error: err.message || "ไม่สามารถสร้างโปรโมชันได้" };
  }
}

/**
 * 4. แก้ไขโปรโมชัน / คูปอง
 */
export async function updateTerraPromotion(
  id: string,
  data: Partial<Omit<TerraPromotion, "id" | "created_at" | "updated_at">>
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized: กรุณาเข้าสู่ระบบ");

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (data.title !== undefined) updatePayload.title = data.title.trim();
    if (data.description !== undefined) updatePayload.description = data.description?.trim() || null;
    if (data.promo_scope !== undefined) updatePayload.promo_scope = data.promo_scope;
    if (data.collection_group_id !== undefined) {
      updatePayload.collection_group_id = data.collection_group_id ? String(data.collection_group_id) : null;
    }
    if (data.trigger_type !== undefined) updatePayload.trigger_type = data.trigger_type;
    if (data.coupon_code !== undefined) {
      updatePayload.coupon_code = data.coupon_code ? data.coupon_code.trim().toUpperCase() : null;
    }
    if (data.discount_type !== undefined) updatePayload.discount_type = data.discount_type;
    if (data.discount_value !== undefined) updatePayload.discount_value = Number(data.discount_value);
    if (data.min_sets !== undefined) updatePayload.min_sets = Math.max(1, Number(data.min_sets));
    if (data.min_spend !== undefined) updatePayload.min_spend = data.min_spend ? Number(data.min_spend) : 0;
    if (data.max_discount_amount !== undefined) updatePayload.max_discount_amount = data.max_discount_amount ? Number(data.max_discount_amount) : null;
    if (data.start_date !== undefined) updatePayload.start_date = data.start_date ? new Date(data.start_date).toISOString() : null;
    if (data.end_date !== undefined) updatePayload.end_date = data.end_date ? new Date(data.end_date).toISOString() : null;
    if (data.usage_limit !== undefined) updatePayload.usage_limit = data.usage_limit ? Number(data.usage_limit) : null;
    if (data.is_active !== undefined) updatePayload.is_active = Boolean(data.is_active);

    const { error } = await supabaseAdmin
      .from("terra_collection_promotions")
      .update(updatePayload)
      .eq("id", id);

    if (error) {
      if (error.code === "23505") throw new Error("รหัสคูปองนี้ถูกใช้งานแล้ว กรุณาใช้รหัสอื่น");
      throw error;
    }

    revalidatePath("/discounts");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "ไม่สามารถแก้ไขโปรโมชันได้" };
  }
}

/**
 * 5. เปิด/ปิด การใช้งานโปรโมชัน
 */
export async function toggleTerraPromotion(id: string, currentStatus: boolean) {
  try {
    const { error } = await supabaseAdmin
      .from("terra_collection_promotions")
      .update({ is_active: !currentStatus, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) throw error;
    revalidatePath("/discounts");
    return { success: true, nextStatus: !currentStatus };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * 6. ลบโปรโมชัน
 */
export async function deleteTerraPromotion(id: string) {
  try {
    const { error } = await supabaseAdmin
      .from("terra_collection_promotions")
      .delete()
      .eq("id", id);

    if (error) throw error;
    revalidatePath("/discounts");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * 7. ดึงรายการโปรโมชันที่ Active ทั้งหมด
 */
export async function getActiveTerraPromotions(): Promise<TerraPromotion[]> {
  try {
    const now = new Date().toISOString();
    const { data: promotions, error } = await supabaseAdmin
      .from("terra_collection_promotions")
      .select("*")
      .eq("is_active", true);

    if (error || !promotions) return [];

    return promotions.filter((p) => {
      if (p.start_date && new Date(p.start_date).toISOString() > now) return false;
      if (p.end_date && new Date(p.end_date).toISOString() < now) return false;
      if (p.usage_limit !== null && p.used_count >= p.usage_limit) return false;
      return true;
    });
  } catch (err) {
    console.error("[terra-promotions] getActiveTerraPromotions error:", err);
    return [];
  }
}

/**
 * 8. ⚡ คำนวณส่วนลดตะกร้าสินค้าสำหรับเว็บ Terra ตามกฎ Best Deal (Non-Stackable)
 */
export async function calculateTerraCartDiscounts(
  cartItems: TerraCartItem[],
  couponCode?: string | null
): Promise<TerraDiscountResult> {
  const subtotal = cartItems.reduce(
    (sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1),
    0
  );

  if (!cartItems || cartItems.length === 0) {
    return {
      appliedPromotions: [],
      cartSubtotal: 0,
      autoDiscountTotal: 0,
      couponDiscountTotal: 0,
      totalDiscount: 0,
      finalTotal: 0,
      bestDealType: "none",
      couponStatus: couponCode
        ? { isValid: false, message: "ตะกร้าสินค้าว่างเปล่า", code: couponCode }
        : null,
    };
  }

  const activePromotions = await getActiveTerraPromotions();
  if (activePromotions.length === 0) {
    return {
      appliedPromotions: [],
      cartSubtotal: subtotal,
      autoDiscountTotal: 0,
      couponDiscountTotal: 0,
      totalDiscount: 0,
      finalTotal: subtotal,
      bestDealType: "none",
      couponStatus: couponCode
        ? { isValid: false, message: "ไม่พบโปรโมชันที่ใช้งานได้", code: couponCode }
        : null,
    };
  }

  // แยกโปรโมชันเป็น 2 กลุ่ม: Auto Set Promos และ Coupon Promos
  const setPromos = activePromotions.filter(
    (p) => (p.promo_scope === "set" || !p.promo_scope) && p.trigger_type === "auto" && p.collection_group_id
  );
  const couponPromos = activePromotions.filter(
    (p) => p.trigger_type === "coupon" && p.coupon_code
  );

  // ── A. ประมวลผล Auto Set Promotions ───────────────────────────────────────
  const targetImageIds = [
    ...new Set(setPromos.map((p) => Number(p.collection_group_id))),
  ].filter((n) => !isNaN(n) && n > 0);

  let catMap = new Map<string, string>();
  let imgMap = new Map<number, { catId: string; label: string }>();
  const requiredProductsByImage = new Map<string, Array<{ id: number; sku: string | null; price: number }>>();

  if (targetImageIds.length > 0) {
    const { data: targetImages } = await supabaseAdmin
      .from("journal_images")
      .select("id, category_id, alt_text, sort_order")
      .in("id", targetImageIds);

    const targetCatIds = [...new Set((targetImages || []).map((img) => img.category_id))];
    const { data: categories } = await supabaseAdmin
      .from("journal_categories")
      .select("id, title_en, title_th, slug")
      .in("id", targetCatIds);

    categories?.forEach((c) => catMap.set(String(c.id), c.title_th || c.title_en || c.slug));

    targetImages?.forEach((img) => {
      const catName = catMap.get(String(img.category_id)) || `หมวด #${img.category_id}`;
      const imgLabel = img.alt_text || `รูป #${img.sort_order || img.id}`;
      imgMap.set(Number(img.id), { catId: String(img.category_id), label: `${catName} — ${imgLabel}` });
    });

    const { data: links } = await supabaseAdmin
      .from("journal_image_products")
      .select(`
        journal_image_id,
        product:products ( id, sku, price, status )
      `)
      .in("journal_image_id", targetImageIds);

    const seenPerImage = new Map<string, Set<number>>();
    links?.forEach((row: any) => {
      const imgId = String(row.journal_image_id);
      const prod = row.product;
      if (!prod || prod.status !== "active") return;

      const seen = seenPerImage.get(imgId) || new Set<number>();
      if (!seen.has(Number(prod.id))) {
        seen.add(Number(prod.id));
        seenPerImage.set(imgId, seen);

        const list = requiredProductsByImage.get(imgId) || [];
        list.push({
          id: Number(prod.id),
          sku: prod.sku,
          price: Number(prod.price) || 0,
        });
        requiredProductsByImage.set(imgId, list);
      }
    });
  }

  const cartQtyByProductId = new Map<number, number>();
  cartItems.forEach((item) => {
    cartQtyByProductId.set(item.id, (cartQtyByProductId.get(item.id) || 0) + (Number(item.quantity) || 1));
  });

  const autoAppliedDiscounts: AppliedTerraPromotion[] = [];
  let autoDiscountTotal = 0;

  for (const promo of setPromos) {
    const imgId = String(promo.collection_group_id);
    const requiredItems = requiredProductsByImage.get(imgId) || [];
    if (requiredItems.length === 0) continue;

    let isComplete = true;
    let completedSets = Infinity;

    for (const req of requiredItems) {
      const inCartQty = cartQtyByProductId.get(req.id) || 0;
      if (inCartQty < 1) {
        isComplete = false;
        completedSets = 0;
        break;
      }
      completedSets = Math.min(completedSets, inCartQty);
    }

    if (!isComplete || completedSets < promo.min_sets) continue;

    const singleSetPrice = requiredItems.reduce((sum, item) => sum + item.price, 0);
    const eligibleAmount = singleSetPrice * completedSets;

    let discountAmount = 0;
    if (promo.discount_type === "percentage") {
      discountAmount = (eligibleAmount * Number(promo.discount_value)) / 100;
      if (promo.max_discount_amount) {
        discountAmount = Math.min(discountAmount, Number(promo.max_discount_amount));
      }
    } else {
      discountAmount = Number(promo.discount_value) * completedSets;
      discountAmount = Math.min(discountAmount, eligibleAmount);
    }

    discountAmount = Math.round(discountAmount * 100) / 100;

    const colInfo = imgMap.get(Number(imgId));
    const colName = colInfo?.label || `Collection #${imgId}`;

    autoAppliedDiscounts.push({
      promotionId: promo.id,
      title: promo.title,
      promoScope: "set",
      triggerType: "auto",
      couponCode: null,
      collectionGroupId: imgId,
      collectionName: colName,
      completedSets,
      eligibleAmount,
      discountAmount,
      description: `ส่วนลดเซ็ต ${promo.discount_value}% (${completedSets} เซ็ต)`,
    });

    autoDiscountTotal += discountAmount;
  }

  // ── B. ประมวลผล Global Coupon Code (ถ้ามีการกรอกโค้ด) ───────────────────────────
  let couponAppliedDiscount: AppliedTerraPromotion | null = null;
  let couponDiscountTotal = 0;
  let couponStatus: TerraDiscountResult["couponStatus"] = null;
  const normalizedCouponCode = couponCode?.trim().toUpperCase() || null;

  if (normalizedCouponCode) {
    const matchedCoupon = couponPromos.find((p) => p.coupon_code?.trim().toUpperCase() === normalizedCouponCode);

    if (!matchedCoupon) {
      couponStatus = {
        isValid: false,
        message: `ไม่พบโค้ดส่วนลด "${normalizedCouponCode}" หรือโค้ดหมดอายุแล้ว`,
        code: normalizedCouponCode,
      };
    } else {
      const minSpend = Number(matchedCoupon.min_spend || 0);
      if (subtotal < minSpend) {
        couponStatus = {
          isValid: false,
          message: `ยอดสั่งซื้อขั้นต่ำสำหรับโค้ดนี้คือ ฿${minSpend.toLocaleString()} (ยอดปัจจุบัน ฿${subtotal.toLocaleString()})`,
          code: normalizedCouponCode,
        };
      } else {
        let discAmt = 0;
        if (matchedCoupon.discount_type === "percentage") {
          discAmt = (subtotal * Number(matchedCoupon.discount_value)) / 100;
          if (matchedCoupon.max_discount_amount) {
            discAmt = Math.min(discAmt, Number(matchedCoupon.max_discount_amount));
          }
        } else {
          discAmt = Number(matchedCoupon.discount_value);
          discAmt = Math.min(discAmt, subtotal);
        }

        discAmt = Math.round(discAmt * 100) / 100;

        couponAppliedDiscount = {
          promotionId: matchedCoupon.id,
          title: matchedCoupon.title,
          promoScope: "global",
          triggerType: "coupon",
          couponCode: matchedCoupon.coupon_code,
          collectionGroupId: null,
          collectionName: "ทั้งร้านค้า (Global)",
          eligibleAmount: subtotal,
          discountAmount: discAmt,
          description: matchedCoupon.discount_type === "percentage"
            ? `คูปองลด ${matchedCoupon.discount_value}%`
            : `คูปองลด ฿${Number(matchedCoupon.discount_value).toLocaleString()}`,
        };

        couponDiscountTotal = discAmt;
        couponStatus = {
          isValid: true,
          message: `ใช้โค้ดส่วนลด "${matchedCoupon.coupon_code}" สำเร็จ: ${couponAppliedDiscount.description}`,
          code: normalizedCouponCode,
        };
      }
    }
  }

  // ── C. กฎ Best Deal (Non-Stackable: เลือกโปรที่ดีที่สุดเพียงอย่างเดียว) ───────────
  let appliedPromotions: AppliedTerraPromotion[] = [];
  let totalDiscount = 0;
  let bestDealType: "auto" | "coupon" | "none" = "none";
  let bestDealNotice: string | null = null;

  if (couponDiscountTotal > autoDiscountTotal) {
    // คูปองลดได้มากกว่าโปรเซ็ต
    appliedPromotions = couponAppliedDiscount ? [couponAppliedDiscount] : [];
    totalDiscount = couponDiscountTotal;
    bestDealType = "coupon";
    if (autoDiscountTotal > 0 && normalizedCouponCode) {
      bestDealNotice = `โค้ดส่วนลด "${normalizedCouponCode}" มอบส่วนลดคุ้มกว่าโปรเซ็ต (ประหยัดเพิ่ม ฿${(couponDiscountTotal - autoDiscountTotal).toLocaleString()})`;
    }
  } else if (autoDiscountTotal > 0) {
    // โปรเซ็ตลดได้มากกว่าหรือเท่ากับคูปอง
    appliedPromotions = autoAppliedDiscounts;
    totalDiscount = autoDiscountTotal;
    bestDealType = "auto";
    if (couponAppliedDiscount && normalizedCouponCode) {
      bestDealNotice = `โปรโมชันเซ็ตอัตโนมัติคุ้มกว่าหรือเท่ากับคูปอง "${normalizedCouponCode}" (ระบบเลือกโปรที่คุ้มที่สุดให้คุณ)`;
    }
  } else if (couponDiscountTotal > 0) {
    appliedPromotions = couponAppliedDiscount ? [couponAppliedDiscount] : [];
    totalDiscount = couponDiscountTotal;
    bestDealType = "coupon";
  }

  totalDiscount = Math.min(subtotal, totalDiscount);
  const finalTotal = Math.max(0, subtotal - totalDiscount);

  return {
    appliedPromotions,
    cartSubtotal: subtotal,
    autoDiscountTotal,
    couponDiscountTotal,
    totalDiscount,
    finalTotal,
    bestDealType,
    bestDealNotice,
    couponStatus,
  };
}
