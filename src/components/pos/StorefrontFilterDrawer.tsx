"use client"

import { useEffect, useState, useRef } from "react"
import {
  PRODUCT_FILTER_ITEMS,
  type ProductFilterMenuItem,
  type ProductColorOption,
  type ProductMaterialOption,
  type DimensionFilter,
  EMPTY_DIMENSION_FILTER,
  hasActiveDimensions,
} from "@/lib/propFilterModel"
import { X, ChevronLeft, SlidersHorizontal, Sparkles } from "lucide-react"

type StorefrontFilterDrawerProps = {
  open: boolean
  initialPanel?: 'category' | 'color' | 'material' | 'size'
  activeCategory: string
  selectedColors?: string[]
  selectedMaterials?: string[]
  dimensionFilter?: DimensionFilter
  colorOptions?: ProductColorOption[]
  materialOptions?: ProductMaterialOption[]
  onClose: () => void
  onCategoryChange: (category: string) => void
  onColorsChange: (colors: string[]) => void
  onMaterialsChange: (materials: string[]) => void
  onDimensionFilterChange: (dimensions: DimensionFilter) => void
  onResetAll?: () => void
}

function groupForCategory(category: string): string | null {
  const value = category.trim().toUpperCase()
  if (value === "VASE & VESSELS" || value === "CERAMIC VASES" || value === "GLASS VASES" || value === "VESSELS" || value === "VASE AND FLOWER" || value === "OTHERS VASE" || value.startsWith("VASE")) return "VASE & VESSELS"
  if (value === "FIGURE" || value === "ANIMAL FIGURE" || value === "HUMAN FIGURE" || value === "PLANT FIGURE" || value === "OTHERS FIGURE" || value.startsWith("DOLL")) return "FIGURE"
  if (value === "ACCESSORIES" || value === "BOX" || value === "TRAYS" || value === "TOY" || value.startsWith("DECORATIVE")) return "ACCESSORIES"
  if (value === "DINING & TABLEWARE" || value === "PLATES & DISHES" || value === "BOWLS" || value === "GLASSWARE" || value === "CUPS & MUGS" || value === "TRAYS & SERVINGWARE" || value === "OTHER DINING & TABLEWARE" || value === "KITCHENWARE") return "DINING & TABLEWARE"
  if (value === "DRESSING & BATH" || value === "BATH ROOM" || value === "DRESSING ROOM" || value.includes("BATH")) return "DRESSING & BATH"
  if (value === "ART & WALL DECOR" || value === "HANDMADE" || value === "3D HANDMADE" || value === "DIGITAL PRINT" || value === "MIXED MEDIA ART" || value === "PHOTO FRAME" || value.startsWith("WALL ART")) return "ART & WALL DECOR"
  return null
}

export default function StorefrontFilterDrawer({
  open,
  initialPanel = 'category',
  activeCategory,
  selectedColors = [],
  selectedMaterials = [],
  dimensionFilter = EMPTY_DIMENSION_FILTER,
  colorOptions = [],
  materialOptions = [],
  onClose,
  onCategoryChange,
  onColorsChange,
  onMaterialsChange,
  onDimensionFilterChange,
  onResetAll,
}: StorefrontFilterDrawerProps) {
  const [currentPanel, setCurrentPanel] = useState<'category' | 'color' | 'material' | 'size'>(initialPanel)
  const activeGroup = groupForCategory(activeCategory)
  const [expandedGroups, setExpandedGroups] = useState<string[]>(activeGroup ? [activeGroup] : [])
  const [localDimensions, setLocalDimensions] = useState<DimensionFilter>(dimensionFilter)

  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (dimensionFilter) setLocalDimensions(dimensionFilter)
  }, [dimensionFilter])

  useEffect(() => {
    if (open) {
      if (initialPanel) setCurrentPanel(initialPanel)
    } else {
      setCurrentPanel('category')
      return
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current()
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const group = groupForCategory(activeCategory)
    if (group) setExpandedGroups((current) => current.includes(group) ? current : [...current, group])
  }, [activeCategory, open])

  const toggleGroup = (label: string) => {
    setExpandedGroups((current) =>
      current.includes(label) ? current.filter((g) => g !== label) : [...current, label]
    )
  }

  const toggleColor = (value: string) => {
    const next = selectedColors.includes(value)
      ? selectedColors.filter((c) => c !== value)
      : [...selectedColors, value]
    onColorsChange(next)
  }

  const toggleMaterial = (value: string) => {
    const next = selectedMaterials.includes(value)
      ? selectedMaterials.filter((m) => m !== value)
      : [...selectedMaterials, value]
    onMaterialsChange(next)
  }

  const applyDimensions = () => {
    onDimensionFilterChange(localDimensions)
    onClose()
  }

  const clearDimensions = () => {
    setLocalDimensions(EMPTY_DIMENSION_FILTER)
    onDimensionFilterChange(EMPTY_DIMENSION_FILTER)
  }

  const hasAnyFilter =
    activeCategory !== 'All' && activeCategory !== 'ALL' ||
    selectedColors.length > 0 ||
    selectedMaterials.length > 0 ||
    hasActiveDimensions(dimensionFilter)

  const renderMenuItem = (item: ProductFilterMenuItem, index: number) => {
    if (item.isSpecial && item.fullValue) {
      const isActive = activeCategory === item.fullValue
      const isFirstSpecial = index > 0 && !PRODUCT_FILTER_ITEMS[index - 1]?.isSpecial
      return (
        <div key={item.fullValue} className={`w-full ${isFirstSpecial ? "mt-5 border-t border-[#C4B5A5]/35 pt-4" : "py-1"}`}>
          <button
            type="button"
            onClick={() => { onCategoryChange(item.fullValue!); onClose(); }}
            className={`group flex min-h-12 w-full items-center justify-between px-3 py-2 rounded-xl transition-all text-left cursor-pointer ${
              isActive ? "bg-[#84492C]/10 text-[#84492C] font-bold" : "text-[#84492C] hover:bg-[#84492C]/5 font-medium"
            }`}
          >
            <div className="flex flex-col items-start min-w-0 text-left">
              <span className="text-[13px] uppercase tracking-wider">
                {item.displayLabel || item.label}
              </span>
              {item.thaiLabel && (
                <span className="text-[11.5px] mt-0.5 text-[#84492C]/80 font-normal">
                  {item.thaiLabel}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-2">
              {isActive && <span className="h-2 w-2 rounded-full bg-[#84492C] shrink-0" />}
              <Sparkles className="w-3.5 h-3.5 text-[#84492C]" />
            </div>
          </button>
        </div>
      )
    }

    if (!item.items && item.fullValue) {
      const isActive = activeCategory === item.fullValue
      const label = item.displayLabel || item.label
      return (
        <div key={`${item.label}-${index}`} className="flex w-full items-center py-0.5">
          <button
            type="button"
            onClick={() => { onCategoryChange(item.fullValue!); onClose(); }}
            className={`group flex min-h-12 min-w-0 w-full items-center justify-between px-3 py-2 rounded-xl transition-all text-left outline-none cursor-pointer ${
              isActive ? "bg-[#84492C]/10 text-[#84492C] font-bold" : "text-[#3A3835] hover:bg-black/[0.03] font-medium"
            }`}
          >
            <div className="flex flex-col items-start min-w-0 text-left">
              <span className="text-[13px] uppercase tracking-wider">
                {label}
              </span>
              {item.thaiLabel && (
                <span className={`text-[11.5px] mt-0.5 ${isActive ? "text-[#84492C]" : "text-[#807971] font-normal"}`}>
                  {item.thaiLabel}
                </span>
              )}
            </div>
            {isActive && <span className="h-2 w-2 rounded-full bg-[#84492C] shrink-0 ml-2" />}
          </button>
        </div>
      )
    }

    const isExpanded = expandedGroups.includes(item.label)
    const isParentActive = activeCategory === item.label
    const hasActiveChild = item.items?.some((child) => activeCategory === child.fullValue)
    const label = item.displayLabel || item.label

    return (
      <div key={item.label} className="flex w-full flex-col items-start text-left py-0.5">
        <div className="flex w-full items-center gap-1">
          <button
            type="button"
            onClick={() => { onCategoryChange(item.label); onClose(); }}
            className={`group flex min-h-12 min-w-0 flex-1 items-center justify-between px-3 py-2 rounded-xl transition-all text-left outline-none cursor-pointer ${
              isParentActive
                ? "bg-[#84492C]/10 text-[#84492C] font-bold"
                : hasActiveChild
                ? "text-[#1C1A18] font-semibold bg-amber-50/50"
                : isExpanded
                ? "text-[#1C1A18] font-medium"
                : "text-[#3A3835] hover:bg-black/[0.03] font-medium"
            }`}
          >
            <div className="flex flex-col items-start min-w-0 text-left">
              <span className="text-[13px] uppercase tracking-wider">
                {label}
              </span>
              {item.thaiLabel && (
                <span className={`text-[11.5px] mt-0.5 ${isParentActive ? "text-[#84492C] font-medium" : "text-[#807971] font-normal"}`}>
                  {item.thaiLabel}
                </span>
              )}
            </div>
            {isParentActive && <span className="h-2 w-2 rounded-full bg-[#84492C] shrink-0 ml-2" />}
          </button>
          <button
            type="button"
            onClick={() => toggleGroup(item.label)}
            aria-label={`${isExpanded ? "ยุบ" : "ขยาย"} ${label}`}
            className={`grid min-h-10 min-w-10 shrink-0 place-items-center text-[16px] font-bold rounded-lg outline-none hover:bg-black/[0.04] transition-colors cursor-pointer ${
              isExpanded ? "text-[#1C1A18]" : "text-[#807971]"
            }`}
          >
            {isExpanded ? "−" : "+"}
          </button>
        </div>

        {/* เมนูย่อย (Subcategories) */}
        <div className={`w-full overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? "max-h-[700px] opacity-100" : "max-h-0 opacity-0"}`}>
          <div className="flex flex-col items-start pb-2 pl-4 pr-1 pt-1 text-left w-full space-y-0.5 border-l border-[#C4B5A5]/40 ml-4 my-1">
            {item.items?.map((child) => {
              const isActive = activeCategory === child.fullValue
              return (
                <div key={child.fullValue} className="flex w-full items-center py-0.5">
                  <button
                    type="button"
                    onClick={() => { onCategoryChange(child.fullValue); onClose(); }}
                    className={`group flex min-h-10 min-w-0 w-full items-center justify-between px-3 py-1.5 rounded-lg transition-all text-left outline-none cursor-pointer ${
                      isActive ? "bg-[#84492C]/[0.08] text-[#84492C] font-bold" : "text-[#504A44] hover:bg-black/[0.02]"
                    }`}
                  >
                    <div className="flex flex-col items-start min-w-0 text-left">
                      <span className={`text-[12px] uppercase tracking-wider ${isActive ? "font-bold text-[#84492C]" : "font-normal text-[#504A44]"}`}>
                        {child.displayLabel}
                      </span>
                      {child.thaiLabel && (
                        <span className={`text-[11px] mt-0.5 ${isActive ? "text-[#84492C] font-medium" : "text-[#807971]"}`}>
                          {child.thaiLabel}
                        </span>
                      )}
                    </div>
                    {isActive && <span className="h-1.5 w-1.5 rounded-full bg-[#84492C] shrink-0 ml-2" />}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`fixed inset-0 z-[9999] transition-opacity duration-300 ${
        open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      {/* พื้นหลัง Dim สไตล์หน้าร้าน */}
      <button
        type="button"
        aria-label="ปิดฟิลเตอร์"
        className="absolute inset-0 h-full w-full bg-black/40 backdrop-blur-xs cursor-pointer"
        onClick={onClose}
      />

      {/* แถบ Drawer เลื่อนมาจากซ้าย สีเอิร์ธโทนหน้าร้าน */}
      <div
        className={`absolute bottom-0 left-0 top-0 flex w-[90%] max-w-[390px] shadow-2xl transition-transform duration-300 ease-out will-change-transform ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <aside className="flex h-full w-full shrink-0 flex-col bg-[#EFE9E1] border-r border-[#C4B5A5]/40 font-sans select-none">
          {/* Header ด้านบน */}
          <div className="relative flex min-h-[70px] items-center justify-between border-b border-[#C4B5A5]/35 px-5">
            <div className="flex items-center z-10">
              {currentPanel !== 'category' ? (
                <button
                  type="button"
                  onClick={() => setCurrentPanel('category')}
                  className="flex items-center gap-1 text-[#3A3835] hover:text-[#84492C] text-xs font-bold uppercase transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
              ) : (
                <div className="flex items-center gap-2 text-[#84492C]">
                  <SlidersHorizontal className="w-4 h-4" />
                  <span className="text-[11px] uppercase tracking-[0.2em] font-bold">Storefront</span>
                </div>
              )}
            </div>

            {/* ชื่อ Panel กึ่งกลาง */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-[12px] font-bold uppercase tracking-[0.25em] text-[#3A3835]">
                {currentPanel === 'color'
                  ? "Color"
                  : currentPanel === 'material'
                  ? "Material"
                  : currentPanel === 'size'
                  ? "Dimensions"
                  : "Filters"}
              </span>
            </div>

            <div className="flex items-center gap-2 z-10">
              {hasAnyFilter && (
                <button
                  type="button"
                  onClick={() => {
                    if (onResetAll) onResetAll()
                    else {
                      onCategoryChange('All')
                      onColorsChange([])
                      onMaterialsChange([])
                      onDimensionFilterChange(EMPTY_DIMENSION_FILTER)
                    }
                  }}
                  className="text-[10px] uppercase tracking-wider text-rose-600 hover:text-rose-700 font-bold px-2 py-1 rounded bg-rose-50 hover:bg-rose-100 transition-colors cursor-pointer"
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="p-1 text-[#3A3835] hover:text-[#84492C] transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Quick Sub-navigation Bar for Panels */}
          <div className="flex items-center border-b border-[#C4B5A5]/25 bg-[#F7F3EE] px-4 py-2 text-[10px] font-bold uppercase tracking-wider gap-2 overflow-x-auto">
            <button
              onClick={() => setCurrentPanel('category')}
              className={`px-2.5 py-1 rounded-full transition-all cursor-pointer whitespace-nowrap ${
                currentPanel === 'category'
                  ? 'bg-[#84492C] text-white'
                  : 'text-[#6F6861] hover:text-[#3A3835] hover:bg-black/5'
              }`}
            >
              หมวดหมู่ {activeCategory !== 'All' && `(1)`}
            </button>
            <button
              onClick={() => setCurrentPanel('color')}
              className={`px-2.5 py-1 rounded-full transition-all cursor-pointer whitespace-nowrap ${
                currentPanel === 'color'
                  ? 'bg-[#84492C] text-white'
                  : selectedColors.length > 0
                  ? 'bg-amber-100 text-[#84492C] font-black'
                  : 'text-[#6F6861] hover:text-[#3A3835] hover:bg-black/5'
              }`}
            >
              สี {selectedColors.length > 0 && `(${selectedColors.length})`}
            </button>
            <button
              onClick={() => setCurrentPanel('material')}
              className={`px-2.5 py-1 rounded-full transition-all cursor-pointer whitespace-nowrap ${
                currentPanel === 'material'
                  ? 'bg-[#84492C] text-white'
                  : selectedMaterials.length > 0
                  ? 'bg-amber-100 text-[#84492C] font-black'
                  : 'text-[#6F6861] hover:text-[#3A3835] hover:bg-black/5'
              }`}
            >
              วัสดุ {selectedMaterials.length > 0 && `(${selectedMaterials.length})`}
            </button>
            <button
              onClick={() => setCurrentPanel('size')}
              className={`px-2.5 py-1 rounded-full transition-all cursor-pointer whitespace-nowrap ${
                currentPanel === 'size'
                  ? 'bg-[#84492C] text-white'
                  : hasActiveDimensions(dimensionFilter)
                  ? 'bg-amber-100 text-[#84492C] font-black'
                  : 'text-[#6F6861] hover:text-[#3A3835] hover:bg-black/5'
              }`}
            >
              ขนาด {hasActiveDimensions(dimensionFilter) && `(✓)`}
            </button>
          </div>

          {/* เนื้อหาด้านในตามแต่ละ Panel */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {currentPanel === 'category' && (
              <div className="space-y-1">
                {PRODUCT_FILTER_ITEMS.map((item, index) => renderMenuItem(item, index))}
              </div>
            )}

            {currentPanel === 'color' && (
              <div className="space-y-1">
                <div className="pb-2 mb-2 border-b border-[#C4B5A5]/25">
                  <p className="text-[11px] font-bold text-[#84492C] uppercase tracking-wider">
                    เลือกสีกรองสินค้า
                  </p>
                  <p className="text-[10px] text-[#6F6861] mt-0.5">
                    คลิกเพื่อเลือกสีที่ต้องการ (เลือกได้หลายสีพร้อมกัน)
                  </p>
                </div>

                {colorOptions.length > 0 ? (
                  colorOptions.map((opt) => {
                    const isSelected = selectedColors.includes(opt.value)
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => toggleColor(opt.value)}
                        className={`group flex min-h-11 w-full items-center gap-2.5 px-3 py-1.5 rounded-xl text-left transition-all cursor-pointer ${
                          isSelected ? "bg-[#84492C]/10 font-bold text-[#84492C]" : "text-[#504A44] hover:bg-black/[0.02]"
                        }`}
                      >
                        <span
                          className="h-5 w-5 shrink-0 rounded-full border border-black/15 shadow-2xs"
                          style={opt.swatch ? { backgroundColor: opt.swatch } : undefined}
                        />
                        <span className="min-w-0 flex-1 truncate text-xs uppercase tracking-wider">
                          {opt.label}
                        </span>
                        <span className="shrink-0 font-mono text-[10px] text-[#8C8A86] bg-black/5 px-2 py-0.5 rounded-full">
                          {opt.count}
                        </span>
                      </button>
                    )
                  })
                ) : (
                  <p className="py-8 text-center text-xs text-[#8C8A86]">ไม่มีข้อมูลสีสำหรับสินค้านี้</p>
                )}
              </div>
            )}

            {currentPanel === 'material' && (
              <div className="space-y-1">
                <div className="pb-2 mb-2 border-b border-[#C4B5A5]/25">
                  <p className="text-[11px] font-bold text-[#84492C] uppercase tracking-wider">
                    เลือกวัสดุกรองสินค้า
                  </p>
                  <p className="text-[10px] text-[#6F6861] mt-0.5">
                    คลิกเพื่อเลือกประเภทวัสดุที่ต้องการ
                  </p>
                </div>

                {materialOptions.length > 0 ? (
                  materialOptions.map((opt) => {
                    const isSelected = selectedMaterials.includes(opt.value)
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => toggleMaterial(opt.value)}
                        className={`group flex min-h-11 w-full items-center justify-between px-3 py-1.5 rounded-xl text-left transition-all cursor-pointer ${
                          isSelected ? "bg-[#84492C]/10 font-bold text-[#84492C]" : "text-[#504A44] hover:bg-black/[0.02]"
                        }`}
                      >
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs uppercase tracking-wider">{opt.label}</span>
                          {opt.thaiLabel && (
                            <span className="text-[10.5px] text-[#8C8A86]">{opt.thaiLabel}</span>
                          )}
                        </div>
                        <span className="shrink-0 font-mono text-[10px] text-[#8C8A86] bg-black/5 px-2 py-0.5 rounded-full ml-2">
                          {opt.count}
                        </span>
                      </button>
                    )
                  })
                ) : (
                  <p className="py-8 text-center text-xs text-[#8C8A86]">ไม่มีข้อมูลวัสดุสำหรับสินค้านี้</p>
                )}
              </div>
            )}

            {currentPanel === 'size' && (
              <div className="space-y-5">
                <div className="pb-2 border-b border-[#C4B5A5]/25">
                  <p className="text-[11px] font-bold text-[#84492C] uppercase tracking-wider">
                    กำหนดขนาดสินค้า (ซม.)
                  </p>
                  <p className="text-[10px] text-[#6F6861] mt-0.5">
                    ระบุขนาด ความสูง ความกว้าง หรือความลึก
                  </p>
                </div>

                {/* Height */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[#3A3835] uppercase tracking-wider flex justify-between">
                    <span>Height (ความสูง)</span>
                    <span className="text-[#8C8A86] font-mono text-[10px]">CM</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      placeholder="Min (ต่ำสุด)"
                      value={localDimensions.minHeight || ""}
                      onChange={(e) => setLocalDimensions(prev => ({ ...prev, minHeight: e.target.value }))}
                      className="w-full text-xs p-2.5 rounded-xl border border-[#C4B5A5]/60 bg-white outline-none focus:border-[#84492C]"
                    />
                    <input
                      type="number"
                      placeholder="Max (สูงสุด)"
                      value={localDimensions.maxHeight || ""}
                      onChange={(e) => setLocalDimensions(prev => ({ ...prev, maxHeight: e.target.value }))}
                      className="w-full text-xs p-2.5 rounded-xl border border-[#C4B5A5]/60 bg-white outline-none focus:border-[#84492C]"
                    />
                  </div>
                </div>

                {/* Width */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[#3A3835] uppercase tracking-wider flex justify-between">
                    <span>Width (ความกว้าง)</span>
                    <span className="text-[#8C8A86] font-mono text-[10px]">CM</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      placeholder="Min (ต่ำสุด)"
                      value={localDimensions.minWidth || ""}
                      onChange={(e) => setLocalDimensions(prev => ({ ...prev, minWidth: e.target.value }))}
                      className="w-full text-xs p-2.5 rounded-xl border border-[#C4B5A5]/60 bg-white outline-none focus:border-[#84492C]"
                    />
                    <input
                      type="number"
                      placeholder="Max (สูงสุด)"
                      value={localDimensions.maxWidth || ""}
                      onChange={(e) => setLocalDimensions(prev => ({ ...prev, maxWidth: e.target.value }))}
                      className="w-full text-xs p-2.5 rounded-xl border border-[#C4B5A5]/60 bg-white outline-none focus:border-[#84492C]"
                    />
                  </div>
                </div>

                {/* Depth */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[#3A3835] uppercase tracking-wider flex justify-between">
                    <span>Depth (ความลึก)</span>
                    <span className="text-[#8C8A86] font-mono text-[10px]">CM</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      placeholder="Min (ต่ำสุด)"
                      value={localDimensions.minDepth || ""}
                      onChange={(e) => setLocalDimensions(prev => ({ ...prev, minDepth: e.target.value }))}
                      className="w-full text-xs p-2.5 rounded-xl border border-[#C4B5A5]/60 bg-white outline-none focus:border-[#84492C]"
                    />
                    <input
                      type="number"
                      placeholder="Max (สูงสุด)"
                      value={localDimensions.maxDepth || ""}
                      onChange={(e) => setLocalDimensions(prev => ({ ...prev, maxDepth: e.target.value }))}
                      className="w-full text-xs p-2.5 rounded-xl border border-[#C4B5A5]/60 bg-white outline-none focus:border-[#84492C]"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-3">
                  <button
                    type="button"
                    onClick={clearDimensions}
                    className="flex-1 py-2.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    ล้างขนาด
                  </button>
                  <button
                    type="button"
                    onClick={applyDimensions}
                    className="flex-1 py-2.5 text-xs font-bold text-white bg-[#84492C] hover:bg-[#6f3a21] rounded-xl transition-colors shadow-xs cursor-pointer"
                  >
                    ใช้ตัวกรองขนาด
                  </button>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
