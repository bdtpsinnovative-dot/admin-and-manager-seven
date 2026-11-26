//src/app/(admin)/vanguard-dispatch/page.tsx
"use client"

import { useState, useEffect, useMemo } from 'react'
import { getGroupedDispatches, markOrderItemsShipped, approveAndCutStock, cancelOrder } from '@/actions/dispatch'
import { getAllBranches } from '@/actions/sales-check'
import {
  ChevronDown,
  ChevronUp,
  Printer,
  CheckCircle,
  Package,
  List,
  Activity,
  Archive,
  AlertTriangle,
  Banknote,
  Store,
  MapPin,
  Navigation,
  Truck,
  Edit,
  FileText,
  Save,
  XCircle,
  Download,
  Lock,
  User,
  Search,
  Building2,
  RefreshCw,
  Phone,
  ShieldCheck
} from 'lucide-react'
import { toast } from 'sonner'
import PrintDispatchModal from '@/components/PrintDispatchModal'
import PaymentSlipUploader from '@/components/PaymentSlipUploader'
import PaymentSlipViewer from '@/components/PaymentSlipViewer'
import EditCustomerInfoModal from '@/components/EditCustomerInfoModal'
import { downloadQuoteExcel } from '@/utils/exportQuote'

export default function AdminVanguardDispatchPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'my_tasks' | 'follow_ups' | 'completed' | 'cancelled'>('overview')
  const [tasks, setTasks] = useState<{ myTasks: any[]; followUpTasks: any[]; completedTasks: any[]; cancelledTasks: any[] }>({
    myTasks: [],
    followUpTasks: [],
    completedTasks: [],
    cancelledTasks: []
  })
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<number | null>(null)
  const [approvingId, setApprovingId] = useState<number | null>(null)
  const [cancellingId, setCancellingId] = useState<number | null>(null)
  const [expandedOrders, setExpandedOrders] = useState<number[]>([])
  const [customOrderCodes, setCustomOrderCodes] = useState<Record<number, string>>({})
  const [printOrderCode, setPrintOrderCode] = useState<string | null>(null)
  const [printAutoPrint, setPrintAutoPrint] = useState(false)
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmText?: string;
    confirmVariant?: 'emerald' | 'blue' | 'red' | 'amber';
    showOrderCodeInput?: boolean;
    defaultOrderCode?: string;
    showCancelReasonInput?: boolean;
    onConfirm: (customCode?: string, cancelReason?: string) => void;
  }>({ isOpen: false, title: '', description: '', onConfirm: () => { } })
  const [modalCustomOrderCode, setModalCustomOrderCode] = useState('')
  const [modalCancelReason, setModalCancelReason] = useState('')
  const [editingCustomerOrder, setEditingCustomerOrder] = useState<any | null>(null)

  // 🏢 Admin Filters
  const [branches, setBranches] = useState<{ id: number; branch_name: string }[]>([])
  const [selectedBranch, setSelectedBranch] = useState<number | 'ALL'>('ALL')
  const [selectedSeller, setSelectedSeller] = useState<string | 'ALL'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  const handleCustomerUpdated = (updated: { shipping_name: string; shipping_phone: string; shipping_address: string }) => {
    if (!editingCustomerOrder) return
    const orderId = editingCustomerOrder.id

    setTasks(prev => {
      const updateList = (list: any[]) => list.map(item => item.id === orderId ? { ...item, ...updated } : item)
      return {
        myTasks: updateList(prev.myTasks),
        followUpTasks: updateList(prev.followUpTasks),
        completedTasks: updateList(prev.completedTasks),
        cancelledTasks: updateList(prev.cancelledTasks)
      }
    })
    setEditingCustomerOrder(null)
    toast.success('อัปเดตข้อมูลลูกค้าและที่อยู่จัดส่งเรียบร้อยแล้ว')
  }

  // โหลดรายชื่อสาขาทั้งหมด
  useEffect(() => {
    getAllBranches().then(b => {
      if (b && Array.isArray(b)) setBranches(b)
    })
  }, [])

  useEffect(() => {
    loadData(selectedBranch, selectedSeller)
  }, [selectedBranch, selectedSeller])

  async function loadData(targetBranch: number | 'ALL' = selectedBranch, targetSeller: string | 'ALL' = selectedSeller) {
    setLoading(true)
    const res = await getGroupedDispatches(targetBranch, targetSeller)
    if (res.success) {
      setTasks({
        myTasks: res.myDispatchOrders || [],
        followUpTasks: res.followUpOrders || [],
        completedTasks: res.completedOrders || [],
        cancelledTasks: res.cancelledOrders || []
      })
    } else {
      toast.error("โหลดข้อมูลไม่สำเร็จ: " + res.error)
    }
    setLoading(false)
  }

  const toggleExpand = (orderId: number) => {
    setExpandedOrders(prev =>
      prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
    )
  }

  // ดึงรายชื่อเซลล์ทั้งหมดที่มีในข้อมูลบิล
  const uniqueSellers = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>()
    const all = [...tasks.myTasks, ...tasks.followUpTasks, ...tasks.completedTasks, ...tasks.cancelledTasks]
    all.forEach(order => {
      if (order.user_id && order.creator_name && order.creator_name !== 'ไม่ระบุผู้สร้าง') {
        map.set(order.user_id, { id: order.user_id, name: order.creator_name })
      }
    })
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'th'))
  }, [tasks])

  const handleApproveStock = async (orderId: number, orderCode: string, items: any[]) => {
    setModalCustomOrderCode(orderCode) // ดึงรหัสเดิมมาแสดงให้แก้

    // ตรวจสอบสินค้าที่สต็อกไม่พอ (พรีออเดอร์)
    const outOfStockItems = items.filter((item: any) => {
      const branchStock = item.products?.stock?.find((s: any) => Number(s.branch_id) === Number(item.fulfill_branch_id))
      const currentLiveQty = branchStock ? Number(branchStock.qty) : 0
      return currentLiveQty < item.qty
    })

    const isPreOrder = outOfStockItems.length > 0
    const outOfStockDetails = outOfStockItems.map((item: any) => {
      const branchStock = item.products?.stock?.find((s: any) => Number(s.branch_id) === Number(item.fulfill_branch_id))
      const currentLiveQty = branchStock ? Number(branchStock.qty) : 0
      return `• ${item.products?.name || item.products?.sku || 'สินค้า'} (สั่ง ${item.qty} ชิ้น / ในคลังมี ${currentLiveQty} ชิ้น)`
    }).join('\n')

    setConfirmModal({
      isOpen: true,
      title: isPreOrder ? '⚠️ ยืนยันรับชำระเงิน (มีรายการพรีออเดอร์)?' : 'ยืนยันรับชำระเงินและตัดสต็อก?',
      description: isPreOrder
        ? `⚠️ แจ้งเตือน: บิลนี้มีสินค้าพรีออเดอร์ (สต็อกในคลังไม่พอ):\n${outOfStockDetails}\n\nเมื่อกดยืนยัน ระบบจะบันทึกรับชำระเงิน และ "ตัดสต็อกให้เป็นค่าติดลบ" เพื่อรอการรับสินค้าเข้าคลัง (Stock-in) ในภายหลัง\n\nต้องการยืนยันรับชำระเงินใช่หรือไม่?`
        : 'กรุณาตรวจสอบรายการสินค้าและยอดเงินให้ถูกต้องก่อนกดยืนยัน\nระบบจะทำการบันทึกรับเงินและตัดสต็อกทันที',
      confirmText: isPreOrder ? 'ยืนยันรับเงิน (พรีออเดอร์/สต็อกติดลบ)' : 'ยืนยันรับชำระเงิน',
      confirmVariant: 'emerald',
      showOrderCodeInput: true,
      defaultOrderCode: orderCode,
      onConfirm: async (customCode?: string) => {
        setApprovingId(orderId)
        const res = await approveAndCutStock(orderId, orderCode, items, customCode)

        if (res.success) {
          toast.success(isPreOrder ? "อนุมัติรับชำระเงินพรีออเดอร์ และตัดสต็อกเรียบร้อยแล้ว!" : "อนุมัติรับชำระเงิน และ หักสต็อกออกจากคลังเรียบร้อยแล้ว!")
          await loadData()
        } else if (res.isWoodSlabBlocked) {
          setConfirmModal({
            isOpen: true,
            title: '🚫 สินค้าไม้แผ่นถูกขายไปแล้ว!',
            description: res.error,
            confirmText: 'รับทราบ (ปิดหน้าต่าง)',
            confirmVariant: 'red',
            onConfirm: async () => {
              await loadData()
            }
          })
        } else if (res.isFrontRun) {
          const frontRunDetails = (res.frontRunItems || []).map((f: any) => 
            `• ${f.name} (สั่ง ${f.requestedQty} ชิ้น / ในคลังเหลือ ${f.currentStock} ชิ้น)`
          ).join('\n')

          setConfirmModal({
            isOpen: true,
            title: '🚨 สินค้าเพิ่งถูกสาขาอื่นตัดสต็อกตัดหน้า!',
            description: `⚠️ แจ้งเตือนด่วน: สินค้าต่อไปนี้เพิ่งถูกสาขาอื่นตัดสต็อกไปเมื่อสักครู่:\n${frontRunDetails}\n\nของหน้าร้านชิ้นจริงหมดแล้ว!\nกรุณาแจ้งลูกค้าก่อนว่าต้องการ "เปลี่ยนเป็นสั่งพรีออเดอร์/รอของเข้าคลัง" ใช่หรือไม่?`,
            confirmText: '📦 ลูกค้ารอได้ - ยืนยันพรีออเดอร์ (สต็อกติดลบ)',
            confirmVariant: 'amber',
            showOrderCodeInput: true,
            defaultOrderCode: customCode || orderCode,
            onConfirm: async (newCode?: string) => {
              setApprovingId(orderId)
              const forceRes = await approveAndCutStock(orderId, orderCode, items, newCode, true)
              if (forceRes.success) {
                toast.success("บันทึกรับเงิน และเปลี่ยนเป็นพรีออเดอร์เรียบร้อยแล้ว!")
                await loadData()
              } else {
                toast.error("เกิดข้อผิดพลาด: " + forceRes.error)
              }
              setApprovingId(null)
            }
          })
        } else {
          toast.error("เกิดข้อผิดพลาด: " + res.error)
        }
        setApprovingId(null)
      }
    })
  }

  const handleCompleteOrder = (orderId: number, orderCode: string, items: any[]) => {
    setConfirmModal({
      isOpen: true,
      title: 'ยืนยันการส่งมอบสินค้าสำเร็จ',
      description: `ยืนยันการจัดส่ง/ส่งมอบสินค้า ในบิล ${orderCode} เรียบร้อยแล้วใช่หรือไม่?`,
      confirmText: 'ยืนยันส่งมอบ',
      confirmVariant: 'blue',
      onConfirm: async () => {
        setProcessingId(orderId)
        const itemIds = items.map(item => item.id)
        const res = await markOrderItemsShipped(orderId, itemIds, orderCode)

        if (res.success) {
          toast.success("อัปเดตสถานะจัดส่งเรียบร้อยแล้ว!")
          await loadData()
        } else {
          toast.error("เกิดข้อผิดพลาด: " + res.error)
        }
        setProcessingId(null)
      }
    })
  }

  const handleCancelOrder = (orderId: number, orderCode: string, items: any[], currentStatus: string) => {
    setModalCancelReason('')
    setConfirmModal({
      isOpen: true,
      title: 'ยืนยันการยกเลิกบิล?',
      description: currentStatus !== 'PENDING' 
        ? `บิล ${orderCode} นี้มีการชำระเงินและหักสต็อกไปแล้ว\nถ้ายกเลิก ระบบจะทำการคืนสต็อกเข้าคลังให้โดยอัตโนมัติ ยืนยันใช่หรือไม่?`
        : `คุณต้องการยกเลิกบิล ${orderCode} ใช่หรือไม่?\nบิลจะถูกเก็บประวัติไว้ในแท็บยกเลิกแล้ว`,
      confirmText: 'ยืนยันยกเลิกบิล',
      confirmVariant: 'red',
      showCancelReasonInput: true,
      onConfirm: async (_customCode, reason) => {
        setCancellingId(orderId)
        const res = await cancelOrder(orderId, orderCode, items, currentStatus, reason)

        if (res.success) {
          toast.success("ยกเลิกบิลและจัดการสต็อกเรียบร้อยแล้ว!")
          await loadData()
        } else {
          toast.error("เกิดข้อผิดพลาด: " + res.error)
        }
        setCancellingId(null)
      }
    })
  }

  const handlePrintSlip = (orderCode: string) => {
    setPrintAutoPrint(false)
    setPrintOrderCode(orderCode)
  }

  const handlePrintPdf = (orderCode: string) => {
    setPrintAutoPrint(true)
    setPrintOrderCode(orderCode)
  }

  const handleDownloadCSV = (order: any) => {
    downloadQuoteExcel(order)
  }

  const currentData = useMemo(() => {
    let list: any[] = []
    if (activeTab === 'my_tasks') list = tasks.myTasks.filter((t: any) => t.status !== 'PENDING');
    else if (activeTab === 'follow_ups') list = tasks.followUpTasks.filter((t: any) => t.status !== 'PENDING');
    else if (activeTab === 'completed') list = tasks.completedTasks;
    else if (activeTab === 'cancelled') list = tasks.cancelledTasks;
    else {
      // Overview Tab: Combine and merge order_items by order.id
      const combined = [...tasks.myTasks, ...tasks.followUpTasks];
      const uniqueMap = new Map();
      
      for (const order of combined) {
        if (uniqueMap.has(order.id)) {
          const existing = uniqueMap.get(order.id);
          const existingItemIds = new Set(existing.order_items.map((i: any) => i.id));
          const newItems = order.order_items.filter((i: any) => !existingItemIds.has(i.id));
          if (newItems.length > 0) {
            existing.order_items.push(...newItems);
          }
        } else {
          uniqueMap.set(order.id, { ...order, order_items: [...order.order_items] });
        }
      }
      
      list = Array.from(uniqueMap.values()).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    if (!searchQuery.trim()) return list;
    const q = searchQuery.trim().toLowerCase();
    return list.filter((order: any) => {
      const code = String(order.order_code || '').toLowerCase();
      const customer = String(order.shipping_name || '').toLowerCase();
      const phone = String(order.shipping_phone || '').toLowerCase();
      const creator = String(order.creator_name || '').toLowerCase();
      const branch = String(order.branch_name || '').toLowerCase();
      const matchItem = (order.order_items || []).some((item: any) => {
        const name = String(item.products?.name || '').toLowerCase();
        const sku = String(item.products?.sku || '').toLowerCase();
        return name.includes(q) || sku.includes(q);
      });
      return code.includes(q) || customer.includes(q) || phone.includes(q) || creator.includes(q) || branch.includes(q) || matchItem;
    });
  }, [activeTab, tasks, searchQuery])

  if (loading && branches.length === 0) {
    return <div className="min-h-screen bg-slate-50 text-slate-500 flex items-center justify-center font-semibold text-sm">กำลังโหลดข้อมูลระบบจัดส่ง...</div>
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans select-none pb-20">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-800">ระบบจัดการสินค้ารอจัดส่ง</h1>
              <span className="px-2.5 py-0.5 text-[10px] font-bold bg-[#B8956A] text-white rounded-full">
                Admin Panel
              </span>
            </div>
            <p className="text-slate-500 text-sm mt-1">ตรวจสอบรายการบิลค้างส่งและติดตามสถานะสินค้าข้ามสาขา ควบคุมได้ทุกสาขาและพนักงานขาย</p>
          </div>
          <button
            onClick={() => loadData(selectedBranch, selectedSeller)}
            className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#B8956A]' : ''}`} />
            รีเฟรชข้อมูล
          </button>
        </div>

        {/* 🏢 Filter Toolbar สำหรับ Admin (สาขา, เซลล์, ค้นหา) */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
            {/* กรองสาขา */}
            <div className="lg:col-span-4 relative">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-[#B8956A]" />
                สาขาที่ควบคุม
              </label>
              <div className="relative">
                <select
                  value={selectedBranch}
                  onChange={e => {
                    const val = e.target.value === 'ALL' ? 'ALL' : Number(e.target.value)
                    setSelectedBranch(val)
                  }}
                  className="w-full text-xs font-bold p-2.5 pl-8 pr-8 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-lg outline-none focus:border-[#B8956A] focus:bg-white text-slate-800 transition-all appearance-none cursor-pointer"
                >
                  <option value="ALL">🌐 ทุกสาขาทั่วประเทศ (All Branches)</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>
                      📍 {b.branch_name}
                    </option>
                  ))}
                </select>
                <Store className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* กรองเซลล์ */}
            <div className="lg:col-span-4 relative">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#B8956A]" />
                พนักงานขาย / เซลล์
              </label>
              <div className="relative">
                <select
                  value={selectedSeller}
                  onChange={e => setSelectedSeller(e.target.value)}
                  className="w-full text-xs font-bold p-2.5 pl-8 pr-8 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-lg outline-none focus:border-[#B8956A] focus:bg-white text-slate-800 transition-all appearance-none cursor-pointer"
                >
                  <option value="ALL">👥 พนักงานขายทุกคน ({uniqueSellers.length} ท่าน)</option>
                  {uniqueSellers.map(s => (
                    <option key={s.id} value={s.id}>
                      👤 {s.name}
                    </option>
                  ))}
                </select>
                <User className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* ช่องค้นหา Realtime */}
            <div className="lg:col-span-4 relative">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-[#B8956A]" />
                ค้นหาบิล / ลูกค้า / SKU
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="เลขที่บิล, ชื่อลูกค้า, เบอร์โทร, SKU..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full text-xs font-medium p-2.5 pl-8 pr-8 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-lg outline-none focus:border-[#B8956A] focus:bg-white text-slate-800 transition-all"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Selection (เหมือนของเซลล์ 100%) */}
        <div className="flex flex-col md:flex-row gap-2 p-1 bg-white rounded-lg w-full md:max-w-3xl border border-slate-200 shadow-sm">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-sm font-bold rounded-md transition-colors ${activeTab === 'overview' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <List className="w-4 h-4" /> ภาพรวมทั้งหมด ({
              (() => {
                const combined = [...tasks.myTasks, ...tasks.followUpTasks];
                const uniqueIds = new Set(combined.map(t => t.id));
                return uniqueIds.size;
              })()
            })
          </button>
          <button
            onClick={() => setActiveTab('my_tasks')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-sm font-bold rounded-md transition-colors ${activeTab === 'my_tasks' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Package className="w-4 h-4" /> คลังเราต้องจัดส่ง ({tasks.myTasks.filter((t: any) => t.status !== 'PENDING').length})
          </button>
          <button
            onClick={() => setActiveTab('follow_ups')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-sm font-bold rounded-md transition-colors ${activeTab === 'follow_ups' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Activity className="w-4 h-4" /> ติดตามสาขาอื่น ({tasks.followUpTasks.filter((t: any) => t.status !== 'PENDING').length})
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-sm font-bold rounded-md transition-colors ${activeTab === 'completed' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Archive className="w-4 h-4" /> ประวัติสำเร็จ ({tasks.completedTasks.length})
          </button>
          <button
            onClick={() => setActiveTab('cancelled')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-sm font-bold rounded-md transition-colors ${activeTab === 'cancelled' ? 'bg-red-500 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <XCircle className="w-4 h-4" /> ยกเลิกแล้ว ({tasks.cancelledTasks.length})
          </button>
        </div>

        {/* Order List */}
        <div className="space-y-4">
          {currentData.length === 0 ? (
            <div className="py-16 bg-white rounded-xl text-center text-slate-400 font-medium border border-dashed border-slate-300">
              ไม่มีรายการบิลในหมวดหมู่นี้
            </div>
          ) : (
            currentData.map((order: any, index: number) => {
              const isExpanded = expandedOrders.includes(order.id)

              const hasCoordinates = order.latitude && order.longitude;
              const isStorefrontTakeaway = (!order.shipping_address && !hasCoordinates) || (order.shipping_address?.includes('[รับหน้าร้าน]') && !hasCoordinates);
              const isMyTask = tasks.myTasks.some(t => t.id === order.id)

              const outOfStockSnapshot = (order.discount_snapshot?.out_of_stock_products || []).map(String)
              const isOrderPreOrderFromStart = Boolean(order.discount_snapshot?.is_preorder)

              const isAnyItemOutOfStock = order.order_items.some((item: any) => {
                const branchStock = item.products?.stock?.find((s: any) => Number(s.branch_id) === Number(item.fulfill_branch_id))
                const currentLiveQty = branchStock ? Number(branchStock.qty) : 0
                return currentLiveQty < item.qty
              })

              const hasPreOrderItems = order.order_items.some((item: any) => {
                const branchStock = item.products?.stock?.find((s: any) => Number(s.branch_id) === Number(item.fulfill_branch_id))
                const currentLiveQty = branchStock ? Number(branchStock.qty) : 0
                return (currentLiveQty < item.qty && isOrderPreOrderFromStart) || outOfStockSnapshot.includes(String(item.products?.id)) || currentLiveQty < 0
              })

              const hasFrontRunItem = order.order_items.some((item: any) => {
                const branchStock = item.products?.stock?.find((s: any) => Number(s.branch_id) === Number(item.fulfill_branch_id))
                const currentLiveQty = branchStock ? Number(branchStock.qty) : 0
                const isOut = currentLiveQty < item.qty && order.status === 'PENDING'
                const isKnown = isOut && (isOrderPreOrderFromStart || outOfStockSnapshot.includes(String(item.products?.id)))
                return isOut && !isKnown
              })

              return (
                <div key={`${order.id}-${index}`} className={`bg-white border rounded-xl shadow-sm overflow-hidden transition-all ${hasFrontRunItem && order.status === 'PENDING' ? 'border-rose-400' : isAnyItemOutOfStock && order.status === 'PENDING' ? 'border-amber-300' : 'border-slate-200'}`}>
                  {/* Order Header */}
                  <div
                    onClick={() => toggleExpand(order.id)}
                    className="flex flex-wrap md:flex-nowrap items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border ${isStorefrontTakeaway ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                        <Package className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-sm font-bold text-slate-800 block">
                          เลขที่บิล: {order.order_code}
                          {activeTab === 'overview' && (
                            <span className={`ml-2 text-[10px] px-2 py-0.5 rounded border ${isMyTask ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                              {isMyTask ? 'คลังเราแพ็ค' : 'สาขาอื่นแพ็ค'}
                            </span>
                          )}
                          <span className="ml-2 text-[10px] px-2 py-0.5 rounded border bg-slate-100 text-slate-700 border-slate-200">
                            🏢 {order.branch_name || 'ไม่ระบุสาขา'}
                          </span>
                        </span>
                        <span className="text-xs text-slate-500 font-medium mt-0.5 flex flex-wrap items-center gap-1.5">
                          <span>วันที่: {new Date(order.created_at).toLocaleDateString('th-TH')}</span>
                          <span>| ลูกค้า: {order.shipping_name || 'ไม่ได้ระบุ'}</span>
                          {order.total_amount !== undefined && (
                            <span className="font-bold text-slate-800">| ยอดรวม: ฿{Number(order.total_amount).toLocaleString()}</span>
                          )}
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            <User className="w-3 h-3 text-slate-500" />
                            ผู้เปิดบิล: <strong className="text-slate-900">{order.creator_name || 'ไม่ระบุ'}</strong>
                          </span>
                          {order.discount_snapshot?.approved_by_name && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200" title={`อนุมัติตัดสต็อกเมื่อ: ${order.discount_snapshot.approved_at ? new Date(order.discount_snapshot.approved_at).toLocaleString('th-TH') : '-'}`}>
                              <CheckCircle className="w-3 h-3 text-emerald-600" />
                              อนุมัติรับเงิน: <strong className="text-emerald-950">{order.discount_snapshot.approved_by_name}</strong>
                              <span className={`px-1 py-0.2 rounded text-[9px] font-bold ${
                                order.discount_snapshot.approved_by_role === 'admin' 
                                  ? 'bg-amber-100 text-amber-800' 
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}>
                                {order.discount_snapshot.approved_by_role === 'admin' ? '👑 แอดมิน' : 'เซลล์'}
                              </span>
                            </span>
                          )}
                          {order.discount_snapshot?.delivered_by_name && order.status === 'COMPLETED' && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200" title={`ส่งมอบสำเร็จเมื่อ: ${order.discount_snapshot.delivered_at ? new Date(order.discount_snapshot.delivered_at).toLocaleString('th-TH') : '-'}`}>
                              <Truck className="w-3 h-3 text-blue-600" />
                              ส่งมอบโดย: <strong className="text-blue-950">{order.discount_snapshot.delivered_by_name}</strong>
                              <span className={`px-1 py-0.2 rounded text-[9px] font-bold ${
                                order.discount_snapshot.delivered_by_role === 'admin' 
                                  ? 'bg-amber-100 text-amber-800' 
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {order.discount_snapshot.delivered_by_role === 'admin' ? '👑 แอดมิน' : 'เซลล์'}
                              </span>
                            </span>
                          )}
                          {order.discount_snapshot?.coupon && (
                            <span className="px-1.5 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded text-[10px] font-bold inline-flex items-center gap-1">
                              🎟️ โค้ด: {order.discount_snapshot.coupon.code} (-฿{Number(order.discount_snapshot.coupon.discount_amount ?? order.discount_snapshot.coupon.discountAmount ?? order.discount_snapshot.coupon.amount ?? 0).toLocaleString()})
                            </span>
                          )}
                          {order.status === 'CANCELLED' && order.discount_snapshot?.cancel_reason && (
                            <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded text-[10px] font-bold inline-flex items-center gap-1" title={order.discount_snapshot.cancel_reason}>
                              <FileText className="w-3 h-3 text-rose-500" />
                              โน้ตยกเลิก: {order.discount_snapshot.cancel_reason}
                            </span>
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 mt-3 md:mt-0 ml-14 md:ml-0">
                      {hasFrontRunItem && order.status === 'PENDING' ? (
                        <span className="flex items-center gap-1 text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-300 px-2.5 py-0.5 rounded-full shadow-2xs animate-pulse">
                          <AlertTriangle className="w-3 h-3 text-rose-600" /> 🚨 โดนซื้อตัดหน้า!
                        </span>
                      ) : hasPreOrderItems && (order.status === 'PENDING' || order.status === 'PROCESSING') ? (
                        <span className="flex items-center gap-1 text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 px-2.5 py-0.5 rounded-full shadow-2xs">
                          <AlertTriangle className="w-3 h-3 text-amber-600" /> 📦 มีสินค้าพรีออเดอร์
                        </span>
                      ) : null}

                      <span className={`text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5 ${
                        order.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                        order.status === 'PROCESSING' ? 'bg-blue-100 text-blue-800' :
                        order.status === 'CANCELLED' ? 'bg-rose-100 text-rose-800' :
                        isAnyItemOutOfStock ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {order.status === 'COMPLETED' ? (
                          <><CheckCircle className="w-3.5 h-3.5" /> ส่งมอบสำเร็จ</>
                        ) : order.status === 'CANCELLED' ? (
                          <><XCircle className="w-3.5 h-3.5" /> ยกเลิกแล้ว</>
                        ) : order.status === 'PENDING' ? (
                          <><Banknote className="w-3.5 h-3.5" /> รอชำระเงิน {order.order_items.length} รายการ</>
                        ) : (
                          <><Package className="w-3.5 h-3.5" /> รอแพ็คจัดส่ง {order.order_items.length} รายการ</>
                        )}
                      </span>
                      {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 bg-slate-50/50 p-4 md:p-6">
                      {order.status === 'CANCELLED' && (
                        <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-900">
                          <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <span className="font-bold">บิลนี้ถูกยกเลิกแล้ว</span>
                            {order.discount_snapshot?.cancel_reason && (
                              <p className="text-rose-700 mt-0.5 font-medium">
                                <span className="font-semibold">เหตุผล/บันทึก (Note):</span> {order.discount_snapshot.cancel_reason}
                              </p>
                            )}
                            {order.discount_snapshot?.cancelled_at && (
                              <p className="text-[10px] text-rose-500 mt-1">
                                วันเวลาที่ยกเลิก: {new Date(order.discount_snapshot.cancelled_at).toLocaleString('th-TH')} {order.discount_snapshot.cancelled_by_name ? `โดย ${order.discount_snapshot.cancelled_by_name}` : ''}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                        {/* Column 1: Items List */}
                        <div className="lg:col-span-2 space-y-3">
                          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">รายการสินค้าในความรับผิดชอบ</h3>
                          <div className="space-y-2">
                            {order.order_items.map((item: any, itemIndex: number) => {
                              const branchStock = item.products?.stock?.find((s: any) => Number(s.branch_id) === Number(item.fulfill_branch_id))
                              const currentLiveQty = branchStock ? Number(branchStock.qty) : 0
                              const isOutOfStock = currentLiveQty < item.qty && order.status === 'PENDING'
                              const isKnownPreOrder = order.status === 'PENDING'
                                ? (isOutOfStock && (isOrderPreOrderFromStart || outOfStockSnapshot.includes(String(item.products?.id || item.product_id))))
                                : (outOfStockSnapshot.includes(String(item.products?.id || item.product_id)) || currentLiveQty < 0)
                              const isFrontRun = isOutOfStock && !isKnownPreOrder

                              return (
                                <div key={`${item.id}-${itemIndex}`} className={`flex items-center gap-3 p-3 rounded-lg border shadow-sm ${isFrontRun ? 'bg-rose-50/50 border-rose-200' : isKnownPreOrder ? 'bg-amber-50/40 border-amber-200' : 'bg-white border-slate-200'}`}>
                                  <div className="w-12 h-12 rounded-md border flex items-center justify-center shrink-0 bg-slate-50 border-slate-100">
                                    {item.products?.image_url ? (
                                      <img src={item.products?.image_url} alt={item.products?.name} className="w-full h-full object-contain p-1" />
                                    ) : (
                                      <span className="text-[10px] text-slate-300">No Img</span>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <span className={`text-sm font-semibold block truncate ${isFrontRun ? 'text-rose-900' : isKnownPreOrder ? 'text-amber-900' : 'text-slate-800'}`}>
                                      {item.products?.name}
                                    </span>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <span className="flex items-center gap-1 text-[10px] font-bold bg-[#B8956A]/10 text-[#8C6D42] border border-[#B8956A]/20 px-1.5 py-0.5 rounded shadow-sm">
                                        <Store className="w-2.5 h-2.5" /> คลัง: {item.branches?.branch_name || `สาขา ${item.fulfill_branch_id}`}
                                      </span>
                                      <span className="text-xs text-slate-500 block">SKU: {item.products?.sku}</span>
                                      {isFrontRun && (
                                        <span className="flex items-center gap-1 text-[9px] text-rose-700 font-bold bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded shadow-xs animate-pulse">
                                          <AlertTriangle className="w-2.5 h-2.5 text-rose-600" /> โดนตัดหน้า! (เหลือ {currentLiveQty})
                                        </span>
                                      )}
                                      {isKnownPreOrder && (
                                        <span className="flex items-center gap-1 text-[9px] text-amber-800 font-bold bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded shadow-xs">
                                          <AlertTriangle className="w-2.5 h-2.5 text-amber-600" /> พรีออเดอร์ (มีในคลัง {currentLiveQty})
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <span className="text-sm font-bold block text-slate-800">x{item.qty}</span>
                                    <span className="text-[11px] font-bold block text-emerald-600">{Number(item.price_at_sale).toLocaleString()} ฿</span>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>

                        {/* Column 2: Shipping Info & Actions */}
                        <div className="flex flex-col gap-4">
                          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-center">
                            {isStorefrontTakeaway ? (
                              <div className="text-center space-y-2 py-4">
                                <div className="mx-auto w-10 h-10 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mb-1">
                                  <Store className="w-5 h-5" />
                                </div>
                                <p className="text-sm font-bold text-indigo-700">ลูกค้ารับสินค้าหน้าร้าน</p>
                                <p className="text-xs text-slate-500">กรุณาพิมพ์เอกสารให้ลูกค้าก่อนส่งมอบ</p>
                                <div className="pt-2">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setEditingCustomerOrder(order)
                                    }}
                                    className="mx-auto px-2.5 py-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-md flex items-center gap-1 transition-colors cursor-pointer"
                                  >
                                    <Edit className="w-3 h-3" /> แก้ไขชื่อลูกค้า / ข้อมูลติดต่อ
                                  </button>
                                </div>

                                <div className="pt-2 border-t border-slate-100 mt-2 text-left">
                                  <p className="text-xs text-slate-600">
                                    <span className="font-semibold text-slate-700">ลูกค้า:</span> {order.shipping_name || 'ลูกค้าหน้าร้าน (ไม่ได้ระบุชื่อ)'}
                                  </p>
                                  {order.shipping_phone && (
                                    <p className="text-xs text-slate-600 mt-1">
                                      <span className="font-semibold text-slate-700">เบอร์โทร:</span> {order.shipping_phone}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                                  <div className="flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-rose-500" />
                                    <span className="text-xs font-bold text-slate-700">สถานที่จัดส่งสินค้า</span>
                                  </div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setEditingCustomerOrder(order)
                                    }}
                                    className="px-2 py-0.5 text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded flex items-center gap-1 transition-colors cursor-pointer"
                                  >
                                    <Edit className="w-3 h-3" /> แก้ไขที่อยู่
                                  </button>
                                </div>

                                <div className="space-y-2">
                                  <p className="text-xs text-slate-700 font-medium">
                                    <span className="font-bold text-slate-900">{order.shipping_name || 'ไม่ได้ระบุชื่อ'}</span>
                                    {order.shipping_phone && <span className="text-slate-500 font-normal"> ({order.shipping_phone})</span>}
                                  </p>
                                  <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-100 leading-relaxed">
                                    {order.shipping_address || 'ไม่มีข้อมูลที่อยู่จัดส่ง'}
                                  </p>

                                  {hasCoordinates && (
                                    <div className="pt-2">
                                      <div className="w-full h-32 rounded-lg overflow-hidden border border-slate-200 shadow-inner relative mb-2">
                                        <iframe
                                          width="100%"
                                          height="100%"
                                          frameBorder="0"
                                          scrolling="no"
                                          marginHeight={0}
                                          marginWidth={0}
                                          src={`https://maps.google.com/maps?q=${order.latitude},${order.longitude}&hl=th&z=15&output=embed`}
                                          className="pointer-events-none"
                                        />
                                      </div>

                                      <div className="bg-emerald-50 border border-emerald-100 p-2.5 rounded-lg flex flex-col gap-2">
                                        <p className="text-[10px] text-emerald-700 font-mono font-medium text-center truncate">
                                          {order.latitude}, {order.longitude}
                                        </p>
                                        <a
                                          href={`https://www.google.com/maps/dir/?api=1&destination=${order.latitude},${order.longitude}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="w-full py-2 bg-emerald-600 text-white rounded text-xs font-bold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                                        >
                                          <Navigation className="w-3.5 h-3.5" /> นำทาง (Google Maps)
                                        </a>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </>
                            )}
                          </div>

                          {/* 🎟️ ข้อมูลคูปองส่วนลด (ถ้ามี) */}
                          {order.discount_snapshot?.coupon && (
                            <div className="p-3 bg-purple-50/80 border border-purple-200/80 rounded-xl text-xs space-y-1 mt-2">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-purple-900 flex items-center gap-1.5">
                                  🎟️ ใช้โค้ดส่วนลด: <span className="font-mono font-black">{order.discount_snapshot.coupon.code}</span>
                                </span>
                                <span className="font-black text-purple-700 bg-white px-2 py-0.5 rounded-md border border-purple-200">
                                  -฿{Number(order.discount_snapshot.coupon.discount_amount ?? order.discount_snapshot.coupon.discountAmount ?? order.discount_snapshot.coupon.amount ?? 0).toLocaleString()}
                                </span>
                              </div>
                              {(order.discount_snapshot.coupon.partner_company || order.discount_snapshot.coupon.lead_sales || order.discount_snapshot.coupon.partner_sales) && (
                                <div className="flex flex-wrap gap-1.5 text-[10px] text-purple-800 pt-0.5">
                                  {order.discount_snapshot.coupon.partner_company && (
                                    <span className="bg-purple-100/70 px-1.5 py-0.5 rounded font-medium">
                                      🏢 คู่ค้า: {order.discount_snapshot.coupon.partner_company}
                                    </span>
                                  )}
                                  {(order.discount_snapshot.coupon.lead_sales || order.discount_snapshot.coupon.partner_sales) && (
                                    <span className="bg-purple-100/70 px-1.5 py-0.5 rounded font-medium">
                                      👤 เซลล์: {order.discount_snapshot.coupon.lead_sales || order.discount_snapshot.coupon.partner_sales}
                                    </span>
                                  )}
                                </div>
                              )}
                              <p className="text-[10px] text-purple-600 font-medium">
                                {order.status === 'PENDING' 
                                  ? '⏳ สิทธิ์คูปองจะถูกนับใช้งาน (used_count +1) เมื่อกด "ยืนยันรับชำระเงิน & ตัดสต็อก" สำเร็จ' 
                                  : '✓ บิลนี้ชำระเงินสำเร็จแล้ว และได้นับการใช้สิทธิ์คูปองเรียบร้อย'}
                              </p>
                            </div>
                          )}

                          {/* 🛡️ บันทึกประวัติผู้ดำเนินการ (Audit Trail - ตรวจสอบได้ว่าใครกดยืนยัน) */}
                          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5 mt-2">
                            <div className="font-bold text-slate-700 flex items-center justify-between border-b border-slate-200/60 pb-1">
                              <span className="flex items-center gap-1.5">
                                <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
                                ประวัติผู้ทำรายการ (ใครกดยืนยัน)
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {order.status === 'COMPLETED' ? 'ปิดงานแล้ว' : order.status === 'CANCELLED' ? 'ยกเลิกแล้ว' : order.status === 'PROCESSING' ? 'ตัดสต็อกแล้ว' : 'รอชำระเงิน'}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-600 space-y-1 pt-0.5">
                              <div>• ผู้เปิดบิล (Quotation): <strong className="text-slate-800">{order.creator_name || 'ไม่ระบุ'}</strong> ({new Date(order.created_at).toLocaleString('th-TH')})</div>
                              
                              {order.discount_snapshot?.approved_by_name && (
                                <div className="text-emerald-700">
                                  • กดยืนยันรับเงิน & ตัดสต็อกโดย: <strong className="text-emerald-900">{order.discount_snapshot.approved_by_name}</strong>{' '}
                                  <span className={`px-1 py-0.2 rounded text-[9px] font-bold ${order.discount_snapshot.approved_by_role === 'admin' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                                    {order.discount_snapshot.approved_by_role === 'admin' ? '👑 แอดมิน' : 'เซลล์'}
                                  </span>{' '}
                                  {order.discount_snapshot.approved_at && `เมื่อ ${new Date(order.discount_snapshot.approved_at).toLocaleString('th-TH')}`}
                                </div>
                              )}

                              {order.discount_snapshot?.delivered_by_name && (
                                <div className="text-blue-700">
                                  • กดยืนยันส่งมอบสินค้าโดย: <strong className="text-blue-900">{order.discount_snapshot.delivered_by_name}</strong>{' '}
                                  <span className={`px-1 py-0.2 rounded text-[9px] font-bold ${order.discount_snapshot.delivered_by_role === 'admin' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}>
                                    {order.discount_snapshot.delivered_by_role === 'admin' ? '👑 แอดมิน' : 'เซลล์'}
                                  </span>{' '}
                                  {order.discount_snapshot.delivered_at && `เมื่อ ${new Date(order.discount_snapshot.delivered_at).toLocaleString('th-TH')}`}
                                </div>
                              )}

                              {order.discount_snapshot?.cancelled_by_name && (
                                <div className="text-rose-700">
                                  • กดยกเลิกบิลโดย: <strong className="text-rose-900">{order.discount_snapshot.cancelled_by_name}</strong>{' '}
                                  {order.discount_snapshot.cancelled_at && `เมื่อ ${new Date(order.discount_snapshot.cancelled_at).toLocaleString('th-TH')}`}{' '}
                                  {order.discount_snapshot.cancel_reason && `(เหตุผล: ${order.discount_snapshot.cancel_reason})`}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="space-y-2 pt-2">
                            {activeTab === 'cancelled' || order.status === 'CANCELLED' ? (
                              <div className="w-full py-3 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-bold flex items-center justify-center gap-2 shadow-sm cursor-not-allowed">
                                <XCircle className="w-4 h-4" /> บิลนี้ถูกยกเลิกแล้ว
                              </div>
                            ) : activeTab === 'completed' || order.status === 'COMPLETED' ? (
                              <div className="space-y-2.5">
                                <div className="w-full py-3 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-lg text-sm font-bold flex items-center justify-center gap-2 shadow-sm cursor-not-allowed">
                                  <CheckCircle className="w-4 h-4" /> บิลนี้ปิดงาน/ส่งมอบสำเร็จแล้ว
                                </div>
                                <PaymentSlipUploader orderId={order.id} orderCode={order.order_code} />
                              </div>
                            ) : (
                                <>
                                  {(order.status === 'PENDING' || order.status === 'PROCESSING') && (
                                    <PaymentSlipUploader orderId={order.id} orderCode={order.order_code} />
                                  )}

                                  {order.status === 'PENDING' && (
                                    <button
                                      onClick={() => handleApproveStock(order.id, order.order_code, order.order_items)}
                                      disabled={approvingId === order.id}
                                      className={`w-full py-2.5 text-white rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer
                                        ${hasFrontRunItem ? 'bg-rose-600 hover:bg-rose-700' : isAnyItemOutOfStock ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-500 hover:bg-emerald-600'}`}
                                    >
                                      {approvingId === order.id ? (
                                        'กำลังดำเนินการ...'
                                      ) : hasFrontRunItem ? (
                                        <><AlertTriangle className="w-4 h-4" /> ตรวจพบสินค้าโดนตัดหน้า (คลิกดูทางเลือก)</>
                                      ) : isAnyItemOutOfStock ? (
                                        <><AlertTriangle className="w-4 h-4" /> ยืนยันรับชำระเงิน (มีรายการพรีออเดอร์)</>
                                      ) : (
                                        <><Banknote className="w-4 h-4" /> ยืนยันรับชำระเงิน & ตัดสต็อก</>
                                      )}
                                    </button>
                                  )}

                                {order.status !== 'PENDING' && (
                                  !isMyTask ? (
                                    <div className="w-full py-2.5 bg-slate-100 text-slate-500 border border-slate-200 rounded-lg text-sm font-bold flex items-center justify-center gap-2 shadow-sm cursor-not-allowed mt-2">
                                      <Activity className="w-4 h-4" /> รอสาขาปลายทางจัดส่งสินค้า
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => handleCompleteOrder(order.id, order.order_code, order.order_items)}
                                      disabled={processingId === order.id}
                                      className={`w-full py-2.5 text-white rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2 shadow-sm mt-2 ${isStorefrontTakeaway ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                                    >
                                      <CheckCircle className="w-4 h-4" />
                                      {processingId === order.id ? 'กำลังอัปเดต...' :
                                          (isStorefrontTakeaway ? 'ส่งมอบลูกค้าหน้าร้านแล้ว' : 'จัดส่งเรียบร้อยแล้ว')
                                      }
                                    </button>
                                  )
                                )}
                              </>
                            )}

                            <div className="flex items-center gap-2 mt-2">
                              <button
                                onClick={() => handlePrintSlip(order.order_code)}
                                className="flex-1 py-2.5 px-3 bg-white border border-slate-300 text-slate-700 rounded-lg text-xs md:text-sm font-bold hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                                title="พิมพ์ใบเสร็จ / ใบเสนอราคา"
                              >
                                <Printer className="w-4 h-4 shrink-0" /> พิมพ์เอกสาร
                              </button>
                              <button
                                onClick={() => handlePrintPdf(order.order_code)}
                                className="w-[42px] h-[42px] shrink-0 bg-white hover:bg-red-50 active:scale-95 border border-slate-300 hover:border-red-400 rounded-lg shadow-sm flex items-center justify-center transition-all group"
                                title="พิมพ์ / บันทึกเป็น PDF"
                              >
                                <svg className="w-6 h-6 transition-transform group-hover:scale-110 drop-shadow-xs" viewBox="0 0 48 48" fill="none">
                                  <path d="M28 6H12C9.79086 6 8 7.79086 8 10V38C8 40.2091 9.79086 42 12 42H36C38.2091 42 40 40.2091 40 38V18L28 6Z" fill="#E11D48"/>
                                  <path d="M40 18H28V6L40 18Z" fill="#FDA4AF"/>
                                  <rect x="6" y="15" width="22" height="18" rx="2.5" fill="#BE123C"/>
                                  <text x="8" y="27.5" fill="white" fontSize="9" fontWeight="bold" fontFamily="sans-serif">PDF</text>
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDownloadCSV(order)}
                                className="w-[42px] h-[42px] shrink-0 bg-white hover:bg-emerald-50 active:scale-95 border border-slate-300 hover:border-emerald-500 rounded-lg shadow-sm flex items-center justify-center transition-all group"
                                title="ดาวน์โหลด Quote เป็นไฟล์ Excel (พร้อมรูปภาพ)"
                              >
                                <svg className="w-6 h-6 transition-transform group-hover:scale-110 drop-shadow-xs" viewBox="0 0 48 48" fill="none">
                                  <path d="M28 6H12C9.79086 6 8 7.79086 8 10V38C8 40.2091 9.79086 42 12 42H36C38.2091 42 40 40.2091 40 38V18L28 6Z" fill="#107C41"/>
                                  <path d="M40 18H28V6L40 18Z" fill="#33C481"/>
                                  <rect x="6" y="14" width="22" height="20" rx="3" fill="#185C37"/>
                                  <path d="M12 19L16.5 24L12 29H14.8L17.5 25.8L20.2 29H23L18.5 24L23 19H20.2L17.5 22.2L14.8 19H12Z" fill="white"/>
                                </svg>
                              </button>
                            </div>

                            {order.status === 'PENDING' && (
                              <button
                                onClick={() => {
                                  window.location.href = `/sale/pos?edit=${order.order_code}`
                                }}
                                className="w-full py-2.5 bg-orange-50 border border-orange-200 text-orange-600 rounded-lg text-sm font-bold hover:bg-orange-100 transition-colors flex items-center justify-center gap-2 shadow-sm mt-2 cursor-pointer"
                              >
                                <Edit className="w-4 h-4" /> แก้ไขบิลใน POS (เพิ่ม/ลดสินค้า)
                              </button>
                            )}

                            {activeTab !== 'cancelled' && order.status !== 'CANCELLED' && (
                              <button
                                onClick={() => handleCancelOrder(order.id, order.order_code, order.order_items, order.status)}
                                disabled={cancellingId === order.id}
                                className="w-full py-2.5 mt-4 bg-white border border-red-200 text-red-500 rounded-lg text-sm font-bold hover:bg-red-50 transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                              >
                                {cancellingId === order.id ? 'กำลังยกเลิกและคืนสต็อก...' : <><XCircle className="w-4 h-4" /> {order.status === 'COMPLETED' ? 'ยกเลิกบิลนี้ (คืนสต็อกเข้าคลัง)' : 'ยกเลิกออเดอร์นี้'}</>}
                              </button>
                            )}
                          </div>
                        </div>

                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* 🧩 Custom Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs px-4">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden flex flex-col p-6 items-center text-center animate-fade-in">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${confirmModal.confirmVariant === 'emerald' ? 'bg-emerald-50 text-emerald-600' :
                confirmModal.confirmVariant === 'blue' ? 'bg-blue-50 text-blue-600' :
                  confirmModal.confirmVariant === 'red' ? 'bg-red-50 text-red-600' :
                    confirmModal.confirmVariant === 'amber' ? 'bg-amber-50 text-amber-600' :
                      'bg-slate-50 text-slate-600'
              }`}>
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="font-black text-slate-800 text-base mb-2">
              {confirmModal.title}
            </h3>

            <p className="text-slate-500 text-xs mb-6 px-4 leading-relaxed whitespace-pre-line">
              {confirmModal.description}
            </p>

            {confirmModal.showOrderCodeInput && (
              <div className="w-full mb-6 text-left">
                <label className="text-[10px] font-bold text-slate-500 mb-1 block">รหัสออเดอร์ (ระบุเองได้ - ไม่บังคับ)</label>
                <input 
                  type="text" 
                  placeholder={`เช่น ${confirmModal.defaultOrderCode} หรือเว้นว่างไว้ใช้รหัสเดิม`}
                  value={modalCustomOrderCode}
                  onChange={e => setModalCustomOrderCode(e.target.value)}
                  className="w-full text-xs p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:border-emerald-400 focus:bg-white transition-colors" 
                />
              </div>
            )}

            {confirmModal.showCancelReasonInput && (
              <div className="w-full mb-5 text-left">
                <label className="text-[11px] font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>เหตุผลในการยกเลิกบิล (Note)</span>
                  <span className="text-[10px] text-slate-400 font-normal">ไม่บังคับ</span>
                </label>
                <textarea 
                  rows={2}
                  placeholder="เช่น ลูกค้าเปลี่ยนใจ, สั่งสินค้าผิดสเปก, เปลี่ยนแปลงยอดชำระ..."
                  value={modalCancelReason}
                  onChange={e => setModalCancelReason(e.target.value)}
                  className="w-full text-xs p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:border-rose-400 focus:bg-white transition-colors resize-none text-slate-700" 
                />
              </div>
            )}

            <div className="flex gap-3 w-full">
              <button
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-50 transition-all cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => {
                  confirmModal.onConfirm(modalCustomOrderCode, modalCancelReason)
                  setConfirmModal(prev => ({ ...prev, isOpen: false }))
                }}
                className={`flex-1 py-3 text-white rounded-xl font-bold text-xs transition-all cursor-pointer shadow-md flex items-center justify-center gap-1.5 ${confirmModal.confirmVariant === 'emerald' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' :
                    confirmModal.confirmVariant === 'blue' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-200' :
                      confirmModal.confirmVariant === 'red' ? 'bg-red-600 hover:bg-red-700 shadow-red-200' :
                        confirmModal.confirmVariant === 'amber' ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-200' :
                          'bg-slate-800 hover:bg-slate-900 shadow-slate-200'
                  }`}
              >
                <Save className="w-4 h-4" /> {confirmModal.confirmText || 'ยืนยัน'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🧩 Print Dispatch Modal */}
      <PrintDispatchModal 
        orderCode={printOrderCode} 
        autoPrint={printAutoPrint}
        onClose={() => {
          setPrintOrderCode(null)
          setPrintAutoPrint(false)
        }} 
      />

      {/* ✏️ Edit Customer & Shipping Info Modal */}
      <EditCustomerInfoModal
        isOpen={!!editingCustomerOrder}
        orderId={editingCustomerOrder?.id || null}
        orderCode={editingCustomerOrder?.order_code || ''}
        initialData={{
          shipping_name: editingCustomerOrder?.shipping_name || null,
          shipping_phone: editingCustomerOrder?.shipping_phone || null,
          shipping_address: editingCustomerOrder?.shipping_address || null
        }}
        onClose={() => setEditingCustomerOrder(null)}
        onSuccess={handleCustomerUpdated}
      />
    </div>
  )
}
