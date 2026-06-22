"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// 1. ดึงข้อมูลมากางให้ดูว่ากลุ่มไหนมีรูป/ไม่มีรูป (ไม่ต้องค้นหา)
export async function getCategoryOverview() {
  const cookieStore = await cookies();
  const supabase = createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} },
  });

  // ดึงมาแค่ชื่อกลุ่ม กับ รูปภาพ
  const { data, error } = await supabase.from("collection_groups").select("product_sup, image_url");
  if (error) throw new Error(error.message);

  // จัดกลุ่มให้ดูง่ายๆ ว่าแต่ละ product_sup มีกี่ชิ้น และมีรูปหรือยัง
  const groups: Record<string, { productSup: string, currentImage: string | null, itemCount: number }> = {};
  
  data.forEach((row) => {
    const sup = row.product_sup;
    if (!sup) return;
    
    if (!groups[sup]) {
      groups[sup] = { productSup: sup, currentImage: row.image_url, itemCount: 0 };
    }
    // ถ้ากลุ่มนี้มีรูปภาพโผล่มาแม้แต่ชิ้นเดียว ให้ถือว่ามีรูปปกแล้ว
    if (row.image_url && !groups[sup].currentImage) {
      groups[sup].currentImage = row.image_url;
    }
    groups[sup].itemCount += 1;
  });

  return Object.values(groups).sort((a, b) => a.productSup.localeCompare(b.productSup));
}

// 2. ฟังก์ชันอัปเดตช่อง image_url ทีเดียวทุกแถว!
export async function updateBulkImageUrl(productSup: string, newImageUrl: string) {
  const cookieStore = await cookies();
  const supabase = createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} },
  });

  // คีย์เวิร์ด: อัปเดตคอลัมน์ image_url ให้กับทุกแถวที่ชื่อ product_sup ตรงกัน
  const { error } = await supabase
    .from("collection_groups")
    .update({ image_url: newImageUrl })
    .eq("product_sup", productSup);

  if (error) throw new Error(error.message);
  return { success: true };
}