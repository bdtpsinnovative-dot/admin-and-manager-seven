"use client"

import React, { useState, useMemo } from "react"
import { Building2, TrendingUp, Clock, Calendar } from "lucide-react"
import type { DashboardBranchSummary } from "@/actions/dashboard"

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

export default function DashboardTopBranches({ branches }: { branches: DashboardBranchSummary[] }) {
  const [sortBy, setSortBy] = useState<"sales" | "latest">("sales")

  const sortedBranches = useMemo(() => {
    const list = [...branches]
    if (sortBy === "sales") {
      return list.sort((a, b) => b.netSales - a.netSales)
    } else {
      return list.sort((a, b) => {
        const timeA = a.lastSaleAt ? new Date(a.lastSaleAt).getTime() : 0
        const timeB = b.lastSaleAt ? new Date(b.lastSaleAt).getTime() : 0
        return timeB - timeA
      })
    }
  }, [branches, sortBy])

  const topSales = Math.max(...branches.map((b) => b.netSales), 1)

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-black text-slate-800">สรุปสาขาเด่น</h2>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            {sortBy === "sales" ? "เรียงตามยอดขายสุทธิสูงสุด (รวม VAT)" : "เรียงตามวันที่และเวลาที่ขายล่าสุด"}
          </p>
        </div>

        {/* ปุ่มสลับการเรียงลำดับ */}
        <div className="inline-flex rounded-xl bg-slate-100 p-1 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setSortBy("sales")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              sortBy === "latest"
                ? "bg-white text-blue-700 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            ขายล่าสุด
          </button>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {sortedBranches.slice(0, 5).map((branch, index) => {
          const percent = topSales > 0 ? (branch.netSales / topSales) * 100 : 0
          return (
            <div key={branch.id} className="flex flex-col gap-1.5 p-2 rounded-xl hover:bg-slate-50/80 transition-colors">
              <div className="flex items-center gap-3">
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-black ${
                  index === 0 && sortBy === "sales"
                    ? "bg-blue-600 text-white shadow-xs"
                    : index === 1 && sortBy === "sales"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-slate-100 text-slate-600"
                }`}>
                  {index + 1}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-sm font-bold text-slate-800">{branch.name}</p>
                    <div className="text-right shrink-0">
                      <span className="text-sm font-black text-blue-600">฿{money(branch.netSales)}</span>
                      <span className="ml-1 text-[10px] font-bold text-slate-400">(รวม VAT)</span>
                    </div>
                  </div>

                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-blue-500 transition-all duration-300"
                      style={{ width: `${Math.max(percent, branch.netSales > 0 ? 4 : 0)}%` }}
                    />
                  </div>

                  <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-2 text-[11px] text-slate-400">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      ขายล่าสุด: <strong className="text-slate-600 font-semibold">{dateTime(branch.lastSaleAt)}</strong>
                    </span>
                    <span className="font-mono text-[10px] text-slate-500">
                      ก่อน VAT: ฿{money(branch.netBeforeVat)} | VAT: ฿{money(branch.totalVat)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )
        })}

        {sortedBranches.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-400">ยังไม่มีข้อมูลสาขา</p>
        )}
      </div>
    </div>
  )
}
