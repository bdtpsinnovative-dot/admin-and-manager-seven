"use client"

import Link from "next/link"
import { Plus, Hammer, Layers, Box, Armchair } from "lucide-react"

export default function InventoryActions({
  allowedTabs = ['SLABS', 'ROUGH', 'PROP', 'FURNITURE'],
  activeTab = 'SLABS'
}: {
  allowedTabs?: string[]
  activeTab?: string
}) {
  const canAddActive = allowedTabs.includes(activeTab)

  const getTabConfig = (tab: string) => {
    if (tab === 'ROUGH') {
      return {
        label: 'เพิ่มไม้ดิบ (Rough)',
        icon: <Hammer className="w-4 h-4" />,
        className: 'bg-orange-600 hover:bg-orange-700 text-white shadow-orange-200'
      }
    }
    if (tab === 'PROP') {
      return {
        label: 'เพิ่มพร็อพ (Prop)',
        icon: <Box className="w-4 h-4" />,
        className: 'bg-purple-600 hover:bg-purple-700 text-white shadow-purple-200'
      }
    }
    if (tab === 'FURNITURE') {
      return {
        label: 'เพิ่มเฟอร์นิเจอร์ (Furniture)',
        icon: <Armchair className="w-4 h-4" />,
        className: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200'
      }
    }
    return {
      label: 'เพิ่มแผ่นไม้ (Slab)',
      icon: <Layers className="w-4 h-4" />,
      className: 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200'
    }
  }

  const config = getTabConfig(activeTab)

  return (
    <div className="flex gap-2">
      {canAddActive && (
        <Link
          href={`/inventory/new?tab=${activeTab}`}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 shadow-md transition-all font-bold text-sm active:scale-95 ${config.className}`}
        >
          <Plus className="w-4 h-4" />
          {config.icon}
          <span>{config.label}</span>
        </Link>
      )}
    </div>
  )
}