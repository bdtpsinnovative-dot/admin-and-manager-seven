'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'

const STATUS_TYPES = [
  { value: "", label: "ทั้งหมด" },
  { value: "active", label: "Active (เปิดขาย)" },
  { value: "paused", label: "Paused (ปิดการขายชั่วคราว)" },
  { value: "inactive", label: "Inactive (ยกเลิก)" },
  { value: "draft", label: "Draft (ฉบับร่าง)" }
]

interface StatusFilterDropdownProps {
  activeStatus: string
}

export default function StatusFilterDropdown({ activeStatus }: StatusFilterDropdownProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const select = (status: string) => {
    setOpen(false)
    const params = new URLSearchParams(searchParams.toString())
    if (status === '') {
      params.delete('status')
    } else {
      params.set('status', status)
    }
    router.push(`/inventory?${params.toString()}`)
  }

  const activeLabel = STATUS_TYPES.find(s => s.value === activeStatus)?.label || 'ทั้งหมด'

  return (
    <div ref={ref} className="relative inline-block ml-3">
      <button
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 text-sm font-semibold transition-all
          ${activeStatus
            ? 'border-yellow-500 bg-yellow-50 text-yellow-700'
            : 'border-slate-200 bg-white text-slate-600 hover:border-yellow-300 hover:text-yellow-600'}`}
      >
        <span>สถานะ: {activeLabel}</span>
        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 z-50 bg-white border border-slate-200 rounded-xl shadow-xl w-64 py-1 overflow-hidden">
          {STATUS_TYPES.map(t => (
            <button
              key={t.value}
              onClick={() => select(t.value)}
              className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition hover:bg-slate-50
                ${activeStatus === t.value ? 'text-yellow-600 font-bold' : 'text-slate-700'}`}
            >
              <span>{t.label}</span>
              {activeStatus === t.value && <Check className="w-4 h-4 text-yellow-500" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
