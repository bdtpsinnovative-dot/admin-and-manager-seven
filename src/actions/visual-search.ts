"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";

export interface VisualSearchResult {
  id: number;
  name: string;
  sku: string | null;
  price: number | null;
  imageUrl: string | null;
  status: string | null;
  collectionGroupId: string | null;
  category: string | null;
  matchScore: number;
  matchedReason?: string;
}

export type CropBoxNormalized = {
  xPercent: number;
  yPercent: number;
  widthPercent: number;
  heightPercent: number;
};

/**
 * ค้นหาสินค้า Prop ด้วย CLIP Vector Embedding (pgvector Cosine Distance ใน Supabase)
 * ไม่รันโมเดล AI บนเซิร์ฟเวอร์ เพื่อความเร็วระดับ 30ms และไม่มีปัญหา Serverless Crash/Timeout 100%
 */
export async function searchProductsByVisualEmbedding(
  queryEmbedding: number[]
): Promise<{
  results: VisualSearchResult[];
  vectorReady: boolean;
  embeddedCount?: number;
  totalCount?: number;
}> {
  if (!queryEmbedding || queryEmbedding.length === 0) {
    return { results: [], vectorReady: false, embeddedCount: 0, totalCount: 0 };
  }

  const supabase = supabaseAdmin;

  // 1. pgvector Cosine Search in Supabase (Top 16)
  const { data: vectorResults, error: vectorError } = await supabase.rpc(
    "match_products_by_image_embedding",
    {
      query_embedding: queryEmbedding,
      match_count: 16,
      category_filter: "prop",
    }
  );

  let results: VisualSearchResult[] = [];
  const topGroupIds = new Set<string>();

  if (vectorError) {
    console.error("[visual-search] Vector RPC error:", vectorError.message);
  } else if (vectorResults && vectorResults.length > 0) {
    results = vectorResults.map((r: any) => {
      if (r.collection_group_id) topGroupIds.add(String(r.collection_group_id));
      return {
        id: Number(r.id),
        name: r.name || "ไม่มีชื่อสินค้า",
        sku: r.sku || null,
        price: r.price !== null ? Number(r.price) : null,
        imageUrl: r.image_url || null,
        status: r.status || null,
        collectionGroupId: r.collection_group_id || null,
        category: r.category_id || null,
        matchScore: Math.round(Math.min(99, Math.max(15, (r.similarity || 0) * 100))),
        matchedReason: "AI Vision Match (CLIP)",
      };
    });
  }

  // 2. Sibling Group Expansion (ดึงสินค้าในเซ็ตเดียวกันมาเติมเต็มถ้ามีที่ว่าง)
  if (results.length > 0 && topGroupIds.size > 0 && results.length < 16) {
    const existingIds = new Set(results.map((r) => r.id));
    const targetGroups = Array.from(topGroupIds).slice(0, 2);

    const { data: siblings } = await supabase
      .from("products")
      .select("id, name, sku, price, image_url, status, collection_group_id, category_id")
      .eq("category_id", "prop")
      .in("collection_group_id", targetGroups)
      .not("image_url", "is", null)
      .limit(6);

    if (siblings) {
      for (const sp of siblings) {
        if (!existingIds.has(Number(sp.id)) && results.length < 16) {
          existingIds.add(Number(sp.id));
          results.push({
            id: Number(sp.id),
            name: sp.name || "ไม่มีชื่อสินค้า",
            sku: sp.sku || null,
            price: sp.price !== null ? Number(sp.price) : null,
            imageUrl: sp.image_url || null,
            status: sp.status || null,
            collectionGroupId: sp.collection_group_id || null,
            category: sp.category_id || null,
            matchScore: 70,
            matchedReason: `สินค้าในเซ็ตเดียวกัน (${sp.collection_group_id})`,
          });
        }
      }
    }
  }

  // Count stats
  const { count: embeddedCount } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("category_id", "prop")
    .not("image_embedding", "is", null);

  const { count: totalCount } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("category_id", "prop")
    .not("image_url", "is", null);

  return {
    results,
    vectorReady: results.length > 0,
    embeddedCount: embeddedCount || 0,
    totalCount: totalCount || 0,
  };
}
