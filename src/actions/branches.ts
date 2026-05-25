"use server"

// ใช้ Relative Path ตามที่คุณต้องการ
import { createClient } from "../lib/supabase/server"
import { revalidatePath } from "next/cache"

const TABLE = 'branches'

/**
 * 1. สร้างสาขาใหม่
 */
export async function createBranch(formData: FormData) {
  const supabase = await createClient()
  
  const branch_code = (formData.get('branch_code') as string || "").trim().toUpperCase().replace(/\s+/g, "")
  const branch_name = (formData.get('branch_name') as string || "").trim()
  const branch_type = (formData.get('branch_type') as string || "SHOWROOM")
  
  const latitude = formData.get('latitude') ? Number(formData.get('latitude')) : null
  const longitude = formData.get('longitude') ? Number(formData.get('longitude')) : null

  if (!branch_code || !branch_name) {
    return { error: "กรุณากรอกข้อมูลให้ครบถ้วน" }
  }

  // เช็คซ้ำ
  const { data: dup } = await supabase
    .from(TABLE)
    .select('id')
    .eq('branch_code', branch_code)
    .maybeSingle()

  if (dup) {
    return { error: `รหัสสาขา ${branch_code} มีอยู่แล้ว` }
  }

  // Insert
  const { error } = await supabase
    .from(TABLE)
    .insert([{ branch_code, branch_name, branch_type, latitude, longitude }])

  if (error) return { error: error.message }

  revalidatePath('/branches')
  return { success: true, message: `เพิ่มสาขา ${branch_code} เรียบร้อย` }
}

/**
 * 2. อัปเดตประเภทสาขาจากตาราง (Inline Update)
 */
export async function updateBranchType(id: number, newType: 'SHOWROOM' | 'FACTORY') {
  const supabase = await createClient()

  const { error } = await supabase
    .from(TABLE)
    .update({ branch_type: newType })
    .eq('id', id)

  if (error) {
    console.error("Update Type Error:", error.message)
    return { error: "ไม่สามารถเปลี่ยนประเภทได้" }
  }

  revalidatePath('/branches')
  return { success: true }
}

/**
 * 3. ลบสาขา
 */
export async function deleteBranch(id: number) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq('id', id)

  if (error) {
    console.error("Delete Error:", error.message)
    return { error: "ไม่สามารถลบข้อมูลได้" }
  }

  revalidatePath('/branches')
  return { success: true }
}

/**
 * 4. อัปเดตเฉพาะพิกัดแผนที่ (อันนี้แหละครับที่ตกหล่นไป!)
 */
export async function updateBranchLocation(id: number, latitude: number, longitude: number) {
  const supabase = await createClient()

  const { error } = await supabase
    .from(TABLE)
    .update({ latitude, longitude })
    .eq('id', id)

  if (error) {
    console.error("Update Location Error:", error.message)
    return { error: "ไม่สามารถอัปเดตพิกัดได้" }
  }

  revalidatePath('/branches')
  return { success: true }
}