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

// Convert image URL (including webp) to PNG base64 via browser canvas
async function fetchImageAsPngBase64(url: string): Promise<string | null> {
  if (!url) return null
  try {
    return await new Promise((resolve) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas')
          const maxDim = 240
          let w = img.naturalWidth || 200
          let h = img.naturalHeight || 200
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w)
              w = maxDim
            } else {
              w = Math.round((w * maxDim) / h)
              h = maxDim
            }
          }
          canvas.width = w
          canvas.height = h
          const ctx = canvas.getContext('2d')
          if (!ctx) return resolve(null)
          ctx.drawImage(img, 0, 0, w, h)
          const dataUrl = canvas.toDataURL('image/png')
          resolve(dataUrl.split(',')[1])
        } catch {
          resolve(null)
        }
      }
      img.onerror = () => resolve(null)
      img.src = url
    })
  } catch {
    return null
  }
}

export async function downloadQuoteExcel(order: any) {
  const toastId = toast.loading(`กำลังแปลงรูปภาพและสร้างไฟล์ Excel บิล ${order.order_code || ''}...`)
  try {
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Quote', {
      views: [{ showGridLines: true }]
    })

    // Setup columns matching user template
    worksheet.columns = [
      { header: 'Product Name', key: 'name', width: 34 },
      { header: 'Picture', key: 'picture', width: 18 },
      { header: 'Product Sup', key: 'product_sup', width: 30 },
      { header: 'Material', key: 'material', width: 22 },
      { header: 'W', key: 'w', width: 10 },
      { header: 'D', key: 'd', width: 10 },
      { header: 'H', key: 'h', width: 10 },
      { header: 'Price', key: 'price', width: 16 }
    ]

    // Style Header Row
    const headerRow = worksheet.getRow(1)
    headerRow.height = 30
    headerRow.eachCell((cell, colNumber) => {
      cell.font = { name: 'Tahoma', size: 11, bold: true, color: { argb: 'FF111111' } }
      cell.alignment = { vertical: 'middle', horizontal: 'center' }
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'medium', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      }
      if (colNumber === 8) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFEAD8' }
        }
      } else {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF9FAFB' }
        }
      }
    })

    const items = order.order_items || []

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      const p = item.products || {}
      const name = p.name || item.name || '-'
      const sku = p.sku || item.sku || '-'
      const rawSub = p.collection_groups?.product_sup || p.specs?.product_sup || '-'
      const productSup = formatProductSup(rawSub)
      const material = p.specs?.material || '-'
      const w = p.width_cm ?? p.specs?.width_cm ?? '-'
      const d = p.length_cm ?? p.specs?.length_cm ?? '-'
      const h = p.thickness_cm ?? p.specs?.thickness_cm ?? '-'
      const price = Number(item.price_at_sale ?? p.price ?? 0)

      const rowIndex = i + 2
      const row = worksheet.addRow({
        name: `${name}\n${sku}${item.qty > 1 ? ` (x${item.qty})` : ''}`,
        picture: '',
        product_sup: productSup,
        material: material,
        w: w,
        d: d,
        h: h,
        price: price
      })

      row.height = 75 // Height for image display

      // Style row cells
      row.eachCell((cell, colNumber) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        }
        cell.font = { name: 'Tahoma', size: 10 }

        if (colNumber === 1) {
          cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true }
        } else if (colNumber === 8) {
          cell.alignment = { vertical: 'middle', horizontal: 'center' }
          cell.font = { name: 'Tahoma', size: 12, bold: true }
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFEAD8' }
          }
          cell.numFmt = '#,##0'
        } else {
          cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
        }
      })

      // Fetch & embed actual PNG image into cell
      if (p.image_url) {
        const base64 = await fetchImageAsPngBase64(p.image_url)
        if (base64) {
          const imageId = workbook.addImage({
            base64: base64,
            extension: 'png'
          })

          worksheet.addImage(imageId, {
            tl: { col: 1.15, row: rowIndex - 1 + 0.1 },
            ext: { width: 75, height: 70 },
            editAs: 'oneCell'
          })
        }
      }
    }

    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    saveAs(blob, `Quote_${order.order_code || 'export'}.xlsx`)

    toast.dismiss(toastId)
    toast.success(`ดาวน์โหลดไฟล์ Quote บิล ${order.order_code} (พร้อมรูปภาพจริง & ภาษาไทย) เรียบร้อยแล้ว`)
  } catch (err: any) {
    toast.dismiss(toastId)
    toast.error('ไม่สามารถสร้างไฟล์ Excel ได้: ' + (err?.message || err))
  }
}
