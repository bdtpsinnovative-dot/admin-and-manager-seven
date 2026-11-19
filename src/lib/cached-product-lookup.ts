import { unstable_cache } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { ADMIN_CACHE_TAGS, ADMIN_CACHE_TTL } from "@/lib/admin-cache";

export interface CachedProductLookup {
  id: number;
  name: string;
  sku: string | null;
  barcode?: string | null;
  image_url: string | null;
  price?: number | null;
  cost?: number | null;
  category_id?: string | null;
  collection_group_id?: string | null;
  specs?: any;
  collection_groups?: any;
}

export const PRODUCT_LOOKUP_FIELDS =
  "id, name, sku, barcode, image_url, price, cost, category_id, collection_group_id, specs, collection_groups(id, name, product_sup, tag)";

export const BUCKET_SIZE = 200;

function getCachedProductBucket(bucketIndex: number) {
  const fromId = bucketIndex * BUCKET_SIZE;
  const toId = fromId + BUCKET_SIZE - 1;

  const run = unstable_cache(
    async () => {
      const { data, error } = await supabaseAdmin
        .from("products")
        .select(PRODUCT_LOOKUP_FIELDS)
        .gte("id", fromId)
        .lte("id", toId);

      if (error) {
        console.error(`[getCachedProductBucket] error for bucket ${bucketIndex}:`, error);
        return [];
      }
      return (data || []) as unknown as CachedProductLookup[];
    },
    ["admin:product-bucket:v1", String(bucketIndex)],
    {
      revalidate: ADMIN_CACHE_TTL.MASTER_SECONDS,
      tags: [ADMIN_CACHE_TAGS.INVENTORY_META],
    }
  );

  return run();
}

/**
 * ⚡ ดึงข้อมูลสินค้าเฉพาะ ID ที่ระบุ โดยแคชแยกตาม Bucket ID ช่วงละ 200 รายการ
 * ช่วยให้คำสั่งคิวรี Order และ Dashboard ไม่ต้องทำ Heavy 4-Table SQL Join ซ้ำซ้อน
 * ข้อมูลแคชใช้ร่วมกันข้ามทุกหน้า (Dashboard, Sales History, etc.) และถูก Revalidate อัตโนมัติเมื่อแก้สินค้า
 */
export async function getCachedProductsMapByIds(
  productIds: (number | string)[]
): Promise<Map<string | number, CachedProductLookup>> {
  const result = new Map<string | number, CachedProductLookup>();
  const cleanIds = Array.from(
    new Set(
      productIds
        .map((id) => Number(id))
        .filter((n) => !isNaN(n) && n > 0)
    )
  );

  if (cleanIds.length === 0) return result;

  // รวบรวม bucket index ทั้งหมดที่เกี่ยวข้อง
  const bucketSet = new Set<number>();
  for (const id of cleanIds) {
    bucketSet.add(Math.floor(id / BUCKET_SIZE));
  }

  try {
    const bucketPromises = Array.from(bucketSet).map((bIdx) => getCachedProductBucket(bIdx));
    const allBuckets = await Promise.all(bucketPromises);
    for (const list of allBuckets) {
      for (const item of list) {
        result.set(item.id, item);
        result.set(String(item.id), item);
      }
    }
  } catch (err) {
    console.warn("[getCachedProductsMapByIds] cache error, fallback to direct query:", err);
    const { data } = await supabaseAdmin
      .from("products")
      .select(PRODUCT_LOOKUP_FIELDS)
      .in("id", cleanIds);
    for (const item of (data || [])) {
      const typed = item as unknown as CachedProductLookup;
      result.set(item.id, typed);
      result.set(String(item.id), typed);
    }
  }

  return result;
}
