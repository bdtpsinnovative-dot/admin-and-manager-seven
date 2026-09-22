"use client"

import React, { useState, useMemo } from "react"
import {
  FolderOpen,
  Tag,
  TrendingUp,
  Layers,
  HelpCircle,
  ShoppingBag,
} from "lucide-react"
import type { DashboardCategorySummary } from "@/actions/dashboard"

const money = (value: number) =>
  value.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

interface DashboardCategoryTableProps {
  categories: DashboardCategorySummary[]
  title?: string
  subtitle?: string
  initialTab?: "PROP" | "ALL" | "FURNITURE" | "WOOD"
  selectedCategoryKey?: string // กรองตามชื่อหมวดหมู่จริงๆ เช่น VASE & VESSELS, FIGURE
}

export default function DashboardCategoryTable({
  categories,
  title = "สรุปยอดขายแยกตามหมวดหมู่",
  subtitle = "อันดับหมวดหมู่สินค้าขายดี เรียงตามเงินแท้จริงเข้าร้าน",
  initialTab = "PROP",
  selectedCategoryKey = "ALL",
}: DashboardCategoryTableProps) {
  const [activeTab, setActiveTab] = useState<"PROP" | "ALL" | "FURNITURE" | "WOOD">(initialTab)
  const [sortBy, setSortBy] = useState<"sales" | "qty" | "bills">("sales")

  // กรองตามหมวดหมู่จริง (จาก URL param) ถ้าเลือกเฉพาะหมวด จะข้ามแท็บ PROP/FURNITURE/WOOD
  const filteredCategories = useMemo(() => {
    // ถ้าเลือกหมวดหมู่เฉพาะ ให้กรองตาม key หรือ name นั้นเลย ไม่ต้องกรองแท็บ
    if (selectedCategoryKey && selectedCategoryKey !== "ALL") {
      const lower = selectedCategoryKey.trim().toLowerCase()
      return categories.filter(
        (cat) =>
          cat.key.trim().toLowerCase() === lower ||
          cat.name.trim().toLowerCase() === lower
      )
    }
    // ปกติกรองตามแท็บ
    return categories.filter((cat) => {
      if (activeTab === "ALL") return true
      if (activeTab === "PROP") return cat.groupType === "prop"
      if (activeTab === "FURNITURE") return cat.groupType === "furniture"
      if (activeTab === "WOOD") return cat.groupType === "wood"
      return true
    })
  }, [categories, activeTab, selectedCategoryKey])

  // จัดเรียง
  const sortedCategories = useMemo(() => {
    const list = [...filteredCategories]
    if (sortBy === "sales") {
      return list.sort((a, b) => b.netBeforeVat - a.netBeforeVat)
    } else if (sortBy === "qty") {
      return list.sort((a, b) => b.quantity - a.quantity)
    } else {
      return list.sort((a, b) => b.billCount - a.billCount)
    }
  }, [filteredCategories, sortBy])

  // ยอดรวมของตาราง
  const totals = useMemo(() => {
    return filteredCategories.reduce(
      (acc, c) => {
        acc.quantity += c.quantity
        acc.grossSales += c.grossSales
        acc.discountAmount += c.discountAmount
        acc.sales += c.sales
        acc.vatAmount += c.vatAmount
        acc.netBeforeVat += c.netBeforeVat
        return acc
      },
      { quantity: 0, grossSales: 0, discountAmount: 0, sales: 0, vatAmount: 0, netBeforeVat: 0 }
    )
  }, [filteredCategories])

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      {/* Header & Sorters */}
      <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-6 lg:flex-row lg:items-center">
        <div>
          <div className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-slate-700" />
            <h2 className="text-lg font-black text-slate-800">{title}</h2>
          </div>
          <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
          <div className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
            <HelpCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>
              สูตรตรวจสอบ: <strong>[ยอดรับเงินลูกค้า]</strong> - <strong>[VAT 7%]</strong> ={" "}
              <strong className="text-emerald-700">[เงินแท้จริงเข้าร้าน (ก่อน VAT)]</strong>
            </span>
          </div>
        </div>

        {/* ปุ่มสลับการเรียงลำดับ */}
        <div className="inline-flex rounded-xl bg-slate-100 p-1 self-start lg:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setSortBy("sales")}
            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer outline-none focus:outline-none ${
              sortBy === "sales"
                ? "bg-white text-slate-800 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            เงินเข้าร้านสูงสุด
          </button>
          <button
            type="button"
            onClick={() => setSortBy("qty")}
            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer outline-none focus:outline-none ${
              sortBy === "qty"
                ? "bg-white text-slate-800 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            จำนวนขายสูงสุด
          </button>
          <button
            type="button"
            onClick={() => setSortBy("bills")}
            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer outline-none focus:outline-none ${
              sortBy === "bills"
                ? "bg-white text-slate-800 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            จำนวนบิลสูงสุด
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 py-2.5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-1.5 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("PROP")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer outline-none focus:outline-none ${
            activeTab === "PROP"
              ? "bg-slate-800 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
          }`}
        >
          หมวดหมู่พร็อพ (PROP) ({categories.filter((c) => c.groupType === "prop").length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("ALL")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer outline-none focus:outline-none ${
            activeTab === "ALL"
              ? "bg-slate-800 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
          }`}
        >
          ทั้งหมด (ALL) ({categories.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("FURNITURE")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer outline-none focus:outline-none ${
            activeTab === "FURNITURE"
              ? "bg-slate-800 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
          }`}
        >
          เฟอร์นิเจอร์ (FURNITURE) ({categories.filter((c) => c.groupType === "furniture").length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("WOOD")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer outline-none focus:outline-none ${
            activeTab === "WOOD"
              ? "bg-slate-800 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
          }`}
        >
          แผ่นไม้ & ไม้ดิบ (WOOD) ({categories.filter((c) => c.groupType === "wood").length})
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-[1050px] w-full text-left text-sm">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-bold border-b border-slate-100">
            <tr>
              <th className="px-5 py-4 w-80">หมวดหมู่สินค้า</th>
              <th className="px-4 py-4 text-center whitespace-nowrap">สัดส่วนยอดขาย</th>
              <th className="px-4 py-4 text-right whitespace-nowrap">จำนวนขาย</th>
              <th className="px-4 py-4 text-right whitespace-nowrap">จำนวนบิล</th>
              <th className="px-4 py-4 text-right whitespace-nowrap">
                <div>ยอดก่อนลด</div>
                <div className="text-[9px] font-medium text-slate-400 normal-case">(ราคาเต็มป้าย)</div>
              </th>
              <th className="px-4 py-4 text-right whitespace-nowrap">
                <div>ส่วนลด (%)</div>
                <div className="text-[9px] font-medium text-slate-400 normal-case">(หักส่วนลด)</div>
              </th>
              <th className="px-4 py-4 text-right whitespace-nowrap">
                <div>ยอดรับเงินลูกค้า</div>
                <div className="text-[9px] font-medium text-slate-400 normal-case">(รวม VAT)</div>
              </th>
              <th className="px-4 py-4 text-right whitespace-nowrap">
                <div>VAT (7%)</div>
                <div className="text-[9px] font-medium text-slate-400 normal-case">(ภาษีนำส่งรัฐ)</div>
              </th>
              <th className="px-5 py-4 text-right whitespace-nowrap bg-emerald-50/50">
                <div className="text-emerald-800 font-bold">เงินเข้าร้าน (ก่อน VAT)</div>
                <div className="text-[9px] font-bold text-emerald-600 normal-case">(เงินแท้จริงที่ได้รับ)</div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {sortedCategories.map((cat) => (
              <tr
                key={cat.key}
                className="hover:bg-slate-50/70 transition-colors"
              >
                {/* ชื่อหมวดหมู่ ชิดซ้าย สะอาดตา */}
                <td className="px-5 py-4">
                  <div>
                    <p className="font-bold text-slate-800 tracking-tight text-sm">
                      {cat.name}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {cat.thaiName}
                    </p>
                  </div>
                </td>

                {/* สัดส่วนยอดขาย */}
                <td className="px-4 py-4 text-center whitespace-nowrap">
                  <div className="inline-flex flex-col items-center">
                    <span className="text-xs font-bold text-slate-700">{cat.shareOfTotal}%</span>
                    <div className="w-16 bg-slate-100 rounded-full h-1 mt-1 overflow-hidden">
                      <div
                        className="bg-slate-600 h-1 rounded-full"
                        style={{ width: `${Math.min(100, Math.max(5, cat.shareOfTotal))}%` }}
                      />
                    </div>
                  </div>
                </td>

                {/* จำนวนขาย */}
                <td className="px-4 py-4 text-right whitespace-nowrap font-bold text-slate-800">
                  {cat.quantity.toLocaleString()}
                </td>

                {/* จำนวนบิล */}
                <td className="px-4 py-4 text-right whitespace-nowrap text-slate-600">
                  {cat.billCount.toLocaleString()}
                </td>

                {/* ยอดก่อนลด */}
                <td className="px-4 py-4 text-right whitespace-nowrap text-slate-600">
                  ฿{money(cat.grossSales)}
                </td>

                {/* ส่วนลด (%) */}
                <td className="px-4 py-4 text-right whitespace-nowrap">
                  {cat.discountAmount > 0 ? (
                    <div className="inline-flex flex-col items-end">
                      <span className="inline-flex items-center gap-1 font-bold text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-md text-xs">
                        <Tag className="w-3 h-3" />
                        -฿{money(cat.discountAmount)}
                      </span>
                      <span className="text-[10px] font-bold text-orange-500 mt-0.5">
                        ลด {cat.discountPercent}%
                      </span>
                    </div>
                  ) : (
                    <span className="text-slate-300 font-mono text-xs">-</span>
                  )}
                </td>

                {/* ยอดรับเงินลูกค้า */}
                <td className="px-4 py-4 text-right whitespace-nowrap font-bold text-slate-700">
                  ฿{money(cat.sales)}
                </td>

                {/* VAT (7%) */}
                <td className="px-4 py-4 text-right whitespace-nowrap text-slate-600 font-medium">
                  ฿{money(cat.vatAmount)}
                </td>

                {/* เงินเข้าร้าน (ก่อน VAT) */}
                <td className="px-5 py-4 text-right whitespace-nowrap font-black text-emerald-600 bg-emerald-50/20 text-sm">
                  ฿{money(cat.netBeforeVat)}
                </td>
              </tr>
            ))}

            {sortedCategories.length === 0 && (
              <tr>
                <td colSpan={9} className="px-5 py-16 text-center text-slate-400">
                  ไม่พบข้อมูลหมวดหมู่สินค้าในแท็บที่เลือก
                </td>
              </tr>
            )}
          </tbody>

          {/* Footer ยอดรวม */}
          {sortedCategories.length > 0 && (
            <tfoot className="bg-slate-50/90 font-black border-t-2 border-slate-200 text-xs text-slate-800">
              <tr>
                <td className="px-5 py-4 text-slate-700 uppercase tracking-wider">
                  {selectedCategoryKey && selectedCategoryKey !== "ALL"
                    ? `รวมหมวดหมู่ ${sortedCategories[0]?.name || selectedCategoryKey}`
                    : `รวมทุกหมวดหมู่ (${sortedCategories.length} หมวด)`}
                </td>
                <td className="px-4 py-4 text-center text-slate-700">100%</td>
                <td className="px-4 py-4 text-right">{totals.quantity.toLocaleString()}</td>
                <td className="px-4 py-4 text-right text-slate-400 font-normal">-</td>
                <td className="px-4 py-4 text-right">฿{money(totals.grossSales)}</td>
                <td className="px-4 py-4 text-right text-orange-600">
                  {totals.discountAmount > 0 ? `-฿${money(totals.discountAmount)}` : "-"}
                </td>
                <td className="px-4 py-4 text-right text-slate-900">฿{money(totals.sales)}</td>
                <td className="px-4 py-4 text-right text-slate-600">฿{money(totals.vatAmount)}</td>
                <td className="px-5 py-4 text-right text-emerald-700 bg-emerald-50 text-sm">
                  ฿{money(totals.netBeforeVat)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}
