import { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import sharp from "sharp"
import ExcelJS from "exceljs"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const branchId = Number(searchParams.get("branchId") || "1")
  const includeImages = searchParams.get("includeImages") === "true"
  const onlyInStock = searchParams.get("onlyInStock") === "true"

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      try {
        sendEvent({ progress: 5, current: 0, total: 0, message: "กำลังดึงข้อมูลสต็อกสินค้า..." })

        const supabase = await createClient()
        let query = supabase
          .from("stock")
          .select(`
            qty,
            products!inner (name, price, specs, image_url, sku, barcode)
          `)
          .eq("branch_id", branchId)

        if (onlyInStock) {
          query = query.gt("qty", 0)
        }

        query = query.order("qty", { ascending: false })

        const { data, error } = await query
        if (error) throw error
        if (!data || data.length === 0) {
          sendEvent({ error: "ไม่พบข้อมูลสินค้าสำหรับส่งออก", done: true })
          controller.close()
          return
        }

        const totalItems = data.length
        sendEvent({
          progress: 10,
          current: 0,
          total: totalItems,
          message: `พบสินค้าทั้งหมด ${totalItems.toLocaleString()} รายการ กำลังเริ่มสร้าง Excel...`
        })

        const workbook = new ExcelJS.Workbook()
        const sheet = workbook.addWorksheet("Stock")

        sheet.columns = [
          { header: "No", key: "no", width: 8 },
          { header: "Image", key: "image", width: 14 },
          { header: "Product", key: "product", width: 45 },
          { header: "SKU", key: "sku", width: 25 },
          { header: "Barcode", key: "barcode", width: 20 },
          { header: "Size (cm)", key: "size", width: 25 },
          { header: "Qty", key: "qty", width: 10 },
          { header: "Price", key: "price", width: 15 },
        ]

        sheet.getRow(1).font = { bold: true }
        sheet.getRow(1).alignment = { vertical: "middle", horizontal: "center" }

        for (let i = 0; i < totalItems; i++) {
          const item = data[i] as any
          const specs = item.products?.specs || {}
          const w = specs.width_cm || "-"
          const d = specs.length_cm || "-"
          const h = specs.thickness_cm || "-"

          const row = sheet.addRow({
            no: i + 1,
            product: item.products?.name || "-",
            sku: item.products?.sku || "-",
            barcode: item.products?.barcode || "-",
            size: `W${w} x D${d} x H${h}`,
            qty: Number(item.qty) || 0,
            price: Number(item.products?.price) || 0
          })

          row.height = includeImages ? 60 : 24
          row.alignment = { vertical: "middle" }

          if (includeImages) {
            let imageUrl = item.products?.image_url
            if (imageUrl) {
              if (imageUrl.startsWith("/")) {
                imageUrl = process.env.NEXT_PUBLIC_SITE_URL
                  ? process.env.NEXT_PUBLIC_SITE_URL + imageUrl
                  : "http://localhost:3000" + imageUrl
              }

              try {
                const res = await fetch(imageUrl)
                if (res.ok) {
                  const arrayBuffer = await res.arrayBuffer()
                  const inputBuffer = Buffer.from(arrayBuffer)
                  const outputBuffer = await sharp(inputBuffer).jpeg({ quality: 80 }).toBuffer()
                  const base64str = outputBuffer.toString("base64")

                  const imageId = workbook.addImage({
                    base64: `data:image/jpeg;base64,${base64str}`,
                    extension: "jpeg"
                  })

                  sheet.addImage(imageId, {
                    tl: { col: 1, row: row.number - 1 },
                    ext: { width: 60, height: 60 },
                    editAs: "oneCell"
                  })
                }
              } catch (imgErr) {
                console.error("Image processing error for item:", item.products?.name, imgErr)
              }
            }
          }

          const reportInterval = includeImages
            ? Math.max(1, Math.floor(totalItems / 100))
            : Math.max(10, Math.floor(totalItems / 20))

          if ((i + 1) % reportInterval === 0 || i === totalItems - 1) {
            const calculatedPct = Math.round(10 + ((i + 1) / totalItems) * 82)
            sendEvent({
              progress: Math.min(94, calculatedPct),
              current: i + 1,
              total: totalItems,
              message: includeImages
                ? `กำลังประมวลผลรูปภาพ (${(i + 1).toLocaleString()} / ${totalItems.toLocaleString()})...`
                : `กำลังประมวลผลข้อมูล (${(i + 1).toLocaleString()} / ${totalItems.toLocaleString()})...`
            })
          }
        }

        sendEvent({
          progress: 96,
          current: totalItems,
          total: totalItems,
          message: "กำลังแปลงและจัดโครงสร้างไฟล์ Excel..."
        })

        const buffer = await workbook.xlsx.writeBuffer()
        const base64 = Buffer.from(buffer).toString("base64")

        sendEvent({
          progress: 100,
          current: totalItems,
          total: totalItems,
          done: true,
          data: base64,
          message: "สร้างไฟล์ Excel สำเร็จ กำลังเริ่มดาวน์โหลด..."
        })

        controller.close()
      } catch (err: any) {
        console.error("Export stream error:", err)
        sendEvent({ error: err.message || "เกิดข้อผิดพลาดในการส่งออก Excel", done: true })
        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive"
    }
  })
}
