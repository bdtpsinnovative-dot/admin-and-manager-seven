"use server"

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

// 1. ดึงรายการใบโอนทั้งหมด
export async function getTransfersList() {
  const supabase = createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Unauthorized')

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('branch_id, role')
    .eq('user_id', user.id)
    .single()

  if (profileError) throw new Error('ไม่พบข้อมูลโปรไฟล์')

  const branchId = profile.branch_id

  let query = supabase
    .from('stock_transfers')
    .select(`
      id, transfer_code, status, note, created_at, from_branch_id, to_branch_id,
      from_branch:branches!stock_transfers_from_branch_fkey(branch_name),
      to_branch:branches!stock_transfers_to_branch_fkey(branch_name)
    `)
    .in('status', ['DRAFT', 'PENDING']) 
    .order('created_at', { ascending: false })

  if (branchId) {
    query = query.or(`from_branch_id.eq.${branchId},to_branch_id.eq.${branchId}`)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)

  const inbound = branchId ? data.filter(t => t.to_branch_id === branchId) : data 
  const outbound = branchId ? data.filter(t => t.from_branch_id === branchId) : data

  return { inbound, outbound }
}

// 2. ดึงรายการสินค้าในใบโอน
export async function getTransferItems(transferId: number) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('stock_transfer_items')
    .select(`
      id, product_id, transfer_qty, received_qty, item_status, remark,
      products(name, sku, image_url, price) 
    `)
    .eq('transfer_id', transferId)

  if (error) throw new Error(error.message)
  return data
}

// 3. ปรับปรุง: ดึงข้อมูลใบโอน + เช็คสิทธิ์อัตโนมัติว่าเป็นคนส่งหรือคนรับ
export async function getTransferById(transferId: number) {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: profile } = await supabase
    .from('profiles')
    .select('branch_id')
    .eq('user_id', user.id)
    .single()

  const { data, error } = await supabase
    .from('stock_transfers')
    .select(`
      id, transfer_code, status, note, created_at, from_branch_id, to_branch_id,
      from_branch:branches!stock_transfers_from_branch_fkey(branch_name),
      to_branch:branches!stock_transfers_to_branch_fkey(branch_name)
    `)
    .eq('id', transferId)
    .single()

  if (error) throw new Error(error.message)

  // ✨ ถ้า branch_id ของเราตรงกับสาขาต้นทาง แปลว่าเราเป็นคนส่ง (เป็นขาออก Outbound)
  const isOutbound = profile?.branch_id === data.from_branch_id

  return { ...data, isOutbound }
}

// 4. ฟังก์ชันกดยืนยันรับสินค้า (สำหรับฝั่งขาเข้า)
export async function receiveStockAction(transferId: number, items: any[]) {
  const supabase = createClient()
  
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { data: header, error: headerError } = await supabase
      .from('stock_transfers')
      .select('from_branch_id, to_branch_id, transfer_code')
      .eq('id', transferId)
      .single()

    if (headerError || !header) throw new Error('ไม่พบข้อมูลใบโอน')

    for (const item of items) {
      // แปลงเป็นตัวเลขกันเหนียว
      const transferQty = Number(item.transfer_qty) || 0
      const receivedQty = Number(item.received_qty) || 0
      const varianceQty = receivedQty - transferQty // คำนวณไว้เผื่อเก็บ Log

      const itemStatus = receivedQty === transferQty ? 'COMPLETED' : 'PARTIAL'
      
      // ✅ ลบ variance_qty ออกจากการ update เพราะ DB จัดการเอง
      const { error: itemError } = await supabase
        .from('stock_transfer_items')
        .update({ 
          received_qty: receivedQty,
          item_status: itemStatus
        })
        .eq('id', item.id)

      if (itemError) throw itemError

      // --- 1. หักสต็อกสาขาต้นทาง (หักด้วยจำนวนที่เขาส่งมา คือ transferQty) ---
      if (transferQty > 0) {
        const { data: fromStock } = await supabase
          .from('stock')
          .select('qty')
          .eq('product_id', item.product_id)
          .eq('branch_id', header.from_branch_id)
          .single()

        if (fromStock) {
          await supabase.from('stock')
            .update({ qty: fromStock.qty - transferQty, updated_at: new Date().toISOString() })
            .eq('product_id', item.product_id)
            .eq('branch_id', header.from_branch_id)
        }

        // เก็บ Log ขาออก (ต้องเป็นยอดโอนออก)
        await supabase.from('stock_movements').insert({
          product_id_bigint: item.product_id,
          branch_id: header.from_branch_id,
          type: 'TRANSFER_OUT',
          qty: -Math.abs(transferQty),
          ref_type: 'TRANSFER',
          ref_id_bigint: transferId,
          created_by: user.id,
          note: `โอนออกตามเอกสาร ${header.transfer_code}`
        })
      }

      // --- 2. เพิ่มสต็อกสาขาปลายทาง (เพิ่มด้วยจำนวนที่รับจริง คือ receivedQty) ---
      if (receivedQty > 0) {
        const { data: toStock } = await supabase
          .from('stock')
          .select('qty')
          .eq('product_id', item.product_id)
          .eq('branch_id', header.to_branch_id)
          .single()

        if (toStock) {
          await supabase.from('stock')
            .update({ qty: toStock.qty + receivedQty, updated_at: new Date().toISOString() })
            .eq('product_id', item.product_id)
            .eq('branch_id', header.to_branch_id)
        } else {
          await supabase.from('stock')
            .insert({ product_id: item.product_id, branch_id: header.to_branch_id, qty: receivedQty })
        }

        // เก็บ Log ขาเข้า (ต้องเป็นยอดรับจริง)
        await supabase.from('stock_movements').insert({
          product_id_bigint: item.product_id,
          branch_id: header.to_branch_id,
          type: 'TRANSFER_IN',
          qty: receivedQty,
          ref_type: 'TRANSFER',
          ref_id_bigint: transferId,
          created_by: user.id,
          note: `รับเข้าตามเอกสาร ${header.transfer_code} (ของหาย/เกิน: ${varianceQty})`
        })
      }
    }

    const { error: transferError } = await supabase
      .from('stock_transfers')
      .update({
        status: 'COMPLETED',
        received_at: new Date().toISOString(),
        received_by: user.id
      })
      .eq('id', transferId)

    if (transferError) throw transferError

    revalidatePath('/manager/receive-check')
    return { success: true }

  } catch (error: any) {
    return { error: error.message || 'เกิดข้อผิดพลาดในการรับสินค้า' }
  }
}

// 5. ✨ ฟังก์ชันใหม่: กดยกเลิกการโอนสินค้า (สำหรับฝั่งขาออก)
export async function cancelTransferAction(transferId: number) {
  const supabase = createClient()
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { data: header } = await supabase
      .from('stock_transfers')
      .select('status, transfer_code')
      .eq('id', transferId)
      .single()

    if (!header || header.status !== 'PENDING') {
      throw new Error('ไม่สามารถยกเลิกได้ ใบโอนต้องอยู่ในสถานะรอดำเนินการเท่านั้น')
    }

    // อัปเดตสถานะในตารางหลักเป็น CANCELLED
    const { error: transferError } = await supabase
      .from('stock_transfers')
      .update({
        status: 'CANCELLED',
        note: 'ยกเลิกรายการโอนโดยผู้ส่ง'
      })
      .eq('id', transferId)

    if (transferError) throw transferError

    // อัปเดตสถานะรายการย่อยเป็น CANCELLED
    await supabase
      .from('stock_transfer_items')
      .update({ item_status: 'CANCELLED' })
      .eq('transfer_id', transferId)

    revalidatePath('/manager/receive-check')
    return { success: true }
  } catch (error: any) {
    return { error: error.message || 'เกิดข้อผิดพลาดในการยกเลิกใบโอน' }
  } 
}