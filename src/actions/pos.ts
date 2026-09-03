"use server"

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export interface PosSetBundle {
  id: number;
  name: string;
  categoryName: string;
  imageUrl: string | null;
  items: any[];
  totalOriginalPrice: number;
  totalPrice: number;
  discountAmount: number;
  discountPercent: number;
  promoId?: string;
  promoTitle?: string;
}

// ✨ ระบบ In-Memory Cache เพื่อประหยัด Egress Data และลดการยิง Query ซ้ำซ้อนไปที่ Supabase
interface PosCache {
  timestamp: number;
  products: any[];
  branches: any[];
  categories: any[];
  sets: PosSetBundle[];
}

let posCache: PosCache | null = null;
const CACHE_TTL = 3 * 60 * 1000; // แคชไว้ 3 นาที

export async function clearPosCache() {
  posCache = null;
}

export async function getPosData(forceRefresh: boolean = false) {
  const cookieStore = await cookies() 
  const supabase = createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    cookies: { getAll() { return cookieStore.getAll() } }
  })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Unauthorized" }

  const { data: profile } = await supabase.from('profiles').select('branch_id').eq('user_id', user.id).single()
  const branchId = profile?.branch_id || 1 

  // ✨ ถ้ามีแคชและยังไม่หมดอายุ คืนค่าจากแคชทันทีใน < 1ms! ไม่ยิง Supabase เลย
  const now = Date.now();
  if (!forceRefresh && posCache && (now - posCache.timestamp < CACHE_TTL)) {
    return { 
      success: true, 
      products: posCache.products, 
      branches: posCache.branches, 
      categories: posCache.categories, 
      sets: posCache.sets || [],
      branchId,
      fromCache: true 
    }
  }

  const { data: branches, error: branchError } = await supabase.from('branches').select('id, branch_name').order('id', { ascending: true })
  const { data: collections, error: colError } = await supabase
    .from('collection_groups')
    .select('product_sup')
    .ilike('tag', '%prop%')

  if (branchError || colError) {
    return { success: false, error: "เกิดข้อผิดพลาดในการโหลดข้อมูลสาขาหรือหมวดหมู่" }
  }

  // ✨ ดึงเฉพาะสินค้าหน้าเว็บ (category_id = 'prop') พร้อมบีบอัดฟิลด์ที่จำเป็น
  let allProducts: any[] = []
  let keepFetching = true
  let offset = 0
  const limit = 1000

  while (keepFetching) {
    const { data: productsChunk, error: productError } = await supabase
      .from('products')
      .select(`
        id, name, sku, price, image_url, barcode, specs,
        collection_groups ( product_sup, tag ),
        stock ( branch_id, qty ),
        discount_rules (
          discounts ( id, name, discount_type, value, active )
        )
      `)
      .eq('category_id', 'prop')
      .order('id', { ascending: true })
      .range(offset, offset + limit - 1)

    if (productError) {
      return { success: false, error: "เกิดข้อผิดพลาดในการโหลดข้อมูลคลังสินค้า" }
    }

    if (productsChunk && productsChunk.length > 0) {
      allProducts = [...allProducts, ...productsChunk]
      offset += limit
      
      if (productsChunk.length < limit) {
        keepFetching = false
      }
    } else {
      keepFetching = false
    }
  }

  const uniqueCategories = Array.from(new Set(collections?.map(c => (c.product_sup || '').trim()).filter(Boolean))).sort()

  const formattedProducts = allProducts
    .filter(p => !p.collection_groups || !p.collection_groups.tag || p.collection_groups.tag.toLowerCase().includes('prop'))
    .map(p => {
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
      stocks: p.stock || [],
      // ✨ ประหยัด RAM และ Network Payload: ส่งเฉพาะฟิลด์ material ที่หน้า POS ใช้จริง
      specs: p.specs?.material ? { material: p.specs.material } : {}
    }
  })

  // ✨ ดึงข้อมูลเซ็ตสินค้าที่ผูกไว้ใน Web Gallery (journal_images)
  const { data: linkedImages } = await supabase
    .from('journal_images')
    .select(`
      id,
      image_url,
      alt_text,
      sort_order,
      journal_categories ( id, title_th, title_en ),
      journal_image_products ( product_id )
    `)
    .order('sort_order', { ascending: true })

  // ดึงโปรโมชั่นเซ็ตที่ Active จาก terra_collection_promotions
  const nowIso = new Date().toISOString()
  const { data: activeSetPromos } = await supabase
    .from('terra_collection_promotions')
    .select('*')
    .eq('is_active', true)
    .eq('trigger_type', 'auto')

  const validSetPromos = (activeSetPromos || []).filter(p => {
    if (p.start_date && p.start_date > nowIso) return false
    if (p.end_date && p.end_date < nowIso) return false
    if (p.usage_limit && p.used_count >= p.usage_limit) return false
    return true
  })

  // Map สินค้าตาม ID เพื่อให้ค้นหาได้ไว O(1)
  const productMap = new Map<number, any>()
  formattedProducts.forEach(p => productMap.set(p.id, p))

  const setBundles: PosSetBundle[] = []
  const setsWithProducts = (linkedImages || []).filter(img => img.journal_image_products && img.journal_image_products.length > 0)

  for (const s of setsWithProducts) {
    const pIds: number[] = s.journal_image_products.map((p: any) => Number(p.product_id)).filter((id: number) => !isNaN(id))
    const setProducts = pIds.map(id => productMap.get(id)).filter(Boolean)
    
    // แสดงเฉพาะเซ็ตที่มีสินค้าอยู่ในระบบจริง
    if (setProducts.length === 0) continue

    const jCat: any = Array.isArray(s.journal_categories) ? s.journal_categories[0] : s.journal_categories
    const catName = jCat?.title_th || jCat?.title_en || 'เซ็ตตกแต่ง'
    const imgLabel = s.alt_text || `เซ็ต #${s.id}`
    const setName = `${catName} — ${imgLabel} (${setProducts.length} ชิ้น)`

    const totalOriginalPrice = setProducts.reduce((sum, p) => sum + (Number(p.original_price) || 0), 0)
    let totalPrice = setProducts.reduce((sum, p) => sum + (Number(p.price) || 0), 0)
    let discountPercent = 0
    let discountAmount = 0
    let promoId: string | undefined
    let promoTitle: string | undefined

    const matchedPromo = validSetPromos.find(p => String(p.collection_group_id) === String(s.id))
    if (matchedPromo) {
      discountPercent = Number(matchedPromo.discount_value) || 0
      promoId = matchedPromo.id
      promoTitle = matchedPromo.title

      let promoDiscount = (totalPrice * discountPercent) / 100
      if (matchedPromo.max_discount_amount && promoDiscount > Number(matchedPromo.max_discount_amount)) {
        promoDiscount = Number(matchedPromo.max_discount_amount)
      }
      discountAmount = Math.round(promoDiscount)
      totalPrice = Math.max(0, totalPrice - discountAmount)
    }

    setBundles.push({
      id: s.id,
      name: setName,
      categoryName: catName,
      imageUrl: s.image_url || null,
      items: setProducts,
      totalOriginalPrice,
      totalPrice,
      discountAmount,
      discountPercent,
      promoId,
      promoTitle
    })
  }

  // บันทึกลงแคชเพื่อไม่ให้ต้องยิงซ้ำ
  posCache = {
    timestamp: now,
    products: formattedProducts,
    branches: branches || [],
    categories: uniqueCategories,
    sets: setBundles
  }

  return { 
    success: true, 
    products: formattedProducts, 
    branches: branches || [], 
    categories: uniqueCategories, 
    sets: setBundles,
    branchId 
  }
}

export async function validatePosCoupon(code: string, currentSubtotal: number, eligibleSubtotal?: number) {
  if (!code || !code.trim()) {
    return { success: false, error: "กรุณากรอกรหัสคูปอง" }
  }
  const cleanCode = code.trim().toUpperCase()
  const cookieStore = await cookies()
  const supabase = createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    cookies: { getAll() { return cookieStore.getAll() } }
  })
  const now = new Date().toISOString()

  // 🏷️ ฐานคำนวณส่วนลด: ถ้ามีการส่ง eligibleSubtotal มา ให้คิดส่วนลดเฉพาะสินค้าที่ไม่มีส่วนลดรายชิ้น
  const calcBase = eligibleSubtotal !== undefined ? eligibleSubtotal : currentSubtotal

  if (calcBase <= 0) {
    return { success: false, error: "สินค้าในบิลมีส่วนลดรายชิ้นอยู่แล้ว จึงไม่สามารถใช้โค้ดลดร่วมได้ครับ" }
  }

  // 1. ตรวจสอบจาก terra_collection_promotions (Global Coupon Code)
  const { data: terraCoupons } = await supabase
    .from('terra_collection_promotions')
    .select('*')
    .ilike('coupon_code', cleanCode)
    .eq('is_active', true)

  if (terraCoupons && terraCoupons.length > 0) {
    const promo = terraCoupons[0]
    if (promo.start_date && promo.start_date > now) {
      return { success: false, error: "คูปองนี้ยังไม่เริ่มใช้งาน" }
    }
    if (promo.end_date && promo.end_date < now) {
      return { success: false, error: "คูปองนี้หมดอายุแล้ว" }
    }
    if (promo.usage_limit && promo.used_count >= promo.usage_limit) {
      return { success: false, error: "คูปองนี้ถูกใช้งานครบจำนวนสิทธิ์แล้ว" }
    }
    const minSpend = Number(promo.min_spend || 0)
    if (minSpend > 0 && currentSubtotal < minSpend) {
      return { 
        success: false, 
        error: `ยอดซื้อต้องครบ ฿${minSpend.toLocaleString()} ขึ้นไป (ยอดปัจจุบัน ฿${currentSubtotal.toLocaleString()})` 
      }
    }

    let discountAmount = 0
    if (promo.discount_type === 'percentage') {
      discountAmount = (calcBase * Number(promo.discount_value)) / 100
      if (promo.max_discount_amount && discountAmount > Number(promo.max_discount_amount)) {
        discountAmount = Number(promo.max_discount_amount)
      }
    } else {
      discountAmount = Math.min(calcBase, Number(promo.discount_value))
    }

    return {
      success: true,
      coupon: {
        id: promo.id,
        code: cleanCode,
        title: promo.title,
        discountType: promo.discount_type,
        discountValue: Number(promo.discount_value),
        discountAmount: Math.round(discountAmount),
        source: 'terra'
      }
    }
  }

  // 2. ตรวจสอบจากตาราง discounts (POS Discount Code)
  const { data: posDiscounts } = await supabase
    .from('discounts')
    .select('*')
    .ilike('code', cleanCode)
    .eq('active', true)

  if (posDiscounts && posDiscounts.length > 0) {
    const disc = posDiscounts[0]
    let discountAmount = 0
    if (disc.discount_type === 'PERCENT') {
      discountAmount = (calcBase * Number(disc.value)) / 100
    } else {
      discountAmount = Math.min(calcBase, Number(disc.value))
    }

    return {
      success: true,
      coupon: {
        id: disc.id,
        code: cleanCode,
        title: disc.name,
        discountType: disc.discount_type === 'PERCENT' ? 'percentage' : 'fixed_amount',
        discountValue: Number(disc.value),
        discountAmount: Math.round(discountAmount),
        source: 'pos'
      }
    }
  }

  return { success: false, error: "ไม่พบรหัสคูปองนี้ หรือคูปองหมดอายุแล้ว" }
}

export interface CheckoutPayload {
  orderId?: number;          // ✨ รองรับการแก้ไขบิลเดิม
  orderCode?: string;        // ✨ รองรับการแก้ไขบิลเดิม
  customOrderCode?: string | null; // ✨ รหัสออเดอร์ที่ผู้ใช้กรอกเอง
  branchId: number; 
  subtotal: number;       
  discountAmount: number; 
  totalAmount: number;    
  saleMode: 'TAKE_AWAY' | 'DELIVERY';
  shippingName?: string | null;
  shippingPhone?: string | null;
  shippingAddress?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  companyNameTh?: string | null;     // ✨ ชื่อบริษัท (ไทย)
  companyNameEn?: string | null;     // ✨ ชื่อบริษัท (อังกฤษ)
  companyAddress?: string | null;  // ✨ เพิ่มข้อมูลบริษัท
  taxId?: string | null;           // ✨ เพิ่มข้อมูลบริษัท
  specialDiscountPercent?: number;  // ✨ ส่วนลดพิเศษ %
  specialDiscountBaht?: number;     // ✨ ส่วนลดพิเศษ บาท
  couponCode?: string | null;       // 🎟️ โค้ดคูปอง
  couponDiscountAmount?: number;    // 🎟️ มูลค่าส่วนลดคูปอง
  setDiscountAmount?: number;       // 📦 มูลค่าส่วนลดเซ็ต
  appliedSetPromos?: any[];         // 📦 ข้อมูลเซ็ตโปรโมชั่นที่ได้รับ
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

    const previousOrderCode = payload.orderCode?.trim()
    const requestedOrderCode = payload.customOrderCode?.trim()
    const orderCode = requestedOrderCode || previousOrderCode || `INV${Date.now()}`

    const usedDiscounts = payload.items
      .filter(item => item.discountId)
      .map(item => ({ id: item.discountId, name: item.discountName, amount_per_piece: item.discountAmountPerPiece }))

    const discountSnapshot: any = {
      item_discounts: usedDiscounts,
      special_discount: {
        percent: payload.specialDiscountPercent || 0,
        baht: payload.specialDiscountBaht || 0
      }
    }
    if (payload.couponCode) {
      discountSnapshot.coupon = {
        code: payload.couponCode,
        discount_amount: payload.couponDiscountAmount || 0
      }
    }
    if (payload.appliedSetPromos && payload.appliedSetPromos.length > 0) {
      discountSnapshot.set_promotions = payload.appliedSetPromos
      discountSnapshot.set_discount_amount = payload.setDiscountAmount || 0
    }
    // ✨ 0. เช็คสต็อกล่วงหน้ากันเหนียว
    const outOfStockItems: string[] = []
    
    // ดึงสต็อกทั้งหมดของสินค้าที่อยู่ในตะกร้าในครั้งเดียว (ลดเวลาการทำงาน)
    const productIds = payload.items.map(item => item.productId)
    const { data: allStocks } = await supabase
      .from('stock')
      .select('product_id, branch_id, qty')
      .in('product_id', productIds)

    for (const item of payload.items) {
      const stockCheck = allStocks?.find(s => s.product_id === item.productId && s.branch_id === item.fulfillBranchId)
      if (!stockCheck || stockCheck.qty < item.qty) {
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

    let order;
    if (payload.orderId) {
      // 🛠️ อัปเดตบิลเก่าที่ยัง PENDING
      const { data: existingOrder } = await supabase.from('orders').select('status').eq('id', payload.orderId).single()
      if (existingOrder?.status !== 'PENDING') throw new Error("บิลนี้ชำระเงินหรือประมวลผลไปแล้ว ไม่สามารถแก้ไขได้")

      // อัปเดตหัวบิลและตรวจเลขซ้ำให้ผ่านก่อน จึงค่อยลบ/สร้างรายการสินค้าใหม่
      const updateRes = await supabase
        .from('orders')
        .update({
          order_code: orderCode,
          subtotal: payload.subtotal, 
          discount_amount: payload.discountAmount, 
          total_amount: payload.totalAmount, 
          discount_snapshot: discountSnapshot, 
          shipping_name: payload.shippingName || null,                      
          shipping_phone: payload.shippingPhone || null,
          shipping_address: payload.shippingAddress || null,
          latitude: payload.latitude || null,   
          longitude: payload.longitude || null,
          company_name_th: payload.companyNameTh || null,
          company_name_en: payload.companyNameEn || null,
          company_address: payload.companyAddress || null,
          tax_id: payload.taxId || null,
          special_discount_percent: payload.specialDiscountPercent || 0,
          special_discount_baht: payload.specialDiscountBaht || 0
        })
        .eq('id', payload.orderId)
        .select('id').single()

      if (updateRes.error) {
        if (updateRes.error.code === '23505') {
          throw new Error("เลข Invoice นี้มีอยู่ในระบบแล้ว กรุณาใช้เลขอื่น")
        }
        throw new Error("อัปเดตบิลไม่สำเร็จ: " + updateRes.error.message)
      }
      order = updateRes.data

      const [deleteRes, oldTransfersRes] = await Promise.all([
        supabase.from('order_items').delete().eq('order_id', payload.orderId),
        supabase.from('stock_transfers').select('id').like('note', `%${previousOrderCode || orderCode}%`)
      ])
      if (deleteRes.error) throw new Error("ล้างรายการสินค้าเดิมไม่สำเร็จ: " + deleteRes.error.message)
      
      // ลบ stock_transfers ของเดิมทิ้งก่อน (ถ้ามี)
      const oldTransfers = oldTransfersRes.data
      if (oldTransfers && oldTransfers.length > 0) {
        const tIds = oldTransfers.map(t => t.id)
        // สามารถรอให้ลบเสร็จได้เลย เพราะเป็นขั้นตอนต่อเนื่อง
        await supabase.from('stock_transfer_items').delete().in('transfer_id', tIds)
        await supabase.from('stock_transfers').delete().in('id', tIds)
      }
    } else {
      // 🆕 สร้างบิลใหม่
      const { data, error: insertError } = await supabase
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
          discount_snapshot: discountSnapshot, 
          shipping_name: payload.shippingName || null,                      
          shipping_phone: payload.shippingPhone || null,
          shipping_address: payload.shippingAddress || null,
          latitude: payload.latitude || null,   
          longitude: payload.longitude || null,
          company_name_th: payload.companyNameTh || null,
          company_name_en: payload.companyNameEn || null,
          company_address: payload.companyAddress || null,
          tax_id: payload.taxId || null,
          special_discount_percent: payload.specialDiscountPercent || 0,
          special_discount_baht: payload.specialDiscountBaht || 0
        }).select('id').single()

      if (insertError) {
         if (insertError.code === '23505') {
            throw new Error("รหัสออเดอร์นี้มีอยู่ในระบบแล้ว กรุณาใช้รหัสอื่น")
         }
         throw new Error("สร้างบิลไม่สำเร็จ: " + insertError.message)
      }
      order = data
    }

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
    
    const insertOrderItemsPromise = supabase.from('order_items').insert(orderItems)
    const pendingPromises: PromiseLike<any>[] = [insertOrderItemsPromise]

    // 4. แยกกลุ่มตัดสต็อก
    const localItems = payload.items.filter(item => item.fulfillBranchId === payload.branchId)
    const remoteItems = payload.items.filter(item => item.fulfillBranchId !== payload.branchId)

    // 4.1 สต็อกในสาขาตัวเอง (ปิดการตัดสต็อกอัตโนมัติชั่วคราว)
    // สำหรับ localItems ยังคอมเมนต์ไว้อยู่ ไม่ต้องทำอะไร

    // 4.2 สต็อกต่างสาขา (Drop Ship) 
    if (remoteItems.length > 0) {
      const groupedByBranch = remoteItems.reduce((acc, item) => {
        if (!acc[item.fulfillBranchId]) acc[item.fulfillBranchId] = []
        acc[item.fulfillBranchId].push(item)
        return acc
      }, {} as Record<number, typeof remoteItems>)

      for (const [remoteBranchId, items] of Object.entries(groupedByBranch)) {
        // ประมวลผลแต่ละสาขาแบบขนานกัน
        const processRemoteBranch = async () => {
          const transferCode = `DP-AUTO-${Date.now()}-${remoteBranchId}`
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
        pendingPromises.push(processRemoteBranch())
      }
    }

    // รอให้ทั้ง order_items และ stock_transfers ทำงานเสร็จพร้อมกัน
    const results = await Promise.all(pendingPromises)
    const itemsError = results[0]?.error
    if (itemsError) throw new Error("บันทึกรายการสินค้าล้มเหลว: " + itemsError.message)

    // ✨ เคลียร์แคชเพื่อให้รอบต่อไปดึงข้อมูลสต็อกใหม่ล่าสุด
    posCache = null

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

export async function getOrderForEdit(orderCode: string) {
  const cookieStore = await cookies()
  const supabase = createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, { 
    cookies: { getAll() { return cookieStore.getAll() } } 
  })

  const { data: order, error } = await supabase
    .from('orders')
    .select(`
      id, order_code, status, shipping_name, shipping_phone, shipping_address, latitude, longitude, company_name_th, company_name_en, company_address, tax_id, special_discount_percent, special_discount_baht,
      order_items (
        id, product_id, qty, price_at_sale, fulfill_branch_id, discount_id, discount_name, discount_amount_per_piece,
        branches!order_items_fulfill_branch_fk ( branch_name )
      )
    `)
    .eq('order_code', orderCode)
    .single()

  if (error || !order) return { success: false, error: error?.message || "ไม่พบบิลนี้ในระบบ" }
  if (order.status !== 'PENDING') return { success: false, error: "บิลนี้ชำระเงินหรือประมวลผลไปแล้ว ไม่สามารถแก้ไขได้" }

  return { success: true, order }
}
