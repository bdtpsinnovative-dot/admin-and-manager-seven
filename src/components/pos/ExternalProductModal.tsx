"use client"

import React, { useState, useEffect, useMemo } from 'react'
import {
  X,
  Search,
  Plus,
  Check,
  Armchair,
  PackagePlus,
  RefreshCw,
  Store,
  Tag,
  FileText,
  DollarSign,
  Info,
  SlidersHorizontal
} from 'lucide-react'
import { toast } from 'sonner'
import { getFurnitureProducts, createOrGetCustomProduct } from '@/actions/pos'

interface Branch {
  id: number
  branch_name: string
}

interface ExternalProductModalProps {
  isOpen: boolean
  onClose: () => void
  branches: Branch[]
  currentBranchId: number
  onAddToCart: (product: any, qty: number, fulfillBranchId: number) => void
}

// ฟังก์ชันจัดระเบียบชื่อสินค้าเฟอร์นิเจอร์ให้อ่านง่าย ไม่แสดงเป็น "-"
function getCleanProductName(item: any): string {
  if (item.name && item.name !== '-' && item.name.trim() !== '') {
    return item.name.replace(/^Furniture\s*-\s*/i, '').trim()
  }
  const sup = item.product_sup || 'เฟอร์นิเจอร์'
  const skuPart = (item.sku || '').split(/[\/,]/)[0] || item.id
  return `${sup} (${skuPart})`
}

// ฟังก์ชันดึงข้อความสเปก/ขนาด
function getSpecsSummary(item: any): string {
  if (item.specs) {
    const { width_cm, length_cm, thickness_cm, material } = item.specs
    const dims = [width_cm, length_cm, thickness_cm].filter(Boolean)
    if (dims.length > 0) {
      return `ขนาด ${dims.join(' × ')} ซม.${material ? ` • ${material}` : ''}`
    }
    if (material) return String(material)
  }
  return item.sku || ''
}

export default function ExternalProductModal({
  isOpen,
  onClose,
  branches,
  currentBranchId,
  onAddToCart
}: ExternalProductModalProps) {
  const [activeTab, setActiveTab] = useState<'catalog' | 'custom'>('catalog')

  // --- State สำหรับแท็บ 1: แคตตาล็อกเฟอร์นิเจอร์ ---
  const [furnitureList, setFurnitureList] = useState<any[]>([])
  const [subcategories, setSubcategories] = useState<string[]>([])
  const [selectedSubcat, setSelectedSubcat] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [loadingFurn, setLoadingFurn] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [addedItemIds, setAddedItemIds] = useState<Record<number, boolean>>({})

  // Global Selected Branch สำหรับการสั่งเฟอร์นิเจอร์ในโมดอลนี้
  const [selectedBranchId, setSelectedBranchId] = useState<number>(currentBranchId)

  // --- State สำหรับแท็บ 2: กำหนดสินค้านอกเอง (Custom) ---
  const [customName, setCustomName] = useState('')
  const [customSku, setCustomSku] = useState('')
  const [customPrice, setCustomPrice] = useState('')
  const [customQty, setCustomQty] = useState('1')
  const [customCategory, setCustomCategory] = useState('เฟอร์นิเจอร์')
  const [customNote, setCustomNote] = useState('')
  const [isSubmittingCustom, setIsSubmittingCustom] = useState(false)

  // โหลดรายการเฟอร์นิเจอร์เมื่อเปิด Modal ครั้งแรก
  useEffect(() => {
    if (isOpen && !hasLoaded) {
      loadFurniture(false)
    }
  }, [isOpen, hasLoaded])

  useEffect(() => {
    if (isOpen && currentBranchId) {
      setSelectedBranchId(currentBranchId)
    }
  }, [isOpen, currentBranchId])

  async function loadFurniture(force = false) {
    setLoadingFurn(true)
    try {
      const res = await getFurnitureProducts(force)
      if (res.success && res.products) {
        setFurnitureList(res.products)
        setSubcategories(res.subcategories || [])
        setHasLoaded(true)
      } else {
        toast.error(res.error || 'ไม่สามารถโหลดแคตตาล็อกเฟอร์นิเจอร์ได้')
      }
    } catch (err: any) {
      toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูล: ' + err.message)
    } finally {
      setLoadingFurn(false)
    }
  }

  // ตัวกรองรายการเฟอร์นิเจอร์
  const filteredFurniture = useMemo(() => {
    let list = furnitureList
    if (selectedSubcat !== 'ALL') {
      list = list.filter((p) => p.product_sup === selectedSubcat)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          p.sku?.toLowerCase().includes(q) ||
          p.product_sup?.toLowerCase().includes(q) ||
          (p.specs?.material && String(p.specs.material).toLowerCase().includes(q))
      )
    }
    return list
  }, [furnitureList, selectedSubcat, searchQuery])

  // สุ่ม SKU อัตโนมัติสำหรับ Custom Item
  const generateRandomSku = () => {
    const randomCode = Math.floor(1000 + Math.random() * 9000)
    const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '')
    setCustomSku(`EXT-FURN-${dateStr}-${randomCode}`)
  }

  // กดหยิบจากแคตตาล็อก
  const handleAddCatalogItem = (product: any) => {
    onAddToCart(product, 1, selectedBranchId)

    // Flash checkmark
    setAddedItemIds((prev) => ({ ...prev, [product.id]: true }))
    setTimeout(() => {
      setAddedItemIds((prev) => ({ ...prev, [product.id]: false }))
    }, 1200)

    const displayName = getCleanProductName(product)
    toast.success(`เพิ่ม "${displayName}" ลงในบิลแล้ว`)
  }

  // กดบันทึก Custom Item
  const handleSaveCustomItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customName.trim()) {
      toast.warning('กรุณากรอกชื่อสินค้า')
      return
    }
    const priceNum = parseFloat(customPrice.replace(/,/g, ''))
    if (isNaN(priceNum) || priceNum < 0) {
      toast.warning('กรุณากรอกราคาที่ถูกต้อง')
      return
    }
    const qtyNum = parseInt(customQty) || 1
    if (qtyNum <= 0) {
      toast.warning('จำนวนต้องมากกว่า 0')
      return
    }

    setIsSubmittingCustom(true)
    try {
      const res = await createOrGetCustomProduct({
        name: customName.trim(),
        price: priceNum,
        sku: customSku.trim() || undefined,
        categoryLabel: customCategory,
        note: customNote.trim(),
        branchId: selectedBranchId
      })

      if (res.success && res.product) {
        onAddToCart(res.product, qtyNum, selectedBranchId)
        toast.success(`เพิ่มสินค้านอก "${res.product.name}" ลงในบิลเรียบร้อย`)

        // Reset form
        setCustomName('')
        setCustomSku('')
        setCustomPrice('')
        setCustomQty('1')
        setCustomNote('')
        onClose()
      } else {
        toast.error(res.error || 'ไม่สามารถสร้างสินค้านอกระบบได้')
      }
    } catch (err: any) {
      toast.error('เกิดข้อผิดพลาด: ' + err.message)
    } finally {
      setIsSubmittingCustom(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6 animate-fade-in">
      <div className="bg-white w-full max-w-5xl max-h-[92vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        {/* --- Header ด้านบน --- */}
        <div className="px-5 sm:px-6 py-4 bg-white border-b border-slate-100 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 bg-slate-100 text-slate-800 rounded-2xl shrink-0">
              <Armchair className="w-5 h-5 text-slate-700" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-slate-800 truncate">
                  เพิ่มสินค้านอก & เฟอร์นิเจอร์
                </h3>
              </div>
              <p className="text-[11px] text-slate-400 truncate mt-0.5">
                คลิกที่การ์ดสินค้าเพื่อเพิ่มลงบิลขายได้ทันที
              </p>
            </div>
          </div>

          {/* สาขาที่ส่งมอบ & ปุ่มปิด */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="hidden sm:flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
              <Store className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-[11px] font-medium text-slate-500">สาขา:</span>
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(Number(e.target.value))}
                className="text-xs font-bold text-slate-800 bg-transparent outline-none cursor-pointer"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.branch_name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              title="ปิดหน้าต่าง"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* --- Tabs Switcher --- */}
        <div className="flex items-center border-b border-slate-200 bg-slate-50/80 px-5 sm:px-6 pt-2 gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('catalog')}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 cursor-pointer border-t border-x ${
              activeTab === 'catalog'
                ? 'bg-white text-slate-900 border-slate-200 shadow-xs translate-y-[1px]'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }`}
          >
            <Armchair className="w-4 h-4 text-slate-700" />
            <span>แคตตาล็อกเฟอร์นิเจอร์ ({furnitureList.length || '322'})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('custom')}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 cursor-pointer border-t border-x ${
              activeTab === 'custom'
                ? 'bg-white text-slate-900 border-slate-200 shadow-xs translate-y-[1px]'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }`}
          >
            <PackagePlus className="w-4 h-4 text-slate-700" />
            <span>กรอกสินค้านอกระบบเอง (Custom Item)</span>
          </button>
        </div>

        {/* --- Tab 1: แคตตาล็อกเฟอร์นิเจอร์ (การ์ดสไตล์ E-commerce รูปใหญ่ สวยงาม) --- */}
        {activeTab === 'catalog' && (
          <div className="flex-1 flex flex-col min-h-0 bg-slate-50/40">
            {/* Search Bar & Subcategory Filters */}
            <div className="p-3 sm:p-4 bg-white border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อเฟอร์นิเจอร์, โซฟา, เก้าอี้, โต๊ะ, เตียง, SKU..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-full text-xs text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-slate-300 transition-all font-medium"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Mobile Branch Selector */}
              <div className="sm:hidden flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                <Store className="w-3.5 h-3.5 text-slate-500" />
                <select
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(Number(e.target.value))}
                  className="text-xs font-bold text-slate-800 bg-transparent outline-none w-full"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.branch_name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => loadFurniture(true)}
                disabled={loadingFurn}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                title="รีเฟรชข้อมูลเฟอร์นิเจอร์"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingFurn ? 'animate-spin text-slate-700' : ''}`} />
                <span className="hidden sm:inline">รีเฟรช</span>
              </button>
            </div>

            {/* Subcategory Pills */}
            {subcategories.length > 0 && (
              <div className="px-4 py-2 bg-white border-b border-slate-100 flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedSubcat('ALL')}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold shrink-0 transition-colors cursor-pointer ${
                    selectedSubcat === 'ALL'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  ทั้งหมด ({furnitureList.length})
                </button>
                {subcategories.map((subcat) => {
                  const count = furnitureList.filter((p) => p.product_sup === subcat).length
                  return (
                    <button
                      key={subcat}
                      type="button"
                      onClick={() => setSelectedSubcat(subcat)}
                      className={`px-3 py-1 rounded-full text-[11px] font-bold shrink-0 transition-colors cursor-pointer ${
                        selectedSubcat === subcat
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {subcat} ({count})
                    </button>
                  )
                })}
              </div>
            )}

            {/* Grid of Furniture (สไตล์ POS Cards รูปใหญ่ ชัดเจน สบายตา) */}
            <div className="flex-1 overflow-y-auto px-5 sm:px-6 pt-5 pb-28 min-h-0">
              {loadingFurn ? (
                <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-3">
                  <RefreshCw className="w-8 h-8 animate-spin text-slate-600" />
                  <p className="text-xs font-bold text-slate-600">กำลังโหลดรายการเฟอร์นิเจอร์...</p>
                </div>
              ) : filteredFurniture.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-2">
                  <Armchair className="w-12 h-12 text-slate-300 stroke-[1.5]" />
                  <p className="text-sm font-bold text-slate-600">ไม่พบสินค้าเฟอร์นิเจอร์ที่ค้นหา</p>
                  <p className="text-xs text-slate-400">ลองพิมพ์คำค้นหาอื่น หรือเลือกหมวดหมู่อื่น</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-3.5 sm:gap-4">
                  {filteredFurniture.map((item) => {
                    const isAdded = Boolean(addedItemIds[item.id])
                    const cleanName = getCleanProductName(item)
                    const specsText = getSpecsSummary(item)
                    const branchStock = (item.stocks || []).find((s: any) => s.branch_id === selectedBranchId)?.qty || 0

                    return (
                      <div key={item.id} className="relative group hover:z-50">
                        <div
                          onClick={() => handleAddCatalogItem(item)}
                          className="bg-white rounded-2xl p-2.5 flex flex-col justify-between shadow-xs group-hover:shadow-[0_20px_45px_rgba(15,23,42,0.25)] group-hover:scale-[1.20] group-hover:border-slate-400 group-hover:ring-1 group-hover:ring-slate-900/10 transition-all duration-300 ease-out border border-slate-200/90 cursor-pointer select-none origin-top transform-gpu"
                        >
                          {/* รูปสินค้าด้านบนเต็มความกว้าง (Aspect Square) */}
                          <div className="relative w-full aspect-square bg-slate-50/90 rounded-xl overflow-hidden mb-2 flex items-center justify-center border border-slate-100">
                            {item.image_url ? (
                              <img
                                src={item.image_url}
                                alt={cleanName}
                                className="w-full h-full object-contain p-1.5 transition-transform duration-300 group-hover:scale-105"
                                loading="lazy"
                              />
                            ) : (
                              <Armchair className="w-10 h-10 text-slate-300 stroke-[1.5]" />
                            )}

                            {/* Tag หมวดหมู่มุมซ้ายบน */}
                            <div className="absolute top-2 left-2 bg-white/95 backdrop-blur-xs text-slate-800 text-[9px] font-bold px-2 py-0.5 rounded-md shadow-2xs border border-slate-200/80">
                              {item.product_sup || 'Furniture'}
                            </div>

                            {/* ป้ายแสดงสต็อกมุมขวาบน (อ่านตามสต็อกจริง) */}
                            <div className="absolute top-2 right-2">
                              <span className="bg-slate-900/80 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md backdrop-blur-xs shadow-2xs">
                                สต็อก {branchStock}
                              </span>
                            </div>

                            {/* Overlay แจ้งเตือนเมื่อกดหยิบสำเร็จ */}
                            {isAdded && (
                              <div className="absolute inset-0 bg-emerald-600/85 backdrop-blur-2xs flex flex-col items-center justify-center text-white font-black text-xs gap-1 animate-fade-in z-20">
                                <Check className="w-7 h-7 animate-bounce" />
                                <span>เพิ่มลงบิลแล้ว!</span>
                              </div>
                            )}
                          </div>

                          {/* ข้อมูลชื่อและสเปก */}
                          <div className="flex flex-col px-0.5 min-w-0">
                            <h4
                              className="text-xs font-bold text-slate-800 truncate leading-snug group-hover:text-slate-950"
                              title={cleanName}
                            >
                              {cleanName}
                            </h4>

                            <p className="text-[10px] text-slate-400 truncate mt-0.5" title={specsText}>
                              {specsText}
                            </p>

                            {/* ราคาและปุ่มหยิบ */}
                            <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-100">
                              <span className="text-xs sm:text-sm font-black text-slate-900 font-mono">
                                ฿{Number(item.price).toLocaleString()}
                              </span>

                              <div className="w-6 h-6 rounded-lg bg-slate-100 group-hover:bg-slate-900 text-slate-600 group-hover:text-white flex items-center justify-center transition-colors shadow-2xs shrink-0">
                                <Plus className="w-3.5 h-3.5" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- Tab 2: กำหนดสินค้านอกเอง (Custom Item) --- */}
        {activeTab === 'custom' && (
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 bg-slate-50/50">
            <form onSubmit={handleSaveCustomItem} className="max-w-2xl mx-auto space-y-4">
              <div className="bg-slate-100 border border-slate-200 rounded-2xl p-3.5 flex items-start gap-3">
                <Info className="w-5 h-5 text-slate-600 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-600 leading-relaxed">
                  <strong className="text-slate-800">สำหรับสินค้านอกแคตตาล็อก:</strong> เช่น โต๊ะสั่งผลิตเฉพาะ, แผ่นไม้ Slab นอกรายการ, ค่าบริการจัดส่ง/ติดตั้งพิเศษ หรือสินค้าเฟอร์นิเจอร์สั่งทำ ระบบจะบันทึกรหัสลงฐานข้อมูลเพื่อออกบิลและสรุปยอดได้อย่างถูกต้อง
                </div>
              </div>

              {/* ชื่อสินค้า */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ชื่อสินค้า / รายการขาย <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <FileText className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="เช่น โต๊ะทานอาหารไม้สักโมเดิร์น 2.4m, โซฟาสั่งทำพิเศษ"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:ring-2 focus:ring-slate-300 transition-all font-medium"
                  />
                </div>
              </div>

              {/* SKU & หมวดหมู่ */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700">รหัสสินค้า / SKU</label>
                    <button
                      type="button"
                      onClick={generateRandomSku}
                      className="text-[10px] text-blue-600 hover:text-blue-700 font-bold underline cursor-pointer"
                    >
                      สุ่มรหัสให้อัตโนมัติ
                    </button>
                  </div>
                  <div className="relative">
                    <Tag className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="เช่น EXT-FURN-001 (หรือปล่อยว่าง)"
                      value={customSku}
                      onChange={(e) => setCustomSku(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-slate-300 transition-all font-mono text-slate-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">หมวดหมู่สินค้า</label>
                  <select
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-slate-300 transition-all font-bold text-slate-700"
                  >
                    <option value="เฟอร์นิเจอร์">🛋️ เฟอร์นิเจอร์</option>
                    <option value="สั่งทำพิเศษ">🔨 สั่งทำพิเศษ (Custom Order)</option>
                    <option value="แผ่นไม้ธรรมชาติ">🪵 แผ่นไม้ธรรมชาติ (Slab)</option>
                    <option value="ค่าบริการ/ขนส่ง">🚚 ค่าบริการ / ขนส่งพิเศษ</option>
                    <option value="สินค้านอกรายการ">📦 สินค้านอกรายการทั่วไป</option>
                  </select>
                </div>
              </div>

              {/* ราคา & จำนวน & สาขา */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ราคาขายต่อหน่วย (฿) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <DollarSign className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="number"
                      required
                      min="0"
                      step="any"
                      placeholder="0.00"
                      value={customPrice}
                      onChange={(e) => setCustomPrice(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-900 outline-none focus:ring-2 focus:ring-slate-300 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">จำนวน (ชิ้น)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={customQty}
                    onChange={(e) => setCustomQty(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-slate-300 transition-all text-center"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">สาขาที่ส่งมอบ / Fulfill</label>
                  <select
                    value={selectedBranchId}
                    onChange={(e) => setSelectedBranchId(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-slate-300 transition-all truncate"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.branch_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* สเปก / หมายเหตุเพิ่มเติม */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  หมายเหตุ / สเปกเพิ่มเติม (ไม่บังคับ)
                </label>
                <textarea
                  rows={2}
                  placeholder="เช่น ขนาด 200 × 90 ซม., ผ้ากำมะหยี่สีเขียวเข้ม, จัดส่งพร้อมติดตั้ง"
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-slate-300 transition-all text-slate-800"
                />
              </div>

              {/* ปุ่มบันทึก */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCustom}
                  className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black shadow-xs hover:shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingCustom ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>กำลังบันทึก...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>เพิ่มสินค้านี้ลงตะกร้า</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
