"use client"

import { useState, useEffect } from 'react'
import { 
  searchProducts,          // 🟢 1. เปลี่ยนมาเรียกใช้ฟังก์ชันค้นหาจาก DB โดยตรง
  getActiveSearchTargets, 
  addSearchTarget, 
  removeSearchTarget,
  verifyProductsBySkuList, 
  bulkAddSearchTargets    
} from '@/actions/stock-search'

interface ProductOpt {
  id: number
  name: string
  sku: string
  image_url: string | null
}

interface SearchTarget {
  id: number
  product_id: number
  products: {
    name: string
    sku: string
    image_url: string | null
  } | null
}

export default function StockSearchManagerPage() {
  // 🟢 2. ไม่ต้องเก็บ allProducts แล้ว เปลี่ยนมาเก็บผลลัพธ์การค้นหาแทน
  const [searchResults, setSearchResults] = useState<ProductOpt[]>([])
  const [activeTargets, setActiveTargets] = useState<SearchTarget[]>([])
  const [loading, setLoading] = useState(true)
  const [isSearching, setIsSearching] = useState(false) // State เช็คว่ากำลังค้นหาอยู่ไหม
  
  // State สำหรับค้นหาทีละตัว
  const [searchQuery, setSearchQuery] = useState('')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  // State สำหรับโหมดก๊อปวางจาก Excel
  const [inputMode, setInputMode] = useState<'SINGLE' | 'BULK'>('SINGLE')
  const [bulkText, setBulkText] = useState('')
  const [previewMatched, setPreviewMatched] = useState<ProductOpt[]>([])
  const [previewMissing, setPreviewMissing] = useState<string[]>([])
  const [isVerifying, setIsVerifying] = useState(false)

  // 🟢 โหลดแค่ตารางคิวงานด้านล่าง ไม่ต้องโหลดสินค้าทั้งหมดแล้ว
  async function loadData() {
    setLoading(true)
    const targets = await getActiveSearchTargets()
    setActiveTargets(targets)
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  // 🟢 3. ระบบ Debounce: เมื่อผู้ใช้พิมพ์ ระบบจะรอ 400ms แล้วค่อยยิงไปหา Database จริงๆ
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.trim().length > 0) {
        setIsSearching(true)
        const results = await searchProducts(searchQuery)
        setSearchResults(results)
        setIsSearching(false)
      } else {
        setSearchResults([])
      }
    }, 400) // หน่วงเวลา 400 มิลลิวินาที

    return () => clearTimeout(timer) // เคลียร์ Timer ทิ้งถ้าผู้ใช้พิมพ์ต่อไวๆ
  }, [searchQuery])

  // ── ฟังก์ชันจัดการค้นหาแบบทีละตัว ──
  async function handleAddTarget(productId: number) {
    setIsDropdownOpen(false)
    setSearchQuery('')
    const res = await addSearchTarget(productId)
    if (res.success) {
      const targets = await getActiveSearchTargets()
      setActiveTargets(targets)
    } else {
      alert(res.message)
    }
  }

  // ── ฟังก์ชันจัดการ ก๊อปวางจาก Excel (BULK) ──
  async function handleVerifyBulk() {
    if (!bulkText.trim()) return
    setIsVerifying(true)
    
    const skusToSearch = bulkText.split(/\r?\n/)
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .map(s => {
        const parts = s.split('\t')
        let sku = parts[parts.length - 1].trim() 

        if (!s.includes('\t') && sku.includes(' ')) {
          const spaceParts = sku.split(' ')
          sku = spaceParts[spaceParts.length - 1].trim()
        }
        
        return sku
      })
    
    const matchedProducts = await verifyProductsBySkuList(skusToSearch)
    setPreviewMatched(matchedProducts)
    
    const matchedSkus = matchedProducts.map(p => p.sku.toUpperCase())
    const missing = skusToSearch.filter(s => !matchedSkus.includes(s.toUpperCase()))
    setPreviewMissing(missing)
    
    setIsVerifying(false)
  }

  async function handleConfirmBulkAdd() {
    if (previewMatched.length === 0) return
    setIsVerifying(true)
    
    const productIds = previewMatched.map(p => p.id)
    const res = await bulkAddSearchTargets(productIds)
    
    if (res.success) {
      setBulkText('')
      setPreviewMatched([])
      setPreviewMissing([])
      const targets = await getActiveSearchTargets()
      setActiveTargets(targets)
      alert(`✅ เพิ่มเป้าหมายค้นหาสำเร็จ ${productIds.length} รายการ`)
      setInputMode('SINGLE') 
    } else {
      alert(res.message)
    }
    setIsVerifying(false)
  }

  async function handleRemoveTarget(id: number) {
    const res = await removeSearchTarget(id)
    if (res.success) {
      setActiveTargets(activeTargets.filter(t => t.id !== id))
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        
        <div>
          <h1 className="text-2xl font-bold text-slate-800">ระบบสั่งค้นหาตำแหน่งสินค้า (RFID Locator)</h1>
          <p className="text-slate-500 text-sm mt-1">เลือกสินค้าที่หาไม่พบยัดลงระบบ เพื่อให้พนักงานถือเครื่อง PDA เดินสแกนตามหา</p>
        </div>

        {/* ── กล่องควบคุมการเพิ่มสินค้า ── */}
        <div className="bg-white p-6 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 space-y-4">
          
          {/* Tab เลือกโหมด */}
          <div className="flex bg-slate-100 p-1 rounded-xl w-fit mb-4">
            <button 
              onClick={() => setInputMode('SINGLE')}
              className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${inputMode === 'SINGLE' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              🔍 ค้นหาทีละชิ้น
            </button>
            <button 
              onClick={() => setInputMode('BULK')}
              className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${inputMode === 'BULK' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              📋 วางจาก Excel (Bulk)
            </button>
          </div>

          {inputMode === 'SINGLE' ? (
            /* ── โหมด 1: ค้นหาทีละชิ้น ── */
            <div className="relative">
              <input
                type="text"
                placeholder="พิมพ์ชื่อสินค้า หรือ ค้นหาด้วยรหัส SKU..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setIsDropdownOpen(true)
                }}
                onFocus={() => setIsDropdownOpen(true)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-slate-800"
              />
              
              {/* 🟢 4. ปรับปรุง UI ตอนค้นหา */}
              {isDropdownOpen && searchQuery.length > 0 && (
                <div className="absolute left-0 right-0 mt-2 max-h-60 overflow-y-auto bg-white border border-slate-100 rounded-xl shadow-2xl z-50 divide-y divide-slate-50">
                  
                  {isSearching ? (
                    <div className="p-6 text-center flex flex-col items-center justify-center gap-2">
                       <span className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></span>
                       <span className="text-sm text-slate-400 font-medium">กำลังค้นหาในฐานข้อมูล...</span>
                    </div>
                  ) : searchResults.length > 0 ? (
                    searchResults.map((prod) => (
                      <div key={prod.id} onClick={() => handleAddTarget(prod.id)} className="p-3 flex items-center gap-3 cursor-pointer hover:bg-slate-50 transition-colors">
                        <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
                          {prod.image_url ? (
                            <img src={prod.image_url} alt={prod.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-slate-200 text-slate-400">
                              <span className="text-[10px]">📷</span>
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 text-sm">{prod.name}</p>
                          <p className="text-xs text-slate-400 mt-0.5">SKU: {prod.sku}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-sm text-slate-400">ไม่พบข้อมูลสินค้าในระบบ</div>
                  )}

                </div>
              )}
            </div>
          ) : (
            /* ── โหมด 2: วางจาก Excel ── */
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
              <textarea
                rows={5}
                placeholder="คลิกขวา Paste วางข้อมูลรหัสสินค้า (SKU) ที่ก๊อปปี้มาจาก Excel ที่นี่ได้เลยครับ (วางบรรทัดละ 1 รหัส)..."
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 text-slate-800 font-mono text-sm leading-relaxed resize-none"
              />
              
              <button 
                onClick={handleVerifyBulk}
                disabled={!bulkText.trim() || isVerifying}
                className="px-6 py-2.5 bg-slate-800 text-white font-bold rounded-xl shadow-md hover:bg-slate-700 disabled:opacity-50 transition-all"
              >
                {isVerifying ? 'กำลังตรวจสอบ...' : 'ตรวจสอบข้อมูล'}
              </button>

              {/* แสดงผลลัพธ์การตรวจสอบ */}
              {(previewMatched.length > 0 || previewMissing.length > 0) && (
                <div className="mt-4 p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                  <h3 className="font-bold text-slate-700 mb-3">ผลการตรวจสอบ</h3>
                  
                  {previewMatched.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm font-semibold text-green-600 mb-2">✅ พบสินค้าพร้อมเพิ่ม ({previewMatched.length} รายการ)</p>
                      <div className="flex flex-wrap gap-2">
                        {previewMatched.map(p => (
                          <span key={p.id} className="px-2 py-1 bg-white border border-slate-200 text-xs font-mono rounded-md text-slate-600">{p.sku}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {previewMissing.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm font-semibold text-red-500 mb-2">❌ ไม่พบรหัสนี้ในระบบ ({previewMissing.length} รายการ)</p>
                      <div className="flex flex-wrap gap-2">
                        {previewMissing.map((sku, idx) => (
                          <span key={idx} className="px-2 py-1 bg-red-50 border border-red-100 text-xs font-mono rounded-md text-red-500">{sku}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {previewMatched.length > 0 && (
                    <button 
                      onClick={handleConfirmBulkAdd}
                      disabled={isVerifying}
                      className="w-full mt-2 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-md shadow-blue-200 transition-all"
                    >
                      ยืนยันเพิ่มเข้าคิวค้นหาทั้งหมด
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {isDropdownOpen && inputMode === 'SINGLE' && <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />}
        </div>

        {/* ── ตารางรายการสินค้า ── */}
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
          <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              📡 รายการที่กำลังค้นหาอยู่บน PDA 
              <span className="px-2.5 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-black">{activeTargets.length}</span>
            </h2>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-400 font-medium">กำลังโหลดรายการเป้าหมาย...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <th className="p-4 pl-6">รายละเอียดสินค้า</th>
                    <th className="p-4 text-center">รหัสสินค้า</th>
                    <th className="p-4 text-center">สถานะเครื่อง PDA</th>
                    <th className="p-4 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {activeTargets.map((target) => {
                    const prod = target.products || { name: 'ไม่ทราบชื่อ', sku: 'N/A', image_url: null }
                    return (
                      <tr key={target.id} className="hover:bg-slate-50/40 transition-colors">
                        <td className="p-4 pl-6">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center border border-slate-200">
                              {prod.image_url ? (
                                <img src={prod.image_url} alt={prod.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-slate-400">
                                  <span className="text-xl">🖼️</span>
                                  <span className="text-[8px] font-bold">NO IMG</span>
                                </div>
                              )}
                            </div>
                            <span className="font-bold text-slate-800">{prod.name}</span>
                          </div>
                        </td>
                        <td className="p-4 text-center font-semibold text-slate-500">{prod.sku}</td>
                        <td className="p-4 text-center">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-600 border border-amber-100 animate-pulse">
                            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                            กำลังรอสแกนจับคู่...
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <button onClick={() => handleRemoveTarget(target.id)} className="px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100">
                            ยกเลิกค้นหา / เจอแล้ว
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                  {activeTargets.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-12 text-center text-slate-400 font-medium">ไม่มีค้างค้นหา พนักงานหน้างานเดินเคลียร์ของครบหมดแล้วครับนาย!</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}