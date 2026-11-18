"use server"
import { supabase } from '../lib/supabase';
import { revalidateZenslabCache } from '../lib/revalidateZenslab';

// ดึงข้อมูลสินค้าเพื่อแสดงในตารางหลังบ้าน
export async function getAdminInventory() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

// ฟังก์ชันเพิ่มสินค้าสำหรับแอดมินและเมเนเจอร์
export async function addInventoryItem(formData: any) {
  const { data, error } = await supabase
    .from('products')
    .insert([formData]);

  if (error) return { success: false, error: error.message };
  await revalidateZenslabCache({ scope: 'products' });
  return { success: true };
}