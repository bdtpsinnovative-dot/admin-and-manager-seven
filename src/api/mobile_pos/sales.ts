import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"

interface MobileUser {
  userId: string
  branchId: number
}

interface CartItemInput {
  product_id: number
  quantity: number
  fulfill_branch_id?: number
}

interface QuoteInput {
  customer_name?: string
  customer_phone?: string
  customer_address?: string
  company_name?: string
  tax_id?: string
  items?: CartItemInput[]
}

interface CheckoutInput {
  customer_name?: string
  customer_phone?: string
  customer_address?: string
  company_name?: string
  tax_id?: string
  sale_mode?: "TAKE_AWAY" | "DELIVERY"
  payment_method?: string // 'CASH' | 'TRANSFER' | 'CREDIT_CARD'
  coupon_code?: string
  special_discount_baht?: number
  items?: CartItemInput[]
}

interface ProductStockRow {
  branch_id: number
  qty: number | null
}

interface ProductDiscountRule {
  discounts?:
    | {
        id: number
        name: string
        discount_type: "PERCENT" | "FIXED" | string
        value: number
        active: boolean
      }
    | {
        id: number
        name: string
        discount_type: "PERCENT" | "FIXED" | string
        value: number
        active: boolean
      }[]
    | null
}

interface ProductRow {
  id: number
  name: string
  sku?: string | null
  barcode?: string | null
  price: number | null
  image_url?: string | null
  collection_groups?: {
    product_sup?: string | null
    image_url?: string | null
    cover_image_url?: string | null
  } | null
  stock?: ProductStockRow[] | null
  discount_rules?: ProductDiscountRule[] | null
}

function fail(message: string, status: number) {
  return NextResponse.json({ success: false, message }, { status })
}

/** Helper to validate and calculate coupon discounts across both promotion tables */
async function evaluateCoupon(code: string, currentSubtotal: number) {
  if (!code || !code.trim()) {
    return { success: false, error: "กรุณาระบุรหัสคูปอง" }
  }
  const cleanCode = code.trim().toUpperCase()
  const now = new Date().toISOString()

  // 1. ตรวจสอบจาก terra_collection_promotions (Global Campaign Coupon)
  const { data: terraCoupons, error: terraErr } = await supabaseAdmin
    .from("terra_collection_promotions")
    .select("*")
    .ilike("coupon_code", cleanCode)
    .eq("is_active", true)

  if (!terraErr && terraCoupons && terraCoupons.length > 0) {
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
        error: `ยอดซื้อต้องครบ ฿${minSpend.toLocaleString()} ขึ้นไป (ยอดปัจจุบัน ฿${currentSubtotal.toLocaleString()})`,
      }
    }

    let discountAmount = 0
    if (promo.discount_type === "percentage") {
      discountAmount = (currentSubtotal * Number(promo.discount_value)) / 100
      if (promo.max_discount_amount && discountAmount > Number(promo.max_discount_amount)) {
        discountAmount = Number(promo.max_discount_amount)
      }
    } else {
      discountAmount = Math.min(currentSubtotal, Number(promo.discount_value))
    }

    return {
      success: true,
      coupon: {
        id: promo.id,
        code: cleanCode,
        title: promo.title,
        discount_type: promo.discount_type,
        discount_value: Number(promo.discount_value),
        discount_amount: Math.round(discountAmount),
        source: "terra",
      },
    }
  }

  // 2. ตรวจสอบจากตาราง discounts (POS Discount Code)
  const { data: posDiscounts, error: posErr } = await supabaseAdmin
    .from("discounts")
    .select("*")
    .ilike("code", cleanCode)
    .eq("active", true)

  if (!posErr && posDiscounts && posDiscounts.length > 0) {
    const disc = posDiscounts[0]
    let discountAmount = 0
    if (disc.discount_type === "PERCENT") {
      discountAmount = (currentSubtotal * Number(disc.value)) / 100
    } else {
      discountAmount = Math.min(currentSubtotal, Number(disc.value))
    }

    return {
      success: true,
      coupon: {
        id: disc.id,
        code: cleanCode,
        title: disc.name,
        discount_type: disc.discount_type === "PERCENT" ? "percentage" : "fixed_amount",
        discount_value: Number(disc.value),
        discount_amount: Math.round(discountAmount),
        source: "pos",
      },
    }
  }

  return { success: false, error: "ไม่พบรหัสคูปองนี้ หรือคูปองหมดอายุแล้ว" }
}

export const MobilePosSalesController = {
  /** Read-only catalogue for the POS grid with server-validated prices, stock & active discounts */
  async products(user: MobileUser) {
    try {
      const [{ data: productsData, error: productsError }, { data: branchesData }] = await Promise.all([
        supabaseAdmin
          .from("products")
          .select(`
            id, name, sku, price, image_url, barcode,
            collection_groups ( product_sup, tag, image_url, cover_image_url ),
            stock ( branch_id, qty ),
            discount_rules (
              discounts ( id, name, discount_type, value, active )
            )
          `)
          .eq("category_id", "prop")
          .order("id", { ascending: true })
          .range(0, 999),
        supabaseAdmin
          .from("branches")
          .select("id, branch_name")
          .order("id", { ascending: true }),
      ])

      if (productsError) throw productsError

      const branchMap = new Map<number, string>()
      const branches = (branchesData || []).map((b: any) => {
        const id = Number(b.id)
        const name = String(b.branch_name || `สาขา #${id}`)
        branchMap.set(id, name)
        return { id, branch_name: name }
      })

      const products = ((productsData || []) as unknown as ProductRow[]).map((product) => {
        const originalPrice = Number(product.price) || 0
        let finalPrice = originalPrice
        let discountLabel = ""
        let discountId: number | null = null
        let discountName: string | null = null

        const activeRule = product.discount_rules?.find((r) => {
          const d = Array.isArray(r.discounts) ? r.discounts[0] : r.discounts
          return d?.active === true
        })
        const disc = Array.isArray(activeRule?.discounts) ? activeRule?.discounts[0] : activeRule?.discounts

        if (disc) {
          const discValue = Number(disc.value) || 0
          discountId = disc.id
          discountName = disc.name

          if (disc.discount_type === "FIXED") {
            finalPrice = Math.max(0, originalPrice - discValue)
            if (originalPrice > 0) discountLabel = `-${Math.round((discValue / originalPrice) * 100)}%`
          } else if (disc.discount_type === "PERCENT") {
            finalPrice = Math.max(0, originalPrice - originalPrice * (discValue / 100))
            discountLabel = `-${discValue}%`
          }
        }

        const colGroup = Array.isArray(product.collection_groups)
          ? product.collection_groups[0]
          : product.collection_groups
        const resolvedImageUrl = product.image_url || colGroup?.image_url || colGroup?.cover_image_url || null

        const currentStock = Array.isArray(product.stock)
          ? product.stock.find((item) => item.branch_id === user.branchId)
          : null
        const ownBranchQty = Number(currentStock?.qty) || 0

        const detailedStocks = Array.isArray(product.stock)
          ? product.stock.map((item) => ({
              branch_id: item.branch_id,
              branch_name: branchMap.get(item.branch_id) || `สาขา #${item.branch_id}`,
              qty: Number(item.qty) || 0,
              is_own_branch: item.branch_id === user.branchId,
            }))
          : []

        const otherBranchQty = detailedStocks
          .filter((item) => !item.is_own_branch)
          .reduce((sum, item) => sum + item.qty, 0)
        const totalStock = ownBranchQty + otherBranchQty

        return {
          id: product.id,
          name: product.name,
          sku: product.sku || "",
          barcode: product.barcode || "",
          original_price: originalPrice,
          price: finalPrice,
          discount_label: discountLabel,
          discount_id: discountId,
          discount_name: discountName,
          image_url: resolvedImageUrl,
          product_sup: colGroup?.product_sup || "อื่น ๆ",
          available_qty: ownBranchQty,
          own_branch_qty: ownBranchQty,
          other_branch_qty: otherBranchQty,
          total_stock: totalStock,
          stocks: detailedStocks,
        }
      })

      const categories = [...new Set(products.map((product) => product.product_sup))].sort()
      return NextResponse.json({
        success: true,
        products,
        categories,
        branches,
        branch_id: user.branchId,
        branch_name: branchMap.get(user.branchId) || "สาขาเรา",
      })
    } catch (error) {
      console.error("Mobile POS products error:", error)
      return fail("ไม่สามารถโหลดสินค้าได้ กรุณาลองใหม่อีกครั้ง", 500)
    }
  },

  /** Validate a promotional coupon code against global and POS discount tables */
  async validateCoupon(user: MobileUser, payload: { code?: string; subtotal?: number }) {
    try {
      const code = String(payload?.code || "")
      const subtotal = Number(payload?.subtotal || 0)
      if (!code.trim()) {
        return fail("กรุณาระบุรหัสคูปอง", 422)
      }
      const result = await evaluateCoupon(code, subtotal)
      if (!result.success) {
        return fail(result.error || "รหัสคูปองไม่ถูกต้อง", 422)
      }
      return NextResponse.json({ success: true, coupon: result.coupon })
    } catch (error) {
      console.error("Mobile POS coupon validation error:", error)
      return fail("เกิดข้อผิดพลาดในการตรวจสอบคูปอง", 500)
    }
  },

  /** POS Direct Checkout: creates an official order with INV... code, item records, and transfer tickets */
  async checkout(user: MobileUser, payload: CheckoutInput) {
    const rawItems = Array.isArray(payload.items) ? payload.items : []
    if (rawItems.length === 0) return fail("กรุณาเลือกสินค้าอย่างน้อย 1 รายการ", 422)

    const itemsMap = new Map<string, { productId: number; qty: number; fulfillBranchId: number }>()
    for (const rawItem of rawItems) {
      const productId = Number(rawItem?.product_id)
      const quantity = Number(rawItem?.quantity)
      const fulfillBranchId = Number(rawItem?.fulfill_branch_id) || user.branchId

      if (!Number.isInteger(productId) || !Number.isInteger(quantity) || quantity < 1) {
        return fail("รายการสินค้าไม่ถูกต้อง", 422)
      }
      const key = `${productId}_${fulfillBranchId}`
      const existing = itemsMap.get(key)
      if (existing) {
        existing.qty += quantity
      } else {
        itemsMap.set(key, { productId, qty: quantity, fulfillBranchId })
      }
    }

    try {
      const productIds = [...new Set([...itemsMap.values()].map((v) => v.productId))]
      const { data: products, error: productsError } = await supabaseAdmin
        .from("products")
        .select(`
          id, name, price,
          stock ( branch_id, qty ),
          discount_rules (
            discounts ( id, name, discount_type, value, active )
          )
        `)
        .eq("category_id", "prop")
        .in("id", productIds)

      if (productsError) throw productsError
      if (!products || products.length !== productIds.length) {
        return fail("พบสินค้าที่ไม่สามารถทำรายการได้", 422)
      }

      const productLookup = new Map<number, any>()
      for (const p of products) {
        productLookup.set(p.id, p)
      }

      // Check stock and compute server-verified prices
      const lineItems: {
        product: any
        quantity: number
        originalPrice: number
        price: number
        total: number
        fulfillBranchId: number
        isCrossBranch: boolean
        discountId: number | null
        discountName: string | null
        discountPerPiece: number
      }[] = []

      for (const req of itemsMap.values()) {
        const product = productLookup.get(req.productId)
        if (!product) continue

        const fulfillBranchId = req.fulfillBranchId || user.branchId
        const isCrossBranch = fulfillBranchId !== user.branchId

        const stockRow = Array.isArray(product.stock)
          ? product.stock.find((s: any) => s.branch_id === fulfillBranchId)
          : null
        const available = Number(stockRow?.qty) || 0
        if (available < req.qty) {
          return fail(
            `สินค้า ${product.name} ในสาขาที่เลือกมีสต็อกไม่เพียงพอ (คงเหลือ ${available} ชิ้น)`,
            409
          )
        }

        const originalPrice = Number(product.price) || 0
        let finalPrice = originalPrice
        let appliedDiscountId: number | null = null
        let appliedDiscountName: string | null = null

        const activeRule = (product.discount_rules || []).find((r: any) => {
          const d = Array.isArray(r.discounts) ? r.discounts[0] : r.discounts
          return d?.active === true
        })
        const disc = Array.isArray(activeRule?.discounts) ? activeRule?.discounts[0] : activeRule?.discounts

        if (disc) {
          const discValue = Number(disc.value) || 0
          appliedDiscountId = disc.id
          appliedDiscountName = disc.name
          if (disc.discount_type === "FIXED") {
            finalPrice = Math.max(0, originalPrice - discValue)
          } else if (disc.discount_type === "PERCENT") {
            finalPrice = Math.max(0, originalPrice - originalPrice * (discValue / 100))
          }
        }

        lineItems.push({
          product,
          quantity: req.qty,
          originalPrice,
          price: finalPrice,
          total: finalPrice * req.qty,
          fulfillBranchId,
          isCrossBranch,
          discountId: appliedDiscountId,
          discountName: appliedDiscountName,
          discountPerPiece: Math.max(0, originalPrice - finalPrice),
        })
      }

      const subtotal = Math.round(lineItems.reduce((sum, item) => sum + item.total, 0) * 100) / 100
      let couponDiscountAmount = 0
      let validatedCoupon: any = null

      if (payload.coupon_code && payload.coupon_code.trim()) {
        const couponRes = await evaluateCoupon(payload.coupon_code, subtotal)
        if (!couponRes.success) {
          return fail(couponRes.error || "รหัสคูปองไม่ถูกต้อง", 422)
        }
        validatedCoupon = couponRes.coupon
        couponDiscountAmount = validatedCoupon.discount_amount || 0
      }

      const specialDiscountBaht = Math.max(0, Number(payload.special_discount_baht) || 0)
      const totalDiscount = Math.round((couponDiscountAmount + specialDiscountBaht) * 100) / 100
      const finalTotalAmount = Math.max(0, Math.round((subtotal - totalDiscount) * 100) / 100)
      const vatAmount = Math.round((finalTotalAmount - finalTotalAmount / 1.07) * 100) / 100

      const orderCode = `INV${Date.now()}`
      const saleMode = payload.sale_mode === "DELIVERY" ? "DELIVERY" : "TAKE_AWAY"
      const paymentMethod = payload.payment_method || "CASH"

      const discountSnapshot: any = {
        item_discounts: lineItems
          .filter((i) => i.discountId)
          .map((i) => ({
            id: i.discountId,
            name: i.discountName,
            amount_per_piece: i.discountPerPiece,
          })),
        special_discount: {
          baht: specialDiscountBaht,
        },
        sale_mode: saleMode,
        payment_method: paymentMethod,
      }
      if (validatedCoupon) {
        discountSnapshot.coupon = {
          code: validatedCoupon.code,
          title: validatedCoupon.title,
          discount_amount: couponDiscountAmount,
        }
      }

      const { data: order, error: orderError } = await supabaseAdmin
        .from("orders")
        .insert({
          order_code: orderCode,
          user_id: user.userId,
          branch_id: user.branchId,
          subtotal,
          discount_amount: totalDiscount,
          total_amount: finalTotalAmount,
          vat_amount: vatAmount,
          status: "PENDING",
          device_type: "MOBILE_POS",
          discount_snapshot: discountSnapshot,
          shipping_name: payload.customer_name?.trim() || null,
          shipping_phone: payload.customer_phone?.trim() || null,
          shipping_address: payload.customer_address?.trim() || null,
          company_name_th: payload.company_name?.trim() || null,
          tax_id: payload.tax_id?.trim() || null,
          special_discount_baht: specialDiscountBaht,
        })
        .select("id, order_code, total_amount, subtotal, discount_amount, vat_amount, status")
        .single()

      if (orderError) throw orderError

      const orderItemsData = lineItems.map((item) => ({
        order_id: order.id,
        product_id: item.product.id,
        qty: item.quantity,
        price_at_sale: item.price,
        total_item_amount: item.total,
        fulfill_branch_id: item.fulfillBranchId,
        discount_id: item.discountId,
        discount_name: item.discountName,
        discount_amount_per_piece: item.discountPerPiece,
        item_status: "PENDING_SHIPMENT",
      }))

      const { error: itemsError } = await supabaseAdmin.from("order_items").insert(orderItemsData)
      if (itemsError) {
        await supabaseAdmin.from("orders").delete().eq("id", order.id)
        throw itemsError
      }

      // Handle Cross-Branch Fulfillment (Drop Ship) if any items are from remote branches
      const remoteItems = lineItems.filter((item) => item.fulfillBranchId !== user.branchId)
      if (remoteItems.length > 0) {
        const groupedByBranch = remoteItems.reduce(
          (acc, item) => {
            if (!acc[item.fulfillBranchId]) acc[item.fulfillBranchId] = []
            acc[item.fulfillBranchId].push(item)
            return acc
          },
          {} as Record<number, typeof remoteItems>
        )

        for (const [remoteBranchId, items] of Object.entries(groupedByBranch)) {
          const transferCode = `DP-AUTO-${Date.now()}-${remoteBranchId}`
          const { data: transferOrder, error: tfError } = await supabaseAdmin
            .from("stock_transfers")
            .insert({
              transfer_code: transferCode,
              from_branch_id: Number(remoteBranchId),
              to_branch_id: user.branchId,
              status: "AWAITING_SHIPMENT",
              note: `[ใบเบิกแพ็คอัตโนมัติจากใบขาย Mobile POS ${orderCode}] \nผู้รับ: ${payload.customer_name || "-"} \nโทร: ${payload.customer_phone || "-"}`,
              created_by: user.userId,
            })
            .select("id")
            .single()

          if (!tfError && transferOrder) {
            await supabaseAdmin.from("stock_transfer_items").insert(
              items.map((item) => ({
                transfer_id: transferOrder.id,
                product_id: item.product.id,
                qty: item.quantity,
                transfer_qty: item.quantity,
                item_status: "AWAITING_SHIPMENT",
              }))
            )
          }
        }
      }

      return NextResponse.json(
        {
          success: true,
          order_code: order.order_code,
          order_id: order.id,
          subtotal,
          discount_amount: totalDiscount,
          total_amount: finalTotalAmount,
          vat_amount: vatAmount,
          status: "PENDING",
          sale_mode: saleMode,
          payment_method: paymentMethod,
        },
        { status: 201 }
      )
    } catch (error) {
      console.error("Mobile POS checkout error:", error)
      const status = typeof error === "object" && error !== null && "status" in error ? Number(error.status) : 500
      return fail(
        error instanceof Error && status === 409 ? error.message : "ไม่สามารถบันทึกรายการขายได้ กรุณาลองใหม่อีกครั้ง",
        status === 409 ? 409 : 500
      )
    }
  },

  /** Create formal quote with QT... code */
  async createQuote(user: MobileUser, payload: QuoteInput) {
    const rawItems = Array.isArray(payload.items) ? payload.items : []
    const quantities = new Map<number, number>()

    for (const rawItem of rawItems) {
      const productId = Number(rawItem?.product_id)
      const quantity = Number(rawItem?.quantity)
      if (!Number.isInteger(productId) || !Number.isInteger(quantity) || quantity < 1) {
        return fail("รายการสินค้าไม่ถูกต้อง", 422)
      }
      quantities.set(productId, (quantities.get(productId) || 0) + quantity)
    }
    if (quantities.size === 0) return fail("กรุณาเลือกสินค้าอย่างน้อย 1 รายการ", 422)

    try {
      const productIds = [...quantities.keys()]
      const { data: products, error: productsError } = await supabaseAdmin
        .from("products")
        .select("id, name, price, stock(branch_id, qty)")
        .eq("category_id", "prop")
        .in("id", productIds)

      if (productsError) throw productsError
      if (!products || products.length !== productIds.length) {
        return fail("พบสินค้าที่ไม่สามารถเสนอราคาได้", 422)
      }

      const lineItems = (products as ProductRow[]).map((product) => {
        const quantity = quantities.get(product.id)!
        const stock = Array.isArray(product.stock)
          ? product.stock.find((item: { branch_id: number }) => item.branch_id === user.branchId)
          : null
        if ((Number(stock?.qty) || 0) < quantity) {
          throw Object.assign(new Error(`สินค้า ${product.name} มีสต็อกไม่เพียงพอ`), { status: 409 })
        }
        const price = Number(product.price) || 0
        return { product, quantity, price, total: price * quantity }
      })

      const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0)
      const orderCode = `QT-${Date.now()}`
      const { data: order, error: orderError } = await supabaseAdmin
        .from("orders")
        .insert({
          order_code: orderCode,
          user_id: user.userId,
          branch_id: user.branchId,
          subtotal,
          discount_amount: 0,
          total_amount: subtotal,
          status: "PENDING",
          device_type: "MOBILE_POS",
          shipping_name: payload.customer_name?.trim() || null,
          shipping_phone: payload.customer_phone?.trim() || null,
          shipping_address: payload.customer_address?.trim() || null,
          company_name_th: payload.company_name?.trim() || null,
          tax_id: payload.tax_id?.trim() || null,
        })
        .select("id, order_code")
        .single()

      if (orderError) throw orderError

      const { error: itemsError } = await supabaseAdmin.from("order_items").insert(
        lineItems.map((item) => ({
          order_id: order.id,
          product_id: item.product.id,
          qty: item.quantity,
          price_at_sale: item.price,
          total_item_amount: item.total,
          fulfill_branch_id: user.branchId,
          item_status: "PENDING_SHIPMENT",
        }))
      )
      if (itemsError) {
        await supabaseAdmin.from("orders").delete().eq("id", order.id)
        throw itemsError
      }

      return NextResponse.json({ success: true, order_code: order.order_code, status: "PENDING" }, { status: 201 })
    } catch (error) {
      console.error("Mobile POS quote error:", error)
      const status = typeof error === "object" && error !== null && "status" in error ? Number(error.status) : 500
      return fail(
        error instanceof Error && status === 409 ? error.message : "ไม่สามารถสร้างใบเสนอราคาได้",
        status === 409 ? 409 : 500
      )
    }
  },
}
