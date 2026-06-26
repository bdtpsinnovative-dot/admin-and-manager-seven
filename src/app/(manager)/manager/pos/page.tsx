"use client"

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { getPosData, processCheckout, CheckoutPayload, getNearbyStock } from '@/actions/pos'
import { FolderOpen, Store, Truck, Receipt, MapPin, Save, AlertTriangle, X, Plus, Minus, FileText, Trash2, Printer, RefreshCw, Clock } from 'lucide-react'
import { toast } from 'sonner'

// โหลด Component แผนที่แบบไม่ทำ SSR
const MapPicker = dynamic(() => import('@/components/MapPicker'), { ssr: false })

interface Branch { id: number; branch_name: string }
interface Product {
  id: number; name: string; sku: string; original_price: number; price: number;
  discount_label: string; image_url: string | null; barcode: string | null;
  product_sup: string | null; stocks: { branch_id: number, qty: number }[];
  discount_id?: number | null;
  discount_name?: string | null;
}

interface CartItem extends Product {
  cartItemId: string;
  quantity: number;
  fulfill_branch_id: number;
  fulfill_branch_name: string;
}

interface NestedCategory {
  parent: string;
  hasChildren: boolean;
  children: { fullText: string; subText: string }[];
}

export default function ManagerPOSPage() {
  const [branches, setBranches] = useState<Branch[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loadingDb, setLoadingDb] = useState(true)

  const [nestedCategories, setNestedCategories] = useState<NestedCategory[]>([])
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    'DECORATIVE': true,
    'DOLL': true,
    'WALL ART': true,
  })

  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const [myBranchId, setMyBranchId] = useState<number>(1)
  const [selectedLocation, setSelectedLocation] = useState<number | 'ALL'>('ALL')
  const [selectedCategory, setSelectedCategory] = useState<string | 'ALL'>('ALL')

  const [searchQuery, setSearchQuery] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [isConfirmingClear, setIsConfirmingClear] = useState(false)

  const [saleMode, setSaleMode] = useState<'TAKE_AWAY' | 'DELIVERY'>('TAKE_AWAY')

  // ✨ State สำหรับฟอร์มลูกค้า
  const [shippingName, setShippingName] = useState('ลูกค้าทั่วไป (หน้าร้าน)')
  const [shippingPhone, setShippingPhone] = useState('-')
  const [shippingAddress, setShippingAddress] = useState('รับของเองที่สาขา')
  const [isCustomerFormOpen, setIsCustomerFormOpen] = useState(false) // ซ่อนฟอร์มไว้ก่อน ประหยัดที่!
  
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const handleSaleModeChange = (mode: 'TAKE_AWAY' | 'DELIVERY') => {
    setSaleMode(mode)
    if (mode === 'TAKE_AWAY') {
      if (!shippingName || shippingName.trim() === '') {
        setShippingName('ลูกค้าทั่วไป (หน้าร้าน)')
      }
      if (!shippingPhone || shippingPhone.trim() === '') {
        setShippingPhone('-')
      }
      if (!shippingAddress || shippingAddress.trim() === '') {
        setShippingAddress('รับของเองที่สาขา')
      }
    } else {
      if (shippingName === 'ลูกค้าทั่วไป (หน้าร้าน)') {
        setShippingName('')
      }
      if (shippingPhone === '-') {
        setShippingPhone('')
      }
      if (shippingAddress === 'รับของเองที่สาขา') {
        setShippingAddress('')
      }
    }
  }

  // ✨ State สำหรับพิกัดลูกค้า
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)
  const [showMap, setShowMap] = useState(false)

  const [nearbyModal, setNearbyModal] = useState<{
    isOpen: boolean;
    product: Product | null;
    nearbyStocks: any[];
    isLoading: boolean;
  }>({ isOpen: false, product: null, nearbyStocks: [], isLoading: false })

  useEffect(() => { loadData(true) }, [])

  useEffect(() => {
    const savedCart = localStorage.getItem('pos_cart')
    if (savedCart) {
      try { setCart(JSON.parse(savedCart)) } catch (e) { console.error("โหลดตะกร้าเก่าไม่สำเร็จ", e) }
    }
  }, [])

  useEffect(() => {
    if (cart.length > 0) {
      localStorage.setItem('pos_cart', JSON.stringify(cart))
    } else {
      localStorage.removeItem('pos_cart')
    }
  }, [cart])

  async function loadData(isInitial = false) {
    setLoadingDb(true)
    const res = await getPosData()
    if (res.success && res.products && res.branches) {
      setProducts(res.products)
      setBranches(res.branches)
      if (res.categories) buildNestedMenu(res.categories)
      if (res.branchId) {
        setMyBranchId(res.branchId)
        if (isInitial) setSelectedLocation(res.branchId)
      }
      setLastUpdated(new Date())
    } else {
      toast.error("โหลดข้อมูลล้มเหลว: " + res.error)
    }
    setLoadingDb(false)
  }

  const buildNestedMenu = (rawCategories: string[]) => {
    const groups: Record<string, { fullText: string; subText: string }[]> = {}
    const singleItems: NestedCategory[] = []
    const prefixKeywords = ['DECORATIVE', 'DOLL', 'WALL ART']

    rawCategories.forEach(fullText => {
      const upperText = fullText.toUpperCase()
      const matchPrefix = prefixKeywords.find(prefix => upperText.startsWith(prefix))

      if (matchPrefix) {
        const subText = fullText.substring(matchPrefix.length).trim()
        if (!groups[matchPrefix]) groups[matchPrefix] = []
        groups[matchPrefix].push({ fullText, subText })
      } else {
        singleItems.push({ parent: fullText, hasChildren: false, children: [] })
      }
    })

    const nestedMenu: NestedCategory[] = prefixKeywords.map(prefix => ({
      parent: prefix, hasChildren: true, children: groups[prefix] || []
    }))
    setNestedCategories([...singleItems, ...nestedMenu])
  }

  const toggleGroup = (parent: string) => setOpenGroups(prev => ({ ...prev, [parent]: !prev[parent] }))

  const getDisplayQty = (product: Product) => {
    if (selectedLocation === 'ALL') return product.stocks.reduce((sum, s) => sum + Number(s.qty), 0)
    const branchStock = product.stocks.find(s => s.branch_id === selectedLocation)
    return branchStock ? Number(branchStock.qty) : 0
  }

  const addToCart = async (product: Product) => {
    const targetBranchId = myBranchId

    const branchStock = product.stocks.find(s => s.branch_id === targetBranchId)
    const availableQty = branchStock ? Number(branchStock.qty) : 0

    const cartItemId = `${product.id}-${targetBranchId}`

    const existing = cart.find((item) => item.cartItemId === cartItemId)
    const currentInCart = existing ? existing.quantity : 0

    if (currentInCart >= availableQty) {
      setNearbyModal({ isOpen: true, product, nearbyStocks: [], isLoading: true })
      const res = await getNearbyStock(product.id, targetBranchId)
      if (res.success && res.data) {
        setNearbyModal({ isOpen: true, product, nearbyStocks: res.data, isLoading: false })
      } else {
        setNearbyModal({ isOpen: false, product: null, nearbyStocks: [], isLoading: false })
        toast.warning('สินค้านี้สต็อกหมดทุกสาขาครับ!')
      }
      return
    }

    const branchName = branches.find(b => b.id === targetBranchId)?.branch_name || 'สาขาหลัก'

    setCart((prevCart) => {
      if (existing) {
        return prevCart.map((item) =>
          item.cartItemId === cartItemId ? { ...item, quantity: item.quantity + 1 } : item
        )
      }
      return [...prevCart, {
        ...product,
        cartItemId,
        quantity: 1,
        fulfill_branch_id: targetBranchId,
        fulfill_branch_name: branchName
      }]
    })
  }

  const handleSelectNearbyBranch = (stockData: any) => {
    if (!nearbyModal.product) return

    const fulfillBranchId = stockData.branch_id
    const fulfillBranchName = stockData.branch_name || 'สาขาอื่น'
    const maxQty = stockData.available_qty ?? stockData.qty ?? stockData.quantity ?? 0

    const product = nearbyModal.product
    const cartItemId = `${product.id}-${fulfillBranchId}`

    setCart((prevCart) => {
      const existing = prevCart.find(item => item.cartItemId === cartItemId)

      if (existing && existing.quantity >= maxQty) {
        toast.warning(`สต็อกของ ${fulfillBranchName} ถูกหยิบลงตะกร้าหมดแล้วครับ!`)
        return prevCart
      }

      if (existing) {
        return prevCart.map(item => item.cartItemId === cartItemId ? { ...item, quantity: item.quantity + 1 } : item)
      }

      return [...prevCart, {
        ...product,
        cartItemId,
        quantity: 1,
        fulfill_branch_id: fulfillBranchId,
        fulfill_branch_name: fulfillBranchName
      }]
    })

    setNearbyModal({ isOpen: false, product: null, nearbyStocks: [], isLoading: false })
  }

  const updateQuantity = (cartItemId: string, delta: number) => {
    setCart((prevCart) =>
      prevCart.map((item) => {
        if (item.cartItemId === cartItemId) {
          const branchStock = item.stocks.find(s => s.branch_id === item.fulfill_branch_id)
          const displayQty = branchStock ? Number(branchStock.qty) : 999

          const newQty = item.quantity + delta
          if (newQty > displayQty) return item
          return newQty > 0 ? { ...item, quantity: newQty } : null
        }
        return item
      }).filter(Boolean) as CartItem[]
    )
  }

  const removeFromCart = (cartItemId: string) => setCart((prev) => prev.filter((item) => item.cartItemId !== cartItemId))

  const totalOriginalPrice = cart.reduce((sum, item) => sum + item.original_price * item.quantity, 0)
  const totalFinalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const totalDiscountAmount = totalOriginalPrice - totalFinalPrice

  const handleCheckout = async () => {
    if (cart.length === 0) return

    const finalName = shippingName.trim() || (saleMode === 'TAKE_AWAY' ? 'ลูกค้าทั่วไป (หน้าร้าน)' : '')
    const finalPhone = shippingPhone.trim() || (saleMode === 'TAKE_AWAY' ? '-' : '')
    const finalAddressText = shippingAddress.trim() || (saleMode === 'TAKE_AWAY' ? 'รับของเองที่สาขา' : '')

    if (saleMode === 'DELIVERY' && (!finalName || !finalPhone || !finalAddressText)) {
      toast.warning("รบกวนกรอก ชื่อ เบอร์โทร และที่อยู่ลูกค้า สำหรับออกเอกสารจัดส่งด้วยครับ")
      // บังคับเปิดฟอร์มลูกค้าให้กรอก
      setIsCustomerFormOpen(true)
      return
    }

    setSubmitting(true)
    try {
      const checkoutBranchId = myBranchId

      const finalAddress = saleMode === 'TAKE_AWAY'
        ? `[รับหน้าร้าน] ${finalAddressText}`
        : finalAddressText;

      const payload: any = {
        branchId: checkoutBranchId,
        subtotal: totalOriginalPrice,
        discountAmount: totalDiscountAmount,
        totalAmount: totalFinalPrice,
        saleMode,
        shippingName: finalName,
        shippingPhone: finalPhone,
        shippingAddress: finalAddress,
        latitude: latitude,
        longitude: longitude,
        items: cart.map(item => ({
          productId: item.id,
          qty: item.quantity,
          priceAtSale: item.price,
          originalPrice: item.original_price,
          fulfillBranchId: item.fulfill_branch_id,
          discountId: item.discount_id || null,
          discountName: item.discount_name || null,
          discountAmountPerPiece: item.original_price - item.price
        }))
      }

      const result = await processCheckout(payload)
      if (result.success) {
        const isSaleRole = window.location.pathname.startsWith('/sale')
        const printUrl = isSaleRole
          ? `/sale/print/dispatch/${result.orderCode}`
          : `/manager/print/dispatch/${result.orderCode}`

        toast.success(
          <div className="flex flex-col gap-1.5 py-0.5">
            <span className="font-bold text-slate-800 text-xs">ออกใบขายสำเร็จ! รหัสบิล: {result.orderCode}</span>
            <button
              onClick={() => window.open(printUrl, '_blank')}
              className="mt-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold py-1.5 px-3 rounded-lg text-[10px] self-start transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" /> พิมพ์ใบเสนอราคา
            </button>
          </div>
        )
        setCart([])
        setIsConfirmingClear(false)
        setShippingName('ลูกค้าทั่วไป (หน้าร้าน)')
        setShippingPhone('-')
        setShippingAddress('รับของเองที่สาขา')
        setLatitude(null)
        setLongitude(null)
        setSaleMode('TAKE_AWAY')
        setIsCustomerFormOpen(false) // หดฟอร์มกลับ
        await loadData()
      } else {
        toast.error(`เกิดข้อผิดพลาด: ${result.error}`)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const filteredProducts = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.sku.toLowerCase().includes(searchQuery.toLowerCase())
    if (!matchSearch) return false
    if (selectedCategory !== 'ALL' && p.product_sup !== selectedCategory) return false
    return getDisplayQty(p) > 0
  })

  if (loadingDb) return <div className="min-h-screen flex items-center justify-center font-bold text-slate-500 bg-[#F4F7F9]">กำลังโหลดข้อมูลคลังสินค้า...</div>

  return (
    <div className="min-h-screen bg-[#F4F7F9] p-6 font-sans relative select-none">

      {/* 🧭 ลิ้นชักเมนูด้านซ้าย */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-2xl flex flex-col overflow-hidden transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-5 pb-2 flex items-center justify-between border-b border-slate-100">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Categories</span>
          <button onClick={() => setIsSidebarOpen(false)} className="text-slate-400 hover:text-slate-700 text-sm flex items-center gap-1">
            <X className="w-4 h-4" /> ปิดเมนู
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <button
            onClick={() => { setSelectedCategory('ALL'); setIsSidebarOpen(false); }}
            className={`w-full text-left px-4 py-3 rounded-2xl font-bold text-sm transition-all mb-2 ${selectedCategory === 'ALL' ? 'bg-[#1E293B] text-white' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            ALL
          </button>
          {nestedCategories.map((menu) => {
            if (!menu.hasChildren) {
              return (
                <button
                  key={menu.parent}
                  onClick={() => { setSelectedCategory(menu.parent); setIsSidebarOpen(false); }}
                  className={`w-full text-left px-4 py-3 rounded-2xl font-bold text-sm transition-all uppercase mb-1 ${selectedCategory === menu.parent ? 'bg-[#1E293B] text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  {menu.parent}
                </button>
              )
            }
            const isGroupOpen = openGroups[menu.parent]
            return (
              <div key={menu.parent} className="flex flex-col mb-1">
                <div
                  onClick={() => toggleGroup(menu.parent)}
                  className="w-full flex justify-between items-center px-4 py-3 text-slate-500 font-bold text-xs uppercase tracking-widest cursor-pointer hover:bg-slate-50 rounded-2xl"
                >
                  <span>{menu.parent}</span>
                  <span className="text-xs text-slate-400">{isGroupOpen ? '−' : '＋'}</span>
                </div>
                {isGroupOpen && (
                  <div className="pl-4 ml-2 border-l-2 border-slate-100 flex flex-col mt-1 mb-2">
                    {menu.children.map((child) => (
                      <button
                        key={child.fullText}
                        onClick={() => { setSelectedCategory(child.fullText); setIsSidebarOpen(false); }}
                        className={`w-full text-left px-4 py-2 text-xs font-bold uppercase transition-all relative ${selectedCategory === child.fullText ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
                      >
                        {selectedCategory === child.fullText && (
                          <span className="absolute left-[-5px] top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                        )}
                        {child.subText}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {isSidebarOpen && <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 z-40 bg-black/10 backdrop-blur-xs transition-opacity" />}

      {/* 🧩 โครงสร้างเนื้อหาหลัก */}
      <div className="max-w-[1600px] mx-auto flex flex-col lg:flex-row gap-6 items-start">

        <div className="flex-1 w-full flex flex-col gap-4">
          <div className="bg-white p-4 rounded-3xl shadow-xs flex flex-col xl:flex-row gap-4 items-center justify-between w-full">
            <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="bg-slate-100 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-full hover:bg-slate-200 transition-all flex items-center gap-1.5 shadow-xs shrink-0"
              >
                <FolderOpen className="w-4 h-4" /> เลือกหมวดหมู่ {selectedCategory !== 'ALL' && <span className="text-blue-600">({selectedCategory.split(' ').pop()})</span>}
              </button>
              <select
                value={selectedLocation}
                onChange={(e) => {
                  const val = e.target.value
                  setSelectedLocation(val === 'ALL' ? 'ALL' : Number(val))
                }}
                className={`border font-bold text-xs rounded-full px-4 py-2 outline-none cursor-pointer appearance-none shadow-xs shrink-0 ${selectedLocation === myBranchId ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-slate-200 text-slate-700'}`}
              >
                <option value="ALL">ส่องดู ALL STOCKS</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.branch_name} {b.id === myBranchId ? '(คลังเรา)' : ''}</option>
                ))}
              </select>

              {/* ✨ Reload & Time */}
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-full px-3 py-1.5 shrink-0 ml-auto xl:ml-0">
                <div className="flex flex-col">
                  <span className="text-[9px] text-slate-400 font-bold flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" /> อัปเดตล่าสุด
                  </span>
                  <span className="text-[10px] text-slate-700 font-bold">
                    {lastUpdated ? lastUpdated.toLocaleString('th-TH', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'กำลังโหลด...'}
                  </span>
                </div>
                <button
                  onClick={() => loadData(false)}
                  disabled={loadingDb}
                  className="ml-1 p-1.5 bg-white border border-slate-200 text-blue-600 rounded-full hover:bg-blue-50 hover:border-blue-300 disabled:opacity-50 transition-all cursor-pointer shadow-xs"
                  title="รีโหลดข้อมูลสินค้าและสต็อก"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingDb ? 'animate-spin text-slate-400' : ''}`} />
                </button>
              </div>
            </div>
            <div className="w-full xl:w-72 shrink-0">
              <input
                type="text"
                placeholder="ค้นหาชื่อสินค้าที่นี่..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-5 py-2.5 bg-slate-50 rounded-full text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 w-full">
            {filteredProducts.map((product) => {
              const currentQty = getDisplayQty(product)
              return (
                <div
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="bg-white rounded-3xl p-4 flex flex-col shadow-xs cursor-pointer border border-transparent hover:border-blue-200 hover:shadow-md transition-all group aspect-square relative"
                >
                  <div className="relative flex-1 bg-slate-50/50 rounded-2xl overflow-hidden mb-2 flex items-center justify-center">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="object-contain w-full h-full p-2 transition-transform duration-300 group-hover:scale-105" />
                    ) : (
                      <span className="text-xs text-slate-300 font-medium">ไม่มีรูปภาพ</span>
                    )}
                    <div className="absolute top-2 right-2 bg-slate-900/80 text-white text-[9px] px-1.5 py-0.5 rounded-md backdrop-blur-xs font-bold">
                      ส่องเจอ: {currentQty} ชิ้น
                    </div>
                  </div>
                  <div className="flex flex-col shrink-0 mt-1">
                    <h3 className="font-bold text-slate-800 text-xs truncate w-full" title={product.name}>
                      {product.name}
                    </h3>
                    <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-50">
                      <div>
                        {product.discount_label && (
                          <div className="flex items-center gap-1">
                            <span className="text-[9px] text-slate-400 line-through">THB {product.original_price.toLocaleString()}</span>
                            <span className="text-[8px] bg-orange-50 border border-orange-100 text-orange-600 px-0.5 rounded font-black">{product.discount_label}</span>
                          </div>
                        )}
                        <div className="text-blue-600 font-black text-xs">THB {product.price.toLocaleString()}</div>
                      </div>
                      <span className="bg-blue-50 text-blue-600 px-2.5 py-1 rounded-xl text-[10px] font-bold group-hover:bg-blue-600 group-hover:text-white transition-all shadow-2xs">
                        + เพิ่ม
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 🛒 ฝั่งขวา: ตะกร้าสรุปบิล */}
        <div className="w-full lg:w-[360px] shrink-0 bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col overflow-hidden lg:sticky lg:top-6 max-h-[calc(100vh-48px)]">

          <div className="p-3 bg-slate-50 border-b border-slate-100 grid grid-cols-2 gap-2 relative">
            <button
              onClick={() => handleSaleModeChange('TAKE_AWAY')}
              className={`py-2 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 ${saleMode === 'TAKE_AWAY' ? 'bg-[#1E293B] text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
            >
              <Store className="w-4 h-4" /> รับหน้าร้าน
            </button>
            <button
              onClick={() => handleSaleModeChange('DELIVERY')}
              className={`py-2 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 ${saleMode === 'DELIVERY' ? 'bg-blue-600 text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
            >
              <Truck className="w-4 h-4" /> ให้ร้านส่งให้
            </button>
          </div>

          <div className="p-4 pb-3 border-b border-slate-50 flex justify-between items-center">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <Receipt className="w-4 h-4" /> รายการใบสรุปขาย
              <span className="bg-blue-50 text-blue-600 font-bold text-[10px] px-2 py-0.5 rounded-full">{cart.length} รายการ</span>
            </h2>
            {cart.length > 0 && (
              <div className="flex items-center gap-1">
                {!isConfirmingClear ? (
                  <button
                    onClick={() => setIsConfirmingClear(true)}
                    className="text-[11px] text-red-500 hover:text-red-700 font-bold flex items-center gap-1 transition-colors px-2 py-1 rounded-lg hover:bg-red-50 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> ลบทั้งหมด
                  </button>
                ) : (
                  <div className="flex items-center gap-1 bg-red-50 p-1 rounded-lg border border-red-100 animate-fade-in">
                    <span className="text-[9px] text-red-700 font-bold px-1">ลบทั้งหมด?</span>
                    <button
                      onClick={() => {
                        setCart([])
                        setIsConfirmingClear(false)
                        toast.success('ลบสินค้าทั้งหมดออกจากรายการขายแล้ว')
                      }}
                      className="text-[9px] bg-red-600 hover:bg-red-700 text-white font-bold px-1.5 py-0.5 rounded transition-colors cursor-pointer"
                    >
                      ใช่
                    </button>
                    <button
                      onClick={() => setIsConfirmingClear(false)}
                      className="text-[9px] bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 font-bold px-1.5 py-0.5 rounded transition-colors cursor-pointer"
                    >
                      ไม่
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-2 min-h-[180px]">
            {cart.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-slate-400 text-xs font-medium text-center">
                ยังไม่มีรายการสินค้าในใบขาย
              </div>
            ) : (
              <div className="flex flex-col gap-2 py-1">
                {cart.map((item, index) => (
                  <div
                    key={`${item.cartItemId}-${index}`}
                    className="flex gap-2.5 p-2.5 bg-slate-50/70 border border-slate-100 rounded-2xl hover:bg-slate-50 transition-colors relative animate-fade-in"
                  >
                    {item.fulfill_branch_id !== myBranchId && (
                      <span className="absolute -top-2 -right-1 bg-orange-100 text-orange-700 border border-orange-200 text-[8px] px-1.5 py-0.5 rounded font-bold shadow-2xs z-10">
                        ดึงสต็อก: {item.fulfill_branch_name}
                      </span>
                    )}

                    {/* รูปภาพสินค้า */}
                    <div className="w-11 h-11 bg-white border border-slate-100 rounded-xl overflow-hidden shrink-0 flex items-center justify-center shadow-3xs">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} className="w-full h-full object-contain p-0.5" />
                      ) : (
                        <span className="text-[8px] text-slate-300 font-medium">No Img</span>
                      )}
                    </div>

                    {/* รายละเอียดสินค้า */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div className="flex justify-between items-start gap-1">
                        <p className="text-xs font-bold text-slate-700 truncate" title={item.name}>{item.name}</p>
                        <button onClick={() => removeFromCart(item.cartItemId)} className="text-slate-400 hover:text-red-500 transition-colors shrink-0" title="ลบรายการนี้">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-blue-600 font-extrabold">{(item.price * item.quantity).toLocaleString()} ฿</p>
                        <div className="flex items-center bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
                          <button onClick={() => updateQuantity(item.cartItemId, -1)} className="px-2 py-0.5 text-slate-500 font-bold hover:bg-slate-50 text-[10px]">-</button>
                          <span className="px-1.5 text-[10px] font-bold text-slate-800">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.cartItemId, 1)} className="px-2 py-0.5 text-slate-500 font-bold hover:bg-slate-50 text-[10px]">+</button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 bg-slate-50/60 border-t border-slate-100">

            {/* ✨ ฟอร์มข้อมูลลูกค้าแบบพับเก็บได้ (+/-) */}
            <div className="mb-4 bg-blue-50/70 border border-blue-100 rounded-xl shadow-inner overflow-hidden transition-all">
              <button
                onClick={() => setIsCustomerFormOpen(!isCustomerFormOpen)}
                className="w-full p-3 flex items-center justify-between hover:bg-blue-100/50 transition-colors cursor-pointer"
              >
                <p className="text-[10px] font-black text-blue-700 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> ข้อมูลลูกค้า (สำหรับจัดส่ง)
                </p>
                {isCustomerFormOpen ? (
                  <Minus className="w-4 h-4 text-blue-600 bg-blue-100 rounded-md p-0.5" />
                ) : (
                  <Plus className="w-4 h-4 text-blue-600 bg-blue-100 rounded-md p-0.5" />
                )}
              </button>

              {isCustomerFormOpen && (
                <div className="p-3 pt-0 border-t border-blue-100/50 mt-1">
                  <div className="space-y-2">
                    <input type="text" placeholder="ชื่อลูกค้าผู้รับ" value={shippingName} onChange={e => setShippingName(e.target.value)} className="w-full text-xs p-2 bg-white rounded-lg border border-blue-200 outline-none focus:border-blue-400" />
                    <input type="text" placeholder="เบอร์โทรศัพท์ติดต่อ" value={shippingPhone} onChange={e => setShippingPhone(e.target.value)} className="w-full text-xs p-2 bg-white rounded-lg border border-blue-200 outline-none focus:border-blue-400" />
                    <textarea placeholder="ที่อยู่ลูกค้าโดยละเอียด..." value={shippingAddress} onChange={e => setShippingAddress(e.target.value)} rows={2} className="w-full text-xs p-2 bg-white rounded-lg border border-blue-200 outline-none focus:border-blue-400 resize-none" />
                  </div>

                  <div className="pt-3 border-t border-blue-100/50 mt-3 space-y-2">
                    {latitude && longitude ? (
                      <div className="w-full h-32 bg-slate-100 rounded-xl overflow-hidden border border-blue-200 relative shadow-inner">
                        <iframe
                          title="Mini Map Preview"
                          width="100%"
                          height="100%"
                          frameBorder="0"
                          scrolling="no"
                          src={`https://www.openstreetmap.org/export/embed.html?bbox=${longitude - 0.002},${latitude - 0.002},${longitude + 0.002},${latitude + 0.002}&layer=mapnik&marker=${latitude},${longitude}`}
                          className="pointer-events-none"
                        />
                        <div className="absolute bottom-1 right-1 bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded text-[8px] font-bold text-blue-600 shadow-sm">
                          พิกัดลูกค้า
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-20 bg-slate-50/50 rounded-xl border border-dashed border-blue-200 flex flex-col items-center justify-center text-slate-400 gap-1">
                        <MapPin className="w-4 h-4 text-blue-300" />
                        <span className="text-[10px] font-medium">ยังไม่ได้ปักหมุดแผนที่</span>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => setShowMap(true)}
                      className={`w-full flex items-center justify-center gap-1.5 p-2.5 text-xs font-bold rounded-lg border transition-all ${latitude && longitude
                          ? 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          : 'bg-blue-50 border-blue-300 text-blue-600 hover:bg-blue-100 shadow-sm'
                        }`}
                    >
                      <MapPin className="w-4 h-4" />
                      {latitude && longitude ? 'แก้ไขจุดปักหมุดแผนที่' : 'เปิดแผนที่เพื่อจิ้มปักหมุดลูกค้า'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-1.5 text-xs font-semibold text-slate-500 mb-4">
              <div className="flex justify-between"><span>ยอดรวมสินค้า</span><span>{totalOriginalPrice.toLocaleString()} ฿</span></div>
              {totalDiscountAmount > 0 && <div className="flex justify-between text-orange-600"><span>ส่วนลดโปรโมชัน</span><span>- {totalDiscountAmount.toLocaleString()} ฿</span></div>}
              <div className="flex justify-between text-xs font-bold text-slate-800 pt-3 mt-1 border-t border-dashed border-slate-200">
                <span>ยอดสุทธิใบขาย</span><span className="text-base text-blue-600 font-black">{totalFinalPrice.toLocaleString()} ฿</span>
              </div>
            </div>

            {/* ✨ เพิ่มปุ่มเสนอราคามาไว้ตรงนี้ */}
            <div className="flex flex-col gap-2">


              <button
                onClick={handleCheckout}
                disabled={submitting || cart.length === 0}
                className="w-full py-3.5 bg-[#1E293B] text-white rounded-xl font-bold text-xs hover:bg-slate-800 transition-all shadow-md shadow-slate-200 disabled:opacity-40 disabled:shadow-none cursor-pointer flex items-center justify-center gap-1.5"
              >
                {submitting ? 'กำลังบันทึกข้อมูลออเดอร์...' : <><Save className="w-4 h-4" /> สร้างใบเสนอราคา</>}
              </button>
            </div>

          </div>
        </div>

      </div>

      {/* 🔍 Modal แจ้งเตือนสต็อกสาขาอื่น */}
      {nearbyModal.isOpen && nearbyModal.product && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-orange-500" /> สินค้าสาขาเราหมดแล้ว
              </h3>
              <button onClick={() => setNearbyModal({ isOpen: false, product: null, nearbyStocks: [], isLoading: false })} className="text-slate-400 hover:text-slate-700 font-bold">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5">
              <p className="text-sm font-bold text-slate-700 mb-1">{nearbyModal.product.name}</p>
              <p className="text-xs text-slate-500 mb-4">รหัส: {nearbyModal.product.sku}</p>
              <div className="space-y-2">
                <p className="text-xs font-bold text-blue-600 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> พบสินค้าในสาขาอื่น (คลิกเพื่อดึงของมาส่งบ้านลูกค้า):
                </p>
                {nearbyModal.isLoading ? (
                  <div className="flex items-center justify-center py-8 gap-2 text-slate-400 font-bold text-xs">
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-slate-300 border-t-blue-600" />
                    กำลังตรวจสอบสต็อกสาขาอื่น...
                  </div>
                ) : nearbyModal.nearbyStocks.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 font-semibold text-xs border border-dashed border-slate-200 rounded-2xl bg-slate-50/50 flex flex-col items-center justify-center gap-1.5">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    ไม่พบสินค้านี้ในคลังของสาขาอื่นเลยครับ
                  </div>
                ) : (
                  nearbyModal.nearbyStocks.map((stock: any) => {
                    const displayAmount = stock.available_qty ?? stock.qty ?? stock.quantity ?? '?'
                    return (
                      <button
                        key={stock.branch_id || stock.id || Math.random()}
                        onClick={() => handleSelectNearbyBranch(stock)}
                        className="w-full flex justify-between items-center bg-white border border-blue-100 hover:border-blue-400 hover:bg-blue-50 p-3 rounded-xl transition-all cursor-pointer group shadow-2xs hover:shadow-md"
                      >
                        <span className="text-xs font-bold text-slate-700 group-hover:text-blue-800">
                          {stock.branch_name || 'ไม่ทราบชื่อสาขา'}
                        </span>
                        <span className="text-xs font-black text-blue-600 bg-blue-50 group-hover:bg-white px-2 py-1 rounded border border-transparent group-hover:border-blue-200 transition-colors">
                          มี {displayAmount} ชิ้น
                        </span>
                      </button>
                    )
                  })
                )}
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2">
              <button onClick={() => setNearbyModal({ isOpen: false, product: null, nearbyStocks: [], isLoading: false })} className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-100 transition-all cursor-pointer">
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✨ Modal เลือกแผนที่ (MapPicker) */}
      {showMap && (
        <MapPicker
          initialLat={latitude}
          initialLng={longitude}
          onSelectLocation={(lat, lng) => {
            setLatitude(lat);
            setLongitude(lng);
            setShowMap(false);
          }}
          onClose={() => setShowMap(false)}
        />
      )}

    </div>
  )
}