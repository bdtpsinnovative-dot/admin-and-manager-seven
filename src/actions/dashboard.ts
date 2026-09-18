"use server"

import { createClient } from "../lib/supabase/server"

export interface DashboardBranchSummary {
  id: number
  name: string
  billCount: number
  grossSales: number
  netBeforeVat: number
  netSales: number
  totalDiscount: number
  totalVat: number
  cancelledCount: number
  cancelledSales: number
  lastSaleAt: string | null
}

export interface DashboardOrder {
  id: number
  orderCode: string
  createdAt: string
  branchName: string
  subtotal: number
  discountAmount: number
  discountPercent: number
  netBeforeVat: number
  vatAmount: number
  totalAmount: number
  status: string
  shippingCost?: number
  shippingWaived?: boolean
  shippingPayer?: 'COMPANY' | 'CUSTOMER' | 'NONE'
}

export interface DashboardShippingSummary {
  companyPaidCount: number
  companyPaidTotal: number
  customerPaidCount: number
  customerPaidTotal: number
}

export interface DashboardProductSummary {
  key: string
  name: string
  sku: string | null
  imageUrl: string | null
  quantity: number
  grossSales: number
  discountAmount: number
  discountPercent: number
  netBeforeVat: number
  vatAmount: number
  sales: number
  billCount: number
  lastSaleAt: string | null
}

export interface DashboardAvailableBranch {
  id: number
  name: string
}

export interface VatOrderItem {
  id: number
  orderCode: string
  totalAmount: number
  subtotal: number
  discountAmount: number
  netBeforeVat: number
  vatAmount: number
}

export interface DashboardVatBreakdown {
  totalVat: number
  totalSales: number
  netSalesBeforeVat: number
  includedVat: {
    billCount: number
    salesAmount: number
    netBeforeVat: number
    vatAmount: number
    orders: VatOrderItem[]
  }
  excludedVat: {
    billCount: number
    salesAmount: number
    netBeforeVat: number
    vatAmount: number
    orders: VatOrderItem[]
  }
}

export interface DashboardDamageSummary {
  totalQty: number
  totalRecords: number
  totalCostValue: number
  totalRetailValue: number
}

export interface DashboardDayOrder {
  id: number
  orderCode: string
  time: string
  amount: number
  status: string
}

export interface DashboardDaySale {
  dateStr: string
  day: number
  dayOfWeek: string
  amount: number
  billCount: number
  orders: DashboardDayOrder[]
}

export interface DashboardMonthBreakdown {
  monthKey: string
  year: number
  month: number
  label: string
  fullLabel: string
  totalAmount: number
  billCount: number
  daysCount: number
  days: DashboardDaySale[]
}

export interface DashboardData {
  summary: {
    grossSales: number
    netSales: number
    totalDiscount: number
    totalVat: number
    netSalesBeforeVat: number
    billCount: number
    cancelledCount: number
    cancelledSales: number
    branchCount: number
  }
  vatBreakdown: DashboardVatBreakdown
  damageSummary: DashboardDamageSummary
  shippingSummary: DashboardShippingSummary
  branches: DashboardBranchSummary[]
  availableBranches: DashboardAvailableBranch[]
  products: DashboardProductSummary[]
  monthlySales: { label: string; amount: number; monthKey?: string }[]
  monthlyBreakdowns: DashboardMonthBreakdown[]
  recentOrders: DashboardOrder[]
  error: string | null
}

const emptyDashboard = (error: string | null = null): DashboardData => ({
  summary: { grossSales: 0, netSales: 0, totalDiscount: 0, totalVat: 0, netSalesBeforeVat: 0, billCount: 0, cancelledCount: 0, cancelledSales: 0, branchCount: 0 },
  vatBreakdown: {
    totalVat: 0,
    totalSales: 0,
    netSalesBeforeVat: 0,
    includedVat: { billCount: 0, salesAmount: 0, netBeforeVat: 0, vatAmount: 0, orders: [] },
    excludedVat: { billCount: 0, salesAmount: 0, netBeforeVat: 0, vatAmount: 0, orders: [] },
  },
  damageSummary: {
    totalQty: 0,
    totalRecords: 0,
    totalCostValue: 0,
    totalRetailValue: 0,
  },
  shippingSummary: {
    companyPaidCount: 0,
    companyPaidTotal: 0,
    customerPaidCount: 0,
    customerPaidTotal: 0,
  },
  branches: [],
  availableBranches: [],
  products: [],
  monthlySales: [],
  monthlyBreakdowns: [],
  recentOrders: [],
  error,
})

export async function getDashboardData(requestedBranchId = "ALL", dateFrom?: string, dateTo?: string): Promise<DashboardData> {
  const supabase = await createClient()

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return emptyDashboard("กรุณาเข้าสู่ระบบก่อนดู Dashboard")

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, branch_id")
      .eq("user_id", user.id)
      .single()

    const isAdmin = profile?.role === "admin"
    const parsedBranchId = Number(requestedBranchId)
    const selectedBranchId = isAdmin && requestedBranchId !== "ALL" && Number.isInteger(parsedBranchId)
      ? parsedBranchId
      : null

    let branchesQuery = supabase
      .from("branches")
      .select("id, branch_name")
      .order("id", { ascending: true })

    let ordersQuery = supabase
      .from("orders")
      .select(`
        id,
        order_code,
        created_at,
        branch_id,
        subtotal,
        discount_amount,
        vat_amount,
        total_amount,
        status,
        discount_snapshot,
        branches!orders_branch_fk ( branch_name ),
        order_items (
          product_id,
          qty,
          price_at_sale,
          total_item_amount,
          discount_amount_per_piece,
          products:products!order_items_product_fk ( name, sku, image_url, price )
        )
      `)
      .neq("status", "PENDING")
      .order("created_at", { ascending: false })

    let damageQuery = supabase
      .from("damaged_goods_records")
      .select(`
        qty,
        branch_id,
        products ( price, cost )
      `)

    // ผู้ดูแลเห็นทุกสาขา ส่วน role อื่นจะเห็นเฉพาะสาขาที่ผูกกับบัญชี
    if (!isAdmin && profile?.branch_id) {
      branchesQuery = branchesQuery.eq("id", profile.branch_id)
      ordersQuery = ordersQuery.eq("branch_id", profile.branch_id)
      damageQuery = damageQuery.eq("branch_id", profile.branch_id)
    }

    // กำหนด date range — ถ้าไม่ส่งมา ให้ default เป็นเดือนปัจจุบัน
    const nowBkk = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }))
    const defaultFrom = `${nowBkk.getFullYear()}-${String(nowBkk.getMonth() + 1).padStart(2, '0')}-01T00:00:00+07:00`
    const defaultTo = new Date(nowBkk.getFullYear(), nowBkk.getMonth() + 1, 0)
    const defaultToStr = `${defaultTo.getFullYear()}-${String(defaultTo.getMonth() + 1).padStart(2, '0')}-${String(defaultTo.getDate()).padStart(2, '0')}T23:59:59+07:00`
    const effectiveDateFrom = dateFrom || defaultFrom
    const effectiveDateTo = dateTo || defaultToStr

    ordersQuery = ordersQuery
      .gte("created_at", effectiveDateFrom)
      .lte("created_at", effectiveDateTo)
    damageQuery = damageQuery
      .gte("created_at", effectiveDateFrom)
      .lte("created_at", effectiveDateTo)

    if (selectedBranchId !== null) {
      ordersQuery = ordersQuery.eq("branch_id", selectedBranchId)
      damageQuery = damageQuery.eq("branch_id", selectedBranchId)
    }

    const [
      { data: branches, error: branchesError },
      { data: orders, error: ordersError },
      { data: damageRecords }
    ] = await Promise.all([
      branchesQuery,
      ordersQuery,
      damageQuery,
    ])

    if (branchesError) throw new Error(branchesError.message)
    if (ordersError) throw new Error(ordersError.message)

    const availableBranches = (branches || []).map((branch: { id: number; branch_name: string | null }) => ({
      id: branch.id,
      name: branch.branch_name || `สาขา ${branch.id}`,
    }))
    const branchesForSummary = selectedBranchId === null
      ? branches || []
      : (branches || []).filter((branch: { id: number }) => branch.id === selectedBranchId)
    const branchMap = new Map<number, DashboardBranchSummary>()
    ;(branchesForSummary || []).forEach((branch: { id: number; branch_name: string | null }) => {
      branchMap.set(branch.id, {
        id: branch.id,
        name: branch.branch_name || `สาขา ${branch.id}`,
        billCount: 0,
        grossSales: 0,
        netBeforeVat: 0,
        netSales: 0,
        totalDiscount: 0,
        totalVat: 0,
        cancelledCount: 0,
        cancelledSales: 0,
        lastSaleAt: null,
      })
    })

    let grossSales = 0
    let netSales = 0
    let totalDiscount = 0
    let totalVat = 0
    let billCount = 0
    let cancelledCount = 0
    let cancelledSales = 0
    let companyPaidCount = 0
    let companyPaidTotal = 0
    let customerPaidCount = 0
    let customerPaidTotal = 0
    const monthlyMap = new Map<string, number>()
    const productMap = new Map<string, DashboardProductSummary>()
    const recentOrders: DashboardOrder[] = []

    const now = new Date()
    const monthKeyMap = new Map<string, DashboardMonthBreakdown>()
    const thaiDayNames = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."]

    // เริ่มต้นเตรียมข้อมูลย้อนหลัง 12 เดือน (รวมเดือนปัจจุบัน)
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const year = d.getFullYear()
      const month = d.getMonth() + 1
      const monthKey = `${year}-${String(month).padStart(2, "0")}`
      const daysInMonth = new Date(year, month, 0).getDate()
      const label = d.toLocaleDateString("th-TH", { month: "short", year: "numeric" })
      const fullLabel = d.toLocaleDateString("th-TH", { month: "long", year: "numeric" })

      const dayList: DashboardDaySale[] = []
      for (let day = 1; day <= daysInMonth; day++) {
        const dayDate = new Date(year, month - 1, day)
        const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
        dayList.push({
          dateStr,
          day,
          dayOfWeek: thaiDayNames[dayDate.getDay()],
          amount: 0,
          billCount: 0,
          orders: [],
        })
      }

      monthKeyMap.set(monthKey, {
        monthKey,
        year,
        month,
        label,
        fullLabel,
        totalAmount: 0,
        billCount: 0,
        daysCount: daysInMonth,
        days: dayList,
      })
    }

    const includedOrders: VatOrderItem[] = []
    const excludedOrders: VatOrderItem[] = []
    let includedSales = 0
    let includedVat = 0
    let includedNet = 0
    let excludedSales = 0
    let excludedVat = 0
    let excludedNet = 0

    ;(orders || []).forEach((order: {
      id: number
      order_code: string | null
      created_at: string
      branch_id: number
      subtotal: number | null
      discount_amount: number | null
      vat_amount: number | null
      total_amount: number | null
      status: string | null
      branches: { branch_name: string | null }[] | null
      order_items: {
        product_id: number | null
        qty: number | null
        price_at_sale: number | null
        total_item_amount: number | null
        discount_amount_per_piece: number | null
        products: { name: string | null; sku: string | null; image_url: string | null; price?: number | null } | { name: string | null; sku: string | null; image_url: string | null; price?: number | null }[] | null
      }[] | null
    }) => {
      const branchId = Number(order.branch_id)
      const amount = Number(order.total_amount) || 0
      const discount = Number(order.discount_amount) || 0
      const orderSubtotal = Number(order.subtotal) > 0 ? Number(order.subtotal) : (amount + discount)
      const status = String(order.status || "")
      const isCancelled = status === "CANCELLED"
      // คำนวณ VAT 7% จากยอดสุทธิ (ถ้าระบุ vat_amount > 0 ให้ใช้ค่านั้น หรือคำนวณตามสูตร Included VAT 7%: total - total/1.07)
      const orderVat = Number(order.vat_amount) > 0
        ? Number(order.vat_amount)
        : (amount - (amount / 1.07))
      const branch = branchMap.get(branchId)

      if (branch) {
        if (isCancelled) {
          branch.cancelledCount += 1
          branch.cancelledSales += amount
        } else {
          branch.billCount += 1
          branch.grossSales += orderSubtotal
          branch.netSales += amount
          branch.totalDiscount += discount
          branch.totalVat += orderVat
          branch.netBeforeVat += Math.max(0, amount - orderVat)
        }
        if (!branch.lastSaleAt || new Date(order.created_at) > new Date(branch.lastSaleAt)) {
          branch.lastSaleAt = order.created_at
        }
      }

      if (isCancelled) {
        cancelledCount += 1
        cancelledSales += amount
      } else {
        billCount += 1
        grossSales += orderSubtotal
        netSales += amount
        totalDiscount += discount
        totalVat += orderVat

        // ✨ จำแนกประเภทการคิด VAT แบบ Dynamic จากข้อมูลบิลจริง (ห้าม Hardcode)
        const afterDiscount = Math.round(Math.max(0, orderSubtotal - discount) * 100) / 100
        const isExcludedVat = afterDiscount > 0 && Math.abs(amount - (afterDiscount * 1.07)) < 0.05
        const roundedVat = Math.round(orderVat * 100) / 100
        const roundedNet = Math.round((amount - orderVat) * 100) / 100

        const vatItem: VatOrderItem = {
          id: order.id,
          orderCode: order.order_code || `ORD-${order.id}`,
          totalAmount: amount,
          subtotal: orderSubtotal,
          discountAmount: discount,
          netBeforeVat: roundedNet,
          vatAmount: roundedVat,
        }

        if (isExcludedVat) {
          excludedOrders.push(vatItem)
          excludedSales += amount
          excludedVat += orderVat
          excludedNet += (amount - orderVat)
        } else {
          includedOrders.push(vatItem)
          includedSales += amount
          includedVat += orderVat
          includedNet += (amount - orderVat)
        }

        const orderDate = new Date(order.created_at)
        const bangkokDateStr = orderDate.toLocaleDateString("sv-SE", { timeZone: "Asia/Bangkok" })
        const [oYear, oMonth, oDay] = bangkokDateStr.split("-").map(Number)
        const oMonthKey = `${oYear}-${String(oMonth).padStart(2, "0")}`

        monthlyMap.set(oMonthKey, (monthlyMap.get(oMonthKey) || 0) + amount)

        if (!monthKeyMap.has(oMonthKey)) {
          const d = new Date(oYear, oMonth - 1, 1)
          const daysInMonth = new Date(oYear, oMonth, 0).getDate()
          const label = d.toLocaleDateString("th-TH", { month: "short", year: "numeric" })
          const fullLabel = d.toLocaleDateString("th-TH", { month: "long", year: "numeric" })
          const dayList: DashboardDaySale[] = []
          for (let day = 1; day <= daysInMonth; day++) {
            const dayDate = new Date(oYear, oMonth - 1, day)
            const dateStr = `${oYear}-${String(oMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`
            dayList.push({
              dateStr,
              day,
              dayOfWeek: thaiDayNames[dayDate.getDay()],
              amount: 0,
              billCount: 0,
              orders: [],
            })
          }
          monthKeyMap.set(oMonthKey, {
            monthKey: oMonthKey,
            year: oYear,
            month: oMonth,
            label,
            fullLabel,
            totalAmount: 0,
            billCount: 0,
            daysCount: daysInMonth,
            days: dayList,
          })
        }

        const monthObj = monthKeyMap.get(oMonthKey)
        if (monthObj) {
          monthObj.totalAmount += amount
          monthObj.billCount += 1
          const dayObj = monthObj.days[oDay - 1]
          if (dayObj) {
            dayObj.amount += amount
            dayObj.billCount += 1
            const timeStr = orderDate.toLocaleTimeString("th-TH", {
              timeZone: "Asia/Bangkok",
              hour: "2-digit",
              minute: "2-digit",
            })
            dayObj.orders.push({
              id: order.id,
              orderCode: order.order_code || `#${order.id}`,
              time: `${timeStr} น.`,
              amount,
              status,
            })
          }
        }

        order.order_items?.forEach((item) => {
          const product = Array.isArray(item.products) ? item.products[0] : item.products
          const productKey = String(item.product_id ?? product?.sku ?? product?.name ?? "unknown")
          const current = productMap.get(productKey) || {
            key: productKey,
            name: product?.name || "ไม่พบชื่อสินค้า",
            sku: product?.sku || null,
            imageUrl: product?.image_url || null,
            quantity: 0,
            grossSales: 0,
            discountAmount: 0,
            discountPercent: 0,
            netBeforeVat: 0,
            vatAmount: 0,
            sales: 0,
            billCount: 0,
            lastSaleAt: null,
          }

          const itemQty = Number(item.qty) || 0
          const itemTotalAmount = Number(item.total_item_amount) || 0
          const itemPriceAtSale = Number(item.price_at_sale) || (itemQty > 0 ? (itemTotalAmount / itemQty) : 0)
          const itemDiscountPerPiece = Number((item as any).discount_amount_per_piece) || 0

          // ยอดก่อนลด (Gross) ของรายการนี้: ราคาเต็ม x จำนวนชิ้น
          let itemGross = (itemPriceAtSale + itemDiscountPerPiece) * itemQty
          if (itemGross <= 0 && Number((product as any)?.price) > 0) {
            itemGross = Number((product as any)?.price) * itemQty
          }
          if (itemGross < itemTotalAmount) {
            itemGross = itemTotalAmount
          }

          // สัดส่วนส่วนลดของบิลนี้ (ถ้ามี เช่น คูปอง หรือส่วนลดท้ายบิล)
          const billDiscountRatio = orderSubtotal > 0 && discount > 0
            ? Math.min(1, Math.max(0, discount / orderSubtotal))
            : 0

          // ยอดหลังลด (Net) ของสินค้ารายการนี้ (รวม VAT)
          const itemNet = billDiscountRatio > 0
            ? Math.round(itemGross * (1 - billDiscountRatio) * 100) / 100
            : (itemDiscountPerPiece > 0 ? itemTotalAmount : (itemGross > 0 ? itemGross : itemTotalAmount))

          const itemDiscount = Math.max(0, Math.round((itemGross - itemNet) * 100) / 100)

          // คำนวณ VAT (7%) ของรายการนี้ตามสัดส่วนของบิล
          const itemVat = amount > 0
            ? Math.round((itemNet / amount) * orderVat * 100) / 100
            : 0
          // ยอดก่อน VAT ของรายการนี้ (ไม่รวมภาษี)
          const itemNetBeforeVat = Math.max(0, Math.round((itemNet - itemVat) * 100) / 100)

          current.quantity += itemQty
          current.grossSales += itemGross
          current.discountAmount += itemDiscount
          current.netBeforeVat += itemNetBeforeVat
          current.vatAmount += itemVat
          current.sales += itemNet
          current.billCount += 1
          if (!current.lastSaleAt || new Date(order.created_at) > new Date(current.lastSaleAt)) {
            current.lastSaleAt = order.created_at
          }
          productMap.set(productKey, current)
        })
      }

      const discountSnapshot = (order as any).discount_snapshot
      const shippingCost = Number(discountSnapshot?.shipping_cost || 0)
      const netGoods = Math.max(0, orderSubtotal - discount)
      const isOver20k = netGoods >= 20000
      const shippingWaived = Boolean(discountSnapshot?.shipping_waived && isOver20k)
      let shippingPayer: 'COMPANY' | 'CUSTOMER' | 'NONE' = 'NONE'

      if (shippingCost > 0) {
        if (shippingWaived) {
          shippingPayer = 'COMPANY'
          if (!isCancelled) {
            companyPaidCount += 1
            companyPaidTotal += shippingCost
          }
        } else {
          shippingPayer = 'CUSTOMER'
          if (!isCancelled) {
            customerPaidCount += 1
            customerPaidTotal += shippingCost
          }
        }
      }

      if (recentOrders.length < 10) {
        recentOrders.push({
          id: order.id,
          orderCode: order.order_code || `#${order.id}`,
          createdAt: order.created_at,
          branchName: order.branches?.[0]?.branch_name || branch?.name || "ไม่ระบุสาขา",
          subtotal: orderSubtotal,
          discountAmount: discount,
          discountPercent: orderSubtotal > 0 ? Math.round((discount / orderSubtotal) * 1000) / 10 : 0,
          netBeforeVat: Math.max(0, Math.round((amount - orderVat) * 100) / 100),
          vatAmount: orderVat,
          totalAmount: amount,
          status,
          shippingCost,
          shippingWaived,
          shippingPayer,
        })
      }
    })

    const monthlyBreakdowns = Array.from(monthKeyMap.values()).sort((a, b) => b.monthKey.localeCompare(a.monthKey))

    const monthlySales = Array.from({ length: 12 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - 11 + index, 1)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      const mObj = monthKeyMap.get(key)
      return {
        label: date.toLocaleDateString("th-TH", { month: "short" }),
        amount: mObj ? mObj.totalAmount : (monthlyMap.get(key) || 0),
        monthKey: key,
      }
    })

    const netSalesBeforeVat = Math.max(0, netSales - totalVat)

    const vatBreakdown: DashboardVatBreakdown = {
      totalVat: Math.round(totalVat * 100) / 100,
      totalSales: Math.round(netSales * 100) / 100,
      netSalesBeforeVat: Math.round(netSalesBeforeVat * 100) / 100,
      includedVat: {
        billCount: includedOrders.length,
        salesAmount: Math.round(includedSales * 100) / 100,
        netBeforeVat: Math.round(includedNet * 100) / 100,
        vatAmount: Math.round(includedVat * 100) / 100,
        orders: includedOrders,
      },
      excludedVat: {
        billCount: excludedOrders.length,
        salesAmount: Math.round(excludedSales * 100) / 100,
        netBeforeVat: Math.round(excludedNet * 100) / 100,
        vatAmount: Math.round(excludedVat * 100) / 100,
        orders: excludedOrders,
      },
    }

    let damageTotalQty = 0
    let damageTotalCost = 0
    let damageTotalRetail = 0
    const damageTotalRecords = (damageRecords || []).length

    for (const item of (damageRecords || [])) {
      const q = Number(item.qty || 0)
      damageTotalQty += q
      const price = Number((item.products as any)?.price || 0)
      const cost = Number((item.products as any)?.cost || 0)
      damageTotalRetail += q * price
      damageTotalCost += q * cost
    }

    const damageSummary: DashboardDamageSummary = {
      totalQty: damageTotalQty,
      totalRecords: damageTotalRecords,
      totalCostValue: Math.round(damageTotalCost * 100) / 100,
      totalRetailValue: Math.round(damageTotalRetail * 100) / 100,
    }

    return {
      summary: {
        grossSales,
        netSales,
        totalDiscount,
        totalVat,
        netSalesBeforeVat,
        billCount,
        cancelledCount,
        cancelledSales,
        branchCount: branchMap.size,
      },
      vatBreakdown,
      damageSummary,
      shippingSummary: {
        companyPaidCount,
        companyPaidTotal,
        customerPaidCount,
        customerPaidTotal,
      },
      branches: Array.from(branchMap.values()).map(b => ({
        ...b,
        grossSales: Math.round(b.grossSales * 100) / 100,
        netBeforeVat: Math.round(b.netBeforeVat * 100) / 100,
        netSales: Math.round(b.netSales * 100) / 100,
        totalDiscount: Math.round(b.totalDiscount * 100) / 100,
        totalVat: Math.round(b.totalVat * 100) / 100,
      })).sort((a, b) => b.netSales - a.netSales),
      availableBranches,
      products: Array.from(productMap.values()).map((p) => ({
        ...p,
        grossSales: Math.round(p.grossSales * 100) / 100,
        discountAmount: Math.round(p.discountAmount * 100) / 100,
        netBeforeVat: Math.round(p.netBeforeVat * 100) / 100,
        vatAmount: Math.round(p.vatAmount * 100) / 100,
        sales: Math.round(p.sales * 100) / 100,
        discountPercent: p.grossSales > 0 ? Math.round((p.discountAmount / p.grossSales) * 1000) / 10 : 0,
      })).sort((a, b) => b.sales - a.sales),
      monthlySales,
      monthlyBreakdowns,
      recentOrders,
      error: null,
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "ไม่สามารถโหลดข้อมูล Dashboard ได้"
    console.error("Dashboard Error:", message)
    return emptyDashboard(message)
  }
}
