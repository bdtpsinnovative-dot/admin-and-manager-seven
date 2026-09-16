"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useState, useRef, useEffect } from "react"
import { ChevronDown, Check, X, Filter, RotateCcw, Search, ArrowUpDown, ArrowLeftRight, Box as BoxIcon, Ruler, FolderOpen, Sparkles } from "lucide-react"
import { PRODUCT_FILTER_ITEMS, CATEGORY_MAP } from "@/lib/propFilterModel"

const STATUS_TYPES = [
  { value: "", label: "ทั้งหมด" },
  { value: "active", label: "Active (เปิดขาย)" },
  { value: "paused", label: "Paused (ปิดการขายชั่วคราว)" },
  { value: "inactive", label: "Inactive (ยกเลิก)" },
  { value: "draft", label: "Draft (ฉบับร่าง)" }
]

interface FilterDropdownProps {
  label: string
  paramKey: string
  activeValue: string
  options: string[]
  iconColor?: string
  onChange: (key: string, value: string) => void
}

function FilterDropdown({
  label,
  paramKey,
  activeValue,
  options,
  onChange
}: FilterDropdownProps) {
  const [open, setOpen] = useState(false)
  const [inputVal, setInputVal] = useState("")
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  // เมื่อเปิด popover ให้เตรียมค่าใน input และ focus
  useEffect(() => {
    if (open) {
      setInputVal(activeValue || "")
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open, activeValue])

  const handleApply = (val: string) => {
    onChange(paramKey, val.trim())
    setOpen(false)
    setInputVal("")
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(paramKey, "")
    setInputVal("")
    setOpen(false)
  }

  const trimmedInput = inputVal.trim()
  const filteredOptions = trimmedInput
    ? options.filter(opt => opt.toLowerCase().includes(trimmedInput.toLowerCase()))
    : options

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all shadow-xs cursor-pointer ${
          activeValue
            ? "border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-100"
            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
        }`}
      >
        <span className="text-slate-400 font-normal">{label}:</span>
        <span className={activeValue ? "font-bold text-blue-700" : "text-slate-700"}>
          {activeValue || "ทั้งหมด"}
        </span>

        {activeValue ? (
          <span
            role="button"
            onClick={handleClear}
            className="p-0.5 -mr-1 rounded-full hover:bg-blue-200/80 text-blue-600 transition"
            title="ล้างตัวกรองนี้"
          >
            <X className="w-3 h-3" />
          </span>
        ) : (
          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
              open ? "rotate-180" : ""
            }`}
          />
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1.5 z-50 bg-white border border-slate-200 rounded-xl shadow-xl w-64 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {/* 💡 ช่องกรอกค้นหา หรือ พิมพ์กรอกเองได้อิสระ */}
          <div className="p-2 border-b border-slate-100 bg-slate-50/80">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                ref={inputRef}
                type="text"
                value={inputVal}
                onChange={e => setInputVal(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    handleApply(inputVal)
                  }
                }}
                placeholder={`พิมพ์ ${label} หรือกรอกเอง...`}
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-400 shadow-2xs"
              />
              {inputVal && (
                <button
                  type="button"
                  onClick={() => setInputVal("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* 💡 ถ้ามีข้อความที่พิมพ์ ให้แสดงปุ่มกดใช้ค่านี้ทันที (กรอกเอง) */}
          {trimmedInput !== "" && (
            <button
              type="button"
              onClick={() => handleApply(trimmedInput)}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border-b border-blue-100 transition text-left cursor-pointer"
            >
              <span className="flex items-center gap-1.5 truncate">
                <Search className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>ใช้ค่า: &quot;{trimmedInput}&quot;</span>
              </span>
              <span className="text-[10px] bg-blue-200 text-blue-800 px-1.5 py-0.5 rounded font-medium shrink-0">
                Enter ↵
              </span>
            </button>
          )}

          {/* รายการตัวเลือกที่แนะนำ */}
          <div className="max-h-60 overflow-y-auto">
            {/* ตัวเลือก: ทั้งหมด */}
            <button
              type="button"
              onClick={() => handleApply("")}
              className={`w-full flex items-center justify-between px-3 py-2 text-xs transition hover:bg-slate-50 cursor-pointer ${
                !activeValue ? "text-blue-600 font-bold bg-blue-50/40" : "text-slate-600"
              }`}
            >
              <span>ทั้งหมด ({label})</span>
              {!activeValue && <Check className="w-3.5 h-3.5 text-blue-500" />}
            </button>

            {filteredOptions.map(opt => {
              const isSelected = activeValue.toLowerCase() === opt.toLowerCase()
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => handleApply(opt)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs transition hover:bg-slate-50 cursor-pointer ${
                    isSelected ? "text-blue-600 font-bold bg-blue-50/40" : "text-slate-700"
                  }`}
                >
                  <span className="truncate pr-2">{opt}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-blue-500 shrink-0" />}
                </button>
              )
            })}

            {filteredOptions.length === 0 && trimmedInput === "" && (
              <div className="px-3 py-3 text-center text-xs text-slate-400">
                ไม่มีตัวเลือกแนะนำ (สามารถพิมพ์กรอกเองได้ด้านบน)
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

interface PropCategoryDropdownProps {
  activeValue: string
  options?: string[]
  onChange: (key: string, value: string) => void
}

function PropCategoryDropdown({
  activeValue,
  options = [],
  onChange
}: PropCategoryDropdownProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    "VASE & VESSELS": true,
    "FIGURE": true,
  })
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  const toggleGroup = (label: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setExpandedGroups(prev => ({ ...prev, [label]: !prev[label] }))
  }

  const handleSelect = (val: string) => {
    onChange("type", val.trim())
    setOpen(false)
    setSearch("")
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange("type", "")
    setOpen(false)
    setSearch("")
  }

  const trimmedSearch = search.trim().toLowerCase()

  // กรองเมนูตามคำค้นหา
  const filteredMenuItems = PRODUCT_FILTER_ITEMS.filter(item => {
    if (item.isSpecial) return false
    if (!trimmedSearch) return true
    if (item.label.toLowerCase().includes(trimmedSearch)) return true
    if (item.displayLabel && item.displayLabel.toLowerCase().includes(trimmedSearch)) return true
    if (item.thaiLabel && item.thaiLabel.toLowerCase().includes(trimmedSearch)) return true
    if (item.items?.some(sub => 
      sub.displayLabel.toLowerCase().includes(trimmedSearch) || 
      (sub.thaiLabel && sub.thaiLabel.toLowerCase().includes(trimmedSearch)) ||
      sub.fullValue.toLowerCase().includes(trimmedSearch)
    )) return true
    return false
  })

  // หากลุ่มสินค้าอื่นๆ จาก database ที่ไม่อยู่ใน PRODUCT_FILTER_ITEMS
  const knownSubstrings = new Set<string>()
  PRODUCT_FILTER_ITEMS.forEach(it => {
    if (it.fullValue) knownSubstrings.add(it.fullValue.toLowerCase())
    it.items?.forEach(s => knownSubstrings.add(s.fullValue.toLowerCase()))
  })
  Object.values(CATEGORY_MAP).forEach(arr => arr.forEach(str => knownSubstrings.add(str.toLowerCase())))

  const otherOptions = options.filter(opt => {
    const l = opt.trim().toLowerCase()
    if (!l) return false
    if (knownSubstrings.has(l)) return false
    if (trimmedSearch && !l.includes(trimmedSearch)) return false
    return true
  })

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all shadow-xs cursor-pointer ${
          activeValue
            ? "border-purple-600 bg-purple-50 text-purple-700 ring-2 ring-purple-100"
            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
        }`}
      >
        <FolderOpen className={`w-3.5 h-3.5 ${activeValue ? "text-purple-600" : "text-slate-400"}`} />
        <span className="text-slate-400 font-normal">หมวดหมู่:</span>
        <span className={activeValue ? "font-bold text-purple-700 max-w-[130px] truncate" : "text-slate-700"}>
          {activeValue || "ทั้งหมด"}
        </span>

        {activeValue ? (
          <span
            role="button"
            onClick={handleClear}
            className="p-0.5 -mr-1 rounded-full hover:bg-purple-200/80 text-purple-600 transition"
            title="ล้างหมวดหมู่นี้"
          >
            <X className="w-3 h-3" />
          </span>
        ) : (
          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
              open ? "rotate-180" : ""
            }`}
          />
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1.5 z-50 bg-white border border-slate-200 rounded-2xl shadow-2xl w-80 sm:w-96 overflow-hidden animate-in fade-in zoom-in-95 duration-100 text-slate-800">
          {/* หัวข้อและช่องค้นหา */}
          <div className="p-3 border-b border-slate-100 bg-slate-50/90">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[11px] font-bold tracking-wider text-purple-900 uppercase flex items-center gap-1.5">
                <FolderOpen className="w-3.5 h-3.5 text-purple-600" />
                <span>หมวดหมู่พร็อพ (PROP CATEGORIES)</span>
              </div>
              {activeValue && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-[10px] text-purple-600 hover:text-purple-800 font-bold hover:underline cursor-pointer"
                >
                  ล้างค่า
                </button>
              )}
            </div>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    if (search.trim()) handleSelect(search.trim())
                  }
                }}
                placeholder="ค้นหาหมวดหมู่ เช่น Vase, Doll, Art..."
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-400 shadow-2xs"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* ถ้าพิมพ์ค้นหา ให้มีปุ่มกด Enter ใช้คำนี้ได้ทันที */}
          {trimmedSearch !== "" && (
            <button
              type="button"
              onClick={() => handleSelect(search.trim())}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border-b border-purple-100 transition text-left cursor-pointer"
            >
              <span className="flex items-center gap-1.5 truncate">
                <Search className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                <span>ค้นหาตามคำ: &quot;{search.trim()}&quot;</span>
              </span>
              <span className="text-[10px] bg-purple-200 text-purple-800 px-1.5 py-0.5 rounded font-medium shrink-0">
                Enter ↵
              </span>
            </button>
          )}

          {/* รายการหมวดหมู่แบบต้นไม้ / อะคอร์เดียน (ตามแบบ POS) */}
          <div className="max-h-[380px] overflow-y-auto p-2 space-y-1 divide-y divide-slate-100 text-xs">
            {/* ปุ่มทั้งหมด (ALL) */}
            <div className="pb-1">
              <button
                type="button"
                onClick={() => handleSelect("")}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  !activeValue
                    ? "bg-purple-600 text-white shadow-xs"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                <span>ทั้งหมด (ALL)</span>
                {!activeValue && <Check className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* หมวดหมู่หลักและย่อย */}
            <div className="pt-1 space-y-1">
              {filteredMenuItems.map((item) => {
                const hasChildren = Boolean(item.items && item.items.length > 0)
                const isExpanded = expandedGroups[item.label] || trimmedSearch !== ""
                const isParentActive = activeValue.toLowerCase() === (item.fullValue || item.label).toLowerCase()
                const isChildActive = item.items?.some(sub => sub.fullValue.toLowerCase() === activeValue.toLowerCase())

                return (
                  <div key={item.label} className="rounded-xl overflow-hidden">
                    <div className={`flex items-center justify-between rounded-xl transition ${
                      isParentActive
                        ? "bg-purple-100 text-purple-900 font-bold"
                        : isChildActive
                        ? "bg-purple-50/70 text-purple-800 font-medium"
                        : "hover:bg-slate-50 text-slate-700"
                    }`}>
                      <button
                        type="button"
                        onClick={() => handleSelect(item.fullValue || item.label)}
                        className="flex-1 flex items-center justify-between px-3 py-2 text-left cursor-pointer truncate"
                      >
                        <div className="truncate">
                          <div className="font-semibold truncate text-[12.5px]">{item.displayLabel || item.label}</div>
                          {item.thaiLabel && (
                            <div className="text-[11px] text-slate-400 font-normal truncate">{item.thaiLabel}</div>
                          )}
                        </div>
                        {isParentActive && <Check className="w-3.5 h-3.5 text-purple-600 shrink-0 ml-1.5" />}
                      </button>

                      {hasChildren && (
                        <button
                          type="button"
                          onClick={(e) => toggleGroup(item.label, e)}
                          className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 rounded-lg transition cursor-pointer shrink-0 mr-1"
                          title={isExpanded ? "ยุบเมนู" : "ขยายเมนูย่อย"}
                        >
                          <span className="text-xs font-bold">{isExpanded ? "−" : "+"}</span>
                        </button>
                      )}
                    </div>

                    {/* เมนูย่อย (Subcategories) */}
                    {hasChildren && isExpanded && (
                      <div className="pl-4 pr-1 py-1 ml-3 border-l-2 border-purple-100 space-y-0.5 mt-0.5">
                        {item.items!.map(sub => {
                          const isSubSelected = activeValue.toLowerCase() === sub.fullValue.toLowerCase()
                          return (
                            <button
                              key={sub.fullValue}
                              type="button"
                              onClick={() => handleSelect(sub.fullValue)}
                              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition cursor-pointer text-xs ${
                                isSubSelected
                                  ? "bg-purple-600 text-white font-bold shadow-2xs"
                                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                              }`}
                            >
                              <div className="truncate">
                                <span className="truncate">{sub.displayLabel}</span>
                                {sub.thaiLabel && (
                                  <span className={`text-[10.5px] ml-1.5 font-normal ${isSubSelected ? "text-purple-100" : "text-slate-400"}`}>
                                    ({sub.thaiLabel})
                                  </span>
                                )}
                              </div>
                              {isSubSelected && <Check className="w-3 h-3 text-white shrink-0 ml-1" />}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}

              {/* หมวดหมู่เพิ่มเติมจากระบบถ้ามี */}
              {otherOptions.length > 0 && (
                <div className="pt-2 mt-2 border-t border-slate-100">
                  <div className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-1">
                    หมวดหมู่อื่นๆ ในระบบ
                  </div>
                  {otherOptions.map(opt => {
                    const isSel = activeValue.toLowerCase() === opt.toLowerCase()
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => handleSelect(opt)}
                        className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-left text-xs transition cursor-pointer ${
                          isSel ? "bg-purple-600 text-white font-bold" : "text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        <span className="truncate">{opt}</span>
                        {isSel && <Check className="w-3 h-3 text-white shrink-0 ml-1" />}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface DimensionFilterProps {
  activeSize: string
  minW?: number
  maxW?: number
  minH?: number
  maxH?: number
  minL?: number
  maxL?: number
  options: string[]
  onApply: (params: {
    size?: string
    min_w?: string
    max_w?: string
    min_h?: string
    max_h?: string
    min_l?: string
    max_l?: string
  }) => void
}

function DimensionFilterDropdown({
  activeSize,
  minW,
  maxW,
  minH,
  maxH,
  minL,
  maxL,
  options,
  onApply
}: DimensionFilterProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const [hMin, setHMin] = useState(minH !== undefined ? String(minH) : "")
  const [hMax, setHMax] = useState(maxH !== undefined ? String(maxH) : "")
  const [wMin, setWMin] = useState(minW !== undefined ? String(minW) : "")
  const [wMax, setWMax] = useState(maxW !== undefined ? String(maxW) : "")
  const [lMin, setLMin] = useState(minL !== undefined ? String(minL) : "")
  const [lMax, setLMax] = useState(maxL !== undefined ? String(maxL) : "")

  useEffect(() => {
    if (open) {
      setHMin(minH !== undefined ? String(minH) : "")
      setHMax(maxH !== undefined ? String(maxH) : "")
      setWMin(minW !== undefined ? String(minW) : "")
      setWMax(maxW !== undefined ? String(maxW) : "")
      setLMin(minL !== undefined ? String(minL) : "")
      setLMax(maxL !== undefined ? String(maxL) : "")
    }
  }, [open, minH, maxH, minW, maxW, minL, maxL])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const hasDimensionFilter =
    minW !== undefined ||
    maxW !== undefined ||
    minH !== undefined ||
    maxH !== undefined ||
    minL !== undefined ||
    maxL !== undefined

  const isActive = Boolean(activeSize || hasDimensionFilter)

  const getBadgeLabel = () => {
    if (activeSize) return `ไซส์ ${activeSize}`
    if (hasDimensionFilter) {
      const parts: string[] = []
      if (minW !== undefined || maxW !== undefined) {
        parts.push(`ก:${minW ?? 0}-${maxW ?? '∞'}`)
      }
      if (minH !== undefined || maxH !== undefined) {
        parts.push(`ส:${minH ?? 0}-${maxH ?? '∞'}`)
      }
      if (minL !== undefined || maxL !== undefined) {
        parts.push(`ย:${minL ?? 0}-${maxL ?? '∞'}`)
      }
      return parts.join(" ") + " ซม."
    }
    return "ทั้งหมด"
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    setHMin("")
    setHMax("")
    setWMin("")
    setWMax("")
    setLMin("")
    setLMax("")
    onApply({
      size: "",
      min_w: "",
      max_w: "",
      min_h: "",
      max_h: "",
      min_l: "",
      max_l: ""
    })
    setOpen(false)
  }

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    onApply({
      size: activeSize,
      min_w: wMin.trim(),
      max_w: wMax.trim(),
      min_h: hMin.trim(),
      max_h: hMax.trim(),
      min_l: lMin.trim(),
      max_l: lMax.trim()
    })
    setOpen(false)
  }

  const handleSelectSize = (sizeVal: string) => {
    onApply({
      size: sizeVal,
      min_w: wMin.trim(),
      max_w: wMax.trim(),
      min_h: hMin.trim(),
      max_h: hMax.trim(),
      min_l: lMin.trim(),
      max_l: lMax.trim()
    })
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all shadow-xs cursor-pointer ${
          isActive
            ? "border-amber-700 bg-amber-50 text-amber-900 ring-2 ring-amber-200"
            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
        }`}
      >
        <Ruler className={`w-3.5 h-3.5 ${isActive ? "text-amber-800" : "text-slate-400"}`} />
        <span className="text-slate-400 font-normal">ขนาด:</span>
        <span className={isActive ? "font-bold text-amber-900" : "text-slate-700"}>
          {getBadgeLabel()}
        </span>

        {isActive ? (
          <span
            role="button"
            onClick={handleClear}
            className="p-0.5 -mr-1 rounded-full hover:bg-amber-200 text-amber-800 transition cursor-pointer"
            title="ล้างตัวกรองขนาด"
          >
            <X className="w-3 h-3" />
          </span>
        ) : (
          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
              open ? "rotate-180" : ""
            }`}
          />
        )}
      </button>

      {open && (
        <div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-2 z-50 bg-[#FBF9F5] border border-[#E7DEC8] rounded-2xl shadow-2xl w-80 p-5 overflow-hidden animate-in fade-in zoom-in-95 duration-100 text-stone-800">
          {/* 🏷️ Quick size options (S, M, L, XL, XXL) */}
          {options.length > 0 && (
            <div className="mb-4 pb-3 border-b border-[#E7DEC8]">
              <div className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider mb-2">
                เลือกไซส์มาตรฐาน
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => handleSelectSize("")}
                  className={`px-2.5 py-1 text-xs rounded-md font-medium border transition cursor-pointer ${
                    !activeSize
                      ? "bg-[#7C4A2D] text-white border-[#7C4A2D] shadow-xs"
                      : "bg-white text-stone-700 border-[#E7DEC8] hover:bg-stone-100"
                  }`}
                >
                  ทั้งหมด
                </button>
                {options.map(sz => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => handleSelectSize(sz)}
                    className={`px-2.5 py-1 text-xs rounded-md font-medium border transition cursor-pointer ${
                      activeSize === sz
                        ? "bg-[#7C4A2D] text-white border-[#7C4A2D] shadow-xs font-bold"
                        : "bg-white text-stone-700 border-[#E7DEC8] hover:bg-stone-100"
                    }`}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 📏 Header: CUSTOM DIMENSIONS (ตรงตามรูป 2) */}
          <div className="mb-4">
            <h4 className="text-xs font-bold tracking-widest text-[#7C4A2D] uppercase flex items-center gap-1.5">
              <Ruler className="w-4 h-4 text-[#7C4A2D]" />
              CUSTOM DIMENSIONS
            </h4>
            <p className="text-[11px] text-stone-500 mt-0.5">
              ระบุขนาดความสูง ความกว้าง หรือความลึก (ซม.) ตามพื้นที่ที่ต้องการ
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* 1. HEIGHT (ความสูง) */}
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-stone-700 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <ArrowUpDown className="w-3.5 h-3.5 text-stone-500" />
                  <span>HEIGHT (ความสูง)</span>
                </span>
                <span className="text-[10px] text-stone-400 font-mono uppercase">CM</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  step="any"
                  value={hMin}
                  onChange={e => setHMin(e.target.value)}
                  placeholder="Min (ต่ำสุด)"
                  className="w-full px-3 py-1.5 text-xs bg-white border border-[#DDD5C5] rounded-xl outline-none focus:border-[#7C4A2D] focus:ring-1 focus:ring-[#7C4A2D] placeholder:text-stone-400"
                />
                <input
                  type="number"
                  step="any"
                  value={hMax}
                  onChange={e => setHMax(e.target.value)}
                  placeholder="Max (สูงสุด)"
                  className="w-full px-3 py-1.5 text-xs bg-white border border-[#DDD5C5] rounded-xl outline-none focus:border-[#7C4A2D] focus:ring-1 focus:ring-[#7C4A2D] placeholder:text-stone-400"
                />
              </div>
            </div>

            {/* 2. WIDTH (ความกว้าง) */}
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-stone-700 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <ArrowLeftRight className="w-3.5 h-3.5 text-stone-500" />
                  <span>WIDTH (ความกว้าง)</span>
                </span>
                <span className="text-[10px] text-stone-400 font-mono uppercase">CM</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  step="any"
                  value={wMin}
                  onChange={e => setWMin(e.target.value)}
                  placeholder="Min (ต่ำสุด)"
                  className="w-full px-3 py-1.5 text-xs bg-white border border-[#DDD5C5] rounded-xl outline-none focus:border-[#7C4A2D] focus:ring-1 focus:ring-[#7C4A2D] placeholder:text-stone-400"
                />
                <input
                  type="number"
                  step="any"
                  value={wMax}
                  onChange={e => setWMax(e.target.value)}
                  placeholder="Max (สูงสุด)"
                  className="w-full px-3 py-1.5 text-xs bg-white border border-[#DDD5C5] rounded-xl outline-none focus:border-[#7C4A2D] focus:ring-1 focus:ring-[#7C4A2D] placeholder:text-stone-400"
                />
              </div>
            </div>

            {/* 3. DEPTH / LENGTH (ความลึก / ความยาว) */}
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-stone-700 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <BoxIcon className="w-3.5 h-3.5 text-stone-500" />
                  <span>DEPTH / LENGTH (ความลึก)</span>
                </span>
                <span className="text-[10px] text-stone-400 font-mono uppercase">CM</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  step="any"
                  value={lMin}
                  onChange={e => setLMin(e.target.value)}
                  placeholder="Min (ต่ำสุด)"
                  className="w-full px-3 py-1.5 text-xs bg-white border border-[#DDD5C5] rounded-xl outline-none focus:border-[#7C4A2D] focus:ring-1 focus:ring-[#7C4A2D] placeholder:text-stone-400"
                />
                <input
                  type="number"
                  step="any"
                  value={lMax}
                  onChange={e => setLMax(e.target.value)}
                  placeholder="Max (สูงสุด)"
                  className="w-full px-3 py-1.5 text-xs bg-white border border-[#DDD5C5] rounded-xl outline-none focus:border-[#7C4A2D] focus:ring-1 focus:ring-[#7C4A2D] placeholder:text-stone-400"
                />
              </div>
            </div>

            {/* ปุ่ม APPLY FILTER */}
            <div className="pt-2 flex flex-col gap-2">
              <button
                type="submit"
                className="w-full py-2.5 bg-[#7C4A2D] hover:bg-[#683D24] active:scale-[0.98] text-white font-bold text-xs uppercase tracking-wider rounded-xl transition shadow-md cursor-pointer"
              >
                APPLY FILTER
              </button>

              {(isActive || hMin || hMax || wMin || wMax || lMin || lMax) && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-[11px] text-stone-500 hover:text-stone-800 transition text-center py-1 cursor-pointer"
                >
                  ล้างค่าขนาดทั้งหมด
                </button>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

interface CategoryFilterBarProps {
  activeTab: string
  activeStatus: string
  activeType: string
  activeMaterial: string
  activeGrade: string
  activeCraft: string
  activeColor: string
  activeBrand: string
  activeSize: string
  minW?: number
  maxW?: number
  minH?: number
  maxH?: number
  minL?: number
  maxL?: number
  options: {
    types: string[]
    materials: string[]
    grades: string[]
    crafts: string[]
    colors: string[]
    brands: string[]
    sizes: string[]
  }
}

export default function CategoryFilterBar({
  activeTab,
  activeStatus,
  activeType,
  activeMaterial,
  activeGrade,
  activeCraft,
  activeColor,
  activeBrand,
  activeSize,
  minW,
  maxW,
  minH,
  maxH,
  minL,
  maxL,
  options
}: CategoryFilterBarProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (!value) {
      params.delete(key)
    } else {
      params.set(key, value)
    }
    router.push(`/inventory?${params.toString()}`)
  }

  const handleDimensionApply = (params: {
    size?: string
    min_w?: string
    max_w?: string
    min_h?: string
    max_h?: string
    min_l?: string
    max_l?: string
  }) => {
    const urlParams = new URLSearchParams(searchParams.toString())

    if (params.size) urlParams.set("size", params.size)
    else urlParams.delete("size")

    if (params.min_w) urlParams.set("min_w", params.min_w)
    else urlParams.delete("min_w")

    if (params.max_w) urlParams.set("max_w", params.max_w)
    else urlParams.delete("max_w")

    if (params.min_h) urlParams.set("min_h", params.min_h)
    else urlParams.delete("min_h")

    if (params.max_h) urlParams.set("max_h", params.max_h)
    else urlParams.delete("max_h")

    if (params.min_l) urlParams.set("min_l", params.min_l)
    else urlParams.delete("min_l")

    if (params.max_l) urlParams.set("max_l", params.max_l)
    else urlParams.delete("max_l")

    router.push(`/inventory?${urlParams.toString()}`)
  }

  const hasDimensions =
    minW !== undefined ||
    maxW !== undefined ||
    minH !== undefined ||
    maxH !== undefined ||
    minL !== undefined ||
    maxL !== undefined

  const currentSearch = searchParams.get("search") || ""

  // นับจำนวนฟิลเตอร์ที่กำลังใช้งานอยู่ (รวมคำค้นหาด้วยถ้ามี)
  const activeFiltersCount = [
    activeStatus,
    activeType,
    activeMaterial,
    activeGrade,
    activeCraft,
    activeColor,
    activeBrand,
    activeSize,
    hasDimensions ? "dimensions" : "",
    currentSearch ? "search" : ""
  ].filter(Boolean).length

  const handleResetAll = () => {
    const params = new URLSearchParams()
    if (activeTab) params.set("tab", activeTab)
    const currentView = searchParams.get("view")
    if (currentView) params.set("view", currentView)
    router.push(`/inventory?${params.toString()}`)
  }

  const isSlab = activeTab === "SLABS"
  const isRough = activeTab === "ROUGH"
  const isProp = activeTab === "PROP"
  const isFurniture = activeTab === "FURNITURE"

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 mb-6 shadow-xs flex flex-wrap items-center justify-between gap-3">
      {/* ฝั่งซ้าย: รวมปุ่มตัวกรองเฉพาะของหมวดหมู่นั้นๆ */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 mr-1">
          <Filter className="w-3.5 h-3.5 text-blue-600" />
          <span>ตัวกรอง:</span>
        </div>

        {/* 🪵 1. ฟิลเตอร์สำหรับ WOOD SLABS */}
        {isSlab && (
          <>
            {options.types.length > 0 && (
              <FilterDropdown
                label="ประเภท"
                paramKey="type"
                activeValue={activeType}
                options={options.types}
                onChange={handleFilterChange}
              />
            )}
            {options.materials.length > 0 && (
              <FilterDropdown
                label="ชนิดไม้"
                paramKey="material"
                activeValue={activeMaterial}
                options={options.materials}
                onChange={handleFilterChange}
              />
            )}
            {options.grades.length > 0 && (
              <FilterDropdown
                label="เกรด"
                paramKey="grade"
                activeValue={activeGrade}
                options={options.grades}
                onChange={handleFilterChange}
              />
            )}
            <DimensionFilterDropdown
              activeSize={activeSize}
              minW={minW}
              maxW={maxW}
              minH={minH}
              maxH={maxH}
              minL={minL}
              maxL={maxL}
              options={options.sizes}
              onApply={handleDimensionApply}
            />
          </>
        )}

        {/* 🔨 2. ฟิลเตอร์สำหรับ ROUGH WOOD */}
        {isRough && (
          <>
            {options.crafts.length > 0 && (
              <FilterDropdown
                label="ลักษณะแผ่น"
                paramKey="craft"
                activeValue={activeCraft}
                options={options.crafts}
                onChange={handleFilterChange}
              />
            )}
            <DimensionFilterDropdown
              activeSize={activeSize}
              minW={minW}
              maxW={maxW}
              minH={minH}
              maxH={maxH}
              minL={minL}
              maxL={maxL}
              options={options.sizes}
              onApply={handleDimensionApply}
            />
          </>
        )}

        {/* 📦 3. ฟิลเตอร์สำหรับ PROPS */}
        {isProp && (
          <>
            <PropCategoryDropdown
              activeValue={activeType}
              options={options.types}
              onChange={handleFilterChange}
            />
            <DimensionFilterDropdown
              activeSize={activeSize}
              minW={minW}
              maxW={maxW}
              minH={minH}
              maxH={maxH}
              minL={minL}
              maxL={maxL}
              options={options.sizes}
              onApply={handleDimensionApply}
            />
            {options.brands.length > 0 && (
              <FilterDropdown
                label="โรงงาน/แบรนด์"
                paramKey="brand"
                activeValue={activeBrand}
                options={options.brands}
                onChange={handleFilterChange}
              />
            )}
            {options.materials.length > 0 && (
              <FilterDropdown
                label="วัสดุ"
                paramKey="material"
                activeValue={activeMaterial}
                options={options.materials}
                onChange={handleFilterChange}
              />
            )}
            {options.colors.length > 0 && (
              <FilterDropdown
                label="สี"
                paramKey="color"
                activeValue={activeColor}
                options={options.colors}
                onChange={handleFilterChange}
              />
            )}
          </>
        )}

        {/* 🛋️ 4. ฟิลเตอร์สำหรับ FURNITURE */}
        {isFurniture && (
          <>
            {options.types.length > 0 && (
              <FilterDropdown
                label="หมวดหมู่"
                paramKey="type"
                activeValue={activeType}
                options={options.types}
                onChange={handleFilterChange}
              />
            )}
            <DimensionFilterDropdown
              activeSize={activeSize}
              minW={minW}
              maxW={maxW}
              minH={minH}
              maxH={maxH}
              minL={minL}
              maxL={maxL}
              options={options.sizes}
              onApply={handleDimensionApply}
            />
            {options.brands.length > 0 && (
              <FilterDropdown
                label="โรงงาน/แบรนด์"
                paramKey="brand"
                activeValue={activeBrand}
                options={options.brands}
                onChange={handleFilterChange}
              />
            )}
            {options.materials.length > 0 && (
              <FilterDropdown
                label="วัสดุ"
                paramKey="material"
                activeValue={activeMaterial}
                options={options.materials}
                onChange={handleFilterChange}
              />
            )}
            {options.colors.length > 0 && (
              <FilterDropdown
                label="สี"
                paramKey="color"
                activeValue={activeColor}
                options={options.colors}
                onChange={handleFilterChange}
              />
            )}
          </>
        )}

        {/* 🔒 ฟิลเตอร์สถานะ (มีทุกหมวดหมู่) */}
        <div className="relative inline-block">
          <select
            value={activeStatus}
            onChange={e => handleFilterChange("status", e.target.value)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all shadow-xs outline-none cursor-pointer ${
              activeStatus
                ? "border-yellow-500 bg-yellow-50/80 text-yellow-800 ring-2 ring-yellow-100 font-bold"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
            }`}
          >
            {STATUS_TYPES.map(s => (
              <option key={s.value} value={s.value}>
                สถานะ: {s.label}
              </option>
            ))}
          </select>
        </div>

        {/* 🧹 ปุ่มล้างฟิลเตอร์ทั้งหมด (แบบปุ่มในกลุ่มฟิลเตอร์) */}
        {activeFiltersCount > 0 && (
          <button
            type="button"
            onClick={handleResetAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95 animate-in fade-in"
            title="ล้างตัวกรองและคำค้นหาทั้งหมดเพื่อแสดงสินค้าทั้งหมด"
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
            <span>ล้างฟิลเตอร์ทั้งหมด ({activeFiltersCount})</span>
          </button>
        )}
      </div>

      {/* ฝั่งขวา: แสดงสถานะการกรอง และปุ่มล้างตัวกรองทั้งหมด */}
      <div className="flex items-center gap-2">
        {activeFiltersCount > 0 ? (
          <>
            <span className="text-xs text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1">
              <Filter className="w-3 h-3 text-blue-500" />
              กำลังกรอง {activeFiltersCount} เงื่อนไข
            </span>
            <button
              type="button"
              onClick={handleResetAll}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs text-white bg-rose-600 hover:bg-rose-700 rounded-lg font-bold transition cursor-pointer shadow-xs active:scale-95"
              title="ล้างตัวกรองทั้งหมดเพื่อแสดงสินค้าทั้งหมด"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>ล้างฟิลเตอร์ทั้งหมด</span>
            </button>
          </>
        ) : (
          <span className="text-xs text-slate-400 font-medium hidden sm:inline">
            แสดงสินค้าทั้งหมด
          </span>
        )}
      </div>
    </div>
  )
}
