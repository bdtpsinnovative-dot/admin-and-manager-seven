'use server';

import { createClient } from '@supabase/supabase-js';

export async function getProductsForCheck(scannedCodes: string[]) {
  const supabaseUrl = process.env.SUPABASE_URL as string;
  const supabaseKey = process.env.SUPABASE_ANON_KEY as string;
  const supabase = createClient(supabaseUrl, supabaseKey);

  if (!scannedCodes || scannedCodes.length === 0) {
    return { scannedData: [], missingData: [] };
  }

  // 1. ดึงข้อมูลสินค้าทั้งหมดพร้อม Stock และ RFID มาเลย (ตั้ง Limit เผื่อไว้ 10,000 แถว)
  // ท่านี้รวดเดียวจบ ป้องกันปัญหาข้อความค้นหายาวเกินลิมิตเวลาสแกนหลักพันชิ้น
  const { data, error } = await supabase
    .from('products')
    .select(`
      id,
      sku,
      barcode,
      name,
      stock ( branch_id, qty ),
      product_rfid_tags ( branch_id, status )
    `)
    .limit(10000);

  if (error) {
    console.error("Fetch error:", error);
    throw new Error(error.message);
  }

  // 2. ล้างช่องว่างและตัวอักษรขยะที่อาจติดมาจากการ Copy ใน Excel
  // ใช้ Set เพื่อให้ความเร็วในการค้นหาระดับเสี้ยววินาที
  const codeSet = new Set(scannedCodes.map(c => c.trim()));

  const scannedData: any[] = [];
  const missingData: any[] = [];

  // 3. ให้ Server ทำการคัดแยกกล่องข้อมูลให้เลย ว่าอันไหนสแกนเจอ อันไหนตกหล่น
  data.forEach(product => {
    // เช็คว่า SKU หรือ Barcode ของสินค้าชิ้นนี้ มีอยู่ในรายการที่นายแปะมาไหม?
    const isMatch = (product.sku && codeSet.has(product.sku)) || 
                    (product.barcode && codeSet.has(product.barcode));

    if (isMatch) {
      scannedData.push(product); // ถ้ามี เก็บเข้ากลุ่มค้นหาเจอ
    } else {
      missingData.push(product); // ถ้าไม่มี เก็บเข้ากลุ่มไม่ได้สแกน (ตกหล่น)
    }
  });

  return { scannedData, missingData };
}