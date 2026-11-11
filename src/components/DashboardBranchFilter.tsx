"use client"

import { useEffect, useMemo, useRef, useState, useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Building2, ChevronDown, Search, X } from "lucide-react"
import { formatDashboardBranchParam } from "@/lib/dashboardBranch"

export interface BranchOption {
  id: number
  name: string
}

interface DashboardBranchFilterProps {
  branches: BranchOption[]
  selectedBranchIds: number[]
}

export default function DashboardBranchFilter({
  branches,
  selectedBranchIds,
}: DashboardBranchFilterProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const popoverRef = useRef<HTMLDivElement>(null)
  const selectAllCheckboxRef = useRef<HTMLInputElement>(null)

  const availableIds = useMemo(() => branches.map((b) => b.id), [branches])
  const availableSet = useMemo(() => new Set(availableIds), [availableIds])

  const validSelectedIds = useMemo(
    () => selectedBranchIds.filter((id) => availableSet.has(id)),
    [selectedBranchIds, availableSet]
  )

  const isAllActive =
    validSelectedIds.length === 0 ||
    (branches.length > 0 && validSelectedIds.length >= branches.length)

  // เข้ามาครั้งแรก (โหมดทุกสาขา) ให้ติ๊กเลือกทุกสาขาไว้เป็นค่าเริ่มต้น
  const checkedSelectedIds = useMemo(
    () => (isAllActive ? availableIds : validSelectedIds),
    [isAllActive, availableIds, validSelectedIds]
  )

  const [draftIds, setDraftIds] = useState<number[]>(checkedSelectedIds)

  useEffect(() => {
    setDraftIds(checkedSelectedIds)
  }, [checkedSelectedIds])

  const isAllDraftSelected =
    branches.length > 0 && draftIds.length >= branches.length
  const isSomeDraftSelected =
    draftIds.length > 0 && draftIds.length < branches.length

  useEffect(() => {
    if (selectAllCheckboxRef.current) {
      selectAllCheckboxRef.current.indeterminate = isSomeDraftSelected
    }
  }, [isOpen, isSomeDraftSelected])

  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setDraftIds(checkedSelectedIds)
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false)
        setDraftIds(checkedSelectedIds)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen, checkedSelectedIds])

  const selectedBranches = useMemo(() => {
    const selectedSet = new Set(validSelectedIds)
    return branches.filter((b) => selectedSet.has(b.id))
  }, [branches, validSelectedIds])

  const filteredBranches = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return branches
    return branches.filter((b) => b.name.toLowerCase().includes(q))
  }, [branches, searchQuery])

  const draftSet = useMemo(() => new Set(draftIds), [draftIds])

  const triggerLabel = useMemo(() => {
    if (isAllActive) {
      return branches.length > 0 ? `ทุกสาขา (${branches.length})` : "ทุกสาขา"
    }
    if (selectedBranches.length === 1) {
      return selectedBranches[0].name
    }
    if (selectedBranches.length === 2) {
      return `${selectedBranches[0].name}, ${selectedBranches[1].name}`
    }
    return `เลือกแล้ว ${selectedBranches.length} สาขา`
  }, [isAllActive, branches.length, selectedBranches])

  const toggleOpen = () => {
    if (isOpen) {
      setIsOpen(false)
      setDraftIds(checkedSelectedIds)
    } else {
      setDraftIds(checkedSelectedIds)
      setSearchQuery("")
      setIsOpen(true)
    }
  }

  const toggleBranch = (branchId: number) => {
    setDraftIds((prev) =>
      prev.includes(branchId) ? prev.filter((id) => id !== branchId) : [...prev, branchId]
    )
  }

  const toggleAllBranches = () => {
    if (isAllDraftSelected) {
      setDraftIds([])
    } else {
      setDraftIds(availableIds)
    }
  }

  const selectFiltered = () => {
    const targetIds = filteredBranches.map((b) => b.id)
    setDraftIds((prev) => {
      const merged = new Set(prev)
      for (const id of targetIds) merged.add(id)
      return Array.from(merged)
    })
  }

  const applyBranchIds = (nextIds: number[]) => {
    if (nextIds.length === 0) return
    const nextParam = formatDashboardBranchParam(nextIds, availableIds)
    const currentParam = formatDashboardBranchParam(checkedSelectedIds, availableIds)
    setIsOpen(false)
    if (nextParam === currentParam) return

    const params = new URLSearchParams(searchParams.toString())
    if (nextParam === "ALL") {
      params.delete("branch")
    } else {
      params.set("branch", nextParam)
    }
    const qs = params.toString()
    startTransition(() => {
      router.push(qs ? `${pathname}?${qs}` : pathname)
    })
  }

  return (
    <div className="relative inline-block" ref={popoverRef}>
      <button
        type="button"
        onClick={toggleOpen}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label="เลือกสาขา"
        disabled={isPending}
        className={`flex items-center gap-2 min-w-60 max-w-full sm:max-w-xs rounded-xl border px-4 py-2.5 text-sm font-bold outline-none shadow-sm transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-wait ${
          isAllActive
            ? "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300"
            : "border-blue-300 bg-blue-50/70 text-blue-800 hover:border-blue-400"
        }`}
      >
        <Building2
          className={`w-4 h-4 shrink-0 ${isAllActive ? "text-slate-500" : "text-blue-600"}`}
        />
        <span className="truncate">{triggerLabel}</span>
        {!isAllActive && selectedBranches.length > 1 && (
          <span className="shrink-0 rounded-full bg-blue-600 px-2 py-0.5 text-[11px] font-black text-white">
            {selectedBranches.length}
          </span>
        )}
        <ChevronDown
          className={`w-4 h-4 shrink-0 ml-auto transition-transform duration-200 ${
            isAllActive ? "text-slate-400" : "text-blue-500"
          } ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="ตัวกรองเลือกสาขา"
          className="absolute left-0 sm:left-auto sm:right-0 top-full mt-2 z-50 w-80 sm:w-96 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl"
        >
          <div className="mb-3">
            <p className="text-sm font-black text-slate-800">เลือกสาขาที่ต้องการดู</p>
            <p className="text-[11px] text-slate-400">
              ติ๊กเลือกสาขาที่ต้องการ (หรือกดล้างเพื่อเลือกเฉพาะสาขา) แล้วกดตกลง
            </p>
          </div>

          {branches.length > 5 && (
            <div className="relative mb-3">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาชื่อสาขา..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-8 pr-8 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500 focus:bg-white"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  aria-label="ล้างคำค้นหา"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {/* Checkbox หลัก: เลือกทั้งหมด */}
          <label
            className={`mb-2.5 flex w-full items-center gap-2.5 rounded-xl border px-3 py-2 text-xs font-bold transition-colors cursor-pointer select-none ${
              isAllDraftSelected
                ? "border-blue-200 bg-blue-50 text-blue-800"
                : "border-slate-200 bg-slate-50/70 text-slate-700 hover:bg-slate-100"
            }`}
          >
            <input
              ref={selectAllCheckboxRef}
              type="checkbox"
              checked={isAllDraftSelected}
              onChange={toggleAllBranches}
              className="h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600 accent-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <span>เลือกทั้งหมด (ทุกสาขา)</span>
            <span className="ml-auto text-[11px] font-bold text-slate-500">
              {draftIds.length}/{branches.length}
            </span>
          </label>

          {/* แถบสถานะและปุ่มช่วยเลือก */}
          <div className="mb-2 flex items-center justify-between text-[11px]">
            <span className={`font-bold ${draftIds.length === 0 ? "text-rose-600" : "text-slate-500"}`}>
              {draftIds.length === 0
                ? "กรุณาเลือกอย่างน้อย 1 สาขา"
                : `เลือกอยู่ ${draftIds.length} จาก ${branches.length} สาขา`}
            </span>
            <div className="flex items-center gap-2">
              {searchQuery.trim() && filteredBranches.length > 0 && (
                <button
                  type="button"
                  onClick={selectFiltered}
                  className="font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
                >
                  เลือกที่ค้นหา ({filteredBranches.length})
                </button>
              )}
              {draftIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setDraftIds([])}
                  className="font-bold text-slate-400 hover:text-rose-600 cursor-pointer"
                >
                  ล้างทั้งหมด
                </button>
              )}
            </div>
          </div>

          {/* รายการเช็กบ็อกซ์สาขา */}
          <div className="max-h-64 space-y-1 overflow-y-auto pr-1">
            {filteredBranches.map((branch) => {
              const checked = draftSet.has(branch.id)
              return (
                <label
                  key={branch.id}
                  className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-colors cursor-pointer select-none ${
                    checked
                      ? "bg-blue-50/80 text-blue-900 font-bold"
                      : "text-slate-700 font-medium hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleBranch(branch.id)}
                    className="h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600 accent-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="truncate">{branch.name}</span>
                </label>
              )
            })}
            {filteredBranches.length === 0 && (
              <p className="py-6 text-center text-xs text-slate-400">
                ไม่พบสาขาที่ค้นหา &ldquo;{searchQuery}&rdquo;
              </p>
            )}
          </div>

          {/* ปุ่มด้านล่าง: ดูทุกสาขา / ยกเลิก / ตกลง */}
          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={() => applyBranchIds(availableIds)}
              className="text-xs font-semibold text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
            >
              ดูทุกสาขา
            </button>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false)
                  setDraftIds(checkedSelectedIds)
                }}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={draftIds.length === 0}
                onClick={() => applyBranchIds(draftIds)}
                className="rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition-colors hover:bg-blue-700 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isAllDraftSelected
                  ? "ตกลง (ทุกสาขา)"
                  : draftIds.length === 0
                  ? "ตกลง"
                  : `ตกลง (${draftIds.length} สาขา)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
