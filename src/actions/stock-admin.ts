// src/actions/stock-admin.ts
"use server"

import { supabaseAdmin } from "../lib/supabase/admin";

// ✅ แก้ไข Interface ให้ตรงกับสถาปัตยกรรมข้อมูลที่ดึงมาจริง
export interface AdminStockData {
  id: string;
  qty: number;
  updated_at: string;
  products: {
    name: string;
    sku: string;
    barcode: string;
    unit: string;
  } | null;
  branches: {
    branch_name: string;
    branch_code: string;
  } | null;
}

export async function getAllInventory(query: string = "") {
  try {
    const dbQuery = supabaseAdmin
      .from("stock")
      .select(`
        id,
        qty,
        updated_at,
        products:product_id (name, sku, barcode, unit),
        branches:branch_id (branch_name, branch_code)
      `, { count: "exact" })
      .order("updated_at", { ascending: false });

    if (query) {
      dbQuery.or(`name.ilike.%${query}%,sku.ilike.%${query}%`, { referencedTable: 'products' });
    }

    const { data, error, count } = await dbQuery;

    if (error) throw error;
    
    // ✅ Cast ข้อมูลให้ตรงกับ Interface ที่เราแก้ไข
    return { 
      data: (data as any) as AdminStockData[], 
      totalCount: count || 0 
    };
  } catch (error: any) {
    console.error("Fetch Error:", error.message);
    return { error: error.message, data: [], totalCount: 0 };
  }
}

import { createClient } from "../lib/supabase/server";

export async function updateStockQty(productId: number, branchId: number, newQty: number) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Unauthorized: กรุณาเข้าสู่ระบบ")

    // ดึงโปรไฟล์เพื่อดึงชื่อผู้บันทึก
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", user.id)
      .single()

    // 1. ดึงข้อมูลสต็อกปัจจุบัน
    const { data: currentStock, error: stockFetchError } = await supabase
      .from("stock")
      .select("qty")
      .eq("product_id", productId)
      .eq("branch_id", branchId)
      .maybeSingle()

    const oldQty = currentStock ? Number(currentStock.qty) : 0
    const diff = newQty - oldQty

    if (currentStock) {
      // อัปเดตยอดสต็อกเดิม
      const { error: updateError } = await supabase
        .from("stock")
        .update({ qty: newQty, updated_at: new Date().toISOString() })
        .eq("product_id", productId)
        .eq("branch_id", branchId)
      if (updateError) throw updateError
    } else {
      // สร้างยอดสต็อกใหม่
      const { error: insertError } = await supabase
        .from("stock")
        .insert({ product_id: productId, branch_id: branchId, qty: newQty, updated_at: new Date().toISOString() })
      if (insertError) throw insertError
    }

    // 2. บันทึกประวัติการเปลี่ยนสต็อก (Stock Movement)
    const { error: logError } = await supabase
      .from("stock_movements")
      .insert({
        product_id_bigint: productId,
        branch_id: branchId,
        type: "ADJUST",
        qty: diff,
        note: `ปรับปรุงยอดด้วยตนเองจากหน้ารายงานความคลาดเคลื่อน (จาก ${oldQty} เป็น ${newQty})`,
        ref_type: "MANUAL",
        created_by: user.id,
        created_by_name: profile?.full_name || user.email || "Admin"
      })

    if (logError) {
      console.error("Error creating stock movement log:", logError.message)
    }

    return { success: true }
  } catch (error: any) {
    console.error("Update Stock Error:", error.message)
    return { error: error.message }
  }
}

export async function getRfidStockMismatch() {
  try {
    const supabase = await createClient()

    // 1. ดึงข้อมูลสาขาทั้งหมด
    const { data: branchesData, error: branchesError } = await supabase
      .from("branches")
      .select("id, branch_name")

    if (branchesError) throw branchesError

    // 2. ดึงข้อมูลสินค้าพร้อม stock ทั้งหมด
    const { data: rawProducts, error: productsError } = await supabase
      .from("products")
      .select(`
        id,
        name,
        sku,
        barcode,
        image_url,
        stock ( branch_id, qty )
      `)
      .limit(10000)

    if (productsError) throw productsError

    // 3. ดึงจำนวน tag IN_STOCK ทั้งหมดแยกต่างหาก เพื่อหลีกเลี่ยงข้อจำกัด limit 1000 แถวต่อ join ของ Supabase
    const tagCounts: Record<number, number> = {}
    let from = 0
    const pageSize = 10000
    
    while (true) {
      const { data: tags, error: tagsError } = await supabase
        .from("product_rfid_tags")
        .select("product_id")
        .eq("status", "IN_STOCK")
        .range(from, from + pageSize - 1)

      if (tagsError) throw tagsError
      if (!tags || tags.length === 0) break

      for (const tag of tags) {
        tagCounts[tag.product_id] = (tagCounts[tag.product_id] || 0) + 1
      }

      if (tags.length < pageSize) break
      from += pageSize
    }

    // 4. นำจำนวน tag มาประกอบกับสินค้า
    const productsWithTags = rawProducts.map(p => ({
      ...p,
      product_rfid_tags: Array.from({ length: tagCounts[p.id] || 0 }).map(() => ({ status: "IN_STOCK" }))
    }))

    return { data: productsWithTags, branches: branchesData }
  } catch (error: any) {
    console.error("Mismatch Fetch Error:", error.message)
    return { error: error.message, data: [], branches: [] }
  }
}