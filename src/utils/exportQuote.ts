import { toast } from 'sonner'
import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'

export const PRODUCT_SUB_THAI_MAP: Record<string, string> = {
  // Figure & Dolls
  'Figure': 'Figure (ตุ๊กตาตกแต่ง)',
  'Doll Animal': 'Animal Figure (ตุ๊กตาสัตว์)',
  'Animal': 'Animal Figure (ตุ๊กตาสัตว์)',
  'Animal Figure': 'Animal Figure (ตุ๊กตาสัตว์)',
  'Doll Human': 'Human Figure (ตุ๊กตามนุษย์)',
  'Human': 'Human Figure (ตุ๊กตามนุษย์)',
  'Human Figure': 'Human Figure (ตุ๊กตามนุษย์)',
  'Doll Plant': 'Plant Figure (ตุ๊กตาผลไม้และพืช)',
  'Plant': 'Plant Figure (ตุ๊กตาผลไม้และพืช)',
  'Plant Figure': 'Plant Figure (ตุ๊กตาผลไม้และพืช)',
  'Doll Object': 'Others Figure (ตุ๊กตาอื่น ๆ)',
  'Others Figure': 'Others Figure (ตุ๊กตาอื่น ๆ)',
  'Art Object': 'Art Object (ของตกแต่ง)',
  'Others': 'Others (ของตกแต่งอื่น ๆ)',

  // Vase & Vessels
  'Ceramic Vases': 'Ceramic Vases (แจกันเซรามิก)',
  'Ceramic Handmade': 'Ceramic Handmade (แจกันเซรามิก)',
  'Ceramic 3D': 'Ceramic 3D (แจกันเซรามิก 3D)',
  'Glass Vases': 'Glass Vases (แจกันแก้ว)',
  'Glass Handmade': 'Glass Handmade (แจกันแก้ว)',
  'Vessels': 'Vessels (ภาชนะ)',
  'Vase': 'Vase (แจกัน)',
  'Vase Normal': 'Vase Normal (แจกัน)',
  'Others Vase': 'Others Vase (แจกันอื่น ๆ)',

  // Sculpture & Books & Candle
  'Sculpture': 'Sculpture (ประติมากรรมตกแต่ง)',
  'BOOKED': 'BOOKED (ตกแต่งชั้นหนังสือ)',
  'Book End': 'Book End (ตกแต่งชั้นหนังสือ)',
  'Candle Holder': 'Candle Holder (เชิงเทียน)',
  'CANDLE HOLDERS': 'Candle Holders (เชิงเทียน)',

  // Accessories
  'Box': 'Box (ภาชนะตกแต่ง)',
  'Decorative Box': 'Decorative Box (ภาชนะตกแต่ง)',
  'Trays': 'Trays (ถาดตกแต่ง)',
  'Tray': 'Tray (ถาดตกแต่ง)',
  'Toy': 'Toy (ของเล่นตกแต่ง)',
  'Decorative Toy': 'Decorative Toy (ของเล่นตกแต่ง)',

  // Dining & Tableware
  'Plates & Dishes': 'Plates & Dishes (จานตกแต่ง)',
  'Bowls': 'Bowls (ชาม)',
  'Glassware': 'Glassware (แก้วน้ำ, แก้วไวน์)',
  'Cups & Mugs': 'Cups & Mugs (ถ้วย, แก้วกาแฟ)',
  'Trays & Servingware': 'Trays & Servingware (ภาชนะเสิร์ฟ)',
  'Kitchenware': 'Kitchenware (เครื่องใช้ในครัว)',
  'Other Dining & Tableware': 'Other Dining & Tableware (เครื่องใช้บนโต๊ะอาหารอื่น ๆ)',

  // Dressing & Bath
  'BATH': 'Bath Room (ห้องน้ำ)',
  'Bath Room': 'Bath Room (ห้องน้ำ)',
  'Dressing Room': 'Dressing Room (ห้องแต่งตัว)',
  'Decorative Bath': 'Decorative Bath (ของใช้ในห้องน้ำ)',

  // Art & Wall Decor
  'Handmade': 'Handmade (ภาพวาด Handmade 100%)',
  '3D Handmade': '3D Handmade (ภาพตกแต่ง Handmade 3 มิติ)',
  'Digital print': 'Digital Print (ภาพดิจิตอลปริ้น)',
  'Digital Print': 'Digital Print (ภาพดิจิตอลปริ้น)',
  'Wall Art Digital Print': 'Wall Art Digital Print (ภาพดิจิตอลปริ้น)',
  'Wall Art Digital Print ': 'Wall Art Digital Print (ภาพดิจิตอลปริ้น)',
  'Wall Art Digital Print  ': 'Wall Art Digital Print (ภาพดิจิตอลปริ้น)',
  'Wall Art Hand Craft 50%': 'Wall Art Hand Craft 50% (ภาพวาด Handmade 50%)',
  'Mixed Media Art': 'Mixed Media Art (ภาพวาด Handmade ผสมดิจิตอลปริ้น)',
  'Frame': 'Photo Frame (กรอบรูป)',
  'Photo Frame': 'Photo Frame (กรอบรูป)',

  // Furniture / Tables / Chairs
  'Coffee Table': 'Coffee Table (โต๊ะกลาง)',
  'Dining Table': 'Dining Table (โต๊ะอาหาร)',
  'Working Table': 'Working Table (โต๊ะทำงาน)',
  'Side Table': 'Side Table (โต๊ะข้าง)',
  'Night Table': 'Night Table (โต๊ะข้างเตียง)',
  'Table': 'Table (โต๊ะ)',
  'Leg Coffee Table': 'Leg Coffee Table (ขาโต๊ะกลาง)',
  'Leg Dining Table': 'Leg Dining Table (ขาโต๊ะอาหาร)',
  'Dining Chair': 'Dining Chair (เก้าอี้ทานข้าว)',
  'Arm Chair': 'Arm Chair (เก้าอี้มีที่วางแขน)',
  'Lounge Chair': 'Lounge Chair (เก้าอี้พักผ่อน)',
  'Bar Stool': 'Bar Stool (เก้าอี้บาร์)',
  'Sofa': 'Sofa (โซฟา)',
  'Modular Sofa': 'Modular Sofa (โซฟาโมดูลาร์)',
  'Shelf': 'Shelf (ชั้นวางของ)',
  'Clothes Rack': 'Clothes Rack (ราวแขวนเสื้อผ้า)',
  'Bedroom Collection': 'Bedroom Collection (ชุดห้องนอน)',
  'All': 'All (สินค้าทั้งหมด)'
}

export function formatProductSup(raw: string | undefined | null): string {
  if (!raw) return '-'
  const trimmed = String(raw).trim()
  for (const [k, v] of Object.entries(PRODUCT_SUB_THAI_MAP)) {
    if (k.toLowerCase() === trimmed.toLowerCase()) return v
  }
  return trimmed
}

export async function downloadQuoteExcel(order: any) {
  const toastId = toast.loading(`กำลังประมวลผลรูปภาพและสร้างไฟล์ Excel บิล ${order.order_code || ''}...`)
  try {
    const res = await fetch(`/api/dispatch/export-excel?orderCode=${encodeURIComponent(order.order_code)}`)
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}))
      throw new Error(errJson.error || `เซิร์ฟเวอร์ตอบกลับผิดพลาด (${res.status})`)
    }
    const blob = await res.blob()
    saveAs(blob, `Quote_${order.order_code || 'export'}.xlsx`)

    toast.dismiss(toastId)
    toast.success(`ดาวน์โหลดไฟล์ Quote บิล ${order.order_code} (พร้อมรูปภาพจริง) เรียบร้อยแล้ว`)
  } catch (err: any) {
    toast.dismiss(toastId)
    toast.error('ไม่สามารถดาวน์โหลดได้: ' + (err?.message || err))
  }
}
