"use client"

import React, { useState, useMemo } from "react"
import { Package, Tag, Clock, TrendingUp, Layers, HelpCircle } from "lucide-react"
import type { DashboardProductSummary } from "@/actions/dashboard"

const money = (value: number) =>
  value.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const dateTime = (value: string | null) => {
  if (!value) return "ยังไม่มีการขาย"
  return new Date(value).toLocaleDateString("th-TH", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }) + " น."
}

interface DashboardProductTableProps {
  products: DashboardProductSummary[]
  title?: string
  subtitle?: string
}

export default function DashboardProductTable({
  products,
  title = "สรุปยอดรายสินค้า",
  subtitle = "จำนวนที่ขายและยอดเงินของสินค้าแต่ละรายการ",
}: DashboardProductTableProps) {
  const [sortBy, setSortBy] = useState<"sales" | "latest" | "qty">("sales")

  const sortedProducts = useMemo(() => {
    const list = [...products]
    if (sortBy === "sales") {
      return list.sort((a, b) => b.sales - a.sales)
    } else if (sortBy === "qty") {
      return list.sort((a, b) => b.quantity - a.quantity)
    } else {
      return list.sort((a, b) => {
        const timeA = a.lastSaleAt ? new Date(a.lastSaleAt).getTime() : 0
        const timeB = b.lastSaleAt ? new Date(b.lastSaleAt).getTime() : 0
        return timeB - timeA
      })
    }
  }, [products, sortBy])

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      {/* Header & Sorters */}
      <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-6 lg:flex-row lg:items-center">
        <div>
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-black text-slate-800">{title}</h2>
          </div>
          <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
          <div className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
            <HelpCircle className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span>สูตรตรวจสอบ: <strong>[ยอดก่อน VAT] + [VAT 7%] = [ยอดสุทธิ]</strong> และ <strong>[ยอดก่อนลด] - [ส่วนลด] = [ยอดสุทธิ]</strong></span>
          </div>
        </div>

        {/* ปุ่มสลับการเรียงลำดับ */}
        <div className="inline-flex rounded-xl bg-slate-100 p-1 self-start lg:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setSortBy("sales")}
            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              sortBy === "sales"
                ? "bg-white text-blue-700 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            ยอดขายสูงสุด
          </button>
          <button
            type="button"
            onClick={() => setSortBy("latest")}
            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              sortBy === "latest"
                ? "bg-white text-blue-700 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            ขายล่าสุด
          </button>
          <button
            type="button"
            onClick={() => setSortBy("qty")}
            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              sortBy === "qty"
                ? "bg-white text-blue-700 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            จำนวนขายสูงสุด
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-[1050px] w-full text-left text-sm">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-bold border-b border-slate-100">
            <tr>
              <th className="px-5 py-4 w-72">สินค้า</th>
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
                <div>ยอดก่อน VAT</div>
                <div className="text-[9px] font-medium text-slate-400 normal-case">(ไม่รวมภาษี)</div>
              </th>
              <th className="px-4 py-4 text-right whitespace-nowrap">
                <div>VAT (7%)</div>
                <div className="text-[9px] font-medium text-slate-400 normal-case">(ภาษีมูลค่าเพิ่ม)</div>
              </th>
              <th className="px-5 py-4 text-right whitespace-nowrap">
                <div>ยอดสุทธิ (รวม VAT)</div>
                <div className="text-[9px] font-medium text-emerald-600 normal-case">(ยอดขายจริง)</div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {sortedProducts.map((product, index) => (
              <tr key={product.key} className="transition-colors hover:bg-slate-50/80">
                {/* ลำดับที่ -> รูปภาพ -> รายละเอียดสินค้า */}
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    {/* 1. ลำดับที่ (อยู่ข้างหน้ารูปภาพตามที่ขอ) */}
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-black ${
                      index === 0 && sortBy === "sales"
                        ? "bg-amber-500 text-white shadow-xs"
                        : index === 1 && sortBy === "sales"
                        ? "bg-slate-300 text-slate-800"
                        : index === 2 && sortBy === "sales"
                        ? "bg-amber-700 text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}>
                      {index + 1}
                    </span>

                    {/* 2. รูปภาพสินค้า */}
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="h-full w-full object-contain p-1"
                        />
                      ) : (
                        <Package className="h-5 w-5 text-slate-300" />
                      )}
                    </div>

                    {/* 3. ชื่อสินค้า & SKU & เวลาขายล่าสุด */}
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 truncate max-w-[220px]" title={product.name}>
                        {product.name}
                      </p>
                      <p className="text-[11px] text-slate-400 font-mono">
                        SKU: {product.sku || "-"}
                      </p>
                      {product.lastSaleAt && (
                        <p className="text-[10px] text-blue-600 font-medium mt-0.5 inline-flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          ขายล่าสุด: {dateTime(product.lastSaleAt)}
                        </p>
                      )}
                    </div>
                  </div>
                </td>

                <td className="px-4 py-4 text-right font-bold text-slate-700 whitespace-nowrap">
                  {product.quantity.toLocaleString()} ชิ้น
                </td>

                <td className="px-4 py-4 text-right text-slate-500 whitespace-nowrap">
                  {product.billCount.toLocaleString()} บิล
                </td>

                {/* ยอดก่อนลด (Gross) */}
                <td className="px-4 py-4 text-right font-medium text-slate-700 whitespace-nowrap">
                  ฿{money(product.grossSales)}
                </td>

                {/* ส่วนลด */}
                <td className="px-4 py-4 text-right whitespace-nowrap">
                  {product.discountAmount > 0 ? (
                    <div className="inline-flex flex-col items-end">
                      <span className="inline-flex items-center gap-1 font-bold text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-md text-xs">
                        <Tag className="w-3 h-3" />
                        -฿{money(product.discountAmount)}
                      </span>
                      <span className="text-[10px] font-bold text-orange-500 mt-0.5">
                        ลด {product.discountPercent}%
                      </span>
                    </div>
                  ) : (
                    <span className="text-slate-300 font-mono text-xs">-</span>
                  )}
                </td>

                {/* ยอดก่อน VAT (ไม่รวมภาษี) */}
                <td className="px-4 py-4 text-right font-semibold text-slate-700 whitespace-nowrap">
                  ฿{money(product.netBeforeVat)}
                </td>

                {/* VAT (7%) */}
                <td className="px-4 py-4 text-right font-medium text-purple-700 whitespace-nowrap">
                  ฿{money(product.vatAmount)}
                </td>

                {/* ยอดสุทธิ (รวม VAT) */}
                <td className="px-5 py-4 text-right font-black text-emerald-600 whitespace-nowrap">
                  ฿{money(product.sales)}
                </td>
              </tr>
            ))}

            {sortedProducts.length === 0 && (
              <tr>
                <td colSpan={8} className="px-5 py-16 text-center text-slate-400">
                  ยังไม่มีข้อมูลสินค้า
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
