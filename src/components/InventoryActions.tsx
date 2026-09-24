"use client"

import { useState } from "react"
import Link from "next/link"
import { Plus, Hammer, Layers } from "lucide-react"
import RoughWoodForm from "./RoughWoodForm" // ✅ Import Modal ที่ทำไว้รอบที่แล้ว

export default function InventoryActions({ allowedTabs = ['SLABS', 'ROUGH', 'PROP', 'FURNITURE'] }: { allowedTabs?: string[] }) {
  const [isRoughModalOpen, setIsRoughModalOpen] = useState(false)

  const canAddSlab = allowedTabs.includes('SLABS')
  const canAddRough = allowedTabs.includes('ROUGH')

  return (
    <>
      <div className="flex gap-2">
        {/* ปุ่ม 1: เพิ่ม Wood Slab (ไปหน้าใหม่ปกติ) */}
        {canAddSlab && (
          <Link 
            href="/inventory/new" 
            className="bg-white border border-blue-200 text-blue-700 hover:bg-blue-50 px-4 py-2.5 rounded-lg flex items-center gap-2 transition-all font-medium text-sm"
          >
            <Layers className="w-4 h-4" /> เพิ่มแผ่นไม้ (Slab)
          </Link>
        )}

        {/* ปุ่ม 2: เพิ่ม Rough Wood (เปิด Modal) */}
        {canAddRough && (
          <button 
            onClick={() => setIsRoughModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg flex items-center gap-2 shadow-lg shadow-blue-200 transition-all font-medium text-sm"
          >
            <Hammer className="w-4 h-4" /> เพิ่มไม้ดิบ (Rough)
          </button>
        )}
      </div>

      {/* Modal: Rough Wood */}
      <RoughWoodForm 
        isOpen={isRoughModalOpen} 
        onClose={() => setIsRoughModalOpen(false)}
        onSuccess={() => window.location.reload()} // โหลดหน้าใหม่เมื่อบันทึกเสร็จ
      />
    </>
  )
}