//src/actions/dispatch.ts
"use server"

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function getGroupedDispatches() {
  const cookieStore = await cookies()
  const supabase = createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    cookies: { getAll() { return cookieStore.getAll() } }
  })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Unauthorized" }

  const { data: profile } = await supabase.from('profiles').select('branch_id').eq('user_id', user.id).single()
  const myBranchId = profile?.branch_id || 1

  // 1. งานที่คลังเราต้องจัดส่ง 
  // ✨ เพิ่ม latitude, longitude 
  const { data: myDispatchOrders, error: err1 } = await supabase
    .from('orders')
    .select(`
      id, 
      order_code, 
      created_at, 
      shipping_name, 
      shipping_phone, 
      shipping_address, 
      latitude, 
      longitude,
      status,
      order_items!inner (
        id, 
        qty, 
        item_status, 
        price_at_sale, 
        fulfill_branch_id,
        products!order_items_product_fk ( 
          id, name, sku, image_url, price,
          stock ( branch_id, qty ) 
        ),
        branches!order_items_fulfill_branch_fk ( branch_name )
      )
    `)
    .eq('order_items.fulfill_branch_id', myBranchId)
    .in('order_items.item_status', ['PENDING_SHIPMENT', 'SHIPPED'])
    .order('created_at', { ascending: false })

  // 2. บิลที่เราขาย แต่ฝากสาขาอื่นส่ง
  // ✨ เพิ่ม latitude, longitude 
  const { data: followUpOrders, error: err2 } = await supabase
    .from('orders')
    .select(`
      id, 
      order_code, 
      created_at, 
      shipping_name, 
      shipping_phone, 
      shipping_address, 
      latitude, 
      longitude,
      status,
      order_items!inner (
        id, 
        qty, 
        item_status, 
        price_at_sale, 
        fulfill_branch_id,
        products!order_items_product_fk ( 
          id, name, sku, image_url, price,
          stock ( branch_id, qty ) 
        ),
        branches!order_items_fulfill_branch_fk ( branch_name )
      )
    `)
    .eq('branch_id', myBranchId)
    .neq('order_items.fulfill_branch_id', myBranchId)
    .in('order_items.item_status', ['PENDING_SHIPMENT', 'SHIPPED'])
    .order('created_at', { ascending: false })

  // 3. ประวัติบิลที่จัดส่งหรือขายเสร็จสมบูรณ์แล้ว (ดึง 50 รายการล่าสุด)
  // ✨ เพิ่ม latitude, longitude 
  const { data: completedOrders, error: err3 } = await supabase
    .from('orders')
    .select(`
      id, 
      order_code, 
      created_at, 
      shipping_name, 
      shipping_phone, 
      shipping_address, 
      latitude, 
      longitude,
      status,
      order_items!inner (
        id, 
        qty, 
        item_status, 
        price_at_sale, 
        fulfill_branch_id,
        products!order_items_product_fk ( 
          id, name, sku, image_url, price,
          stock ( branch_id, qty ) 
        ),
        branches!order_items_fulfill_branch_fk ( branch_name )
      )
    `)
    .eq('branch_id', myBranchId)
    .eq('status', 'COMPLETED')
    .order('created_at', { ascending: false })
    .limit(50)

  // 4. บิลที่ถูกยกเลิก (CANCELLED)
  const { data: cancelledOrders, error: err4 } = await supabase
    .from('orders')
    .select(`
      id, 
      order_code, 
      created_at, 
      shipping_name, 
      shipping_phone, 
      shipping_address, 
      latitude, 
      longitude,
      status,
      order_items!inner (
        id, 
        qty, 
        item_status, 
        price_at_sale, 
        fulfill_branch_id,
        products!order_items_product_fk ( 
          id, name, sku, image_url, price,
          stock ( branch_id, qty ) 
        ),
        branches!order_items_fulfill_branch_fk ( branch_name )
      )
    `)
    .eq('branch_id', myBranchId)
    .eq('status', 'CANCELLED')
    .order('created_at', { ascending: false })
    .limit(50)

  if (err1) console.error("Error fetching my tasks:", err1)
  if (err2) console.error("Error fetching follow ups:", err2)
  if (err3) console.error("Error fetching completed tasks:", err3)
  if (err4) console.error("Error fetching cancelled tasks:", err4)

  if (err1 || err2 || err3 || err4) return { success: false, error: "ดึงข้อมูลล้มเหลว" }

  return {
    success: true,
    myDispatchOrders: myDispatchOrders || [],
    followUpOrders: followUpOrders || [],
    completedOrders: completedOrders || [],
    cancelledOrders: cancelledOrders || []
  }
}

export async function markOrderItemsShipped(orderId: number, itemIds: number[], orderCode: string) {
  const cookieStore = await cookies()
  const supabase = createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, { 
    cookies: { getAll() { return cookieStore.getAll() } } 
  })
  
  const { error: itemsError } = await supabase
    .from('order_items')
    .update({ item_status: 'DELIVERED' })
    .in('id', itemIds)
    
  if (itemsError) return { success: false, error: itemsError.message }

  await supabase
    .from('stock_transfers')
    .update({ status: 'COMPLETED', shipped_at: new Date().toISOString() })
    .like('note', `%${orderCode}%`)
    .eq('status', 'AWAITING_SHIPMENT')

  const { data: remainingItems } = await supabase
    .from('order_items')
    .select('id')
    .eq('order_id', orderId)
    .in('item_status', ['PENDING_SHIPMENT', 'SHIPPED'])
    
  if (remainingItems && remainingItems.length === 0) {
    await supabase.from('orders').update({ status: 'COMPLETED' }).eq('id', orderId)
  }

  return { success: true }
}

export async function getPrintDispatchData(orderCode: string) {
  const cookieStore = await cookies()
  const supabase = createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, { 
    cookies: { getAll() { return cookieStore.getAll() } } 
  })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Unauthorized" }

  const { data: order, error } = await supabase
    .from('orders')
    .select(`
      id,
      order_code, 
      created_at, 
      shipping_name, 
      shipping_phone, 
      shipping_address,
      latitude,
      longitude,
      status,
      branch_id,
      company_name_th,
      company_name_en,
      company_address,
      tax_id,
      special_discount_percent,
      special_discount_baht,
      branches!orders_branch_fk ( branch_name ),
      order_items (
        id, 
        qty, 
        item_status,
        price_at_sale,
        fulfill_branch_id,
        products!order_items_product_fk ( 
          name, sku, image_url, price,
          stock ( branch_id, qty ) 
        ),
        branches!order_items_fulfill_branch_fk ( branch_name )
      )
    `)
    .eq('order_code', orderCode)
    .single()

  if (error) {
    console.error("Error fetching order for print:", error)
    return { success: false, error: error.message }
  }

  if (!order) return { success: false, error: "ไม่พบข้อมูลบิลนี้" }

  return { success: true, data: order }
}

export async function approveAndCutStock(orderId: number, orderCode: string, items: any[], customOrderCode?: string) {
  const cookieStore = await cookies()
  const supabase = createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, { 
    cookies: { getAll() { return cookieStore.getAll() } } 
  })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Unauthorized" }

  try {
    const { data: order } = await supabase
      .from('orders')
      .select('status, latitude, longitude, shipping_address')
      .eq('id', orderId)
      .single()
      
    if (order?.status !== 'PENDING') {
      return { success: false, error: "ออเดอร์นี้ถูกอนุมัติไปแล้ว ไม่สามารถตัดสต็อกซ้ำได้" }
    }

    let finalOrderCode = orderCode
    if (customOrderCode && customOrderCode.trim() !== '') {
      finalOrderCode = customOrderCode.trim()
      const { error: updateError } = await supabase.from('orders').update({ order_code: finalOrderCode }).eq('id', orderId)
      if (updateError) {
        if (updateError.code === '23505') return { success: false, error: "รหัสออเดอร์นี้มีอยู่ในระบบแล้ว กรุณาใช้รหัสอื่น" }
        return { success: false, error: "อัปเดตรหัสออเดอร์ไม่สำเร็จ: " + updateError.message }
      }
      
      await supabase.from('stock_transfers')
        .update({ note: `โอนสินค้าสำหรับออเดอร์ ${finalOrderCode}` })
        .like('note', `%${orderCode}%`)
    }

    for (const item of items) {
      const productId = item.products?.id;
      const branchId = item.fulfill_branch_id;
      const qty = item.qty;

      if (!productId) {
        throw new Error("ไม่พบข้อมูลรหัสสินค้าในระบบ");
      }

      const { data: currentStock } = await supabase
        .from('stock')
        .select('id, qty')
        .eq('product_id', productId)
        .eq('branch_id', branchId)
        .single()

      if (!currentStock || currentStock.qty < qty) {
        throw new Error(`สต็อกสินค้า "${item.products?.name || productId}" ไม่เพียงพอในสาขานี้`)
      }

      await supabase
        .from('stock')
        .update({ qty: currentStock.qty - qty, updated_at: new Date().toISOString() })
        .eq('id', currentStock.id)

      await supabase.from('stock_movements').insert({
        product_id_bigint: productId, 
        branch_id: branchId, 
        type: 'SALE', 
        qty: -Math.abs(qty), 
        note: `ชำระเงินและอนุมัติใบขาย (บิล: ${finalOrderCode})`, 
        ref_type: 'ORDER', 
        ref_id_bigint: orderId, 
        created_by: user.id
      })
    }

    const isStorefrontTakeaway = order.shipping_address?.startsWith('[รับหน้าร้าน]')

    if (isStorefrontTakeaway) {
      await supabase.from('orders').update({ status: 'COMPLETED' }).eq('id', orderId)
      await supabase.from('order_items').update({ item_status: 'DELIVERED' }).eq('order_id', orderId)
    } else {
      await supabase.from('orders').update({ status: 'PROCESSING' }).eq('id', orderId)
    }

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function cancelOrder(orderId: number, orderCode: string, items: any[], currentStatus: string) {
  const cookieStore = await cookies()
  const supabase = createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, { 
    cookies: { getAll() { return cookieStore.getAll() } } 
  })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Unauthorized" }

  try {
    // 1. ถ้าบิลไม่อยู่สถานะ PENDING แปลว่าเคยหักสต็อกไปแล้ว ต้องบวกกลับคืน
    if (currentStatus !== 'PENDING') {
      for (const item of items) {
        const productId = item.products?.id;
        const branchId = item.fulfill_branch_id;
        const qty = item.qty;

        if (!productId) continue;

        // ดึงสต็อกปัจจุบัน
        const { data: currentStock } = await supabase
          .from('stock')
          .select('id, qty')
          .eq('product_id', productId)
          .eq('branch_id', branchId)
          .single()

        if (currentStock) {
          // คืนสต็อก
          await supabase
            .from('stock')
            .update({ qty: currentStock.qty + qty, updated_at: new Date().toISOString() })
            .eq('id', currentStock.id)

          // บันทึกประวัติคืนสต็อก
          await supabase.from('stock_movements').insert({
            product_id_bigint: productId, 
            branch_id: branchId, 
            type: 'ADJUSTMENT', 
            qty: Math.abs(qty), 
            note: `คืนสต็อกเนื่องจากยกเลิกบิล (บิล: ${orderCode})`, 
            ref_type: 'ORDER', 
            ref_id_bigint: orderId, 
            created_by: user.id
          })
        }
      }
    }

    // 2. อัปเดตสถานะบิลและไอเทมเป็น CANCELLED
    await supabase.from('orders').update({ status: 'CANCELLED' }).eq('id', orderId)
    await supabase.from('order_items').update({ item_status: 'CANCELLED' }).eq('order_id', orderId)
    
    // ยกเลิกรายการโอน (ถ้ามี)
    await supabase.from('stock_transfers')
      .update({ status: 'CANCELLED' })
      .like('note', `%${orderCode}%`)
      .in('status', ['PENDING', 'AWAITING_SHIPMENT'])

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}