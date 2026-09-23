import { createClient } from "@/lib/supabase/server"
import InitialCountClient from "./InitialCountClient"

export default async function InitialCountPage() {
  const supabase = await createClient()

  // 💡 ดึงรายการสินค้าตั้งต้นจาก detail (items) แล้ว join เอาชื่อ/รูป/ราคา และสาขามาโชว์
  const { data: countItems, error } = await supabase
    .from('stock_initial_count_items')
    .select(`
      id,
      qty,
      created_at,
      products (
        id,
        name,
        price,
        image_url
      ),
      stock_initial_counts (
        branches (
          branch_name
        )
      )
    `)
    .order('created_at', { ascending: false })

  if (error) console.error("Error fetching count items:", error)

  // 🔹 แปลงร่างข้อมูล (Format) จาก Array ให้เป็น Object ก้อนเดี่ยวก่อนส่งไปใช้งาน
  const formattedItems = (countItems || []).map((item: any) => ({
    id: item.id,
    qty: item.qty,
    created_at: item.created_at,
    // ดึงอาเรย์ตัวแรก [0] มาใช้ ถ้าไม่มีให้เป็น null
    products: Array.isArray(item.products) ? item.products[0] : item.products,
    stock_initial_counts: Array.isArray(item.stock_initial_counts) ? item.stock_initial_counts[0] : item.stock_initial_counts
  }))

  // 🔹 ส่ง formattedItems ที่แปลงเสร็จแล้วไปให้แทนตัวเก่าจ้า
  return <InitialCountClient items={formattedItems as any} />
}