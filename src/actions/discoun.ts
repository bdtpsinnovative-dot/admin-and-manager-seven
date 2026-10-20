"use server"

import { createClient } from "../lib/supabase/server"; // ✅ ใช้ตัวกลางที่ปลอดภัย
import { revalidatePath } from "next/cache";

const TABLE_DISCOUNTS = 'discounts'
const TABLE_RULES = 'discount_rules'

// 1. สร้างส่วนลดใหม่ (รองรับหลายสินค้า, จำกัดส่วนลดสูงสุด, วันเริ่มต้น-สิ้นสุด)
export async function createDiscount(formData: FormData) {
  const supabase = await createClient();

  const startDateRaw = formData.get('start_date') as string;
  const endDateRaw = formData.get('end_date') as string;
  const maxDiscountRaw = formData.get('max_discount') as string;
  const maxDiscount = maxDiscountRaw && !isNaN(parseFloat(maxDiscountRaw)) ? parseFloat(maxDiscountRaw) : null;

  const discountData: Record<string, any> = {
    name: formData.get('name') as string,
    code: formData.get('code') ? (formData.get('code') as string).toUpperCase() : null,
    discount_type: formData.get('discount_type') as string,
    value: parseFloat(formData.get('value') as string),
    start_date: startDateRaw ? new Date(startDateRaw).toISOString() : null,
    end_date: endDateRaw ? new Date(endDateRaw).toISOString() : null,
    active: true
  };

  if (maxDiscount !== null) {
    discountData.max_discount = maxDiscount;
  }

  let { data: discData, error: discErr } = await supabase
    .from(TABLE_DISCOUNTS)
    .insert([discountData])
    .select()
    .single();

  // หากฐานข้อมูลยังไม่ได้เพิ่มคอลัมน์ max_discount ให้ retry โดยไม่ส่ง max_discount
  if (discErr && (discErr.message?.includes('max_discount') || discErr.code === '42703')) {
    delete discountData.max_discount;
    const retry = await supabase
      .from(TABLE_DISCOUNTS)
      .insert([discountData])
      .select()
      .single();
    discData = retry.data;
    discErr = retry.error;
  }

  if (discErr) return { error: discErr.message }

  // รองรับหลาย product_id (ส่งมาเป็น JSON array string)
  const productIdsRaw = formData.get('product_ids') as string
  let productIds: (string | null)[] = []
  try {
    const parsed = JSON.parse(productIdsRaw || '[]')
    productIds = Array.isArray(parsed) && parsed.length > 0 ? parsed : [null]
  } catch {
    productIds = [null]
  }

  const minSubtotal = parseFloat(formData.get('min_subtotal') as string) || 0
  const branchId = formData.get('branch_id') || null

  const rules = productIds.map(pid => ({
    discount_id: discData.id,
    min_subtotal: minSubtotal,
    branch_id: branchId,
    product_id: pid || null,
  }))

  const { error: ruleErr } = await supabase.from(TABLE_RULES).insert(rules)

  if (ruleErr) {
    await supabase.from(TABLE_DISCOUNTS).delete().eq('id', discData.id)
    return { error: ruleErr.message }
  }

  revalidatePath('/discounts')
  return { success: true }
}

// 2. เปิด/ปิด การใช้งาน
export async function toggleDiscountStatus(id: number, currentStatus: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from(TABLE_DISCOUNTS)
    .update({ active: !currentStatus })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/discounts')
}

// 3. ลบส่วนลด
export async function deleteDiscount(id: number) {
  const supabase = await createClient();
  await supabase.from(TABLE_RULES).delete().eq('discount_id', id)
  const { error } = await supabase.from(TABLE_DISCOUNTS).delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/discounts')
}

// 4. แก้ไขส่วนลด
export async function updateDiscount(formData: FormData) {
  const supabase = await createClient();

  const id = Number(formData.get('discount_id'))
  const updateData: Record<string, any> = {}

  const name = formData.get('name') as string
  if (name) updateData.name = name

  const discountType = formData.get('discount_type') as string
  if (discountType) updateData.discount_type = discountType

  const value = formData.get('value')
  if (value) updateData.value = parseFloat(value as string)

  const startDateRaw = formData.get('start_date') as string
  if (startDateRaw !== undefined && startDateRaw !== null) {
    updateData.start_date = startDateRaw ? new Date(startDateRaw).toISOString() : null
  }

  const endDateRaw = formData.get('end_date') as string
  if (endDateRaw !== undefined && endDateRaw !== null) {
    updateData.end_date = endDateRaw ? new Date(endDateRaw).toISOString() : null
  }

  const maxDiscountRaw = formData.get('max_discount') as string
  if (maxDiscountRaw !== undefined && maxDiscountRaw !== null) {
    updateData.max_discount = maxDiscountRaw && !isNaN(parseFloat(maxDiscountRaw)) ? parseFloat(maxDiscountRaw) : null
  }

  if (Object.keys(updateData).length === 0) {
    return { error: "ไม่มีข้อมูลที่ต้องแก้ไข" }
  }

  let { error } = await supabase
    .from(TABLE_DISCOUNTS)
    .update(updateData)
    .eq('id', id)

  if (error && (error.message?.includes('max_discount') || error.code === '42703')) {
    delete updateData.max_discount;
    const retry = await supabase
      .from(TABLE_DISCOUNTS)
      .update(updateData)
      .eq('id', id);
    error = retry.error;
  }

  if (error) return { error: error.message }

  // อัพเดท branch_id ใน rules ถ้าส่งมา
  const branchId = formData.get('branch_id')
  if (branchId !== null && branchId !== undefined) {
    const branchValue = branchId === '' ? null : branchId
    await supabase
      .from(TABLE_RULES)
      .update({ branch_id: branchValue })
      .eq('discount_id', id)
  }

  revalidatePath('/discounts')
  return { success: true }
}

// 5. ถอดสินค้าบางตัวออกจากส่วนลด (ลบ rule เดียว)
export async function removeDiscountRule(ruleId: number) {
  const supabase = await createClient();
  const { error } = await supabase
    .from(TABLE_RULES)
    .delete()
    .eq('id', ruleId)

  if (error) return { error: error.message }
  revalidatePath('/discounts')
  return { success: true }
}