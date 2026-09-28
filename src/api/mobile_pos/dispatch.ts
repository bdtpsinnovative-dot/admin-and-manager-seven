import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { clearPosCache } from "@/actions/pos"

interface MobileUser {
  userId: string
  branchId: number
}

interface ApprovePayload {
  order_id: number
  custom_order_code?: string
}

interface ShipPayload {
  order_id: number
  item_ids?: number[]
}

interface CancelPayload {
  order_id: number
  reason?: string
}

interface UpdateCustomerPayload {
  order_id: number
  shipping_name?: string
  shipping_phone?: string
  shipping_address?: string
}

export class MobilePosDispatchController {
  static async getDispatches(user: MobileUser) {
    try {
      const myBranchId = user.branchId

      const { data: hiddenRows } = await supabaseAdmin
        .from("order_hidden_by_users")
        .select("order_id")
        .eq("user_id", user.userId)

      const hiddenOrderIds = new Set((hiddenRows || []).map((row) => Number(row.order_id)))

      // 1. งานที่คลังเราต้องจัดส่ง (fulfill_branch_id = myBranchId)
      const { data: rawMyTasks, error: err1 } = await supabaseAdmin
        .from("orders")
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
          total_amount,
          discount_amount,
          discount_snapshot,
          branch_id,
          order_items!inner (
            id,
            qty,
            item_status,
            price_at_sale,
            fulfill_branch_id,
            products!order_items_product_fk (
              id, name, sku, image_url, price, specs, width_cm, length_cm, thickness_cm,
              collection_groups ( product_sup ),
              stock ( branch_id, qty )
            ),
            branches!order_items_fulfill_branch_fk ( branch_name )
          )
        `)
        .eq("order_items.fulfill_branch_id", myBranchId)
        .in("order_items.item_status", ["PENDING_SHIPMENT", "SHIPPED"])
        .order("created_at", { ascending: false })

      // 2. บิลที่เราขาย แต่ให้สาขาอื่นจัดส่ง
      const { data: rawFollowUps, error: err2 } = await supabaseAdmin
        .from("orders")
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
          total_amount,
          discount_amount,
          discount_snapshot,
          branch_id,
          order_items!inner (
            id,
            qty,
            item_status,
            price_at_sale,
            fulfill_branch_id,
            products!order_items_product_fk (
              id, name, sku, image_url, price, specs, width_cm, length_cm, thickness_cm,
              collection_groups ( product_sup ),
              stock ( branch_id, qty )
            ),
            branches!order_items_fulfill_branch_fk ( branch_name )
          )
        `)
        .eq("branch_id", myBranchId)
        .neq("order_items.fulfill_branch_id", myBranchId)
        .in("order_items.item_status", ["PENDING_SHIPMENT", "SHIPPED"])
        .order("created_at", { ascending: false })

      // 3. ประวัติบิลที่จัดส่งหรือขายเสร็จสมบูรณ์แล้ว
      const { data: rawCompleted, error: err3 } = await supabaseAdmin
        .from("orders")
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
          total_amount,
          discount_amount,
          discount_snapshot,
          branch_id,
          order_items!inner (
            id,
            qty,
            item_status,
            price_at_sale,
            fulfill_branch_id,
            products!order_items_product_fk (
              id, name, sku, image_url, price, specs, width_cm, length_cm, thickness_cm,
              collection_groups ( product_sup ),
              stock ( branch_id, qty )
            ),
            branches!order_items_fulfill_branch_fk ( branch_name )
          )
        `)
        .eq("branch_id", myBranchId)
        .eq("status", "COMPLETED")
        .order("created_at", { ascending: false })
        .limit(50)

      // 4. บิลที่ถูกยกเลิก (CANCELLED)
      const { data: rawCancelled, error: err4 } = await supabaseAdmin
        .from("orders")
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
          total_amount,
          discount_amount,
          discount_snapshot,
          branch_id,
          order_items!inner (
            id,
            qty,
            item_status,
            price_at_sale,
            fulfill_branch_id,
            products!order_items_product_fk (
              id, name, sku, image_url, price, specs, width_cm, length_cm, thickness_cm,
              collection_groups ( product_sup ),
              stock ( branch_id, qty )
            ),
            branches!order_items_fulfill_branch_fk ( branch_name )
          )
        `)
        .eq("branch_id", myBranchId)
        .eq("status", "CANCELLED")
        .order("created_at", { ascending: false })
        .limit(50)

      if (err1 || err2 || err3 || err4) {
        console.error("Error fetching dispatches for mobile:", { err1, err2, err3, err4 })
        return NextResponse.json({ success: false, message: "ดึงข้อมูลระบบจัดส่งไม่สำเร็จ" }, { status: 500 })
      }

      const formatOrders = (list: any[]) =>
        (list || [])
          .filter((order) => !hiddenOrderIds.has(order.id))
          .map((order) => {
            const isStorefrontTakeaway =
              Boolean(order.shipping_address?.startsWith("[รับหน้าร้าน]")) ||
              (!order.shipping_address && !order.latitude && !order.longitude)

            const formattedItems = (order.order_items || []).map((item: any) => {
              const product = item.products || {}
              const branchStock = (product.stock || []).find(
                (s: any) => Number(s.branch_id) === Number(item.fulfill_branch_id)
              )
              const availableQty = branchStock ? Number(branchStock.qty) : 0

              return {
                id: item.id,
                qty: Number(item.qty) || 0,
                item_status: item.item_status,
                price_at_sale: Number(item.price_at_sale) || 0,
                fulfill_branch_id: Number(item.fulfill_branch_id) || myBranchId,
                fulfill_branch_name: item.branches?.branch_name || "สาขา",
                is_cross_branch: Number(item.fulfill_branch_id) !== myBranchId,
                available_stock: availableQty,
                product: {
                  id: product.id,
                  name: product.name || "",
                  sku: product.sku || "",
                  image_url: product.image_url || null,
                  price: Number(product.price) || 0,
                },
              }
            })

            return {
              id: order.id,
              order_code: order.order_code,
              created_at: order.created_at,
              shipping_name: order.shipping_name || "",
              shipping_phone: order.shipping_phone || "",
              shipping_address: order.shipping_address || "",
              latitude: order.latitude ? Number(order.latitude) : null,
              longitude: order.longitude ? Number(order.longitude) : null,
              status: order.status,
              total_amount: Number(order.total_amount) || 0,
              discount_amount: Number(order.discount_amount) || 0,
              is_takeaway: isStorefrontTakeaway,
              items: formattedItems,
            }
          })

      const myTasks = formatOrders(rawMyTasks || [])
      const followUpTasks = formatOrders(rawFollowUps || [])
      const completedTasks = formatOrders(rawCompleted || [])
      const cancelledTasks = formatOrders(rawCancelled || [])

      // ภาพรวม: รวม myTasks และ followUpTasks
      const combinedMap = new Map<number, any>()
      for (const ord of [...myTasks, ...followUpTasks]) {
        if (combinedMap.has(ord.id)) {
          const existing = combinedMap.get(ord.id)
          const existingItemIds = new Set(existing.items.map((i: any) => i.id))
          for (const itm of ord.items) {
            if (!existingItemIds.has(itm.id)) {
              existing.items.push(itm)
            }
          }
        } else {
          combinedMap.set(ord.id, { ...ord, items: [...ord.items] })
        }
      }
      const overviewTasks = Array.from(combinedMap.values()).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )

      return NextResponse.json({
        success: true,
        data: {
          overviewTasks,
          myTasks: myTasks.filter((t) => t.status !== "PENDING"),
          followUpTasks: followUpTasks.filter((t) => t.status !== "PENDING"),
          completedTasks,
          cancelledTasks,
          pendingApprovalTasks: overviewTasks.filter((t) => t.status === "PENDING"),
          counts: {
            overview: overviewTasks.length,
            myTasks: myTasks.filter((t) => t.status !== "PENDING").length,
            followUps: followUpTasks.filter((t) => t.status !== "PENDING").length,
            completed: completedTasks.length,
            cancelled: cancelledTasks.length,
            pendingApproval: overviewTasks.filter((t) => t.status === "PENDING").length,
          },
        },
      })
    } catch (error: any) {
      console.error("Error in getDispatches:", error)
      return NextResponse.json({ success: false, message: error.message || "เกิดข้อผิดพลาดในการโหลดงานจัดส่ง" }, { status: 500 })
    }
  }

  static async approveAndCutStock(user: MobileUser, payload: ApprovePayload) {
    try {
      const orderId = Number(payload.order_id)
      if (!orderId) {
        return NextResponse.json({ success: false, message: "ระบุรหัสคำสั่งซื้อไม่ถูกต้อง" }, { status: 400 })
      }

      const { data: order, error: orderErr } = await supabaseAdmin
        .from("orders")
        .select(`
          id,
          order_code,
          status,
          shipping_address,
          discount_snapshot,
          order_items (
            id,
            qty,
            fulfill_branch_id,
            products (
              id, name, sku
            )
          )
        `)
        .eq("id", orderId)
        .single()

      if (orderErr || !order) {
        return NextResponse.json({ success: false, message: "ไม่พบคำสั่งซื้อนี้ในระบบ" }, { status: 404 })
      }

      if (order.status !== "PENDING") {
        return NextResponse.json({ success: false, message: "ออเดอร์นี้ถูกอนุมัติไปแล้ว ไม่สามารถตัดสต็อกซ้ำได้" }, { status: 400 })
      }

      let finalOrderCode = order.order_code
      if (payload.custom_order_code && payload.custom_order_code.trim()) {
        finalOrderCode = payload.custom_order_code.trim().toUpperCase()
        const { error: updateCodeErr } = await supabaseAdmin
          .from("orders")
          .update({ order_code: finalOrderCode })
          .eq("id", orderId)

        if (updateCodeErr) {
          if (updateCodeErr.code === "23505") {
            return NextResponse.json({ success: false, message: "รหัสออเดอร์นี้มีอยู่ในระบบแล้ว กรุณาใช้รหัสอื่น" }, { status: 400 })
          }
          return NextResponse.json({ success: false, message: updateCodeErr.message }, { status: 400 })
        }

        await supabaseAdmin
          .from("stock_transfers")
          .update({ note: `โอนสินค้าสำหรับออเดอร์ ${finalOrderCode}` })
          .like("note", `%${order.order_code}%`)
      }

      // ตัดสต็อกสินค้าในคลัง
      for (const item of (order.order_items as any[]) || []) {
        const productId = item.products?.id
        const branchId = item.fulfill_branch_id
        const qty = Number(item.qty) || 0

        if (!productId || qty <= 0) continue

        const { data: currentStock } = await supabaseAdmin
          .from("stock")
          .select("id, qty")
          .eq("product_id", productId)
          .eq("branch_id", branchId)
          .single()

        if (!currentStock || currentStock.qty < qty) {
          return NextResponse.json(
            { success: false, message: `สต็อกสินค้า "${item.products?.name || productId}" ไม่เพียงพอในสาขานี้` },
            { status: 400 }
          )
        }

        await supabaseAdmin
          .from("stock")
          .update({ qty: currentStock.qty - qty, updated_at: new Date().toISOString() })
          .eq("id", currentStock.id)

        await supabaseAdmin.from("stock_movements").insert({
          product_id_bigint: productId,
          branch_id: branchId,
          type: "SALE",
          qty: -Math.abs(qty),
          note: `ชำระเงินและอนุมัติใบขาย (บิล: ${finalOrderCode}) โดย Mobile POS`,
          ref_type: "ORDER",
          ref_id_bigint: orderId,
          created_by: user.userId,
        })
      }

      const isTakeaway = Boolean(order.shipping_address?.startsWith("[รับหน้าร้าน]"))
      if (isTakeaway) {
        await supabaseAdmin.from("orders").update({ status: "COMPLETED" }).eq("id", orderId)
        await supabaseAdmin.from("order_items").update({ item_status: "DELIVERED" }).eq("order_id", orderId)
      } else {
        await supabaseAdmin.from("orders").update({ status: "PROCESSING" }).eq("id", orderId)
      }

      // นับยอดการใช้งานคูปอง (used_count)
      const couponData = (order.discount_snapshot as any)?.coupon
      if (couponData?.id) {
        const { data: promo } = await supabaseAdmin
          .from("terra_collection_promotions")
          .select("id, used_count")
          .eq("id", couponData.id)
          .maybeSingle()

        if (promo) {
          await supabaseAdmin
            .from("terra_collection_promotions")
            .update({
              used_count: (promo.used_count || 0) + 1,
              updated_at: new Date().toISOString(),
            })
            .eq("id", promo.id)
        }
      }

      await clearPosCache()

      return NextResponse.json({
        success: true,
        message: "อนุมัติรับชำระเงินและหักสต็อกเรียบร้อยแล้ว",
        order_code: finalOrderCode,
      })
    } catch (error: any) {
      console.error("Error in approveAndCutStock:", error)
      return NextResponse.json({ success: false, message: error.message || "เกิดข้อผิดพลาดในการอนุมัติ" }, { status: 500 })
    }
  }

  static async markShipped(user: MobileUser, payload: ShipPayload) {
    try {
      const orderId = Number(payload.order_id)
      if (!orderId) {
        return NextResponse.json({ success: false, message: "ระบุรหัสคำสั่งซื้อไม่ถูกต้อง" }, { status: 400 })
      }

      const { data: order } = await supabaseAdmin
        .from("orders")
        .select("id, order_code, order_items(id, item_status)")
        .eq("id", orderId)
        .single()

      if (!order) {
        return NextResponse.json({ success: false, message: "ไม่พบคำสั่งซื้อนี้ในระบบ" }, { status: 404 })
      }

      const targetItemIds =
        payload.item_ids && payload.item_ids.length > 0
          ? payload.item_ids
          : ((order.order_items as any[]) || []).map((i) => i.id)

      const { error: itemsError } = await supabaseAdmin
        .from("order_items")
        .update({ item_status: "DELIVERED" })
        .in("id", targetItemIds)

      if (itemsError) {
        return NextResponse.json({ success: false, message: itemsError.message }, { status: 400 })
      }

      await supabaseAdmin
        .from("stock_transfers")
        .update({ status: "COMPLETED", shipped_at: new Date().toISOString() })
        .like("note", `%${order.order_code}%`)
        .eq("status", "AWAITING_SHIPMENT")

      // เช็คว่ามีรายการอื่นที่ยังไม่จัดส่งไหม
      const { data: remaining } = await supabaseAdmin
        .from("order_items")
        .select("id")
        .eq("order_id", orderId)
        .in("item_status", ["PENDING_SHIPMENT", "SHIPPED"])

      if (!remaining || remaining.length === 0) {
        await supabaseAdmin.from("orders").update({ status: "COMPLETED" }).eq("id", orderId)
      }

      await clearPosCache()

      return NextResponse.json({ success: true, message: "บันทึกการส่งมอบสินค้าสำเร็จ" })
    } catch (error: any) {
      console.error("Error in markShipped:", error)
      return NextResponse.json({ success: false, message: error.message || "เกิดข้อผิดพลาดในการบันทึกจัดส่ง" }, { status: 500 })
    }
  }

  static async cancelOrder(user: MobileUser, payload: CancelPayload) {
    try {
      const orderId = Number(payload.order_id)
      if (!orderId) {
        return NextResponse.json({ success: false, message: "ระบุรหัสคำสั่งซื้อไม่ถูกต้อง" }, { status: 400 })
      }

      const { data: order } = await supabaseAdmin
        .from("orders")
        .select(`
          id,
          order_code,
          status,
          discount_snapshot,
          order_items (
            id,
            qty,
            fulfill_branch_id,
            products ( id, name )
          )
        `)
        .eq("id", orderId)
        .single()

      if (!order) {
        return NextResponse.json({ success: false, message: "ไม่พบคำสั่งซื้อนี้" }, { status: 404 })
      }

      // ถ้าสถานะไม่ใช่ PENDING แสดงว่าเคยตัดสต็อกแล้ว ต้องคืนสต็อก
      if (order.status !== "PENDING") {
        for (const item of (order.order_items as any[]) || []) {
          const productId = item.products?.id
          const branchId = item.fulfill_branch_id
          const qty = Number(item.qty) || 0

          if (!productId || qty <= 0) continue

          const { data: currentStock } = await supabaseAdmin
            .from("stock")
            .select("id, qty")
            .eq("product_id", productId)
            .eq("branch_id", branchId)
            .single()

          if (currentStock) {
            await supabaseAdmin
              .from("stock")
              .update({ qty: currentStock.qty + qty, updated_at: new Date().toISOString() })
              .eq("id", currentStock.id)

            await supabaseAdmin.from("stock_movements").insert({
              product_id_bigint: productId,
              branch_id: branchId,
              type: "ADJUSTMENT",
              qty: Math.abs(qty),
              note: `คืนสต็อกเนื่องจากยกเลิกบิล Mobile POS (บิล: ${order.order_code})${payload.reason ? ` - สาเหตุ: ${payload.reason.trim()}` : ""}`,
              ref_type: "ORDER",
              ref_id_bigint: orderId,
              created_by: user.userId,
            })
          }
        }

        // คืนสิทธิ์คูปอง
        const couponData = (order.discount_snapshot as any)?.coupon
        if (couponData?.id) {
          const { data: promo } = await supabaseAdmin
            .from("terra_collection_promotions")
            .select("id, used_count")
            .eq("id", couponData.id)
            .maybeSingle()

          if (promo && Number(promo.used_count) > 0) {
            await supabaseAdmin
              .from("terra_collection_promotions")
              .update({
                used_count: Number(promo.used_count) - 1,
                updated_at: new Date().toISOString(),
              })
              .eq("id", promo.id)
          }
        }
      }

      const updatedSnapshot = {
        ...((order.discount_snapshot as any) || {}),
        cancel_reason: payload.reason?.trim() || null,
        cancelled_at: new Date().toISOString(),
        cancelled_by_id: user.userId,
      }

      await supabaseAdmin
        .from("orders")
        .update({ status: "CANCELLED", discount_snapshot: updatedSnapshot })
        .eq("id", orderId)

      await supabaseAdmin.from("order_items").update({ item_status: "CANCELLED" }).eq("order_id", orderId)

      await supabaseAdmin
        .from("stock_transfers")
        .update({ status: "CANCELLED" })
        .like("note", `%${order.order_code}%`)
        .in("status", ["PENDING", "AWAITING_SHIPMENT"])

      await clearPosCache()

      return NextResponse.json({ success: true, message: "ยกเลิกคำสั่งซื้อเรียบร้อยแล้ว" })
    } catch (error: any) {
      console.error("Error in cancelOrder:", error)
      return NextResponse.json({ success: false, message: error.message || "เกิดข้อผิดพลาดในการยกเลิกบิล" }, { status: 500 })
    }
  }

  static async updateCustomer(user: MobileUser, payload: UpdateCustomerPayload) {
    try {
      const orderId = Number(payload.order_id)
      if (!orderId) {
        return NextResponse.json({ success: false, message: "ระบุรหัสคำสั่งซื้อไม่ถูกต้อง" }, { status: 400 })
      }

      const updateData: any = {}
      if (payload.shipping_name !== undefined) updateData.shipping_name = payload.shipping_name.trim() || null
      if (payload.shipping_phone !== undefined) updateData.shipping_phone = payload.shipping_phone.trim() || null
      if (payload.shipping_address !== undefined) updateData.shipping_address = payload.shipping_address.trim() || null

      const { error } = await supabaseAdmin.from("orders").update(updateData).eq("id", orderId)
      if (error) throw error

      return NextResponse.json({ success: true, message: "อัปเดตข้อมูลลูกค้าเรียบร้อยแล้ว" })
    } catch (error: any) {
      console.error("Error in updateCustomer:", error)
      return NextResponse.json({ success: false, message: error.message || "เกิดข้อผิดพลาดในการอัปเดตข้อมูล" }, { status: 500 })
    }
  }
}
