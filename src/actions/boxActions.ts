"use server";

import { createClient } from "@/utils/supabase/server";

export async function getBoxes() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("boxes").select("*").order("id", { ascending: true });
  if (error) throw new Error(error.message);
  return data;
}

export async function updateBoxImage(boxId: number, imageUrl: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("boxes").update({ image_url: imageUrl }).eq("id", boxId);
  if (error) throw new Error(error.message);
  return { success: true };
}

// ✅ อัปเกรด: ดึง stock(qty) มารวมด้วย
export async function getPropsWithSuggestedBoxes() {
  const supabase = await createClient();
  
  const { data: boxes, error: boxError } = await supabase.from("boxes").select("*");
  if (boxError) throw new Error(boxError.message);

  // 💡 เพิ่ม stock(qty) เข้าไปใน select 
  const { data: products, error } = await supabase
    .from("products")
    .select(`id, name, category_id, length_cm, width_cm, thickness_cm, weight, image_url, specs, stock(qty)`) 
    .eq("category_id", "prop");
  if (error) throw new Error(error.message);

  const maxBoxL = Math.max(...boxes.map(b => Math.max(b.length_cm, b.width_cm, b.height_cm)), 0);
  const maxBoxM = Math.max(...boxes.map(b => [b.length_cm, b.width_cm, b.height_cm].sort((x,y)=>y-x)[1]), 0);
  const maxBoxS = Math.max(...boxes.map(b => Math.min(b.length_cm, b.width_cm, b.height_cm)), 0);
  const maxBoxW = Math.max(...boxes.map(b => b.max_weight_kg), 0);

  const productsWithBoxes = products.map((product) => {
    // 💡 รวมจำนวนสต็อกทุกสาขา (ถ้ามีหลายสาขา)
    const totalQty = product.stock?.reduce((sum: number, s: any) => sum + Number(s.qty || 0), 0) || 0;

    let pWidth = product.specs?.W ?? product.specs?.width_cm ?? product.width_cm ?? 0;
    let pDepth = product.specs?.D ?? product.specs?.length_cm ?? product.length_cm ?? 0;
    let pHeight = product.specs?.H ?? product.specs?.thickness_cm ?? product.thickness_cm ?? 0;
    let pWeight = product.weight || 0;

    const isAllZero = (pWidth === 0 && pDepth === 0 && pHeight === 0);
    
    let matchBox = null;
    let advanceReason = "";
    let customSuggest = "";

    if (isAllZero) {
      advanceReason = "⚠️ ไม่สามารถคำนวณได้ (กว้าง, ลึก, สูง เป็น 0 ทั้งหมด)";
    } else {
      let calcW = pWidth === 0 ? 5 : pWidth;
      let calcD = pDepth === 0 ? 5 : pDepth;
      let calcH = pHeight === 0 ? 5 : pHeight;

      const itemDims = [calcW, calcD, calcH].sort((a, b) => b - a);
      let minVolume = Infinity;

      for (const box of boxes) {
        const boxDims = [box.length_cm, box.width_cm, box.height_cm].sort((a, b) => b - a);
        if (
          itemDims[0] <= boxDims[0] && 
          itemDims[1] <= boxDims[1] && 
          itemDims[2] <= boxDims[2] && 
          pWeight <= box.max_weight_kg
        ) {
          const vol = boxDims[0] * boxDims[1] * boxDims[2];
          if (vol < minVolume) {
            minVolume = vol;
            matchBox = box;
          }
        }
      }

      if (!matchBox) {
        const errors = [];
        if (itemDims[0] > maxBoxL) errors.push("ยาวเกิน");
        if (itemDims[1] > maxBoxM) errors.push("กว้างเกิน");
        if (itemDims[2] > maxBoxS) errors.push("สูงเกิน");
        if (pWeight > maxBoxW) errors.push("หนักเกิน");

        advanceReason = errors.length > 0 ? `❌ สาเหตุ: ${errors.join(", ")}` : "❌ รูปทรงไม่พอดีกับกล่องในระบบ";
        customSuggest = `${itemDims[0] + 5} x ${itemDims[1] + 5} x ${itemDims[2] + 5} cm`;
      }
    }

    return {
      ...product,
      prop_w: pWidth,
      prop_d: pDepth,
      prop_h: pHeight,
      stock_qty: totalQty, // 💡 แนบยอดสต็อกกลับไปให้หน้าเว็บ
      suggested_box: matchBox ? {
        box_name: matchBox.name,
        box_image_url: matchBox.image_url,
        box_type: matchBox.box_type
      } : null,
      advanceReason,
      customSuggest
    };
  });

  return productsWithBoxes;
}

export async function addBox(boxData: any) {
  const supabase = await createClient();
  const { error } = await supabase.from("boxes").insert([boxData]);
  if (error) throw new Error(error.message);
  return { success: true };
}

export async function updateBox(boxId: number, boxData: any) {
  const supabase = await createClient();
  const { id, created_at, ...updatePayload } = boxData; 
  const { error } = await supabase.from("boxes").update(updatePayload).eq("id", boxId);
  if (error) throw new Error(error.message);
  return { success: true };
}