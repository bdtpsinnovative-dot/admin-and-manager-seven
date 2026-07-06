"use server"

import { supabaseAdmin } from "@/lib/supabase/admin"

async function fetchAll(table: string, select: string, modifiers?: (q: any) => any) {
  let allData: any[] = []
  let from = 0
  const pageSize = 1000
  
  while (true) {
    let q = supabaseAdmin.from(table).select(select)
    if (modifiers) q = modifiers(q)
    const { data, error } = await q.range(from, from + pageSize - 1)
    
    if (error) throw new Error(`Error fetching ${table}: ${error.message}`)
    if (!data || data.length === 0) break
    allData.push(...data)
    if (data.length < pageSize) break
    from += pageSize
  }
  return allData
}

export interface BranchQuantity {
  branch_id: number
  branch_name: string
  lot_received: number
  stock: number
  rfid: number
}

export interface BalanceItem {
  product_id: number
  product_name: string
  product_sku: string | null
  image_url: string | null
  total_lot_received: number
  total_stock: number
  total_rfid: number
  diff_lot_stock: number // สต็อก - รับเข้าลอต
  diff_stock_rfid: number // สต็อก - RFID
  branch_details: BranchQuantity[]
}

export interface BalanceSummary {
  grand_total_lot: number
  grand_total_stock: number
  grand_total_rfid: number
  branch_grand_totals: BranchQuantity[]
  items: BalanceItem[]
}

export async function getSystemBalance(): Promise<{ data: BalanceSummary | null; error: string | null }> {
  try {
    // 1. ดึงสินค้าทั้งหมดและสาขาเพื่อมาตั้งต้น
    const productsRaw = await fetchAll("products", "id, name, sku, image_url")
    const branchesRaw = await fetchAll("branches", "id, branch_name")
    
    const branchNameMap: Record<number, string> = {}
    for (const b of branchesRaw) {
      branchNameMap[Number(b.id)] = b.branch_name
    }

    // 2. ดึงข้อมูลลอต เพื่อทำ mapping lot_id -> branch_id
    const lotsRaw = await fetchAll("stock_lots", "id, branch_id")
    const lotToBranchMap: Record<number, number> = {}
    for (const lot of lotsRaw) {
      lotToBranchMap[Number(lot.id)] = Number(lot.branch_id)
    }

    // 3. ดึงยอดรวมการรับเข้าจากทุกลอต (stock_lot_items)
    const lotItems = await fetchAll("stock_lot_items", "product_id, received_qty, lot_id")
      
    // Maps: pid -> branch_id -> qty
    const lotMap: Record<number, Record<number, number>> = {}
    for (const item of lotItems) {
      const pid = Number(item.product_id)
      const qty = Number(item.received_qty || 0)
      const bid = lotToBranchMap[Number(item.lot_id)]
      if (qty > 0 && bid) {
        if (!lotMap[pid]) lotMap[pid] = {}
        lotMap[pid][bid] = (lotMap[pid][bid] || 0) + qty
      }
    }

    // 4. ดึงยอดสต็อกทั้งหมด (จากตาราง stock)
    const stocks = await fetchAll("stock", "product_id, qty, branch_id")

    const stockMap: Record<number, Record<number, number>> = {}
    for (const stock of stocks) {
      const pid = Number(stock.product_id)
      const qty = Number(stock.qty || 0)
      const bid = Number(stock.branch_id)
      if (qty > 0 && bid) {
        if (!stockMap[pid]) stockMap[pid] = {}
        stockMap[pid][bid] = (stockMap[pid][bid] || 0) + qty
      }
    }

    // 5. ดึงยอดแท็ก RFID (เฉพาะสถานะ IN_STOCK)
    const rfids = await fetchAll("product_rfid_tags", "product_id, branch_id", q => q.eq("status", "IN_STOCK"))

    const rfidMap: Record<number, Record<number, number>> = {}
    for (const tag of rfids) {
      const pid = Number(tag.product_id)
      const bid = Number(tag.branch_id)
      if (bid) {
        if (!rfidMap[pid]) rfidMap[pid] = {}
        rfidMap[pid][bid] = (rfidMap[pid][bid] || 0) + 1
      }
    }

    let grand_total_lot = 0
    let grand_total_stock = 0
    let grand_total_rfid = 0
    const items: BalanceItem[] = []
    
    // Map to hold grand totals by branch id
    const branchTotalsMap: Record<number, BranchQuantity> = {}

    // 6. ประกอบร่าง
    for (const p of productsRaw ?? []) {
      const pid = Number(p.id)
      
      const prodLotMap = lotMap[pid] || {}
      const prodStockMap = stockMap[pid] || {}
      const prodRfidMap = rfidMap[pid] || {}

      let total_lot_received = 0
      let total_stock = 0
      let total_rfid = 0
      const branch_details: BranchQuantity[] = []

      // รวมทุก branch_id ที่ปรากฏในสินค้านี้
      const allBranchIds = new Set([
        ...Object.keys(prodLotMap).map(Number),
        ...Object.keys(prodStockMap).map(Number),
        ...Object.keys(prodRfidMap).map(Number),
      ])

      for (const bid of Array.from(allBranchIds)) {
        const lotQty = prodLotMap[bid] || 0
        const stockQty = prodStockMap[bid] || 0
        const rfidQty = prodRfidMap[bid] || 0

        total_lot_received += lotQty
        total_stock += stockQty
        total_rfid += rfidQty
        
        // Add to branch grand total
        if (!branchTotalsMap[bid]) {
          branchTotalsMap[bid] = {
            branch_id: bid,
            branch_name: branchNameMap[bid] || `สาขา ID: ${bid}`,
            lot_received: 0,
            stock: 0,
            rfid: 0
          }
        }
        branchTotalsMap[bid].lot_received += lotQty
        branchTotalsMap[bid].stock += stockQty
        branchTotalsMap[bid].rfid += rfidQty

        branch_details.push({
          branch_id: bid,
          branch_name: branchNameMap[bid] || `สาขา ID: ${bid}`,
          lot_received: lotQty,
          stock: stockQty,
          rfid: rfidQty
        })
      }

      // ถ้าไม่มีการเคลื่อนไหวเลย ข้ามไป
      if (total_lot_received === 0 && total_stock === 0 && total_rfid === 0) continue

      grand_total_lot += total_lot_received
      grand_total_stock += total_stock
      grand_total_rfid += total_rfid

      // เรียง branch_details ตามชื่อสาขา
      branch_details.sort((a, b) => a.branch_name.localeCompare(b.branch_name))

      items.push({
        product_id: pid,
        product_name: p.name,
        product_sku: p.sku,
        image_url: p.image_url,
        total_lot_received,
        total_stock,
        total_rfid,
        diff_lot_stock: total_stock - total_lot_received,
        diff_stock_rfid: total_stock - total_rfid,
        branch_details
      })
    }
    
    const branch_grand_totals = Object.values(branchTotalsMap)
    branch_grand_totals.sort((a, b) => a.branch_name.localeCompare(b.branch_name))

    // เรียงตามส่วนต่าง stock vs rfid มากสุดไปน้อยสุด เพื่อหาตัวที่ผิดปกติง่ายๆ
    items.sort((a, b) => Math.abs(b.diff_stock_rfid) - Math.abs(a.diff_stock_rfid) || Math.abs(b.diff_lot_stock) - Math.abs(a.diff_lot_stock))

    return {
      data: {
        grand_total_lot,
        grand_total_stock,
        grand_total_rfid,
        branch_grand_totals,
        items
      },
      error: null
    }

  } catch (err: any) {
    return { data: null, error: err.message }
  }
}
