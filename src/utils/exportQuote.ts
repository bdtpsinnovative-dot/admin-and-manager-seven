import { toast } from 'sonner'

export const PRODUCT_SUB_THAI_MAP: Record<string, string> = {
  // Vase & Vessels
  'Ceramic Vases': 'Ceramic Vases (แจกันเซรามิก)',
  'Glass Vases': 'Glass Vases (แจกันแก้ว)',
  'Vessels': 'Vessels (ภาชนะ)',
  'Others Vase': 'Others Vase (แจกันอื่น ๆ)',
  
  // Figure
  'Animal Figure': 'Animal Figure (ตุ๊กตาสัตว์)',
  'Human Figure': 'Human Figure (ตุ๊กตามนุษย์)',
  'Plant Figure': 'Plant Figure (ตุ๊กตาผลไม้และพืช)',
  'Others Figure': 'Others Figure (ตุ๊กตาอื่น ๆ)',
  
  // Sculpture & Books & Candle
  'Sculpture': 'Sculpture (ประติมากรรมตกแต่ง)',
  'BOOKED': 'BOOKED (ตกแต่งชั้นหนังสือ)',
  'Book End': 'Book End (ตกแต่งชั้นหนังสือ)',
  'Candle Holder': 'Candle Holder (เชิงเทียน)',
  'CANDLE HOLDERS': 'Candle Holders (เชิงเทียน)',
  
  // Accessories
  'Box': 'Box (ภาชนะตกแต่ง)',
  'Trays': 'Trays (ถาดตกแต่ง)',
  'Toy': 'Toy (ของเล่นตกแต่ง)',
  
  // Dining & Tableware
  'Plates & Dishes': 'Plates & Dishes (จานตกแต่ง)',
  'Bowls': 'Bowls (ชาม)',
  'Glassware': 'Glassware (แก้วน้ำ, แก้วไวน์)',
  'Cups & Mugs': 'Cups & Mugs (ถ้วย, แก้วกาแฟ)',
  'Trays & Servingware': 'Trays & Servingware (ภาชนะเสิร์ฟ)',
  'Other Dining & Tableware': 'Other Dining & Tableware (เครื่องใช้บนโต๊ะอาหารอื่น ๆ)',
  
  // Dressing & Bath
  'Bath Room': 'Bath Room (ห้องน้ำ)',
  'Dressing Room': 'Dressing Room (ห้องแต่งตัว)',
  'Decorative Bath': 'Decorative Bath (ของใช้ในห้องน้ำ)',
  
  // Art & Wall Decor
  'Handmade': 'Handmade (ภาพวาด Handmade 100%)',
  '3D Handmade': '3D Handmade (ภาพตกแต่ง Handmade 3 มิติ)',
  'Digital print': 'Digital Print (ภาพดิจิตอลปริ้น)',
  'Digital Print': 'Digital Print (ภาพดิจิตอลปริ้น)',
  'Mixed Media Art': 'Mixed Media Art (ภาพวาด Handmade ผสมดิจิตอลปริ้น)',
  'Photo Frame': 'Photo Frame (กรอบรูป)',
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

export function downloadQuoteExcel(order: any) {
  try {
    const rowsHtml = (order.order_items || []).map((item: any) => {
      const p = item.products || {}
      const name = p.name || item.name || '-'
      const sku = p.sku || item.sku || '-'
      const picture = p.image_url || ''
      const rawSub = p.collection_groups?.product_sup || p.specs?.product_sup || '-'
      const productSup = formatProductSup(rawSub)
      const material = p.specs?.material || '-'
      const w = p.width_cm ?? p.specs?.width_cm ?? '-'
      const d = p.length_cm ?? p.specs?.length_cm ?? '-'
      const h = p.thickness_cm ?? p.specs?.thickness_cm ?? '-'
      const price = Number(item.price_at_sale ?? p.price ?? 0)

      return `
        <tr>
          <td style="border: 1px solid #333333; padding: 10px 8px; text-align: left; vertical-align: middle;">
            <div style="font-weight: bold; font-size: 13px; color: #111;">${name}</div>
            <div style="font-size: 11px; color: #555; font-family: monospace; margin-top: 3px;">${sku}</div>
            ${item.qty > 1 ? `<div style="font-size: 10px; font-weight: bold; color: #2563eb; margin-top: 2px;">จำนวน: x${item.qty}</div>` : ''}
          </td>
          <td style="border: 1px solid #333333; width: 100px; height: 100px; text-align: center; vertical-align: middle; padding: 4px;">
            ${picture ? `<img src="${picture}" width="80" height="80" style="object-fit: contain; max-height: 80px; max-width: 80px; display: block; margin: 0 auto;" />` : '-'}
          </td>
          <td style="border: 1px solid #333333; padding: 8px; text-align: center; vertical-align: middle; font-size: 12px; color: #222;">
            ${productSup}
          </td>
          <td style="border: 1px solid #333333; padding: 8px; text-align: center; vertical-align: middle; font-size: 12px; color: #222;">
            ${material}
          </td>
          <td style="border: 1px solid #333333; padding: 8px; text-align: center; vertical-align: middle; font-size: 12px; font-weight: 500;">
            ${w}
          </td>
          <td style="border: 1px solid #333333; padding: 8px; text-align: center; vertical-align: middle; font-size: 12px; font-weight: 500;">
            ${d}
          </td>
          <td style="border: 1px solid #333333; padding: 8px; text-align: center; vertical-align: middle; font-size: 12px; font-weight: 500;">
            ${h}
          </td>
          <td style="border: 1px solid #333333; padding: 8px; text-align: center; vertical-align: middle; font-size: 14px; font-weight: bold; background-color: #FFEAD8; color: #111;">
            ${price.toLocaleString('th-TH')}
          </td>
        </tr>
      `
    }).join('')

    const excelHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
        <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Quote</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
        <style>
          table { border-collapse: collapse; width: 100%; font-family: Tahoma, 'LINE Seed Sans TH', sans-serif; }
          th { border: 1px solid #333333; padding: 10px 8px; text-align: center; vertical-align: middle; font-weight: bold; background-color: #FFFFFF; font-size: 12px; }
          td { border: 1px solid #333333; }
        </style>
      </head>
      <body>
        <table border="1">
          <thead>
            <tr>
              <th style="width: 250px; text-align: center;">Product Name</th>
              <th style="width: 100px; text-align: center;">Picture</th>
              <th style="width: 220px; text-align: center;">Product Sup</th>
              <th style="width: 160px; text-align: center;">Material</th>
              <th style="width: 60px; text-align: center;">W</th>
              <th style="width: 60px; text-align: center;">D</th>
              <th style="width: 60px; text-align: center;">H</th>
              <th style="width: 110px; text-align: center; background-color: #FFEAD8;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </body>
      </html>
    `

    const blob = new Blob([excelHtml], { type: 'application/vnd.ms-excel;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `Quote_${order.order_code || 'export'}.xls`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast.success(`ดาวน์โหลดไฟล์ Quote บิล ${order.order_code} (พร้อมรูปภาพ) เรียบร้อยแล้ว`)
  } catch (err: any) {
    toast.error('ไม่สามารถดาวน์โหลดได้: ' + (err?.message || err))
  }
}
