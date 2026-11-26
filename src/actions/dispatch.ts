//src/actions/dispatch.ts
"use server"

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { clearPosCache } from '@/actions/pos'

export async function getGroupedDispatches(targetBranchId?: number | 'ALL', targetUserId?: string | 'ALL') {
  const cookieStore = await cookies()
  const supabase = createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    cookies: { getAll() { return cookieStore.getAll() } }
  })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Unauthorized" }

  const { data: profile } = await supabase
    .from('profiles')
    .select('branch_id, role, full_name')
    .eq('user_id', user.id)
    .maybeSingle()
  const myBranchId = profile?.branch_id || 1
  const userRole = profile?.role || 'sale'
  const isAdmin = userRole === 'admin'
  const currentUserId = user.id

  const effectiveBranchId = !isAdmin
    ? myBranchId
    : (targetBranchId && targetBranchId !== 'ALL' ? Number(targetBranchId) : null)
  const isFilterUser = Boolean(targetUserId && targetUserId !== 'ALL')

  const { data: hiddenRows, error: hiddenError } = await supabase
    .from('order_hidden_by_users')
    .select('order_id')
    .eq('user_id', user.id)

  if (hiddenError) return { success: false, error: "ดึงข้อมูลรายการที่ซ่อนไม่สำเร็จ" }
  const hiddenOrderIds = new Set((hiddenRows || []).map(row => Number(row.order_id)))

  // 1. งานที่คลังเราต้องจัดส่ง 
  let q1 = supabase
    .from('orders')
    .select(`
      id, 
      order_code, 
      user_id,
      branch_id,
      created_at, 
      shipping_name, 
      shipping_phone, 
      shipping_address, 
      latitude, 
      longitude,
      status,
      total_amount,
      discount_amount,
      discount_snapshot,
      branches:branch_id ( id, branch_name ),
      profiles:user_id ( full_name ),
      order_items!inner (
        id, 
        qty, 
        item_status, 
        price_at_sale, 
        fulfill_branch_id,
        products!order_items_product_fk ( 
          id, name, sku, image_url, price, specs, width_cm, length_cm, thickness_cm, category_id,
          collection_groups ( product_sup ),
          stock ( branch_id, qty ) 
        ),
        branches!order_items_fulfill_branch_fk ( branch_name )
      )
    `)
    .in('order_items.item_status', ['PENDING_SHIPMENT', 'SHIPPED'])
    .order('created_at', { ascending: false })

  if (effectiveBranchId !== null) {
    q1 = q1.eq('order_items.fulfill_branch_id', effectiveBranchId)
  }
  if (isFilterUser) {
    q1 = q1.eq('user_id', targetUserId)
  }

  // 2. บิลที่เราขาย แต่ฝากสาขาอื่นส่ง
  let q2 = supabase
    .from('orders')
    .select(`
      id, 
      order_code, 
      user_id,
      branch_id,
      created_at, 
      shipping_name, 
      shipping_phone, 
      shipping_address, 
      latitude, 
      longitude,
      status,
      total_amount,
      discount_amount,
      discount_snapshot,
      branches:branch_id ( id, branch_name ),
      profiles:user_id ( full_name ),
      order_items!inner (
        id, 
        qty, 
        item_status, 
        price_at_sale, 
        fulfill_branch_id,
        products!order_items_product_fk ( 
          id, name, sku, image_url, price, specs, width_cm, length_cm, thickness_cm, category_id,
          collection_groups ( product_sup ),
          stock ( branch_id, qty ) 
        ),
        branches!order_items_fulfill_branch_fk ( branch_name )
      )
    `)
    .in('order_items.item_status', ['PENDING_SHIPMENT', 'SHIPPED'])
    .order('created_at', { ascending: false })

  if (effectiveBranchId !== null) {
    q2 = q2.eq('branch_id', effectiveBranchId).neq('order_items.fulfill_branch_id', effectiveBranchId)
  }
  if (isFilterUser) {
    q2 = q2.eq('user_id', targetUserId)
  }

  // 3. ประวัติบิลที่จัดส่งหรือขายเสร็จสมบูรณ์แล้ว
  let q3 = supabase
    .from('orders')
    .select(`
      id, 
      order_code, 
      user_id,
      branch_id,
      created_at, 
      shipping_name, 
      shipping_phone, 
      shipping_address, 
      latitude, 
      longitude,
      status,
      total_amount,
      discount_amount,
      discount_snapshot,
      branches:branch_id ( id, branch_name ),
      profiles:user_id ( full_name ),
      order_items!inner (
        id, 
        qty, 
        item_status, 
        price_at_sale, 
        fulfill_branch_id,
        products!order_items_product_fk ( 
          id, name, sku, image_url, price, specs, width_cm, length_cm, thickness_cm, category_id,
          collection_groups ( product_sup ),
          stock ( branch_id, qty ) 
        ),
        branches!order_items_fulfill_branch_fk ( branch_name )
      )
    `)
    .eq('status', 'COMPLETED')
    .order('created_at', { ascending: false })
    .limit(isAdmin ? 100 : 50)

  if (effectiveBranchId !== null) {
    q3 = q3.eq('branch_id', effectiveBranchId)
  }
  if (isFilterUser) {
    q3 = q3.eq('user_id', targetUserId)
  }

  // 4. บิลที่ถูกยกเลิก (CANCELLED)
  let q4 = supabase
    .from('orders')
    .select(`
      id, 
      order_code, 
      user_id,
      branch_id,
      created_at, 
      shipping_name, 
      shipping_phone, 
      shipping_address, 
      latitude, 
      longitude,
      status,
      total_amount,
      discount_amount,
      discount_snapshot,
      branches:branch_id ( id, branch_name ),
      profiles:user_id ( full_name ),
      order_items!inner (
        id, 
        qty, 
        item_status, 
        price_at_sale, 
        fulfill_branch_id,
        products!order_items_product_fk ( 
          id, name, sku, image_url, price, specs, width_cm, length_cm, thickness_cm, category_id,
          collection_groups ( product_sup ),
          stock ( branch_id, qty ) 
        ),
        branches!order_items_fulfill_branch_fk ( branch_name )
      )
    `)
    .eq('status', 'CANCELLED')
    .order('created_at', { ascending: false })
    .limit(isAdmin ? 100 : 50)

  if (effectiveBranchId !== null) {
    q4 = q4.eq('branch_id', effectiveBranchId)
  }
  if (isFilterUser) {
    q4 = q4.eq('user_id', targetUserId)
  }

  const [res1, res2, res3, res4] = await Promise.all([q1, q2, q3, q4])
  const { data: myDispatchOrders, error: err1 } = res1
  const { data: followUpOrdersRaw, error: err2 } = res2
  const { data: completedOrders, error: err3 } = res3
  const { data: cancelledOrders, error: err4 } = res4

  if (err1) console.error("Error fetching my tasks:", err1)
  if (err2) console.error("Error fetching follow ups:", err2)
  if (err3) console.error("Error fetching completed tasks:", err3)
  if (err4) console.error("Error fetching cancelled tasks:", err4)

  if (err1 || err2 || err3 || err4) return { success: false, error: "ดึงข้อมูลล้มเหลว" }

  let followUpOrders = followUpOrdersRaw || []
  if (effectiveBranchId === null) {
    followUpOrders = followUpOrders.filter((order: any) =>
      (order.order_items || []).some((item: any) => item.fulfill_branch_id !== order.branch_id)
    )
  }

  const formatOrder = (order: any) => {
    const creatorProfile = Array.isArray(order.profiles) ? order.profiles[0] : order.profiles
    const creatorName = creatorProfile?.full_name || 'ไม่ระบุผู้สร้าง'
    const isCreator = Boolean(order.user_id && order.user_id === currentUserId)
    const canManage = isAdmin || isCreator
    const orderBranch = Array.isArray(order.branches) ? order.branches[0] : order.branches
    const branchName = orderBranch?.branch_name || 'ไม่ระบุสาขา'
    return {
      ...order,
      creator_name: creatorName,
      branch_name: branchName,
      is_creator: isCreator,
      can_manage: canManage
    }
  }

  let branchesList: { id: number; branch_name: string }[] = []
  if (isAdmin) {
    const { data: bList } = await supabase
      .from('branches')
      .select('id, branch_name')
      .order('id', { ascending: true })
    if (bList) branchesList = bList
  }

  return {
    success: true,
    currentUser: {
      id: currentUserId,
      role: userRole,
      name: profile?.full_name || 'เจ้าหน้าที่',
      isAdmin
    },
    branches: branchesList,
    myDispatchOrders: (myDispatchOrders || []).map(formatOrder),
    followUpOrders: (followUpOrders || []).map(formatOrder),
    completedOrders: (completedOrders || []).map(formatOrder),
    cancelledOrders: (cancelledOrders || []).filter(order => !hiddenOrderIds.has(order.id)).map(formatOrder)
  }
}

export async function markOrderItemsShipped(orderId: number, itemIds: number[], orderCode: string) {
  const cookieStore = await cookies()
  const supabase = createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, { 
    cookies: { getAll() { return cookieStore.getAll() } } 
  })
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Unauthorized" }

  const { data: profile } = await supabase.from('profiles').select('role, full_name').eq('user_id', user.id).maybeSingle()
  const staffRole = profile?.role || 'sale'
  const staffName = profile?.full_name || (staffRole === 'admin' ? 'Admin' : 'เจ้าหน้าที่')
  
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
    const { data: currOrder } = await supabase.from('orders').select('discount_snapshot').eq('id', orderId).single()
    const updatedSnap = {
      ...(currOrder?.discount_snapshot || {}),
      completed_at: new Date().toISOString(),
      delivered_at: new Date().toISOString(),
      completed_by_id: user?.id || null,
      completed_by_name: staffName,
      completed_by_role: staffRole,
      delivered_by_id: user?.id || null,
      delivered_by_name: staffName,
      delivered_by_role: staffRole
    }
    await supabase.from('orders').update({ 
      status: 'COMPLETED',
      discount_snapshot: updatedSnap
    }).eq('id', orderId)
  }

  revalidatePath('/sale/sales-history')
  revalidatePath('/sale/vanguard-dispatch')
  revalidatePath('/manager/sales-history')
  revalidatePath('/manager/vanguard-dispatch')
  revalidatePath('/vanguard-dispatch')
  revalidatePath('/sales-history')

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
      subtotal,
      discount_amount,
      vat_amount,
      total_amount,
      discount_snapshot,
      branches!orders_branch_fk ( branch_name ),
      profiles ( full_name, phone ),
      order_items (
        id, 
        product_id,
        qty, 
        item_status,
        price_at_sale,
        fulfill_branch_id,
        products!order_items_product_fk ( 
          id,
          name, sku, image_url, price, specs, width_cm, length_cm, thickness_cm, category_id,
          collection_groups ( product_sup ),
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

export async function approveAndCutStock(
  orderId: number, 
  orderCode: string, 
  items: any[], 
  customOrderCode?: string,
  forcePreOrderApproval?: boolean
) {
  const cookieStore = await cookies()
  const supabase = createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, { 
    cookies: { getAll() { return cookieStore.getAll() } } 
  })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Unauthorized" }

  const { data: profile } = await supabase.from('profiles').select('role, full_name').eq('user_id', user.id).maybeSingle()
  const isAdmin = profile?.role === 'admin'
  const staffRole = profile?.role || 'sale'
  const staffName = profile?.full_name || (isAdmin ? 'Admin' : 'พนักงานขาย')

  try {
    const { data: order } = await supabase
      .from('orders')
      .select('user_id, status, latitude, longitude, shipping_address, discount_snapshot')
      .eq('id', orderId)
      .single()

    if (!order) {
      return { success: false, error: "ไม่พบข้อมูลออเดอร์นี้ในระบบ" }
    }

    // 🔒 Security Check: เฉพาะผู้สร้าง Quotation หรือ Admin เท่านั้น
    if (!isAdmin && order.user_id && order.user_id !== user.id) {
      return { 
        success: false, 
        error: "ไม่มีสิทธิ์ทำรายการ: สิทธิ์การยืนยันรับชำระเงินและตัดสต็อก สงวนเฉพาะผู้เปิดบิล (Quotation) หรือ Admin เท่านั้น" 
      }
    }
      
    if (order.status !== 'PENDING') {
      return { success: false, error: "ออเดอร์นี้ถูกอนุมัติไปแล้ว ไม่สามารถตัดสต็อกซ้ำได้" }
    }

    const outOfStockSnapshot = (order?.discount_snapshot?.out_of_stock_products || []).map(String)
    const isPreOrderBill = Boolean(order?.discount_snapshot?.is_preorder)

    // ดึงรายการสินค้าทั้งหมดของบิลนี้จากฐานข้อมูล เพื่อให้ตัดสต็อกครบทุกสาขา (กรณีเป็นบิลขายข้ามสาขา)
    const { data: dbOrderItems } = await supabase
      .from('order_items')
      .select(`
        id,
        product_id,
        qty,
        fulfill_branch_id,
        products:products!order_items_product_fk (
          id,
          name,
          sku,
          category_id,
          specs
        )
      `)
      .eq('order_id', orderId)

    const itemsToProcess = (dbOrderItems && dbOrderItems.length > 0) ? dbOrderItems : items;

    // 🔍 1. ตรวจสอบสต็อกสดของทุกรายการก่อนทำการตัด เพื่อป้องกันการขายตัดหน้า และบล็อกไม้แผ่น
    const frontRunItems: Array<{ id: string; name: string; sku: string; requestedQty: number; currentStock: number }> = []
    const blockedWoodSlabs: Array<{ name: string; sku: string }> = []

    for (const item of itemsToProcess) {
      const productId = item.products?.id || item.product_id;
      const branchId = item.fulfill_branch_id;
      const qty = item.qty;
      const categoryId = item.products?.category_id;
      const isWoodSlab = categoryId === 'woodslab' || (!categoryId && item.products?.specs?.wood_type);

      if (!productId) continue;

      const { data: currentStock } = await supabase
        .from('stock')
        .select('id, qty')
        .eq('product_id', productId)
        .eq('branch_id', branchId)
        .maybeSingle()

      const currentStockQty = Number(currentStock?.qty) || 0;

      if (currentStockQty < qty) {
        // 1.1 ไม้แผ่น (Wood Slab): มีชิ้นเดียวในโลก ห้ามสต็อกติดลบเด็ดขาด 100%
        if (isWoodSlab) {
          blockedWoodSlabs.push({
            name: item.products?.name || item.name || 'ไม้แผ่น',
            sku: item.products?.sku || item.sku || '-'
          })
          continue;
        }

        // 1.2 สินค้าทั่วไป/Prop: ตรวจสอบว่าเป็นพรีออเดอร์ตั้งแต่วันเปิดบิลหรือไม่?
        const wasPreOrderAtStart = isPreOrderBill || outOfStockSnapshot.includes(String(productId))
        
        // ถ้าตอนเปิดบิลสต็อกเคยมีของ (ไม่ได้ตั้งใจพรีออเดอร์) แต่ตอนนี้ของดันหมด = โดนตัดหน้าสดๆ!
        if (!wasPreOrderAtStart && !forcePreOrderApproval) {
          frontRunItems.push({
            id: String(productId),
            name: item.products?.name || item.name || 'สินค้า',
            sku: item.products?.sku || item.sku || '-',
            requestedQty: qty,
            currentStock: currentStockQty
          })
        }
      }
    }

    // 🛑 1.3 ถ้ามีไม้แผ่นที่สต็อกไม่พอ -> บล็อกทันที 100% ห้ามขายเด็ดขาด
    if (blockedWoodSlabs.length > 0) {
      const slabList = blockedWoodSlabs.map(s => `• ${s.name} (SKU: ${s.sku})`).join('\n')
      return {
        success: false,
        isWoodSlabBlocked: true,
        error: `ไม่สามารถอนุมัติได้! สินค้าไม้แผ่นเป็นสินค้าชิ้นเดียวและสต็อกไม่พอ (ถูกตัดหน้าหรือขายไปแล้ว):\n${slabList}`
      }
    }

    // 🚨 1.4 ถ้ามีสินค้าที่เพิ่งโดนตัดหน้าสดๆ -> เด้งเตือนทันที ห้ามปล่อยผ่านเงียบๆ!
    if (frontRunItems.length > 0) {
      const itemList = frontRunItems.map(f => `• ${f.name} (สั่ง ${f.requestedQty} ชิ้น / ในคลังเหลือ ${f.currentStock} ชิ้น)`).join('\n')
      return {
        success: false,
        isFrontRun: true,
        frontRunItems,
        error: `⚠️ สินค้าเพิ่งถูกสาขาอื่นตัดสต็อกตัดหน้าไปเมื่อสักครู่!\n${itemList}\n\nของหน้าร้านชิ้นจริงหมดแล้ว ต้องการเปลี่ยนเป็นสั่งพรีออเดอร์ (สต็อกติดลบ) หรือไม่?`
      }
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

    // หากมีการยืนยันเปลี่ยนเป็นพรีออเดอร์ ให้บันทึกประวัติลง discount_snapshot
    if (forcePreOrderApproval) {
      const updatedSnap = {
        ...(order.discount_snapshot || {}),
        converted_to_preorder: true,
        converted_at: new Date().toISOString(),
        converted_by_id: user.id
      }
      await supabase.from('orders').update({ discount_snapshot: updatedSnap }).eq('id', orderId)
    }

    for (const item of itemsToProcess) {
      const productId = item.products?.id || item.product_id;
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
        .maybeSingle()

      const currentStockQty = Number(currentStock?.qty) || 0;
      const newStockQty = currentStockQty - qty;
      const isPreOrderCut = currentStockQty < qty;

      if (!currentStock?.id) {
        // หากยังไม่มีแถวสต็อกในสาขานี้ ให้สร้างขึ้นมาใหม่พร้อมยอดตัดสต็อก
        const { error: insertStockErr } = await supabase
          .from('stock')
          .insert({
            product_id: productId,
            branch_id: branchId,
            qty: newStockQty,
            updated_at: new Date().toISOString()
          })

        if (insertStockErr) {
          await supabase.from('stock').upsert({
            product_id: productId,
            branch_id: branchId,
            qty: newStockQty,
            updated_at: new Date().toISOString()
          }, { onConflict: 'product_id,branch_id' })
        }
      } else {
        await supabase
          .from('stock')
          .update({ qty: newStockQty, updated_at: new Date().toISOString() })
          .eq('id', currentStock.id)
      }

      const movementNote = isPreOrderCut
        ? `ชำระเงินใบขาย (พรีออเดอร์/สต็อกติดลบ บิล: ${finalOrderCode} โดย ${staffName} [${staffRole}])`
        : `ชำระเงินและอนุมัติใบขาย (บิล: ${finalOrderCode} โดย ${staffName} [${staffRole}])`;

      await supabase.from('stock_movements').insert({
        product_id_bigint: productId, 
        branch_id: branchId, 
        type: 'SALE', 
        qty: -Math.abs(qty), 
        note: movementNote, 
        ref_type: 'ORDER', 
        ref_id_bigint: orderId, 
        created_by: user.id
      })
    }

    const isStorefrontTakeaway = order.shipping_address?.startsWith('[รับหน้าร้าน]')

    const updatedSnap = {
      ...(order.discount_snapshot || {}),
      paid_at: (order.discount_snapshot as any)?.paid_at || new Date().toISOString(),
      approved_at: new Date().toISOString(),
      approved_by_id: user.id,
      approved_by_name: staffName,
      approved_by_role: staffRole,
      completed_at: isStorefrontTakeaway ? new Date().toISOString() : ((order.discount_snapshot as any)?.completed_at || null),
      delivered_at: isStorefrontTakeaway ? new Date().toISOString() : null,
      completed_by_id: user.id,
      completed_by_name: isStorefrontTakeaway ? staffName : null,
      completed_by_role: isStorefrontTakeaway ? staffRole : null,
      delivered_by_name: isStorefrontTakeaway ? staffName : null,
      delivered_by_role: isStorefrontTakeaway ? staffRole : null,
    }

    if (isStorefrontTakeaway) {
      await supabase.from('orders').update({ 
        status: 'COMPLETED',
        discount_snapshot: updatedSnap
      }).eq('id', orderId)
      await supabase.from('order_items').update({ item_status: 'DELIVERED' }).eq('order_id', orderId)
    } else {
      await supabase.from('orders').update({ 
        status: 'PROCESSING',
        discount_snapshot: updatedSnap
      }).eq('id', orderId)
    }

    // 🎟️ นับยอดการใช้งานโค้ดคูปอง (used_count) หลังจากชำระเงินและอนุมัติสำเร็จแล้วเท่านั้น
    const couponData = order.discount_snapshot?.coupon
    if (couponData) {
      const promoId = couponData.id
      const couponCode = couponData.code?.trim().toUpperCase()

      if (promoId) {
        const { data: promo } = await supabase
          .from('terra_collection_promotions')
          .select('id, used_count')
          .eq('id', promoId)
          .maybeSingle()

        if (promo) {
          await supabase
            .from('terra_collection_promotions')
            .update({ 
              used_count: (promo.used_count || 0) + 1,
              updated_at: new Date().toISOString()
            })
            .eq('id', promo.id)
        }
      } else if (couponCode) {
        const { data: promo } = await supabase
          .from('terra_collection_promotions')
          .select('id, used_count')
          .ilike('coupon_code', couponCode)
          .maybeSingle()

        if (promo) {
          await supabase
            .from('terra_collection_promotions')
            .update({ 
              used_count: (promo.used_count || 0) + 1,
              updated_at: new Date().toISOString()
            })
            .eq('id', promo.id)
        }
      }
    }

    revalidatePath('/sale/sales-history')
    revalidatePath('/sale/vanguard-dispatch')
    revalidatePath('/manager/sales-history')
    revalidatePath('/manager/vanguard-dispatch')
    revalidatePath('/vanguard-dispatch')
    revalidatePath('/sales-history')

    await clearPosCache()

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function cancelOrder(orderId: number, orderCode: string, items: any[], currentStatus: string, cancelReason?: string) {
  const cookieStore = await cookies()
  const supabase = createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, { 
    cookies: { getAll() { return cookieStore.getAll() } } 
  })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Unauthorized" }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('user_id', user.id)
    .maybeSingle()
  const isAdmin = profile?.role === 'admin'
  const staffRole = profile?.role || 'sale'
  const staffName = profile?.full_name || (isAdmin ? 'Admin' : 'เจ้าหน้าที่')

  try {
    const { data: orderToCancel } = await supabase
      .from('orders')
      .select('user_id, status, discount_snapshot')
      .eq('id', orderId)
      .single()

    if (!orderToCancel) {
      return { success: false, error: "ไม่พบข้อมูลออเดอร์นี้ในระบบ" }
    }

    // 🔒 Security Check: เฉพาะผู้สร้าง Quotation หรือ Admin เท่านั้น
    if (!isAdmin && orderToCancel.user_id && orderToCancel.user_id !== user.id) {
      return { 
        success: false, 
        error: "ไม่มีสิทธิ์ยกเลิกบิลนี้: สิทธิ์การยกเลิกสงวนเฉพาะผู้เปิดบิล (Quotation) หรือ Admin เท่านั้น" 
      }
    }

    if (orderToCancel.status === 'CANCELLED') {
      return { success: false, error: "บิลนี้ถูกยกเลิกและคืนสต็อกไปแล้ว" }
    }

    const actualStatus = orderToCancel?.status || currentStatus

    // 1. ถ้าบิลไม่อยู่สถานะ PENDING แปลว่าเคยหักสต็อกไปแล้ว (PROCESSING หรือ COMPLETED) ต้องบวกกลับคืน
    if (actualStatus !== 'PENDING') {
      // 🎟️ คืนสิทธิ์คูปอง หากบิลที่ตัดเงินไปแล้วถูกยกเลิก (ลด used_count คืน 1)
      const couponData = orderToCancel?.discount_snapshot?.coupon
      if (couponData) {
        const promoId = couponData.id
        const couponCode = couponData.code?.trim().toUpperCase()

        if (promoId) {
          const { data: promo } = await supabase
            .from('terra_collection_promotions')
            .select('id, used_count')
            .eq('id', promoId)
            .maybeSingle()

          if (promo && promo.used_count > 0) {
            await supabase
              .from('terra_collection_promotions')
              .update({ 
                used_count: Math.max(0, promo.used_count - 1),
                updated_at: new Date().toISOString()
              })
              .eq('id', promo.id)
          }
        } else if (couponCode) {
          const { data: promo } = await supabase
            .from('terra_collection_promotions')
            .select('id, used_count')
            .ilike('coupon_code', couponCode)
            .maybeSingle()

          if (promo && promo.used_count > 0) {
            await supabase
              .from('terra_collection_promotions')
              .update({ 
                used_count: Math.max(0, promo.used_count - 1),
                updated_at: new Date().toISOString()
              })
              .eq('id', promo.id)
          }
        }
      }
      for (const item of items) {
        const productId = item.products?.id || item.product_id;
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
            note: `คืนสต็อกเนื่องจากยกเลิกบิล (บิล: ${orderCode})${cancelReason ? ` - สาเหตุ: ${cancelReason.trim()}` : ''}`, 
            ref_type: 'ORDER', 
            ref_id_bigint: orderId, 
            created_by: user.id
          })
        }
      }
    }

    // 2. อัปเดตสถานะบิลและไอเทมเป็น CANCELLED พร้อมบันทึก Note ใน discount_snapshot
    const updatedSnapshot = {
      ...(orderToCancel?.discount_snapshot || {}),
      cancel_reason: cancelReason?.trim() || null,
      cancelled_at: new Date().toISOString(),
      cancelled_by_name: staffName,
      cancelled_by_role: staffRole,
      cancelled_by_id: user.id
    }

    await supabase.from('orders').update({ 
      status: 'CANCELLED',
      discount_snapshot: updatedSnapshot
    }).eq('id', orderId)
    await supabase.from('order_items').update({ item_status: 'CANCELLED' }).eq('order_id', orderId)
    
    // ยกเลิกรายการโอน (ถ้ามี)
    await supabase.from('stock_transfers')
      .update({ status: 'CANCELLED' })
      .like('note', `%${orderCode}%`)
      .in('status', ['PENDING', 'AWAITING_SHIPMENT', 'COMPLETED'])

    revalidatePath('/sale/sales-history')
    revalidatePath('/sale/vanguard-dispatch')
    revalidatePath('/manager/sales-history')
    revalidatePath('/manager/vanguard-dispatch')
    revalidatePath('/vanguard-dispatch')
    revalidatePath('/sales-history')

    await clearPosCache()

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function updateOrderCustomerInfo(orderId: number, data: {
  shipping_name?: string | null;
  shipping_phone?: string | null;
  shipping_address?: string | null;
}) {
  const cookieStore = await cookies()
  const supabase = createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, { 
    cookies: { getAll() { return cookieStore.getAll() } } 
  })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Unauthorized" }

  const { data: profile } = await supabase.from('profiles').select('role, full_name').eq('user_id', user.id).maybeSingle()
  const isAdmin = profile?.role === 'admin'
  const staffRole = profile?.role || 'sale'
  const staffName = profile?.full_name || (isAdmin ? 'Admin' : 'พนักงานขาย')

  try {
    const { data: order } = await supabase.from('orders').select('user_id, discount_snapshot').eq('id', orderId).single()
    if (!order) return { success: false, error: "ไม่พบข้อมูลออเดอร์นี้ในระบบ" }

    if (!isAdmin && order.user_id && order.user_id !== user.id) {
      return {
        success: false,
        error: "ไม่มีสิทธิ์แก้ไขข้อมูลผู้รับ: สงวนเฉพาะผู้เปิดบิลหรือ Admin เท่านั้น"
      }
    }

    const updatedSnap = {
      ...(order.discount_snapshot || {}),
      address_updated_by_name: staffName,
      address_updated_by_role: staffRole,
      address_updated_at: new Date().toISOString()
    }

    const { error } = await supabase
      .from('orders')
      .update({
        shipping_name: data.shipping_name?.trim() || null,
        shipping_phone: data.shipping_phone?.trim() || null,
        shipping_address: data.shipping_address?.trim() || null,
        discount_snapshot: updatedSnap
      })
      .eq('id', orderId)

    if (error) throw error

    revalidatePath('/sale/sales-history')
    revalidatePath('/sale/vanguard-dispatch')
    revalidatePath('/manager/sales-history')
    revalidatePath('/manager/vanguard-dispatch')
    revalidatePath('/vanguard-dispatch')
    revalidatePath('/sales-history')

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

