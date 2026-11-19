"use server";

import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { revalidatePath, unstable_cache } from "next/cache";
import { ADMIN_CACHE_TAGS, ADMIN_CACHE_TTL, invalidateAdminTags } from "@/lib/admin-cache";

export async function addProp(formData: FormData) {
  const supabase = await createClient();
  try {
    const itemNo = formData.get("item_no") as string;
    const codeSku = formData.get("code_sku") as string;
    const color = formData.get("color") as string;
    const imageUrl = (formData.get("image_url") as string)?.trim() || null;

    const width_cm = formData.get("width_cm");
    const length_cm = formData.get("length_cm");
    const thickness_cm = formData.get("thickness_cm");

    const specsData = {
      width_cm: width_cm ? Number(width_cm) : null,
      length_cm: length_cm ? Number(length_cm) : null,
      thickness_cm: thickness_cm ? Number(thickness_cm) : null,
    };

    const { error } = await supabase.from("products").insert({
      name: `Prop - ${itemNo}`,
      sku: itemNo,
      barcode: codeSku,
      color: color,
      category_id: "prop",
      image_url: imageUrl,
      specs: specsData,
      status: "active",
    });

    if (error) throw new Error(error.message);

    invalidateAdminTags(ADMIN_CACHE_TAGS.INVENTORY_META, ADMIN_CACHE_TAGS.FILTERS);
    revalidatePath("/props");
    revalidatePath("/propsfina");
    revalidatePath("/propsfinatest");
    revalidatePath("/propsfinatest2");
    revalidatePath("/props2");
    return { success: true };

  } catch (error: any) {
    throw new Error(error.message || "เกิดข้อผิดพลาดในการบันทึก");
  }
}

// ⚡ 1-Year Cached Props List (Auto-cleared on mutations/SKU edits)
export async function getAllProps(categoryId: string = "prop") {
  const run = unstable_cache(
    async () => {
      const productMap = new Map<number, any>();
      let page = 0;
      const limit = 1000;
      let hasMore = true;

      while (hasMore) {
        const from = page * limit;
        const to = from + limit - 1;

        let query = supabaseAdmin
          .from("products")
          .select("*")
          .order("id", { ascending: false })
          .range(from, to);

        if (categoryId && categoryId !== "ALL") {
          query = query.eq("category_id", categoryId);
        }

        const { data, error } = await query;

        if (error) {
          console.error("Error fetching props in cache:", error);
          break;
        }

        if (data && data.length > 0) {
          for (const item of data) {
            if (item && item.id != null) {
              productMap.set(item.id, item);
            }
          }
          if (data.length < limit) {
            hasMore = false;
          } else {
            page++;
          }
        } else {
          hasMore = false;
        }
      }

      return Array.from(productMap.values());
    },
    ['admin:all-props:v1', categoryId],
    {
      revalidate: ADMIN_CACHE_TTL.MASTER_SECONDS,
      tags: [ADMIN_CACHE_TAGS.INVENTORY_META, `admin:props:${categoryId}`],
    }
  );

  try {
    return await run();
  } catch (err) {
    console.warn('[getAllProps] cache error, fallback to direct query:', err);
    const { data } = await supabaseAdmin
      .from("products")
      .select("*")
      .eq("category_id", categoryId)
      .order("id", { ascending: false });
    return data || [];
  }
}

export async function updatePropImageUrl(id: number, imageUrl: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("products")
    .update({ image_url: imageUrl })
    .eq("id", id);

  if (error) throw new Error(error.message);

  invalidateAdminTags(ADMIN_CACHE_TAGS.INVENTORY_META);
  revalidatePath("/props");
  revalidatePath("/propsfina");
  revalidatePath("/propsfinatest");
  revalidatePath("/propsfinatest2");
  revalidatePath("/props2");
  return { success: true };
}

// ── Lightweight Select Fields to Avoid Vector/Heavy Payloads ──
const PROPS_SELECT_FIELDS =
  "id, name, sku, color, barcode, price, category_id, image_url, status, specs, length_cm, width_cm, thickness_cm";

// ── Fast Parallel Category Summary Counts (Cached with auto-purge) ──
export async function getCategorySummaryCounts() {
  const run = unstable_cache(
    async () => {
      const categories = ["prop", "furniture", "SLABS", "rough_wood"];
      const counts: Record<string, number> = { ALL: 0, prop: 0, furniture: 0, SLABS: 0, rough_wood: 0 };

      try {
        const results = await Promise.all(
          categories.map(async (c) => {
            const { count } = await supabaseAdmin
              .from("products")
              .select("id", { count: "exact", head: true })
              .eq("category_id", c);
            return { category: c, count: count || 0 };
          })
        );

        let total = 0;
        results.forEach((r) => {
          counts[r.category] = r.count;
          total += r.count;
        });
        counts.ALL = total;
      } catch (err) {
        console.error("Error in getCategorySummaryCounts:", err);
      }

      return counts;
    },
    ['admin:category-summary-counts:v1'],
    {
      revalidate: ADMIN_CACHE_TTL.MASTER_SECONDS,
      tags: [ADMIN_CACHE_TAGS.INVENTORY_META],
    }
  );

  try {
    return await run();
  } catch (err) {
    console.warn('[getCategorySummaryCounts] cache error, fallback to direct:', err);
    return { ALL: 0, prop: 0, furniture: 0, SLABS: 0, rough_wood: 0 };
  }
}

// ── Fast Paginated Batch Loading for Props/Inventory (Cached with auto-purge) ──
export async function getPropsBatch({
  category = "prop",
  offset = 0,
  limit = 100,
  search = "",
}: {
  category?: string;
  offset?: number;
  limit?: number;
  search?: string;
}) {
  const q = search.trim().toLowerCase();
  const cacheKey = `${category}_${offset}_${limit}_${q}`;

  const run = unstable_cache(
    async () => {
      let query = supabaseAdmin
        .from("products")
        .select(PROPS_SELECT_FIELDS, { count: "exact" })
        .order("id", { ascending: false });

      if (category && category !== "ALL") {
        query = query.eq("category_id", category);
      }

      if (q) {
        query = query.or(`name.ilike.%${q}%,sku.ilike.%${q}%,barcode.ilike.%${q}%,color.ilike.%${q}%`);
      }

      const { data, count, error } = await query.range(offset, offset + limit - 1);

      if (error) {
        console.error("Error fetching props batch in cache:", error);
        return { products: [], totalCount: 0, hasMore: false };
      }

      const products = data || [];
      const totalCount = count || 0;
      const hasMore = offset + products.length < totalCount;

      return { products, totalCount, hasMore };
    },
    ['admin:props-batch:v1', cacheKey],
    {
      revalidate: ADMIN_CACHE_TTL.MASTER_SECONDS,
      tags: [ADMIN_CACHE_TAGS.INVENTORY_META],
    }
  );

  try {
    return await run();
  } catch (err) {
    console.warn('[getPropsBatch] cache error, fallback to direct query:', err);
    const { data, count } = await supabaseAdmin
      .from("products")
      .select(PROPS_SELECT_FIELDS, { count: "exact" })
      .eq("category_id", category)
      .range(offset, offset + limit - 1);
    return { products: data || [], totalCount: count || 0, hasMore: false };
  }
}

// ── Fast Server-Side SKU Lookup for Google Sheets Importer ──
export async function getPropsBySkus(skusOrCodes: string[]) {
  const supabase = await createClient();
  const cleanList = Array.from(
    new Set(skusOrCodes.map((s) => s.trim()).filter((s) => s.length > 0))
  );

  if (cleanList.length === 0) return [];

  const chunkSize = 80;
  const foundMap = new Map<number, any>();

  for (let i = 0; i < cleanList.length; i += chunkSize) {
    const chunk = cleanList.slice(i, i + chunkSize);
    const inFilter = chunk.map((c) => `"${c.replace(/"/g, '""')}"`).join(",");

    const { data, error } = await supabase
      .from("products")
      .select(PROPS_SELECT_FIELDS)
      .or(`sku.in.(${inFilter}),barcode.in.(${inFilter})`);

    if (error) {
      console.error("Error fetching props by SKUs chunk:", error);
      continue;
    }

    if (data) {
      data.forEach((p) => foundMap.set(p.id, p));
    }
  }

  return Array.from(foundMap.values());
}

// ── Fetch active discounts for discount badges and price calculations (Cached) ──
export async function getActiveDiscounts() {
  const run = unstable_cache(
    async () => {
      let { data, error } = await supabaseAdmin
        .from("discounts")
        .select(`
          id, name, code, discount_type, value, active, max_discount, start_date, end_date,
          discount_rules ( id, product_id, branch_id )
        `)
        .eq("active", true);

      if (error && (error.code === "42703" || error.message?.includes("max_discount"))) {
        const fallback = await supabaseAdmin
          .from("discounts")
          .select(`
            id, name, code, discount_type, value, active, start_date, end_date,
            discount_rules ( id, product_id, branch_id )
          `)
          .eq("active", true);
        data = (fallback.data?.map((d: any) => ({ ...d, max_discount: null })) ?? null) as typeof data;
        error = fallback.error;
      }

      if (error) {
        console.error("Error fetching active discounts in cache:", error);
        return [];
      }
      return data || [];
    },
    ['admin:props-active-discounts:v1'],
    {
      revalidate: ADMIN_CACHE_TTL.MASTER_SECONDS,
      tags: [ADMIN_CACHE_TAGS.PROMOTIONS],
    }
  );

  try {
    return await run();
  } catch (err) {
    console.warn('[getActiveDiscounts] cache error, fallback to direct:', err);
    return [];
  }
}
