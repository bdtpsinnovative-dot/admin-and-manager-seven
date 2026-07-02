"use client"

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { getPosData, processCheckout, CheckoutPayload, getNearbyStock, getOrderForEdit } from '@/actions/pos'
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
  isOutOfStockError?: boolean;
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
  const [shippingName, setShippingName] = useState('')
  const [shippingPhone, setShippingPhone] = useState('')
  const [shippingAddress, setShippingAddress] = useState('')
  const [customOrderCode, setCustomOrderCode] = useState('')
  const [companyNameTh, setCompanyNameTh] = useState('')
  const [companyNameEn, setCompanyNameEn] = useState('')
  const [companyAddress, setCompanyAddress] = useState('')
  const [taxId, setTaxId] = useState('')
  const [specialDiscountPercent, setSpecialDiscountPercent] = useState<string>('')
  const [specialDiscountBaht, setSpecialDiscountBaht] = useState<string>('')
  const [isCustomerFormOpen, setIsCustomerFormOpen] = useState(false) // ซ่อนฟอร์มไว้ก่อน ประหยัดที่!
  
  // ✨ State สำหรับระบบช่วยปัดเศษ
  const [isRoundingModalOpen, setIsRoundingModalOpen] = useState(false)
  const [targetRoundingTotal, setTargetRoundingTotal] = useState<string>('')
  const [calculatedRoundingBaht, setCalculatedRoundingBaht] = useState<number | null>(null)
  
  // ✨ State สำหรับการแก้ไขบิล (Edit Mode)
  const [editOrderId, setEditOrderId] = useState<number | null>(null)
  const [editOrderCode, setEditOrderCode] = useState<string | null>(null)
  const [hasLoadedEdit, setHasLoadedEdit] = useState(false)
  
  // ✨ State สำหรับ Modal ยืนยันและการพิมพ์
  const [isConfirmCheckoutOpen, setIsConfirmCheckoutOpen] = useState(false)
  const [successPrintUrl, setSuccessPrintUrl] = useState<string | null>(null)
  
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const handleSaleModeChange = (mode: 'TAKE_AWAY' | 'DELIVERY') => {
    if (mode === 'TAKE_AWAY') {
      const hasCrossBranch = cart.some(item => item.fulfill_branch_id !== myBranchId);
      if (hasCrossBranch) {
        toast.warning("ไม่สามารถเลือก 'รับหน้าร้าน' ได้ เนื่องจากมีสินค้าดึงจากสาขาอื่น ต้องจัดส่งเท่านั้นครับ");
        return;
      }
    }

    setSaleMode(mode)
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

  // ✨ ฟังก์ชันโหลดบิลเก่ามาแก้ไข
  async function loadOrderForEdit(orderCode: string) {
    const res = await getOrderForEdit(orderCode)
    if (res.success && res.order) {
       const newCart: CartItem[] = []
       res.order.order_items.forEach((item: any) => {
          const product = products.find(p => p.id === item.product_id)
          if (product) {
            newCart.push({
               ...product,
               cartItemId: `${product.id}-${item.fulfill_branch_id}`,
               quantity: item.qty,
               fulfill_branch_id: item.fulfill_branch_id,
               fulfill_branch_name: item.branches?.branch_name || 'สาขา',
               price: item.price_at_sale,
               original_price: product.original_price, 
               discount_id: item.discount_id,
               discount_name: item.discount_name
            })
          }
       })
       setCart(newCart)
       setEditOrderId(res.order.id)
       setEditOrderCode(res.order.order_code)
       
       if (res.order.shipping_name) setShippingName(res.order.shipping_name)
       if (res.order.shipping_phone) setShippingPhone(res.order.shipping_phone)
       if (res.order.shipping_address) {
          const isTakeaway = res.order.shipping_address.startsWith('[รับหน้าร้าน]')
          if (isTakeaway) {
             setSaleMode('TAKE_AWAY')
             setShippingAddress(res.order.shipping_address.replace('[รับหน้าร้าน] ', ''))
          } else {
             setSaleMode('DELIVERY')
             setShippingAddress(res.order.shipping_address)
          }
       }
        if (res.order.latitude) setLatitude(res.order.latitude)
        if (res.order.longitude) setLongitude(res.order.longitude)
        if (res.order.company_name_th) setCompanyNameTh(res.order.company_name_th)
        if (res.order.company_name_en) setCompanyNameEn(res.order.company_name_en)
        if (res.order.company_address) setCompanyAddress(res.order.company_address)
        if (res.order.tax_id) setTaxId(res.order.tax_id)
        if (res.order.special_discount_percent !== undefined && res.order.special_discount_percent !== null) {
          setSpecialDiscountPercent(res.order.special_discount_percent.toString())
        } else {
          setSpecialDiscountPercent('0')
        }
        if (res.order.special_discount_baht !== undefined && res.order.special_discount_baht !== null) {
          setSpecialDiscountBaht(res.order.special_discount_baht.toString())
        } else {
          setSpecialDiscountBaht('0')
        }
        
        toast.success(`โหลดข้อมูลบิล ${orderCode} เพื่อแก้ไขแล้ว`)
    } else {
       toast.error(res.error || "ไม่สามารถโหลดบิลนี้ได้")
    }
  }

  // ✨ เช็ค Edit Param
  useEffect(() => {
    if (products.length > 0 && !hasLoadedEdit && typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const editCode = urlParams.get('edit')
      if (editCode) {
        setHasLoadedEdit(true)
        loadOrderForEdit(editCode)
      }
    }
  }, [products, hasLoadedEdit])

  useEffect(() => {
    const savedCart = localStorage.getItem('pos_cart')
    if (savedCart) {
      try { setCart(JSON.parse(savedCart)) } catch (e) { console.error("โหลดตะกร้าเก่าไม่สำเร็จ", e) }
    }

    // ✨ โหลดข้อมูลลูกค้าที่กรอกค้างไว้
    const savedCustomer = localStorage.getItem('pos_customer_info')
    if (savedCustomer) {
      try { 
        const info = JSON.parse(savedCustomer)
        if (info.saleMode) setSaleMode(info.saleMode)
        if (info.shippingName) setShippingName(info.shippingName)
        if (info.shippingPhone) setShippingPhone(info.shippingPhone)
        if (info.shippingAddress) setShippingAddress(info.shippingAddress)
        if (info.latitude) setLatitude(info.latitude)
        if (info.longitude) setLongitude(info.longitude)
        if (info.companyNameTh) setCompanyNameTh(info.companyNameTh)
        if (info.companyNameEn) setCompanyNameEn(info.companyNameEn)
        if (info.companyAddress) setCompanyAddress(info.companyAddress)
        if (info.taxId) setTaxId(info.taxId)
      } catch (e) { console.error("โหลดข้อมูลลูกค้าไม่สำเร็จ", e) }
    }
  }, [])

  // ✨ บันทึกข้อมูลลูกค้าลง Local Storage ทุกครั้งที่มีการเปลี่ยนแปลง
  useEffect(() => {
    if (hasLoadedEdit && !editOrderId) {
      const customerInfo = { saleMode, shippingName, shippingPhone, shippingAddress, latitude, longitude, companyNameTh, companyNameEn, companyAddress, taxId }
      localStorage.setItem('pos_customer_info', JSON.stringify(customerInfo))
    }
  }, [saleMode, shippingName, shippingPhone, shippingAddress, latitude, longitude, companyNameTh, companyNameEn, companyAddress, taxId])

  useEffect(() => {
    if (cart.length > 0) {
      localStorage.setItem('pos_cart', JSON.stringify(cart))
    } else {
      localStorage.removeItem('pos_cart')
    }
  }, [cart])

  // ✨ เช็คป้องกันบั๊ก: โหลดใหม่แล้วมีของต่างสาขา แต่ดันค้างโหมดรับหน้าร้าน
  useEffect(() => {
    if (cart.length > 0 && myBranchId) {
      const hasCrossBranch = cart.some(item => item.fulfill_branch_id !== myBranchId)
      if (hasCrossBranch && saleMode === 'TAKE_AWAY') {
        setSaleMode('DELIVERY')
      }
    }
  }, [cart, myBranchId, saleMode])

  async function loadData(isInitial = false) {
    if (isInitial) setLoadingDb(true)
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
    if (isInitial) setLoadingDb(false)
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

  const triggerCartAnimation = (productId: number) => {
    const cartEl = document.getElementById('cart-icon-target')
    const imgEl = document.getElementById(`product-img-${productId}`) as HTMLImageElement
    
    if (cartEl && imgEl) {
      const imgRect = imgEl.getBoundingClientRect()
      const cartRect = cartEl.getBoundingClientRect()
      
      const clone = imgEl.cloneNode(true) as HTMLImageElement
      clone.style.position = 'fixed'
      clone.style.left = `${imgRect.left}px`
      clone.style.top = `${imgRect.top}px`
      clone.style.width = `${imgRect.width}px`
      clone.style.height = `${imgRect.height}px`
      clone.style.zIndex = '9999'
      clone.style.transition = 'all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
      clone.style.opacity = '0.9'
      clone.style.borderRadius = '50%'
      clone.style.objectFit = 'cover'
      clone.style.boxShadow = '0 10px 15px -3px rgb(0 0 0 / 0.1)'
      clone.id = '' // clear id to avoid duplicates
      
      document.body.appendChild(clone)
      
      void clone.offsetWidth
      
      clone.style.left = `${cartRect.left + cartRect.width/2 - 15}px`
      clone.style.top = `${cartRect.top + cartRect.height/2 - 15}px`
      clone.style.width = '30px'
      clone.style.height = '30px'
      clone.style.opacity = '0.1'
      clone.style.transform = 'scale(0.5) rotate(360deg)'
      
      setTimeout(() => clone.remove(), 600)
    }
  }

  const getDisplayQty = (product: Product) => {
    if (selectedLocation === 'ALL') return product.stocks.reduce((sum, s) => sum + Number(s.qty), 0)
    const branchStock = product.stocks.find(s => s.branch_id === selectedLocation)
    return branchStock ? Number(branchStock.qty) : 0
  }

  const handleProductClick = (product: Product) => {
    addToCart(product)
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

    // 🚀 สต็อกพอ ดึงลงตะกร้าเลย พร้อมเล่นแอนิเมชัน
    triggerCartAnimation(product.id)

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

      // 🚀 สต็อกของสาขาอื่นพอ ดึงลงตะกร้า พร้อมเล่นแอนิเมชัน
      triggerCartAnimation(product.id)

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

    // 🚀 บังคับเป็นโหมดจัดส่งทันทีเมื่อมีการดึงข้ามสาขา
    if (saleMode === 'TAKE_AWAY') {
      setSaleMode('DELIVERY')
      toast.info('เปลี่ยนเป็นโหมด "ให้ร้านส่งให้" อัตโนมัติ เนื่องจากมีรายการดึงสต็อกข้ามสาขา')
    }
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
  const totalFinalPriceBeforeSpecial = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const promotionDiscountAmount = totalOriginalPrice - totalFinalPriceBeforeSpecial

  const discountBaht = Number(specialDiscountBaht || 0)
  const discountPercent = Number(specialDiscountPercent || 0)
  const afterBaht = Math.max(0, totalFinalPriceBeforeSpecial - discountBaht)
  const discountPercentAmount = afterBaht * (discountPercent / 100)
  const totalSpecialDiscountAmount = discountBaht + discountPercentAmount

  const totalFinalPrice = Math.max(0, totalFinalPriceBeforeSpecial - totalSpecialDiscountAmount)
  const totalDiscountAmount = promotionDiscountAmount + totalSpecialDiscountAmount

  const handlePreCheckout = () => {
    if (cart.length === 0) return

    const finalName = shippingName.trim()
    const finalPhone = shippingPhone.trim()
    const finalAddressText = shippingAddress.trim()

    if (!finalName || !finalPhone || !finalAddressText) {
      toast.warning("รบกวนกรอก ชื่อ เบอร์โทร และที่อยู่ลูกค้า ให้ครบถ้วนครับ")
      setIsCustomerFormOpen(true)
      return
    }

    if (companyNameTh.trim() !== '' || companyNameEn.trim() !== '') {
      if (companyAddress.trim() === '') {
        toast.error("หากต้องการออกใบกำกับภาษี กรุณากรอกที่อยู่บริษัทให้ครบถ้วนครับ")
        setIsCustomerFormOpen(true)
        return
      }
    }

    if (taxId.trim() !== '' && taxId.trim().length !== 13) {
      toast.error("เลขประจำตัวผู้เสียภาษี หากระบุ ต้องมี 13 หลักถ้วนครับ")
      setIsCustomerFormOpen(true)
      return
    }

    if (!editOrderId && !customOrderCode) {
      setCustomOrderCode(`INV${Date.now()}`)
    }
    setIsConfirmCheckoutOpen(true)
  }

  const handleCheckout = async () => {
    if (cart.length === 0) return

    const finalName = shippingName.trim()
    const finalPhone = shippingPhone.trim()
    const finalAddressText = shippingAddress.trim()

    setIsConfirmCheckoutOpen(false)

    setSubmitting(true)
    try {
      const checkoutBranchId = myBranchId

      const finalAddress = saleMode === 'TAKE_AWAY'
        ? `[รับหน้าร้าน] ${finalAddressText}`
        : finalAddressText;

      const vatAmount = totalFinalPrice * 0.07;
      const grandTotal = totalFinalPrice + vatAmount;

      const payload: any = {
        orderId: editOrderId,
        orderCode: editOrderCode,
        customOrderCode: customOrderCode.trim() || undefined,
        branchId: checkoutBranchId,
        subtotal: totalOriginalPrice,
        discountAmount: totalDiscountAmount,
        totalAmount: grandTotal,
        specialDiscountPercent: Number(specialDiscountPercent || 0),
        specialDiscountBaht: Number(specialDiscountBaht || 0),
        saleMode,
        shippingName: finalName,
        shippingPhone: finalPhone,
        shippingAddress: finalAddress,
        latitude: latitude,
        longitude: longitude,
        companyNameTh: companyNameTh.trim() || null,
        companyNameEn: companyNameEn.trim() || null,
        companyAddress: companyAddress.trim() || null,
        taxId: taxId.trim() || null,
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
          ? `/sale/print/dispatch/${result.orderCode}?embed=true`
          : `/manager/print/dispatch/${result.orderCode}?embed=true`

        toast.success(`ออกใบขายสำเร็จ! รหัสบิล: ${result.orderCode}`)
        
        // เด้ง Modal พิมพ์บิลแทนการเปิดแท็บใหม่
        setSuccessPrintUrl(printUrl)
        setCart([])
        setIsConfirmingClear(false)
        setShippingName('')
        setShippingPhone('')
        setShippingAddress('')
        setCompanyNameTh('')
        setCompanyNameEn('')
        setCompanyAddress('')
        setTaxId('')
        setSpecialDiscountPercent('0')
        setSpecialDiscountBaht('0')
        setCustomOrderCode('')
        setLatitude(null)
        setLongitude(null)
        setSaleMode('TAKE_AWAY')
        setIsCustomerFormOpen(false) // หดฟอร์มกลับ
        
        setEditOrderId(null)
        setEditOrderCode(null)
        setCustomOrderCode('')
        if (typeof window !== 'undefined') {
          const url = new URL(window.location.href)
          url.searchParams.delete('edit')
          window.history.replaceState({}, '', url.toString())
        }
        loadData()
      } else {
        toast.error(`เกิดข้อผิดพลาด: ${result.error}`)
        if (result.outOfStockProductIds && result.outOfStockProductIds.length > 0) {
          loadData() // Re-fetch products to reflect actual stock
          setCart(prev => prev.map(item => ({
            ...item,
            isOutOfStockError: result.outOfStockProductIds.includes(item.id.toString())
          })))
        }
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

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 w-full pb-24 lg:pb-0">
            {filteredProducts.map((product) => {
              const currentQty = getDisplayQty(product)
              return (
                <div
                  key={product.id}
                  onClick={() => handleProductClick(product)}
                  className="bg-white rounded-[20px] p-2 flex flex-col shadow-xs cursor-pointer border border-slate-100 hover:border-blue-300 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group relative"
                >
                  <div className="relative w-full aspect-square bg-slate-50 rounded-2xl overflow-hidden mb-2 flex items-center justify-center">
                    {product.image_url ? (
                      <img id={`product-img-${product.id}`} src={product.image_url} alt={product.name} className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-110" />
                    ) : (
                      <span className="text-xs text-slate-300 font-medium">ไม่มีรูป</span>
                    )}
                    <div className="absolute top-2 right-2 bg-slate-900/80 text-white text-[9px] px-1.5 py-0.5 rounded-md backdrop-blur-xs font-bold">
                      เหลือ {currentQty}
                    </div>
                  </div>
                  <div className="flex flex-col shrink-0 px-1 pb-1">
                    <h3 className="font-bold text-slate-800 text-[11px] sm:text-xs truncate w-full" title={product.name}>
                      {product.name}
                    </h3>
                    <div className="flex items-end justify-between mt-1">
                      <div className="flex flex-col">
                        {product.discount_label && (
                          <div className="flex items-center gap-1 mb-0.5">
                            <span className="text-[9px] text-slate-400 line-through">฿{product.original_price.toLocaleString()}</span>
                            <span className="text-[8px] bg-orange-50 text-orange-600 px-1 rounded font-black">{product.discount_label}</span>
                          </div>
                        )}
                        <div className="text-blue-600 font-black text-xs sm:text-sm">฿{product.price.toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 🛒 ฝั่งขวา: ตะกร้าสรุปบิล */}
        <div id="mobile-cart-section" className="w-full lg:w-[360px] shrink-0 bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col lg:sticky lg:top-6 lg:max-h-[calc(100vh-48px)] z-10">
          
          <div className="p-3 bg-slate-50 border-b border-slate-100 grid grid-cols-2 gap-2 relative rounded-t-3xl">
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
            <h2 id="cart-icon-target" className="text-sm font-bold text-slate-800 flex items-center gap-1.5 transition-transform">
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
                        setSpecialDiscountPercent('0')
                        setSpecialDiscountBaht('0')
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
                    className={`flex gap-2 p-2 border rounded-2xl transition-colors relative items-center ${
                      item.isOutOfStockError ? 'bg-red-50/70 border-red-200 shadow-sm' : 'bg-slate-50/70 border-slate-100 hover:bg-slate-50'
                    }`}
                  >
                    {item.isOutOfStockError && (
                       <span className="absolute -top-2 -right-1 bg-red-600 text-white text-[9px] px-2 py-0.5 rounded-full font-bold shadow-md z-10 animate-bounce">
                         สต็อกหมด (โดนซื้อตัดหน้า)
                       </span>
                    )}
                    {item.fulfill_branch_id !== myBranchId && (
                      <span className="absolute -top-2 -left-1 bg-orange-100 text-orange-700 border border-orange-200 text-[8px] px-1.5 py-0.5 rounded-md font-bold shadow-2xs z-10">
                        ดึง: {item.fulfill_branch_name}
                      </span>
                    )}
                    <div className="w-12 h-12 bg-white rounded-xl overflow-hidden border border-slate-100 shrink-0 flex items-center justify-center">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[8px] text-slate-300 font-medium">ไม่มีรูป</span>
                      )}
                    </div>
                    
                    <div className="flex-1 flex flex-col min-w-0">
                      <div className="flex justify-between items-start gap-1">
                        <p className="text-[11px] font-bold text-slate-700 truncate leading-tight" title={item.name}>{item.name}</p>
                        <button onClick={() => removeFromCart(item.cartItemId)} className="text-slate-300 hover:text-red-500 transition-colors shrink-0 p-0.5" title="ลบรายการนี้">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between mt-1.5">
                        <p className="text-[11px] text-blue-600 font-extrabold">{(item.price * item.quantity).toLocaleString()} ฿</p>
                        <div className="flex items-center bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden h-6">
                          <button onClick={() => updateQuantity(item.cartItemId, -1)} className="w-6 h-full flex items-center justify-center text-slate-500 font-bold hover:bg-slate-50 text-xs">-</button>
                          <span className="px-1 text-[11px] font-bold text-slate-800 min-w-[16px] text-center">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.cartItemId, 1)} className="w-6 h-full flex items-center justify-center text-slate-500 font-bold hover:bg-slate-50 text-xs">+</button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 bg-slate-50/60 border-t border-slate-100 flex flex-col justify-end">
            
            {/* ✨ ข้อมูลลูกค้าแบบย่อ (ดีไซน์มินิมอล) */}
            <div className="flex items-center justify-between py-2 border-b border-slate-200/60 text-xs">
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                  {saleMode === 'DELIVERY' ? <Truck className="w-3 h-3 text-blue-500" /> : <Store className="w-3 h-3 text-slate-500" />}
                  {saleMode === 'DELIVERY' ? 'ข้อมูลสำหรับจัดส่ง' : 'ลูกค้ารับหน้าร้าน'}
                </span>
                <span className="text-slate-700 font-semibold truncate text-[11px] mt-0.5">
                  {shippingName ? `${shippingName} (${shippingPhone})` : 'ยังไม่ได้ระบุลูกค้า'}
                </span>
                {shippingAddress && saleMode === 'DELIVERY' && (
                  <span className="text-[10px] text-slate-500 truncate">{shippingAddress}</span>
                )}
                {(companyNameTh || companyNameEn) && (
                   <span className="text-[9px] text-slate-400 mt-0.5 flex items-center gap-1">
                     <FileText className="w-2.5 h-2.5"/> ขอใบกำกับภาษี ({companyNameTh || companyNameEn})
                   </span>
                )}
              </div>
              <button 
                onClick={() => setIsCustomerFormOpen(true)}
                className="text-[10px] text-blue-600 hover:text-blue-700 font-bold px-2 py-1 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer shrink-0 ml-2"
              >
                {shippingName ? 'แก้ไข' : 'ระบุลูกค้า'}
              </button>
            </div>

            {/* ส่วนลดพิเศษแบบมินิมอล */}
            <div className="py-2 border-b border-slate-200/60 space-y-1.5 mb-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                  ส่วนลดพิเศษท้ายบิล (Special Discount)
                </span>
                {Number(specialDiscountPercent || 0) > 0 && (
                  <button 
                    onClick={() => {
                      setTargetRoundingTotal(Math.floor(totalFinalPrice * 1.07).toString())
                      setCalculatedRoundingBaht(null)
                      setIsRoundingModalOpen(true)
                    }}
                    className="text-[10px] bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-2 py-0.5 rounded flex items-center gap-1 font-semibold transition-colors animate-in fade-in zoom-in duration-200"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
                    ผู้ช่วยปัดเศษ
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center bg-white border border-slate-200 rounded-lg px-2 py-1 shadow-2xs">
                  <span className="text-[10px] text-slate-400 font-bold mr-1.5">฿</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={specialDiscountBaht}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '') {
                        setSpecialDiscountBaht('');
                      } else if (Number(val) >= 0) {
                        // Strip leading zeros unless it's a decimal starting with 0.
                        const cleanVal = val.length > 1 && val.startsWith('0') && !val.includes('.') ? val.replace(/^0+/, '') : val;
                        setSpecialDiscountBaht(cleanVal || '0');
                      }
                    }}
                    className="w-full text-xs outline-none bg-transparent font-semibold text-slate-700 p-0 border-none"
                  />
                </div>
                <div className="flex-1 flex items-center bg-white border border-slate-200 rounded-lg px-2 py-1 shadow-2xs">
                  <span className="text-[10px] text-slate-400 font-bold mr-1.5">%</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="0"
                    value={specialDiscountPercent}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '') {
                        setSpecialDiscountPercent('');
                      } else if (Number(val) >= 0 && Number(val) <= 100) {
                        const cleanVal = val.length > 1 && val.startsWith('0') && !val.includes('.') ? val.replace(/^0+/, '') : val;
                        setSpecialDiscountPercent(cleanVal || '0');
                      }
                    }}
                    className="w-full text-xs outline-none bg-transparent font-semibold text-slate-700 p-0 border-none"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5 text-xs font-semibold text-slate-500 mb-4">
              <div className="flex justify-between"><span>ยอดรวมสินค้า</span><span>{totalOriginalPrice.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿</span></div>
              {promotionDiscountAmount > 0 && <div className="flex justify-between text-orange-600"><span>ส่วนลดโปรโมชัน</span><span>- {promotionDiscountAmount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿</span></div>}
              {totalSpecialDiscountAmount > 0 && <div className="flex justify-between text-red-500"><span>ส่วนลดพิเศษ</span><span>- {totalSpecialDiscountAmount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿</span></div>}
              <div className="flex justify-between pt-1 border-t border-dashed border-slate-200"><span>ยอดก่อนภาษี (Subtotal)</span><span>{totalFinalPrice.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿</span></div>
              <div className="flex justify-between"><span>ภาษีมูลค่าเพิ่ม (VAT 7%)</span><span>{(totalFinalPrice * 0.07).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿</span></div>
              <div className="flex justify-between text-xs font-bold text-slate-800 pt-3 mt-1 border-t border-dashed border-slate-200">
                <span>ยอดสุทธิใบขาย (Grand Total)</span><span className="text-base text-blue-600 font-black">{(totalFinalPrice * 1.07).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿</span>
              </div>
            </div>

            {/* ✨ เพิ่มปุ่มเสนอราคามาไว้ตรงนี้ */}
            <div className="flex flex-col gap-2">


              <button
                onClick={handlePreCheckout}
                disabled={submitting || cart.length === 0}
                className={`w-full py-3.5 text-white rounded-xl font-bold text-xs transition-all shadow-md shadow-slate-200 disabled:opacity-40 disabled:shadow-none cursor-pointer flex items-center justify-center gap-1.5 ${editOrderId ? 'bg-orange-600 hover:bg-orange-700' : 'bg-[#1E293B] hover:bg-slate-800'}`}
              >
                {submitting ? 'กำลังบันทึกข้อมูลออเดอร์...' : (
                  editOrderId ? <><Save className="w-4 h-4" /> บันทึกการแก้ไขบิล</> : <><Save className="w-4 h-4" /> สร้างใบเสนอราคา</>
                )}
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* 🚀 Modal ข้อมูลลูกค้า */}
      {isCustomerFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className={`p-5 border-b flex justify-between items-center rounded-t-3xl ${saleMode === 'DELIVERY' ? 'bg-blue-50/50 border-blue-100' : 'bg-slate-50 border-slate-100'}`}>
              <h3 className={`font-bold text-sm flex items-center gap-1.5 ${saleMode === 'DELIVERY' ? 'text-blue-800' : 'text-slate-800'}`}>
                {saleMode === 'DELIVERY' ? <Truck className="w-5 h-5 text-blue-600" /> : <Store className="w-5 h-5 text-slate-600" />} 
                {saleMode === 'DELIVERY' ? 'ระบุข้อมูลสำหรับจัดส่ง' : 'ระบุข้อมูลลูกค้ารับหน้าร้าน'}
              </h3>
              <button onClick={() => setIsCustomerFormOpen(false)} className="text-slate-400 hover:text-slate-700 font-bold p-1 bg-white rounded-lg shadow-2xs">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-5 overflow-y-auto">
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 mb-1 block">ชื่อลูกค้า/ผู้รับ <span className="text-red-500">*</span></label>
                  <input type="text" placeholder="ระบุชื่อลูกค้า..." value={shippingName} onChange={e => setShippingName(e.target.value)} className="w-full text-xs p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:border-blue-400 focus:bg-white transition-colors" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 mb-1 block">เบอร์โทรศัพท์ติดต่อ <span className="text-red-500">*</span></label>
                  <input type="text" placeholder="ระบุเบอร์โทร..." value={shippingPhone} onChange={e => setShippingPhone(e.target.value)} className="w-full text-xs p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:border-blue-400 focus:bg-white transition-colors" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 mb-1 block">ที่อยู่จัดส่ง/ที่อยู่ลูกค้า <span className="text-red-500">*</span></label>
                  <textarea placeholder="บ้านเลขที่, ซอย, ถนน, ตำบล, อำเภอ, จังหวัด, รหัสไปรษณีย์..." value={shippingAddress} onChange={e => setShippingAddress(e.target.value)} rows={3} className="w-full text-xs p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:border-blue-400 focus:bg-white transition-colors resize-none" />
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 space-y-3">
                <h4 className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5"><FileText className="w-4 h-4 text-blue-500"/> ข้อมูลสำหรับออกใบกำกับภาษี (ถ้ามี)</h4>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 mb-1 block">ชื่อบริษัท (ภาษาไทย) <span className="text-xs font-normal text-slate-400">(ไม่บังคับ)</span></label>
                  <input type="text" placeholder="ระบุชื่อบริษัทภาษาไทย..." value={companyNameTh} onChange={e => setCompanyNameTh(e.target.value)} className="w-full text-xs p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:border-blue-400 focus:bg-white transition-colors" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 mb-1 block">ชื่อบริษัท (ภาษาอังกฤษ) <span className="text-xs font-normal text-slate-400">(ไม่บังคับ)</span></label>
                  <input type="text" placeholder="ระบุชื่อบริษัทภาษาอังกฤษ..." value={companyNameEn} onChange={e => setCompanyNameEn(e.target.value)} className="w-full text-xs p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:border-blue-400 focus:bg-white transition-colors" />
                </div>
                {(companyNameTh.trim() !== '' || companyNameEn.trim() !== '') && (
                  <>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 mb-1 block">ที่อยู่บริษัท <span className="text-red-500">*</span></label>
                      <textarea placeholder="ระบุที่อยู่บริษัทสำหรับออกใบกำกับภาษี..." value={companyAddress} onChange={e => setCompanyAddress(e.target.value)} rows={2} className="w-full text-xs p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:border-blue-400 focus:bg-white transition-colors resize-none" />
                    </div>
                    <div>
                      <div className="flex justify-between items-end mb-1">
                        <label className="text-[10px] font-bold text-slate-500 block">เลขประจำตัวผู้เสียภาษี (13 หลัก) <span className="text-xs font-normal text-slate-400">(ไม่บังคับ)</span></label>
                        <span className={`text-[9px] font-bold ${taxId.length === 13 ? 'text-emerald-500' : 'text-slate-400'}`}>{taxId.length}/13</span>
                      </div>
                      <input type="text" placeholder="ระบุเลขประจำตัวผู้เสียภาษี..." value={taxId} onChange={e => setTaxId(e.target.value.replace(/\D/g, ''))} maxLength={13} className="w-full text-xs p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:border-blue-400 focus:bg-white transition-colors" />
                    </div>
                  </>
                )}
              </div>
              
              {saleMode === 'DELIVERY' && (
                <div className="pt-4 mt-4 border-t border-slate-100 space-y-3">
                  <label className="text-[10px] font-bold text-slate-500 block">ปักหมุดแผนที่สำหรับไรเดอร์ / ขนส่ง</label>
                  {latitude && longitude ? (
                    <div className="w-full h-32 bg-slate-100 rounded-xl overflow-hidden border border-slate-200 relative shadow-inner">
                      <iframe
                        title="Mini Map Preview"
                        width="100%"
                        height="100%"
                        frameBorder="0"
                        scrolling="no"
                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${longitude-0.002},${latitude-0.002},${longitude+0.002},${latitude+0.002}&layer=mapnik&marker=${latitude},${longitude}`}
                        className="pointer-events-none" 
                      />
                      <div className="absolute bottom-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md text-[9px] font-bold text-blue-600 shadow-sm border border-blue-100">
                        พิกัดถูกบันทึกแล้ว
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-24 bg-slate-50 rounded-xl border border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 gap-2">
                      <MapPin className="w-5 h-5 text-slate-300" />
                      <span className="text-[11px] font-medium">ยังไม่ได้ปักหมุดแผนที่บน Google Maps</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowMap(true)}
                    className={`w-full flex items-center justify-center gap-1.5 p-3 text-xs font-bold rounded-xl border transition-all ${
                      latitude && longitude 
                        ? 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50' 
                        : 'bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100 hover:border-blue-300 shadow-sm'
                    }`}
                  >
                    <MapPin className="w-4 h-4" />
                    {latitude && longitude ? 'แก้ไขจุดปักหมุดแผนที่' : 'เปิดแผนที่เพื่อปักหมุดลูกค้าตอนนี้'}
                  </button>
                </div>
              )}
            </div>
            
            <div className="p-4 bg-slate-50 border-t border-slate-100 rounded-b-3xl">
              <button 
                onClick={() => {
                  setIsCustomerFormOpen(false)
                  setTimeout(() => handlePreCheckout(), 100)
                }} 
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition-colors shadow-md shadow-blue-200 cursor-pointer"
              >
                บันทึกข้อมูลและดำเนินการต่อ
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* ✨ Modal ยืนยันการสร้างใบเสนอราคา */}
      {isConfirmCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden flex flex-col p-6 items-center text-center">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4">
              <FileText className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-slate-800 text-lg mb-2">
              {editOrderId ? 'ยืนยันบันทึกการแก้ไขบิล?' : 'ยืนยันสร้างใบเสนอราคา?'}
            </h3>
            <p className="text-slate-500 text-xs mb-6 px-4 leading-relaxed">
              กรุณาตรวจสอบรายการสินค้าและยอดเงินให้ถูกต้องก่อนกดยืนยัน ระบบจะทำการบันทึกบิลและตัดสต็อกทันที
            </p>

            {!editOrderId && (
              <div className="w-full mb-6 text-left">
                <label className="text-[10px] font-bold text-slate-500 mb-1 block">รหัสออเดอร์ (ระบุเองได้ - ไม่บังคับ)</label>
                <input 
                  type="text" 
                  placeholder="เช่น INV-1234 (ลบแล้วตั้งเองได้)" 
                  value={customOrderCode}
                  onChange={e => setCustomOrderCode(e.target.value.toUpperCase().replace(/\s/g, ''))}
                  className="w-full text-xs p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:border-blue-400 focus:bg-white transition-colors uppercase font-mono" 
                />
              </div>
            )}

            <div className="flex gap-3 w-full">
              <button
                onClick={() => setIsConfirmCheckoutOpen(false)}
                className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-50 transition-all cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleCheckout}
                disabled={submitting}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition-all cursor-pointer shadow-md shadow-blue-200 flex items-center justify-center gap-1.5"
              >
                {submitting ? 'กำลังบันทึก...' : <><Save className="w-4 h-4" /> ยืนยันสร้าง</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✨ Modal แสดงใบเสนอราคาแบบ Iframe กลางจอ */}
      {successPrintUrl && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 md:p-8">
          <div className="bg-white w-full max-w-4xl h-full max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Printer className="w-4 h-4 text-blue-600" /> เอกสารการขาย
              </h3>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => {
                    const iframe = document.getElementById('print-iframe') as HTMLIFrameElement;
                    if (iframe && iframe.contentWindow) {
                      iframe.contentWindow.print();
                    }
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-4 rounded-lg text-xs transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" /> สั่งพิมพ์
                </button>
                <button 
                  onClick={() => setSuccessPrintUrl(null)} 
                  className="text-slate-400 hover:text-red-500 font-bold bg-white w-8 h-8 rounded-full flex items-center justify-center shadow-sm border border-slate-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 w-full bg-slate-200 overflow-hidden relative">
              <iframe 
                id="print-iframe"
                src={successPrintUrl} 
                className="w-full h-full absolute inset-0 border-none"
                title="Print Preview"
              />
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

      {/* ✨ Modal ผู้ช่วยปัดเศษ */}
      {isRoundingModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-indigo-50/50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <span className="text-indigo-500 bg-white p-1.5 rounded-lg shadow-sm">✨</span>
                ผู้ช่วยปัดเศษยอดสุทธิ
              </h3>
              <button onClick={() => setIsRoundingModalOpen(false)} className="text-slate-400 hover:text-slate-600 bg-white hover:bg-slate-50 p-1.5 rounded-lg transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
            
            <div className="p-5 space-y-5 overflow-y-auto">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="text-xs text-slate-500 font-semibold mb-1">ยอดสุทธิปัจจุบัน (รวม VAT)</div>
                <div className="text-2xl font-black text-slate-800">
                  {(totalFinalPrice * 1.07).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-sm font-medium text-slate-500">฿</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 block">
                  คุณต้องการปัดเศษให้เหลือเท่าไหร่?
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={targetRoundingTotal}
                    onChange={(e) => setTargetRoundingTotal(e.target.value)}
                    className="w-full text-lg font-bold text-indigo-700 bg-white border-2 border-indigo-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                    placeholder="เช่น 4980"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">฿</div>
                </div>
                <p className="text-[10px] text-slate-500 font-medium">แนะนำ: กรอกตัวเลขกลมๆ ที่ต้องการ เช่น 4900 หรือ 4980</p>
              </div>

              {targetRoundingTotal && Number(targetRoundingTotal) > 0 && (
                <div className="pt-4 border-t border-slate-100">
                  {(() => {
                    const target = Number(targetRoundingTotal);
                    const currentGrandTotal = totalFinalPrice * 1.07;
                    const D = currentGrandTotal - target;
                    const percent = Number(specialDiscountPercent || 0);
                    const currentBaht = Number(specialDiscountBaht || 0);
                    
                    if (D <= 0 && target !== currentGrandTotal) {
                      return (
                        <div className="text-xs text-rose-500 bg-rose-50 p-3 rounded-lg font-medium flex items-start gap-2">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
                          ยอดเป้าหมายต้องน้อยกว่ายอดปัจจุบันครับ
                        </div>
                      );
                    }

                    // Delta = D / ((1 - percent / 100) * 1.07)
                    const delta = D / ((1 - percent / 100) * 1.07);
                    const newBaht = currentBaht + delta;
                    // Format to 5 decimal places for precision, but strip trailing zeros
                    const newBahtFormatted = parseFloat(newBaht.toFixed(5));
                    
                    // Notify parent component safely in a timeout or effect, but here we just render
                    // We'll update the state when "Apply" is clicked.
                    
                    return (
                      <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                        <div className="text-xs text-emerald-700 font-bold mb-2 flex items-center gap-1.5">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>
                          ระบบคำนวณสำเร็จ!
                        </div>
                        <div className="text-sm text-emerald-800 font-medium leading-relaxed mb-3">
                          เพื่อให้ยอดสุทธิเป็น <span className="font-bold underline decoration-emerald-300 decoration-2 underline-offset-2">{target.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿</span><br/>
                          คุณต้องให้ส่วนลด <span className="font-bold">(ก่อนรวมภาษี)</span> เป็นจำนวน:
                        </div>
                        <div className="text-2xl font-black text-emerald-600 bg-white rounded-lg px-4 py-2 border border-emerald-100 shadow-sm text-center mb-4">
                          {newBahtFormatted} ฿
                        </div>
                        
                        <div className="bg-white/60 p-3 rounded-lg border border-emerald-100/50 mb-4">
                          <p className="text-[10px] text-emerald-700 font-bold mb-1 flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                            ทำไมตัวเลขส่วนลดถึงมีเศษสตางค์?
                          </p>
                          <p className="text-[10px] text-emerald-600/90 leading-relaxed">
                            เพื่อความถูกต้องตามหลักบัญชีสรรพากร ส่วนลดจะต้องถูกหักออก <span className="font-bold underline">ก่อน</span> คิดภาษี (VAT 7%) เสมอ ระบบจึงช่วยคำนวณส่วนลดก่อนภาษีที่แม่นยำที่สุดให้ เพื่อให้ยอดสุทธิออกมาลงตัวตรงใจคุณพอดีครับ
                          </p>
                        </div>
                        
                        <button
                          onClick={() => {
                            setSpecialDiscountBaht(newBahtFormatted.toString());
                            setIsRoundingModalOpen(false);
                          }}
                          className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-4 rounded-lg shadow-sm shadow-emerald-200 transition-colors flex items-center justify-center gap-2"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7"/></svg>
                          ใช้ตัวเลขนี้ (Apply)
                        </button>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 📱 ปุ่มลอยสำหรับมือถือ (เลื่อนลงไปตะกร้า) */}
      <div className="lg:hidden fixed bottom-6 right-6 z-40">
        <button 
          onClick={() => {
            const cartEl = document.getElementById('mobile-cart-section');
            if (cartEl) {
              cartEl.scrollIntoView({ behavior: 'smooth' });
            }
          }} 
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-2xl flex items-center justify-center relative transition-transform active:scale-95"
        >
          <Receipt className="w-6 h-6" />
          {cart.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-[#F4F7F9] shadow-sm">
              {cart.length}
            </span>
          )}
        </button>
      </div>

    </div>
  )
}