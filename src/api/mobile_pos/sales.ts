import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"

interface MobileUser {
  userId: string
  branchId: number
}

interface QuoteItemInput {
  product_id: number
  quantity: number
}

interface QuoteInput {
  customer_name?: string
  customer_phone?: string
  customer_address?: string
  company_name?: string
  tax_id?: string
  items?: QuoteItemInput[]
}

interface ProductStockRow {
  branch_id: number
  qty: number | null
}

interface ProductRow {
  id: number
  name: string
  sku?: string | null
  barcode?: string | null
  price: number | null
  image_url?: string | null
  collection_groups?: { product_sup?: string | null } | null
  stock?: ProductStockRow[] | null
}

function fail(message: string, status: number) {
  return NextResponse.json({ success: false, message }, { status })
}

/** Read-only catalogue for the POS grid. Prices and stock always originate on the server. */
export const MobilePosSalesController = {
  async products(user: MobileUser) {
    try {
      const { data, error } = await supabaseAdmin
        .from("products")
        .select(
          "id, name, sku, price, image_url, barcode, collection_groups(product_sup, tag), stock(branch_id, qty)"
        )
        .eq("category_id", "prop")
        .order("id", { ascending: true })
        .range(0, 499)

      if (error) throw error

      const products = ((data || []) as ProductRow[]).map((product) => {
        const stock = Array.isArray(product.stock)
          ? product.stock.find((item: { branch_id: number }) => item.branch_id === user.branchId)
          : null
        return {
          id: product.id,
          name: product.name,
          sku: product.sku || "",
          barcode: product.barcode || "",
          price: Number(product.price) || 0,
          image_url: product.image_url || null,
          product_sup: product.collection_groups?.product_sup || "อื่น ๆ",
          available_qty: Number(stock?.qty) || 0,
        }
      })

      const categories = [...new Set(products.map((product) => product.product_sup))].sort()
      return NextResponse.json({ success: true, products, categories, branch_id: user.branchId })
    } catch (error) {
      console.error("Mobile POS products error:", error)
      return fail("ไม่สามารถโหลดสินค้าได้ กรุณาลองใหม่อีกครั้ง", 500)
    }
  },

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
      return fail(error instanceof Error && status === 409 ? error.message : "ไม่สามารถสร้างใบเสนอราคาได้", status === 409 ? 409 : 500)
    }
  },
}
