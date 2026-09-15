"use client"

import React, { useState, useRef, useEffect } from "react"

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
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsBranchDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const selectedBranch = branches.find(b => b.id.toString() === selectedLocation.toString())
  const selectedBranchName = selectedLocation === 'ALL' ? 'ALL' : (selectedBranch?.branch_name || 'สาขา')

  const hasCategoryFilter = selectedCategory !== 'All' && selectedCategory !== 'ALL'

  return (
    <div
      className={`flex items-center justify-between sm:justify-start gap-3 sm:gap-5 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden py-1 px-2 select-none ${className}`}
    >
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

      {/* 6. ALL / BRANCH SELECTOR (Location Pin) */}
      <div className="relative flex items-center shrink-0" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsBranchDropdownOpen(!isBranchDropdownOpen)}
          aria-label="Select location"
          className={`flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-1 text-[10px] font-semibold tracking-[0.22em] uppercase transition-colors duration-300 hover:border-[#84492C]/40 hover:text-[#84492C] cursor-pointer ${
            selectedLocation !== 'ALL'
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
            className="w-[16px] h-[16px]"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
            />
          </svg>
          <span className="truncate max-w-[140px]">{selectedBranchName}</span>
        </button>

        {/* Dropdown Menu */}
        {isBranchDropdownOpen && (
          <div className="absolute top-full right-0 mt-2 w-[220px] bg-[#FDFCFB] border border-[#E5E5E5] shadow-[0_10px_40px_-10px_rgba(0,0,0,0.12)] rounded-2xl py-2 z-50">
            <div className="px-5 py-2.5 text-[9px] uppercase tracking-[0.25em] text-[#C8A97E] font-bold border-b border-[#F0EFEB]">
              Select Location
            </div>
            <button
              type="button"
              onClick={() => {
                onSelectLocation('ALL')
                setIsBranchDropdownOpen(false)
              }}
              className={`w-full text-left px-5 py-2.5 text-[10px] uppercase tracking-[0.18em] transition-colors flex items-center justify-between cursor-pointer ${
                selectedLocation === 'ALL'
                  ? 'text-[#C8A97E] font-bold bg-[#F9F8F6]'
                  : 'text-[#8C8A86] hover:bg-[#F9F8F6] hover:text-[#3A3835]'
              }`}
            >
              <span>ALL STOCKS</span>
              {selectedLocation === 'ALL' && (
                <div className="w-1.5 h-1.5 rounded-full bg-[#C8A97E]" />
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
                  className={`w-full text-left px-5 py-2.5 text-[10px] uppercase tracking-[0.18em] transition-colors flex items-center justify-between cursor-pointer ${
                    isActive
                      ? 'text-[#C8A97E] font-bold bg-[#F9F8F6]'
                      : 'text-[#8C8A86] hover:bg-[#F9F8F6] hover:text-[#3A3835]'
                  }`}
                >
                  <span className="truncate">{b.branch_name}</span>
                  {isActive && (
                    <div className="w-1.5 h-1.5 rounded-full bg-[#C8A97E]" />
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
