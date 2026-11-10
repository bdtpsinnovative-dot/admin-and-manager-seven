"use client"

import React from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { Check, Sparkles, Tag, Layers, ShoppingBag, ArrowUpRight } from "lucide-react"
import type { DashboardBrandSummary } from "@/actions/dashboard"
import type { DashboardBrandKey } from "@/lib/dashboardBrand"

const money = (value: number) =>
  value.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

interface DashboardBrandCardsProps {
  brandSummaries: DashboardBrandSummary[]
  selectedBrand: DashboardBrandKey
}

interface BrandCardConfig {
  key: "ZENSLAB" | "TERRA" | "EMBER_ASH"
  name: string
  thaiName: string
  englishSubtitle: string
  emoji: string
  colorBadge: string
  borderActive: string
  borderNormal: string
  bgHover: string
  tagColor: string
  accentColor: string
  bgPill: string
}

const BRAND_CONFIGS: Record<"ZENSLAB" | "TERRA" | "EMBER_ASH", BrandCardConfig> = {
  ZENSLAB: {
    key: "ZENSLAB",
    name: "ZenSlab",
    thaiName: "สแลป & ไม้ดิบ",
    englishSubtitle: "Live Edge & Raw Wood Slabs",
    emoji: "🌲",
    colorBadge: "bg-emerald-50 text-emerald-800 border-emerald-200",
    borderActive: "ring-2 ring-emerald-500 border-emerald-500 bg-emerald-50/30",
    borderNormal: "border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/10",
    bgHover: "hover:bg-emerald-50/20",
    tagColor: "text-emerald-700 bg-emerald-50",
    accentColor: "text-emerald-600",
    bgPill: "bg-emerald-600 text-white",
  },
  TERRA: {
    key: "TERRA",
    name: "Terra",
    thaiName: "พร็อพของแต่งบ้าน",
    englishSubtitle: "Home Decor & Props",
    emoji: "🏺",
    colorBadge: "bg-amber-50 text-amber-800 border-amber-200",
    borderActive: "ring-2 ring-amber-500 border-amber-500 bg-amber-50/30",
    borderNormal: "border-slate-200 hover:border-amber-300 hover:bg-amber-50/10",
    bgHover: "hover:bg-amber-50/20",
    tagColor: "text-amber-700 bg-amber-50",
    accentColor: "text-amber-600",
    bgPill: "bg-amber-600 text-white",
  },
  EMBER_ASH: {
    key: "EMBER_ASH",
    name: "Ember & Ash",
    thaiName: "เฟอร์นิเจอร์",
    englishSubtitle: "Modern Furniture Collection",
    emoji: "🛋️",
    colorBadge: "bg-indigo-50 text-indigo-800 border-indigo-200",
    borderActive: "ring-2 ring-indigo-500 border-indigo-500 bg-indigo-50/30",
    borderNormal: "border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/10",
    bgHover: "hover:bg-indigo-50/20",
    tagColor: "text-indigo-700 bg-indigo-50",
    accentColor: "text-indigo-600",
    bgPill: "bg-indigo-600 text-white",
  },
}

export default function DashboardBrandCards({
  brandSummaries,
  selectedBrand,
}: DashboardBrandCardsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const handleBrandClick = (brandKey: "ZENSLAB" | "TERRA" | "EMBER_ASH") => {
    const params = new URLSearchParams(searchParams.toString())
    // Toggle: if already selected, switch to ALL (ทุกแบรนด์)
    if (selectedBrand === brandKey) {
      params.set("brand", "ALL")
    } else {
      params.set("brand", brandKey)
    }
    // เคลียร์ filter cat เมื่อกดเปลี่ยนแบรนด์
    params.delete("cat")

    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

  // สร้าง map จาก brandSummaries
  const summaryMap = new Map<string, DashboardBrandSummary>()
  brandSummaries.forEach((s) => summaryMap.set(s.key, s))

  const totalBrandSales = brandSummaries.reduce((sum, b) => sum + b.netBeforeVat, 0)

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-100 text-blue-700 text-xs font-black">
            🏢
          </span>
          <h2 className="text-sm font-black text-slate-800">
            ยอดขายแยกตามแบรนด์สินค้า (Brand Performance)
          </h2>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500">
            คลิกที่การ์ดเพื่อกรองทั้งหน้า
          </span>
        </div>
        {selectedBrand !== "ALL" && (
          <button
            type="button"
            
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString())
              params.delete("brand")
              params.delete("cat")
              const qs = params.toString()
              router.push(qs ? `${pathname}?${qs}` : pathname)
            }}
            className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-700 underline cursor-pointer"
          >
            ✕ ล้างการกรองแบรนด์ (แสดงทุกแบรนด์)
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(["ZENSLAB", "TERRA", "EMBER_ASH"] as const).map((key) => {
          const cfg = BRAND_CONFIGS[key]
          const summary = summaryMap.get(key) || {
            key,
            name: cfg.name,
            thaiName: cfg.thaiName,
            groupType: key === "ZENSLAB" ? "wood" : key === "TERRA" ? "prop" : "furniture",
            grossSales: 0,
            totalDiscount: 0,
            netBeforeVat: 0,
            totalVat: 0,
            netSales: 0,
            billCount: 0,
            quantity: 0,
            shareOfTotal: 0,
          }

          const isSelected = selectedBrand === key
          const share = totalBrandSales > 0 ? Math.round((summary.netBeforeVat / totalBrandSales) * 1000) / 10 : 0

          return (
            <button
              key={key}
              type="button"
              
              onClick={() => handleBrandClick(key)}
              className={`relative text-left rounded-2xl border bg-white p-5 shadow-sm transition-all duration-200 cursor-pointer outline-none focus:outline-none flex flex-col justify-between ${
                isSelected
                  ? `${cfg.borderActive} shadow-md`
                  : `${cfg.borderNormal} hover:shadow-md`
              }`}
            >
              {/* Badge สถานะเลือก */}
              {isSelected && (
                <div className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-slate-900 text-white px-2.5 py-1 text-[10px] font-black shadow-xs">
                  <Check className="w-3 h-3" />
                  <span>กำลังกรองแบรนด์นี้</span>
                </div>
              )}

              <div>
                {/* Header การ์ด */}
                <div className="flex items-start gap-3 mb-3">
                  <span className="text-2xl p-2 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                    {cfg.emoji}
                  </span>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-base font-black text-slate-800">{cfg.name}</h3>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${cfg.colorBadge}`}>
                        {cfg.thaiName}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">{cfg.englishSubtitle}</p>
                  </div>
                </div>

                {/* ตัวเลขยอดเงินหลัก: เงินแท้จริงเข้าร้าน (ก่อน VAT) */}
                <div className="mt-2 mb-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                    เงินแท้จริงเข้าร้าน (ก่อน VAT)
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-slate-900">
                      ฿{money(summary.netBeforeVat)}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs">
                    <span className="text-slate-500 font-medium">
                      รับจริงรวม VAT: <strong className="text-slate-700">฿{money(summary.netSales)}</strong>
                    </span>
                    {summary.totalVat > 0 && (
                      <span className="text-[11px] text-purple-600 font-bold">
                        (VAT ฿{money(summary.totalVat)})
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress Bar แสดงสัดส่วนยอดขาย */}
                <div className="mb-4">
                  <div className="flex justify-between items-center text-xs font-bold mb-1">
                    <span className="text-slate-400">สัดส่วนในพอร์ต</span>
                    <span className={cfg.accentColor}>{share}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        key === "ZENSLAB"
                          ? "bg-emerald-500"
                          : key === "TERRA"
                          ? "bg-amber-500"
                          : "bg-indigo-500"
                      }`}
                      style={{ width: `${Math.min(100, Math.max(share, summary.netBeforeVat > 0 ? 3 : 0))}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* สถิติด้านล่าง: จำนวนขาย, จำนวนบิล, ส่วนลด */}
              <div className="pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-slate-50 p-2">
                  <span className="text-[10px] font-bold text-slate-400 block">จำนวนขาย</span>
                  <span className="text-xs font-black text-slate-700">
                    {summary.quantity.toLocaleString()} <span className="text-[10px] font-normal">ชิ้น</span>
                  </span>
                </div>
                <div className="rounded-xl bg-slate-50 p-2">
                  <span className="text-[10px] font-bold text-slate-400 block">จำนวนบิล</span>
                  <span className="text-xs font-black text-slate-700">
                    {summary.billCount.toLocaleString()} <span className="text-[10px] font-normal">บิล</span>
                  </span>
                </div>
                <div className="rounded-xl bg-slate-50 p-2">
                  <span className="text-[10px] font-bold text-slate-400 block">ส่วนลด</span>
                  <span className="text-xs font-black text-orange-600">
                    {summary.totalDiscount > 0 ? `-฿${money(summary.totalDiscount)}` : "-"}
                  </span>
                </div>
              </div>

              {/* Action hint */}
              <div className="mt-3 flex items-center justify-between text-[11px] font-bold text-slate-400">
                <span className="flex items-center gap-1 group-hover:text-slate-700">
                  {isSelected ? "คลิกเพื่อยกเลิกการกรอง" : "คลิกเพื่อดูข้อมูลเฉพาะแบรนด์นี้"}
                </span>
                <ArrowUpRight className={`w-3.5 h-3.5 ${isSelected ? "text-slate-800" : "text-slate-400"}`} />
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
