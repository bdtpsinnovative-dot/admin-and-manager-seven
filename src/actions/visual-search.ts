"use server";

import { createClient } from "@/lib/supabase/server";
import sharp from "sharp";
import { AutoProcessor, CLIPVisionModelWithProjection, RawImage } from "@xenova/transformers";

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

// Singleton CLIP model instance in memory
let clipModel: any = null;
let clipProcessor: any = null;

async function getClipPipeline() {
  if (!clipModel || !clipProcessor) {
    clipModel = await CLIPVisionModelWithProjection.from_pretrained("Xenova/clip-vit-base-patch32");
    clipProcessor = await AutoProcessor.from_pretrained("Xenova/clip-vit-base-patch32");
  }
  return { model: clipModel, processor: clipProcessor };
}

/**
 * ค้นหาสินค้า Prop ด้วยภาพถ่ายจริง (CLIP Vision Model + pgvector Cosine Distance)
 *
 * Flow:
 *   - ถ้าผู้ใช้ลากกรอบ Crop: ตัดเฉพาะบริเวณที่เลือก + Letterbox Pad ให้รักษาสัดส่วนแจกัน/ชาม
 *   - ถ้าผู้ใช้กดค้นหาทั้งรูป: ใช้ภาพเต็ม + Letterbox Pad
 *   - แปลงเป็น Vector 512 มิติ -> ค้นหาใน Supabase pgvector ได้ผลลัพธ์ 16 อันดับแรก
 */
export async function searchProductsByVisualCrop(
  imageUrl: string,
  cropBox?: CropBoxNormalized,
  categoryContext?: string
): Promise<{
  results: VisualSearchResult[];
  vectorReady: boolean;
  embeddedCount?: number;
  totalCount?: number;
  aiAnalysis?: {
    type: string;
    color: string;
    material: string;
    shape: string;
    keywords: string[];
  };
}> {
  const supabase = await createClient();

  // === STEP 1: Download & Process Image with Aspect-Ratio Padding ===
  let queryBuffer: Buffer;
  try {
    const imgRes = await fetch(imageUrl, { signal: AbortSignal.timeout(12000) });
    if (!imgRes.ok) throw new Error(`HTTP ${imgRes.status}`);
    const arrayBuffer = await imgRes.arrayBuffer();
    const sourceBuffer = Buffer.from(arrayBuffer);

    const meta = await sharp(sourceBuffer).metadata();
    const imgW = meta.width || 800;
    const imgH = meta.height || 800;

    if (cropBox && cropBox.widthPercent > 0.03 && cropBox.heightPercent > 0.03) {
      // ผู้ใช้ลากกรอบ Crop เจาะจงชิ้น
      const left = Math.max(0, Math.round(cropBox.xPercent * imgW));
      const top = Math.max(0, Math.round(cropBox.yPercent * imgH));
      const width = Math.max(10, Math.min(imgW - left, Math.round(cropBox.widthPercent * imgW)));
      const height = Math.max(10, Math.min(imgH - top, Math.round(cropBox.heightPercent * imgH)));

      const extracted = await sharp(sourceBuffer).extract({ left, top, width, height }).toBuffer();
      const maxDim = Math.max(width, height);
      queryBuffer = await sharp(extracted)
        .resize(maxDim, maxDim, { fit: "contain", background: { r: 245, g: 243, b: 238, alpha: 1 } })
        .jpeg({ quality: 92 })
        .toBuffer();
    } else {
      // ผู้ใช้กดค้นหาทั้งรูปภาพ
      const maxDim = Math.max(imgW, imgH);
      queryBuffer = await sharp(sourceBuffer)
        .resize(maxDim, maxDim, { fit: "contain", background: { r: 245, g: 243, b: 238, alpha: 1 } })
        .jpeg({ quality: 92 })
        .toBuffer();
    }
  } catch (err: any) {
    throw new Error(`ไม่สามารถประมวลผลรูปภาพได้: ${err.message}`);
  }

  // === STEP 2: CLIP Vector Embedding (512-dim) ===
  const { model, processor } = await getClipPipeline();
  const rawImage = await RawImage.fromBlob(new Blob([new Uint8Array(queryBuffer)], { type: "image/jpeg" }));
  const inputs = await processor(rawImage);
  const { image_embeds } = await model(inputs);
  const queryEmbedding = Array.from(image_embeds.data);

  // === STEP 3: pgvector Cosine Search in Supabase (Top 16) ===
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

  // === STEP 4: Sibling Group Expansion (ดึงสินค้าในเซ็ตเดียวกันมาเติมเต็มถ้ามีที่ว่าง) ===
  if (results.length > 0 && topGroupIds.size > 0 && results.length < 16) {
    const existingIds = new Set(results.map(r => r.id));
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
