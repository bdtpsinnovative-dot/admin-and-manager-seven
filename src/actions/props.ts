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
