"use server"

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

interface SalesOrderItemRow {
  id: number
  qty: number
  price_at_sale: number
  total_item_amount: number
  fulfill_branch_id: number
  products: { name: string; sku: string; image_url: string | null } | null
  branches: { branch_name: string } | null
}

interface SalesOrderRow {
  id: number
  order_code: string
  created_at: string
  total_amount: number
  status: string
  shipping_name: string | null
  profiles: { full_name: string | null } | null
  order_items: SalesOrderItemRow[] | null
}

export async function getSalesHistory(showHidden = false) {
  const cookieStore = await cookies()
  const supabase = createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    cookies: { getAll() { return cookieStore.getAll() } }
  })

  // 1. ดึงข้อมูลสาขาของพนักงานคนนี้ก่อน
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Unauthorized" }

  const { data: profile } = await supabase.from('profiles').select('branch_id').eq('user_id', user.id).single()
  const myBranchId = profile?.branch_id || 1

  const { data: hiddenRows, error: hiddenError } = await supabase
    .from('order_hidden_by_users')
    .select('order_id')
    .eq('user_id', user.id)

  if (hiddenError) return { success: false, error: hiddenError.message }
  const hiddenOrderIds = new Set((hiddenRows || []).map(row => Number(row.order_id)))

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
  const orderRows = (orders || []) as unknown as SalesOrderRow[]
  const formattedSales = orderRows
  .filter(order => showHidden ? hiddenOrderIds.has(order.id) : !hiddenOrderIds.has(order.id))
  .map(order => {
    let myBranchRevenue = 0
    let otherBranchRevenue = 0
    const remoteDetails: { branch_name: string; amount: number; qty: number }[] = []

    order.order_items?.forEach(item => {
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

    const items = order.order_items?.map(item => ({
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
  return { success: true, data: formattedSales, hiddenCount: hiddenOrderIds.size }
}

export async function hideCancelledOrder(orderId: number) {
  const cookieStore = await cookies()
  const supabase = createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    cookies: { getAll() { return cookieStore.getAll() } }
  })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const [{ data: profile }, { data: order, error: orderError }] = await Promise.all([
    supabase.from('profiles').select('branch_id').eq('user_id', user.id).single(),
    supabase.from('orders').select('id, branch_id, status').eq('id', orderId).single()
  ])

  if (orderError || !order) return { success: false, error: 'ไม่พบออเดอร์นี้' }
  if (order.status !== 'CANCELLED') return { success: false, error: 'ซ่อนได้เฉพาะบิลที่ยกเลิกแล้ว' }
  if (!profile?.branch_id || order.branch_id !== profile.branch_id) {
    return { success: false, error: 'ไม่มีสิทธิ์ซ่อนออเดอร์ของสาขาอื่น' }
  }

  const { error } = await supabase.from('order_hidden_by_users').insert({
    order_id: orderId,
    user_id: user.id
  })

  if (error && error.code !== '23505') return { success: false, error: error.message }
  revalidatePath('/sale/sales-history')
  revalidatePath('/sale/vanguard-dispatch')
  revalidatePath('/manager/vanguard-dispatch')
  return { success: true }
}

export async function restoreHiddenOrder(orderId: number) {
  const cookieStore = await cookies()
  const supabase = createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    cookies: { getAll() { return cookieStore.getAll() } }
  })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const { error } = await supabase
    .from('order_hidden_by_users')
    .delete()
    .eq('order_id', orderId)
    .eq('user_id', user.id)

  if (error) return { success: false, error: error.message }
  revalidatePath('/sale/sales-history')
  revalidatePath('/sale/vanguard-dispatch')
  revalidatePath('/manager/vanguard-dispatch')
  return { success: true }
}
