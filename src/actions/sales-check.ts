"use server"

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function getSalesHistory() {
  const cookieStore = await cookies()
  const supabase = createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    cookies: { getAll() { return cookieStore.getAll() } }
  })

  // 1. ดึงข้อมูลสาขาของพนักงานคนนี้ก่อน
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Unauthorized" }

  const { data: profile } = await supabase.from('profiles').select('branch_id').eq('user_id', user.id).single()
  const myBranchId = profile?.branch_id || 1

  // 2. คิวรีใบขายทั้งหมดที่ "สาขาเราเป็นคนออกบิล" พร้อมดึงรายการสินค้าข้างในออกมาด้วย
// 2. คิวรีใบขายทั้งหมดที่ "สาขาเราเป็นคนออกบิล" พร้อมดึงรายการสินค้าข้างในออกมาด้วย
  const { data: orders, error } = await supabase
    .from('orders')
    .select(`
      id,
      order_code,
      created_at,
      subtotal,
      discount_amount,
      total_amount,
      status,
      shipping_name,
      profiles:user_id ( full_name ),
      order_items (
        id,
        qty,
        price_at_sale,
        total_item_amount,
        fulfill_branch_id,
        products:products!order_items_product_fk ( name, sku, image_url ),
        branches:fulfill_branch_id ( branch_name )
      )
    `)
    .eq('branch_id', myBranchId)
    .neq('status', 'PENDING')
    .order('created_at', { ascending: false })
  if (error) return { success: false, error: error.message }

  // 2. ปรับตัวแปรตอนวนลูป map ส่งค่าออกไปหน้าบ้าน
  const formattedSales = orders.map((order: any) => {
    let myBranchRevenue = 0
    let otherBranchRevenue = 0
    const remoteDetails: any[] = []

    order.order_items?.forEach((item: any) => {
      if (item.fulfill_branch_id === myBranchId) {
        myBranchRevenue += Number(item.total_item_amount) || 0
      } else {
        otherBranchRevenue += Number(item.total_item_amount) || 0
        remoteDetails.push({
          branch_name: item.branches?.branch_name || 'สาขาอื่น',
          amount: item.total_item_amount,
          qty: item.qty
        })
      }
    })

    const items = order.order_items?.map((item: any) => ({
      id: item.id,
      qty: item.qty,
      priceAtSale: item.price_at_sale,
      totalItemAmount: item.total_item_amount,
      productName: item.products?.name || 'ไม่พบสินค้า',
      productSku: item.products?.sku || '',
      imageUrl: item.products?.image_url || null,
      fulfillBranchName: item.branches?.branch_name || 'สาขาหลัก'
    })) || []

    return {
      id: order.id,
      orderCode: order.order_code,
      createdAt: order.created_at,
      saleName: order.profiles?.full_name || 'ไม่ระบุชื่อ',
      totalAmount: order.total_amount,
      status: order.status,
      shippingName: order.shipping_name,
      myBranchRevenue,      
      otherBranchRevenue,   
      remoteDetails,
      items
    }
  })
  return { success: true, data: formattedSales }
}