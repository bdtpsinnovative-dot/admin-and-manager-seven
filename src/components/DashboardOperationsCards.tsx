"use client"

import React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  ShoppingBag,
  Tag,
  FileText,
  XCircle,
  Building2,
  Clock,
  Truck,
  CheckCircle2,
  Scale,
} from "lucide-react"
import type { DashboardDamageSummary } from "@/actions/dashboard"
import DashboardDamageCard from "@/components/DashboardDamageCard"
import type { OrderFilterStatus } from "@/components/DashboardStatusFilter"

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
    cancelledGrossSales?: number
    cancelledDiscount?: number
    cancelledBranchCount?: number
    pendingCount: number
    pendingSales: number
    pendingGrossSales?: number
    pendingDiscount?: number
    pendingBranchCount?: number
    dropShipCount: number
    dropShipSales: number
    dropShipGrossSales?: number
    dropShipDiscount?: number
    dropShipBranchCount?: number
    branchCount: number
  }
  damageSummary?: DashboardDamageSummary
  hasBranchFilter?: boolean
  selectedStatus?: OrderFilterStatus
}

const money = (value: number) =>
  value.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function DashboardOperationsCards({
  summary,
  damageSummary,
  hasBranchFilter,
  selectedStatus = "ALL",
}: DashboardOperationsCardsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const handleSelectStatus = (status: "COMPLETED" | "CANCELLED" | "PENDING" | "DROPSHIP") => {
    const params = new URLSearchParams(searchParams.toString())
    if (params.get("status") === status) {
      params.delete("status")
    } else {
      params.set("status", status)
    }
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

  // 🟡 กรณีฟิลเตอร์: ยอดยังไม่คิดเงิน / รอจัดส่ง (Pending)
  if (selectedStatus === "PENDING") {
    const avgPending = summary.pendingCount > 0 ? summary.pendingSales / summary.pendingCount : 0
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {/* 1. ยอดรวมรอชำระ */}
          <div className="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
                  ยอดรวมรอชำระ
                </span>
                <Clock className="h-4 w-4 text-amber-500" />
              </div>
              <p className="mt-2 text-2xl sm:text-3xl font-black text-amber-700 tracking-tight">
                ฿{money(summary.pendingSales)}
              </p>
            </div>
            <p className="mt-2 text-xs text-slate-400">ยอดสุทธิที่รอยืนยันชำระเงิน</p>
          </div>

          {/* 2. ยอดก่อนลด (Pending) */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  ยอดก่อนลด (Pending)
                </span>
                <ShoppingBag className="h-4 w-4 text-slate-400" />
              </div>
              <p className="mt-2 text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">
                ฿{money(summary.pendingGrossSales || summary.pendingSales)}
              </p>
            </div>
            <p className="mt-2 text-xs text-slate-400">มูลค่าสินค้าราคาป้ายเต็ม</p>
          </div>

          {/* 3. ส่วนลดรวม (Pending) */}
          <div className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-orange-600">
                  ส่วนลดรวม
                </span>
                <Tag className="h-4 w-4 text-orange-500" />
              </div>
              <p className="mt-2 text-2xl sm:text-3xl font-black text-orange-600 tracking-tight">
                -฿{money(summary.pendingDiscount || 0)}
              </p>
            </div>
            <p className="mt-2 text-xs text-slate-400">ส่วนลดในบิลรอคิดเงิน</p>
          </div>

          {/* 4. จำนวนบิลรอคิดเงิน */}
          <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
                  บิลรอคิดเงิน
                </span>
                <FileText className="h-4 w-4 text-amber-600" />
              </div>
              <p className="mt-2 text-3xl sm:text-4xl font-black text-amber-800 tracking-tight flex items-baseline gap-1.5">
                <span>{summary.pendingCount.toLocaleString()}</span>
                <span className="text-sm font-bold text-amber-600">บิล</span>
              </p>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="text-amber-700 font-bold">รอตัดสต็อก/ชำระ</span>
              <span className="text-amber-600 text-[11px]">สถานะ PENDING</span>
            </div>
          </div>

          {/* 5. ยอดเฉลี่ยต่อบิล */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  เฉลี่ยต่อบิล
                </span>
                <Scale className="h-4 w-4 text-blue-500" />
              </div>
              <p className="mt-2 text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">
                ฿{money(avgPending)}
              </p>
            </div>
            <p className="mt-2 text-xs text-slate-400">มูลค่าเฉลี่ยต่อใบเสนอราคา</p>
          </div>

          {/* 6. สาขาที่มีบิลรอคิดเงิน */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  สาขาที่มีบิลค้าง
                </span>
                <Building2 className="h-4 w-4 text-amber-500" />
              </div>
              <p className="mt-2 text-3xl sm:text-4xl font-black text-slate-800 tracking-tight flex items-baseline gap-1.5">
                <span>{(summary.pendingBranchCount || summary.branchCount).toLocaleString()}</span>
                <span className="text-sm font-bold text-slate-400">สาขา</span>
              </p>
            </div>
            <p className="mt-2 text-xs text-slate-400">สาขาที่เปิดบิลรอไว้</p>
          </div>
        </div>
      </div>
    )
  }

  // 🔴 กรณีฟิลเตอร์: บิลยกเลิก (Cancelled)
  if (selectedStatus === "CANCELLED") {
    const avgCancelled = summary.cancelledCount > 0 ? summary.cancelledSales / summary.cancelledCount : 0
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {/* 1. มูลค่ายกเลิกรวม */}
          <div className="rounded-2xl border border-rose-200 bg-white p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-600">
                  มูลค่ายกเลิกรวม
                </span>
                <XCircle className="h-4 w-4 text-rose-500" />
              </div>
              <p className="mt-2 text-2xl sm:text-3xl font-black text-rose-600 tracking-tight">
                ฿{money(summary.cancelledSales)}
              </p>
            </div>
            <p className="mt-2 text-xs text-slate-400">ยอดรวมบิลที่ยกเลิกทั้งหมด</p>
          </div>

          {/* 2. ยอดก่อนลด (Cancelled) */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  ยอดก่อนลด (ยกเลิก)
                </span>
                <ShoppingBag className="h-4 w-4 text-slate-400" />
              </div>
              <p className="mt-2 text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">
                ฿{money(summary.cancelledGrossSales || summary.cancelledSales)}
              </p>
            </div>
            <p className="mt-2 text-xs text-slate-400">มูลค่าสินค้าราคาป้ายเต็ม</p>
          </div>

          {/* 3. ส่วนลดที่ยกเลิก */}
          <div className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-orange-600">
                  ส่วนลดที่ยกเลิก
                </span>
                <Tag className="h-4 w-4 text-orange-500" />
              </div>
              <p className="mt-2 text-2xl sm:text-3xl font-black text-orange-600 tracking-tight">
                -฿{money(summary.cancelledDiscount || 0)}
              </p>
            </div>
            <p className="mt-2 text-xs text-slate-400">ส่วนลดของบิลที่ถูกยกเลิก</p>
          </div>

          {/* 4. จำนวนบิลยกเลิก */}
          <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-800">
                  จำนวนบิลยกเลิก
                </span>
                <FileText className="h-4 w-4 text-rose-600" />
              </div>
              <p className="mt-2 text-3xl sm:text-4xl font-black text-rose-700 tracking-tight flex items-baseline gap-1.5">
                <span>{summary.cancelledCount.toLocaleString()}</span>
                <span className="text-sm font-bold text-rose-500">บิล</span>
              </p>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="text-rose-600 font-bold">คืนสต็อกเข้าคลังแล้ว</span>
              <span className="text-rose-500 text-[11px]">สถานะ CANCELLED</span>
            </div>
          </div>

          {/* 5. ยอดเฉลี่ยต่อบิลยกเลิก */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  เฉลี่ยต่อบิลยกเลิก
                </span>
                <Scale className="h-4 w-4 text-rose-500" />
              </div>
              <p className="mt-2 text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">
                ฿{money(avgCancelled)}
              </p>
            </div>
            <p className="mt-2 text-xs text-slate-400">มูลค่าเฉลี่ยต่อบิลยกเลิก</p>
          </div>

          {/* 6. สาขาที่มีบิลยกเลิก */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  สาขาที่มีการยกเลิก
                </span>
                <Building2 className="h-4 w-4 text-rose-500" />
              </div>
              <p className="mt-2 text-3xl sm:text-4xl font-black text-slate-800 tracking-tight flex items-baseline gap-1.5">
                <span>{(summary.cancelledBranchCount || summary.branchCount).toLocaleString()}</span>
                <span className="text-sm font-bold text-slate-400">สาขา</span>
              </p>
            </div>
            <p className="mt-2 text-xs text-slate-400">สาขาที่เคยยกเลิกบิล</p>
          </div>
        </div>
      </div>
    )
  }

  // 🚚 กรณีฟิลเตอร์: จัดส่งข้ามสาขา (Drop Ship)
  if (selectedStatus === "DROPSHIP") {
    const avgDropShip = summary.dropShipCount > 0 ? summary.dropShipSales / summary.dropShipCount : 0
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {/* 1. ยอดจัดส่งข้ามสาขา */}
          <div className="rounded-2xl border border-orange-200 bg-white p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-orange-700">
                  ยอดจัดส่งข้ามสาขา
                </span>
                <Truck className="h-4 w-4 text-orange-600" />
              </div>
              <p className="mt-2 text-2xl sm:text-3xl font-black text-orange-700 tracking-tight">
                ฿{money(summary.dropShipSales)}
              </p>
            </div>
            <p className="mt-2 text-xs text-slate-400">ยอดขายฝากส่งข้ามสาขา</p>
          </div>

          {/* 2. ยอดก่อนลด */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  ยอดก่อนลด (ข้ามสาขา)
                </span>
                <ShoppingBag className="h-4 w-4 text-slate-400" />
              </div>
              <p className="mt-2 text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">
                ฿{money(summary.dropShipGrossSales || summary.dropShipSales)}
              </p>
            </div>
            <p className="mt-2 text-xs text-slate-400">มูลค่าสินค้าราคาป้ายเต็ม</p>
          </div>

          {/* 3. ส่วนลดรวม */}
          <div className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-orange-600">
                  ส่วนลดรวม
                </span>
                <Tag className="h-4 w-4 text-orange-500" />
              </div>
              <p className="mt-2 text-2xl sm:text-3xl font-black text-orange-600 tracking-tight">
                -฿{money(summary.dropShipDiscount || 0)}
              </p>
            </div>
            <p className="mt-2 text-xs text-slate-400">ส่วนลดบิลจัดส่งข้ามสาขา</p>
          </div>

          {/* 4. จำนวนบิลจัดส่งข้ามสาขา */}
          <div className="rounded-2xl border border-orange-200 bg-orange-50/50 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-orange-800">
                  บิลจัดส่งข้ามสาขา
                </span>
                <FileText className="h-4 w-4 text-orange-600" />
              </div>
              <p className="mt-2 text-3xl sm:text-4xl font-black text-orange-700 tracking-tight flex items-baseline gap-1.5">
                <span>{summary.dropShipCount.toLocaleString()}</span>
                <span className="text-sm font-bold text-orange-500">บิล</span>
              </p>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="text-orange-600 font-bold">ฝากส่งระหว่างสาขา</span>
              <span className="text-orange-500 text-[11px]">DROP SHIP</span>
            </div>
          </div>

          {/* 5. ยอดเฉลี่ยต่อบิล */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  เฉลี่ยต่อบิลข้ามสาขา
                </span>
                <Scale className="h-4 w-4 text-orange-500" />
              </div>
              <p className="mt-2 text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">
                ฿{money(avgDropShip)}
              </p>
            </div>
            <p className="mt-2 text-xs text-slate-400">มูลค่าเฉลี่ยต่อบิลฝากส่ง</p>
          </div>

          {/* 6. สาขาที่เกี่ยวข้อง */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  สาขาที่มีการฝากส่ง
                </span>
                <Building2 className="h-4 w-4 text-orange-500" />
              </div>
              <p className="mt-2 text-3xl sm:text-4xl font-black text-slate-800 tracking-tight flex items-baseline gap-1.5">
                <span>{(summary.dropShipBranchCount || summary.branchCount).toLocaleString()}</span>
                <span className="text-sm font-bold text-slate-400">สาขา</span>
              </p>
            </div>
            <p className="mt-2 text-xs text-slate-400">สาขาต้นทาง/ปลายทาง</p>
          </div>
        </div>
      </div>
    )
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
