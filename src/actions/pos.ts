"use server"

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function getPosData() {
  const cookieStore = await cookies() 
  const supabase = createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    cookies: { getAll() { return cookieStore.getAll() } }
  })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Unauthorized" }

  const { data: profile } = await supabase.from('profiles').select('branch_id').eq('user_id', user.id).single()
  const branchId = profile?.branch_id || 1 

  const { data: branches, error: branchError } = await supabase.from('branches').select('id, branch_name').order('id', { ascending: true })
  const { data: collections, error: colError } = await supabase.from('collection_groups').select('product_sup')

  if (branchError || colError) {
    return { success: false, error: "เกิดข้อผิดพลาดในการโหลดข้อมูลสาขาหรือหมวดหมู่" }
  }

  // ✨ ทะลวงลิมิต 1000 แถวของ Supabase ด้วยลูปดึงข้อมูล
  let allProducts: any[] = []
  let keepFetching = true
  let offset = 0
  const limit = 1000

  while (keepFetching) {
    const { data: productsChunk, error: productError } = await supabase
      .from('products')
      .select(`
        id, name, sku, price, image_url, barcode,
        collection_groups ( product_sup ),
        stock ( branch_id, qty ),
        discount_rules (
          discounts ( id, name, discount_type, value, active )
        )
      `)
      .range(offset, offset + limit - 1) // สั่งดึงทีละ 1000 (เช่น 0-999, 1000-1999)

    if (productError) {
      return { success: false, error: "เกิดข้อผิดพลาดในการโหลดข้อมูลคลังสินค้า" }
    }

    if (productsChunk && productsChunk.length > 0) {
      allProducts = [...allProducts, ...productsChunk]
      offset += limit
      
      // ถ้าดึงมาแล้วได้ไม่ถึง 1000 แปลว่าหมดก๊อกแล้ว ให้หยุดลูป
      if (productsChunk.length < limit) {
        keepFetching = false
      }
    } else {
      keepFetching = false
    }
  }

  const uniqueCategories = Array.from(new Set(collections?.map(c => c.product_sup).filter(Boolean))).sort()

  const formattedProducts = allProducts.map(p => {
    const originalPrice = Number(p.price) || 0
    let finalPrice = originalPrice
    let discountPercentString = "" 
    let appliedDiscountId = null
    let appliedDiscountName = null

    const activeRule = p.discount_rules?.find((r: any) => r.discounts?.active === true)

    if (activeRule && activeRule.discounts) {
      const disc = activeRule.discounts
      const discValue = Number(disc.value) || 0
      
      appliedDiscountId = disc.id
      appliedDiscountName = disc.name

      if (disc.discount_type === 'FIXED') {
        finalPrice = Math.max(0, originalPrice - discValue)
        if (originalPrice > 0) discountPercentString = `-${Math.round((discValue / originalPrice) * 100)}%`
      } else if (disc.discount_type === 'PERCENT') {
        finalPrice = Math.max(0, originalPrice - (originalPrice * (discValue / 100)))
        discountPercentString = `-${discValue}%`
      }
    }

    return {
      id: p.id,
      name: p.name,
      sku: p.sku || '',
      original_price: originalPrice, 
      price: finalPrice,              
      discount_label: discountPercentString, 
      discount_id: appliedDiscountId,
      discount_name: appliedDiscountName,
      image_url: p.image_url,
      barcode: p.barcode,
      product_sup: p.collection_groups ? p.collection_groups.product_sup : null,
      stocks: p.stock || [] 
    }
  })

  return { success: true, products: formattedProducts, branches: branches || [], categories: uniqueCategories, branchId }
}

export interface CheckoutPayload {
  branchId: number; 
  subtotal: number;       
  discountAmount: number; 
  totalAmount: number;    
  saleMode: 'TAKE_AWAY' | 'DELIVERY';
  shippingName?: string | null;
  shippingPhone?: string | null;
  shippingAddress?: string | null;
  latitude?: number | null;  // ✨ เพื่มรับค่าละติจูด
  longitude?: number | null; // ✨ เพิ่มรับค่าลองจิจูด
  items: {
    productId: number; 
    qty: number; 
    priceAtSale: number; 
    originalPrice: number;
    fulfillBranchId: number;
    discountId?: number | null;
    discountName?: string | null;
    discountAmountPerPiece: number;
  }[];
}

export async function processCheckout(payload: CheckoutPayload) {
  const cookieStore = await cookies()
  const supabase = createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    cookies: { 
      getAll() { return cookieStore.getAll() },
      setAll(cookiesToSet) {
        try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch (error) {}
      }
    }
  })

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Unauthorized")

    const orderCode = `INV${Date.now()}`

    const usedDiscounts = payload.items
      .filter(item => item.discountId)
      .map(item => ({ id: item.discountId, name: item.discountName, amount_per_piece: item.discountAmountPerPiece }))
    // ✨ 0. เช็คสต็อกล่วงหน้ากันเหนียว (เวลาขายชนกัน)
    const outOfStockItems: string[] = []
    for (const item of payload.items) {
      const { data: stockCheck } = await supabase
        .from('stock')
        .select('qty')
        .eq('product_id', item.productId)
        .eq('branch_id', item.fulfillBranchId)
        .single()
        
      if (!stockCheck || stockCheck.qty < item.qty) {
        // ใส่ cartItemId เข้าไปใน list (ฝั่ง client ใช้ id เป็น string หรือ number)
        outOfStockItems.push(item.productId.toString())
      }
    }

    if (outOfStockItems.length > 0) {
      return { 
        success: false, 
        error: "สินค้าบางรายการสต็อกไม่พอ (อาจถูกซื้อตัดหน้า) ระบบได้อัปเดตสถานะในตะกร้าแล้ว", 
        outOfStockProductIds: outOfStockItems 
      }
    }
    
    // ✨ 1. เช็คหลังบ้านเลยว่า บิลนี้มีการดึงของสาขาอื่นมาด้วยไหม?
    const hasCrossBranchItems = payload.items.some(item => item.fulfillBranchId !== payload.branchId)

    // ✨ 2. บังคับสถานะบิลหลัก: ถ้าเซลล์กดจัดส่ง "หรือ" มีการดึงของข้ามสาขา บังคับบิลนี้เป็น PENDING ทันที
    const orderStatus = 'PENDING'

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        order_code: orderCode, 
        user_id: user.id, 
        branch_id: payload.branchId,
        subtotal: payload.subtotal, 
        discount_amount: payload.discountAmount, 
        total_amount: payload.totalAmount, 
        status: orderStatus, 
        device_type: 'WEB_ADMIN',
        discount_snapshot: usedDiscounts.length > 0 ? usedDiscounts : {}, 
        shipping_name: payload.shippingName || null,                      
        shipping_phone: payload.shippingPhone || null,
        shipping_address: payload.shippingAddress || null,
        latitude: payload.latitude || null,   // ✨ บันทึกค่าลงฐานข้อมูล
        longitude: payload.longitude || null  // ✨ บันทึกค่าลงฐานข้อมูล
      }).select('id').single()

    if (orderError) throw new Error("สร้างบิลไม่สำเร็จ: " + orderError.message)

    // ✨ 3. บังคับสถานะรายชิ้น (หัวใจหลักที่ทำให้บั๊ก!)
    const orderItems = payload.items.map(item => {
      // ถามก่อนว่าชิ้นนี้คือของสาขาเราเองใช่ไหม?
      const isMyBranchItem = item.fulfillBranchId === payload.branchId;
      
     // ❌ ลบหรือคอมเมนต์โค้ดบรรทัดเก่าทิ้งไปเลยครับ
      /*
      const itemStatus = isMyBranchItem 
        ? (payload.saleMode === 'TAKE_AWAY' ? 'DELIVERED' : 'PENDING_SHIPMENT') 
        : 'PENDING_SHIPMENT';
      */
     const itemStatus = 'PENDING_SHIPMENT';
      return {
        order_id: order.id, 
        product_id: item.productId, 
        qty: item.qty,
        price_at_sale: item.priceAtSale, 
        total_item_amount: item.priceAtSale * item.qty,
        fulfill_branch_id: item.fulfillBranchId,
        discount_id: item.discountId || null,
        discount_name: item.discountName || null,
        discount_amount_per_piece: item.discountAmountPerPiece,
        item_status: itemStatus // <--- ใช้สถานะรายชิ้นที่ถูกบังคับแล้ว
      }
    })
    
    const { error: itemsError } = await supabase.from('order_items').insert(orderItems)
    if (itemsError) throw new Error("บันทึกรายการสินค้าล้มเหลว: " + itemsError.message)

    // 4. แยกกลุ่มตัดสต็อก (เหมือนเดิม ไม่ต้องแก้)
    const localItems = payload.items.filter(item => item.fulfillBranchId === payload.branchId)
    const remoteItems = payload.items.filter(item => item.fulfillBranchId !== payload.branchId)

    // 4.1 สต็อกในสาขาตัวเอง (ปิดการตัดสต็อกอัตโนมัติชั่วคราว)
    for (const item of localItems) {
      // ❌ คอมเมนต์ส่วนนี้ทิ้งไปเลยครับ เพื่อไม่ให้มันไปลบยอดในตาราง stock
      /*
      const { data: currentStock } = await supabase.from('stock').select('id, qty').eq('product_id', item.productId).eq('branch_id', payload.branchId).single()
      if (!currentStock || currentStock.qty < item.qty) throw new Error(`สินค้าสต็อกไม่พอขาย (ID ${item.productId})`)
      await supabase.from('stock').update({ qty: currentStock.qty - item.qty, updated_at: new Date().toISOString() }).eq('id', currentStock.id)
      
      await supabase.from('stock_movements').insert({
        product_id_bigint: item.productId, branch_id: payload.branchId, type: 'SALE', 
        qty: -Math.abs(item.qty), note: `ออกใบขายหน้าร้าน (บิล: ${orderCode})`, ref_type: 'ORDER', ref_id_bigint: order.id, created_by: user.id
      })
      */
    }

// 4.2 สต็อกต่างสาขา (Drop Ship) 
    if (remoteItems.length > 0) {
      const groupedByBranch = remoteItems.reduce((acc, item) => {
        if (!acc[item.fulfillBranchId]) acc[item.fulfillBranchId] = []
        acc[item.fulfillBranchId].push(item)
        return acc
      }, {} as Record<number, typeof remoteItems>)

      for (const [remoteBranchId, items] of Object.entries(groupedByBranch)) {
        for (const item of items) {
          // ❌ คอมเมนต์การตัดสต็อกต่างสาขาออก
          /*
          const { data: rStock } = await supabase.from('stock').select('id, qty').eq('product_id', item.productId).eq('branch_id', remoteBranchId).single()
          if (!rStock || rStock.qty < item.qty) throw new Error(`สต็อกต่างสาขาไม่เพียงพอ กรุณาทำรายการใหม่`)
          await supabase.from('stock').update({ qty: rStock.qty - item.qty, updated_at: new Date().toISOString() }).eq('id', rStock.id)

          await supabase.from('stock_movements').insert({
            product_id_bigint: item.productId, branch_id: Number(remoteBranchId), type: 'CROSS_BRANCH_DELIVERY', 
            qty: -Math.abs(item.qty), note: `ออกใบขาย Drop Ship (บิล: ${orderCode})`, ref_type: 'ORDER', ref_id_bigint: order.id, created_by: user.id
          })
          */
        }

        // ✅ ส่วนด้านล่างนี้ (สร้าง transferCode และ insert ลง stock_transfers) ให้เปิดไว้เหมือนเดิมครับ
        const transferCode = `DP-AUTO-${Date.now()}`
        const { data: transferOrder, error: tfError } = await supabase
          .from('stock_transfers')
          .insert({
            transfer_code: transferCode,
            from_branch_id: Number(remoteBranchId),
            to_branch_id: payload.branchId, 
            status: 'AWAITING_SHIPMENT', 
            note: `[ใบเบิกแพ็คอัตโนมัติจากใบขาย ${orderCode}] \nผู้รับ: ${payload.shippingName} \nโทร: ${payload.shippingPhone} \nที่อยู่จัดส่ง: ${payload.shippingAddress}`,
            created_by: user.id
          }).select('id').single()

        if (tfError) throw new Error("ระบบสร้างใบแจ้งแพ็คของข้ามสาขาล้มเหลว")

        const transferItems = items.map(item => ({
          transfer_id: transferOrder.id,
          product_id: item.productId,
          qty: item.qty,
          transfer_qty: item.qty,
          item_status: 'AWAITING_SHIPMENT'
        }))
        await supabase.from('stock_transfer_items').insert(transferItems)
      }
    }

    return { success: true, orderCode }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getNearbyStock(productId: number, currentBranchId: number) {
  const cookieStore = await cookies() 
  const supabase = createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, { cookies: { getAll() { return cookieStore.getAll() } } })
  const { data, error } = await supabase.rpc('get_nearby_stock', { p_current_branch_id: currentBranchId, p_product_id: productId })
  if (error) return { success: false, error: error.message }
  return { success: true, data }
}