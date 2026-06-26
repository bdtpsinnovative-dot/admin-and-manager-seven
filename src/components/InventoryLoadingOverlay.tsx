"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"

export default function InventoryLoadingOverlay() {
  const [loading, setLoading] = useState(false)
  const searchParams = useSearchParams()

  useEffect(() => {
    // When URL params change, the navigation has completed
    setLoading(false)
  }, [searchParams])

  useEffect(() => {
    const handleStart = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('a')
      // If clicking a link that navigates within the inventory page
      if (target && target.href && target.href.includes('/inventory')) {
        setLoading(true)
      }
    }

    const handleSubmit = (e: SubmitEvent) => {
       setLoading(true)
    }

    document.addEventListener('click', handleStart)
    document.addEventListener('submit', handleSubmit)
    
    return () => {
      document.removeEventListener('click', handleStart)
      document.removeEventListener('submit', handleSubmit)
    }
  }, [])

  if (!loading) return null

  return (
    <div className="fixed inset-0 bg-white/60 backdrop-blur-sm z-[9999] flex flex-col items-center justify-center">
      <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4 shadow-sm rounded-full bg-white p-1" />
      <div className="text-lg font-semibold text-slate-700 bg-white px-4 py-1 rounded-full shadow-sm">กำลังโหลดข้อมูล...</div>
    </div>
  )
}
