"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// 1. ดึงข้อมูลมากางให้ดูว่ากลุ่มไหนมีรูป/ไม่มีรูป และเป็นหมวด Prop หรือ Furniture
export async function getCategoryOverview() {
  const cookieStore = await cookies();
  const supabase = createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} },
  });

  // ดึงชื่อกลุ่ม รูปภาพ สถานะรูปชั่วคราว และ tag (เพื่อแยกเว็บ)
  const { data, error } = await supabase
    .from("collection_groups")
    .select("product_sup, image_url, is_temp_image, tag");
  if (error) throw new Error(error.message);

  const groups: Record<string, { 
    productSup: string, 
    currentImage: string | null, 
    isTempImage: boolean, 
    itemCount: number,
    isProp: boolean,
    tag: string 
  }> = {};
  
  data.forEach((row) => {
    const sup = row.product_sup;
    if (!sup) return;
    
    const isProp = (row.tag || "").toLowerCase().includes("prop");

    if (!groups[sup]) {
      groups[sup] = { 
        productSup: sup, 
        currentImage: row.image_url, 
        isTempImage: !!row.is_temp_image, 
        itemCount: 0,
        isProp: isProp,
        tag: row.tag || ""
      };
    }
    
    if (row.image_url && !groups[sup].currentImage) {
      groups[sup].currentImage = row.image_url;
    }
    if (row.is_temp_image) {
      groups[sup].isTempImage = true;
    }
    if (isProp) {
      groups[sup].isProp = true;
    }
    groups[sup].itemCount += 1;
  });

  return Object.values(groups).sort((a, b) => a.productSup.localeCompare(b.productSup));
}

// 2. ฟังก์ชันอัปเดตช่อง image_url ทีเดียวทุกแถว!
export async function updateBulkImageUrl(productSup: string, newImageUrl: string, isTempImage: boolean = false) {
  const cookieStore = await cookies();
  const supabase = createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} },
  });

  const { error } = await supabase
    .from("collection_groups")
    .update({ 
      image_url: newImageUrl,
      is_temp_image: isTempImage
    })
    .eq("product_sup", productSup);

  if (error) throw new Error(error.message);
  return { success: true };
}

// 3. ฟังก์ชันสลับสถานะรูปชั่วคราว (รอแก้)
export async function toggleTempImageStatus(productSup: string, isTempImage: boolean) {
  const cookieStore = await cookies();
  const supabase = createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} },
  });

  const { error } = await supabase
    .from("collection_groups")
    .update({ is_temp_image: isTempImage })
    .eq("product_sup", productSup);

  if (error) throw new Error(error.message);
  return { success: true };
}
