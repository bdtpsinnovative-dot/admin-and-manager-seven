import * as XLSX from "xlsx"
import { saveAs } from "file-saver"
import type { AudienceProduct, AudiencePersona } from "../../../../actions/audience-analytics"

function formatDateTime(value: string | null): string {
  if (!value) return "-"
  try {
    const d = new Date(value)
    return new Intl.DateTimeFormat("th-TH", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(d)
  } catch {
    return value
  }
}

function formatSeconds(value: number): string {
  if (!value || isNaN(value)) return "0 วิ"
  if (value < 60) return `${value} วิ`
  const minutes = Math.floor(value / 60)
  const remainder = value % 60
  return `${minutes} นาที ${remainder} วิ`
}

function extractContactActions(labels: string[]): string {
  const actions = labels.filter(
    (l) => l.startsWith("กด") || l === "เปิดเมนูติดต่อ" || l === "หยิบใส่ตะกร้า" || l.includes("CTA")
  )
  return actions.length > 0 ? actions.join(", ") : "ไม่มีการกดติดต่อ"
}

export function mapProductsToRows(products: AudienceProduct[]) {
  return products.map((p, idx) => ({
    "ลำดับ": idx + 1,
    "รหัสสินค้า (ID)": p.id,
    "ชื่อสินค้า": p.name,
    "รหัส SKU": p.sku || "-",
    "หมวดหมู่ (Category)": p.category || "-",
    "กลุ่มคอลเลกชัน": p.collection || "-",
    "สี": p.color || "-",
    "ราคา (บาท)": p.price !== null ? p.price : "-",
    "สถานะสินค้า": p.status === "active" ? "มีสินค้า (Active)" : p.status || "-",
    "ยอดดูทั้งหมด (ครั้ง)": p.totalViews,
    "ยอดดูไม่ซ้ำ (คน)": p.uniqueViews,
    "ยอดดูซ้ำ (ครั้ง)": p.repeatViews,
    "เวลาเฉลี่ย (วินาที)": p.avgActiveSeconds,
    "เวลาเฉลี่ย (อ่านง่าย)": formatSeconds(p.avgActiveSeconds),
    "ตีกลับเร็ว (ครั้ง)": p.quickBounceCount,
    "ไปต่อดูสินค้าอื่น (ครั้ง)": p.continueProductCount,
    "ไปต่อดูคอลเลกชัน (ครั้ง)": p.continueCollectionCount,
    "ไปต่อดูหน้าอื่นๆ (ครั้ง)": p.continueOtherCount,
    "ไปต่อรวมทั้งหมด (ครั้ง)": p.continueProductCount + p.continueCollectionCount + p.continueOtherCount,
    "อุปกรณ์หลัก": p.primaryDevice || "-",
    "สัดส่วนอุปกรณ์หลัก (%)": p.primaryDeviceShare,
    "เบราว์เซอร์หลัก": p.primaryBrowser || "-",
    "สัดส่วนเบราว์เซอร์หลัก (%)": p.primaryBrowserShare,
    "ช่องทางหลักที่มา": p.primarySource || "-",
    "สัดส่วนช่องทางหลัก (%)": p.primarySourceShare,
    "จังหวัด/สถานที่หลัก": p.primaryLocation || "-",
    "สัดส่วนสถานที่หลัก (%)": p.primaryLocationShare,
    "เข้าชมล่าสุดเมื่อ": formatDateTime(p.lastViewedAt),
    "ลิงก์รูปภาพ": p.imageUrl || "-",
  }))
}

export function mapPersonasToRows(personas: AudiencePersona[]) {
  return personas.map((p, idx) => {
    const fullId = p.identityKey.replace(/^(visitor|user):/, "")
    const displayName = p.identityType === "user"
      ? (p.identityLabel.includes("…") || p.identityLabel.includes("...") ? fullId : p.identityLabel)
      : `Visitor ${fullId}`

    return {
      "ลำดับ": idx + 1,
      "รหัสประจำตัว (UUID เต็ม)": fullId,
      "ชื่อ / รหัสแสดงผล": displayName,
    "ประเภทผู้ชม": p.identityType === "user" ? "บัญชีที่ล็อกอิน" : "ผู้เข้าชมทั่วไป (Visitor)",
    "พบครั้งแรกเมื่อ": formatDateTime(p.firstSeenAt),
    "เข้าชมล่าสุดเมื่อ": formatDateTime(p.lastSeenAt),
    "จังหวัด / สถานที่": p.location || "ไม่ระบุ",
    "จำนวนครั้งที่เข้าเว็บ (Sessions)": p.sessions,
    "จำนวนหน้าทั้งหมด (Page Views)": p.pageViews,
    "จำนวนหน้าที่ดูไม่ซ้ำ": p.uniquePages,
    "เวลาใช้งานรวม (วินาที)": p.activeSeconds,
    "เวลาใช้งานรวม (อ่านง่าย)": formatSeconds(p.activeSeconds),
    "เวลาเฉลี่ยต่อครั้ง (วินาที)": p.averageSessionSeconds,
    "เวลาเฉลี่ยต่อครั้ง (อ่านง่าย)": formatSeconds(p.averageSessionSeconds),
    "ราคาสินค้าเฉลี่ยที่ดู (บาท)": p.averagePrice !== null ? p.averagePrice : "-",
    "ราคาสินค้าต่ำสุดที่ดู (บาท)": p.minPrice !== null ? p.minPrice : "-",
    "ราคาสินค้าสูงสุดที่ดู (บาท)": p.maxPrice !== null ? p.maxPrice : "-",
    "อุปกรณ์": p.device || "-",
    "ระบบปฏิบัติการ (OS)": p.os || "-",
    "เบราว์เซอร์": p.browser || "-",
    "ช่องทางแรกที่เข้าเว็บ": p.firstTouchSource || "-",
    "ช่องทางล่าสุดที่เข้าเว็บ": p.latestSource || "-",
    "การกดปุ่ม / สนใจติดต่อ": extractContactActions(p.labels),
    "หมวดหมู่สินค้าที่สนใจ": p.categories.join(", ") || "-",
    "กลุ่มพฤติกรรม (Persona Labels)": p.labels.join(", ") || "-",
    "รายละเอียดและเหตุผล": p.reasons.join(" | ") || "-",
  }
})
}

function calculateColumnWidths(data: Record<string, any>[]): { wch: number }[] {
  if (data.length === 0) return []
  const keys = Object.keys(data[0])
  return keys.map((key) => {
    let maxLength = key.length * 1.5 // Give extra weight to Thai text
    for (let i = 0; i < Math.min(data.length, 100); i++) {
      const val = data[i][key]
      if (val !== undefined && val !== null) {
        const strVal = String(val)
        // Thai characters take roughly 1.3 - 1.5 width in monospace/excel
        const len = strVal.length * 1.3
        if (len > maxLength) maxLength = len
      }
    }
    return { wch: Math.min(Math.max(Math.ceil(maxLength) + 2, 10), 60) }
  })
}

function getTodayStamp() {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${year}${month}${day}`
}

/**
 * ส่งออกสินค้าเป็น Excel (.xlsx)
 */
export function exportProductsExcel(
  products: AudienceProduct[],
  filename = `Audience_Products_${getTodayStamp()}`,
  sheetName = "วิเคราะห์สินค้า"
) {
  const rows = mapProductsToRows(products)
  const worksheet = XLSX.utils.json_to_sheet(rows)
  worksheet["!cols"] = calculateColumnWidths(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31))
  XLSX.writeFile(workbook, `${filename}.xlsx`)
}

/**
 * ส่งออกสินค้าเป็น CSV (.csv) พร้อม UTF-8 BOM
 */
export function exportProductsCsv(
  products: AudienceProduct[],
  filename = `Audience_Products_${getTodayStamp()}`
) {
  const rows = mapProductsToRows(products)
  const worksheet = XLSX.utils.json_to_sheet(rows)
  const csvContent = XLSX.utils.sheet_to_csv(worksheet)
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" })
  saveAs(blob, `${filename}.csv`)
}

/**
 * ส่งออก Persona เป็น Excel (.xlsx)
 */
export function exportPersonasExcel(
  personas: AudiencePersona[],
  filename = `Audience_Personas_${getTodayStamp()}`,
  sheetName = "วิเคราะห์ผู้ชม_Persona"
) {
  const rows = mapPersonasToRows(personas)
  const worksheet = XLSX.utils.json_to_sheet(rows)
  worksheet["!cols"] = calculateColumnWidths(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31))
  XLSX.writeFile(workbook, `${filename}.xlsx`)
}

/**
 * ส่งออก Persona เป็น CSV (.csv) พร้อม UTF-8 BOM
 */
export function exportPersonasCsv(
  personas: AudiencePersona[],
  filename = `Audience_Personas_${getTodayStamp()}`
) {
  const rows = mapPersonasToRows(personas)
  const worksheet = XLSX.utils.json_to_sheet(rows)
  const csvContent = XLSX.utils.sheet_to_csv(worksheet)
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" })
  saveAs(blob, `${filename}.csv`)
}

/**
 * ส่งออกทั้งหมด (สินค้า + Persona) รวมใน Excel เล่มเดียว (Multiple Sheets)
 */
export function exportAllAudienceExcel(
  products: AudienceProduct[],
  personas: AudiencePersona[],
  filename = `Audience_Analytics_Full_${getTodayStamp()}`
) {
  const workbook = XLSX.utils.book_new()

  const productRows = mapProductsToRows(products)
  const productSheet = XLSX.utils.json_to_sheet(productRows)
  productSheet["!cols"] = calculateColumnWidths(productRows)
  XLSX.utils.book_append_sheet(workbook, productSheet, "วิเคราะห์สินค้า")

  const personaRows = mapPersonasToRows(personas)
  const personaSheet = XLSX.utils.json_to_sheet(personaRows)
  personaSheet["!cols"] = calculateColumnWidths(personaRows)
  XLSX.utils.book_append_sheet(workbook, personaSheet, "วิเคราะห์ผู้ชม Persona")

  XLSX.writeFile(workbook, `${filename}.xlsx`)
}
