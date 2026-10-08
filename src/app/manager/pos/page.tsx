"use client"

import { useState, useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { getPosData, processCheckout, CheckoutPayload, getNearbyStock, getOrderForEdit, PosSetBundle, validatePosCoupon, updateProductPrice } from '@/actions/pos'
import { FolderOpen, Store, Truck, Receipt, MapPin, Save, AlertTriangle, X, Plus, Minus, FileText, Trash2, Printer, RefreshCw, Clock, Menu, Sparkles, Ticket, SlidersHorizontal, Armchair, Tag, Edit3 } from 'lucide-react'
import { toast } from 'sonner'
import StorefrontFilterDrawer from '@/components/pos/StorefrontFilterDrawer'
import StorefrontFilterBar from '@/components/pos/StorefrontFilterBar'
import ExternalProductModal from '@/components/pos/ExternalProductModal'
import {
  matchesStorefrontCategory,
  productColorValues,
  productMaterialValues,
  productMatchesDimensions,
  getPosColorOptions,
  getPosMaterialOptions,
  getStorefrontCategoryOrder,
  DimensionFilter,
  EMPTY_DIMENSION_FILTER,
  hasActiveDimensions
} from '@/lib/propFilterModel'

// โหลด Component แผนที่แบบไม่ทำ SSR
const MapPicker = dynamic(() => import('@/components/MapPicker'), { ssr: false })

interface Branch { id: number; branch_name: string }
interface Product {
  id: number; name: string; sku: string; original_price: number; price: number;
  discount_label: string; image_url: string | null; barcode: string | null;
  product_sup: string | null; stocks: { branch_id: number, qty: number }[];
  discount_id?: number | null;
  discount_name?: string | null;
  specs?: any;
  category_id?: string;
  isExternal?: boolean;
  isFurniture?: boolean;
}

interface CartItem extends Product {
  cartItemId: string;
  quantity: number;
  fulfill_branch_id: number;
  fulfill_branch_name: string;
  isOutOfStockError?: boolean;
  isExternal?: boolean;
  isFurniture?: boolean;
}

interface NestedCategory {
  parent: string;
  hasChildren: boolean;
  children: { fullText: string; subText: string }[];
}

export default function ManagerPOSPage() {
  const [branches, setBranches] = useState<Branch[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [sets, setSets] = useState<PosSetBundle[]>([])
  const [loadingDb, setLoadingDb] = useState(true)

  const [nestedCategories, setNestedCategories] = useState<NestedCategory[]>([])
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    'DECORATIVE': true,
    'DOLL': true,
    'WALL ART': true,
  })

  // 🛋️ State สำหรับโมดอลเพิ่มสินค้านอก & เฟอร์นิเจอร์
  const [isExternalModalOpen, setIsExternalModalOpen] = useState(false)

  // 🧭 State สำหรับลิ้นชักเมนูเดิม (ห้ามแตะต้อง)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  // 🛍️ State สำหรับฟิลเตอร์หน้าบ้าน (Storefront Filter)
  const [isStorefrontDrawerOpen, setIsStorefrontDrawerOpen] = useState(false)
  const [storefrontDrawerPanel, setStorefrontDrawerPanel] = useState<'category' | 'color' | 'material' | 'size'>('category')
  const [storefrontCategory, setStorefrontCategory] = useState<string>('All')
  const [selectedColors, setSelectedColors] = useState<string[]>([])
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([])
  const [dimensionFilter, setDimensionFilter] = useState<DimensionFilter>(EMPTY_DIMENSION_FILTER)

  const hasActiveStorefrontFilters = useMemo(() => {
    return (
      (storefrontCategory !== 'All' && storefrontCategory !== 'ALL') ||
      selectedColors.length > 0 ||
      selectedMaterials.length > 0 ||
      hasActiveDimensions(dimensionFilter)
    )
  }, [storefrontCategory, selectedColors, selectedMaterials, dimensionFilter])

  const [myBranchId, setMyBranchId] = useState<number>(1)
  const [selectedLocation, setSelectedLocation] = useState<number | 'ALL'>('ALL')
  const [selectedCategory, setSelectedCategory] = useState<string | 'ALL'>('ALL')
  const [displayLimit, setDisplayLimit] = useState<number>(48)

  const [searchQuery, setSearchQuery] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])

  // 🎟️ State สำหรับโค้ดคูปอง
  const [couponInput, setCouponInput] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<{
    id: any;
    code: string;
    title: string;
    discountType: 'percentage' | 'fixed_amount' | string;
    discountValue: number;
    discountAmount: number;
    attribution?: {
      leadSales?: string;
      partnerCompany?: string;
      partnerSales?: string;
      note?: string;
    } | null;
  } | null>(null)
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false)

  // ตัวเลือกสีและวัสดุที่คำนวณจากสินค้าจริงในหน้านี้
  const storefrontColorOptions = useMemo(() => {
    return getPosColorOptions(products, storefrontCategory)
  }, [products, storefrontCategory])

  const storefrontMaterialOptions = useMemo(() => {
    return getPosMaterialOptions(products, storefrontCategory)
  }, [products, storefrontCategory])

  useEffect(() => {
    setDisplayLimit(48)
  }, [searchQuery, selectedCategory, storefrontCategory, selectedColors, selectedMaterials, dimensionFilter, selectedLocation])
  const [submitting, setSubmitting] = useState(false)
  const [isConfirmingClear, setIsConfirmingClear] = useState(false)
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false)

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
  const [shippingCost, setShippingCost] = useState<string>('') // 🚚 ค่าจัดส่ง / ค่าบริการส่ง
  const [waiveShippingFee, setWaiveShippingFee] = useState<boolean>(true) // 🚚 ยกเว้นค่าส่งเมื่อยอดครบ 20,000฿
  const [isCustomerFormOpen, setIsCustomerFormOpen] = useState(false) // ซ่อนฟอร์มไว้ก่อน ประหยัดที่!
  
  // ✨ State สำหรับโมดอลส่วนลดและคูปอง
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false)
  
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

  // 🏷️ State สำหรับ Modal กำหนดราคาขายสินค้าลงฐานข้อมูลจริง
  const [priceModal, setPriceModal] = useState<{
    isOpen: boolean;
    product: Product | null;
    initialPrice: string;
    fulfillBranchId?: number;
    customQty?: number;
    cartItemId?: string | null;
  }>({
    isOpen: false,
    product: null,
    initialPrice: '',
    cartItemId: null
  })
  const [modalInputPrice, setModalInputPrice] = useState<string>('')
  const [isSavingPrice, setIsSavingPrice] = useState(false)

  const openSetPriceModal = (product: Product, cartItemId: string | null = null, fulfillBranchId?: number, qty = 1) => {
    const rawPrice = product.price > 0 ? String(product.price) : ''
    setPriceModal({
      isOpen: true,
      product,
      initialPrice: rawPrice,
      fulfillBranchId,
      customQty: qty,
      cartItemId
    })
    setModalInputPrice(rawPrice)
  }

  const handleSaveProductPrice = async () => {
    if (!priceModal.product) return
    const numPrice = Number(modalInputPrice)
    if (isNaN(numPrice) || numPrice <= 0) {
      toast.error('กรุณาระบุราคาขายที่มากกว่า 0 บาทครับ')
      return
    }

    setIsSavingPrice(true)
    try {
      const res = await updateProductPrice(priceModal.product.id, numPrice)
      if (!res.success) {
        toast.error(res.error || 'บันทึกราคาไม่สำเร็จ')
        setIsSavingPrice(false)
        return
      }

      toast.success(res.message || `บันทึกราคา ฿${numPrice.toLocaleString()} สำเร็จ`)

      const targetId = priceModal.product.id
      const updatedProduct = {
        ...priceModal.product,
        price: numPrice,
        original_price: numPrice
      }

      // 1. อัปเดตรายการสินค้าหน้าร้าน (products)
      setProducts(prev => prev.map(p => p.id === targetId ? { ...p, price: numPrice, original_price: numPrice } : p))

      // 2. ถ้ามีอยู่ในตะกร้าแล้ว (cartItemId) -> อัปเดตราคาในตะกร้าทันที
      if (priceModal.cartItemId) {
        setCart(prev => prev.map(item => {
          if (item.cartItemId === priceModal.cartItemId || item.id === targetId) {
            return {
              ...item,
              price: numPrice,
              original_price: numPrice
            }
          }
          return item
        }))
      } else {
        // 3. ถ้ายังไม่เคยอยู่ในตะกร้า -> ดึงลงตะกร้าด้วยราคาใหม่ทันที
        await addToCart(updatedProduct, priceModal.customQty || 1, priceModal.fulfillBranchId, false)
      }

      setPriceModal({ isOpen: false, product: null, initialPrice: '', cartItemId: null })
    } catch (err: any) {
      toast.error('เกิดข้อผิดพลาด: ' + (err.message || String(err)))
    } finally {
      setIsSavingPrice(false)
    }
  }

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
       setCustomOrderCode(res.order.order_code)
       
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
        if (res.order.discount_snapshot?.shipping_cost !== undefined && res.order.discount_snapshot?.shipping_cost !== null) {
          setShippingCost(res.order.discount_snapshot.shipping_cost.toString())
          if (res.order.discount_snapshot?.shipping_waived !== undefined) {
            setWaiveShippingFee(Boolean(res.order.discount_snapshot.shipping_waived))
          }
        } else {
          setShippingCost('')
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

  }, [])

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

  async function loadData(isInitial = false, forceRefresh = false) {
    if (isInitial) setLoadingDb(true)
    const res = await getPosData(forceRefresh)
    if (res.success && res.products && res.branches) {
      setProducts(res.products)
      setBranches(res.branches)
      if (res.sets) setSets(res.sets)
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

  const addToCart = async (product: Product, customQty = 1, customFulfillBranchId?: number, forceAdd = false) => {
    const targetBranchId = customFulfillBranchId !== undefined
      ? customFulfillBranchId
      : (selectedLocation === 'ALL' ? myBranchId : selectedLocation)

    // 🏷️ กฎบังคับ: ถ้าสินค้ามีราคา 0 ฿ หรือยังไม่ได้ตั้งราคา ต้องให้เซลตั้งราคาก่อนเสมอ และบันทึกลงฐานข้อมูลจริง!
    if (!product.price || Number(product.price) <= 0) {
      openSetPriceModal(product, null, targetBranchId, customQty)
      return
    }

    const branchStock = product.stocks?.find(s => s.branch_id === targetBranchId)
    const availableQty = branchStock ? Number(branchStock.qty) : 0
    const totalStock = product.stocks ? product.stocks.reduce((sum, s) => sum + Number(s.qty), 0) : 0

    const cartItemId = `${product.id}-${targetBranchId}`
    const existing = cart.find((item) => item.cartItemId === cartItemId)
    const currentInCart = existing ? existing.quantity : 0

    // ถ้าเป็นสินค้านอก หรือ เฟอร์นิเจอร์ ไม่ต้องบล็อกสต็อกหน้าร้าน
    const isExemptStock = Boolean(product.isExternal || product.isFurniture || product.category_id === 'furniture')

    // ถ้าสต็อกในสาขาหมด หรือหยิบจนเกินสต็อกที่มี (เฉพาะสินค้าทั่วไป)
    if (!forceAdd && !isExemptStock && (availableQty <= 0 || currentInCart >= availableQty)) {
      if (totalStock > 0 && totalStock > currentInCart) {
        setNearbyModal({ isOpen: true, product, nearbyStocks: [], isLoading: true })
        const res = await getNearbyStock(product.id, targetBranchId)
        if (res.success && res.data && res.data.length > 0) {
          setNearbyModal({ isOpen: true, product, nearbyStocks: res.data, isLoading: false })
          return
        }
      }
      // หากไม่มีสต็อกในสาขาอื่น หรือสต็อกเป็น 0 ทุกสาขา อนุญาตให้ดึงลงตะกร้าสำหรับทำใบเสนอราคา
      toast.info('เพิ่มสินค้าลงตะกร้าแล้ว (สต็อก 0 สำหรับออกใบเสนอราคา)')
    }

    // 🚀 สต็อกพอ หรือออกใบเสนอราคา ดึงลงตะกร้าปกติ พร้อมเล่นแอนิเมชัน
    triggerCartAnimation(product.id)

    const branchName = branches.find(b => b.id === targetBranchId)?.branch_name || 'สาขาหลัก'

    setCart((prevCart) => {
      if (existing) {
        return prevCart.map((item) =>
          item.cartItemId === cartItemId ? { ...item, quantity: item.quantity + customQty } : item
        )
      }
      return [...prevCart, {
        ...product,
        cartItemId,
        quantity: customQty,
        fulfill_branch_id: targetBranchId,
        fulfill_branch_name: branchName,
        isExternal: Boolean(product.isExternal),
        isFurniture: Boolean(product.isFurniture || product.category_id === 'furniture')
      }]
    })
  }

  const handleSelectNearbyBranch = (stockData: any) => {
    if (!nearbyModal.product) return

    const fulfillBranchId = stockData.branch_id
    const fulfillBranchName = stockData.branch_name || 'สาขาอื่น'
    const maxQty = stockData.available_qty ?? stockData.qty ?? stockData.quantity ?? 0

    const product = nearbyModal.product

    // 🏷️ ตรวจสอบราคา 0 ก่อนดึงข้ามสาขา
    if (!product.price || Number(product.price) <= 0) {
      setNearbyModal({ isOpen: false, product: null, nearbyStocks: [], isLoading: false })
      openSetPriceModal(product, null, fulfillBranchId, 1)
      return
    }
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
          const newQty = item.quantity + delta
          const isExemptStock = Boolean(item.isExternal || item.isFurniture || item.category_id === 'furniture')
          const branchStock = item.stocks?.find(s => s.branch_id === item.fulfill_branch_id)
          const actualQty = branchStock ? Number(branchStock.qty) : 0
          if (newQty > 0) {
            if (!isExemptStock && actualQty > 0 && newQty > actualQty && delta > 0) {
              toast.info(`มีสต็อกพร้อมส่ง ${actualQty} ชิ้น (จำนวนที่เกินจะออกเป็นใบเสนอราคา)`)
            }
            return { ...item, quantity: newQty }
          }
          return null
        }
        return item
      }).filter(Boolean) as CartItem[]
    )
  }

  const removeFromCart = (cartItemId: string) => setCart((prev) => prev.filter((item) => item.cartItemId !== cartItemId))

  // 📦 ฟังก์ชันหยิบทั้งเซ็ตลงตะกร้าในคลิกเดียว (จัดการ Cross-Branch อัตโนมัติ ไม่เด้ง Modal ขัดจังหวะ)
  const addSetToCart = (bundle: PosSetBundle) => {
    if (!bundle.items || bundle.items.length === 0) {
      toast.warning("เซ็ตนี้ไม่มีรายการสินค้า")
      return
    }

    let addedCount = 0
    let hasCrossBranch = false
    const outOfStockNames: string[] = []

    setCart((prevCart) => {
      let nextCart = [...prevCart]

      for (const product of bundle.items) {
        // ข้ามสินค้าที่ราคา <= 0 (ยังไม่ระบุราคา หรือไม่ใช่สินค้าพร้อมขาย)
        if (Number(product.price) <= 0 && Number(product.original_price) <= 0) {
          outOfStockNames.push(product.name || product.sku)
          continue
        }

        const myStock = product.stocks?.find((s: any) => s.branch_id === myBranchId)
        const myQty = myStock ? Number(myStock.qty) : 0

        let targetBranchId = myBranchId
        let targetBranchName = branches.find(b => b.id === myBranchId)?.branch_name || 'สาขาเรา'

        const myCartItemId = `${product.id}-${myBranchId}`
        const inMyCart = nextCart.find(it => it.cartItemId === myCartItemId)?.quantity || 0

        // ถ้าสาขาเราไม่มีของ (0) หรือของในตะกร้าถึงยอดสต็อกสาขาเราแล้ว -> หาสาขาอื่นที่มีสต็อก
        if (myQty <= 0 || inMyCart >= myQty) {
          const otherStocks = (product.stocks || [])
            .filter((s: any) => s.branch_id !== myBranchId && Number(s.qty) > 0)
            .sort((a: any, b: any) => Number(b.qty) - Number(a.qty))

          let foundBranch = false
          for (const os of otherStocks) {
            const osCartItemId = `${product.id}-${os.branch_id}`
            const inOsCart = nextCart.find(it => it.cartItemId === osCartItemId)?.quantity || 0
            if (inOsCart < Number(os.qty)) {
              targetBranchId = os.branch_id
              targetBranchName = branches.find(b => b.id === os.branch_id)?.branch_name || `สาขา #${os.branch_id}`
              hasCrossBranch = true
              foundBranch = true
              break
            }
          }

          if (!foundBranch) {
            // หมดสต็อกทุกสาขาทั่วประเทศ
            outOfStockNames.push(product.name || product.sku)
            continue
          }
        }

        const cartItemId = `${product.id}-${targetBranchId}`
        const existingIdx = nextCart.findIndex(it => it.cartItemId === cartItemId)

        if (existingIdx >= 0) {
          nextCart[existingIdx] = {
            ...nextCart[existingIdx],
            quantity: nextCart[existingIdx].quantity + 1
          }
        } else {
          nextCart.push({
            ...product,
            cartItemId,
            quantity: 1,
            fulfill_branch_id: targetBranchId,
            fulfill_branch_name: targetBranchName
          })
        }
        addedCount++
      }

      return nextCart
    })

    if (hasCrossBranch) {
      setSaleMode('DELIVERY')
    }

    if (addedCount > 0) {
      if (outOfStockNames.length > 0) {
        toast.warning(`หยิบเซ็ต "${bundle.name}" สำเร็จ ${addedCount} ชิ้น (ข้าม ${outOfStockNames.length} ชิ้นที่หมดสต็อกหรือยังไม่ระบุราคา)`)
      } else {
        toast.success(`🎉 เพิ่มเซ็ต "${bundle.name}" (${addedCount} ชิ้น) ลงในบิลแล้ว!`)
      }
      if (hasCrossBranch) {
        toast.info('📍 มีการดึงสต็อกข้ามสาขา จึงเปลี่ยนเป็นโหมด "ให้ร้านส่งให้" อัตโนมัติ')
      }
    } else {
      toast.error('สินค้าในเซ็ตนี้หมดสต็อกทุกสาขา ไม่สามารถเพิ่มได้ครับ!')
    }
  }

  // ✨ คำนวณเซ็ตโปรโมชั่นที่ครบในตะกร้าอัตโนมัติ (เฉพาะสินค้าพร้อมขายในเซ็ต)
  const completedSetPromotions = useMemo(() => {
    if (cart.length === 0 || sets.length === 0) return []

    const cartQtyMap = new Map<number, number>()
    cart.forEach(item => {
      cartQtyMap.set(item.id, (cartQtyMap.get(item.id) || 0) + item.quantity)
    })

    const results: {
      set: PosSetBundle;
      completedSetsCount: number;
      eligibleTotal: number;
      discountAmount: number;
    }[] = []

    for (const s of sets) {
      if (!s.items || s.items.length === 0) continue

      // ตรวจสอบเฉพาะสินค้าที่มีราคา > 0 (สินค้าพร้อมขายจริง)
      const sellableItems = s.items.filter((it: any) => Number(it.price) > 0)
      if (sellableItems.length === 0) continue

      let possibleSets = Infinity
      let eligibleItemPriceSum = 0

      for (const reqItem of sellableItems) {
        const inCartQty = cartQtyMap.get(reqItem.id) || 0
        possibleSets = Math.min(possibleSets, inCartQty)
        eligibleItemPriceSum += Number(reqItem.price || reqItem.original_price || 0)
      }

      if (possibleSets > 0 && possibleSets !== Infinity) {
        const percent = s.discountPercent || 0
        let discount = 0

        if (percent > 0) {
          discount = Math.round((eligibleItemPriceSum * possibleSets * percent) / 100)
        } else if (s.discountAmount > 0) {
          discount = s.discountAmount * possibleSets
        }

        results.push({
          set: s,
          completedSetsCount: possibleSets,
          eligibleTotal: eligibleItemPriceSum * possibleSets,
          discountAmount: discount
        })
      }
    }

    return results
  }, [cart, sets])

  const totalSetDiscountAmount = useMemo(() => {
    return completedSetPromotions.reduce((sum, sp) => sum + sp.discountAmount, 0)
  }, [completedSetPromotions])

  const totalOriginalPrice = cart.reduce((sum, item) => sum + item.original_price * item.quantity, 0)
  const totalFinalPriceBeforeSpecial = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const promotionDiscountAmount = totalOriginalPrice - totalFinalPriceBeforeSpecial

  // 🏷️ ยอดสินค้าที่ไม่มีส่วนลดรายชิ้น (มีสิทธิ์เข้าร่วมโค้ดลด ตามกฎ: สินค้าที่ลดรายชิ้นแล้วจะไม่ร่วมโค้ดลด)
  const eligibleForCouponSubtotal = useMemo(() => {
    return cart
      .filter(item => {
        const hasItemDiscount = Boolean(item.discount_id) || Boolean(item.discount_label) || (item.original_price > item.price)
        return !hasItemDiscount
      })
      .reduce((sum, item) => sum + (item.price * item.quantity), 0)
  }, [cart])

  // 🎟️ ฟังก์ชันตรวจสอบและใช้โค้ดคูปอง
  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) {
      toast.warning("กรุณากรอกรหัสคูปอง")
      return
    }

    if (cart.length === 0) {
      toast.warning("ยังไม่มีสินค้าในบิล")
      return
    }

    if (eligibleForCouponSubtotal <= 0) {
      toast.error("สินค้าทุกชิ้นในบิลมีส่วนลดรายชิ้นอยู่แล้ว จึงไม่สามารถใช้โค้ดลดร่วมได้ครับ")
      return
    }

    setIsValidatingCoupon(true)
    const currentSubtotal = Math.max(0, totalFinalPriceBeforeSpecial - totalSetDiscountAmount)
    const res = await validatePosCoupon(couponInput.trim(), currentSubtotal, eligibleForCouponSubtotal)
    setIsValidatingCoupon(false)

    if (res.success && res.coupon) {
      setAppliedCoupon(res.coupon)
      setCouponInput('')
      const attrInfo = res.coupon.attribution?.partnerCompany
        ? ` (${res.coupon.attribution.partnerCompany} • เซลล์: ${res.coupon.attribution.leadSales || '-'})`
        : ''
      toast.success(`🎟️ ใช้คูปอง [${res.coupon.code}] สำเร็จ! ลดทันที ฿${res.coupon.discountAmount.toLocaleString()}${attrInfo}`)
    } else {
      toast.error(res.error || "รหัสคูปองไม่ถูกต้อง")
    }
  }

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null)
    toast.info("ยกเลิกการใช้คูปองแล้ว")
  }

  // อัปเดตมูลค่าคูปองอัตโนมัติหากสินค้าในตะกร้าเปลี่ยน (คิดเฉพาะสินค้าที่ไม่ลดรายชิ้น)
  useEffect(() => {
    if (appliedCoupon) {
      if (eligibleForCouponSubtotal <= 0) {
        setAppliedCoupon(null)
        toast.warning("ยกเลิกคูปองอัตโนมัติ เนื่องจากสินค้าในบิลมีส่วนลดรายชิ้นทั้งหมดแล้ว")
        return
      }
      if (appliedCoupon.discountType === 'percentage') {
        const newDiscount = Math.round((eligibleForCouponSubtotal * appliedCoupon.discountValue) / 100)
        setAppliedCoupon(prev => prev ? { ...prev, discountAmount: newDiscount } : null)
      } else {
        const newDiscount = Math.min(eligibleForCouponSubtotal, appliedCoupon.discountValue)
        setAppliedCoupon(prev => prev ? { ...prev, discountAmount: newDiscount } : null)
      }
    }
  }, [eligibleForCouponSubtotal])

  const couponDiscountAmount = appliedCoupon ? appliedCoupon.discountAmount : 0

  // หักโปรโมชั่นเซ็ต และคูปอง ก่อนคำนวณส่วนลดพิเศษท้ายบิล
  const priceAfterPromos = Math.max(0, totalFinalPriceBeforeSpecial - totalSetDiscountAmount - couponDiscountAmount)

  const discountBaht = Number(specialDiscountBaht || 0)
  const discountPercent = Number(specialDiscountPercent || 0)
  const afterBaht = Math.max(0, priceAfterPromos - discountBaht)
  const discountPercentAmount = afterBaht * (discountPercent / 100)
  const totalSpecialDiscountAmount = discountBaht + discountPercentAmount

  const totalFinalPrice = Math.max(0, Math.round(afterBaht - discountPercentAmount))
  const totalDiscountAmount = promotionDiscountAmount + totalSetDiscountAmount + couponDiscountAmount + totalSpecialDiscountAmount
  const isOrderOver20k = totalFinalPrice >= 20000
  const isShippingWaived = isOrderOver20k && waiveShippingFee
  const deliveryFee = Number(shippingCost) || 0
  const deliveryFeeCharged = isShippingWaived ? 0 : deliveryFee
  const grandTotal = totalFinalPrice + deliveryFeeCharged

  const handlePreCheckout = () => {
    if (cart.length === 0) return

    // 🏷️ กฎเหล็ก: บล็อกการสร้างใบเสนอราคาหากมีสินค้าที่ราคาเป็น 0 ฿
    const zeroPriceItem = cart.find(item => !item.price || Number(item.price) <= 0)
    if (zeroPriceItem) {
      toast.error(`ไม่สามารถสร้างใบเสนอราคาได้: สินค้า "${zeroPriceItem.name}" มีราคาเป็น 0 ฿ กรุณาตั้งราคาก่อนครับ`)
      openSetPriceModal(zeroPriceItem, zeroPriceItem.cartItemId, zeroPriceItem.fulfill_branch_id, zeroPriceItem.quantity)
      return
    }

    if (grandTotal <= 0) {
      toast.error("ไม่สามารถสร้างใบเสนอราคาได้: ยอดสุทธิของใบเสนอราคาต้องมากกว่า 0 บาทครับ")
      return
    }

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

    // 🏷️ กฎเหล็ก: ตรวจสอบซ้ำตอนกดยืนยันชำระ/ออกบิล
    const zeroPriceItem = cart.find(item => !item.price || Number(item.price) <= 0)
    if (zeroPriceItem) {
      toast.error(`ไม่สามารถสร้างใบเสนอราคาได้: สินค้า "${zeroPriceItem.name}" มีราคาเป็น 0 ฿ กรุณาตั้งราคาก่อนครับ`)
      openSetPriceModal(zeroPriceItem, zeroPriceItem.cartItemId, zeroPriceItem.fulfill_branch_id, zeroPriceItem.quantity)
      return
    }

    if (grandTotal <= 0) {
      toast.error("ไม่สามารถสร้างใบเสนอราคาได้: ยอดสุทธิของใบเสนอราคาต้องมากกว่า 0 บาทครับ")
      return
    }

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

      const vatAmount = grandTotal - (grandTotal / 1.07);

      const payload: any = {
        orderId: editOrderId,
        orderCode: editOrderCode,
        customOrderCode: customOrderCode.trim() || undefined,
        branchId: checkoutBranchId,
        subtotal: totalOriginalPrice,
        discountAmount: totalDiscountAmount,
        totalAmount: grandTotal,
        shippingCost: deliveryFee,
        shippingWaived: isShippingWaived,
        specialDiscountPercent: Number(specialDiscountPercent || 0),
        specialDiscountBaht: Number(specialDiscountBaht || 0),
        couponCode: appliedCoupon?.code || null,
        couponDiscountAmount: couponDiscountAmount,
        couponAttribution: appliedCoupon?.attribution || null,
        setDiscountAmount: totalSetDiscountAmount,
        appliedSetPromos: completedSetPromotions.map(sp => ({
          setId: sp.set.id,
          setName: sp.set.name,
          completedCount: sp.completedSetsCount,
          discountAmount: sp.discountAmount,
          promoTitle: sp.set.promoTitle
        })),
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
          discountAmountPerPiece: item.original_price - item.price,
          isExternal: Boolean(item.isExternal),
          isFurniture: Boolean(item.isFurniture || item.category_id === 'furniture')
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
        setAppliedCoupon(null)
        setCouponInput('')
        setIsConfirmingClear(false)
        setShippingName('')
        setShippingPhone('')
        setShippingAddress('')
        setShippingCost('')
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
        setIsMobileCartOpen(false) // ปิดตะกร้ามุมมองมือถือ
        
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
          const outOfStockIds = result.outOfStockProductIds
          loadData() // Re-fetch products to reflect actual stock
          setCart(prev => prev.map(item => ({
            ...item,
            isOutOfStockError: outOfStockIds.includes(item.id.toString())
          })))
        }
      }
    } finally {
      setSubmitting(false)
    }
  }

  const filteredProducts = products
    .filter(p => {
      const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.sku.toLowerCase().includes(searchQuery.toLowerCase())
      if (!matchSearch) return false

      // 🧭 ฟิลเตอร์หมวดหมู่เดิม (ห้ามแตะต้อง คงไว้ 100%)
      if (selectedCategory !== 'ALL' && p.product_sup !== selectedCategory) return false

      // 🛍️ ฟิลเตอร์หน้าบ้าน (Storefront Category Filter)
      if (storefrontCategory !== 'All' && storefrontCategory !== 'ALL') {
        if (!matchesStorefrontCategory(p, storefrontCategory)) return false
      }

      // กรองตามสี
      if (selectedColors.length > 0) {
        const pColors = productColorValues(p)
        const hasColor = selectedColors.some(c => pColors.includes(c))
        if (!hasColor) return false
      }

      // กรองตามวัสดุ
      if (selectedMaterials.length > 0) {
        const pMats = productMaterialValues(p)
        const hasMat = selectedMaterials.some(m => pMats.includes(m))
        if (!hasMat) return false
      }

      // กรองตามขนาด
      if (hasActiveDimensions(dimensionFilter)) {
        if (!productMatchesDimensions(p, dimensionFilter)) return false
      }
      
      // 🏢 กรองสต็อก: หากเลือกดูพรีออเดอร์ (PRE_ORDER) ให้แสดงเฉพาะสินค้าที่สต็อก 0
      if (storefrontCategory === 'PRE_ORDER') {
        const checkStock = selectedLocation !== 'ALL'
          ? (p.stocks.find(s => s.branch_id === selectedLocation)?.qty || 0)
          : p.stocks.reduce((sum, s) => sum + Number(s.qty), 0)
        if (Number(checkStock) > 0) return false
      }

      return true
    })
    .sort((a, b) => {
      // 🎨 อัลกอริทึมจัดลำดับแบบหน้าเว็บหน้าร้าน (Storefront Algorithm):
      // 🏬 อันดับ 1: สินค้าที่มีสต็อกขึ้นก่อนเสมอ ตัวที่สต็อก 0 ให้ต่อท้าย
      const targetBranch = selectedLocation === 'ALL' ? myBranchId : selectedLocation
      const aLocStock = a.stocks.find(s => s.branch_id === targetBranch)?.qty || 0
      const bLocStock = b.stocks.find(s => s.branch_id === targetBranch)?.qty || 0
      const aTotalStock = a.stocks.reduce((sum, s) => sum + Number(s.qty), 0)
      const bTotalStock = b.stocks.reduce((sum, s) => sum + Number(s.qty), 0)

      const getStockTier = (locStock: number, totalStock: number) => {
        if (selectedLocation === 'ALL') {
          return totalStock > 0 ? 0 : 1
        }
        if (locStock > 0) return 0 // มีของในสาขาเรา (พร้อมขายทันที)
        if (totalStock > 0) return 1 // มีของสาขาอื่น (ดึงสาขา)
        return 2 // สต็อกเป็น 0 ทุกสาขา (เสนอราคา)
      }

      const aTier = getStockTier(Number(aLocStock), Number(aTotalStock))
      const bTier = getStockTier(Number(bLocStock), Number(bTotalStock))

      if (aTier !== bTier) return aTier - bTier

      // 🏆 อันดับ 2: เรียงตามลำดับหมวดหมู่หน้าบ้าน (Storefront Category Hierarchy 1..9)
      const aCatOrder = getStorefrontCategoryOrder(a.product_sup)
      const bCatOrder = getStorefrontCategoryOrder(b.product_sup)
      if (aCatOrder !== bCatOrder) return aCatOrder - bCatOrder

      // 🏷️ อันดับ 3: สินค้าที่มีโปรโมชั่น/ส่วนลด ดันขึ้นมาก่อนในหมวด
      const aHasDiscount = a.discount_label ? 0 : 1
      const bHasDiscount = b.discount_label ? 0 : 1
      if (aHasDiscount !== bHasDiscount) return aHasDiscount - bHasDiscount

      // 📦 อันดับ 4: ชิ้นที่มีสต็อกเยอะกว่าขึ้นก่อน
      if (aTotalStock !== bTotalStock) {
        return bTotalStock - aTotalStock
      }

      // 🆕 อันดับ 5: สินค้าใหม่กว่า (ID มากกว่า) ขึ้นก่อน
      return b.id - a.id
    })

  if (loadingDb) return <div className="min-h-screen flex items-center justify-center font-bold text-slate-500 bg-[#F4F7F9]">กำลังโหลดข้อมูลคลังสินค้า...</div>

  return (
    <div className="min-h-screen bg-[#F4F7F9] p-0 md:p-6 mt-[-80px] md:mt-0 font-sans relative select-none">

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
          {sets.length > 0 && (
            <button
              onClick={() => { setSelectedCategory('SETS'); setIsSidebarOpen(false); }}
              className={`w-full text-left px-4 py-3 rounded-2xl font-bold text-sm transition-all mb-2 flex items-center justify-between ${
                selectedCategory === 'SETS'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                  : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'
              }`}
            >
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-500" />
                📦 สินค้าจัดเซ็ต (Sets)
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${selectedCategory === 'SETS' ? 'bg-white/20 text-white' : 'bg-purple-200 text-purple-900'}`}>
                {sets.length}
              </span>
            </button>
          )}
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
                        className={`w-full text-left px-4 py-2 text-xs font-bold uppercase transition-all relative ${selectedCategory === child.fullText ? 'text-amber-600' : 'text-slate-500 hover:text-slate-800'}`}
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

      {/* 🛍️ ลิ้นชักฟิลเตอร์หน้าบ้าน (Storefront Filter Drawer) สไตล์หน้าร้าน */}
      <StorefrontFilterDrawer
        open={isStorefrontDrawerOpen}
        initialPanel={storefrontDrawerPanel}
        activeCategory={storefrontCategory}
        selectedColors={selectedColors}
        selectedMaterials={selectedMaterials}
        dimensionFilter={dimensionFilter}
        colorOptions={storefrontColorOptions}
        materialOptions={storefrontMaterialOptions}
        onClose={() => setIsStorefrontDrawerOpen(false)}
        onCategoryChange={(cat) => setStorefrontCategory(cat)}
        onColorsChange={(colors) => setSelectedColors(colors)}
        onMaterialsChange={(mats) => setSelectedMaterials(mats)}
        onDimensionFilterChange={(dims) => setDimensionFilter(dims)}
        onResetAll={() => {
          setStorefrontCategory('All')
          setSelectedColors([])
          setSelectedMaterials([])
          setDimensionFilter(EMPTY_DIMENSION_FILTER)
        }}
      />

      {/* 🧩 โครงสร้างเนื้อหาหลัก */}
      <div className="max-w-[1600px] mx-auto flex flex-col lg:flex-row gap-6 items-start">

        <div className="flex-1 w-full flex flex-col gap-4">
          <div className="bg-white p-4 rounded-3xl shadow-xs flex flex-col gap-3 w-full sticky top-0 md:top-4 z-20">
            {/* 🌟 Row 1: เครื่องมือหลัก, ปุ่มหมวดหมู่เดิม, เซ็ตสินค้า, ค้นหา */}
            <div className="flex flex-col xl:flex-row gap-3 items-center justify-between w-full">
              <div className="flex items-center gap-2 w-full xl:w-auto overflow-hidden">
                {/* ปุ่ม Hamburger สำหรับมือถือ */}
                <button
                  type="button"
                  onClick={() => {
                    window.dispatchEvent(new Event("open-mobile-menu"));
                  }}
                  className="flex md:hidden p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full transition-all cursor-pointer shadow-xs shrink-0"
                  title="เปิดเมนูหลัก"
                >
                  <Menu className="w-4 h-4" />
                </button>

                {/* 🧭 ปุ่มเดิม: หมวดหมู่ (ห้ามแตะต้อง คงไว้ 100%) */}
                <button
                  onClick={() => setIsSidebarOpen(true)}
                  className="bg-slate-100 text-slate-700 font-bold text-xs px-3.5 py-2.5 rounded-full hover:bg-slate-200 transition-all flex items-center justify-center gap-1.5 shadow-xs flex-1 min-w-0 xl:flex-none xl:w-auto text-center truncate cursor-pointer"
                >
                  <FolderOpen className="w-3.5 h-3.5 shrink-0 text-slate-500" />
                  <span className="truncate">หมวดหมู่ {selectedCategory !== 'ALL' && `(${selectedCategory.split(' ').pop()})`}</span>
                </button>

                {/* ✨ Reload & Time (Desktop only) */}
                <div className="hidden sm:flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-full px-3 py-1.5 shrink-0 ml-auto xl:ml-0">
                  <div className="flex flex-col">
                    <span className="text-[9px] text-slate-400 font-bold flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" /> อัปเดตล่าสุด
                    </span>
                    <span className="text-[10px] text-slate-700 font-bold">
                      {lastUpdated ? lastUpdated.toLocaleString('th-TH', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'กำลังโหลด...'}
                    </span>
                  </div>
                  <button
                    onClick={() => loadData(false, true)}
                    disabled={loadingDb}
                    className="ml-1 p-1.5 bg-white border border-slate-200 text-amber-600 rounded-full hover:bg-amber-50 hover:border-amber-300 disabled:opacity-50 transition-all cursor-pointer shadow-xs"
                    title="รีโหลดข้อมูลสินค้าและสต็อกสดจากคลัง"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingDb ? 'animate-spin text-slate-400' : ''}`} />
                  </button>
                </div>

                {/* ✨ Mobile-only compact reload button */}
                <button
                  onClick={() => loadData(false, true)}
                  disabled={loadingDb}
                  className="flex sm:hidden p-2.5 bg-slate-100 hover:bg-slate-200 text-amber-600 rounded-full disabled:opacity-50 transition-all cursor-pointer shadow-xs shrink-0"
                  title="รีโหลดข้อมูลสินค้าและสต็อกสดจากคลัง"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingDb ? 'animate-spin text-slate-400' : ''}`} />
                </button>
              </div>
              
              <div className="flex items-center gap-2 w-full xl:w-auto">
                {/* 🛋️ ปุ่มใหม่: เพิ่มสินค้านอก & เฟอร์นิเจอร์ */}
                <button
                  type="button"
                  onClick={() => setIsExternalModalOpen(true)}
                  className="px-3.5 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 bg-slate-900 hover:bg-slate-800 text-white shadow-xs hover:shadow-md active:scale-95"
                  title="เพิ่มสินค้านอกแคตตาล็อก หรือเลือกสินค้าเฟอร์นิเจอร์"
                >
                  <Armchair className="w-3.5 h-3.5 text-amber-300" />
                  <span>+ สินค้านอก / เฟอร์</span>
                </button>

                {sets.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedCategory(prev => prev === 'SETS' ? 'ALL' : 'SETS')}
                    className={`px-3.5 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 shadow-2xs ${
                      selectedCategory === 'SETS'
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                        : 'bg-white border border-purple-200 text-purple-700 hover:bg-purple-50'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>สินค้าจัดเซ็ต ({sets.length})</span>
                  </button>
                )}

                <div className="w-full xl:w-72 shrink-0">
                  <input
                    type="text"
                    placeholder={selectedCategory === 'SETS' ? "ค้นหาชื่อเซ็ต หรือหมวด..." : "ค้นหาชื่อสินค้าที่นี่..."}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-5 py-2.5 bg-slate-50 rounded-full text-sm outline-none focus:bg-white focus:ring-2 focus:ring-amber-200 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* 🌟 Row 2: แถบปุ่มฟิลเตอร์สไตล์หน้าบ้าน (Storefront Filter Bar) ตรงตามเรฟภาพเป๊ะๆ */}
            <div className="w-full pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <StorefrontFilterBar
                onOpenFilter={() => {
                  setStorefrontDrawerPanel('category')
                  setIsStorefrontDrawerOpen(true)
                }}
                onOpenColor={() => {
                  setStorefrontDrawerPanel('color')
                  setIsStorefrontDrawerOpen(true)
                }}
                onOpenMaterial={() => {
                  setStorefrontDrawerPanel('material')
                  setIsStorefrontDrawerOpen(true)
                }}
                onOpenSize={() => {
                  setStorefrontDrawerPanel('size')
                  setIsStorefrontDrawerOpen(true)
                }}
                onClearFilters={() => {
                  setStorefrontCategory('All')
                  setSelectedColors([])
                  setSelectedMaterials([])
                  setDimensionFilter(EMPTY_DIMENSION_FILTER)
                }}
                hasActiveFilters={hasActiveStorefrontFilters}
                isFilterOpen={isStorefrontDrawerOpen}
                selectedCategory={storefrontCategory}
                selectedColorsCount={selectedColors.length}
                selectedMaterialsCount={selectedMaterials.length}
                hasActiveDimensions={hasActiveDimensions(dimensionFilter)}
                branches={branches}
                selectedLocation={selectedLocation}
                onSelectLocation={(loc) => {
                  setSelectedLocation(loc)
                  const bName = loc === 'ALL' ? 'ทุกสาขาทั่วประเทศ' : branches.find(b => b.id === loc)?.branch_name || 'สาขาที่เลือก'
                  toast.info(`📍 แสดงสต็อก: ${bName}`)
                }}
              />

              {/* Active Filter Badges */}
              {hasActiveStorefrontFilters && (
                <div className="flex items-center gap-1.5 shrink-0 overflow-x-auto [scrollbar-width:none] py-0.5">
                  {storefrontCategory !== 'All' && storefrontCategory !== 'ALL' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold rounded-full whitespace-nowrap">
                      หมวด: {storefrontCategory}
                    </span>
                  )}
                  {selectedColors.length > 0 && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold rounded-full whitespace-nowrap">
                      สี ({selectedColors.length})
                    </span>
                  )}
                  {selectedMaterials.length > 0 && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold rounded-full whitespace-nowrap">
                      วัสดุ ({selectedMaterials.length})
                    </span>
                  )}
                  {hasActiveDimensions(dimensionFilter) && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold rounded-full whitespace-nowrap">
                      ขนาด
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {selectedCategory === 'SETS' ? (
            /* 📦 ตารางแสดงสินค้าจัดเซ็ต (Sets Grid) */
            <div className="w-full">
              <div className="flex items-center justify-between mb-3 px-1">
                <div>
                  <h2 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    รายการสินค้าจัดเซ็ต (Sets Promotion)
                  </h2>
                  <p className="text-[11px] text-slate-400">คลิก "หยิบทั้งเซ็ตลงบิล" เพื่อเพิ่มสินค้าครบชุดลงตะกร้าพร้อมรับส่วนลดทันที</p>
                </div>
                <button
                  onClick={() => setSelectedCategory('ALL')}
                  className="text-xs text-slate-500 hover:text-slate-800 font-bold px-3 py-1 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  กลับไปสินค้าเดี่ยว
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 w-full">
                {sets
                  .filter(s => {
                    if (!searchQuery.trim()) return true
                    const q = searchQuery.toLowerCase()
                    return s.name.toLowerCase().includes(q) || s.categoryName.toLowerCase().includes(q)
                  })
                  .map((bundle) => {
                    const isCompletedInCart = completedSetPromotions.some(sp => sp.set.id === bundle.id)
                    return (
                      <div
                        key={bundle.id}
                        className={`bg-white rounded-3xl p-3.5 border transition-all duration-300 flex flex-col justify-between shadow-xs hover:shadow-xl hover:-translate-y-0.5 ${
                          isCompletedInCart ? 'border-emerald-400 ring-2 ring-emerald-200 bg-emerald-50/20' : 'border-slate-200 hover:border-purple-300'
                        }`}
                      >
                        <div>
                          {/* รูปปกเซ็ต */}
                          <div className="relative w-full aspect-video sm:aspect-square bg-slate-50 rounded-2xl overflow-hidden mb-2.5 flex items-center justify-center">
                            {bundle.imageUrl ? (
                              <img src={bundle.imageUrl} alt={bundle.name} className="object-cover w-full h-full" />
                            ) : (
                              <span className="text-xs text-slate-300 font-medium">ไม่มีรูปเซ็ต</span>
                            )}
                            <div className="absolute top-2.5 left-2.5 bg-purple-900/85 text-white text-[10px] font-bold px-2 py-0.5 rounded-lg backdrop-blur-xs flex items-center gap-1 shadow-sm">
                              <Sparkles className="w-3 h-3 text-amber-300" />
                              เซ็ต {bundle.items.length} ชิ้น
                            </div>
                            {bundle.discountPercent > 0 && (
                              <div className="absolute top-2.5 right-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-[10px] font-black px-2 py-0.5 rounded-lg shadow-sm animate-pulse">
                                ลดทันที {bundle.discountPercent}%
                              </div>
                            )}
                            {isCompletedInCart && (
                              <div className="absolute bottom-2.5 right-2.5 bg-emerald-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-md shadow-xs">
                                ✓ ในบิลครบเซ็ตแล้ว
                              </div>
                            )}
                          </div>

                          {/* ชื่อเซ็ตและหมวด */}
                          <div className="px-0.5">
                            <span className="text-[10px] text-purple-700 font-bold uppercase tracking-wider bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100 inline-block mb-1">
                              {bundle.categoryName}
                            </span>
                            <h3 className="font-extrabold text-slate-800 text-xs sm:text-sm leading-snug line-clamp-2">
                              {bundle.name}
                            </h3>
                            {bundle.promoTitle && (
                              <p className="text-[11px] text-emerald-700 font-bold mt-0.5">
                                🎉 {bundle.promoTitle}
                              </p>
                            )}
                          </div>

                          {/* สินค้าในเซ็ต */}
                          <div className="mt-2.5 p-2 bg-slate-50/80 rounded-xl border border-slate-100 space-y-1.5 max-h-36 overflow-y-auto">
                            {bundle.items.map((it: any) => {
                              const itTotalStock = (it.stocks || []).reduce((sum: number, s: any) => sum + Number(s.qty || 0), 0)
                              const itMyBranchQty = (it.stocks || []).find((s: any) => s.branch_id === myBranchId)?.qty || 0
                              const isUnpricedOrOutOfStock = Number(it.price) <= 0 || itTotalStock <= 0

                              return (
                                <div key={it.id} className="flex items-center justify-between gap-2 text-xs">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <div className="w-5 h-5 bg-white rounded-md overflow-hidden border border-slate-200 shrink-0 flex items-center justify-center">
                                      {it.image_url ? (
                                        <img src={it.image_url} alt={it.name} className="w-full h-full object-cover" />
                                      ) : (
                                        <span className="text-[6px] text-slate-300">-</span>
                                      )}
                                    </div>
                                    <span className={`text-[10px] font-medium truncate ${isUnpricedOrOutOfStock ? 'text-slate-400 line-through' : 'text-slate-700'}`} title={it.name}>
                                      {it.name}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    {isUnpricedOrOutOfStock ? (
                                      <span className="text-[8px] px-1.5 py-0.5 rounded bg-red-50 text-red-600 font-bold border border-red-100">
                                        หมดสต็อก
                                      </span>
                                    ) : itMyBranchQty > 0 ? (
                                      <span className="text-[10px] text-slate-600 font-mono font-bold">
                                        ฿{Number(it.price).toLocaleString()}
                                      </span>
                                    ) : (
                                      <span className="text-[8px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-bold border border-amber-200 flex items-center gap-0.5">
                                        <MapPin className="w-2 h-2" /> ดึงสาขา
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>

                        {/* ราคาและปุ่มสั่งทั้งเซ็ต */}
                        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                          <div className="flex flex-col">
                            {bundle.discountPercent > 0 && (
                              <span className="text-[10px] text-slate-400 line-through">
                                ฿{bundle.totalOriginalPrice.toLocaleString()}
                              </span>
                            )}
                            <div className="text-sm sm:text-base font-black text-purple-700 font-mono">
                              ฿{bundle.totalPrice.toLocaleString()}
                            </div>
                          </div>

                          {(() => {
                            const readyItemsCount = bundle.items.filter((it: any) => {
                              const itTotalStock = (it.stocks || []).reduce((sum: number, s: any) => sum + Number(s.qty || 0), 0)
                              return Number(it.price) > 0 && itTotalStock > 0
                            }).length

                            if (readyItemsCount === 0) {
                              return (
                                <button
                                  type="button"
                                  disabled
                                  className="px-3.5 py-2 bg-slate-100 text-slate-400 font-bold text-xs rounded-xl cursor-not-allowed shrink-0"
                                >
                                  สินค้าหมดสต็อก
                                </button>
                              )
                            }

                            return (
                              <button
                                type="button"
                                onClick={() => addSetToCart(bundle)}
                                className="px-3.5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-all active:scale-95 flex items-center gap-1 shrink-0"
                              >
                                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                                {readyItemsCount < bundle.items.length 
                                  ? `หยิบ ${readyItemsCount} ชิ้นพร้อมส่ง`
                                  : 'หยิบทั้งเซ็ตลงบิล'}
                              </button>
                            )
                          })()}
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>
          ) : (
            /* 📦 ตารางแสดงสินค้าเดี่ยวปกติ */
            <>
              <div className="grid grid-cols-4 md:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-4 w-full">
                {filteredProducts.slice(0, displayLimit).map((product) => {
                  const targetBranch = selectedLocation === 'ALL' ? myBranchId : selectedLocation
                  const branchStock = product.stocks.find(s => s.branch_id === targetBranch)
                  const currentBranchQty = branchStock ? Number(branchStock.qty) : 0
                  const totalStock = product.stocks.reduce((sum, s) => sum + Number(s.qty), 0)
                  return (
                    <div
                      key={product.id}
                      onClick={() => handleProductClick(product)}
                      className="bg-white rounded-[20px] p-2 flex flex-col shadow-xs cursor-pointer border border-slate-100 hover:border-amber-400 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group relative"
                    >
                      <div className="relative w-full aspect-square bg-slate-50 rounded-2xl overflow-hidden mb-2 flex items-center justify-center">
                        {product.image_url ? (
                          <img id={`product-img-${product.id}`} src={product.image_url} alt={product.name} className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-110" />
                        ) : (
                          <span className="text-xs text-slate-300 font-medium">ไม่มีรูป</span>
                        )}
                        {currentBranchQty > 0 ? (
                          <div className="absolute top-2 right-2 bg-slate-900/80 text-white text-[9px] px-1.5 py-0.5 rounded-md backdrop-blur-xs font-bold">
                            เหลือ {currentBranchQty}
                          </div>
                        ) : totalStock > 0 ? (
                          <div className="absolute top-2 right-2 bg-amber-600 text-white text-[9px] px-1.5 py-0.5 rounded-md backdrop-blur-xs font-bold shadow-xs flex items-center gap-0.5">
                            <MapPin className="w-2.5 h-2.5" /> ดึงสาขา ({totalStock})
                          </div>
                        ) : (
                          <div className="absolute top-2 right-2 bg-slate-700/80 text-white text-[9px] px-1.5 py-0.5 rounded-md backdrop-blur-xs font-bold shadow-xs">
                            เสนอราคา (0)
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col shrink-0 px-1 pb-1">
                        <h3 className="font-bold text-slate-800 text-[10px] sm:text-xs truncate w-full" title={product.name}>
                          {product.name}
                        </h3>
                        {product.specs && product.specs.material && (
                          <span className="text-[8px] text-slate-400 font-medium uppercase tracking-wider block mt-0.5 leading-none">
                            {product.specs.material}
                          </span>
                        )}
                        <div className="flex items-end justify-between mt-1">
                          <div className="flex flex-col">
                            {product.discount_label && (
                              <div className="flex items-center gap-1 mb-0.5">
                                <span className="text-[9px] text-slate-400 line-through">฿{product.original_price.toLocaleString()}</span>
                                <span className="text-[8px] bg-orange-50 text-orange-600 px-1 rounded font-black">{product.discount_label}</span>
                              </div>
                            )}
                            {Number(product.price) <= 0 ? (
                              <div className="text-rose-600 font-bold text-[10px] bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 w-fit">
                                ยังไม่ตั้งราคา (0 ฿)
                              </div>
                            ) : (
                              <div className="text-amber-700 font-black text-xs sm:text-sm">฿{product.price.toLocaleString()}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* ✨ แถบสถานะการโหลดและปุ่มโหลดเพิ่มเติมแบบประหยัด */}
              <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-white rounded-2xl border border-slate-100 shadow-2xs mt-2 mb-24 lg:mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-600 font-bold">
                    แสดง {Math.min(displayLimit, filteredProducts.length)} จาก {filteredProducts.length} รายการ ({selectedLocation === 'ALL' ? 'พร้อมส่งทุกสาขา' : branches.find(b => b.id === selectedLocation)?.branch_name || 'สาขาที่เลือก'})
                  </span>
                </div>
                {displayLimit < filteredProducts.length && (
                  <button
                    type="button"
                    onClick={() => setDisplayLimit(prev => prev + 48)}
                    className="px-6 py-2.5 bg-[#1E293B] hover:bg-slate-800 text-white rounded-xl font-bold text-xs shadow-xs cursor-pointer transition-all flex items-center gap-1.5 active:scale-95"
                  >
                    📦 โหลดแสดงเพิ่มอีก 48 รายการ (เหลือ {filteredProducts.length - displayLimit} รายการ)
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* 🛒 ฝั่งขวา: ตะกร้าสรุปบิล (Desktop แสดงตลอดเวลา, Mobile แสดงในโมดอล/ดรอว์เวอร์เมื่อเปิด) */}
        <div 
          className={`
            ${isMobileCartOpen ? 'fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm lg:relative lg:bg-transparent lg:inset-auto lg:z-10 lg:flex-none lg:items-stretch lg:justify-start' : 'hidden lg:flex'}
            w-full lg:w-[380px] shrink-0 lg:sticky lg:top-6 lg:h-[calc(100vh-48px)]
          `}
          onClick={() => setIsMobileCartOpen(false)}
        >
          <div 
            id="mobile-cart-section" 
            className="w-full h-[85vh] lg:h-full bg-white rounded-t-3xl lg:rounded-3xl shadow-2xl lg:shadow-sm border border-slate-100 flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
          
          <div className="p-3 bg-slate-50 border-b border-slate-100 grid grid-cols-2 gap-2 relative rounded-t-3xl">
            <button 
              onClick={() => handleSaleModeChange('TAKE_AWAY')} 
              className={`py-2 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 ${saleMode === 'TAKE_AWAY' ? 'bg-[#1E293B] text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
            >
              <Store className="w-4 h-4" /> รับหน้าร้าน
            </button>
            <button
              onClick={() => handleSaleModeChange('DELIVERY')}
              className={`py-2 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 ${saleMode === 'DELIVERY' ? 'bg-amber-600 text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
            >
              <Truck className="w-4 h-4" /> ให้ร้านส่งให้
            </button>
          </div>

          <div className="p-4 pb-3 border-b border-slate-50 flex justify-between items-center">
            <h2 id="cart-icon-target" className="text-sm font-bold text-slate-800 flex items-center gap-1.5 transition-transform">
              <Receipt className="w-4 h-4" /> รายการใบสรุปขาย
              <span className="bg-amber-50 text-amber-700 font-bold text-[10px] px-2 py-0.5 rounded-full">{cart.length} รายการ</span>
            </h2>
            <div className="flex items-center gap-2">
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
                          setAppliedCoupon(null)
                          setCouponInput('')
                          setIsConfirmingClear(false)
                          setSpecialDiscountPercent('0')
                          setSpecialDiscountBaht('0')
                          setShippingName('')
                          setShippingPhone('')
                          setShippingAddress('')
                          setShippingCost('')
                          setCompanyNameTh('')
                          setCompanyNameEn('')
                          setCompanyAddress('')
                          setTaxId('')
                          setLatitude(null)
                          setLongitude(null)
                          setSaleMode('TAKE_AWAY')
                          localStorage.removeItem('pos_customer_info')
                          toast.success('ล้างข้อมูลและสินค้าทั้งหมดแล้ว')
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
              {/* ปุ่มปิดโมดอลสำหรับมือถือ */}
              <button
                onClick={() => setIsMobileCartOpen(false)}
                className="lg:hidden p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full transition-colors cursor-pointer"
                title="ปิดตะกร้า"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-2 min-h-0 flex flex-col">
            {cart.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-16 text-slate-400 text-xs font-medium text-center">
                ยังไม่มีรายการสินค้าในใบขาย
              </div>
            ) : (
              <div className="flex flex-col gap-2 py-1">
                {/* 🎉 แถบแจ้งเตือนเมื่อซื้อครบเซ็ตโปรโมชั่น */}
                {completedSetPromotions.length > 0 && (
                  <div className="space-y-1.5 mb-1">
                    {completedSetPromotions.map((sp, idx) => (
                      <div key={idx} className="p-2 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl text-xs flex items-center justify-between text-emerald-900 font-bold shadow-2xs">
                        <span className="flex items-center gap-1.5 min-w-0 truncate">
                          <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="truncate">ครบเซ็ต: {sp.set.name}</span>
                        </span>
                        <span className="text-emerald-700 font-black shrink-0 ml-1.5 bg-white px-2 py-0.5 rounded-md border border-emerald-200">
                          {sp.discountAmount > 0 ? `-฿${sp.discountAmount.toLocaleString()}` : '✓ ครบชุด'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

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
                      <div className="flex flex-wrap items-center gap-1 mt-0.5">
                        {item.isExternal && (
                          <span className="text-[8px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded-md font-bold border border-indigo-200">
                            ✍️ สินค้านอก
                          </span>
                        )}
                        {(item.isFurniture || item.category_id === 'furniture') && !item.isExternal && (
                          <span className="text-[8px] bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded-md font-bold border border-amber-200">
                            🛋️ เฟอร์นิเจอร์
                          </span>
                        )}
                        {(() => {
                          const branchStock = item.stocks?.find(s => s.branch_id === item.fulfill_branch_id)
                          const actualQty = branchStock ? Number(branchStock.qty) : 0
                          if (!item.isExternal && !item.isFurniture && item.category_id !== 'furniture' && actualQty <= 0) {
                            return (
                              <span className="text-[8px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-md font-bold border border-amber-200">
                                📋 เสนอราคา (สต็อก 0)
                              </span>
                            )
                          }
                          return null
                        })()}
                        {(Boolean(item.discount_id) || Boolean(item.discount_label) || item.price < item.original_price) && (
                          <span className="text-[8px] bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded-md font-bold border border-orange-100">
                            {item.discount_label || 'ลดรายชิ้น'} (ไม่ร่วมโค้ดลด)
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        {Number(item.price) <= 0 ? (
                          <button
                            type="button"
                            onClick={() => openSetPriceModal(item, item.cartItemId, item.fulfill_branch_id, item.quantity)}
                            className="px-2 py-0.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-white font-black text-[10px] animate-pulse flex items-center gap-1 shadow-xs cursor-pointer"
                            title="สินค้านี้ยังไม่มีราคา คลิกเพื่อตั้งราคาขายและบันทึกลงฐานข้อมูล"
                          >
                            <Tag className="w-2.5 h-2.5" /> ตั้งราคาขาย (0 ฿)
                          </button>
                        ) : (
                          <div className="flex items-center gap-1">
                            <p className="text-[11px] text-amber-700 font-extrabold">{(item.price * item.quantity).toLocaleString()} ฿</p>
                            <button
                              type="button"
                              onClick={() => openSetPriceModal(item, item.cartItemId, item.fulfill_branch_id, item.quantity)}
                              className="text-slate-300 hover:text-amber-600 transition-colors p-0.5 cursor-pointer"
                              title="แก้ไขราคาขายสินค้าและบันทึกลงฐานข้อมูล"
                            >
                              <Edit3 className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        )}
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

          <div className="p-4 bg-slate-50/60 border-t border-slate-100 flex flex-col justify-end shrink-0">
            
            {/* ✨ ข้อมูลลูกค้าแบบย่อ (ดีไซน์มินิมอล) */}
            <div className="flex items-center justify-between py-2 border-b border-slate-200/60 text-xs">
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                  {saleMode === 'DELIVERY' ? <Truck className="w-3 h-3 text-amber-600" /> : <Store className="w-3 h-3 text-slate-500" />}
                  {saleMode === 'DELIVERY' ? 'ข้อมูลสำหรับจัดส่ง' : 'ลูกค้ารับหน้าร้าน'}
                </span>
                <span className="text-slate-700 font-semibold truncate text-[11px] mt-0.5 flex items-center gap-1.5 flex-wrap">
                  <span>{shippingName ? `${shippingName} (${shippingPhone})` : 'ยังไม่ได้ระบุลูกค้า'}</span>
                  {deliveryFee > 0 && (
                    <span className="px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200">
                      {isShippingWaived ? `ค่าส่ง 0 ฿ (ต้นทุน ฿${deliveryFee.toLocaleString()})` : `ค่าส่ง ฿${deliveryFee.toLocaleString()}`}
                    </span>
                  )}
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
                className="text-[10px] text-amber-700 hover:text-amber-800 font-bold px-2 py-1 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer shrink-0 ml-2"
              >
                {shippingName ? 'แก้ไข' : 'ระบุลูกค้า'}
              </button>
            </div>

            {/* 🎟️ แถบปุ่มส่วนลด & คูปอง (แตะเพื่อเปิด Modal ส่วนลด) */}
            {Boolean(appliedCoupon) || totalSpecialDiscountAmount !== 0 ? (
              <div 
                onClick={() => setIsDiscountModalOpen(true)}
                className="p-2.5 bg-emerald-50 hover:bg-emerald-100/70 border border-emerald-200 rounded-xl flex items-center justify-between cursor-pointer transition-colors mb-2 text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Ticket className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div className="flex items-center gap-1.5 truncate">
                    {appliedCoupon && (
                      <span className="font-bold text-emerald-900 font-mono text-[10px] bg-white px-1.5 py-0.5 rounded border border-emerald-200">
                        {appliedCoupon.code}
                      </span>
                    )}
                    <span className="font-black text-emerald-700">
                      ส่วนลด -฿{(couponDiscountAmount + (totalSpecialDiscountAmount > 0 ? totalSpecialDiscountAmount : 0)).toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setAppliedCoupon(null)
                      setCouponInput('')
                      setSpecialDiscountBaht('0')
                      setSpecialDiscountPercent('0')
                      toast.success('ล้างส่วนลดทั้งหมดแล้ว')
                    }}
                    className="p-1 hover:bg-emerald-200/60 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
                    title="ล้างส่วนลดทั้งหมด"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div 
                onClick={() => setIsDiscountModalOpen(true)}
                className="p-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between cursor-pointer transition-colors mb-2 text-xs"
              >
                <div className="flex items-center gap-2 text-slate-600 font-bold">
                  <Ticket className="w-4 h-4 text-slate-400" />
                  <span>ใส่คูปอง / ส่วนลดพิเศษท้ายบิล</span>
                </div>
                <div className="flex items-center gap-1 text-indigo-600 font-bold text-[11px]">
                  <span>เพิ่มส่วนลด</span>
                  <span className="text-sm leading-none">›</span>
                </div>
              </div>
            )}

            <div className="space-y-1.5 text-xs font-semibold text-slate-500 mb-4">
              <div className="flex justify-between"><span>ยอดรวมสินค้า</span><span>{totalOriginalPrice.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿</span></div>
              {promotionDiscountAmount > 0 && <div className="flex justify-between text-orange-600"><span>ส่วนลดสินค้า</span><span>- {promotionDiscountAmount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿</span></div>}
              {totalSetDiscountAmount > 0 && <div className="flex justify-between text-emerald-600 font-bold"><span>ส่วนลดเซ็ตโปรโมชั่น</span><span>- {totalSetDiscountAmount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿</span></div>}
              {couponDiscountAmount > 0 && <div className="flex justify-between text-purple-600 font-bold"><span>ส่วนลดคูปอง ({appliedCoupon?.code})</span><span>- {couponDiscountAmount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿</span></div>}
              {totalSpecialDiscountAmount !== 0 && (
                <div className={`flex justify-between ${totalSpecialDiscountAmount > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                  <span>{totalSpecialDiscountAmount > 0 ? 'ส่วนลดพิเศษ' : 'ปัดเศษเพิ่ม'}</span>
                  <span>{totalSpecialDiscountAmount > 0 ? '-' : '+'} {Math.abs(totalSpecialDiscountAmount).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿</span>
                </div>
              )}
              {deliveryFee > 0 && (
                <>
                  <div className="flex justify-between text-blue-600 font-bold">
                    <span className="flex items-center gap-1"><Truck className="w-3.5 h-3.5" /> ค่าจัดส่ง</span>
                    <span>+ {deliveryFee.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿</span>
                  </div>
                  {isShippingWaived && (
                    <div className="flex justify-between text-emerald-600 font-bold">
                      <span className="flex items-center gap-1">ส่วนลดค่าจัดส่ง (ยอดสินค้าหลังลดครบ 20,000฿)</span>
                      <span>- {deliveryFee.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿</span>
                    </div>
                  )}
                </>
              )}
              <div className="flex justify-between pt-1 border-t border-dashed border-slate-200"><span>ยอดก่อนภาษี (Subtotal)</span><span>{(grandTotal / 1.07).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿</span></div>
              <div className="flex justify-between"><span>ภาษีมูลค่าเพิ่ม (VAT 7%)</span><span>{(grandTotal - (grandTotal / 1.07)).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿</span></div>
              <div className="flex justify-between text-xs font-bold text-slate-800 pt-3 mt-1 border-t border-dashed border-slate-200">
                <span>ยอดสุทธิใบขาย (Grand Total)</span><span className="text-base text-amber-700 font-black">{grandTotal.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿</span>
              </div>
            </div>

            {/* ✨ เพิ่มปุ่มเสนอราคามาไว้ตรงนี้ */}
            <div className="flex flex-col gap-2">
              {cart.some(item => !item.price || Number(item.price) <= 0) && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-[11px] font-bold flex items-center gap-1.5 animate-pulse">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>ไม่สามารถสร้างใบเสนอราคาได้: มีสินค้าที่ยังไม่ได้ตั้งราคา (0 ฿) กรุณาตั้งราคาก่อน</span>
                </div>
              )}
              {cart.length > 0 && !cart.some(item => !item.price || Number(item.price) <= 0) && grandTotal <= 0 && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-[11px] font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>ยอดสุทธิของใบเสนอราคาต้องมากกว่า 0 บาท</span>
                </div>
              )}
              <button
                onClick={handlePreCheckout}
                disabled={submitting || cart.length === 0}
                className={`w-full py-3.5 text-white rounded-xl font-bold text-xs transition-all shadow-md shadow-slate-200 disabled:opacity-40 disabled:shadow-none cursor-pointer flex items-center justify-center gap-1.5 ${
                  cart.some(item => !item.price || Number(item.price) <= 0)
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-200'
                    : editOrderId 
                      ? 'bg-orange-600 hover:bg-orange-700' 
                      : 'bg-[#1E293B] hover:bg-slate-800'
                }`}
              >
                {submitting ? 'กำลังบันทึกข้อมูลออเดอร์...' : (
                  cart.some(item => !item.price || Number(item.price) <= 0) ? (
                    <><AlertTriangle className="w-4 h-4" /> มีสินค้า 0 ฿ (ต้องตั้งราคาก่อนสร้างใบเสนอราคา)</>
                  ) : editOrderId ? (
                    <><Save className="w-4 h-4" /> บันทึกการแก้ไขบิล</>
                  ) : (
                    <><Save className="w-4 h-4" /> สร้างใบเสนอราคา</>
                  )
                )}
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>

      {/* 🚀 Modal ข้อมูลลูกค้า */}
      {isCustomerFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className={`px-6 py-4 border-b flex justify-between items-center ${saleMode === 'DELIVERY' ? 'bg-amber-50/70 border-amber-200' : 'bg-slate-50 border-slate-100'}`}>
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${saleMode === 'DELIVERY' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-700'}`}>
                  {saleMode === 'DELIVERY' ? <Truck className="w-5 h-5" /> : <Store className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className={`font-bold text-sm ${saleMode === 'DELIVERY' ? 'text-amber-950' : 'text-slate-800'}`}>
                    {saleMode === 'DELIVERY' ? 'ระบุข้อมูลสำหรับจัดส่งสินค้า' : 'ระบุข้อมูลลูกค้ารับหน้าร้าน'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {saleMode === 'DELIVERY' ? 'กรอกที่อยู่ปลายทาง พร้อมค่าจัดส่งและพิกัดแผนที่' : 'บันทึกชื่อลูกค้าและค่าบริการ (ถ้ามี)'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsCustomerFormOpen(false)} 
                className="text-slate-400 hover:text-slate-700 p-1.5 bg-white rounded-xl shadow-xs border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4">
              <button
                type="button"
                onClick={() => {
                  setShippingPhone('-')
                  setShippingAddress('-')
                  if (!shippingName.trim()) {
                    setShippingName('ลูกค้าทั่วไป')
                  }
                }}
                className="w-full text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 px-4 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                ⚡ ไม่ระบุเบอร์โทร/ที่อยู่ (ใส่ "-")
              </button>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. เลข Invoice / รหัสออเดอร์ */}
                <div className={`rounded-2xl border p-3.5 flex flex-col justify-between ${editOrderId ? 'border-orange-200 bg-orange-50/60' : 'border-amber-200 bg-amber-50/50'}`}>
                  <label className="mb-1.5 flex items-center justify-between text-[11px] font-bold text-slate-700">
                    <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5 text-amber-600" /> เลข Invoice / รหัสบิล</span>
                    <span className="text-[9px] font-normal text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">ระบุเองได้</span>
                  </label>
                  <input
                    type="text"
                    placeholder="เว้นว่างเพื่อให้ระบบสร้างเลข INV อัตโนมัติ"
                    value={customOrderCode}
                    onChange={e => setCustomOrderCode(e.target.value.toUpperCase().replace(/\s/g, ''))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-mono text-xs uppercase outline-none transition-colors focus:border-amber-400 font-bold"
                  />
                  <p className="mt-1.5 text-[9px] leading-tight text-slate-400">
                    {editOrderId ? 'แก้เลขได้ขณะที่บิลยังรอชำระเงิน' : 'เลขต้องไม่ซ้ำ หากเว้นว่างระบบจะสร้างให้อัตโนมัติ'}
                  </p>
                </div>

                {/* 2. ค่าจัดส่ง / ค่าบริการส่ง (บาท) */}
                <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-3.5 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-bold text-blue-900 flex items-center gap-1.5">
                      <Truck className="w-4 h-4 text-blue-600" />
                      <span>ค่าจัดส่ง / ค่าบริการส่ง (บาท)</span>
                    </label>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                      isShippingWaived && deliveryFee > 0
                        ? 'bg-amber-100 text-amber-800'
                        : deliveryFee > 0
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-slate-100 text-slate-600'
                    }`}>
                      {isShippingWaived && deliveryFee > 0
                        ? `฿${deliveryFee.toLocaleString()} (ไม่คิดค่าส่งลูกค้า)`
                        : deliveryFee > 0
                          ? `฿${deliveryFee.toLocaleString()}`
                          : '0 ฿'}
                    </span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">฿</span>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={shippingCost}
                      onChange={e => {
                        const val = e.target.value;
                        if (val === '') {
                          setShippingCost('');
                        } else {
                          const cleanVal = val.length > 1 && val.startsWith('0') && !val.includes('.') ? val.replace(/^0+/, '') : val;
                          setShippingCost(cleanVal || '0');
                        }
                      }}
                      className="w-full rounded-xl border border-slate-200 bg-white pl-7 pr-3 py-2 text-xs font-black text-slate-800 outline-none transition-colors focus:border-blue-500"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    {[0, 50, 100, 150, 200, 300, 500].map(amt => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setShippingCost(amt === 0 ? '0' : amt.toString())}
                        className={`px-2 py-0.5 rounded-lg text-[9px] font-bold transition-all cursor-pointer ${
                          deliveryFee === amt
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300'
                        }`}
                      >
                        {amt === 0 ? '0฿' : `${amt}฿`}
                      </button>
                    ))}
                  </div>

                  {isOrderOver20k && (
                    <div className="mt-2.5 p-2 rounded-xl bg-amber-100/70 border border-amber-300/80 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-amber-800 text-xs">💡</span>
                        <span className="text-[10px] font-bold text-amber-950 leading-tight">
                          ยอดสินค้าสุทธิหลังหักส่วนลดครบ 20,000 ฿ ขึ้นไป ไม่คิดค่าส่งกับลูกค้า (บันทึกเฉพาะข้อมูลต้นทุน)
                        </span>
                      </div>
                      <label className="flex items-center gap-1.5 cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={waiveShippingFee}
                          onChange={e => setWaiveShippingFee(e.target.checked)}
                          className="rounded text-amber-600 focus:ring-amber-500 w-3.5 h-3.5 cursor-pointer"
                        />
                        <span className="text-[10px] font-bold text-amber-900">ยกเว้นเก็บลูกค้า</span>
                      </label>
                    </div>
                  )}
                </div>

                {/* 3. ชื่อลูกค้า/ผู้รับ */}
                <div>
                  <label className="text-[11px] font-bold text-slate-600 mb-1 block">ชื่อลูกค้า/ผู้รับ <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    placeholder="ระบุชื่อลูกค้า..." 
                    value={shippingName} 
                    onChange={e => setShippingName(e.target.value)} 
                    className="w-full text-xs p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:border-amber-400 focus:bg-white transition-colors" 
                  />
                </div>

                {/* 4. เบอร์โทรศัพท์ติดต่อ */}
                <div>
                  <label className="text-[11px] font-bold text-slate-600 mb-1 block">เบอร์โทรศัพท์ติดต่อ <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    placeholder="ระบุเบอร์โทร..." 
                    value={shippingPhone} 
                    onChange={e => setShippingPhone(e.target.value)} 
                    className="w-full text-xs p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:border-amber-400 focus:bg-white transition-colors" 
                  />
                </div>

                {/* 5. ที่อยู่จัดส่ง/ที่อยู่ลูกค้า */}
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-slate-600 mb-1 block">ที่อยู่จัดส่ง / ที่อยู่ลูกค้า <span className="text-red-500">*</span></label>
                  <textarea 
                    placeholder="บ้านเลขที่, ซอย, ถนน, ตำบล, อำเภอ, จังหวัด, รหัสไปรษณีย์..." 
                    value={shippingAddress} 
                    onChange={e => setShippingAddress(e.target.value)} 
                    rows={3} 
                    className="w-full text-xs p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:border-amber-400 focus:bg-white transition-colors resize-none" 
                  />
                </div>
              </div>

              {/* 6. ส่วนข้อมูลใบกำกับภาษี */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-amber-600"/> ข้อมูลสำหรับออกใบกำกับภาษี (ถ้ามี)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 mb-1 block">ชื่อบริษัท (ภาษาไทย) <span className="text-xs font-normal text-slate-400">(ไม่บังคับ)</span></label>
                    <input type="text" placeholder="ระบุชื่อบริษัทภาษาไทย..." value={companyNameTh} onChange={e => setCompanyNameTh(e.target.value)} className="w-full text-xs p-2.5 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:border-amber-400 focus:bg-white transition-colors" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 mb-1 block">ชื่อบริษัท (ภาษาอังกฤษ) <span className="text-xs font-normal text-slate-400">(ไม่บังคับ)</span></label>
                    <input type="text" placeholder="ระบุชื่อบริษัทภาษาอังกฤษ..." value={companyNameEn} onChange={e => setCompanyNameEn(e.target.value)} className="w-full text-xs p-2.5 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:border-amber-400 focus:bg-white transition-colors" />
                  </div>
                  {(companyNameTh.trim() !== '' || companyNameEn.trim() !== '') && (
                    <>
                      <div className="sm:col-span-2">
                        <label className="text-[10px] font-bold text-slate-500 mb-1 block">ที่อยู่บริษัท <span className="text-red-500">*</span></label>
                        <textarea placeholder="ระบุที่อยู่บริษัทสำหรับออกใบกำกับภาษี..." value={companyAddress} onChange={e => setCompanyAddress(e.target.value)} rows={2} className="w-full text-xs p-2.5 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:border-amber-400 focus:bg-white transition-colors resize-none" />
                      </div>
                      <div className="sm:col-span-2">
                        <div className="flex justify-between items-end mb-1">
                          <label className="text-[10px] font-bold text-slate-500 block">เลขประจำตัวผู้เสียภาษี (13 หลัก) <span className="text-xs font-normal text-slate-400">(ไม่บังคับ)</span></label>
                          <span className={`text-[9px] font-bold ${taxId.length === 13 ? 'text-emerald-500' : 'text-slate-400'}`}>{taxId.length}/13</span>
                        </div>
                        <input type="text" placeholder="ระบุเลขประจำตัวผู้เสียภาษี..." value={taxId} onChange={e => setTaxId(e.target.value.replace(/\D/g, ''))} maxLength={13} className="w-full text-xs p-2.5 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:border-amber-400 focus:bg-white transition-colors" />
                      </div>
                    </>
                  )}
                </div>
              </div>
              
              {/* 7. ส่วนปักหมุดแผนที่ (เฉพาะจัดส่ง) */}
              {saleMode === 'DELIVERY' && (
                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <label className="text-xs font-bold text-slate-700 block">ปักหมุดแผนที่สำหรับไรเดอร์ / ขนส่ง</label>
                  {latitude && longitude ? (
                    <div className="w-full h-36 bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 relative shadow-inner">
                      <iframe
                        title="Mini Map Preview"
                        width="100%"
                        height="100%"
                        frameBorder="0"
                        scrolling="no"
                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${longitude-0.002},${latitude-0.002},${longitude+0.002},${latitude+0.002}&layer=mapnik&marker=${latitude},${longitude}`}
                        className="pointer-events-none" 
                      />
                      <div className="absolute bottom-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md text-[9px] font-bold text-amber-700 shadow-sm border border-amber-200">
                        พิกัดถูกบันทึกแล้ว
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-24 bg-slate-50 rounded-2xl border border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 gap-2">
                      <MapPin className="w-5 h-5 text-slate-300" />
                      <span className="text-[11px] font-medium">ยังไม่ได้ปักหมุดแผนที่บน Google Maps</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowMap(true)}
                    className={`w-full flex items-center justify-center gap-1.5 p-3 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                      latitude && longitude 
                        ? 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50' 
                        : 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100 hover:border-amber-300 shadow-sm'
                    }`}
                  >
                    <MapPin className="w-4 h-4" />
                    {latitude && longitude ? 'แก้ไขจุดปักหมุดแผนที่' : 'เปิดแผนที่เพื่อปักหมุดลูกค้าตอนนี้'}
                  </button>
                </div>
              )}
            </div>
            
            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                <span>สินค้า: <strong className="text-slate-700">฿{totalFinalPrice.toLocaleString()}</strong></span>
                <span>·</span>
                <span>ค่าส่ง: <strong className={deliveryFeeCharged > 0 ? "text-blue-600" : "text-slate-700"}>
                  {isShippingWaived && deliveryFee > 0 
                    ? `0 ฿ (ต้นทุน ฿${deliveryFee.toLocaleString()})` 
                    : deliveryFee > 0 
                      ? `฿${deliveryFee.toLocaleString()}` 
                      : '0 ฿'}
                </strong></span>
                <span>·</span>
                <span>สุทธิ: <strong className="text-amber-700 font-black text-sm">฿{grandTotal.toLocaleString()}</strong></span>
              </div>
              <button 
                onClick={() => {
                  setIsCustomerFormOpen(false)
                  setTimeout(() => handlePreCheckout(), 100)
                }} 
                className="w-full sm:w-auto px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs transition-colors shadow-md shadow-amber-200 cursor-pointer"
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
                <p className="text-xs font-bold text-amber-700 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> พบสินค้าในสาขาอื่น (คลิกเพื่อดึงของมาส่งบ้านลูกค้า):
                </p>
                {nearbyModal.isLoading ? (
                  <div className="flex items-center justify-center py-8 gap-2 text-slate-400 font-bold text-xs">
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-slate-300 border-t-amber-600" />
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
                        className="w-full flex justify-between items-center bg-white border border-amber-100 hover:border-amber-400 hover:bg-amber-50 p-3 rounded-xl transition-all cursor-pointer group shadow-2xs hover:shadow-md"
                      >
                        <span className="text-xs font-bold text-slate-700 group-hover:text-amber-800">
                          {stock.branch_name || 'ไม่ทราบชื่อสาขา'}
                        </span>
                        <span className="text-xs font-black text-amber-700 bg-amber-50 group-hover:bg-white px-2 py-1 rounded border border-transparent group-hover:border-amber-200 transition-colors">
                          มี {displayAmount} ชิ้น
                        </span>
                      </button>
                    )
                  })
                )}
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col gap-2">
              <button
                onClick={() => {
                  if (nearbyModal.product) {
                    addToCart(nearbyModal.product, 1, undefined, true)
                    setNearbyModal({ isOpen: false, product: null, nearbyStocks: [], isLoading: false })
                  }
                }}
                className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5" /> เพิ่มลงตะกร้าสาขาเรา (สต็อก 0 เพื่อออกใบเสนอราคา)
              </button>
              <button onClick={() => setNearbyModal({ isOpen: false, product: null, nearbyStocks: [], isLoading: false })} className="w-full py-2 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-100 transition-all cursor-pointer">
                ยกเลิก / ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✨ Modal ยืนยันการสร้างใบเสนอราคา */}
      {isConfirmCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden flex flex-col p-6 items-center text-center">
            <div className="w-16 h-16 bg-amber-50 text-amber-700 rounded-full flex items-center justify-center mb-4">
              <FileText className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-slate-800 text-lg mb-2">
              {editOrderId ? 'ยืนยันบันทึกการแก้ไขบิล?' : 'ยืนยันสร้างใบเสนอราคา?'}
            </h3>
            <p className="text-slate-500 text-xs mb-4 px-4 leading-relaxed">
              กรุณาตรวจสอบรายการสินค้าและยอดเงินให้ถูกต้องก่อนกดยืนยัน ระบบจะทำการบันทึกบิลและตัดสต็อกทันที
            </p>

            {/* สรุปยอดเงินในโมดอลยืนยัน */}
            <div className="w-full mb-4 bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 text-xs space-y-1.5 text-left">
              <div className="flex justify-between text-slate-500">
                <span>ยอดรวมสินค้า:</span>
                <span className="font-semibold text-slate-700">{totalFinalPrice.toLocaleString()} ฿</span>
              </div>
              {deliveryFee > 0 && (
                <>
                  <div className="flex justify-between text-blue-600 font-bold">
                    <span className="flex items-center gap-1"><Truck className="w-3.5 h-3.5" /> ค่าจัดส่ง:</span>
                    <span>+{deliveryFee.toLocaleString()} ฿</span>
                  </div>
                  {isShippingWaived && (
                    <div className="flex justify-between text-emerald-600 font-bold">
                      <span>ส่วนลดค่าจัดส่ง (ยอดหลังลดครบ 20,000฿):</span>
                      <span>-{deliveryFee.toLocaleString()} ฿</span>
                    </div>
                  )}
                </>
              )}
              <div className="flex justify-between text-slate-800 font-black text-sm pt-2 border-t border-slate-200">
                <span>ยอดสุทธิทั้งสิ้น:</span>
                <span className="text-amber-700">{grandTotal.toLocaleString()} ฿</span>
              </div>
            </div>

            {!editOrderId && (
              <div className="w-full mb-6 text-left">
                <label className="text-[10px] font-bold text-slate-500 mb-1 block">เลข Invoice / รหัสออเดอร์ (ระบุเองได้)</label>
                <input 
                  type="text" 
                  placeholder="เช่น INV-1234 (ลบแล้วตั้งเองได้)" 
                  value={customOrderCode}
                  onChange={e => setCustomOrderCode(e.target.value.toUpperCase().replace(/\s/g, ''))}
                  className="w-full text-xs p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:border-amber-400 focus:bg-white transition-colors uppercase font-mono" 
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
                className="flex-1 py-3 bg-[#B8834A] hover:bg-[#84492C] text-white rounded-xl font-bold text-xs transition-all cursor-pointer shadow-md shadow-amber-200 flex items-center justify-center gap-1.5"
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
                <Printer className="w-4 h-4 text-amber-700" /> เอกสารการขาย
              </h3>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => {
                    const iframe = document.getElementById('print-iframe') as HTMLIFrameElement;
                    if (iframe && iframe.contentWindow) {
                      iframe.contentWindow.print();
                    }
                  }}
                  className="bg-[#B8834A] hover:bg-[#84492C] text-white font-bold py-1.5 px-4 rounded-lg text-xs transition-colors flex items-center gap-1.5 shadow-sm"
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

      {/* 🎟️ Modal ส่วนลดและคูปองท้ายบิล */}
      {isDiscountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-4 px-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
                  <Ticket className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">ส่วนลดและโปรโมชั่นท้ายบิล</h3>
                  <p className="text-[11px] text-slate-400">กรอกคูปอง หรือระบุส่วนลดพิเศษท้ายบิล</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsDiscountModalOpen(false)} 
                className="p-1.5 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {/* 1. คูปองส่วนลด */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                  🎟️ คูปองส่วนลด (Coupon Code)
                </span>
                {appliedCoupon ? (
                  <div className="flex flex-col gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <Ticket className="w-4 h-4 text-emerald-600 shrink-0" />
                        <div className="min-w-0">
                          <div className="font-bold text-emerald-900 font-mono text-sm truncate">{appliedCoupon.code}</div>
                          <div className="text-[11px] text-emerald-700 font-medium truncate">{appliedCoupon.title}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-black text-emerald-700 text-sm">-฿{appliedCoupon.discountAmount.toLocaleString()}</span>
                        <button type="button" onClick={handleRemoveCoupon} className="text-slate-400 hover:text-red-500 transition-colors p-1 cursor-pointer" title="ยกเลิกคูปอง">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {appliedCoupon.attribution && (
                      <div className="pt-2 border-t border-emerald-200/60 flex flex-wrap items-center gap-1.5 text-[10px]">
                        {appliedCoupon.attribution.leadSales && (
                          <span className="bg-purple-100/90 text-purple-800 font-bold px-2 py-0.5 rounded-md border border-purple-200">
                            👤 เซลล์: {appliedCoupon.attribution.leadSales}
                          </span>
                        )}
                        {appliedCoupon.attribution.partnerCompany && (
                          <span className="bg-blue-100/90 text-blue-800 font-bold px-2 py-0.5 rounded-md border border-blue-200">
                            🏢 บ.: {appliedCoupon.attribution.partnerCompany}
                          </span>
                        )}
                        {appliedCoupon.attribution.partnerSales && (
                          <span className="bg-amber-100/90 text-amber-800 font-bold px-2 py-0.5 rounded-md border border-amber-200">
                            🤝 เซลล์คู่ค้า: {appliedCoupon.attribution.partnerSales}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="กรอกโค้ดส่วนลด..."
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleApplyCoupon(); } }}
                      className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold uppercase outline-none focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20 transition-all placeholder:font-normal placeholder:normal-case"
                    />
                    <button
                      type="button"
                      disabled={isValidatingCoupon || !couponInput.trim()}
                      onClick={handleApplyCoupon}
                      className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5"
                    >
                      {isValidatingCoupon ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'ใช้โค้ด'}
                    </button>
                  </div>
                )}
                {cart.length > 0 && eligibleForCouponSubtotal < totalFinalPriceBeforeSpecial && (
                  <p className="text-[10px] text-amber-700 bg-amber-50/80 px-2.5 py-1.5 rounded-lg border border-amber-200/60 font-medium leading-tight">
                    ⚠️ มีสินค้าที่ลดรายชิ้นแล้ว โค้ดลดจะคิดเฉพาะยอดที่ไม่ลดรายชิ้น (฿{eligibleForCouponSubtotal.toLocaleString()})
                  </p>
                )}
              </div>

              {/* 2. ส่วนลดพิเศษท้ายบิล */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                    ✨ ส่วนลดพิเศษท้ายบิล (Special Discount)
                  </span>
                  {cart.length > 0 && (
                    <button 
                      type="button"
                      onClick={() => {
                        setTargetRoundingTotal(Math.floor(totalFinalPrice).toString())
                        setCalculatedRoundingBaht(null)
                        setIsRoundingModalOpen(true)
                      }}
                      className="text-[11px] bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-2.5 py-1 rounded-lg flex items-center gap-1.5 font-bold transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      ผู้ช่วยปัดเศษ
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold">ระบุเป็นจำนวนเงิน (฿)</span>
                    <div className="flex items-center bg-slate-50 border border-slate-200 focus-within:bg-white focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 rounded-xl px-3 py-2 transition-all">
                      <span className="text-xs text-slate-400 font-bold mr-2">฿</span>
                      <input
                        type="number"
                        placeholder="0"
                        value={specialDiscountBaht}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '') {
                            setSpecialDiscountBaht('');
                          } else {
                            const cleanVal = val.length > 1 && val.startsWith('0') && !val.includes('.') ? val.replace(/^0+/, '') : val;
                            setSpecialDiscountBaht(cleanVal || '0');
                          }
                        }}
                        className="w-full text-xs outline-none bg-transparent font-bold text-slate-800 p-0 border-none"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold">ระบุเป็นเปอร์เซ็นต์ (%)</span>
                    <div className="flex items-center bg-slate-50 border border-slate-200 focus-within:bg-white focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 rounded-xl px-3 py-2 transition-all">
                      <span className="text-xs text-slate-400 font-bold mr-2">%</span>
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
                        className="w-full text-xs outline-none bg-transparent font-bold text-slate-800 p-0 border-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. พรีวิวสรุปคำนวณยอด (Live Calculation Preview Card) */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1.5 text-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  สรุปยอดคำนวณ
                </span>
                <div className="flex justify-between text-slate-500 font-medium">
                  <span>ยอดรวมสินค้า</span>
                  <span>{totalOriginalPrice.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿</span>
                </div>
                {couponDiscountAmount > 0 && (
                  <div className="flex justify-between text-purple-600 font-bold">
                    <span>ส่วนลดคูปอง ({appliedCoupon?.code})</span>
                    <span>- {couponDiscountAmount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿</span>
                  </div>
                )}
                {totalSpecialDiscountAmount !== 0 && (
                  <div className={`flex justify-between font-bold ${totalSpecialDiscountAmount > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                    <span>{totalSpecialDiscountAmount > 0 ? 'ส่วนลดพิเศษ' : 'ปัดเศษเพิ่ม'}</span>
                    <span>{totalSpecialDiscountAmount > 0 ? '-' : '+'} {Math.abs(totalSpecialDiscountAmount).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿</span>
                  </div>
                )}
                <div className="flex justify-between text-xs font-bold text-slate-800 pt-2 border-t border-dashed border-slate-200">
                  <span>ยอดสุทธิใบขาย (Grand Total)</span>
                  <span className="text-base text-amber-700 font-black">
                    {grandTotal.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿
                  </span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 px-6 border-t border-slate-100 flex justify-end gap-2 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setIsDiscountModalOpen(false)}
                className="w-full py-2.5 bg-[#1E293B] hover:bg-slate-800 text-white rounded-xl font-bold text-xs transition-colors shadow-sm cursor-pointer"
              >
                ตกลง / ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
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
                  {totalFinalPrice.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-sm font-medium text-slate-500">฿</span>
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
                    
                    if (target <= 0) {
                      return (
                        <div className="text-xs text-rose-500 bg-rose-50 p-3 rounded-lg font-medium flex items-start gap-2">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
                          ยอดเป้าหมายต้องมากกว่า 0 ครับ
                        </div>
                      );
                    }

                    // 1. คำนวณความต้องการส่วนลดรวม (จากราคาของในตะกร้าทั้งหมดก่อนลดพิเศษ)
                    const subtotal = totalFinalPriceBeforeSpecial;
                    const totalDiscountNeeded = subtotal - target;

                    // 2. คำนวณเป็นเปอร์เซ็นต์ (%) ใหม่ทั้งหมด
                    const targetPercentDiscount = subtotal > 0 ? (totalDiscountNeeded / subtotal) * 100 : 0;
                    const targetPercentFormatted = parseFloat(targetPercentDiscount.toFixed(4));

                    // 3. คำนวณเป็นบาท (฿) ใหม่ทั้งหมด
                    const targetBahtFormatted = parseFloat(totalDiscountNeeded.toFixed(2));

                    const isRoundUp = totalDiscountNeeded < 0;
                    
                    return (
                      <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 space-y-4">
                        <div className="text-xs text-indigo-700 font-bold flex items-center gap-1.5">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>
                          คำนวณยอดเป้าหมาย {target.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿ สำเร็จ!
                        </div>
                        
                        <div className="text-[10px] text-slate-500 leading-normal">
                          ระบบช่วยคำนวณสัดส่วนภาษี (VAT 7%) เรียบร้อยแล้ว นายสามารถเลือกปรับแต่งรูปแบบส่วนลด/ส่วนเพิ่ม ได้ 2 รูปแบบดังนี้ครับ:
                        </div>

                        {/* รูปแบบที่ 1: ปรับเป็นเปอร์เซ็นต์ */}
                        <div className="bg-white p-3 rounded-xl border border-slate-100 space-y-2 shadow-2xs">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-slate-700">รูปแบบที่ 1: ปรับเป็นเปอร์เซ็นต์ (%)</span>
                            <span className={`font-black ${targetPercentFormatted > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                              {targetPercentFormatted > 0 ? '-' : '+'} {Math.abs(targetPercentFormatted)} %
                            </span>
                          </div>
                          <button
                            onClick={() => {
                              setSpecialDiscountPercent(targetPercentFormatted.toString());
                              setSpecialDiscountBaht('0');
                              setIsRoundingModalOpen(false);
                            }}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-3 rounded-lg text-[11px] transition-colors cursor-pointer"
                          >
                            ใช้ส่วนลด {Math.abs(targetPercentFormatted)} % (ล้างช่องบาท)
                          </button>
                        </div>

                        {/* รูปแบบที่ 2: ปรับเป็นบาท */}
                        <div className="bg-white p-3 rounded-xl border border-slate-100 space-y-2 shadow-2xs">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-slate-700">รูปแบบที่ 2: ปรับเป็นบาท (฿)</span>
                            <span className={`font-black ${targetBahtFormatted > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                              {targetBahtFormatted > 0 ? '-' : '+'} {Math.abs(targetBahtFormatted)} ฿
                            </span>
                          </div>
                          <button
                            onClick={() => {
                              setSpecialDiscountBaht(targetBahtFormatted.toString());
                              setSpecialDiscountPercent('0');
                              setIsRoundingModalOpen(false);
                            }}
                            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 px-3 rounded-lg text-[11px] transition-colors cursor-pointer"
                          >
                            ใช้ส่วนลด {Math.abs(targetBahtFormatted)} ฿ (ล้างช่อง %)
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 📱 ปุ่มลอยสำหรับมือถือ (เปิดตะกร้าในรูปแบบโมดอล) */}
      <div className="lg:hidden fixed bottom-6 right-6 z-40">
        <button 
          onClick={() => setIsMobileCartOpen(true)} 
          className="bg-[#B8834A] hover:bg-[#84492C] text-white rounded-full p-4 shadow-2xl shadow-amber-900/30 flex items-center justify-center relative transition-transform active:scale-95"
        >
          <Receipt className="w-6 h-6" />
          {cart.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-[#F4F7F9] shadow-sm">
              {cart.length}
            </span>
          )}
        </button>
      </div>

      {/* 🛋️ โมดอลเพิ่มสินค้านอก & เฟอร์นิเจอร์ */}
      <ExternalProductModal
        isOpen={isExternalModalOpen}
        onClose={() => setIsExternalModalOpen(false)}
        branches={branches}
        currentBranchId={selectedLocation === 'ALL' ? myBranchId : selectedLocation}
        onAddToCart={(product, qty, fulfillBranchId) => {
          addToCart(product, qty, fulfillBranchId)
        }}
      />

      {/* 🏷️ โมดอลกำหนดราคาขายสินค้าลงฐานข้อมูลจริง */}
      {priceModal.isOpen && priceModal.product && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-amber-50 to-orange-50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-sm">
                    {Number(priceModal.product.price) <= 0 ? 'ระบุราคาขายสินค้า (ยังไม่มีราคา)' : 'แก้ไขราคาขายสินค้า'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    บันทึกราคาลงฐานข้อมูล Supabase ทันที
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPriceModal({ isOpen: false, product: null, initialPrice: '', cartItemId: null })}
                className="text-slate-400 hover:text-slate-700 font-bold p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              {/* Product Info Preview */}
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="w-14 h-14 bg-white rounded-xl overflow-hidden border border-slate-200 shrink-0 flex items-center justify-center">
                  {priceModal.product.image_url ? (
                    <img src={priceModal.product.image_url} alt={priceModal.product.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[9px] text-slate-300 font-medium">ไม่มีรูป</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-800 text-xs truncate" title={priceModal.product.name}>
                    {priceModal.product.name}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    SKU: <span className="font-mono text-slate-600 font-semibold">{priceModal.product.sku || '-'}</span>
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    {Number(priceModal.product.price) <= 0 ? (
                      <span className="text-[10px] bg-rose-50 text-rose-700 px-2 py-0.5 rounded-md font-bold border border-rose-200">
                        ⚠️ ราคาเดิม: 0 ฿
                      </span>
                    ) : (
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-semibold">
                        ราคาเดิม: ฿{Number(priceModal.product.price).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Price Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  ระบุราคาขายจริง (บาท) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    step="any"
                    autoFocus
                    placeholder="0.00"
                    value={modalInputPrice}
                    onChange={(e) => setModalInputPrice(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleSaveProductPrice()
                      }
                    }}
                    className="w-full pl-4 pr-14 py-3 bg-white border-2 border-amber-300 focus:border-amber-500 focus:ring-4 focus:ring-amber-100 rounded-2xl outline-none text-base font-black text-slate-800 transition-all shadow-2xs"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    ฿ บาท
                  </span>
                </div>
                <p className="text-[10px] text-amber-700 mt-1.5 flex items-center gap-1">
                  <span>💡</span> ราคานี้จะถูกบันทึกลงฐานข้อมูลสินค้าส่วนกลาง และใช้สำหรับออกบิลนี้ทันที
                </p>
              </div>

              {/* Quick price presets */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] text-slate-400 font-medium mr-1">ปุ่มลัด:</span>
                {[100, 250, 350, 500, 800, 1000, 1500, 2000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setModalInputPrice(String(preset))}
                    className="text-[11px] px-2.5 py-1 bg-slate-100 hover:bg-amber-100 hover:text-amber-800 text-slate-600 rounded-lg font-semibold transition-colors cursor-pointer"
                  >
                    +{preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setPriceModal({ isOpen: false, product: null, initialPrice: '', cartItemId: null })}
                className="px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-100 transition-colors cursor-pointer"
                disabled={isSavingPrice}
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSaveProductPrice}
                disabled={isSavingPrice || !modalInputPrice || Number(modalInputPrice) <= 0}
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold text-xs transition-all shadow-md shadow-amber-200 flex items-center gap-1.5 cursor-pointer"
              >
                {isSavingPrice ? (
                  <>
                    <span className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                    กำลังบันทึก...
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    {priceModal.cartItemId ? 'บันทึกราคาลงฐานข้อมูล & อัปเดตบิล' : 'บันทึกราคาลงฐานข้อมูล & เพิ่มลงตะกร้า'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
