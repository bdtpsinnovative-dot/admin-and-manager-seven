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
  MoveHorizontal,
  Copy,
  PackageX,
  CheckCircle2,
  Sparkles,
} from "lucide-react"
import Link from "next/link"
import type { DashboardDamageSummary, DashboardDamageItem } from "@/actions/dashboard"
import {
  type DamageReasonCategory,
  classifyDamageReason,
} from "@/lib/damage-classification"

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

// Category visual configuration
const CATEGORY_CONFIG: Record<
  DamageReasonCategory,
  {
    label: string
    shortLabel: string
    bgBadge: string
    textBadge: string
    borderBadge: string
    icon: React.ReactNode
    desc: string
  }
> = {
  actual_broken: {
    label: "สินค้าชำรุด/แตกหักจริง",
    shortLabel: "เสียหายจริง",
    bgBadge: "bg-rose-50",
    textBadge: "text-rose-700",
    borderBadge: "border-rose-200",
    icon: <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />,
    desc: "สินค้าแตก หัก ร้าว ชำรุด หรือมีตำหนิจากการจัดเก็บ/ขนย้าย",
  },
  duplicate_stock: {
    label: "ตัดสต็อกเบิ้ล / ปรับระบบ",
    shortLabel: "สต็อกเบิ้ล/ปรับระบบ",
    bgBadge: "bg-sky-50",
    textBadge: "text-sky-700",
    borderBadge: "border-sky-200",
    icon: <Copy className="w-3.5 h-3.5 text-sky-600" />,
    desc: "ปรับปรุงยอดสต็อกเนื่องจากสต็อกซ้ำซ้อน คีย์เบิ้ล หรือสินค้าไม่จำหน่าย",
  },
  factory_out: {
    label: "ของไม่มีใน Stock / โรงงานไม่ส่ง",
    shortLabel: "โรงงานไม่ส่ง",
    bgBadge: "bg-amber-50",
    textBadge: "text-amber-800",
    borderBadge: "border-amber-200",
    icon: <PackageX className="w-3.5 h-3.5 text-amber-600" />,
    desc: "ตัดสต็อกออกเนื่องจากโรงงานไม่ส่งสินค้า หรือของไม่มีจริงในคลัง",
  },
  staff_gift: {
    label: "ให้พนักงาน / ส่งทดแทนลูกค้า",
    shortLabel: "ให้พนักงาน/ทดแทน",
    bgBadge: "bg-purple-50",
    textBadge: "text-purple-700",
    borderBadge: "border-purple-200",
    icon: <Gift className="w-3.5 h-3.5 text-purple-600" />,
    desc: "สินค้าสำหรับอภินันทนาการ พนักงานขาย หรือจัดส่งทดแทนลูกค้า",
  },
  other: {
    label: "อื่นๆ / ปรับปรุงทั่วไป",
    shortLabel: "อื่นๆ",
    bgBadge: "bg-slate-50",
    textBadge: "text-slate-700",
    borderBadge: "border-slate-200",
    icon: <FileQuestion className="w-3.5 h-3.5 text-slate-500" />,
    desc: "รายการตัดสต็อกสาเหตุอื่นๆ",
  },
}

export default function DashboardDamageCard({
  damageSummary,
}: {
  damageSummary?: DashboardDamageSummary
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  // Card toggle: 'BROKEN' = ชำรุดจริง (Default), 'ADJUSTMENT' = ปรับสต็อก/สต็อกเบิ้ล, 'ALL' = ทั้งหมด
  const [cardViewMode, setCardViewMode] = useState<"BROKEN" | "ADJUSTMENT" | "ALL">("BROKEN")
  // Modal filter
  const [categoryFilter, setCategoryFilter] = useState<"ALL" | DamageReasonCategory>("actual_broken")

  // Drag-to-scroll refs and state for smooth mouse dragging in modal table
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
    const walk = (x - startX) * 1.5
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

  // Extract Category Stats safely
  const actualBroken = damageSummary?.actualBroken || { qty: 0, cost: 0, retail: 0, recordCount: 0 }
  const duplicateStock = damageSummary?.duplicateStock || { qty: 0, cost: 0, retail: 0, recordCount: 0 }
  const factoryOut = damageSummary?.factoryOut || { qty: 0, cost: 0, retail: 0, recordCount: 0 }
  const staffGift = damageSummary?.staffGift || { qty: 0, cost: 0, retail: 0, recordCount: 0 }
  const other = damageSummary?.other || { qty: 0, cost: 0, retail: 0, recordCount: 0 }
  const nonDamageAdjustment = damageSummary?.nonDamageAdjustment || {
    qty: duplicateStock.qty + factoryOut.qty + staffGift.qty + other.qty,
    cost: duplicateStock.cost + factoryOut.cost + staffGift.cost + other.cost,
    retail: duplicateStock.retail + factoryOut.retail + staffGift.retail + other.retail,
    recordCount: duplicateStock.recordCount + factoryOut.recordCount + staffGift.recordCount + other.recordCount,
  }

  // Filter items in modal
  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return items.filter((item) => {
      const cat = item.category || classifyDamageReason(item.reason)
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

  // Card view values
  const cardDisplay = useMemo(() => {
    if (cardViewMode === "BROKEN") {
      return {
        title: "สินค้าชำรุด/เสียหายจริง",
        badge: "เสียหายจริง",
        qty: actualBroken.qty,
        cost: actualBroken.cost,
        retail: actualBroken.retail,
        accentColor: "text-rose-600",
        badgeColor: "bg-rose-100 text-rose-700 border-rose-200",
        cardBorder: "border-rose-200 hover:border-rose-400 bg-white",
        icon: <AlertTriangle className="h-4 w-4 text-rose-500" />,
        subNote: `แยกปรับสต็อกเบิ้ล ${nonDamageAdjustment.qty.toLocaleString()} ชิ้นออกแล้ว`,
      }
    }
    if (cardViewMode === "ADJUSTMENT") {
      return {
        title: "ปรับสต็อก / สต็อกเบิ้ล",
        badge: "ปรับปรุงระบบ",
        qty: nonDamageAdjustment.qty,
        cost: nonDamageAdjustment.cost,
        retail: nonDamageAdjustment.retail,
        accentColor: "text-sky-600",
        badgeColor: "bg-sky-100 text-sky-700 border-sky-200",
        cardBorder: "border-sky-200 hover:border-sky-400 bg-white",
        icon: <Copy className="h-4 w-4 text-sky-500" />,
        subNote: `สต็อกเบิ้ล ${duplicateStock.qty} • โรงงานไม่ส่ง ${factoryOut.qty} • แถม ${staffGift.qty}`,
      }
    }
    return {
      title: "ตัดสต็อกรวมทั้งหมด",
      badge: "รวมทั้งหมด",
      qty: damageSummary?.totalQty || 0,
      cost: damageSummary?.totalCostValue || 0,
      retail: damageSummary?.totalRetailValue || 0,
      accentColor: "text-slate-700",
      badgeColor: "bg-slate-100 text-slate-700 border-slate-200",
      cardBorder: "border-slate-200 hover:border-slate-400 bg-white",
      icon: <Layers className="h-4 w-4 text-slate-500" />,
      subNote: `เสียหายจริง ${actualBroken.qty} • ปรับปรุงสต็อก ${nonDamageAdjustment.qty}`,
    }
  }, [cardViewMode, actualBroken, nonDamageAdjustment, duplicateStock, factoryOut, staffGift, damageSummary])

  return (
    <>
      {/* 🔴 การ์ดสินค้าชำรุด & ปรับปรุงสต็อก บน Dashboard */}
      <div
        onClick={() => {
          // Open modal aligned to current card tab
          if (cardViewMode === "BROKEN") setCategoryFilter("actual_broken")
          else if (cardViewMode === "ADJUSTMENT") setCategoryFilter("duplicate_stock")
          else setCategoryFilter("ALL")
          setIsOpen(true)
        }}
        className={`rounded-2xl border ${cardDisplay.cardBorder} p-4 sm:p-5 shadow-sm hover:shadow-md transition-all group flex flex-col justify-between cursor-pointer relative overflow-hidden select-none`}
        title="คลิกเพื่อดูรายการสินค้าชำรุด/เสียหาย และสาเหตุการตัดสต็อกแบบละเอียด"
      >
        <div>
          {/* Header Row: Title & Switcher Pills */}
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 truncate">
              {cardDisplay.icon}
              <span className="truncate">{cardDisplay.title}</span>
            </span>
            <div className="p-1.5 rounded-lg bg-slate-50 text-slate-400 group-hover:text-slate-700 transition-colors shrink-0">
              <ArrowUpRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          </div>

          {/* Quick Segmented Switcher right on the card (e.stopPropagation to toggle without opening modal) */}
          <div
            className="mt-2.5 inline-flex p-0.5 bg-slate-100 rounded-lg text-[10px] font-bold w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setCardViewMode("BROKEN")}
              className={`flex-1 py-1 px-1 rounded-md transition-all text-center truncate ${
                cardViewMode === "BROKEN"
                  ? "bg-rose-600 text-white shadow-xs font-black"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              title="ดูเฉพาะสินค้าชำรุด/เสียหายจริง"
            >
              💥 เสียหาย ({actualBroken.qty})
            </button>
            <button
              type="button"
              onClick={() => setCardViewMode("ADJUSTMENT")}
              className={`flex-1 py-1 px-1 rounded-md transition-all text-center truncate ${
                cardViewMode === "ADJUSTMENT"
                  ? "bg-sky-600 text-white shadow-xs font-black"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              title="ดูรายการตัดสต็อกเบิ้ลและปรับยอดระบบ"
            >
              📋 ปรับสต็อก ({nonDamageAdjustment.qty})
            </button>
            <button
              type="button"
              onClick={() => setCardViewMode("ALL")}
              className={`py-1 px-1.5 rounded-md transition-all text-center shrink-0 ${
                cardViewMode === "ALL"
                  ? "bg-slate-800 text-white shadow-xs font-black"
                  : "text-slate-400 hover:text-slate-700"
              }`}
              title="ดูทั้งหมดรวมกัน"
            >
              รวม ({damageSummary?.totalQty || 0})
            </button>
          </div>

          {/* Big Number */}
          <div className="mt-3 flex items-baseline justify-between">
            <p className={`text-3xl sm:text-4xl font-black ${cardDisplay.accentColor} tracking-tight flex items-baseline gap-1.5`}>
              <span>{cardDisplay.qty.toLocaleString()}</span>
              <span className="text-sm font-bold text-slate-400">ชิ้น</span>
            </p>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${cardDisplay.badgeColor}`}>
              {cardDisplay.badge}
            </span>
          </div>
        </div>

        {/* Cost & Retail Breakdown */}
        <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-1 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-500">ต้นทุน:</span>
            <span className="font-bold text-slate-800">฿{money(cardDisplay.cost)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">ราคาขาย:</span>
            <span className={`font-black ${cardDisplay.accentColor}`}>฿{money(cardDisplay.retail)}</span>
          </div>
        </div>

        {/* Sub Note */}
        <div className="mt-2.5 pt-2 border-t border-dashed border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span className="truncate max-w-[200px]" title={cardDisplay.subNote}>
            {cardDisplay.subNote}
          </span>
          <span className="text-rose-500 font-bold group-hover:underline shrink-0">
            ดูแจกแจง
          </span>
        </div>
      </div>

      {/* 🔍 MODAL แสดงรายการและสาเหตุการตัดสินค้าแบบละเอียด (แยกหมวดหมู่ชัดเจน) */}
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
                    รายงานการตัดสต็อก & วิเคราะห์สาเหตุ
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    รวมทั้งสิ้น {(damageSummary?.totalQty || 0).toLocaleString()} ชิ้น ({items.length} รายการที่บันทึก) •{" "}
                    <strong className="text-rose-600 font-bold">เสียหายจริง {actualBroken.qty} ชิ้น</strong> •{" "}
                    <strong className="text-sky-600 font-bold">ปรับปรุงสต็อกระบบ {nonDamageAdjustment.qty} ชิ้น</strong>
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
            <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 bg-slate-50/50">
              
              {/* ข้อความวิเคราะห์แยกประเภท: ชี้แจงชัดเจนว่าไม่ใช่ของเสียทั้งหมด */}
              <div className="rounded-2xl border border-sky-200 bg-sky-50/70 p-4 text-xs text-sky-950 shadow-sm">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
                  <div className="space-y-1.5 leading-relaxed">
                    <p className="font-bold text-sm text-sky-950">
                      ระบบได้แยก &quot;สินค้าชำรุดเสียหายจริง&quot; ออกจาก &quot;การปรับยอดสต็อก/สต็อกเบิ้ล&quot; เรียบร้อยแล้ว:
                    </p>
                    <p className="text-sky-900">
                      ตัวเลขบันทึกตัดสต็อกรวมทั้งหมด <strong className="text-sky-950 font-black">{(damageSummary?.totalQty || 0).toLocaleString()} ชิ้น</strong> ประกอบด้วยสินค้าแตกหักเสียหายจริงเพียง{" "}
                      <strong className="text-rose-600 font-black underline">{actualBroken.qty} ชิ้น (ราคาขาย ฿{money(actualBroken.retail)})</strong>{" "}
                      ส่วนที่เหลืออีก <strong className="text-sky-900 font-black">{nonDamageAdjustment.qty} ชิ้น</strong> เป็นการตัดสต็อกทางระบบ (เช่น สต็อกเบิ้ล, โรงงานไม่ส่ง, ให้พนักงาน) คลิกหมวดหมู่ด้านล่างเพื่อกรองดูรายการได้ทันที:
                    </p>
                  </div>
                </div>
              </div>

              {/* Summary 4-5 Category Interactive Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {/* 1. เสียหายจริง */}
                <div
                  onClick={() => setCategoryFilter("actual_broken")}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    categoryFilter === "actual_broken"
                      ? "bg-rose-50 border-rose-400 shadow-md ring-2 ring-rose-500/20"
                      : "bg-white border-rose-200 hover:border-rose-300 shadow-sm"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-rose-600 uppercase flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                      ชำรุดเสียหายจริง
                    </span>
                    <span className="text-[10px] text-rose-500 font-mono font-bold">
                      {actualBroken.recordCount} ครั้ง
                    </span>
                  </div>
                  <p className="text-2xl font-black text-rose-600 mt-1">
                    {actualBroken.qty.toLocaleString()} <span className="text-xs font-normal text-rose-400">ชิ้น</span>
                  </p>
                  <div className="mt-2 pt-2 border-t border-rose-100 flex items-center justify-between text-[11px] text-slate-600 font-mono">
                    <span>ขาย: ฿{money(actualBroken.retail)}</span>
                    <span className="text-[10px] text-slate-400">ทุน: ฿{money(actualBroken.cost)}</span>
                  </div>
                </div>

                {/* 2. สต็อกเบิ้ล / ปรับระบบ */}
                <div
                  onClick={() => setCategoryFilter("duplicate_stock")}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    categoryFilter === "duplicate_stock"
                      ? "bg-sky-50 border-sky-400 shadow-md ring-2 ring-sky-500/20"
                      : "bg-white border-sky-200 hover:border-sky-300 shadow-sm"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-sky-700 uppercase flex items-center gap-1">
                      <Copy className="w-3.5 h-3.5 text-sky-600" />
                      ตัดสต็อกเบิ้ล/ปรับระบบ
                    </span>
                    <span className="text-[10px] text-sky-600 font-mono font-bold">
                      {duplicateStock.recordCount} ครั้ง
                    </span>
                  </div>
                  <p className="text-2xl font-black text-sky-700 mt-1">
                    {duplicateStock.qty.toLocaleString()} <span className="text-xs font-normal text-sky-400">ชิ้น</span>
                  </p>
                  <div className="mt-2 pt-2 border-t border-sky-100 flex items-center justify-between text-[11px] text-slate-600 font-mono">
                    <span>ขาย: ฿{money(duplicateStock.retail)}</span>
                    <span className="text-[10px] text-slate-400">ทุน: ฿{money(duplicateStock.cost)}</span>
                  </div>
                </div>

                {/* 3. โรงงานไม่ส่ง / ไม่มีของ */}
                <div
                  onClick={() => setCategoryFilter("factory_out")}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    categoryFilter === "factory_out"
                      ? "bg-amber-50 border-amber-400 shadow-md ring-2 ring-amber-500/20"
                      : "bg-white border-amber-200 hover:border-amber-300 shadow-sm"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-amber-800 uppercase flex items-center gap-1">
                      <PackageX className="w-3.5 h-3.5 text-amber-600" />
                      ของไม่มี/โรงงานไม่ส่ง
                    </span>
                    <span className="text-[10px] text-amber-600 font-mono font-bold">
                      {factoryOut.recordCount} ครั้ง
                    </span>
                  </div>
                  <p className="text-2xl font-black text-amber-800 mt-1">
                    {factoryOut.qty.toLocaleString()} <span className="text-xs font-normal text-amber-400">ชิ้น</span>
                  </p>
                  <div className="mt-2 pt-2 border-t border-amber-100 flex items-center justify-between text-[11px] text-slate-600 font-mono">
                    <span>ขาย: ฿{money(factoryOut.retail)}</span>
                    <span className="text-[10px] text-slate-400">ทุน: ฿{money(factoryOut.cost)}</span>
                  </div>
                </div>

                {/* 4. ให้พนักงาน / แถม / ทดแทนลูกค้า */}
                <div
                  onClick={() => setCategoryFilter("staff_gift")}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    categoryFilter === "staff_gift"
                      ? "bg-purple-50 border-purple-400 shadow-md ring-2 ring-purple-500/20"
                      : "bg-white border-purple-200 hover:border-purple-300 shadow-sm"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-purple-700 uppercase flex items-center gap-1">
                      <Gift className="w-3.5 h-3.5 text-purple-600" />
                      ให้พนักงาน/ส่งทดแทน
                    </span>
                    <span className="text-[10px] text-purple-600 font-mono font-bold">
                      {staffGift.recordCount} ครั้ง
                    </span>
                  </div>
                  <p className="text-2xl font-black text-purple-700 mt-1">
                    {staffGift.qty.toLocaleString()} <span className="text-xs font-normal text-purple-400">ชิ้น</span>
                  </p>
                  <div className="mt-2 pt-2 border-t border-purple-100 flex items-center justify-between text-[11px] text-slate-600 font-mono">
                    <span>ขาย: ฿{money(staffGift.retail)}</span>
                    <span className="text-[10px] text-slate-400">ทุน: ฿{money(staffGift.cost)}</span>
                  </div>
                </div>
              </div>

              {/* Search Bar & Category Filter Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between pt-1">
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
                    type="button"
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
                    type="button"
                    onClick={() => setCategoryFilter("actual_broken")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                      categoryFilter === "actual_broken"
                        ? "bg-rose-600 text-white shadow-sm"
                        : "bg-white text-rose-700 border border-rose-200 hover:bg-rose-50"
                    }`}
                  >
                    <AlertTriangle className="w-3 h-3" />
                    <span>ชำรุดจริง ({actualBroken.qty} ชิ้น)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCategoryFilter("duplicate_stock")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                      categoryFilter === "duplicate_stock"
                        ? "bg-sky-600 text-white shadow-sm"
                        : "bg-white text-sky-700 border border-sky-200 hover:bg-sky-50"
                    }`}
                  >
                    <Copy className="w-3 h-3" />
                    <span>สต็อกเบิ้ล ({duplicateStock.qty} ชิ้น)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCategoryFilter("factory_out")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                      categoryFilter === "factory_out"
                        ? "bg-amber-600 text-white shadow-sm"
                        : "bg-white text-amber-700 border border-amber-200 hover:bg-amber-50"
                    }`}
                  >
                    <PackageX className="w-3 h-3" />
                    <span>โรงงานไม่ส่ง ({factoryOut.qty} ชิ้น)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCategoryFilter("staff_gift")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                      categoryFilter === "staff_gift"
                        ? "bg-purple-600 text-white shadow-sm"
                        : "bg-white text-purple-700 border border-purple-200 hover:bg-purple-50"
                    }`}
                  >
                    <Gift className="w-3 h-3" />
                    <span>ให้พนักงาน/แถม ({staffGift.qty} ชิ้น)</span>
                  </button>
                </div>
              </div>

              {/* Detail Items List Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                
                {/* Drag-to-scroll Bar & Quick Arrow Buttons */}
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-700">รายการสินค้า ({filteredItems.length} รายการ)</span>
                    <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-600 bg-white border border-slate-200 px-2.5 py-0.5 rounded-md font-medium">
                      <MoveHorizontal className="w-3.5 h-3.5 text-slate-400" />
                      คลิกเมาส์ค้างแล้วลากซ้าย-ขวา เพื่อเลื่อนดูตาราง
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
                    <CheckCircle2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
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
                    <table className="w-full text-left text-xs min-w-[1000px]">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider select-none">
                        <tr>
                          <th className="py-3 px-4">สินค้า</th>
                          <th className="py-3 px-3">สาขา</th>
                          <th className="py-3 px-3">หมวดหมู่</th>
                          <th className="py-3 px-4 min-w-[240px]">สาเหตุที่บันทึก (Reason)</th>
                          <th className="py-3 px-3 text-center">จำนวน</th>
                          <th className="py-3 px-3 text-right">ต้นทุน/ชิ้น</th>
                          <th className="py-3 px-3 text-right">รวมต้นทุน</th>
                          <th className="py-3 px-3 text-right">ราคาขายรวม</th>
                          <th className="py-3 px-4">ผู้บันทึก & วันที่</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                        {filteredItems.map((item) => {
                          const cat = item.category || classifyDamageReason(item.reason)
                          const cfg = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.other

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

                              {/* หมวดหมู่ */}
                              <td className="py-3 px-3">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold whitespace-nowrap ${cfg.bgBadge} ${cfg.textBadge} ${cfg.borderBadge}`}>
                                  {cfg.icon}
                                  <span>{cfg.shortLabel}</span>
                                </span>
                              </td>

                              {/* สาเหตุ (Reason) */}
                              <td className="py-3 px-4">
                                <p className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed font-normal">
                                  {item.reason}
                                </p>
                              </td>

                              {/* จำนวน */}
                              <td className="py-3 px-3 text-center">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-black ${
                                  cat === "actual_broken"
                                    ? "bg-rose-100 text-rose-700"
                                    : "bg-slate-100 text-slate-800"
                                }`}>
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
                              <td className={`py-3 px-3 text-right font-bold font-mono ${
                                cat === "actual_broken" ? "text-rose-600" : "text-slate-800"
                              }`}>
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
