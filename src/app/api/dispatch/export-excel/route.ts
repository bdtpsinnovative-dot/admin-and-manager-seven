import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import sharp from "sharp"
import ExcelJS from "exceljs"
import { formatProductSup } from "@/utils/exportQuote"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const orderCode = searchParams.get("orderCode")

  if (!orderCode) {
    return NextResponse.json({ error: "Missing orderCode" }, { status: 400 })
  }

  try {
    const supabase = await createClient()

    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        id,
        order_code,
        created_at,
        shipping_name,
        shipping_phone,
        shipping_address,
        status,
        order_items (
          id,
          qty,
          price_at_sale,
          products!order_items_product_fk (
            name,
            sku,
            image_url,
            price,
            specs,
            width_cm,
            length_cm,
            thickness_cm,
            collection_groups ( product_sup )
          )
        )
      `)
      .eq('order_code', orderCode)
      .single()

    if (error || !order) {
      console.error("Order not found or error:", error)
      return NextResponse.json({ error: error?.message || "Order not found" }, { status: 404 })
    }

    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet("Quote", {
      views: [{ showGridLines: true }]
    })

    sheet.columns = [
      { header: "Product Name", key: "name", width: 34 },
      { header: "Picture", key: "picture", width: 18 },
      { header: "Product Sup", key: "product_sup", width: 30 },
      { header: "Material", key: "material", width: 22 },
      { header: "W", key: "w", width: 10 },
      { header: "D", key: "d", width: 10 },
      { header: "H", key: "h", width: 10 },
      { header: "Price", key: "price", width: 16 },
    ]

    // Style header row
    const headerRow = sheet.getRow(1)
    headerRow.height = 30
    headerRow.eachCell((cell, colNumber) => {
      cell.font = { name: "Tahoma", size: 11, bold: true, color: { argb: "FF111111" } }
      cell.alignment = { vertical: "middle", horizontal: "center" }
      cell.border = {
        top: { style: "thin", color: { argb: "FF000000" } },
        left: { style: "thin", color: { argb: "FF000000" } },
        bottom: { style: "medium", color: { argb: "FF000000" } },
        right: { style: "thin", color: { argb: "FF000000" } }
      }
      if (colNumber === 8) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFEAD8" } }
      } else {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF9FAFB" } }
      }
    })

    const items = order.order_items || []

    for (let i = 0; i < items.length; i++) {
      const item = items[i] as any
      const p = item.products || {}
      const name = p.name || "-"
      const sku = p.sku || "-"
      const rawSub = p.collection_groups?.product_sup || p.specs?.product_sup || "-"
      const productSup = formatProductSup(rawSub)
      const material = p.specs?.material || "-"
      const w = p.width_cm ?? p.specs?.width_cm ?? "-"
      const d = p.length_cm ?? p.specs?.length_cm ?? "-"
      const h = p.thickness_cm ?? p.specs?.thickness_cm ?? "-"
      const price = Number(item.price_at_sale ?? p.price ?? 0)

      const row = sheet.addRow({
        name: `${name}\n${sku}${item.qty > 1 ? ` (x${item.qty})` : ""}`,
        picture: "",
        product_sup: productSup,
        material: material,
        w: w,
        d: d,
        h: h,
        price: price
      })

      row.height = 75

      row.eachCell((cell, colNumber) => {
        cell.border = {
          top: { style: "thin", color: { argb: "FF000000" } },
          left: { style: "thin", color: { argb: "FF000000" } },
          bottom: { style: "thin", color: { argb: "FF000000" } },
          right: { style: "thin", color: { argb: "FF000000" } }
        }
        cell.font = { name: "Tahoma", size: 10 }

        if (colNumber === 1) {
          cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true }
        } else if (colNumber === 8) {
          cell.alignment = { vertical: "middle", horizontal: "center" }
          cell.font = { name: "Tahoma", size: 12, bold: true }
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFEAD8" } }
          cell.numFmt = "#,##0"
        } else {
          cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true }
        }
      })

      // Image processing with sharp (exactly like publicstock)
      const imageUrl = p.image_url
      if (imageUrl) {
        try {
          const res = await fetch(imageUrl)
          if (res.ok) {
            const arrayBuffer = await res.arrayBuffer()
            const inputBuffer = Buffer.from(arrayBuffer)
            const outputBuffer = await sharp(inputBuffer).jpeg({ quality: 85 }).toBuffer()
            const base64str = outputBuffer.toString("base64")

            const imageId = workbook.addImage({
              base64: `data:image/jpeg;base64,${base64str}`,
              extension: "jpeg"
            })

            sheet.addImage(imageId, {
              tl: { col: 1.15, row: row.number - 1 + 0.1 },
              ext: { width: 75, height: 70 },
              editAs: "oneCell"
            })
          }
        } catch (imgErr) {
          console.error("Image processing error for item:", name, imgErr)
        }
      }
    }

    const buffer = await workbook.xlsx.writeBuffer()

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="Quote_${orderCode}.xlsx"`
      }
    })
  } catch (err: any) {
    console.error("Failed to export quote excel:", err)
    return NextResponse.json({ error: err?.message || "Internal error" }, { status: 500 })
  }
}
