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
  RefreshCw,
  Building2,
  Calendar,
  Layers,
  Phone
} from 'lucide-react'
import { toast } from 'sonner'
import PrintDispatchModal from '@/components/PrintDispatchModal'
import EditCustomerInfoModal from '@/components/EditCustomerInfoModal'
import { downloadQuoteExcel } from '@/utils/exportQuote'
import PaymentSlipUploader from '@/components/PaymentSlipUploader'
import PaymentSlipViewer from '@/components/PaymentSlipViewer'

interface Branch {
  id: number
  branch_name: string
}

export default function AdminDispatchMonitorPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'my_tasks' | 'follow_ups' | 'completed' | 'cancelled'>('overview')
  const [tasks, setTasks] = useState<{ myTasks: any[]; followUpTasks: any[]; completedTasks: any[]; cancelledTasks: any[] }>({
    myTasks: [],
    followUpTasks: [],
    completedTasks: [],
    cancelledTasks: []
  })
  const [branches, setBranches] = useState<Branch[]>([])
  const [selectedBranch, setSelectedBranch] = useState<'ALL' | number>('ALL')
  const [selectedSeller, setSelectedSeller] = useState<'ALL' | string>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<number | null>(null)
  const [approvingId, setApprovingId] = useState<number | null>(null)
  const [cancellingId, setCancellingId] = useState<number | null>(null)
  const [expandedOrders, setExpandedOrders] = useState<number[]>([])
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

  // 1. โหลดรายชื่อสาขาทั้งหมดครั้งแรก
  useEffect(() => {
    getAllBranches().then(res => {
      if (res.success && res.data) {
        setBranches(res.data)
      }
    })
  }, [])

  // 2. โหลดข้อมูลงานจัดส่งตามตัวกรองสาขาและพนักงานขาย
  useEffect(() => {
    loadData(selectedBranch, selectedSeller)
  }, [selectedBranch, selectedSeller])

  async function loadData(branchId?: 'ALL' | number, sellerId?: 'ALL' | string) {
    setLoading(true)
    const b = branchId !== undefined ? branchId : selectedBranch
    const s = sellerId !== undefined ? sellerId : selectedSeller
    const res = await getGroupedDispatches(b, s)
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

  const toggleExpand = (orderId: number) => {
    setExpandedOrders(prev =>
      prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
    )
  }

  // ดึงรายชื่อพนักงานขายทั้งหมดที่มีรายการบิล
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
    setModalCustomOrderCode(orderCode)

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
        ? `⚠️ แจ้งเตือน: บิลนี้มีสินค้าพรีออเดอร์ (สต็อกในคลังไม่พอ):\n${outOfStockDetails}\n\nเมื่อกดยืนยัน ระบบจะบันทึกรับเงิน และ "ตัดสต็อกให้เป็นค่าติดลบ" เพื่อรอการรับสินค้าเข้าคลัง (Stock-in) ในภายหลัง\n\nต้องการยืนยันรับชำระเงินใช่หรือไม่?`
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

  // กรองตามแท็บหลัก
  const tabData = useMemo(() => {
    if (activeTab === 'my_tasks') return tasks.myTasks.filter((t: any) => t.status !== 'PENDING');
    if (activeTab === 'follow_ups') return tasks.followUpTasks.filter((t: any) => t.status !== 'PENDING');
    if (activeTab === 'completed') return tasks.completedTasks;
    if (activeTab === 'cancelled') return tasks.cancelledTasks;

    // Overview Tab
    const combined = [...tasks.myTasks, ...tasks.followUpTasks];
    const seen = new Set();
    return combined.filter(item => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }, [tasks, activeTab])

  // กรองด้วย Search Input (ค้นหาเลขที่บิล, ชื่อลูกค้า, เบอร์โทร, เซลล์, สาขา, สินค้า, SKU)
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return tabData;
    const q = searchQuery.trim().toLowerCase();
    return tabData.filter((order: any) => {
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
  }, [tabData, searchQuery])

  // ยอดสรุปสถิติ (KPIs)
  const stats = useMemo(() => {
    const calc = (list: any[]) => {
      const unique = Array.from(new Set(list.map(o => o.id))).map(id => list.find(o => o.id === id));
      const count = unique.length;
      const total = unique.reduce((acc, curr) => acc + (Number(curr.total_amount) || 0), 0);
      return { count, total };
    };

    return {
      myTasks: calc(tasks.myTasks.filter((t: any) => t.status !== 'PENDING')),
      followUps: calc(tasks.followUpTasks.filter((t: any) => t.status !== 'PENDING')),
      completed: calc(tasks.completedTasks),
      cancelled: calc(tasks.cancelledTasks)
    };
  }, [tasks]);

  return (
    <div className="min-h-screen bg-slate-50/70 p-4 md:p-8 space-y-6">
      {/* 🚀 Header & Controller Bar */}
      <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200/80 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 shadow-xs">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">
                  มอนิเตอร์ค้างส่ง (สำหรับ Admin)
                </h1>
                <span className="px-2.5 py-0.5 text-[11px] font-black bg-indigo-600 text-white rounded-full">
                  Admin Dispatch Control
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                ระบบควบคุมและติดตามสถานะงานจัดส่งสินค้า บิลค้างส่ง และการตัดสต็อกข้ามสาขาทั่วประเทศ
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              loadData(selectedBranch, selectedSeller)
              toast.info('กำลังรีเฟรชข้อมูลล่าสุด...')
            }}
            disabled={loading}
            className="self-start md:self-auto py-2.5 px-4 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
            รีเฟรชข้อมูล
          </button>
        </div>

        {/* 🏢 Filter Toolbar: Branch, Salesperson, Search */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 pt-4 border-t border-slate-100">
          {/* 1. ฟิลเตอร์สาขา */}
          <div className="lg:col-span-4 relative">
            <label className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-indigo-500" />
              สาขาที่ควบคุม
            </label>
            <div className="relative">
              <select
                value={selectedBranch}
                onChange={e => {
                  const val = e.target.value === 'ALL' ? 'ALL' : Number(e.target.value)
                  setSelectedBranch(val)
                }}
                className="w-full text-xs font-bold p-2.5 pl-9 pr-8 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:bg-white text-slate-800 transition-all appearance-none cursor-pointer"
              >
                <option value="ALL">🌐 ดูรวมทุกสาขาทั่วประเทศ (All Branches)</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>
                    📍 {b.branch_name}
                  </option>
                ))}
              </select>
              <Store className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* 2. ฟิลเตอร์พนักงานขาย */}
          <div className="lg:col-span-4 relative">
            <label className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-blue-500" />
              พนักงานขาย / เซลล์
            </label>
            <div className="relative">
              <select
                value={selectedSeller}
                onChange={e => setSelectedSeller(e.target.value)}
                className="w-full text-xs font-bold p-2.5 pl-9 pr-8 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:bg-white text-slate-800 transition-all appearance-none cursor-pointer"
              >
                <option value="ALL">👥 พนักงานขายทุกคน ({uniqueSellers.length} ท่าน)</option>
                {uniqueSellers.map(s => (
                  <option key={s.id} value={s.id}>
                    👤 {s.name}
                  </option>
                ))}
              </select>
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* 3. ค้นหาแบบ Real-time */}
          <div className="lg:col-span-4 relative">
            <label className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-emerald-500" />
              ค้นหาบิล / ลูกค้า / สินค้า
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="เลขที่บิล, ชื่อลูกค้า, เบอร์โทร, SKU..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full text-xs font-medium p-2.5 pl-9 pr-3 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:bg-white text-slate-800 transition-all"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs p-1"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 📊 KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: งานคลังจัดส่ง */}
        <div 
          onClick={() => setActiveTab('my_tasks')}
          className={`p-4 md:p-5 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'my_tasks'
              ? 'bg-blue-600 text-white border-blue-600 shadow-md scale-[1.01]'
              : 'bg-white text-slate-800 border-slate-200/80 hover:border-blue-300 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-bold ${activeTab === 'my_tasks' ? 'text-blue-100' : 'text-slate-500'}`}>
              คลังจัดส่ง (Deliveries)
            </span>
            <Package className={`w-4 h-4 ${activeTab === 'my_tasks' ? 'text-white' : 'text-blue-500'}`} />
          </div>
          <div className="text-xl md:text-2xl font-black">
            {stats.myTasks.total.toLocaleString()} ฿
          </div>
          <div className={`text-[11px] font-medium mt-1 ${activeTab === 'my_tasks' ? 'text-blue-100' : 'text-slate-400'}`}>
            พบ {stats.myTasks.count} บิลค้างส่ง
          </div>
        </div>

        {/* Card 2: ฝากส่งข้ามสาขา Drop Ship */}
        <div 
          onClick={() => setActiveTab('follow_ups')}
          className={`p-4 md:p-5 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'follow_ups'
              ? 'bg-amber-500 text-white border-amber-500 shadow-md scale-[1.01]'
              : 'bg-white text-slate-800 border-slate-200/80 hover:border-amber-300 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-bold ${activeTab === 'follow_ups' ? 'text-amber-100' : 'text-slate-500'}`}>
              ฝากส่งข้ามสาขา (Drop Ship)
            </span>
            <Truck className={`w-4 h-4 ${activeTab === 'follow_ups' ? 'text-white' : 'text-amber-500'}`} />
          </div>
          <div className="text-xl md:text-2xl font-black">
            {stats.followUps.total.toLocaleString()} ฿
          </div>
          <div className={`text-[11px] font-medium mt-1 ${activeTab === 'follow_ups' ? 'text-amber-100' : 'text-slate-400'}`}>
            พบ {stats.followUps.count} บิลข้ามสาขา
          </div>
        </div>

        {/* Card 3: ส่งมอบสำเร็จ */}
        <div 
          onClick={() => setActiveTab('completed')}
          className={`p-4 md:p-5 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'completed'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-md scale-[1.01]'
              : 'bg-white text-slate-800 border-slate-200/80 hover:border-emerald-300 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-bold ${activeTab === 'completed' ? 'text-emerald-100' : 'text-slate-500'}`}>
              จัดส่งสำเร็จ (Completed)
            </span>
            <CheckCircle className={`w-4 h-4 ${activeTab === 'completed' ? 'text-white' : 'text-emerald-500'}`} />
          </div>
          <div className="text-xl md:text-2xl font-black">
            {stats.completed.total.toLocaleString()} ฿
          </div>
          <div className={`text-[11px] font-medium mt-1 ${activeTab === 'completed' ? 'text-emerald-100' : 'text-slate-400'}`}>
            ประวัติ {stats.completed.count} บิลล่าสุด
          </div>
        </div>

        {/* Card 4: บิลยกเลิก */}
        <div 
          onClick={() => setActiveTab('cancelled')}
          className={`p-4 md:p-5 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'cancelled'
              ? 'bg-rose-600 text-white border-rose-600 shadow-md scale-[1.01]'
              : 'bg-white text-slate-800 border-slate-200/80 hover:border-rose-300 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-bold ${activeTab === 'cancelled' ? 'text-rose-100' : 'text-slate-500'}`}>
              ยกเลิกแล้ว (Cancelled)
            </span>
            <Archive className={`w-4 h-4 ${activeTab === 'cancelled' ? 'text-white' : 'text-rose-500'}`} />
          </div>
          <div className="text-xl md:text-2xl font-black">
            {stats.cancelled.total.toLocaleString()} ฿
          </div>
          <div className={`text-[11px] font-medium mt-1 ${activeTab === 'cancelled' ? 'text-rose-100' : 'text-slate-400'}`}>
            พบ {stats.cancelled.count} บิลที่ยกเลิก
          </div>
        </div>
      </div>

      {/* 🧭 Navigation Tabs & Search Count */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-2">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {[
            { key: 'overview', label: 'ภาพรวมทั้งหมด', count: tasks.myTasks.length + tasks.followUpTasks.length },
            { key: 'my_tasks', label: 'งานคลังจัดส่ง', count: tasks.myTasks.filter(t => t.status !== 'PENDING').length },
            { key: 'follow_ups', label: 'ฝากส่งข้ามสาขา', count: tasks.followUpTasks.filter(t => t.status !== 'PENDING').length },
            { key: 'completed', label: 'จัดส่งสำเร็จ', count: tasks.completedTasks.length },
            { key: 'cancelled', label: 'ยกเลิกแล้ว', count: tasks.cancelledTasks.length },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`py-2 px-3.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === tab.key
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                activeTab === tab.key ? 'bg-indigo-700 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="text-xs text-slate-500 font-medium">
          แสดงผล {filteredData.length} รายการ {searchQuery ? `(จากคำค้นหา "${searchQuery}")` : ''}
        </div>
      </div>

      {/* 📦 Orders List View */}
      {loading ? (
        <div className="py-24 text-center bg-white rounded-3xl border border-slate-200 shadow-xs flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-slate-500 font-bold text-sm">กำลังโหลดข้อมูลงานจัดส่งสินค้า...</p>
        </div>
      ) : filteredData.length === 0 ? (
        <div className="py-24 text-center bg-white rounded-3xl border border-slate-200 shadow-xs flex flex-col items-center justify-center gap-3">
          <Package className="w-12 h-12 text-slate-300" />
          <h3 className="font-bold text-slate-700 text-base">ไม่พบรายการบิลจัดส่ง</h3>
          <p className="text-slate-400 text-xs max-w-sm">
            {searchQuery 
              ? 'ไม่พบบิลที่ตรงกับคำค้นหา ลองตรวจสอบตัวสะกดหรือเปลี่ยนคำค้นหาใหม่ครับ' 
              : 'ไม่มีรายการจัดส่งค้างอยู่ในหมวดหมู่นี้สำหรับสาขาหรือพนักงานที่เลือก'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredData.map((order: any) => {
            const isExpanded = expandedOrders.includes(order.id)
            const items = order.order_items || []
            const isCompleted = order.status === 'COMPLETED'
            const isCancelled = order.status === 'CANCELLED'
            const isPendingPayment = order.status === 'PENDING'
            const isCrossBranch = items.some((it: any) => it.fulfill_branch_id !== order.branch_id)

            return (
              <div 
                key={order.id} 
                className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden transition-all hover:border-slate-300"
              >
                {/* 💳 Order Card Header */}
                <div 
                  onClick={() => toggleExpand(order.id)}
                  className="p-4 md:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/50 transition-colors"
                >
                  <div className="flex items-start md:items-center gap-3.5">
                    <button
                      type="button"
                      className="p-1 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors mt-0.5 md:mt-0"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-black text-slate-800 text-sm md:text-base tracking-tight">
                          {order.order_code}
                        </span>

                        {/* Status Badge */}
                        <span className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-black ${
                          isCompleted
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : isCancelled
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : isPendingPayment
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}>
                          {isCompleted ? '✅ ส่งมอบสำเร็จ' : isCancelled ? '❌ ยกเลิกแล้ว' : isPendingPayment ? '⏳ รอชำระเงิน' : '🚚 รอจัดส่ง'}
                        </span>

                        {/* Cross Branch Badge */}
                        {isCrossBranch && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                            <Truck className="w-3 h-3" /> ข้ามสาขา
                          </span>
                        )}
                      </div>

                      {/* Sub-info: สาขา, เซลล์, วันที่ */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-slate-500 font-medium">
                        <span className="flex items-center gap-1 text-slate-700 font-bold">
                          <Store className="w-3.5 h-3.5 text-indigo-500" />
                          {order.branch_name || 'ไม่ระบุสาขา'}
                        </span>
                        <span className="flex items-center gap-1 text-slate-600">
                          <User className="w-3.5 h-3.5 text-blue-500" />
                          เซลล์: <strong className="text-slate-800 font-bold">{order.creator_name}</strong>
                        </span>
                        <span className="flex items-center gap-1 text-slate-400">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(order.created_at).toLocaleDateString('th-TH', { 
                            day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit'
                          })} น.
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right side: Customer & Total */}
                  <div className="flex items-center justify-between lg:justify-end gap-6 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                    <div className="text-left lg:text-right">
                      <div className="text-[11px] text-slate-400 font-medium">ลูกค้าผู้รับ</div>
                      <div className="text-xs font-bold text-slate-800 truncate max-w-[180px]">
                        {order.shipping_name || 'ไม่ระบุชื่อ'}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {order.shipping_phone || '-'}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[11px] text-slate-400 font-medium">ยอดรวมสุทธิ</div>
                      <div className="text-base md:text-lg font-black text-slate-900 tracking-tight">
                        {(Number(order.total_amount) || 0).toLocaleString()} ฿
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium">
                        {items.length} รายการ
                      </div>
                    </div>
                  </div>
                </div>

                {/* 🔽 Order Items & Full Details (Expanded) */}
                {isExpanded && (
                  <div className="p-4 md:p-6 bg-slate-50/80 border-t border-slate-200/80 space-y-6 animate-fade-in">
                    {/* ข้อมูลการจัดส่งและที่อยู่ */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-xl border border-slate-200">
                      <div>
                        <div className="text-xs font-bold text-slate-500 mb-1 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-rose-500" />
                          สถานที่จัดส่ง
                        </div>
                        <p className="text-xs text-slate-800 leading-relaxed font-medium">
                          {order.shipping_address || 'ไม่มีข้อมูลที่อยู่จัดส่ง'}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center justify-start md:justify-end gap-2">
                        {order.shipping_phone && (
                          <a
                            href={`tel:${order.shipping_phone}`}
                            className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5"
                          >
                            <Phone className="w-3.5 h-3.5 text-blue-600" /> โทรหาลูกค้า
                          </a>
                        )}

                        {order.latitude && order.longitude && (
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${order.latitude},${order.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="py-1.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 border border-emerald-200"
                          >
                            <Navigation className="w-3.5 h-3.5" /> Google Maps
                          </a>
                        )}

                        <button
                          onClick={() => setEditingCustomerOrder(order)}
                          className="py-1.5 px-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs"
                        >
                          <Edit className="w-3.5 h-3.5 text-amber-600" /> แก้ไขที่อยู่
                        </button>
                      </div>
                    </div>

                    {/* ตารางสินค้าในบิล */}
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                      <div className="p-3 bg-slate-100/70 border-b border-slate-200 text-xs font-bold text-slate-700 flex justify-between items-center">
                        <span>รายการสินค้าในบิล ({items.length} รายการ)</span>
                        <span>สาขาที่ตัดของ / สต็อก</span>
                      </div>

                      <div className="divide-y divide-slate-100">
                        {items.map((item: any) => {
                          const product = item.products || {}
                          const fulfillBranchName = item.branches?.branch_name || `สาขา #${item.fulfill_branch_id}`
                          const branchStock = product.stock?.find((s: any) => Number(s.branch_id) === Number(item.fulfill_branch_id))
                          const liveStock = branchStock ? Number(branchStock.qty) : 0
                          const isStockLow = liveStock < item.qty

                          return (
                            <div key={item.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                              <div className="flex items-center gap-3">
                                {product.image_url ? (
                                  <img 
                                    src={product.image_url} 
                                    alt={product.name || 'product'} 
                                    className="w-12 h-12 object-cover rounded-lg border border-slate-200 shrink-0" 
                                  />
                                ) : (
                                  <div className="w-12 h-12 bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                                    <Package className="w-5 h-5" />
                                  </div>
                                )}

                                <div>
                                  <div className="font-bold text-slate-800 text-xs md:text-sm">
                                    {product.name || 'ไม่มีชื่อสินค้า'}
                                  </div>
                                  <div className="text-[11px] text-slate-400 font-mono">
                                    SKU: {product.sku || '-'}
                                  </div>
                                  {product.width_cm && (
                                    <div className="text-[10.5px] text-slate-500 mt-0.5">
                                      ขนาด: {product.width_cm} × {product.length_cm || '-'} × {product.thickness_cm || '-'} ซม.
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center justify-between sm:justify-end gap-6 text-right">
                                <div>
                                  <div className="font-bold text-slate-800">
                                    จำนวน {item.qty} ชิ้น
                                  </div>
                                  <div className="text-[11px] text-slate-500">
                                    @{Number(item.price_at_sale || 0).toLocaleString()} ฿
                                  </div>
                                </div>

                                <div className="text-right">
                                  <div className="font-bold text-indigo-700 flex items-center justify-end gap-1">
                                    <Store className="w-3.5 h-3.5" />
                                    {fulfillBranchName}
                                  </div>
                                  <div className={`text-[10.5px] font-bold ${isStockLow ? 'text-rose-600' : 'text-emerald-600'}`}>
                                    สต็อกคงเหลือ: {liveStock} ชิ้น {isStockLow && '(ไม่พอ/พรีออเดอร์)'}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* แถบเครื่องมือและ Action Buttons */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200">
                      {/* ฝั่งซ้าย: ดูสลิป / เอกสาร */}
                      <div className="flex flex-wrap items-center gap-2">
                        <PaymentSlipViewer orderId={order.id} orderCode={order.order_code} />
                        <PaymentSlipUploader orderId={order.id} orderCode={order.order_code} />

                        <button
                          onClick={() => handlePrintSlip(order.order_code)}
                          className="py-2 px-3 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-2xs"
                          title="พิมพ์ใบจัดส่ง"
                        >
                          <Printer className="w-3.5 h-3.5 text-slate-600" /> พิมพ์เอกสารจัดส่ง
                        </button>

                        <button
                          onClick={() => handlePrintPdf(order.order_code)}
                          className="py-2 px-3 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-rose-50 hover:text-rose-600 transition-colors flex items-center gap-1.5 shadow-2xs"
                          title="พิมพ์เป็น PDF"
                        >
                          <FileText className="w-3.5 h-3.5 text-rose-500" /> PDF
                        </button>

                        <button
                          onClick={() => handleDownloadCSV(order)}
                          className="py-2 px-3 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-emerald-50 hover:text-emerald-600 transition-colors flex items-center gap-1.5 shadow-2xs"
                          title="ดาวน์โหลด Excel Quote"
                        >
                          <Download className="w-3.5 h-3.5 text-emerald-600" /> Excel Quote
                        </button>
                      </div>

                      {/* ฝั่งขวา: การอนุมัติ / ตัดสต็อก / ส่งมอบ / ยกเลิก */}
                      <div className="flex flex-wrap items-center gap-2">
                        {isPendingPayment && (
                          <button
                            onClick={() => handleApproveStock(order.id, order.order_code, items)}
                            disabled={approvingId === order.id}
                            className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                          >
                            <Banknote className="w-3.5 h-3.5" />
                            {approvingId === order.id ? 'กำลังบันทึกรับเงิน...' : 'ยืนยันรับชำระเงิน & ตัดสต็อก'}
                          </button>
                        )}

                        {!isCompleted && !isCancelled && !isPendingPayment && (
                          <button
                            onClick={() => handleCompleteOrder(order.id, order.order_code, items)}
                            disabled={processingId === order.id}
                            className="py-2 px-4 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            {processingId === order.id ? 'กำลังอัปเดต...' : 'บันทึกส่งมอบสำเร็จ (Complete)'}
                          </button>
                        )}

                        {!isCancelled && (
                          <button
                            onClick={() => handleCancelOrder(order.id, order.order_code, items, order.status)}
                            disabled={cancellingId === order.id}
                            className="py-2 px-3 bg-white border border-rose-200 hover:bg-rose-50 text-rose-600 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            {cancellingId === order.id ? 'กำลังยกเลิก...' : 'ยกเลิกบิล'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* 🧩 Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs px-4">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden flex flex-col p-6 items-center text-center animate-fade-in border border-slate-100">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
              confirmModal.confirmVariant === 'emerald' ? 'bg-emerald-50 text-emerald-600' :
              confirmModal.confirmVariant === 'blue' ? 'bg-blue-50 text-blue-600' :
              confirmModal.confirmVariant === 'red' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
            }`}>
              <FileText className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-slate-800 text-lg mb-2">
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
                className={`flex-1 py-3 text-white rounded-xl font-bold text-xs transition-all cursor-pointer shadow-md flex items-center justify-center gap-1.5 ${
                  confirmModal.confirmVariant === 'emerald' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' :
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
