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
    return { success: true };

  } catch (error: any) {
    throw new Error(error.message || "เกิดข้อผิดพลาดในการบันทึก");
  }
}

export async function getAllProps() {
  const supabase = await createClient();
  let allProducts: any[] = [];
  let page = 0;
  const limit = 1000;
  let hasMore = true;

  while (hasMore) {
    const from = page * limit;
    const to = from + limit - 1;

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("category_id", "prop")
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      console.error("Error fetching props:", error);
      break;
    }

    if (data && data.length > 0) {
      allProducts.push(...data);
      if (data.length < limit) {
        hasMore = false;
      } else {
        page++;
      }
    } else {
      hasMore = false;
    }
  }

  return allProducts;
}

export async function updatePropImageUrl(id: number, imageUrl: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("products")
    .update({ image_url: imageUrl })
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/props");
  return { success: true };
}
