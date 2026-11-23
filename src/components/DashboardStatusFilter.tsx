"use client"

import React, { useState, useRef, useEffect } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  ChevronDown,
  Filter,
  CheckCircle2,
  Clock,
  Truck,
  XCircle,
  Check,
} from "lucide-react"

export type OrderFilterStatus = "ALL" | "COMPLETED" | "PENDING" | "DROPSHIP" | "CANCELLED"

interface DashboardStatusFilterProps {
  selectedStatus: OrderFilterStatus
  summary: {
    netSales: number
    billCount: number
    pendingCount: number
    pendingSales: number
    dropShipCount: number
    dropShipSales: number
    cancelledCount: number
    cancelledSales: number
  }
}

const money = (value: number) =>
  value.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function DashboardStatusFilter({
  selectedStatus,
  summary,
}: DashboardStatusFilterProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const totalCount = summary.billCount + summary.pendingCount + summary.cancelledCount

  // ปิด Dropdown เมื่อคลิกข้างนอก
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  // เปลี่ยนสถานะการกรองใน URL
  const handleSelect = (status: OrderFilterStatus) => {
    setIsOpen(false)
    if (status === selectedStatus) return

    const params = new URLSearchParams(searchParams.toString())
    if (status === "ALL") {
      params.delete("status")
    } else {
      params.set("status", status)
    }

    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

  // Label ที่แสดงบนปุ่ม Dropdown
  const renderTriggerLabel = () => {
    switch (selectedStatus) {
      case "COMPLETED":
        return (
          <span className="flex items-center gap-1.5 text-emerald-700 font-bold truncate">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <span className="truncate">ขายสำเร็จ ({summary.billCount})</span>
          </span>
        )
      case "PENDING":
        return (
          <span className="flex items-center gap-1.5 text-amber-700 font-bold truncate">
            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
            <span className="truncate">ยอดยังไม่คิดเงิน ({summary.pendingCount})</span>
          </span>
        )
      case "DROPSHIP":
        return (
          <span className="flex items-center gap-1.5 text-orange-700 font-bold truncate">
            <Truck className="w-3.5 h-3.5 text-orange-600 shrink-0" />
            <span className="truncate">จัดส่งข้ามสาขา ({summary.dropShipCount})</span>
          </span>
        )
      case "CANCELLED":
        return (
          <span className="flex items-center gap-1.5 text-red-600 font-bold truncate">
            <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
            <span className="truncate">บิลยกเลิก ({summary.cancelledCount})</span>
          </span>
        )
      default:
        return (
          <span className="flex items-center gap-1.5 text-slate-700 font-bold truncate">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">ทุกสถานะการขาย ({totalCount})</span>
          </span>
        )
    }
  }

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* ปุ่มกดเปิด Dropdown สไตล์เดียวกับตัวกรองอื่นบน Dashboard */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="เลือกสถานะการขาย"
        className={`min-w-44 max-w-64 rounded-xl border px-3.5 py-2.5 text-sm font-bold shadow-sm transition-colors cursor-pointer flex items-center justify-between gap-2 bg-white ${
          selectedStatus !== "ALL"
            ? "border-indigo-300 ring-2 ring-indigo-50 hover:border-indigo-400"
            : "border-slate-200 hover:border-slate-300"
        }`}
      >
        <div className="flex items-center gap-1.5 truncate">
          {renderTriggerLabel()}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* เมนู Dropdown รายการสถานะ */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-88 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-2 border-b border-slate-100 mb-1">
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
              เลือกสถานะการขายที่ต้องการดู
            </p>
          </div>

          <div className="space-y-1">
            {/* 1. ทุกสถานะ */}
            <button
              type="button"
              onClick={() => handleSelect("ALL")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-xs transition-colors cursor-pointer ${
                selectedStatus === "ALL"
                  ? "bg-slate-100 font-bold text-slate-900"
                  : "hover:bg-slate-50 text-slate-700"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                  <Filter className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-bold text-slate-800">ทุกสถานะการขาย</div>
                  <div className="text-[11px] text-slate-400">ภาพรวมบิลทั้งหมด</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-slate-700">{totalCount} บิล</div>
                {selectedStatus === "ALL" && (
                  <Check className="w-3.5 h-3.5 text-slate-900 ml-auto mt-0.5" />
                )}
              </div>
            </button>

            {/* 2. ขายสำเร็จ (Completed) */}
            <button
              type="button"
              onClick={() => handleSelect("COMPLETED")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-xs transition-colors cursor-pointer ${
                selectedStatus === "COMPLETED"
                  ? "bg-emerald-50 font-bold text-emerald-900"
                  : "hover:bg-emerald-50/50 text-slate-700"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-bold text-emerald-800">ขายสำเร็จ (Completed)</div>
                  <div className="text-[11px] text-emerald-600/80">
                    ฿{money(summary.netSales)}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  {summary.billCount} บิล
                </span>
                {selectedStatus === "COMPLETED" && (
                  <Check className="w-3.5 h-3.5 text-emerald-700 ml-auto mt-0.5" />
                )}
              </div>
            </button>

            {/* 3. ยอดยังไม่คิดเงิน (Pending) */}
            <button
              type="button"
              onClick={() => handleSelect("PENDING")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-xs transition-colors cursor-pointer ${
                selectedStatus === "PENDING"
                  ? "bg-amber-50 font-bold text-amber-900"
                  : "hover:bg-amber-50/50 text-slate-700"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600">
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-bold text-amber-800">ยอดยังไม่คิดเงิน / รอจัดส่ง</div>
                  <div className="text-[11px] text-amber-600/80">
                    ฿{money(summary.pendingSales)}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                  {summary.pendingCount} บิล
                </span>
                {selectedStatus === "PENDING" && (
                  <Check className="w-3.5 h-3.5 text-amber-700 ml-auto mt-0.5" />
                )}
              </div>
            </button>

            {/* 4. จัดส่งข้ามสาขา (Drop Ship) */}
            <button
              type="button"
              onClick={() => handleSelect("DROPSHIP")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-xs transition-colors cursor-pointer ${
                selectedStatus === "DROPSHIP"
                  ? "bg-orange-50 font-bold text-orange-900"
                  : "hover:bg-orange-50/50 text-slate-700"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600">
                  <Truck className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-bold text-orange-800">ยอดจัดส่งข้ามสาขา</div>
                  <div className="text-[11px] text-orange-600/80">
                    ฿{money(summary.dropShipSales)}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-800">
                  {summary.dropShipCount} บิล
                </span>
                {selectedStatus === "DROPSHIP" && (
                  <Check className="w-3.5 h-3.5 text-orange-700 ml-auto mt-0.5" />
                )}
              </div>
            </button>

            {/* 5. บิลยกเลิก (Cancelled) */}
            <button
              type="button"
              onClick={() => handleSelect("CANCELLED")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-xs transition-colors cursor-pointer ${
                selectedStatus === "CANCELLED"
                  ? "bg-red-50 font-bold text-red-900"
                  : "hover:bg-red-50/50 text-slate-700"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center text-red-600">
                  <XCircle className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-bold text-red-700">บิลยกเลิก (Cancelled)</div>
                  <div className="text-[11px] text-red-600/80">
                    ฿{money(summary.cancelledSales)}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800">
                  {summary.cancelledCount} บิล
                </span>
                {selectedStatus === "CANCELLED" && (
                  <Check className="w-3.5 h-3.5 text-red-700 ml-auto mt-0.5" />
                )}
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
