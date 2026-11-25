export type DamageReasonCategory = 'actual_broken' | 'duplicate_stock' | 'factory_out' | 'staff_gift' | 'other'

export interface DashboardDamageCategoryStats {
  qty: number
  cost: number
  retail: number
  recordCount: number
}

export function classifyDamageReason(reason: string): DamageReasonCategory {
  const r = (reason || '').toLowerCase().trim()
  // 1. ปรับสต็อกเบิ้ล / ตัดสต็อกระบบ / สินค้าไม่ขาย
  if (
    r.includes('เบิ้ล') ||
    r.includes('ตัด stock') ||
    r.includes('ตัดสต็อก') ||
    r.includes('ตัดสต๊อก') ||
    r.includes('ตัดออกจากสต๊อก') ||
    r.includes('ตัดออกจากสต็อก') ||
    r.includes('ไม่ขาย') ||
    r.includes('ปรับยอด') ||
    r.includes('ปรับสต็อก') ||
    r.includes('คีย์ซ้ำ') ||
    r.includes('ซ้ำซ้อน')
  ) {
    return 'duplicate_stock'
  }
  // 2. โรงงานไม่ส่ง / ของไม่มีใน Stock
  if (
    r.includes('ไม่ส่ง') ||
    r.includes('ไม่มีใน stock') ||
    r.includes('ไม่มีในสต็อก') ||
    r.includes('ของไม่มี') ||
    r.includes('โรงงาน') ||
    r.includes('ขาดส่ง')
  ) {
    return 'factory_out'
  }
  // 3. ให้พนักงาน / อภินันทนาการ / ส่งทดแทนลูกค้า
  if (
    r.includes('พนักงาน') ||
    r.includes('ลูกค้า') ||
    r.includes('แถม') ||
    r.includes('ทดแทน') ||
    r.includes('อภินันทนาการ') ||
    r.includes('ให้')
  ) {
    return 'staff_gift'
  }
  // 4. สินค้าชำรุด / เสียหายจริง
  if (
    r.includes('ชำรุด') ||
    r.includes('เสียหาย') ||
    r.includes('หล่น') ||
    r.includes('แตก') ||
    r.includes('หัก') ||
    r.includes('พัง') ||
    r.includes('ร้าว') ||
    r.includes('บิ่น') ||
    r.includes('มีตำหนิ') ||
    r.includes('เปื้อน') ||
    r.includes('ขึ้นรา') ||
    r.includes('defect')
  ) {
    return 'actual_broken'
  }
  return 'other'
}
