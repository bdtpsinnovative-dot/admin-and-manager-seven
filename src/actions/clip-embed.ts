"use server";

import { createClient } from "@/lib/supabase/server";

// Global singleton cache for CLIP model across Next.js HMR reloads
const globalForClip = globalThis as unknown as {
  cachedClipModel?: any;
  cachedClipProcessor?: any;
  clipModelPromise?: Promise<[any, any]> | null;
};

async function getClipModel() {
  if (globalForClip.cachedClipModel && globalForClip.cachedClipProcessor) {
    return [globalForClip.cachedClipModel, globalForClip.cachedClipProcessor];
  }

  if (globalForClip.clipModelPromise) {
    return globalForClip.clipModelPromise;
  }

  globalForClip.clipModelPromise = (async () => {
    // Keep the native ONNX dependency out of routes that do not use AI search.
    const { AutoProcessor, CLIPVisionModelWithProjection } = await import("@xenova/transformers");
    const model = await CLIPVisionModelWithProjection.from_pretrained("Xenova/clip-vit-base-patch32");
    const processor = await AutoProcessor.from_pretrained("Xenova/clip-vit-base-patch32");
    globalForClip.cachedClipModel = model;
    globalForClip.cachedClipProcessor = processor;
    return [model, processor];
  })();

  return globalForClip.clipModelPromise;
}

export type ClipEmbedResult = {
  total: number;
  succeeded: number;
  failed: number;
  failedItems: Array<{ sku: string; error: string }>;
  success: boolean;
};

/**
 * ⚡ สร้าง CLIP Vector (512-dim) ให้กับรายการ SKU ที่ส่งเข้ามา (หลัง Import Excel)
 * พร้อม Fallback: หากรูปภาพบางรายการโหลดไม่ขึ้น จะไม่ทำให้ระบบล่ม และบันทึกสินค้าตัวอื่นต่อจนเสร็จ
 */
export async function embedProductsBySkus(skus: string[]): Promise<ClipEmbedResult> {
  if (!skus || skus.length === 0) {
    return { total: 0, succeeded: 0, failed: 0, failedItems: [], success: true };
  }

  const supabase = await createClient();
  const products: any[] = [];

  // 1. Chunking SKUs in batches of 50 to prevent PostgREST URL length overflow
  const SKU_CHUNK_SIZE = 50;
  for (let i = 0; i < skus.length; i += SKU_CHUNK_SIZE) {
    const chunkSkus = skus.slice(i, i + SKU_CHUNK_SIZE);
    const { data: chunkProducts, error } = await supabase
      .from("products")
      .select("id, sku, name, image_url")
      .in("sku", chunkSkus)
      .not("image_url", "is", null);

    if (!error && chunkProducts) {
      products.push(...chunkProducts);
    }
  }

  if (products.length === 0) {
    return { total: 0, succeeded: 0, failed: 0, failedItems: [], success: true };
  }

  const [model, processor] = await getClipModel();
  const { RawImage } = await import("@xenova/transformers");
  const failedItems: Array<{ sku: string; error: string }> = [];
  let succeeded = 0;

  // ประมวลผลแบบ Concurrency ทีละ 4 ชิ้นเพื่อความรวดเร็วและประหยัดแรม
  const CONCURRENCY = 4;

  async function processOne(product: any) {
    const imageUrl = product.image_url?.trim();
    if (!imageUrl || (!imageUrl.startsWith("http://") && !imageUrl.startsWith("https://"))) {
      failedItems.push({ sku: product.sku || `ID-${product.id}`, error: "URL รูปภาพไม่ถูกต้อง" });
      return;
    }

    try {
      // 1. โหลดรูปภาพพร้อม Timeout 6 วินาที (ป้องกัน URL ค้างหรือ Server ปลายทางไม่ตอบสนอง)
      const res = await fetch(imageUrl, {
        signal: AbortSignal.timeout(6000),
      });

      if (!res.ok) {
        throw new Error(`โหลดรูปภาพไม่สำเร็จ (HTTP ${res.status})`);
      }

      const buffer = Buffer.from(await res.arrayBuffer());
      const contentType = res.headers.get("content-type") || "image/jpeg";
      const blob = new Blob([buffer], { type: contentType });
      const image = await RawImage.fromBlob(blob);
      
      // 2. แปลงรูปเป็น 512-dim Vector
      const inputs = await processor(image);
      const { image_embeds } = await model(inputs);
      const vector = Array.from(image_embeds.data);

      // 3. บันทึกลง Supabase
      const { error: updateErr } = await supabase
        .from("products")
        .update({
          image_embedding: vector as any,
          embedding_generated_at: new Date().toISOString(),
        })
        .eq("id", product.id);

      if (updateErr) {
        throw new Error(updateErr.message);
      }

      succeeded++;
    } catch (err: any) {
      console.warn(`[CLIP Embed Fallback] Error on SKU ${product.sku}:`, err.message);
      failedItems.push({
        sku: product.sku || `ID-${product.id}`,
        error: err.message || "ไม่สามารถโหลดรูปภาพหรือประมวลผลได้",
      });
    }
  }

  for (let i = 0; i < products.length; i += CONCURRENCY) {
    const chunk = products.slice(i, i + CONCURRENCY);
    await Promise.all(chunk.map((p) => processOne(p)));
  }

  return {
    total: products.length,
    succeeded,
    failed: failedItems.length,
    failedItems,
    success: failedItems.length === 0,
  };
}
