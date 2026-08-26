/**
 * ⚡ Ultra-Fast Local CLIP Batch Embedding Script (0% API Quota, 0% Rate Limit)
 * Uses Xenova/clip-vit-base-patch32 (OpenAI CLIP ViT-B/32)
 */

import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { AutoProcessor, CLIPVisionModelWithProjection, RawImage } from "@xenova/transformers";

// ── Load .env.local ──────────────────────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, "../.env.local");
const env = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => {
      const idx = l.indexOf("=");
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
    })
);

const SUPABASE_URL = env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("❌ Missing Supabase variables in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const CONCURRENCY = 4; // Process 4 images concurrently

// ── Main Execution Loop ───────────────────────────────────────────────────────
async function main() {
  console.log("\n🚀 Initializing Local CLIP Vision Model (OpenAI ViT-B/32)...");
  console.log("─".repeat(60));

  const t0 = Date.now();
  const model = await CLIPVisionModelWithProjection.from_pretrained("Xenova/clip-vit-base-patch32");
  const processor = await AutoProcessor.from_pretrained("Xenova/clip-vit-base-patch32");
  console.log(`✅ CLIP Model loaded in ${((Date.now() - t0) / 1000).toFixed(2)}s`);

  // Count total & pending
  const { count: total } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("category_id", "prop")
    .not("image_url", "is", null);

  const { count: alreadyDone } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("category_id", "prop")
    .not("image_embedding", "is", null);

  const pending = (total || 0) - (alreadyDone || 0);
  console.log(`📦 สินค้า Prop ทั้งหมด: ${total}`);
  console.log(`✅ Embed แล้ว: ${alreadyDone}`);
  console.log(`⏳ รอ Embed: ${pending}`);

  if (pending === 0) {
    console.log("\n🎉 ทุกชิ้น Embed ครบทั้งหมด 100% แล้ว!");
    return;
  }

  console.log(`⚡ กำลังประมวลผลความเร็วสูง (Concurrency: ${CONCURRENCY})...`);
  console.log("─".repeat(60));

  let totalSucceeded = alreadyDone || 0;
  let totalFailed = 0;
  const startTime = Date.now();

  async function processOneProduct(product) {
    try {
      const image = await RawImage.read(product.image_url);
      const inputs = await processor(image);
      const { image_embeds } = await model(inputs);
      const vector = Array.from(image_embeds.data);

      const { error: updateErr } = await supabase
        .from("products")
        .update({
          image_embedding: vector,
          embedding_generated_at: new Date().toISOString(),
        })
        .eq("id", product.id);

      if (updateErr) throw new Error(updateErr.message);

      totalSucceeded++;
      const pct = Math.round((totalSucceeded / total) * 100);
      const elapsedSec = (Date.now() - startTime) / 1000;
      const speed = (totalSucceeded - (alreadyDone || 0)) / (elapsedSec || 1);
      const remainingSec = Math.round(((total - totalSucceeded) / (speed || 1)));

      process.stdout.write(
        `\r⚡ [${pct}%] ${totalSucceeded}/${total} | ความเร็ว: ${speed.toFixed(1)} ชิ้น/วิ | เหลืออีก ~${Math.ceil(remainingSec / 60)} นาที | ล่าสุด: ${product.sku || product.id}       `
      );
    } catch (err) {
      totalFailed++;
      // console.log(`\n⚠️ Failed ${product.sku}: ${err.message}`);
    }
  }

  while (true) {
    const { data: products, error } = await supabase
      .from("products")
      .select("id, name, sku, image_url")
      .eq("category_id", "prop")
      .not("image_url", "is", null)
      .is("image_embedding", null)
      .order("id", { ascending: true })
      .limit(40);

    if (error) {
      console.error("❌ Supabase fetch error:", error.message);
      break;
    }

    if (!products || products.length === 0) {
      console.log("\n\n🎉 ทุกชิ้น Embed เสร็จสิ้น 100% แล้ว!");
      break;
    }

    // Process chunk with concurrency
    for (let i = 0; i < products.length; i += CONCURRENCY) {
      const chunk = products.slice(i, i + CONCURRENCY);
      await Promise.all(chunk.map((p) => processOneProduct(p)));
    }
  }

  const totalTimeSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log("\n\n" + "─".repeat(60));
  console.log(`🏁 เสร็จสิ้นในเวลา ${totalTimeSec} วินาที!`);
  console.log(`   ✅ สำเร็จ: ${totalSucceeded}/${total}`);
  console.log(`   ❌ ล้มเหลว: ${totalFailed}`);
  console.log(`   🔍 Visual Search (CLIP 512-dim) พร้อมใช้งาน 100%`);
}

main().catch(console.error);
