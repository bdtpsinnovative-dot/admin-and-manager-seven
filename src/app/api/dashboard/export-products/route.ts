import { NextRequest, NextResponse } from "next/server"
import ExcelJS from "exceljs"
import sharp from "sharp"
import type { DashboardProductSummary } from "@/actions/dashboard"

export const dynamic = "force-dynamic"
export const maxDuration = 60 // Allow up to 60s for image processing if many products

async function fetchAndConvertImage(url: string): Promise<string | null> {
  try {
    if (!url || typeof url !== "string") return null
    let targetUrl = url.trim()
    if (targetUrl.startsWith("/")) {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
      targetUrl = `${baseUrl}${targetUrl}`
    }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 6000)
    const res = await fetch(targetUrl, { signal: controller.signal })
    clearTimeout(timer)

    if (!res.ok) return null
    const arrayBuffer = await res.arrayBuffer()
    const inputBuffer = Buffer.from(arrayBuffer)

    const outputBuffer = await sharp(inputBuffer)
      .resize({ width: 140, height: 140, fit: "inside" })
      .jpeg({ quality: 80 })
      .toBuffer()

    return outputBuffer.toString("base64")
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const products: DashboardProductSummary[] = body.products || []
    const title: string = body.title || "สรุปยอดรายสินค้า"
    const includeImages: boolean = Boolean(body.includeImages)

    if (!Array.isArray(products) || products.length === 0) {
      return NextResponse.json({ error: "ไม่พบข้อมูลสินค้าสำหรับส่งออก" }, { status: 400 })
    }

    const workbook = new ExcelJS.Workbook()
    workbook.creator = "Wallcraft Dashboard"
    workbook.created = new Date()

    const cleanSheetName = (title.replace(/[\*\?:\/\\\[\]]/g, " ").trim().slice(0, 31)) || "สรุปยอดรายสินค้า"
    const sheet = workbook.addWorksheet(cleanSheetName, {
      views: [{ showGridLines: true }]
    })

    // 1. หัวข้อรายงานแถวบน
    sheet.mergeCells("A1:K1")
    const titleCell = sheet.getCell("A1")
    titleCell.value = title
    titleCell.font = { name: "Segoe UI", size: 16, bold: true, color: { argb: "FF0F172A" } }
    titleCell.alignment = { vertical: "middle", horizontal: "left" }
    sheet.getRow(1).height = 32

    sheet.mergeCells("A2:K2")
    const subTitleCell = sheet.getCell("A2")
    const exportTimeStr = new Date().toLocaleString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
    subTitleCell.value = `ส่งออกเมื่อ: ${exportTimeStr} น. | จำนวนสินค้า: ${products.length.toLocaleString()} รายการ | รูปแบบ: ${includeImages ? "พร้อมรูปภาพสินค้า" : "ข้อมูลตัวเลข (ไม่มีรูป)"} | สูตรคำนวณ: [ยอดรับเงินลูกค้า] - [VAT 7%] = [เงินแท้จริงเข้าร้าน]`
    subTitleCell.font = { name: "Segoe UI", size: 10, italic: true, color: { argb: "FF64748B" } }
    subTitleCell.alignment = { vertical: "middle", horizontal: "left" }
    sheet.getRow(2).height = 20

    sheet.getRow(3).height = 10 // แถวว่างคั่น

    // 2. กำหนดคอลัมน์
    interface ColDef {
      header: string
      key: string
      width: number
      align: "center" | "left" | "right"
      numFmt?: string
      bold?: boolean
      color?: string
    }

    const columnsConfig: ColDef[] = [
      { header: "ลำดับ", key: "no", width: 8, align: "center" },
      ...(includeImages ? [{ header: "รูปสินค้า", key: "image", width: 14, align: "center" as const }] : []),
      { header: "ชื่อสินค้า", key: "name", width: 36, align: "left" },
      { header: "SKU", key: "sku", width: 22, align: "left" },
      { header: "หมวดหมู่", key: "category", width: 20, align: "left" },
      { header: "จำนวนขาย (ชิ้น)", key: "qty", width: 16, align: "right", numFmt: "#,##0" },
      { header: "จำนวนบิล", key: "billCount", width: 14, align: "right", numFmt: "#,##0" },
      { header: "ยอดก่อนลด (บาท)", key: "gross", width: 18, align: "right", numFmt: "฿#,##0.00" },
      { header: "ส่วนลด (บาท)", key: "discount", width: 16, align: "right", numFmt: "฿#,##0.00" },
      { header: "ส่วนลด (%)", key: "discountPercent", width: 13, align: "right", numFmt: "0.0%" },
      { header: "ยอดรับเงินลูกค้า (รวม VAT)", key: "sales", width: 22, align: "right", numFmt: "฿#,##0.00", bold: true },
      { header: "VAT (7%)", key: "vat", width: 16, align: "right", numFmt: "฿#,##0.00" },
      { header: "เงินเข้าร้าน (ก่อน VAT)", key: "netBeforeVat", width: 22, align: "right", numFmt: "฿#,##0.00", bold: true, color: "FF047857" },
      { header: "ขายล่าสุด", key: "lastSaleAt", width: 20, align: "center" },
      { header: "ลิงก์รูปภาพ", key: "imageUrl", width: 32, align: "left" },
    ]

    sheet.columns = columnsConfig.map(col => ({
      key: col.key,
      width: col.width,
    }))

    // Header Row อยู่ที่บรรทัดที่ 4
    const headerRow = sheet.getRow(4)
    headerRow.height = 32
    columnsConfig.forEach((col, idx) => {
      const cell = headerRow.getCell(idx + 1)
      cell.value = col.header
      cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FFFFFFFF" } }
      cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true }
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: col.key === "netBeforeVat" ? "FF065F46" : "FF0F172A" },
      }
      cell.border = {
        top: { style: "thin", color: { argb: "FF334155" } },
        bottom: { style: "medium", color: { argb: "FF0F172A" } },
        left: { style: "thin", color: { argb: "FF334155" } },
        right: { style: "thin", color: { argb: "FF334155" } },
      }
    })

    // 3. เตรียมข้อมูลและดาวน์โหลดรูปพร้อมกันแบบเป็นกลุ่ม (Batching)
    const imageBase64Map = new Map<number, string>()
    if (includeImages) {
      const BATCH_SIZE = 8
      for (let i = 0; i < products.length; i += BATCH_SIZE) {
        const batch = products.slice(i, i + BATCH_SIZE)
        await Promise.all(
          batch.map(async (p, bIdx) => {
            const actualIndex = i + bIdx
            if (p.imageUrl) {
              const b64 = await fetchAndConvertImage(p.imageUrl)
              if (b64) imageBase64Map.set(actualIndex, b64)
            }
          })
        )
      }
    }

    // 4. เขียนแถวข้อมูลสินค้า
    let totalQty = 0
    let totalBills = 0
    let totalGross = 0
    let totalDiscount = 0
    let totalSales = 0
    let totalVat = 0
    let totalNetBeforeVat = 0

    for (let i = 0; i < products.length; i++) {
      const p = products[i]
      totalQty += Number(p.quantity) || 0
      totalBills += Number(p.billCount) || 0
      totalGross += Number(p.grossSales) || 0
      totalDiscount += Number(p.discountAmount) || 0
      totalSales += Number(p.sales) || 0
      totalVat += Number(p.vatAmount) || 0
      totalNetBeforeVat += Number(p.netBeforeVat) || 0

      const lastSaleStr = p.lastSaleAt
        ? new Date(p.lastSaleAt).toLocaleDateString("th-TH", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "-"

      const rowValues: Record<string, any> = {
        no: i + 1,
        ...(includeImages ? { image: "" } : {}),
        name: p.name || "-",
        sku: p.sku || "-",
        category: p.categoryName || "-",
        qty: Number(p.quantity) || 0,
        billCount: Number(p.billCount) || 0,
        gross: Number(p.grossSales) || 0,
        discount: Number(p.discountAmount) || 0,
        discountPercent: (Number(p.discountPercent) || 0) / 100,
        sales: Number(p.sales) || 0,
        vat: Number(p.vatAmount) || 0,
        netBeforeVat: Number(p.netBeforeVat) || 0,
        lastSaleAt: lastSaleStr,
        imageUrl: p.imageUrl || "-",
      }

      const row = sheet.addRow(rowValues)
      row.height = includeImages ? 62 : 24
      const isEven = i % 2 === 1

      columnsConfig.forEach((col, colIdx) => {
        const cell = row.getCell(colIdx + 1)
        cell.alignment = {
          vertical: "middle",
          horizontal: col.align,
          wrapText: col.key === "name" || col.key === "imageUrl",
        }
        cell.font = {
          name: "Segoe UI",
          size: 10,
          bold: Boolean(col.bold),
          color: { argb: col.color || (col.key === "sku" ? "FF475569" : "FF1E293B") },
        }
        if (col.numFmt) {
          cell.numFmt = col.numFmt
        }
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: {
            argb: col.key === "netBeforeVat"
              ? "FFECFDF5"
              : isEven
              ? "FFF8FAFC"
              : "FFFFFFFF",
          },
        }
        cell.border = {
          top: { style: "thin", color: { argb: "FFE2E8F0" } },
          bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
          left: { style: "thin", color: { argb: "FFE2E8F0" } },
          right: { style: "thin", color: { argb: "FFE2E8F0" } },
        }
      })

      // ฝังรูปภาพลงในเซลล์
      if (includeImages) {
        const b64 = imageBase64Map.get(i)
        if (b64) {
          try {
            const imageId = workbook.addImage({
              base64: `data:image/jpeg;base64,${b64}`,
              extension: "jpeg",
            })
            sheet.addImage(imageId, {
              tl: { col: 1.15, row: row.number - 1 + 0.1 },
              ext: { width: 56, height: 56 },
              editAs: "oneCell",
            })
          } catch (imgErr) {
            console.error("Failed to add image to excel sheet:", p.name, imgErr)
          }
        }
      }
    }

    // 5. แถวสรุปรวมทั้งสิ้น (Summary Row)
    const summaryRowValues: Record<string, any> = {
      no: "",
      ...(includeImages ? { image: "" } : {}),
      name: "รวมทั้งหมด",
      sku: `${products.length.toLocaleString()} รายการ`,
      category: "",
      qty: totalQty,
      billCount: totalBills,
      gross: totalGross,
      discount: totalDiscount,
      discountPercent: totalGross > 0 ? totalDiscount / totalGross : 0,
      sales: totalSales,
      vat: totalVat,
      netBeforeVat: totalNetBeforeVat,
      lastSaleAt: "",
      imageUrl: "",
    }

    const summaryRow = sheet.addRow(summaryRowValues)
    summaryRow.height = 30

    columnsConfig.forEach((col, colIdx) => {
      const cell = summaryRow.getCell(colIdx + 1)
      cell.alignment = { vertical: "middle", horizontal: col.align }
      cell.font = {
        name: "Segoe UI",
        size: 11,
        bold: true,
        color: { argb: col.key === "netBeforeVat" ? "FF047857" : "FF0F172A" },
      }
      if (col.numFmt) {
        cell.numFmt = col.numFmt
      }
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: col.key === "netBeforeVat" ? "FFD1FAE5" : "FFE2E8F0" },
      }
      cell.border = {
        top: { style: "medium", color: { argb: "FF0F172A" } },
        bottom: { style: "double", color: { argb: "FF0F172A" } },
        left: { style: "thin", color: { argb: "FFCBD5E1" } },
        right: { style: "thin", color: { argb: "FFCBD5E1" } },
      }
    })

    const buffer = await workbook.xlsx.writeBuffer()
    const fileName = `${title.replace(/[\/\\]/g, "_")}_${includeImages ? "พร้อมรูป" : "ไม่มีรูป"}_${new Date().toISOString().split("T")[0]}.xlsx`

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
      },
    })
  } catch (error: any) {
    console.error("Dashboard product export excel error:", error)
    return NextResponse.json({ error: error?.message || "ไม่สามารถสร้างไฟล์ Excel ได้" }, { status: 500 })
  }
}
