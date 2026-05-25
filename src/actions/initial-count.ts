//src/actions/initial-count.ts

"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

const TABLE = 'stock_initial_counts'

// 1. อัปเดตสถานะเอกสาร
export async function updateCountStatus(id: number, status: 'draft' | 'confirmed' | 'cancelled') {
  const supabase = await createClient()

  const { error } = await supabase
    .from(TABLE)
    .update({ status })
    .eq('id', id)

  if (error) {
    console.error("Update Status Error:", error.message)
    return { error: "อัปเดตสถานะไม่สำเร็จ: " + error.message }
  }

  revalidatePath('/manager/initial-count')
  return { success: true }
}

// 2. ลบเอกสาร (เนื่องจากเราตั้ง ON DELETE CASCADE ไว้ใน DB ถ้าลบหัวบิล รายการย่อยจะหายไปด้วยอัตโนมัติ)
export async function deleteInitialCount(id: number) {
  const supabase = await createClient()

  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq('id', id)

  if (error) {
    console.error("Delete Count Error:", error.message)
    return { error: "ลบข้อมูลไม่สำเร็จ: " + error.message }
  }

  revalidatePath('/manager/initial-count')
  return { success: true }
}