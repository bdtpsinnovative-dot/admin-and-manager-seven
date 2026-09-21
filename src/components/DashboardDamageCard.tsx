"use client"

import { useState, useMemo, useRef } from "react"
import {
  Trash2,
  Info,
  X,
  AlertTriangle,
  Package,
  Gift,
  FileQuestion,
  Search,
  Building2,
  User,
  Calendar,
  Layers,
  ArrowUpRight,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  MoveHorizontal
} from "lucide-react"
import Link from "next/link"
import type { DashboardDamageSummary, DashboardDamageItem } from "@/actions/dashboard"

const money = (value: number) =>
  value.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const dateTime = (value: string) => {
  const d = new Date(value)
  return d.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

// ฟังก์ชันช่วยแยกหมวดหมู่สาเหตุ
function getReasonCategory(reason: string): "broken" | "out_of_stock" | "gift" | "other" {
  const r = (reason || "").toLowerCase()
  if (r.includes("ไม่ส่ง") || r.includes("ไม่มีใน stock") || r.includes("ไม่มีในสต็อก") || r.includes("ของไม่มี")) {
    return "out_of_stock"
  }
  if (r.includes("พนักงาน") || r.includes("ลูกค้า") || r.includes("แถม") || r.includes("ให้")) {
    return "gift"
  }
  if (r.includes("ชำรุด") || r.includes("เสียหาย") || r.includes("หล่น") || r.includes("แตก") || r.includes("พัง") || r.includes("ร้าว")) {
    return "broken"
  }
  return "other"
}

export default function DashboardDamageCard({
  damageSummary,
}: {
  damageSummary?: DashboardDamageSummary
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<"ALL" | "broken" | "out_of_stock" | "gift" | "other">("ALL")

  // Drag-to-scroll refs and state for smooth mouse dragging
  const scrollRef = useRef<HTMLDivElement>(null)
  const [isMouseDown, setIsMouseDown] = useState(false)
  const [startX, setStartX] = useState(0)
  const [scrollLeftState, setScrollLeftState] = useState(0)

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return
    setIsMouseDown(true)
    setStartX(e.pageX - scrollRef.current.offsetLeft)
    setScrollLeftState(scrollRef.current.scrollLeft)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isMouseDown || !scrollRef.current) return
    e.preventDefault()
    const x = e.pageX - scrollRef.current.offsetLeft
    const walk = (x - startX) * 1.5 // Multiplier for smooth responsive drag
    scrollRef.current.scrollLeft = scrollLeftState - walk
  }

  const handleMouseUpOrLeave = () => {
    setIsMouseDown(false)
  }

  const scrollByAmount = (amount: number) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: amount, behavior: "smooth" })
    }
  }

  const items = useMemo(() => damageSummary?.items || [], [damageSummary])

  // คำนวณสรุปแยกตามหมวดหมู่สาเหตุ
  const stats = useMemo(() => {
    let brokenQty = 0
    let brokenCost = 0
    let brokenCount = 0

    let outOfStockQty = 0
    let outOfStockCost = 0
    let outOfStockCount = 0

    let giftQty = 0
    let giftCost = 0
    let giftCount = 0

    let otherQty = 0
    let otherCost = 0
    let otherCount = 0

    items.forEach((item) => {
      const cat = getReasonCategory(item.reason)
      if (cat === "broken") {
        brokenQty += item.qty
        brokenCost += item.totalCost
        brokenCount += 1
      } else if (cat === "out_of_stock") {
        outOfStockQty += item.qty
        outOfStockCost += item.totalCost
        outOfStockCount += 1
      } else if (cat === "gift") {
        giftQty += item.qty
        giftCost += item.totalCost
        giftCount += 1
      } else {
        otherQty += item.qty
        otherCost += item.totalCost
        otherCount += 1
      }
    })

    return {
      broken: { qty: brokenQty, cost: brokenCost, count: brokenCount },
      outOfStock: { qty: outOfStockQty, cost: outOfStockCost, count: outOfStockCount },
      gift: { qty: giftQty, cost: giftCost, count: giftCount },
      other: { qty: otherQty, cost: otherCost, count: otherCount },
    }
  }, [items])

  // ฟิลเตอร์รายการตามช่องค้นหาและประเภทสาเหตุ
  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return items.filter((item) => {
      const cat = getReasonCategory(item.reason)
      if (categoryFilter !== "ALL" && cat !== categoryFilter) {
        return false
      }
      if (!q) return true
      return (
        item.productName.toLowerCase().includes(q) ||
        item.productSku.toLowerCase().includes(q) ||
        item.reason.toLowerCase().includes(q) ||
        item.branchName.toLowerCase().includes(q) ||
        item.recordedBy.toLowerCase().includes(q)
      )
    })
  }, [items, searchQuery, categoryFilter])

  return (
    <>
      {/* 🔴 การ์ดสินค้าชำรุด/เสียหาย บน Dashboard (กดเพื่อเปิด Modal) */}
      <div
        onClick={() => setIsOpen(true)}
        className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm hover:shadow-md hover:border-rose-300 transition-all group flex flex-col justify-between cursor-pointer relative overflow-hidden select-none"
        title="คลิกเพื่อดูรายการสินค้าชำรุด/เสียหาย และสาเหตุแบบละเอียด"
      >
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[11px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
          <Info className="w-3 h-3" />
          <span>คลิกดูสาเหตุ</span>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-600 flex items-center gap-1.5">
              สินค้าชำรุด/เสียหาย
              <Info className="w-3.5 h-3.5 text-rose-400 group-hover:text-rose-600 transition-colors" />
            </span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-500 group-hover:scale-110 transition-transform">
              <Trash2 className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-3xl sm:text-4xl font-black text-rose-600 tracking-tight flex items-baseline gap-1.5">
            <span>{(damageSummary?.totalQty || 0).toLocaleString()}</span>
            <span className="text-sm font-bold text-rose-400">ชิ้น</span>
          </p>
        </div>

        <div className="mt-2 pt-2 border-t border-rose-50 space-y-1 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-500">ต้นทุน:</span>
            <span className="font-bold text-slate-800">฿{money(damageSummary?.totalCostValue || 0)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">ราคาขาย:</span>
            <span className="font-black text-rose-600">฿{money(damageSummary?.totalRetailValue || 0)}</span>
          </div>
        </div>

        <div className="mt-2.5 pt-2 border-t border-dashed border-rose-100 flex items-center justify-between text-[11px] text-rose-500 font-medium">
          <span className="group-hover:underline">คลิกดูแจกแจงสาเหตุรายชิ้น</span>
          <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </div>
      </div>

      {/* 🔍 MODAL แสดงรายการและสาเหตุการตัดสินค้าแบบละเอียด */}
      {isOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-[96vw] lg:max-w-6xl xl:max-w-7xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-100">
            
            {/* Modal Header */}
            <div className="p-5 sm:p-6 bg-white border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                    รายการสินค้าชำรุด / เสียหาย & สาเหตุการตัดสต็อก
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    รวมทั้งสิ้น {(damageSummary?.totalQty || 0).toLocaleString()} ชิ้น ({items.length} รายการที่บันทึกตัดสต็อก)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                title="ปิดหน้าต่าง"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
              
              {/* 💡 แจ้งเตือนข้อเท็จจริง (เหตุผลที่ยอดถึง 63 ชิ้น) */}
              <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-900 shadow-sm">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1.5 leading-relaxed">
                    <p className="font-bold text-sm text-amber-900">
                      💡 ข้อมูลวิเคราะห์สาเหตุการตัดสต็อก:
                    </p>
                    <p className="text-amber-800">
                      ตัวเลข <strong className="text-amber-950 font-black">{(damageSummary?.totalQty || 0).toLocaleString()} ชิ้น</strong> นี้ มาจากบันทึกในระบบตัดของเสีย แต่เมื่อตรวจสอบสาเหตุจริงพบว่า <strong className="underline">ไม่ได้ชำรุดเสียหายจริงทั้งหมด</strong> มีการตัดด้วยเหตุผลต่างๆ ดังนี้:
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                      <div className="bg-white/80 border border-amber-200 rounded-lg p-2">
                        <span className="text-[10px] text-slate-500 block">⚠️ แตกหัก/เสียหายจริง</span>
                        <strong className="text-sm font-black text-rose-600">{stats.broken.qty} ชิ้น</strong>
                        <span className="text-[10px] text-slate-400 block">({stats.broken.count} ครั้ง)</span>
                      </div>
                      <div className="bg-white/80 border border-amber-200 rounded-lg p-2">
                        <span className="text-[10px] text-slate-500 block">📦 ของหมด/โรงงานไม่ส่ง</span>
                        <strong className="text-sm font-black text-amber-600">{stats.outOfStock.qty} ชิ้น</strong>
                        <span className="text-[10px] text-slate-400 block">({stats.outOfStock.count} ครั้ง)</span>
                      </div>
                      <div className="bg-white/80 border border-amber-200 rounded-lg p-2">
                        <span className="text-[10px] text-slate-500 block">🎁 ให้พนักงาน/แถมลูกค้า</span>
                        <strong className="text-sm font-black text-blue-600">{stats.gift.qty} ชิ้น</strong>
                        <span className="text-[10px] text-slate-400 block">({stats.gift.count} ครั้ง)</span>
                      </div>
                      <div className="bg-white/80 border border-amber-200 rounded-lg p-2">
                        <span className="text-[10px] text-slate-500 block">📝 อื่นๆ/ปรับสต็อก</span>
                        <strong className="text-sm font-black text-slate-700">{stats.other.qty} ชิ้น</strong>
                        <span className="text-[10px] text-slate-400 block">({stats.other.count} ครั้ง)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Summary 4 Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-[11px] font-bold text-slate-400 uppercase">จำนวนตัดสต็อก</span>
                  <p className="text-xl font-black text-slate-800 mt-1">
                    {(damageSummary?.totalQty || 0).toLocaleString()} <span className="text-xs font-normal text-slate-500">ชิ้น</span>
                  </p>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-[11px] font-bold text-slate-400 uppercase">จำนวนครั้งที่บันทึก</span>
                  <p className="text-xl font-black text-slate-800 mt-1">
                    {items.length.toLocaleString()} <span className="text-xs font-normal text-slate-500">รายการ</span>
                  </p>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-[11px] font-bold text-slate-400 uppercase">มูลค่าต้นทุนรวม</span>
                  <p className="text-xl font-black text-slate-800 mt-1">
                    ฿{money(damageSummary?.totalCostValue || 0)}
                  </p>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-rose-200 bg-rose-50/20 shadow-sm">
                  <span className="text-[11px] font-bold text-rose-500 uppercase">มูลค่าราคาขายรวม</span>
                  <p className="text-xl font-black text-rose-600 mt-1">
                    ฿{money(damageSummary?.totalRetailValue || 0)}
                  </p>
                </div>
              </div>

              {/* Search Bar & Category Filter Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                
                {/* Search Input */}
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ค้นหาชื่อสินค้า, SKU, สาเหตุ, ผู้บันทึก..."
                    className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all shadow-sm"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                    >
                      ล้าง
                    </button>
                  )}
                </div>

                {/* Filter Chips */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    onClick={() => setCategoryFilter("ALL")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      categoryFilter === "ALL"
                        ? "bg-slate-800 text-white shadow-sm"
                        : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    ทั้งหมด ({items.length})
                  </button>
                  <button
                    onClick={() => setCategoryFilter("broken")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      categoryFilter === "broken"
                        ? "bg-rose-600 text-white shadow-sm"
                        : "bg-white text-rose-700 border border-rose-200 hover:bg-rose-50"
                    }`}
                  >
                    ⚠️ ชำรุดจริง ({stats.broken.qty} ชิ้น)
                  </button>
                  <button
                    onClick={() => setCategoryFilter("out_of_stock")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      categoryFilter === "out_of_stock"
                        ? "bg-amber-600 text-white shadow-sm"
                        : "bg-white text-amber-700 border border-amber-200 hover:bg-amber-50"
                    }`}
                  >
                    📦 ไม่มีใน Stock ({stats.outOfStock.qty} ชิ้น)
                  </button>
                  <button
                    onClick={() => setCategoryFilter("gift")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      categoryFilter === "gift"
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-white text-blue-700 border border-blue-200 hover:bg-blue-50"
                    }`}
                  >
                    🎁 ให้พนักงาน/ลูกค้า ({stats.gift.qty} ชิ้น)
                  </button>
                  <button
                    onClick={() => setCategoryFilter("other")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      categoryFilter === "other"
                        ? "bg-slate-600 text-white shadow-sm"
                        : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    📝 อื่นๆ ({stats.other.qty} ชิ้น)
                  </button>
                </div>
              </div>

              {/* Detail Items List */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                
                {/* Drag-to-scroll Bar & Quick Arrow Buttons */}
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-700">รายการสินค้า ({filteredItems.length} รายการ)</span>
                    <span className="inline-flex items-center gap-1.5 text-[11px] text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-md font-medium">
                      <MoveHorizontal className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                      คลิกเมาส์ค้างแล้วลากซ้าย-ขวา เพื่อเลื่อนดูตารางได้เลยครับ
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 ml-auto">
                    <button
                      type="button"
                      onClick={() => scrollByAmount(-350)}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 shadow-xs transition-colors cursor-pointer flex items-center gap-1 font-bold text-[11px]"
                      title="เลื่อนไปทางซ้าย"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>เลื่อนซ้าย</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => scrollByAmount(350)}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 shadow-xs transition-colors cursor-pointer flex items-center gap-1 font-bold text-[11px]"
                      title="เลื่อนไปทางขวา"
                    >
                      <span>เลื่อนขวา</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {filteredItems.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 font-medium">
                    <Trash2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    ไม่พบรายการสินค้าที่ตรงกับเงื่อนไขการค้นหา
                  </div>
                ) : (
                  <div
                    ref={scrollRef}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUpOrLeave}
                    onMouseLeave={handleMouseUpOrLeave}
                    className={`overflow-x-auto select-none transition-colors scrollbar-thin scrollbar-thumb-slate-300 hover:scrollbar-thumb-slate-400 ${
                      isMouseDown ? "cursor-grabbing" : "cursor-grab"
                    }`}
                    style={{
                      scrollbarWidth: "thin",
                      WebkitOverflowScrolling: "touch",
                    }}
                  >
                    <table className="w-full text-left text-xs min-w-[950px]">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider select-none">
                        <tr>
                          <th className="py-3 px-4">สินค้า</th>
                          <th className="py-3 px-3">สาขา</th>
                          <th className="py-3 px-4 min-w-[220px]">สาเหตุที่บันทึก (Reason)</th>
                          <th className="py-3 px-3 text-center">จำนวน</th>
                          <th className="py-3 px-3 text-right">ต้นทุน/ชิ้น</th>
                          <th className="py-3 px-3 text-right">รวมต้นทุน</th>
                          <th className="py-3 px-3 text-right">ราคาขายรวม</th>
                          <th className="py-3 px-4">ผู้บันทึก & วันที่</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                        {filteredItems.map((item) => {
                          const cat = getReasonCategory(item.reason)
                          let badgeBg = "bg-slate-100 text-slate-700 border-slate-200"
                          let badgeIcon = <FileQuestion className="w-3 h-3" />

                          if (cat === "broken") {
                            badgeBg = "bg-rose-50 text-rose-700 border-rose-200 font-bold"
                            badgeIcon = <AlertTriangle className="w-3 h-3 text-rose-500" />
                          } else if (cat === "out_of_stock") {
                            badgeBg = "bg-amber-50 text-amber-800 border-amber-200 font-bold"
                            badgeIcon = <Package className="w-3 h-3 text-amber-600" />
                          } else if (cat === "gift") {
                            badgeBg = "bg-blue-50 text-blue-700 border-blue-200 font-bold"
                            badgeIcon = <Gift className="w-3 h-3 text-blue-600" />
                          }

                          return (
                            <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                              {/* สินค้า */}
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden">
                                    {item.productImageUrl ? (
                                      <img
                                        src={item.productImageUrl}
                                        alt={item.productName}
                                        draggable={false}
                                        className="w-full h-full object-contain p-0.5 select-none pointer-events-none"
                                      />
                                    ) : (
                                      <Package className="w-5 h-5 text-slate-300" />
                                    )}
                                  </div>
                                  <div className="min-w-0 max-w-[200px]">
                                    <p className="font-bold text-slate-800 truncate" title={item.productName}>
                                      {item.productName}
                                    </p>
                                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                                      SKU: {item.productSku}
                                    </p>
                                  </div>
                                </div>
                              </td>

                              {/* สาขา */}
                              <td className="py-3 px-3">
                                <span className="inline-flex items-center gap-1 text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                                  <Building2 className="w-3 h-3 text-slate-400" />
                                  <span className="truncate max-w-[120px]">{item.branchName}</span>
                                </span>
                              </td>

                              {/* สาเหตุ (Reason) */}
                              <td className="py-3 px-4">
                                <div className={`inline-flex items-start gap-1.5 px-2.5 py-1 rounded-lg border text-xs leading-snug ${badgeBg}`}>
                                  <span className="mt-0.5 shrink-0">{badgeIcon}</span>
                                  <span className="whitespace-pre-wrap">{item.reason}</span>
                                </div>
                              </td>

                              {/* จำนวน */}
                              <td className="py-3 px-3 text-center">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-black bg-rose-100 text-rose-700">
                                  {item.qty} ชิ้น
                                </span>
                              </td>

                              {/* ต้นทุนต่อชิ้น */}
                              <td className="py-3 px-3 text-right text-slate-500 font-mono">
                                ฿{money(item.cost)}
                              </td>

                              {/* รวมต้นทุน */}
                              <td className="py-3 px-3 text-right font-bold text-slate-800 font-mono">
                                ฿{money(item.totalCost)}
                              </td>

                              {/* รวมราคาขาย */}
                              <td className="py-3 px-3 text-right font-bold text-rose-600 font-mono">
                                ฿{money(item.totalRetail)}
                              </td>

                              {/* ผู้บันทึก & วันที่ */}
                              <td className="py-3 px-4">
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-1 text-[11px] text-slate-700 font-semibold truncate max-w-[150px]">
                                    <User className="w-3 h-3 text-slate-400 shrink-0" />
                                    <span title={item.recordedBy}>{item.recordedBy}</span>
                                  </div>
                                  <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                                    <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                                    <span>{dateTime(item.createdAt)}</span>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 bg-white border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <Link
                href="/manager/damage-history"
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1 hover:underline"
              >
                <span>เปิดหน้าประวัติของเสียเต็มรูปแบบ</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
              <button
                onClick={() => setIsOpen(false)}
                className="w-full sm:w-auto px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-sm"
              >
                ปิดหน้าต่าง
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  )
}
