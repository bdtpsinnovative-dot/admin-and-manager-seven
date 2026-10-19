//src/actions/props.ts

"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

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

    revalidatePath("/props");
    revalidatePath("/propsfina");
    return { success: true };

  } catch (error: any) {
    throw new Error(error.message || "เกิดข้อผิดพลาดในการบันทึก");
  }
}

export async function getAllProps(categoryId?: string) {
  const supabase = await createClient();
  const productMap = new Map<number, any>();
  let page = 0;
  const limit = 1000;
  let hasMore = true;

  while (hasMore) {
    const from = page * limit;
    const to = from + limit - 1;

    let query = supabase
      .from("products")
      .select("*")
      .order("id", { ascending: false })
      .range(from, to);

    if (categoryId && categoryId !== "ALL") {
      query = query.eq("category_id", categoryId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching props:", error);
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
}

export async function updatePropImageUrl(id: number, imageUrl: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("products")
    .update({ image_url: imageUrl })
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/props");
  revalidatePath("/propsfina");
  return { success: true };
}

// ── Lightweight Select Fields to Avoid Vector/Heavy Payloads ──
export const PROPS_SELECT_FIELDS =
  "id, name, sku, color, barcode, price, category_id, image_url, status, specs, length_cm, width_cm, thickness_cm";

// ── Fast Parallel Category Summary Counts (head: true) ──
export async function getCategorySummaryCounts() {
  const supabase = await createClient();
  const categories = ["prop", "furniture", "SLABS", "rough_wood"];
  const counts: Record<string, number> = { ALL: 0, prop: 0, furniture: 0, SLABS: 0, rough_wood: 0 };

  try {
    const results = await Promise.all(
      categories.map(async (c) => {
        const { count } = await supabase
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
}

// ── Fast Paginated Batch Loading for Props/Inventory ──
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
  const supabase = await createClient();

  let query = supabase
    .from("products")
    .select(PROPS_SELECT_FIELDS, { count: "exact" })
    .order("id", { ascending: false });

  if (category && category !== "ALL") {
    query = query.eq("category_id", category);
  }

  if (search && search.trim()) {
    const q = search.trim();
    query = query.or(`name.ilike.%${q}%,sku.ilike.%${q}%,barcode.ilike.%${q}%,color.ilike.%${q}%`);
  }

  const { data, count, error } = await query.range(offset, offset + limit - 1);

  if (error) {
    console.error("Error fetching props batch:", error);
    return { products: [], totalCount: 0, hasMore: false };
  }

  const products = data || [];
  const totalCount = count || 0;
  const hasMore = offset + products.length < totalCount;

  return { products, totalCount, hasMore };
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

