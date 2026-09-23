"use client"

import React, { useState, useRef, useEffect, useCallback } from "react"
import { createPortal } from "react-dom"
import { MapPin, ChevronDown, X, Check } from "lucide-react"

export interface PosBranchOption {
  id: string | number
  branch_name: string
  branch_code?: string
}

interface StorefrontFilterBarProps {
  onOpenFilter: () => void
  onOpenColor: () => void
  onOpenMaterial: () => void
  onOpenSize: () => void
  onClearFilters: () => void
  hasActiveFilters: boolean
  isFilterOpen?: boolean
  selectedCategory?: string
  selectedColorsCount?: number
  selectedMaterialsCount?: number
  hasActiveDimensions?: boolean
  branches?: PosBranchOption[]
  selectedLocation: number | 'ALL'
  onSelectLocation: (loc: number | 'ALL') => void
  className?: string
}

export default function StorefrontFilterBar({
  onOpenFilter,
  onOpenColor,
  onOpenMaterial,
  onOpenSize,
  onClearFilters,
  hasActiveFilters,
  isFilterOpen = false,
  selectedCategory = 'All',
  selectedColorsCount = 0,
  selectedMaterialsCount = 0,
  hasActiveDimensions = false,
  branches = [],
  selectedLocation,
  onSelectLocation,
  className = "",
}: StorefrontFilterBarProps) {
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [coords, setCoords] = useState<{ top: number; right: number } | null>(null)

  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640)
    }
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  const updateCoords = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      const right = Math.max(16, window.innerWidth - rect.right)
      const top = rect.bottom + 8
      setCoords({ top, right })
    }
  }, [])

  useEffect(() => {
    if (!isBranchDropdownOpen) return

    updateCoords()

    const handleScrollOrResize = () => {
      updateCoords()
    }

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node
      if (
        buttonRef.current && !buttonRef.current.contains(target) &&
        menuRef.current && !menuRef.current.contains(target)
      ) {
        setIsBranchDropdownOpen(false)
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsBranchDropdownOpen(false)
      }
    }

    window.addEventListener("scroll", handleScrollOrResize, true)
    window.addEventListener("resize", handleScrollOrResize)
    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("touchstart", handleClickOutside)
    document.addEventListener("keydown", handleKeyDown)

    return () => {
      window.removeEventListener("scroll", handleScrollOrResize, true)
      window.removeEventListener("resize", handleScrollOrResize)
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("touchstart", handleClickOutside)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [isBranchDropdownOpen, updateCoords])

  // ล็อกการ scroll body เมื่อเปิด bottom sheet บนมือถือ
  useEffect(() => {
    if (isBranchDropdownOpen && isMobile) {
      const prev = document.body.style.overflow
      document.body.style.overflow = "hidden"
      return () => {
        document.body.style.overflow = prev
      }
    }
  }, [isBranchDropdownOpen, isMobile])

  const selectedBranch = branches.find(b => b.id.toString() === selectedLocation.toString())
  const selectedBranchName = selectedLocation === 'ALL' ? 'ALL STOCKS' : (selectedBranch?.branch_name || 'สาขา')

  const hasCategoryFilter = selectedCategory !== 'All' && selectedCategory !== 'ALL'

  return (
    <div
      className={`flex items-center justify-between sm:justify-start gap-2.5 sm:gap-5 w-full sm:w-auto sm:overflow-visible py-1 px-1 sm:px-2 select-none ${className}`}
    >
      {/* Scrollable Filter Buttons */}
      <div className="flex items-center gap-2.5 sm:gap-4 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden shrink">
        {/* 1. FILTER BUTTON */}
        <button
          type="button"
          onClick={onOpenFilter}
          aria-label="Open storefront filter"
          className={`flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-1 text-[10px] font-semibold uppercase tracking-[0.22em] transition-colors duration-300 hover:border-[#84492C]/40 hover:text-[#84492C] touch-manipulation cursor-pointer ${
            isFilterOpen || hasCategoryFilter
              ? 'border-[#84492C] text-[#84492C]'
              : 'border-transparent text-[#6F6861]'
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-[14px] h-[14px]"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75"
            />
          </svg>
          <span>FILTER</span>
          {hasCategoryFilter && (
            <span className="h-1.5 w-1.5 rounded-full bg-[#84492C]" />
          )}
        </button>

        {/* 2. CLEAR BUTTON */}
        <button
          type="button"
          onClick={onClearFilters}
          disabled={!hasActiveFilters}
          aria-label="Clear storefront filters"
          className={`flex h-9 shrink-0 items-center justify-center border-b-2 border-transparent px-1 text-[10px] font-semibold uppercase tracking-[0.18em] transition-colors duration-300 touch-manipulation select-none ${
            hasActiveFilters
              ? 'text-[#B5473C] hover:border-[#B5473C]/50 hover:text-[#8F2F29] cursor-pointer font-bold'
              : 'cursor-not-allowed text-[#B7B0A8]/70 pointer-events-none'
          }`}
        >
          CLEAR
        </button>

        {/* 3. COLOR BUTTON */}
        <button
          type="button"
          onClick={onOpenColor}
          aria-label="Open color filter"
          className={`flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-1 text-[10px] font-semibold uppercase tracking-[0.18em] transition-colors duration-300 hover:border-[#84492C]/40 hover:text-[#84492C] touch-manipulation cursor-pointer ${
            selectedColorsCount > 0
              ? 'border-[#84492C] text-[#84492C]'
              : 'border-transparent text-[#6F6861]'
          }`}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.35"
            className="h-[16px] w-[16px]"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 3.5c-4.7 0-8.5 3.3-8.5 7.5 0 3.9 3 6.5 6.4 6.5h1.2c.8 0 1.4.6 1.4 1.4 0 .6.5 1.1 1.1 1.1h.7c3.8 0 6.7-3 6.7-6.8 0-5.4-4-9.7-9-9.7Z"
            />
            <circle cx="8" cy="9" r="1.15" fill="#C26E4B" stroke="none" />
            <circle cx="12" cy="6.8" r="1.15" fill="#8EA6B8" stroke="none" />
            <circle cx="16.2" cy="8.2" r="1.15" fill="#B99A65" stroke="none" />
            <circle cx="17" cy="12.2" r="1.15" fill="#7F8F6C" stroke="none" />
          </svg>
          <span>COLOR</span>
          {selectedColorsCount > 0 && (
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-[#84492C]" />
              <span className="text-[9px] font-bold text-[#84492C]">({selectedColorsCount})</span>
            </span>
          )}
        </button>

        {/* 4. MATERIAL BUTTON */}
        <button
          type="button"
          onClick={onOpenMaterial}
          aria-label="Open material filter"
          className={`flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-1 text-[10px] font-semibold uppercase tracking-[0.18em] transition-colors duration-300 hover:border-[#84492C]/40 hover:text-[#84492C] touch-manipulation cursor-pointer ${
            selectedMaterialsCount > 0
              ? 'border-[#84492C] text-[#84492C]'
              : 'border-transparent text-[#6F6861]'
          }`}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.35"
            className="h-[16px] w-[16px]"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9"
            />
          </svg>
          <span>MATERIAL</span>
          {selectedMaterialsCount > 0 && (
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-[#84492C]" />
              <span className="text-[9px] font-bold text-[#84492C]">({selectedMaterialsCount})</span>
            </span>
          )}
        </button>

        {/* 5. SIZE BUTTON */}
        <button
          type="button"
          onClick={onOpenSize}
          aria-label="Open size filter"
          className={`flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-1 text-[10px] font-semibold uppercase tracking-[0.18em] transition-colors duration-300 hover:border-[#84492C]/40 hover:text-[#84492C] touch-manipulation cursor-pointer ${
            hasActiveDimensions
              ? 'border-[#84492C] text-[#84492C]'
              : 'border-transparent text-[#6F6861]'
          }`}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.35"
            className="h-[15px] w-[15px]"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"
            />
          </svg>
          <span>SIZE</span>
          {hasActiveDimensions && (
            <span className="h-1.5 w-1.5 rounded-full bg-[#84492C]" />
          )}
        </button>
      </div>

      {/* 6. ALL / BRANCH SELECTOR (Location Pin) - Pinned on right on mobile, accessible immediately */}
      <div className="shrink-0 flex items-center pl-2 sm:pl-0 border-l border-slate-200 sm:border-l-0">
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setIsBranchDropdownOpen(!isBranchDropdownOpen)}
          aria-haspopup="listbox"
          aria-expanded={isBranchDropdownOpen}
          aria-label={`Current location: ${selectedBranchName}. Click to change branch.`}
          className={`flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-2 sm:px-2.5 rounded-t-sm text-[10px] font-semibold tracking-[0.18em] sm:tracking-[0.22em] uppercase transition-all duration-200 touch-manipulation cursor-pointer hover:bg-amber-50/50 ${
            selectedLocation !== 'ALL'
              ? 'border-[#84492C] text-[#84492C]'
              : 'border-transparent text-[#6F6861] hover:text-[#84492C]'
          } ${isBranchDropdownOpen ? 'bg-amber-50/80 text-[#84492C]' : ''}`}
        >
          <MapPin className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 transition-colors ${selectedLocation !== 'ALL' || isBranchDropdownOpen ? 'text-[#84492C]' : 'text-[#8C8A86]'}`} />
          <span className="truncate max-w-[110px] sm:max-w-[170px]">{selectedBranchName}</span>
          <ChevronDown className={`w-3 h-3 shrink-0 opacity-60 transition-transform duration-200 ${isBranchDropdownOpen ? 'rotate-180 text-[#84492C]' : ''}`} />
        </button>
      </div>

      {/* 🌟 Dropdown Menu / Bottom Sheet เรนเดอร์ผ่าน Portal หมดปัญหาโดนตัดขอบจาก parent */}
      {mounted && isBranchDropdownOpen && createPortal(
        isMobile ? (
          /* 📱 Mobile Bottom Sheet */
          <div className="fixed inset-0 z-[99998] flex flex-col justify-end">
            <div
              className="fixed inset-0 bg-black/45 backdrop-blur-[2px] transition-opacity"
              onClick={() => setIsBranchDropdownOpen(false)}
              aria-hidden="true"
            />
            <div
              ref={menuRef}
              role="dialog"
              aria-modal="true"
              aria-label="Select Location"
              className="relative z-[99999] bg-[#FDFCFB] rounded-t-2xl border-t border-[#E5E5E5] shadow-2xl pb-8 max-h-[85vh] flex flex-col transition-all duration-200"
            >
              <div className="pt-3 pb-2 flex justify-center">
                <div className="w-10 h-1 bg-[#D5D2CA] rounded-full" />
              </div>
              <div className="flex items-center justify-between px-6 pb-3 border-b border-[#F0EFEB]">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#C8A97E]" />
                  <span className="text-[11px] uppercase tracking-[0.25em] text-[#C8A97E] font-medium">
                    Select Location / สาขา
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsBranchDropdownOpen(false)}
                  className="p-1.5 -mr-1.5 text-[#8C8A86] hover:text-[#3A3835] active:scale-95 transition-transform"
                  aria-label="Close branch selector"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto overscroll-contain py-2 divide-y divide-[#F0EFEB]/80">
                <button
                  type="button"
                  onClick={() => {
                    onSelectLocation('ALL')
                    setIsBranchDropdownOpen(false)
                  }}
                  className={`w-full text-left px-6 py-3.5 text-[12px] uppercase tracking-[0.16em] transition-colors flex items-center justify-between active:bg-[#F4F1EA] cursor-pointer ${
                    selectedLocation === 'ALL'
                      ? 'text-[#C8A97E] font-semibold bg-[#F9F8F6]'
                      : 'text-[#5C5854] hover:bg-[#F9F8F6] hover:text-[#3A3835]'
                  }`}
                >
                  <span>ALL STOCKS (ทุกสาขา)</span>
                  {selectedLocation === 'ALL' ? (
                    <div className="flex items-center gap-1.5 text-[#C8A97E] shrink-0">
                      <span className="text-[9px] tracking-widest font-medium">SELECTED</span>
                      <Check className="w-4 h-4" />
                    </div>
                  ) : (
                    <div className="w-2 h-2 rounded-full border border-[#D5D2CA] shrink-0" />
                  )}
                </button>
                {branches.map((b) => {
                  const isActive = selectedLocation.toString() === b.id.toString()
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => {
                        onSelectLocation(Number(b.id))
                        setIsBranchDropdownOpen(false)
                      }}
                      className={`w-full text-left px-6 py-3.5 text-[12px] uppercase tracking-[0.16em] transition-colors flex items-center justify-between active:bg-[#F4F1EA] cursor-pointer ${
                        isActive
                          ? 'text-[#C8A97E] font-semibold bg-[#F9F8F6]'
                          : 'text-[#5C5854] hover:bg-[#F9F8F6] hover:text-[#3A3835]'
                      }`}
                    >
                      <span className="truncate pr-3">{b.branch_name}</span>
                      {isActive ? (
                        <div className="flex items-center gap-1.5 text-[#C8A97E] shrink-0">
                          <span className="text-[9px] tracking-widest font-medium">SELECTED</span>
                          <Check className="w-4 h-4" />
                        </div>
                      ) : (
                        <div className="w-2 h-2 rounded-full border border-[#D5D2CA] shrink-0" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        ) : (
          /* 💻 Desktop Floating Dropdown Menu */
          <div
            ref={menuRef}
            role="listbox"
            aria-label="Select Location"
            style={{
              position: "fixed",
              top: `${coords?.top ?? 0}px`,
              right: `${coords?.right ?? 16}px`,
              zIndex: 99999,
            }}
            className="w-[280px] bg-[#FDFCFB] border border-[#E5E5E5] shadow-[0_12px_40px_-10px_rgba(0,0,0,0.14)] rounded-xl origin-top-right transition-all duration-200"
          >
            <div className="px-5 py-3 text-[10px] uppercase tracking-[0.25em] text-[#C8A97E] font-medium border-b border-[#F0EFEB] flex items-center justify-between">
              <span>Select Location</span>
              <span className="text-[9px] text-[#A8A29E] font-normal lowercase tracking-normal">
                ({branches.length + 1} options)
              </span>
            </div>
            <div className="flex flex-col py-1.5 max-h-[360px] overflow-y-auto overscroll-contain [scrollbar-width:thin] [scrollbar-color:#D5D2CA_transparent]">
              <button
                type="button"
                onClick={() => {
                  onSelectLocation('ALL')
                  setIsBranchDropdownOpen(false)
                }}
                className={`w-full text-left px-5 py-2.5 text-[11px] uppercase tracking-[0.18em] transition-colors flex items-center justify-between cursor-pointer group ${
                  selectedLocation === 'ALL'
                    ? 'text-[#C8A97E] font-medium bg-[#F9F8F6]'
                    : 'text-[#78716C] hover:bg-[#F9F8F6] hover:text-[#292524]'
                }`}
              >
                <span>ALL STOCKS</span>
                {selectedLocation === 'ALL' && (
                  <div className="w-1.5 h-1.5 rounded-full bg-[#C8A97E] shrink-0" />
                )}
              </button>
              {branches.map((b) => {
                const isActive = selectedLocation.toString() === b.id.toString()
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => {
                      onSelectLocation(Number(b.id))
                      setIsBranchDropdownOpen(false)
                    }}
                    className={`w-full text-left px-5 py-2.5 text-[11px] uppercase tracking-[0.18em] transition-colors flex items-center justify-between cursor-pointer group ${
                      isActive
                        ? 'text-[#C8A97E] font-medium bg-[#F9F8F6]'
                        : 'text-[#78716C] hover:bg-[#F9F8F6] hover:text-[#292524]'
                    }`}
                  >
                    <span className="truncate pr-2">{b.branch_name}</span>
                    {isActive && (
                      <div className="w-1.5 h-1.5 rounded-full bg-[#C8A97E] shrink-0" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        ),
        document.body
      )}
    </div>
  )
}
