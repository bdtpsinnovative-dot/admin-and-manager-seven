"use server"

import { supabaseAdmin } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export interface StockAudit {
  id: number
  audit_code: string
  branch_id: number
  title: string
  status: "IN_PROGRESS" | "COUNT_COMPLETED" | "PENDING_APPROVAL" | "APPROVED" | "REJECTED" | "CANCELLED"
  started_at: string
  completed_at: string | null
  created_by: string | null
  submitted_by: string | null
  submitted_at: string | null
  submit_notes: string | null
  approved_by: string | null
  approved_at: string | null
  approval_notes: string | null
  total_system_qty: number
  total_rfid_qty: number
  total_manual_qty: number
  total_final_qty: number
  total_variance_qty: number
  total_variance_value: number
  created_at: string
  updated_at: string
  branches?: {
    id: number
    branch_name: string
    branch_code: string
  } | null
  creator?: {
    full_name: string
  } | null
  submitter?: {
    full_name: string
  } | null
  approver?: {
    full_name: string
  } | null
}

export interface StockAuditItem {
  id: number
  audit_id: number
  product_id: number
  system_qty_before: number
  rfid_qty: number
  manual_qty: number
  final_qty: number
  diff_qty: number
  unit_price: number
  diff_value: number
  diagnosis: "MATCHED" | "TAG_MISSING_SUSPECTED" | "SHRINKAGE_LOST" | "UNEXPECTED_SURPLUS" | "MISCOUNT"
  reason: string | null
  manager_notes: string | null
  products?: {
    id: number
    name: string
    sku: string
    barcode: string
    image_url: string | null
    price: number
  } | null
}

export interface StockAuditScan {
  id: number
  audit_id: number
  product_id: number
  count_method: "RFID" | "MANUAL_BARCODE"
  counted_by: string | null
  counted_by_name: string | null
  device_name: string | null
  scanned_qty: number
  rfid_epcs: string[]
  scanned_at: string
  products?: {
    name: string
    sku: string
  } | null
}

// 0. ดึงข้อมูลสาขาและผู้ใช้งานปัจจุบัน
export async function getAuditBranchesAndUser() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    let userBranchId = 14
    let userBranchName = "Showroom Terra Sukhumvit 26"
    let userRole = ""

    if (user) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("branch_id, role, branches(id, branch_name, branch_code)")
        .eq("user_id", user.id)
        .maybeSingle()

      if (profile) {
        userBranchId = profile.branch_id || 14
        userBranchName = (profile.branches as any)?.branch_name || ""
        userRole = (profile.role || "").toLowerCase()
      }
    }

    const { data: branches } = await supabaseAdmin
      .from("branches")
      .select("id, branch_name, branch_code")
      .order("id", { ascending: true })

    const isLocked = userRole !== "admin"

    return {
      userBranchId,
      userBranchName,
      userRole,
      isLocked,
      branches: branches || []
    }
  } catch (err: any) {
    console.error("Error getAuditBranchesAndUser:", err.message)
    return { userBranchId: 14, userBranchName: "", userRole: "", isLocked: true, branches: [] }
  }
}

// 1. ดึงรายการรอบตรวจนับทั้งหมด (กรองตามสาขาได้)
export async function getStockAudits(branchId?: number) {
  try {
    let query = supabaseAdmin
      .from("stock_audits")
      .select(`
        *,
        branches:branch_id (id, branch_name, branch_code)
      `)
      .order("created_at", { ascending: false })

    if (branchId && branchId > 0) {
      query = query.eq("branch_id", branchId)
    }

    const { data, error } = await query
    if (error) throw error
    return { data: (data || []) as StockAudit[] }
  } catch (err: any) {
    console.error("Error getStockAudits:", err.message)
    return { error: err.message, data: [] }
  }
}

// 2. ดึงรอบตรวจนับที่กำลังเปิดใช้งานอยู่ (IN_PROGRESS) ของสาขา
export async function getActiveAuditSession(branchId: number) {
  try {
    const { data, error } = await supabaseAdmin
      .from("stock_audits")
      .select(`
        *,
        branches:branch_id (id, branch_name, branch_code)
      `)
      .eq("branch_id", branchId)
      .eq("status", "IN_PROGRESS")
      .order("created_at", { ascending: false })
      .maybeSingle()

    if (error) throw error
    return { data: data as StockAudit | null }
  } catch (err: any) {
    console.error("Error getActiveAuditSession:", err.message)
    return { error: err.message, data: null }
  }
}

// 3. เปิดรอบตรวจนับใหม่
export async function createStockAudit(branchId: number, title: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // เช็กว่ามีรอบเดิมที่ยังค้างสถานะ IN_PROGRESS หรือไม่
    const { data: existing } = await supabaseAdmin
      .from("stock_audits")
      .select("id, audit_code")
      .eq("branch_id", branchId)
      .eq("status", "IN_PROGRESS")
      .maybeSingle()

    if (existing) {
      return {
        error: `มีรอบตรวจนับ ${existing.audit_code} กำลังเปิดค้างอยู่ กรุณาดำเนินการรอบเดิมให้เสร็จก่อน`
      }
    }

    // สร้างรหัส Audit Code เช่น AUD-260914-001
    const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, "")
    const randomSuffix = Math.floor(100 + Math.random() * 900)
    const auditCode = `AUD-${dateStr}-${randomSuffix}`

    const { data: newAudit, error: insertError } = await supabaseAdmin
      .from("stock_audits")
      .insert({
        audit_code: auditCode,
        branch_id: branchId,
        title: title.trim() || `ตรวจนับสต็อกประจำงวด (${auditCode})`,
        status: "IN_PROGRESS",
        created_by: user?.id || null,
        started_at: new Date().toISOString()
      })
      .select()
      .single()

    if (insertError) throw insertError

    // Snapshot สต็อกตั้งต้นของทุกสินค้าในสาขานี้มาใส่ใน stock_audit_items รอไว้
    const { data: currentStocks } = await supabaseAdmin
      .from("stock")
      .select("product_id, qty, products(id, price)")
      .eq("branch_id", branchId)

    if (currentStocks && currentStocks.length > 0) {
      const initialItems = currentStocks.map((s: any) => ({
        audit_id: newAudit.id,
        product_id: s.product_id,
        system_qty_before: s.qty || 0,
        rfid_qty: 0,
        manual_qty: 0,
        final_qty: s.qty || 0,
        diff_qty: 0,
        unit_price: s.products?.price || 0,
        diff_value: 0,
        diagnosis: "MATCHED"
      }))

      await supabaseAdmin
        .from("stock_audit_items")
        .upsert(initialItems, { onConflict: "audit_id,product_id" })
    }

    revalidatePath("/manager/stock-audit")
    revalidatePath("/stock-audit")
    revalidatePath("/admin/stock-audit")
    return { data: newAudit }
  } catch (err: any) {
    console.error("Error createStockAudit:", err.message)
    return { error: err.message }
  }
}

// 4. ดึงข้อมูลแบบละเอียดของรอบตรวจนับ (หัวใบ + รายการสินค้า 3 เสา + ประวัติการยิงดิบ)
export async function getStockAuditDetail(auditId: number) {
  try {
    const { data: audit, error: auditErr } = await supabaseAdmin
      .from("stock_audits")
      .select(`
        *,
        branches:branch_id (id, branch_name, branch_code)
      `)
      .eq("id", auditId)
      .single()

    if (auditErr) throw auditErr

    // ดึงรายการสรุป 3 เสา
    const { data: items, error: itemsErr } = await supabaseAdmin
      .from("stock_audit_items")
      .select(`
        *,
        products:product_id (id, name, sku, barcode, image_url, price)
      `)
      .eq("audit_id", auditId)
      .order("diff_qty", { ascending: true })

    if (itemsErr) throw itemsErr

    // ดึงสถิติการยิงสแกนดิบ
    const { data: scans, error: scansErr } = await supabaseAdmin
      .from("stock_audit_scans")
      .select(`
        *,
        products:product_id (name, sku)
      `)
      .eq("audit_id", auditId)
      .order("scanned_at", { ascending: false })
      .limit(500)

    if (scansErr) throw scansErr

    return {
      data: {
        audit: audit as StockAudit,
        items: (items || []) as StockAuditItem[],
        scans: (scans || []) as StockAuditScan[]
      }
    }
  } catch (err: any) {
    console.error("Error getStockAuditDetail:", err.message)
    return { error: err.message, data: null }
  }
}

// 5. บันทึกผลการยิงจากเครื่อง PDA (รองรับทั้ง RFID และ Manual Barcode)
export async function recordAuditScan({
  auditId,
  productId,
  countMethod,
  scannedQty,
  rfidEpcs = [],
  userId,
  userName,
  deviceName
}: {
  auditId: number
  productId: number
  countMethod: "RFID" | "MANUAL_BARCODE"
  scannedQty: number
  rfidEpcs?: string[]
  userId?: string
  userName?: string
  deviceName?: string
}) {
  try {
    // 1. บันทึกสตรีมการยิงดิบ
    const { error: scanErr } = await supabaseAdmin
      .from("stock_audit_scans")
      .insert({
        audit_id: auditId,
        product_id: productId,
        count_method: countMethod,
        counted_by: userId || null,
        counted_by_name: userName || "พนักงาน",
        device_name: deviceName || "PDA Scanner",
        scanned_qty: scannedQty,
        rfid_epcs: rfidEpcs,
        scanned_at: new Date().toISOString()
      })

    if (scanErr) throw scanErr

    // 2. คำนวณยอดรวมของสินค้านั้นใน stock_audit_items
    await syncProductAuditSummary(auditId, productId)

    return { success: true }
  } catch (err: any) {
    console.error("Error recordAuditScan:", err.message)
    return { error: err.message }
  }
}

// ฟังก์ชันภายใน: คำนวณสรุปยอด 3 เสาและวินิจฉัยสำหรับสินค้านั้น
async function syncProductAuditSummary(auditId: number, productId: number) {
  // ดึงรอบ audit เพื่อรู้ branch_id
  const { data: audit } = await supabaseAdmin
    .from("stock_audits")
    .select("branch_id")
    .eq("id", auditId)
    .single()

  if (!audit) return

  // ดึงยอดในระบบปัจจุบัน
  const { data: stockRow } = await supabaseAdmin
    .from("stock")
    .select("qty")
    .eq("product_id", productId)
    .eq("branch_id", audit.branch_id)
    .maybeSingle()

  const systemQty = stockRow ? Number(stockRow.qty) : 0

  // ดึงราคาสินค้า
  const { data: product } = await supabaseAdmin
    .from("products")
    .select("price")
    .eq("id", productId)
    .single()

  const unitPrice = product ? Number(product.price) : 0

  // ดึงผลรวมการสแกนทั้งหมดของสินค้านี้ในรอบนี้
  const { data: scans } = await supabaseAdmin
    .from("stock_audit_scans")
    .select("count_method, scanned_qty, rfid_epcs")
    .eq("audit_id", auditId)
    .eq("product_id", productId)

  let rfidQty = 0
  let manualQty = 0
  const uniqueEpcs = new Set<string>()

  for (const scan of scans || []) {
    if (scan.count_method === "RFID") {
      if (Array.isArray(scan.rfid_epcs) && scan.rfid_epcs.length > 0) {
        scan.rfid_epcs.forEach((epc: string) => uniqueEpcs.add(epc))
      } else {
        rfidQty += Number(scan.scanned_qty) || 0
      }
    } else {
      manualQty += Number(scan.scanned_qty) || 0
    }
  }

  if (uniqueEpcs.size > 0) {
    rfidQty = uniqueEpcs.size
  }

  // เคาะ final_qty: ถ้ามีคนนับสด ให้นับสดเป็นหลัก ถ้าไม่มี ให้เอา RFID
  const finalQty = manualQty > 0 ? manualQty : rfidQty
  const diffQty = finalQty - systemQty
  const diffValue = diffQty * unitPrice

  // วินิจฉัยสถานะ
  let diagnosis: StockAuditItem["diagnosis"] = "MATCHED"
  if (manualQty > 0 && rfidQty > 0 && manualQty > rfidQty) {
    diagnosis = "TAG_MISSING_SUSPECTED" // นับสดได้มากกว่า RFID แสดงว่ามีแท็กหลุด/สัญญาณบอด
  } else if (diffQty < 0) {
    diagnosis = "SHRINKAGE_LOST" // ยอดนับจริงน้อยกว่าระบบ แปลว่าของหาย
  } else if (diffQty > 0) {
    diagnosis = "UNEXPECTED_SURPLUS" // ยอดนับจริงมากกว่าระบบ มีของเกิน
  } else {
    diagnosis = "MATCHED"
  }

  await supabaseAdmin
    .from("stock_audit_items")
    .upsert({
      audit_id: auditId,
      product_id: productId,
      system_qty_before: systemQty,
      rfid_qty: rfidQty,
      manual_qty: manualQty,
      final_qty: finalQty,
      diff_qty: diffQty,
      unit_price: unitPrice,
      diff_value: diffValue,
      diagnosis: diagnosis,
      updated_at: new Date().toISOString()
    }, { onConflict: "audit_id,product_id" })

  // อัปเดตรวมยอดของหัวใบ stock_audits
  await refreshAuditHeaderTotals(auditId)
}

// คำนวณสรุปรวมทั้งใบของ stock_audits
async function refreshAuditHeaderTotals(auditId: number) {
  const { data: allItems } = await supabaseAdmin
    .from("stock_audit_items")
    .select("system_qty_before, rfid_qty, manual_qty, final_qty, diff_qty, diff_value")
    .eq("audit_id", auditId)

  if (!allItems) return

  let totalSys = 0
  let totalRfid = 0
  let totalManual = 0
  let totalFinal = 0
  let totalDiff = 0
  let totalVal = 0

  for (const item of allItems) {
    totalSys += Number(item.system_qty_before) || 0
    totalRfid += Number(item.rfid_qty) || 0
    totalManual += Number(item.manual_qty) || 0
    totalFinal += Number(item.final_qty) || 0
    totalDiff += Number(item.diff_qty) || 0
    totalVal += Number(item.diff_value) || 0
  }

  await supabaseAdmin
    .from("stock_audits")
    .update({
      total_system_qty: totalSys,
      total_rfid_qty: totalRfid,
      total_manual_qty: totalManual,
      total_final_qty: totalFinal,
      total_variance_qty: totalDiff,
      total_variance_value: totalVal,
      updated_at: new Date().toISOString()
    })
    .eq("id", auditId)
}

// 6. เมเนเจอร์ส่งเรื่องขออนุมัติปรับสต็อก (PENDING_APPROVAL)
export async function submitAuditForApproval({
  auditId,
  notes,
  overrides = []
}: {
  auditId: number
  notes: string
  overrides?: { productId: number; finalQty: number; reason: string }[]
}) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // บันทึกการแก้ไข Final Qty หรือเหตุผลเฉพาะรายการที่เมเนเจอร์ปรับแก้เพิ่มเติม
    for (const ov of overrides) {
      const { data: currentItem } = await supabaseAdmin
        .from("stock_audit_items")
        .select("system_qty_before, unit_price")
        .eq("audit_id", auditId)
        .eq("product_id", ov.productId)
        .single()

      if (currentItem) {
        const sysQty = Number(currentItem.system_qty_before)
        const price = Number(currentItem.unit_price)
        const diffQty = ov.finalQty - sysQty
        const diffValue = diffQty * price

        await supabaseAdmin
          .from("stock_audit_items")
          .update({
            final_qty: ov.finalQty,
            diff_qty: diffQty,
            diff_value: diffValue,
            reason: ov.reason,
            updated_at: new Date().toISOString()
          })
          .eq("audit_id", auditId)
          .eq("product_id", ov.productId)
      }
    }

    // รีเฟรชยอดรวมหัวใบ
    await refreshAuditHeaderTotals(auditId)

    // ปรับสถานะเป็น PENDING_APPROVAL
    const { error: updateErr } = await supabaseAdmin
      .from("stock_audits")
      .update({
        status: "PENDING_APPROVAL",
        submitted_by: user?.id || null,
        submitted_at: new Date().toISOString(),
        submit_notes: notes.trim(),
        updated_at: new Date().toISOString()
      })
      .eq("id", auditId)

    if (updateErr) throw updateErr

    revalidatePath("/manager/stock-audit")
    revalidatePath("/stock-audit")
    revalidatePath("/admin/stock-audit")
    return { success: true }
  } catch (err: any) {
    console.error("Error submitAuditForApproval:", err.message)
    return { error: err.message }
  }
}

// 7. แอดมินอนุมัติการปรับสต็อกจริง (APPROVE) -> ปรับตาราง stock + ลง stock_movements
export async function approveStockAudit(auditId: number, approvalNotes: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Unauthorized: กรุณาเข้าสู่ระบบ")

    // ดึงโปรไฟล์แอดมิน
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", user.id)
      .single()

    const approverName = profile?.full_name || user.email || "Admin"

    // ดึงข้อมูลรอบตรวจนับ
    const { data: audit, error: auditErr } = await supabaseAdmin
      .from("stock_audits")
      .select("*")
      .eq("id", auditId)
      .single()

    if (auditErr || !audit) throw new Error("ไม่พบข้อมูลรอบตรวจนับ")
    if (audit.status === "APPROVED") throw new Error("รอบตรวจนับนี้ได้รับอนุมัติไปแล้ว")

    // ดึงรายการสินค้าทั้งหมดในรอบนี้
    const { data: items, error: itemsErr } = await supabaseAdmin
      .from("stock_audit_items")
      .select("product_id, system_qty_before, final_qty, diff_qty, reason")
      .eq("audit_id", auditId)

    if (itemsErr) throw itemsErr

    // วนลูปปรับปรุงสต็อกจริงในตาราง stock และลงบันทึกใน stock_movements
    for (const item of items || []) {
      const diff = Number(item.diff_qty) || 0
      const finalQty = Number(item.final_qty)
      const productId = item.product_id
      const branchId = audit.branch_id

      if (diff === 0) continue // ถ้ายอดเท่าเดิม ไม่ต้องขยับสต็อก

      // 1. อัปเดตตาราง stock
      const { data: curStock } = await supabaseAdmin
        .from("stock")
        .select("id")
        .eq("product_id", productId)
        .eq("branch_id", branchId)
        .maybeSingle()

      if (curStock) {
        await supabaseAdmin
          .from("stock")
          .update({
            qty: finalQty,
            updated_at: new Date().toISOString()
          })
          .eq("product_id", productId)
          .eq("branch_id", branchId)
      } else {
        await supabaseAdmin
          .from("stock")
          .insert({
            product_id: productId,
            branch_id: branchId,
            qty: finalQty,
            updated_at: new Date().toISOString()
          })
      }

      // 2. บันทึกลง stock_movements เป็นหลักฐานโปร่งใส
      await supabaseAdmin
        .from("stock_movements")
        .insert({
          product_id_bigint: productId,
          branch_id: branchId,
          type: "ADJUST",
          qty: diff,
          note: `ปรับยอดจากรอบตรวจนับ ${audit.audit_code} (จาก ${item.system_qty_before} เป็น ${finalQty}) | สาเหตุ: ${item.reason || "ตรวจนับประจำงวด"}`,
          ref_type: "AUDIT",
          created_by: user.id,
          created_by_name: approverName
        })
    }

    // 3. ปรับสถานะรอบตรวจนับเป็น APPROVED
    const { error: finalErr } = await supabaseAdmin
      .from("stock_audits")
      .update({
        status: "APPROVED",
        approved_by: user.id,
        approved_at: new Date().toISOString(),
        approval_notes: approvalNotes.trim(),
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("id", auditId)

    if (finalErr) throw finalErr

    revalidatePath("/manager/stock-audit")
    revalidatePath("/stock-audit")
    revalidatePath("/admin/stock-audit")
    revalidatePath("/admin/rfid-mismatch")
    revalidatePath("/rfid-mismatch")
    revalidatePath("/inventory")
    return { success: true }
  } catch (err: any) {
    console.error("Error approveStockAudit:", err.message)
    return { error: err.message }
  }
}

// 8. แอดมินไม่อนุมัติ (REJECT) -> ตีกลับให้ Manager หรือพนักงานไปนับใหม่
export async function rejectStockAudit(auditId: number, rejectReason: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabaseAdmin
      .from("stock_audits")
      .update({
        status: "REJECTED",
        approved_by: user?.id || null,
        approved_at: new Date().toISOString(),
        approval_notes: `[ไม่อนุมัติ] ${rejectReason.trim()}`,
        updated_at: new Date().toISOString()
      })
      .eq("id", auditId)

    if (error) throw error

    revalidatePath("/manager/stock-audit")
    revalidatePath("/stock-audit")
    revalidatePath("/admin/stock-audit")
    return { success: true }
  } catch (err: any) {
    console.error("Error rejectStockAudit:", err.message)
    return { error: err.message }
  }
}

// ==========================================
// 🚀 Simple 2-Way Comparison (RFID vs Manual)
// ==========================================
export interface TagItemDetail {
  epc: string
  isScanned: boolean // true = สแกนเจอแล้ว (FOUND), false = ยังหาไม่เจอ (MISSING)
}

export interface SimpleStockCompareItem {
  productId: number
  name: string
  sku: string
  barcode: string
  imageUrl: string | null
  price: number
  systemQty: number // ยอดสต็อกเดิมในระบบปัจจุบัน
  rfidQty: number
  manualQty: number
  diff: number // rfidQty - manualQty (ผลต่าง 2 ทาง)
  systemDiff: number // rfidQty - systemQty (ผลต่างเทียบกับระบบเดิม)
  isMatch: boolean
  rfidTags: string[] // รหัสแท็ก RFID ที่สแกนได้
  tagDetails?: TagItemDetail[] // รายละเอียดแท็กแต่ละตัว พร้อมสถานะ เจอแล้ว / ยังไม่เจอ
}

export interface SimpleStockCompareResult {
  items: SimpleStockCompareItem[]
  summary: {
    totalItems: number
    totalSystem: number // ยอดเดิมในระบบรวม
    totalRfid: number
    totalManual: number
    matchCount: number
    mismatchCount: number
    allMatch: boolean
  }
}

export async function getSimpleStockComparison(branchId?: number): Promise<{ data: SimpleStockCompareResult | null; error?: string }> {
  try {
    let targetBranch = branchId && branchId > 0 ? branchId : 0

    // ถ้าไม่ได้ระบุ branchId ให้ดึงจาก profile ของผู้ใช้ปัจจุบัน
    if (!targetBranch) {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("branch_id")
          .eq("user_id", user.id)
          .maybeSingle()
        if (profile?.branch_id) targetBranch = profile.branch_id
      }
    }

    if (!targetBranch) targetBranch = 14 // default to Showroom Terra Sukhumvit 26

    // ดึงข้อมูลพร้อมกันแบบขนาน (Parallel) เพื่อประสิทธิภาพสูงสุด:
    // 1. สต็อกทั้งหมดของสาขานี้ เพื่อทำ systemMap
    // 2. สต็อกที่มีจำนวน > 0 ของสาขานี้ เพื่อนำเข้าตารางเปรียบเทียบ
    // 3. รหัสแท็ก RFID ที่ลงทะเบียนไว้ประจำสาขานี้ (product_rfid_tags)
    // 4. ยอดที่กวาดสแกนด้วย RFID (reader_stock)
    // 5. ยอดที่นับแบบแมนนวล/บาร์โค้ด (stock_initial_count_items)
    const [
      { data: allStockRows },
      { data: stockRows },
      { data: branchTags },
      { data: readerRows },
      { data: manualRows }
    ] = await Promise.all([
      supabaseAdmin.from("stock").select("product_id, qty").eq("branch_id", targetBranch),
      supabaseAdmin.from("stock").select("product_id, qty, products(id, name, sku, barcode, image_url, price)").eq("branch_id", targetBranch).gt("qty", 0),
      supabaseAdmin.from("product_rfid_tags").select("rfid, product_id, status, products(id, name, sku, barcode, image_url, price)").eq("branch_id", targetBranch).eq("status", "IN_STOCK"),
      supabaseAdmin.from("reader_stock").select("product_id, qty, products(id, name, sku, barcode, image_url, price)").eq("branch_id", targetBranch),
      supabaseAdmin.from("stock_initial_count_items").select("product_id, qty, products(id, name, sku, barcode, image_url, price), stock_initial_counts!inner(branch_id)").eq("stock_initial_counts.branch_id", targetBranch)
    ])

    // สร้าง Map ยอดในระบบ (system stock)
    const systemMap = new Map<number, number>()
    allStockRows?.forEach((s: any) => {
      systemMap.set(Number(s.product_id), Number(s.qty) || 0)
    })

    // รวบรวมแท็ก RFID ประจำสาขา
    const tagsByProduct = new Map<number, Set<string>>()
    branchTags?.forEach((t: any) => {
      const pId = Number(t.product_id)
      if (!tagsByProduct.has(pId)) tagsByProduct.set(pId, new Set())
      tagsByProduct.get(pId)!.add(t.rfid)
    })

    const itemMap = new Map<number, SimpleStockCompareItem>()

    const ensureItem = (pId: number, prodData: any, initialSysQty?: number) => {
      if (!itemMap.has(pId)) {
        const prod = Array.isArray(prodData) ? prodData[0] : prodData
        itemMap.set(pId, {
          productId: pId,
          name: prod?.name || "ไม่ทราบชื่อสินค้า",
          sku: prod?.sku || "-",
          barcode: prod?.barcode || "-",
          imageUrl: prod?.image_url || null,
          price: Number(prod?.price) || 0,
          systemQty: initialSysQty !== undefined ? initialSysQty : (systemMap.get(pId) || 0),
          rfidQty: 0,
          manualQty: 0,
          diff: 0,
          systemDiff: 0,
          isMatch: false,
          rfidTags: []
        })
      }
    }

    // 1. ใส่สินค้าที่มีสต็อกจริงในระบบของสาขานี้ (ยอดในระบบ)
    stockRows?.forEach((s: any) => {
      ensureItem(Number(s.product_id), s.products, Number(s.qty) || 0)
    })

    // 2. ใส่สินค้าที่มีแท็ก RFID ประจำสาขานี้
    branchTags?.forEach((t: any) => {
      ensureItem(Number(t.product_id), t.products)
    })

    // 3. ใส่/อัปเดตยอดที่นับได้จาก RFID
    readerRows?.forEach((r: any) => {
      const pId = Number(r.product_id)
      ensureItem(pId, r.products)
      itemMap.get(pId)!.rfidQty = Number(r.qty) || 0
    })

    // 4. ใส่/อัปเดตยอดที่นับได้จาก แมนนวล
    manualRows?.forEach((m: any) => {
      const pId = Number(m.product_id)
      ensureItem(pId, m.products)
      itemMap.get(pId)!.manualQty += Number(m.qty) || 0
    })

    // 5. ดึงรหัสแท็กที่กวาดสแกนล่าสุดจาก reader_count_scans มาเสริม พร้อมเก็บ Set ของแท็กที่สแกนแล้ว
    const pIds = Array.from(itemMap.keys())
    const scannedSet = new Set<string>()

    if (pIds.length > 0) {
      const { data: scanRows } = await supabaseAdmin
        .from("reader_count_scans")
        .select("rfid, product_id")
        .in("product_id", pIds.slice(0, 1000))
        .order("scanned_at", { ascending: false })

      scanRows?.forEach((t: any) => {
        const pId = Number(t.product_id)
        if (!tagsByProduct.has(pId)) tagsByProduct.set(pId, new Set())
        tagsByProduct.get(pId)!.add(t.rfid)
        scannedSet.add(t.rfid)
      })
    }

    // คำนวณผลต่าง สถิติ และสถานะ
    let totalSystem = 0
    let totalRfid = 0
    let totalManual = 0
    let matchCount = 0
    let mismatchCount = 0

    const items: SimpleStockCompareItem[] = []

    for (const item of itemMap.values()) {
      item.systemQty = systemMap.get(item.productId) || 0
      item.systemDiff = item.rfidQty - item.systemQty
      const tagSet = tagsByProduct.get(item.productId)
      const allTags = tagSet ? Array.from(tagSet) : []

      // แปลงเป็น tagDetails พร้อมระบุสถานะ isScanned (เจอแล้ว vs ยังหาไม่เจอ)
      const details: TagItemDetail[] = allTags.map((epc) => ({
        epc,
        isScanned: scannedSet.has(epc)
      }))

      // เรียงให้ตัวที่ "ยังหาไม่เจอ" (isScanned === false) ขึ้นมาก่อน
      details.sort((a, b) => (a.isScanned === b.isScanned ? 0 : a.isScanned ? 1 : -1))

      item.tagDetails = details
      item.rfidTags = details.map((d) => d.epc)
      item.diff = item.rfidQty - item.manualQty
      item.isMatch = item.rfidQty === item.manualQty

      totalSystem += item.systemQty
      totalRfid += item.rfidQty
      totalManual += item.manualQty

      if (item.isMatch) {
        matchCount++
      } else {
        mismatchCount++
      }
      items.push(item)
    }

    // จัดเรียง: ตัวที่ยังไม่ตรงกันขึ้นก่อน, รายการที่มีการนับขึ้นก่อน, ยอดผลต่างมาก่อน
    items.sort((a, b) => {
      if (a.isMatch !== b.isMatch) return a.isMatch ? 1 : -1
      const aCounted = (a.rfidQty > 0 || a.manualQty > 0) ? 1 : 0
      const bCounted = (b.rfidQty > 0 || b.manualQty > 0) ? 1 : 0
      if (aCounted !== bCounted) return bCounted - aCounted
      const diffA = Math.abs(a.diff)
      const diffB = Math.abs(b.diff)
      if (diffA !== diffB) return diffB - diffA
      return b.systemQty - a.systemQty
    })

    const allMatch = (totalRfid > 0 || totalManual > 0) && mismatchCount === 0

    return {
      data: {
        items,
        summary: {
          totalItems: items.length,
          totalSystem,
          totalRfid,
          totalManual,
          matchCount,
          mismatchCount,
          allMatch
        }
      }
    }
  } catch (err: any) {
    console.error("Error getSimpleStockComparison:", err.message)
    return { data: null, error: err.message }
  }
}

// ล้างยอดนับ (สำหรับเริ่มนับใหม่)
export async function clearSimpleCounts(branchId: number, type: "all" | "rfid" | "manual" = "all") {
  try {
    if (type === "all" || type === "rfid") {
      const { data: rStocks } = await supabaseAdmin
        .from("reader_stock")
        .select("product_id")
        .eq("branch_id", branchId)
      const pIds = rStocks?.map((r: any) => r.product_id) || []
      if (pIds.length > 0) {
        await supabaseAdmin.from("reader_count_scans").delete().in("product_id", pIds)
      }
      await supabaseAdmin.from("reader_stock").delete().eq("branch_id", branchId)
    }

    if (type === "all" || type === "manual") {
      const { data: headers } = await supabaseAdmin
        .from("stock_initial_counts")
        .select("id")
        .eq("branch_id", branchId)
      if (headers && headers.length > 0) {
        const ids = headers.map((h: any) => h.id)
        await supabaseAdmin.from("stock_initial_count_items").delete().in("initial_count_id", ids)
      }
      await supabaseAdmin.from("stock_initial_counts").delete().eq("branch_id", branchId)
    }

    revalidatePath("/manager/stock-audit")
    revalidatePath("/manager/stock-compare")
    revalidatePath("/manager/initial-count")
    return { success: true }
  } catch (err: any) {
    console.error("Error clearSimpleCounts:", err.message)
    return { error: err.message }
  }
}

// ส่งปรับยอดให้แอดมิน (ล็อคว่าทั้ง 2 ต้องตรงกัน 100%)
export async function submitSimpleAuditToAdmin({
  branchId,
  notes
}: {
  branchId: number
  notes?: string
}) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // 1. ตรวจสอบความถูกต้องอีกครั้งฝั่ง Server (ห้ามส่งเด็ดขาดถ้ายอดไม่ตรงกัน)
    const compareRes = await getSimpleStockComparison(branchId)
    if (!compareRes.data || !compareRes.data.summary.allMatch) {
      return {
        error: `ไม่สามารถส่งได้: ยอด RFID และ ยอดแมนนวล ยังไม่ตรงกัน (มียอดต่างกัน ${compareRes.data?.summary.mismatchCount || 0} รายการ)`
      }
    }

    const { items, summary } = compareRes.data

    // 2. สร้างเอกสารขออนุมัติปรับสต็อกใน stock_audits
    const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, "")
    const randomSuffix = Math.floor(100 + Math.random() * 900)
    const auditCode = `AUD-${dateStr}-${randomSuffix}`

    const { data: newAudit, error: auditErr } = await supabaseAdmin
      .from("stock_audits")
      .insert({
        audit_code: auditCode,
        branch_id: branchId,
        title: notes?.trim() || `ตรวจนับ 2 ทางตรงกัน 100% (${auditCode})`,
        status: "PENDING_APPROVAL",
        created_by: user?.id || null,
        submitted_by: user?.id || null,
        submitted_at: new Date().toISOString(),
        submit_notes: notes?.trim() || "ยอดนับ RFID และ แมนนวล ตรงกัน 100% พร้อมปรับสต็อก",
        total_rfid_qty: summary.totalRfid,
        total_manual_qty: summary.totalManual,
        total_final_qty: summary.totalRfid,
        started_at: new Date().toISOString()
      })
      .select()
      .single()

    if (auditErr) throw auditErr

    // 3. ดึงยอดเดิมในระบบ (system_qty) เพื่อคำนวณ diff_qty ส่งแอดมิน
    const { data: sysStocks } = await supabaseAdmin
      .from("stock")
      .select("product_id, qty")
      .eq("branch_id", branchId)

    const sysMap = new Map<number, number>()
    sysStocks?.forEach((s: any) => sysMap.set(Number(s.product_id), Number(s.qty) || 0))

    const auditItems = items.map((item) => {
      const sysQty = sysMap.get(item.productId) || 0
      const diff = item.rfidQty - sysQty
      return {
        audit_id: newAudit.id,
        product_id: item.productId,
        system_qty_before: sysQty,
        rfid_qty: item.rfidQty,
        manual_qty: item.manualQty,
        final_qty: item.rfidQty,
        diff_qty: diff,
        unit_price: item.price,
        diff_value: diff * item.price,
        diagnosis: "MATCHED" as const
      }
    })

    if (auditItems.length > 0) {
      await supabaseAdmin.from("stock_audit_items").insert(auditItems)
    }

    revalidatePath("/manager/stock-audit")
    revalidatePath("/stock-audit")
    revalidatePath("/admin/stock-audit")

    return { success: true, auditCode }
  } catch (err: any) {
    console.error("Error submitSimpleAuditToAdmin:", err.message)
    return { error: err.message }
  }
}
