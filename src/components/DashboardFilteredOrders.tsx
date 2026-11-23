"use client"

import React, { useState, useMemo } from "react"
import Link from "next/link"
import {
  CheckCircle2,
  Clock,
  Truck,
  XCircle,
  Search,
  X,
  FileText,
  ExternalLink,
} from "lucide-react"
import type { DashboardOrder } from "@/actions/dashboard"
import PaymentSlipViewer from "@/components/PaymentSlipViewer"
import type { OrderFilterStatus } from "@/components/DashboardStatusFilter"

interface DashboardFilteredOrdersProps {
  selectedStatus: OrderFilterStatus
  orders: DashboardOrder[]
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
  clearUrl: string
}

const money = (value: number) =>
  value.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const dateTime = (value: string) =>
  new Date(value).toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

const statusBadge = (order: DashboardOrder) => {
  if (order.status === "COMPLETED") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        สำเร็จแล้ว
      </span>
    )
  }
  if (order.status === "PROCESSING") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-blue-300 bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold text-blue-700">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
        รอแพ็คจัดส่ง
      </span>
    )
  }
  if (order.status === "PENDING") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-700">
        <Clock className="w-3 h-3 text-amber-600" />
        รอคิดเงิน
      </span>
    )
  }
  if (order.status === "CANCELLED") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-[10px] font-bold text-red-600">
        <XCircle className="w-3 h-3 text-red-500" />
        ยกเลิกแล้ว
      </span>
    )
  }
  return (
    <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[10px] font-bold text-slate-600">
      {order.status}
    </span>
  )
}

export default function DashboardFilteredOrders({
  selectedStatus,
  orders,
  summary,
  clearUrl,
}: DashboardFilteredOrdersProps) {
  const [searchQuery, setSearchQuery] = useState("")

  // กรองรายการใบขาย
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // 1. กรองตามสถานะ
      if (selectedStatus === "COMPLETED") {
        if (o.status !== "COMPLETED" && o.status !== "PROCESSING") return false
      } else if (selectedStatus === "PENDING") {
        if (o.status !== "PENDING") return false
      } else if (selectedStatus === "DROPSHIP") {
        if (!o.isDropShip || o.status === "CANCELLED") return false
      } else if (selectedStatus === "CANCELLED") {
        if (o.status !== "CANCELLED") return false
      }

      // 2. กรองตามข้อความค้นหา
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase()
        const code = (o.orderCode || "").toLowerCase()
        const branch = (o.branchName || "").toLowerCase()
        if (!code.includes(q) && !branch.includes(q)) return false
      }

      return true
    })
  }, [orders, selectedStatus, searchQuery])

  // หัวข้อตามสถานะ
  const getHeaderInfo = () => {
    switch (selectedStatus) {
      case "COMPLETED":
        return {
          title: "รายการใบขายสำเร็จ (Completed)",
          count: summary.billCount,
          total: summary.netSales,
          badgeColor: "bg-emerald-50 text-emerald-800 border-emerald-200",
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
        }
      case "PENDING":
        return {
          title: "รายการบิลยอดยังไม่คิดเงิน / รอจัดส่ง (Pending)",
          count: summary.pendingCount,
          total: summary.pendingSales,
          badgeColor: "bg-amber-50 text-amber-800 border-amber-200",
          icon: <Clock className="w-4 h-4 text-amber-600" />,
        }
      case "DROPSHIP":
        return {
          title: "รายการบิลยอดจัดส่งข้ามสาขา (Drop Ship)",
          count: summary.dropShipCount,
          total: summary.dropShipSales,
          badgeColor: "bg-orange-50 text-orange-800 border-orange-200",
          icon: <Truck className="w-4 h-4 text-orange-600" />,
        }
      case "CANCELLED":
        return {
          title: "รายการบิลยกเลิก (Cancelled)",
          count: summary.cancelledCount,
          total: summary.cancelledSales,
          badgeColor: "bg-red-50 text-red-800 border-red-200",
          icon: <XCircle className="w-4 h-4 text-red-500" />,
        }
      default:
        return {
          title: "รายการใบขายทั้งหมด",
          count: orders.length,
          total: summary.netSales,
          badgeColor: "bg-slate-50 text-slate-800 border-slate-200",
          icon: <FileText className="w-4 h-4 text-slate-600" />,
        }
    }
  }

  const info = getHeaderInfo()

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4 animate-in fade-in duration-200">
      {/* ส่วนหัวของกล่องตัวกรอง */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
            {info.icon}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-black text-slate-800">{info.title}</h3>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${info.badgeColor}`}>
                {filteredOrders.length} บิล • รวม ฿{money(info.total)}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              แสดงเฉพาะรายการในสถานะที่เลือกจากดรอปดาวน์
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-center">
          {/* ช่องค้นหา */}
          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาเลขบิล, สาขา..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* ลิงก์ไป Sales History */}
          <Link
            href="/sales-history"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-600 transition-colors shadow-2xs"
            title="เปิดหน้าประวัติการขายเต็มรูปแบบ"
          >
            <span>Sales History</span>
            <ExternalLink className="w-3 h-3" />
          </Link>

          {/* ปุ่มปิดตารางกลับสู่หน้าปกติ */}
          <Link
            href={clearUrl}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 text-xs font-bold text-slate-600 transition-colors shadow-2xs"
            title="ปิดตารางนี้ และกลับสู่มุมมอง Dashboard ปกติ"
          >
            <X className="w-3.5 h-3.5" />
            <span>ปิดตาราง</span>
          </Link>
        </div>
      </div>

      {/* ตารางแสดงรายการใบขาย */}
      <div className="overflow-hidden rounded-xl border border-slate-100">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">เลขที่บิล</th>
                <th className="py-3 px-3">สาขา</th>
                <th className="py-3 px-3">เวลาเปิดบิล</th>
                <th className="py-3 px-3">เวลาปิดบิล / คิดเงิน</th>
                <th className="py-3 px-2 text-center">สลิป</th>
                <th className="py-3 px-3 text-right">ยอดก่อนลด</th>
                <th className="py-3 px-3 text-right">ส่วนลด</th>
                <th className="py-3 px-3 text-right">ยอดสุทธิ</th>
                <th className="py-3 px-3 text-center">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-400">
                    <FileText className="w-7 h-7 text-slate-300 mx-auto mb-1.5" />
                    <p className="font-bold">ไม่พบรายการใบขาย</p>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const closedAt = order.completedAt || order.createdAt
                  const isCrossDay =
                    closedAt &&
                    new Date(closedAt).toDateString() !== new Date(order.createdAt).toDateString()
                  const diffDays = closedAt
                    ? Math.max(
                        1,
                        Math.round(
                          (new Date(closedAt).getTime() - new Date(order.createdAt).getTime()) /
                            (1000 * 60 * 60 * 24)
                        )
                      )
                    : 0

                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-3 px-4 font-black text-slate-800">
                        <div className="flex items-center gap-1.5">
                          <span>{order.orderCode}</span>
                          {order.isDropShip && (
                            <span
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-orange-50 border border-orange-200 text-[9px] font-bold text-orange-700"
                              title={
                                order.dropShipBranchNames?.length
                                  ? `จัดส่งจาก: ${order.dropShipBranchNames.join(", ")}`
                                  : "จัดส่งข้ามสาขา"
                              }
                            >
                              <Truck className="w-2.5 h-2.5" /> Drop Ship
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-3 font-bold text-blue-600">
                        {order.branchName}
                      </td>

                      <td className="py-3 px-3 text-slate-500 whitespace-nowrap text-[11px]">
                        {dateTime(order.createdAt)}
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap text-[11px]">
                        {order.status === "COMPLETED" || order.status === "PROCESSING" ? (
                          <div>
                            <span className="font-bold text-emerald-700">
                              {dateTime(closedAt)}
                            </span>
                            {isCrossDay && (
                              <span className="text-[10px] text-amber-600 font-semibold block">
                                (ค้าง {diffDays} วัน)
                              </span>
                            )}
                          </div>
                        ) : order.status === "PENDING" ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                            <Clock className="w-3 h-3 text-amber-600" /> รอคิดเงิน
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      <td className="py-3 px-2 text-center">
                        <PaymentSlipViewer
                          orderId={order.id}
                          orderCode={order.orderCode}
                          compact
                        />
                      </td>

                      <td className="py-3 px-3 text-right font-medium text-slate-600">
                        ฿{money(order.subtotal)}
                      </td>

                      <td className="py-3 px-3 text-right">
                        {order.discountAmount > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-600 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded-md">
                            -฿{money(order.discountAmount)}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-right font-black text-slate-800">
                        ฿{money(order.totalAmount)}
                      </td>

                      <td className="py-3 px-3 text-center">
                        {statusBadge(order)}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
