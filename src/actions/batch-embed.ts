"use server";

import { createClient } from "@/lib/supabase/server";

// ========================================================
// Gemini Helpers
// ========================================================

async function describeProductImage(imageUrl: string, apiKey: string): Promise<string | null> {
  try {
    // Download image
    const imgRes = await fetch(imageUrl, { signal: AbortSignal.timeout(10000) });
    if (!imgRes.ok) return null;
    const buf = await imgRes.arrayBuffer();
    const base64 = Buffer.from(buf).toString("base64");

    // Detect mime type from URL
    const mime = imageUrl.includes(".png") ? "image/png" : "image/jpeg";

    // Ask Gemini Flash to describe the product image in detail
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                text: `Describe this home decor / prop product image for visual search indexing. Be specific about:
- Product type (vase, figure, sculpture, bowl, candle holder, plate, etc.)
- Exact color and finish (matte white, glossy black, amber translucent, terracotta unglazed, etc.)  
- Material (ceramic, glass, wood, metal, stone, etc.)
- Shape and silhouette (tall slender, wide squat, cylindrical, conical, spherical, geometric, organic)
- Neck/opening detail (narrow bottle neck, wide open mouth, flared rim, no neck, etc.)
- Surface texture (smooth, ribbed, fluted, hammered, hand-painted, woven, crackle glaze, etc.)
- Size proportion (tall narrow / medium balanced / short wide)
- Any distinctive features (two-tone color, gold accent, geometric cut, asymmetric, stacked rings, etc.)
- Number of pieces shown (single / set of 2 / set of 3 or more)

Write a single descriptive paragraph. Be precise and specific.`
              },
              { inline_data: { mime_type: mime, data: base64 } },
            ]
          }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 300 },
        }),
      }
    );

    const json = await res.json();
    return json.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch {
    return null;
  }
}

async function embedText(text: string, apiKey: string): Promise<number[] | null> {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "models/gemini-embedding-001",
          content: { parts: [{ text }] },
          taskType: "RETRIEVAL_DOCUMENT",
          outputDimensionality: 768,
        }),
      }
    );
    const json = await res.json();
    return json.embedding?.values || null;
  } catch {
    return null;
  }
}

// ========================================================
// Public Server Actions
// ========================================================

export type BatchEmbedProgress = {
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
  total: number;
  isComplete: boolean;
  error?: string;
};

/**
 * ประมวลผล Embedding ให้สินค้า Prop ที่ยังไม่มี Embedding
 * เรียกซ้ำได้จนกว่าจะครบ (isComplete = true)
 */
export async function batchEmbedPropProducts(
  batchSize: number = 20,
  offset: number = 0
): Promise<BatchEmbedProgress> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { processed: 0, succeeded: 0, failed: 0, skipped: 0, total: 0, isComplete: false, error: "ไม่พบ GEMINI_API_KEY" };
  }

  const supabase = await createClient();

  // นับจำนวนสินค้าที่ยังไม่มี Embedding ทั้งหมด
  const { count: totalPending } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("category_id", "prop")
    .not("image_url", "is", null)
    .is("image_embedding", null);

  const total = totalPending || 0;

  if (total === 0) {
    return { processed: 0, succeeded: 0, failed: 0, skipped: 0, total: 0, isComplete: true };
  }

  // ดึง batch ถัดไปที่ยังไม่มี Embedding
  const { data: products, error: fetchError } = await supabase
    .from("products")
    .select("id, name, sku, image_url")
    .eq("category_id", "prop")
    .not("image_url", "is", null)
    .is("image_embedding", null)
    .order("id", { ascending: true })
    .range(offset, offset + batchSize - 1);

  if (fetchError || !products || products.length === 0) {
    return { processed: 0, succeeded: 0, failed: 0, skipped: 0, total, isComplete: total === 0 };
  }

  let succeeded = 0;
  let failed = 0;
  let skipped = 0;

  // ประมวลผลทีละชิ้น (sequential เพื่อหลีกเลี่ยง rate limit)
  for (const product of products) {
    if (!product.image_url) {
      skipped++;
      continue;
    }

    try {
      // Step 1: Describe the image
      const description = await describeProductImage(product.image_url, apiKey);
      if (!description) {
        console.warn(`[embed] No description for product ${product.sku}`);
        failed++;
        continue;
      }

      // Add product metadata to improve embedding quality
      const fullText = `Product: ${product.name || product.sku}. Description: ${description}`;

      // Step 2: Embed the description text
      const embedding = await embedText(fullText, apiKey);
      if (!embedding || embedding.length !== 768) {
        console.warn(`[embed] No embedding for product ${product.sku}`);
        failed++;
        continue;
      }

      // Step 3: Save to Supabase
      const { error: updateError } = await supabase
        .from("products")
        .update({
          image_embedding: embedding as any,
          image_description: description,
          embedding_generated_at: new Date().toISOString(),
        })
        .eq("id", product.id);

      if (updateError) {
        console.error(`[embed] Failed to save embedding for ${product.sku}:`, updateError.message);
        failed++;
      } else {
        succeeded++;
      }

      // Small delay to respect Gemini rate limits (free tier: 15 RPM)
      await new Promise(r => setTimeout(r, 400));

    } catch (err: any) {
      console.error(`[embed] Error processing ${product.sku}:`, err.message);
      failed++;
    }
  }

  const processed = succeeded + failed + skipped;
  const newTotal = total - succeeded; // remaining after this batch
  const isComplete = newTotal <= 0;

  return { processed, succeeded, failed, skipped, total, isComplete };
}

/**
 * ดูสถิติ Embedding ปัจจุบัน
 */
export async function getEmbeddingStats(): Promise<{
  total: number;
  embedded: number;
  pending: number;
  pctDone: number;
}> {
  const supabase = await createClient();

  const { count: total } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("category_id", "prop")
    .not("image_url", "is", null);

  const { count: embedded } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("category_id", "prop")
    .not("image_embedding", "is", null);

  const t = total || 0;
  const e = embedded || 0;

  return {
    total: t,
    embedded: e,
    pending: t - e,
    pctDone: t > 0 ? Math.round((e / t) * 100) : 0,
  };
}
