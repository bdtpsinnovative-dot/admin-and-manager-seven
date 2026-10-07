"use client"

import React, { useRef, useState, useEffect } from "react"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, MoveHorizontal } from "lucide-react"

interface DraggableTableWrapperProps {
  children: React.ReactNode
  className?: string
  helperText?: string
  showControls?: boolean
}

export default function DraggableTableWrapper({
  children,
  className = "",
  helperText = "คลิกลากเมาส์ หรือใช้ปุ่มเพื่อเลื่อนดูตารางซ้าย-ขวา",
  showControls = true,
}: DraggableTableWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const isDraggingRef = useRef(false)
  const hasDraggedRef = useRef(false)
  const startXRef = useRef(0)
  const scrollLeftStartRef = useRef(0)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    let rAFId: number | null = null

    const handleWindowMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !containerRef.current) return

      const delta = e.pageX - startXRef.current
      if (Math.abs(delta) > 4) {
        hasDraggedRef.current = true
      }

      if (rAFId !== null) {
        cancelAnimationFrame(rAFId)
      }

      rAFId = requestAnimationFrame(() => {
        if (!containerRef.current) return
        containerRef.current.scrollLeft = scrollLeftStartRef.current - delta
      })
    }

    const handleWindowMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false
        setIsDragging(false)
        document.body.style.userSelect = ""
        document.body.style.cursor = ""
      }
      if (rAFId !== null) {
        cancelAnimationFrame(rAFId)
        rAFId = null
      }
      setTimeout(() => {
        hasDraggedRef.current = false
      }, 80)
    }

    const handleWindowClickCapture = (e: MouseEvent) => {
      if (hasDraggedRef.current) {
        e.preventDefault()
        e.stopPropagation()
      }
    }

    window.addEventListener("mousemove", handleWindowMouseMove)
    window.addEventListener("mouseup", handleWindowMouseUp)
    window.addEventListener("click", handleWindowClickCapture, true)

    return () => {
      window.removeEventListener("mousemove", handleWindowMouseMove)
      window.removeEventListener("mouseup", handleWindowMouseUp)
      window.removeEventListener("click", handleWindowClickCapture, true)
      if (rAFId !== null) {
        cancelAnimationFrame(rAFId)
      }
      document.body.style.userSelect = ""
      document.body.style.cursor = ""
    }
  }, [])

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    const target = e.target as HTMLElement
    // Ignore interactive form controls, buttons, and filter popovers
    if (target.closest("button, select, input, textarea, a, [role='button'], .filter-popover-container")) return

    const container = containerRef.current
    if (!container) return

    isDraggingRef.current = true
    hasDraggedRef.current = false
    setIsDragging(true)
    startXRef.current = e.pageX
    scrollLeftStartRef.current = container.scrollLeft
    document.body.style.userSelect = "none"
    document.body.style.cursor = "grabbing"
  }

  const scrollLeft = () => {
    containerRef.current?.scrollBy({ left: -380, behavior: "smooth" })
  }

  const scrollRight = () => {
    containerRef.current?.scrollBy({ left: 380, behavior: "smooth" })
  }

  const scrollToStart = () => {
    containerRef.current?.scrollTo({ left: 0, behavior: "smooth" })
  }

  const scrollToEnd = () => {
    if (containerRef.current) {
      containerRef.current.scrollTo({ left: containerRef.current.scrollWidth, behavior: "smooth" })
    }
  }

  return (
    <div className="w-full">
      {showControls && (
        <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-slate-500 font-medium select-none">
            <MoveHorizontal className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{helperText}</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={scrollToStart}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 rounded-lg border border-slate-200 shadow-3xs transition-all active:scale-95 cursor-pointer"
              title="ไปซ้ายสุด"
            >
              <ChevronsLeft className="w-3.5 h-3.5" /> ซ้ายสุด
            </button>
            <button
              type="button"
              onClick={scrollLeft}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 rounded-lg border border-slate-200 shadow-3xs transition-all active:scale-95 cursor-pointer"
              title="เลื่อนซ้าย"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> ซ้าย
            </button>
            <button
              type="button"
              onClick={scrollRight}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 rounded-lg border border-slate-200 shadow-3xs transition-all active:scale-95 cursor-pointer"
              title="เลื่อนขวา"
            >
              ขวา <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={scrollToEnd}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 rounded-lg border border-slate-200 shadow-3xs transition-all active:scale-95 cursor-pointer"
              title="ไปขวาสุด"
            >
              ขวาสุด <ChevronsRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        className={`overflow-x-auto ${
          isDragging ? "cursor-grabbing select-none" : "cursor-grab"
        } ${className}`}
      >
        {children}
      </div>
    </div>
  )
}
