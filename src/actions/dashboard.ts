"use server"

import { createClient } from "../lib/supabase/server"

export interface DashboardBranchSummary {
  id: number
  name: string
  billCount: number
  netSales: number
  cancelledCount: number
  cancelledSales: number
  lastSaleAt: string | null
}

export interface DashboardOrder {
  id: number
  orderCode: string
  createdAt: string
  branchName: string
  totalAmount: number
  status: string
}

export interface DashboardProductSummary {
  key: string
  name: string
  sku: string | null
  imageUrl: string | null
  quantity: number
  sales: number
  billCount: number
}

export interface DashboardAvailableBranch {
  id: number
  name: string
}

export interface DashboardData {
  summary: {
    netSales: number
    billCount: number
    cancelledCount: number
    cancelledSales: number
    branchCount: number
  }
  branches: DashboardBranchSummary[]
  availableBranches: DashboardAvailableBranch[]
  products: DashboardProductSummary[]
  monthlySales: { label: string; amount: number }[]
  recentOrders: DashboardOrder[]
  error: string | null
}

const emptyDashboard = (error: string | null = null): DashboardData => ({
  summary: { netSales: 0, billCount: 0, cancelledCount: 0, cancelledSales: 0, branchCount: 0 },
  branches: [],
  availableBranches: [],
  products: [],
  monthlySales: [],
  recentOrders: [],
  error,
})

export async function getDashboardData(requestedBranchId = "ALL"): Promise<DashboardData> {
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
        total_amount,
        status,
        branches!orders_branch_fk ( branch_name ),
        order_items (
          product_id,
          qty,
          total_item_amount,
          products:products!order_items_product_fk ( name, sku, image_url )
        )
      `)
      .neq("status", "PENDING")
      .order("created_at", { ascending: false })

    // ผู้ดูแลเห็นทุกสาขา ส่วน role อื่นจะเห็นเฉพาะสาขาที่ผูกกับบัญชี
    if (!isAdmin && profile?.branch_id) {
      branchesQuery = branchesQuery.eq("id", profile.branch_id)
      ordersQuery = ordersQuery.eq("branch_id", profile.branch_id)
    }

    if (selectedBranchId !== null) {
      ordersQuery = ordersQuery.eq("branch_id", selectedBranchId)
    }

    const [{ data: branches, error: branchesError }, { data: orders, error: ordersError }] = await Promise.all([
      branchesQuery,
      ordersQuery,
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
        netSales: 0,
        cancelledCount: 0,
        cancelledSales: 0,
        lastSaleAt: null,
      })
    })

    let netSales = 0
    let billCount = 0
    let cancelledCount = 0
    let cancelledSales = 0
    const monthlyMap = new Map<string, number>()
    const productMap = new Map<string, DashboardProductSummary>()
    const recentOrders: DashboardOrder[] = []

    ;(orders || []).forEach((order: {
      id: number
      order_code: string | null
      created_at: string
      branch_id: number
      total_amount: number | null
      status: string | null
      branches: { branch_name: string | null }[] | null
      order_items: {
        product_id: number | null
        qty: number | null
        total_item_amount: number | null
        products: { name: string | null; sku: string | null; image_url: string | null } | { name: string | null; sku: string | null; image_url: string | null }[] | null
      }[] | null
    }) => {
      const branchId = Number(order.branch_id)
      const amount = Number(order.total_amount) || 0
      const status = String(order.status || "")
      const isCancelled = status === "CANCELLED"
      const branch = branchMap.get(branchId)

      if (branch) {
        if (isCancelled) {
          branch.cancelledCount += 1
          branch.cancelledSales += amount
        } else {
          branch.billCount += 1
          branch.netSales += amount
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
        netSales += amount
        const date = new Date(order.created_at)
        const monthKey = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`
        monthlyMap.set(monthKey, (monthlyMap.get(monthKey) || 0) + amount)

        order.order_items?.forEach((item) => {
          const product = Array.isArray(item.products) ? item.products[0] : item.products
          const productKey = String(item.product_id ?? product?.sku ?? product?.name ?? "unknown")
          const current = productMap.get(productKey) || {
            key: productKey,
            name: product?.name || "ไม่พบชื่อสินค้า",
            sku: product?.sku || null,
            imageUrl: product?.image_url || null,
            quantity: 0,
            sales: 0,
            billCount: 0,
          }
          current.quantity += Number(item.qty) || 0
          current.sales += Number(item.total_item_amount) || 0
          current.billCount += 1
          productMap.set(productKey, current)
        })
      }

      if (recentOrders.length < 10) {
        recentOrders.push({
          id: order.id,
          orderCode: order.order_code || `#${order.id}`,
          createdAt: order.created_at,
          branchName: order.branches?.[0]?.branch_name || branch?.name || "ไม่ระบุสาขา",
          totalAmount: amount,
          status,
        })
      }
    })

    const now = new Date()
    const monthlySales = Array.from({ length: 12 }, (_, index) => {
      const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11 + index, 1))
      const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`
      return {
        label: date.toLocaleDateString("th-TH", { month: "short" }),
        amount: monthlyMap.get(key) || 0,
      }
    })

    return {
      summary: {
        netSales,
        billCount,
        cancelledCount,
        cancelledSales,
        branchCount: branchMap.size,
      },
      branches: Array.from(branchMap.values()).sort((a, b) => b.netSales - a.netSales),
      availableBranches,
      products: Array.from(productMap.values()).sort((a, b) => b.sales - a.sales),
      monthlySales,
      recentOrders,
      error: null,
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "ไม่สามารถโหลดข้อมูล Dashboard ได้"
    console.error("Dashboard Error:", message)
    return emptyDashboard(message)
  }
}
