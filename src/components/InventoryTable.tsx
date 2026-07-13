"use client"

import { useState } from "react"
import Link from "next/link"
import { Edit, Package, AlertCircle, Hammer, Layers, Box, Trash2 } from "lucide-react"
import RoughWoodForm from "./RoughWoodForm"
import { deleteProductsBulk } from "../actions/woodslab"
// 💡 ถอด CategoryBadge ออก แล้วใช้แบบ Inline ด้านล่างแทนเพื่อความแม่นยำครับ

interface InventoryTableProps {
  products: any[]
  activeTab: string
}

export default function InventoryTable({ products, activeTab }: InventoryTableProps) {
  // State สำหรับ Modal Edit (ของไม้ดิบ)
  const [editingProduct, setEditingProduct] = useState<any | null>(null)
  const [isRoughModalOpen, setIsRoughModalOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [isDeleting, setIsDeleting] = useState(false)

  // ฟังก์ชันกดปุ่มแก้ไข (เหลือไว้ใช้เฉพาะหมวด ไม้ดิบ เพราะมันเป็น Modal)
  const handleEdit = (product: any) => {
    if (product.category_id === 'rough_wood') {
      setEditingProduct(product)
      setIsRoughModalOpen(true)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(amount)
  }

  const handleBulkDelete = async () => {
    if (!confirm(`คุณแน่ใจหรือไม่ที่จะลบสินค้าที่เลือกจำนวน ${selectedIds.size} รายการ? (ระบบจะไม่ลบข้อมูลสต็อก หากติดการใช้งานอยู่จะแจ้งเตือน)`)) return
    setIsDeleting(true)
    try {
      const res = await deleteProductsBulk(Array.from(selectedIds))
      if (res.error) {
        alert(`เกิดข้อผิดพลาดในการลบสินค้า: ${res.error}`)
      } else {
        alert("ลบสินค้าที่เลือกเรียบร้อยแล้วครับนาย")
        setSelectedIds(new Set())
        window.location.reload()
      }
    } catch (err: any) {
      alert(`ผิดพลาด: ${err.message}`)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      {selectedIds.size > 0 && (
        <div className="mb-4 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex justify-between items-center transition-all duration-200 shadow-sm">
          <span className="text-sm text-blue-700 font-medium">
            เลือกไว้แล้ว <strong>{selectedIds.size}</strong> รายการ
          </span>
          <button
            onClick={handleBulkDelete}
            disabled={isDeleting}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition shadow-sm disabled:opacity-50 cursor-pointer active:scale-95"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {isDeleting ? "กำลังลบ..." : "ลบรายการที่เลือก"}
          </button>
        </div>
      )}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden min-h-[400px]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
                <th className="p-4 w-[50px] text-center">
                  <input 
                    type="checkbox" 
                    checked={products.length > 0 && selectedIds.size === products.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds(new Set(products.map(p => p.id)))
                      } else {
                        setSelectedIds(new Set())
                      }
                    }}
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                  />
                </th>
                <th className="p-4 w-[100px]">รูปภาพ</th>
                <th className="p-4">ชื่อสินค้า / SKU</th>
                <th className="p-4">หมวดหมู่</th>
                <th className="p-4">ราคา</th>
                <th className="p-4 text-center">สถานะ</th>
                <th className="p-4 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!products || products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                          <AlertCircle className="w-8 h-8 text-slate-400" />
                        </div>
                        <p className="font-medium">ไม่พบสินค้าในหมวดหมู่นี้</p>
                      </div>
                  </td>
                </tr>
              ) : (
                products.map((item: any) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="p-4 text-center align-middle">
                      <input 
                        type="checkbox" 
                        checked={selectedIds.has(item.id)}
                        onChange={(e) => {
                          const newSelected = new Set(selectedIds)
                          if (e.target.checked) {
                            newSelected.add(item.id)
                          } else {
                            newSelected.delete(item.id)
                          }
                          setSelectedIds(newSelected)
                        }}
                        className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                      />
                    </td>
                    <td className="p-4">
                      <div className="w-16 h-16 rounded-lg border border-slate-200 bg-slate-100 overflow-hidden relative group-hover:border-blue-200 transition-colors">
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300"><Package className="w-6 h-6" /></div>
                        )}
                      </div>
                    </td>
                    <td className="p-4 align-top">
                      <div className="font-bold text-slate-800 text-sm mb-1">{item.name}</div>
                      <div className="flex flex-wrap gap-2">
                        <span className="text-xs text-slate-500 font-mono bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">{item.sku}</span>
                        {item.category_id === 'rough_wood' && item.specs?.size_raw && (
                          <span className="text-[10px] text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100 font-mono">{item.specs.size_raw}</span>
                        )}
                      </div>
                    </td>
                    
                    {/* 💡 ป้ายหมวดหมู่แบบใหม่ ฉลาดขึ้น เปลี่ยนสีตามประเภทได้เลย */}
                    <td className="p-4 align-top">
                      {item.category_id === 'rough_wood' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-orange-50 text-orange-600 border border-orange-200">
                          <Hammer className="w-3 h-3" /> ไม้ดิบ
                        </span>
                      ) : item.category_id === 'prop' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-purple-50 text-purple-600 border border-purple-200">
                          <Box className="w-3 h-3" /> พร็อพ
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-blue-50 text-blue-600 border border-blue-200">
                          <Layers className="w-3 h-3" /> แผ่นไม้ (Slab)
                        </span>
                      )}
                    </td>

                    <td className="p-4 align-top">
                      <div className="font-bold text-slate-700 text-sm">{formatCurrency(item.price)}</div>
                    </td>
                    <td className="p-4 text-center align-top">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                        !item.status || item.status === 'active' ? 'bg-green-100 text-green-800' : 
                        item.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-slate-100 text-slate-500'}`}>
                        {item.status === 'paused' ? 'Paused' : item.status === 'inactive' ? 'Inactive' : item.status === 'draft' ? 'Draft' : 'Active'}
                      </span>
                    </td>
                    
                    {/* 💡 แยกปุ่มกดแก้ไขใหม่ ถ้าเป็น Rough ใช้ Modal ถ้าเป็นอย่างอื่นให้ไปหน้าฟอร์มแก้ไข */}
                    <td className="p-4 text-right align-top">
                      {item.category_id === 'rough_wood' ? (
                         <button
                           onClick={() => handleEdit(item)}
                           className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-orange-600 hover:text-white transition shadow-sm"
                         >
                           <Edit className="w-4 h-4" /> <span className="hidden sm:inline">แก้ไข</span>
                         </button>
                      ) : (
                         <Link 
                           href={`/inventory/${item.id}`} 
                           className={`inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 transition shadow-sm
                              ${item.category_id === 'prop' ? 'hover:bg-purple-600 hover:text-white' : 'hover:bg-blue-600 hover:text-white'}
                           `}
                         >
                           <Edit className="w-4 h-4" /> <span className="hidden sm:inline">แก้ไข</span>
                         </Link>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <RoughWoodForm 
        isOpen={isRoughModalOpen} 
        onClose={() => {
            setIsRoughModalOpen(false)
            setEditingProduct(null)
        }}
        initialData={editingProduct}
        onSuccess={() => window.location.reload()}
      />
    </>
  )
}   