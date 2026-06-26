'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'

const SLAB_TYPES = [
  "Wood slabs",
  "Small table",
  "Leg",
  "Chair/Stool",
  "Cabinet",
  "Table",
  "Small Furniture",
]

interface TypeFilterDropdownProps {
  activeType: string
}

export default function TypeFilterDropdown({ activeType }: TypeFilterDropdownProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // ปิด dropdown เมื่อคลิกข้างนอก
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const searchParams = useSearchParams()

  const select = (type: string) => {
    setOpen(false)
    const params = new URLSearchParams(searchParams.toString())
    if (type === '') {
      params.delete('type')
    } else {
      params.set('type', type)
    }
    router.push(`/inventory?${params.toString()}`)
  }

  const label = activeType || 'ทั้งหมด'

  return (
    <div ref={ref} className="relative inline-block">
      {/* Trigger button */}
      <button
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 text-sm font-semibold transition-all
          ${activeType
            ? 'border-blue-500 bg-blue-50 text-blue-700'
            : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-600'}`}
      >
        <span>ประเภท: {label}</span>
        <ChevronDown
          className={`w-4 h-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute left-0 top-full mt-2 z-50 bg-white border border-slate-200 rounded-xl shadow-xl w-52 py-1 overflow-hidden">
          {/* ทั้งหมด */}
          <button
            onClick={() => select('')}
            className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition hover:bg-slate-50
              ${activeType === '' ? 'text-blue-600 font-bold' : 'text-slate-700'}`}
          >
            <span>ทั้งหมด</span>
            {activeType === '' && <Check className="w-4 h-4 text-blue-500" />}
          </button>

          <div className="border-t border-slate-100 my-1" />

          {/* SLAB types */}
          {SLAB_TYPES.map(t => (
            <button
              key={t}
              onClick={() => select(t)}
              className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition hover:bg-slate-50
                ${activeType === t ? 'text-blue-600 font-bold' : 'text-slate-700'}`}
            >
              <span>{t}</span>
              {activeType === t && <Check className="w-4 h-4 text-blue-500" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
