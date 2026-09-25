"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

export default function DraggableScrollContainer({
  children,
  className = "",
  helperText = "🖱️ คลิกลากเมาส์ หรือหมุนลูกกลิ้งเพื่อเลื่อนซ้าย-ขวา",
}: {
  children: ReactNode
  className?: string
  helperText?: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const isDraggingRef = useRef(false)
  const hasDraggedRef = useRef(false)
  const startXRef = useRef(0)
  const scrollLeftStartRef = useRef(0)
  const [isDragging, setIsDragging] = useState(false)
  const [wheelMode, setWheelMode] = useState<"horizontal" | "vertical">("horizontal")
  const wheelModeRef = useRef<"horizontal" | "vertical">(wheelMode)

  useEffect(() => {
    wheelModeRef.current = wheelMode
  }, [wheelMode])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleNativeWheel = (e: WheelEvent) => {
      if (wheelModeRef.current === "vertical") return

      // If native trackpad provides horizontal delta, let browser handle it
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return

      const isAtStart = container.scrollLeft <= 0
      const isAtEnd = Math.ceil(container.scrollLeft + container.clientWidth) >= container.scrollWidth - 1

      if ((e.deltaY > 0 && !isAtEnd) || (e.deltaY < 0 && !isAtStart)) {
        e.preventDefault()
        container.scrollLeft += e.deltaY
      }
    }

    container.addEventListener("wheel", handleNativeWheel, { passive: false })
    return () => {
      container.removeEventListener("wheel", handleNativeWheel)
    }
  }, [])

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
      }, 60)
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
    }
  }, [])

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    const target = e.target as HTMLElement
    // Ignore interactive form controls
    if (target.closest("button, select, input, textarea")) return

    const container = containerRef.current
    if (!container) return

    isDraggingRef.current = true
    hasDraggedRef.current = false
    setIsDragging(true)
    startXRef.current = e.pageX
    scrollLeftStartRef.current = container.scrollLeft
    document.body.style.userSelect = "none"
  }

  const scrollLeft = () => {
    containerRef.current?.scrollBy({ left: -450, behavior: "smooth" })
  }

  const scrollRight = () => {
    containerRef.current?.scrollBy({ left: 450, behavior: "smooth" })
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
    <div className="space-y-2">
      {/* Control bar above table */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs">
        <span className="text-[11px] font-medium text-slate-500">
          {helperText}
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setWheelMode(wheelMode === "horizontal" ? "vertical" : "horizontal")}
            className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-bold transition-all ${
              wheelMode === "horizontal"
                ? "border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 shadow-xs"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
            title="คลิกเพื่อสลับ: ให้ลูกกลิ้งเมาส์เลื่อนตารางซ้าย-ขวา หรือเลื่อนหน้าเว็บขึ้น-ลง"
          >
            <span>{wheelMode === "horizontal" ? "🖱️ ลูกกลิ้ง: ตาราง ↔" : "🖱️ ลูกกลิ้ง: หน้าเว็บ ↕"}</span>
          </button>
          <div className="flex items-center gap-0.5 rounded-lg border border-slate-200 bg-white p-0.5 shadow-xs">
            <button
              type="button"
              onClick={scrollToStart}
              className="rounded px-2 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 active:scale-95 transition-all"
              title="กระโดดไปซ้ายสุด"
            >
              ⏮ ซ้ายสุด
            </button>
            <button
              type="button"
              onClick={scrollLeft}
              className="inline-flex items-center gap-0.5 rounded px-2 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 active:scale-95 transition-all"
              title="เลื่อนซ้าย"
            >
              <ChevronLeft className="h-3.5 w-3.5 text-blue-600" /> ซ้าย
            </button>
            <button
              type="button"
              onClick={scrollRight}
              className="inline-flex items-center gap-0.5 rounded px-2 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 active:scale-95 transition-all"
              title="เลื่อนขวา"
            >
              ขวา <ChevronRight className="h-3.5 w-3.5 text-blue-600" />
            </button>
            <button
              type="button"
              onClick={scrollToEnd}
              className="rounded px-2 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 active:scale-95 transition-all"
              title="กระโดดไปขวาสุด"
            >
              ขวาสุด ⏭
            </button>
          </div>
        </div>
      </div>

      {/* Draggable table container */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        className={`algorithm-table-scroll rounded-xl border border-slate-200 bg-white shadow-sm ${
          isDragging ? "cursor-grabbing select-none" : "cursor-grab"
        } ${className}`}
      >
        {children}
      </div>
    </div>
  )
}
