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

    // 1. ดึงข้อมูลสต็อกปัจจุบัน (ใช้ supabaseAdmin เพื่อ bypass RLS)
    const { data: currentStock, error: stockFetchError } = await supabaseAdmin
      .from("stock")
      .select("qty")
      .eq("product_id", productId)
      .eq("branch_id", branchId)
      .maybeSingle()

    const oldQty = currentStock ? Number(currentStock.qty) : 0
    const diff = newQty - oldQty

    if (currentStock) {
      // อัปเดตยอดสต็อกเดิม
      const { error: updateError } = await supabaseAdmin
        .from("stock")
        .update({ qty: newQty, updated_at: new Date().toISOString() })
        .eq("product_id", productId)
        .eq("branch_id", branchId)
      if (updateError) throw updateError
    } else {
      // สร้างยอดสต็อกใหม่
      const { error: insertError } = await supabaseAdmin
        .from("stock")
        .insert({ product_id: productId, branch_id: branchId, qty: newQty, updated_at: new Date().toISOString() })
      if (insertError) throw insertError
    }

    // 2. บันทึกประวัติการเปลี่ยนสต็อก (Stock Movement)
    const { error: logError } = await supabaseAdmin
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

export async function bulkUpdateStockQty(updates: { productId: number; branchId: number; newQty: number }[]) {
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

    const createdByName = profile?.full_name || user.email || "Admin"

    for (const update of updates) {
      const { productId, branchId, newQty } = update

      // 1. ดึงข้อมูลสต็อกปัจจุบัน
      const { data: currentStock } = await supabaseAdmin
        .from("stock")
        .select("qty")
        .eq("product_id", productId)
        .eq("branch_id", branchId)
        .maybeSingle()

      const oldQty = currentStock ? Number(currentStock.qty) : 0
      const diff = newQty - oldQty

      if (diff === 0) continue

      if (currentStock) {
        // อัปเดตยอดสต็อกเดิม
        const { error: updateError } = await supabaseAdmin
          .from("stock")
          .update({ qty: newQty, updated_at: new Date().toISOString() })
          .eq("product_id", productId)
          .eq("branch_id", branchId)
        if (updateError) throw updateError
      } else {
        // สร้างยอดสต็อกใหม่
        const { error: insertError } = await supabaseAdmin
          .from("stock")
          .insert({ product_id: productId, branch_id: branchId, qty: newQty, updated_at: new Date().toISOString() })
        if (insertError) throw insertError
      }

      // 2. บันทึกประวัติการเปลี่ยนสต็อก (Stock Movement)
      const { error: logError } = await supabaseAdmin
        .from("stock_movements")
        .insert({
          product_id_bigint: productId,
          branch_id: branchId,
          type: "ADJUST",
          qty: diff,
          note: `ปรับปรุงยอดด้วยตนเองจากหน้ารายงานความคลาดเคลื่อน (จาก ${oldQty} เป็น ${newQty})`,
          ref_type: "MANUAL",
          created_by: user.id,
          created_by_name: createdByName
        })

      if (logError) {
        console.error(`Error logging movement for product ${productId}:`, logError.message)
      }
    }

    return { success: true }
  } catch (error: any) {
    console.error("Bulk Update Stock Error:", error.message)
    return { error: error.message }
  }
}

// Helper function for paginated fetching
async function fetchAll(table: string, select: string, modifiers?: (q: any) => any) {
  let allData: any[] = []
  let from = 0
  const pageSize = 1000
  const supabase = await createClient()

  while (true) {
    let query = supabase.from(table).select(select).range(from, from + pageSize - 1)
    if (modifiers) query = modifiers(query)

    const { data, error } = await query
    if (error) throw error

    if (!data || data.length === 0) break
    allData = allData.concat(data)
    if (data.length < pageSize) break
    from += pageSize
  }
  return allData
}

export async function getRfidStockMismatch() {
  try {
    const supabase = await createClient()

    // 1. ดึงข้อมูลสาขาทั้งหมด
    const { data: branchesData, error: branchesError } = await supabase
      .from("branches")
      .select("id, branch_name")

    if (branchesError) throw branchesError

    // 2. Fetch all products
    const rawProducts = await fetchAll("products", "id, name, sku, barcode, image_url")
    
    // 3. Fetch all stocks
    const allStock = await fetchAll("stock", "product_id, branch_id, qty")
    
    // 4. Fetch all active RFIDs
    const allRfids = await fetchAll("product_rfid_tags", "product_id, branch_id", (q) => q.eq("status", "IN_STOCK"))

    // Group stocks by product_id
    const stockMap: Record<number, { branch_id: number, qty: number }[]> = {}
    for (const s of allStock) {
      if (!stockMap[s.product_id]) stockMap[s.product_id] = []
      stockMap[s.product_id].push(s)
    }

    // Group RFIDs by product_id
    const rfidMap: Record<number, { branch_id: number, status: string }[]> = {}
    for (const r of allRfids) {
      if (!rfidMap[r.product_id]) rfidMap[r.product_id] = []
      rfidMap[r.product_id].push({ branch_id: r.branch_id, status: "IN_STOCK" })
    }

    // 5. นำจำนวน tag และ stock มาประกอบกับสินค้า
    const productsWithTags = rawProducts.map(p => ({
      ...p,
      stock: stockMap[p.id] || [],
      product_rfid_tags: rfidMap[p.id] || []
    }))

    return { data: productsWithTags, branches: branchesData }
  } catch (error: any) {
    console.error("Mismatch Fetch Error:", error.message)
    return { error: error.message, data: [], branches: [] }
  }
}

export async function getProductBranchTags(productId: number, branchId: number) {
  try {
    // ดึง tag ทั้งหมดของสินค้านี้มาก่อน แล้วค่อย filter ใน JS เพื่อหลีกเลี่ยงปัญหา type mismatch ใน .or()
    // ใช้ supabaseAdmin เพื่อป้องกันปัญหา RLS บล็อกการมองเห็นข้อมูล
    const { data, error } = await supabaseAdmin
      .from("product_rfid_tags")
      .select("id, rfid, status, branch_id")
      .eq("product_id", productId)

    if (error) throw error

    // กรองเอาเฉพาะสาขาที่ตรงกัน หรือถ้าเป็นสาขา 1 (TerraHome) ให้รวมพวกที่ branch_id เป็น null เข้าไปด้วย
    const filteredData = (data || []).filter(t => {
      const tBranch = Number(t.branch_id)
      if (branchId === 1) {
        return tBranch === 1 || tBranch === 0 || !t.branch_id
      }
      return tBranch === branchId
    })

    return { data: filteredData }
  } catch (error: any) {
    console.error("Fetch Tags Error:", error.message)
    return { error: error.message }
  }
}

export async function deleteProductTag(tagId: string | number, reason: string = "ไม่ได้ระบุเหตุผล") {
  try {
    const supabaseUserClient = await createClient()
    
    // ดึงโปรไฟล์เพื่อดึงชื่อผู้บันทึกการลบ
    let deletedByName = "System/Unknown"
    const { data: { user } } = await supabaseUserClient.auth.getUser()
    if (user) {
      const { data: profile } = await supabaseUserClient
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .single()
      deletedByName = profile?.full_name || user.email || "Admin"
    }

    // 1. ดึงข้อมูล Tag ที่จะลบก่อน
    const { data: tagData, error: fetchError } = await supabaseAdmin
      .from("product_rfid_tags")
      .select("*")
      .eq("id", tagId)
      .single()

    if (fetchError || !tagData) {
      throw new Error("ไม่พบข้อมูล Tag ที่ต้องการลบ")
    }

    // 2. นำไปบันทึกลงตารางประวัติ (deleted_rfid_tags)
    const { error: historyError } = await supabaseAdmin
      .from("deleted_rfid_tags")
      .insert({
        original_tag_id: tagData.id,
        product_id: tagData.product_id,
        rfid: tagData.rfid,
        branch_id: tagData.branch_id,
        reason: reason,
        deleted_by: deletedByName
      })

    if (historyError) {
      console.error("Insert history error:", historyError.message)
      // อนุโลมให้ลบได้แม้ว่าจะเก็บประวัติไม่สำเร็จ (หรือจะดัก error ก็ได้ แต่ควรดักเผื่อไว้)
    }

    // 3. ใช้ supabaseAdmin เพื่อป้องกันปัญหา RLS บล็อกการลบ
    const { error: deleteError } = await supabaseAdmin
      .from("product_rfid_tags")
      .delete()
      .eq("id", tagId)
      
    if (deleteError) throw deleteError
    return { success: true }
  } catch (error: any) {
    console.error("Delete Tag Error:", error.message)
    return { error: error.message }
  }
}