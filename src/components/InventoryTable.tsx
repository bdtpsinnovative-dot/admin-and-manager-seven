"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Edit, Package, AlertCircle, Hammer, Layers, Box, Trash2, Plus, Loader2 } from "lucide-react"
import RoughWoodForm from "./RoughWoodForm"
import { deleteProductsBulk, loadMoreProducts, type ProductExtraFilters } from "../actions/woodslab"
// 💡 ถอด CategoryBadge ออก แล้วใช้แบบ Inline ด้านล่างแทนเพื่อความแม่นยำครับ

interface InventoryTableProps {
  products?: any[]
  totalCount?: number
  categoryTotalCount?: number
  activeTab: string
  activeType?: string
  searchQuery?: string
  activeStatus?: string
  extraFilters?: ProductExtraFilters
  costFilter?: string
}

export default function InventoryTable({ 
  products = [], 
  totalCount,
  categoryTotalCount,
  activeTab,
  activeType,
  searchQuery,
  activeStatus,
  extraFilters,
  costFilter
}: InventoryTableProps) {
  const [items, setItems] = useState<any[]>(products || [])
  const [offset, setOffset] = useState((products || []).length)
  const [total, setTotal] = useState(totalCount ?? (products ? products.length : 0))
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  // State สำหรับ Modal Edit (ของไม้ดิบ)
  const [editingProduct, setEditingProduct] = useState<any | null>(null)
  const [isRoughModalOpen, setIsRoughModalOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [isDeleting, setIsDeleting] = useState(false)

  // ซิงค์เมื่อ props เปลี่ยน (เช่น เปลี่ยน tab หรือ filter)
  useEffect(() => {
    const list = products || []
    setItems(list)
    setOffset(list.length)
    setTotal(totalCount ?? list.length)
    setSelectedIds(new Set())
  }, [products, totalCount])

  const hasMore = items.length < total

  const handleLoadMore = async () => {
    if (isLoadingMore || !hasMore) return
    setIsLoadingMore(true)
    try {
      let dbCategory = 'SLABS'
      if (activeTab === 'ROUGH') dbCategory = 'rough_wood'
      if (activeTab === 'PROP') dbCategory = 'prop'
      if (activeTab === 'FURNITURE') dbCategory = 'furniture'

      const res = await loadMoreProducts({
        category: dbCategory,
        specType: activeType,
        searchQuery,
        statusFilter: activeStatus,
        extraFilters,
        costFilter,
        offset,
        limit: 250
      })

      if (res.error) {
        alert(`เกิดข้อผิดพลาดในการโหลดข้อมูลเพิ่ม: ${res.error}`)
      } else if (res.data && res.data.length > 0) {
        setItems(prev => [...prev, ...res.data])
        setOffset(prev => prev + res.data.length)
        if (res.count !== undefined) {
          setTotal(res.count)
        }
      }
    } catch (err: any) {
      alert(`โหลดข้อมูลเพิ่มไม่สำเร็จ: ${err.message}`)
    } finally {
      setIsLoadingMore(false)
    }
  }

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

  const isSlab = activeTab === 'SLABS'
  const isRough = activeTab === 'ROUGH'
  const isProp = activeTab === 'PROP'
  const isFurniture = activeTab === 'FURNITURE'

  const formatDims = (specs: any) => {
    if (!specs) return '-'
    const w = specs.width_cm ?? specs.W
    const d = specs.length_cm ?? specs.D
    const h = specs.thickness_cm ?? specs.H
    if (w !== undefined || d !== undefined || h !== undefined) {
      return `${w ?? 0} × ${d ?? 0} × ${h ?? 0} ซม.`
    }
    if (specs.size) return specs.size
    return '-'
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
                    checked={items.length > 0 && selectedIds.size === items.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds(new Set(items.map(p => p.id)))
                      } else {
                        setSelectedIds(new Set())
                      }
                    }}
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                  />
                </th>
                <th className="p-4 w-[80px]">รูปภาพ</th>
                <th className="p-4 min-w-[200px]">ชื่อสินค้า / SKU</th>
                
                {/* 🌟 คอลัมน์เฉพาะของแต่ละหมวดหมู่ */}
                {isSlab && (
                  <>
                    <th className="p-4 min-w-[140px]">ขนาด (Size)</th>
                    <th className="p-4 min-w-[130px]">ชนิดไม้ (Material)</th>
                    <th className="p-4 w-[80px] text-center">เกรด</th>
                    <th className="p-4 min-w-[140px]">ผิวงาน / ขอบ</th>
                  </>
                )}

                {isRough && (
                  <>
                    <th className="p-4 min-w-[150px]">ขนาดไม้ดิบ (Raw Size)</th>
                    <th className="p-4 min-w-[120px]">ลักษณะแผ่น</th>
                    <th className="p-4 min-w-[110px]">คลังจัดเก็บ</th>
                    <th className="p-4 min-w-[100px]">เวลาดูแล</th>
                  </>
                )}

                {(isProp || isFurniture) && (
                  <>
                    <th className="p-4 min-w-[130px]">Product กลุ่ม</th>
                    <th className="p-4 min-w-[140px]">ขนาด ก×ย×ส</th>
                    <th className="p-4 min-w-[100px]">สี (Color)</th>
                    <th className="p-4 min-w-[120px]">วัสดุ (Material)</th>
                    <th className="p-4 min-w-[110px]">โรงงาน/แบรนด์</th>
                  </>
                )}

                {!isSlab && !isRough && !isProp && !isFurniture && (
                  <th className="p-4">หมวดหมู่</th>
                )}

                {isProp ? (
                  <>
                    <th className="p-4 text-right min-w-[130px]">ต้นทุน ดอลลาร์ ไม่รวมค่าส่ง</th>
                    <th className="p-4 text-right min-w-[130px]">ต้นทุนรวมค่าส่ง (บาท)</th>
                  </>
                ) : (
                  <th className="p-4 text-right min-w-[110px]">ต้นทุน (Cost)</th>
                )}
                <th className="p-4 text-right min-w-[120px]">ราคาขาย (บาท)</th>
                <th className="p-4 text-center w-[90px]">สถานะ</th>
                <th className="p-4 text-right w-[90px]">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={isProp ? 14 : 13} className="p-12 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                          <AlertCircle className="w-8 h-8 text-slate-400" />
                        </div>
                        <p className="font-bold text-slate-700">ไม่พบสินค้าที่ตรงกับเงื่อนไขที่เลือกหรือพิมพ์ระบุ</p>
                        <p className="text-xs text-slate-400">
                          ระบบค้นหาจากสินค้าทั้งหมดในคลังแล้วไม่พบข้อมูลที่ตรงกัน ลองตรวจสอบคำสะกด หรือกดปุ่ม &quot;ล้างตัวกรอง&quot; ด้านบน
                        </p>
                      </div>
                  </td>
                </tr>
              ) : (
                items.map((item: any) => (
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
                      <div className="w-14 h-14 rounded-lg border border-slate-200 bg-slate-100 overflow-hidden relative group-hover:border-blue-200 transition-colors">
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300"><Package className="w-5 h-5" /></div>
                        )}
                      </div>
                    </td>
                    <td className="p-4 align-top">
                      <div className="font-bold text-slate-800 text-sm mb-1">{item.name}</div>
                      <div className="flex items-center">
                        <span className="text-xs text-slate-500 font-mono bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">{item.sku}</span>
                      </div>
                    </td>

                    {/* 🪵 SLABS Columns */}
                    {isSlab && (
                      <>
                        <td className="p-4 align-top">
                          <div className="text-xs font-mono font-semibold text-slate-800">
                            {item.specs?.size || (item.specs?.length_cm ? `${item.specs.length_cm}-${item.specs.width_cm}-${item.specs.thickness_cm} MM` : '-')}
                          </div>
                        </td>
                        <td className="p-4 align-top">
                          <span className="text-xs font-medium text-slate-700">
                            {item.specs?.material || '-'}
                          </span>
                        </td>
                        <td className="p-4 align-top text-center">
                          {item.specs?.grade ? (
                            <span className="inline-block px-2 py-0.5 rounded text-xs font-black bg-blue-50 text-blue-700 border border-blue-200">
                              {item.specs.grade}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">-</span>
                          )}
                        </td>
                        <td className="p-4 align-top">
                          <div className="text-xs text-slate-700 font-medium">{item.specs?.finish || '-'}</div>
                          {item.specs?.edge_design && (
                            <div className="text-[11px] text-slate-400 mt-0.5">{item.specs.edge_design}</div>
                          )}
                          {item.specs?.panel_craft && item.specs?.panel_craft !== 'Solid Panel' && (
                            <div className="text-[11px] text-amber-700 mt-0.5">
                              {item.specs.panel_craft}
                            </div>
                          )}
                        </td>
                      </>
                    )}

                    {/* 🔨 ROUGH Columns */}
                    {isRough && (
                      <>
                        <td className="p-4 align-top">
                          <div className="text-xs font-mono font-semibold text-slate-800">
                            {item.specs?.size_raw || item.specs?.size || '-'}
                          </div>
                        </td>
                        <td className="p-4 align-top">
                          <span className="text-xs font-medium text-slate-700">
                            {item.specs?.panel_craft || '-'}
                          </span>
                        </td>
                        <td className="p-4 align-top">
                          <span className="text-xs text-slate-600">
                            {item.specs?.warehouse || '-'}
                          </span>
                        </td>
                        <td className="p-4 align-top">
                          <span className="text-xs text-slate-600">
                            {item.specs?.maintain_time || '-'}
                          </span>
                        </td>
                      </>
                    )}

                    {/* 📦 PROP / FURNITURE Columns */}
                    {(isProp || isFurniture) && (
                      <>
                        <td className="p-4 align-top">
                          {(() => {
                            const groupName = item.collection_groups?.product_sup || item.specs?.product_sup || item.collection_groups?.name;
                            return (
                              <div>
                                <div className="text-xs font-semibold text-slate-800">
                                  {groupName || '-'}
                                </div>
                                {item.collection_group_id && (
                                  <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                                    {item.collection_group_id}
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </td>
                        <td className="p-4 align-top">
                          <div className="text-xs font-mono text-slate-800 font-semibold">
                            {formatDims(item.specs)}
                          </div>
                          {item.specs?.group_size && (
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              Size {item.specs.group_size}
                            </div>
                          )}
                        </td>
                        <td className="p-4 align-top">
                          {item.color ? (
                            <span className="text-xs font-medium text-slate-700">
                              {item.color}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">-</span>
                          )}
                        </td>
                        <td className="p-4 align-top">
                          <span className="text-xs text-slate-700 font-medium">
                            {item.specs?.material || '-'}
                          </span>
                        </td>
                        <td className="p-4 align-top">
                          <span className="text-xs text-slate-600">
                            {item.specs?.brand || '-'}
                          </span>
                        </td>
                      </>
                    )}

                    {/* Fallback ถ้าไม่ใช่ 4 หมวดหลัก */}
                    {!isSlab && !isRough && !isProp && !isFurniture && (
                      <td className="p-4 align-top">
                        <span className="text-xs text-slate-600 font-medium">{item.category_id}</span>
                      </td>
                    )}

                    {/* 💰 ต้นทุน (Cost) */}
                    {isProp ? (
                      <>
                        {/* 1. ต้นทุน ดอลล่าร์ */}
                        <td className="p-4 align-top text-right">
                          {item.specs?.cost_dollar != null && item.specs?.cost_dollar !== '' ? (
                            <div className="font-mono text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/80 inline-block">
                              ${Number(item.specs.cost_dollar).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                          ) : (
                            <span className="text-slate-300 text-xs font-mono">-</span>
                          )}
                        </td>
                        {/* 2. ต้นทุนร่วมค่าส่งแล้ว */}
                        <td className="p-4 align-top text-right">
                          <div className="font-mono text-xs font-semibold text-slate-700">
                            {(item.specs?.cost_th_shipping != null && item.specs?.cost_th_shipping !== '') || item.cost ? (
                              formatCurrency(Number(item.specs?.cost_th_shipping ?? item.cost))
                            ) : (
                              <span className="text-slate-300">฿0.00</span>
                            )}
                          </div>
                        </td>
                      </>
                    ) : (
                      <td className="p-4 align-top text-right">
                        <div className="font-mono text-xs font-semibold text-slate-500">
                          {item.cost ? formatCurrency(item.cost) : <span className="text-slate-300">฿0.00</span>}
                        </div>
                      </td>
                    )}

                    {/* 🏷️ ราคาขาย (Price) */}
                    <td className="p-4 align-top text-right">
                      <div className="font-mono text-sm font-bold text-slate-900">
                        {formatCurrency(item.price || 0)}
                      </div>
                      {(() => {
                        const effectiveCost = Number(item.specs?.cost_th_shipping ?? item.cost ?? 0);
                        return effectiveCost > 0 && item.price > effectiveCost ? (
                          <div className="text-[10px] font-mono text-emerald-600 font-medium mt-0.5">
                            +{formatCurrency(item.price - effectiveCost)}
                          </div>
                        ) : null;
                      })()}
                    </td>

                    {/* สถานะ */}
                    <td className="p-4 text-center align-top">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                        !item.status || item.status === 'active' ? 'bg-green-100 text-green-800' : 
                        item.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-slate-100 text-slate-500'}`}>
                        {item.status === 'paused' ? 'Paused' : item.status === 'inactive' ? 'Inactive' : item.status === 'draft' ? 'Draft' : 'Active'}
                      </span>
                    </td>
                    
                    {/* ปุ่มแก้ไข */}
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
                              ${item.category_id === 'prop' ? 'hover:bg-purple-600 hover:text-white' : item.category_id === 'furniture' ? 'hover:bg-emerald-600 hover:text-white' : 'hover:bg-blue-600 hover:text-white'}
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

        {/* ⚡ Pagination / Load More Footer Bar */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-slate-600">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="flex flex-wrap items-center gap-1.5">
              <span>
                กำลังแสดง <strong className="text-slate-900">{items.length.toLocaleString()}</strong> จาก{' '}
                <strong className="text-slate-900">{total.toLocaleString()}</strong> รายการ
              </span>
              {categoryTotalCount && categoryTotalCount > total ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                  <span>(คัดกรองจากสินค้าทั้งหมด {categoryTotalCount.toLocaleString()} รายการในระบบ)</span>
                </span>
              ) : null}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {hasMore ? (
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold rounded-xl text-xs sm:text-sm transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>กำลังโหลดเพิ่มอีก 250 รายการ...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>โหลดข้อมูลเพิ่มอีก 250 รายการ</span>
                  </>
                )}
              </button>
            ) : (
              <span className="text-xs text-slate-500 bg-white px-3 py-1.5 rounded-lg border border-slate-200 font-medium shadow-xs">
                ✓ โหลดครบทั้งหมด {total.toLocaleString()} รายการแล้ว
              </span>
            )}
          </div>
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