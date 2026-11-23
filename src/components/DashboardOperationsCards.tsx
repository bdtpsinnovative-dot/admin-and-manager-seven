"use client"

import React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  ShoppingBag,
  Tag,
  FileText,
  XCircle,
  Building2,
} from "lucide-react"
import type { DashboardDamageSummary } from "@/actions/dashboard"
import DashboardDamageCard from "@/components/DashboardDamageCard"

interface DashboardOperationsCardsProps {
  summary: {
    grossSales: number
    netSales: number
    totalDiscount: number
    totalVat: number
    netSalesBeforeVat: number
    billCount: number
    cancelledCount: number
    cancelledSales: number
    pendingCount: number
    pendingSales: number
    dropShipCount: number
    dropShipSales: number
    branchCount: number
  }
  damageSummary?: DashboardDamageSummary
  hasBranchFilter?: boolean
}

const money = (value: number) =>
  value.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function DashboardOperationsCards({
  summary,
  damageSummary,
  hasBranchFilter,
}: DashboardOperationsCardsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const handleSelectStatus = (status: "COMPLETED" | "CANCELLED") => {
    const params = new URLSearchParams(searchParams.toString())
    if (params.get("status") === status) {
      params.delete("status")
    } else {
      params.set("status", status)
    }
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

  return (
    <div className="space-y-3">
      {/* การ์ดสถิติการขายและดำเนินงาน 6 ใบ สะอาดตา ไม่รก */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* 1. ยอดรวมก่อนลด */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                ยอดรวมก่อนลด
              </span>
              <ShoppingBag className="h-4 w-4 text-slate-400" />
            </div>
            <p className="mt-2 text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">
              ฿{money(summary.grossSales)}
            </p>
          </div>
          <p className="mt-2 text-xs text-slate-400">มูลค่าสินค้าราคาป้ายเต็ม</p>
        </div>

        {/* 2. ส่วนลดรวม */}
        <div className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-orange-600">
                ส่วนลดรวม
              </span>
              <Tag className="h-4 w-4 text-orange-500" />
            </div>
            <p className="mt-2 text-2xl sm:text-3xl font-black text-orange-600 tracking-tight">
              -฿{money(summary.totalDiscount)}
            </p>
          </div>
          <p className="mt-2 text-xs text-slate-400">ส่วนลดพิเศษ & โปรโมชั่น</p>
        </div>

        {/* 3. ใบขายสำเร็จ (คลิกเพื่อฟิลเตอร์ดรอปดาวน์ได้) */}
        <div
          onClick={() => handleSelectStatus("COMPLETED")}
          className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm hover:shadow-md hover:border-blue-300 transition-all flex flex-col justify-between cursor-pointer group"
          title="คลิกเพื่อฟิลเตอร์ดูรายการบิลที่ขายสำเร็จ"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 group-hover:text-blue-600 transition-colors">
                ใบขายสำเร็จ
              </span>
              <FileText className="h-4 w-4 text-blue-500 group-hover:scale-110 transition-transform" />
            </div>
            <p className="mt-2 text-3xl sm:text-4xl font-black text-slate-800 tracking-tight flex items-baseline gap-1.5">
              <span>{summary.billCount.toLocaleString()}</span>
              <span className="text-sm font-bold text-slate-400">บิล</span>
            </p>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-emerald-600 font-bold">รับชำระเงินเรียบร้อย</span>
            <span className="text-blue-600 font-bold group-hover:underline text-[11px]">
              ฟิลเตอร์ดูบิล →
            </span>
          </div>
        </div>

        {/* 4. บิลยกเลิก (คลิกเพื่อฟิลเตอร์ดรอปดาวน์ได้) */}
        <div
          onClick={() => handleSelectStatus("CANCELLED")}
          className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm hover:shadow-md hover:border-rose-300 transition-all flex flex-col justify-between cursor-pointer group"
          title="คลิกเพื่อฟิลเตอร์ดูรายการบิลที่ยกเลิก"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-600">
                บิลยกเลิก
              </span>
              <XCircle className="h-4 w-4 text-rose-500 group-hover:scale-110 transition-transform" />
            </div>
            <p className="mt-2 text-3xl sm:text-4xl font-black text-rose-600 tracking-tight flex items-baseline gap-1.5">
              <span>{summary.cancelledCount.toLocaleString()}</span>
              <span className="text-sm font-bold text-rose-400">บิล</span>
            </p>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-slate-400">
              มูลค่ายกเลิก ฿{money(summary.cancelledSales)}
            </span>
            <span className="text-rose-600 font-bold group-hover:underline text-[11px]">
              ฟิลเตอร์ดูบิล →
            </span>
          </div>
        </div>

        {/* 5. สาขาที่มียอด */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                สาขาที่มียอด
              </span>
              <Building2 className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="mt-2 text-3xl sm:text-4xl font-black text-slate-800 tracking-tight flex items-baseline gap-1.5">
              <span>{summary.branchCount.toLocaleString()}</span>
              <span className="text-sm font-bold text-slate-400">สาขา</span>
            </p>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            {hasBranchFilter ? "จำนวนสาขาที่เลือกกรองอยู่" : "ทุกสาขาที่มียอดขายจริง"}
          </p>
        </div>

        {/* 6. สินค้าชำรุด/เสียหาย */}
        {damageSummary ? (
          <DashboardDamageCard damageSummary={damageSummary} />
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  สินค้าชำรุด
                </span>
              </div>
              <p className="mt-2 text-2xl font-black text-slate-800">-</p>
            </div>
            <p className="mt-2 text-xs text-slate-400">ไม่มีข้อมูลชำรุด</p>
          </div>
        )}
      </div>
    </div>
  )
}
