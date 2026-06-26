
//src/app/(manager)/manager/vanguard-dispatch
"use client"

import { useState, useEffect, useMemo } from 'react'
import { getGroupedDispatches, markOrderItemsShipped, approveAndCutStock } from '@/actions/dispatch'
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
  Truck
} from 'lucide-react'
import { toast } from 'sonner'
import PrintDispatchModal from '@/components/PrintDispatchModal'

export default function DispatchMonitorPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'my_tasks' | 'follow_ups' | 'completed'>('overview')
  const [tasks, setTasks] = useState<{ myTasks: any[]; followUpTasks: any[]; completedTasks: any[] }>({
    myTasks: [],
    followUpTasks: [],
    completedTasks: []
  })
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<number | null>(null)
  const [approvingId, setApprovingId] = useState<number | null>(null)
  const [expandedOrders, setExpandedOrders] = useState<number[]>([])
  const [printOrderCode, setPrintOrderCode] = useState<string | null>(null)
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmText?: string;
    confirmVariant?: 'emerald' | 'blue' | 'red';
    onConfirm: () => void;
  }>({ isOpen: false, title: '', description: '', onConfirm: () => { } })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const res = await getGroupedDispatches()
    if (res.success) {
      setTasks({
        myTasks: res.myDispatchOrders || [],
        followUpTasks: res.followUpOrders || [],
        completedTasks: res.completedOrders || []
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

  const handleApproveStock = (orderId: number, orderCode: string, items: any[]) => {
    setConfirmModal({
      isOpen: true,
      title: 'ยืนยันการรับชำระเงินและตัดสต็อก',
      description: `ยืนยันการรับชำระเงินและ "ตัดสต็อก" บิล ${orderCode} ใช่หรือไม่? \n(สินค้าจะถูกหักออกจากคลังของสาขาทันที)`,
      confirmText: 'ยืนยันตัดสต็อก',
      confirmVariant: 'emerald',
      onConfirm: async () => {
        setApprovingId(orderId)
        const res = await approveAndCutStock(orderId, orderCode, items)

        if (res.success) {
          toast.success("อนุมัติรับชำระเงิน และ หักสต็อกออกจากคลังเรียบร้อยแล้ว!")
          await loadData()
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
    setPrintOrderCode(orderCode)
  }

  const currentData = useMemo(() => {
    if (activeTab === 'my_tasks') return tasks.myTasks;
    if (activeTab === 'follow_ups') return tasks.followUpTasks;
    if (activeTab === 'completed') return tasks.completedTasks;

    const combined = [...tasks.myTasks, ...tasks.followUpTasks];
    return combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [activeTab, tasks])

  if (loading) return <div className="min-h-screen bg-slate-50 text-slate-500 flex items-center justify-center font-semibold text-sm">กำลังโหลดข้อมูลระบบจัดส่ง...</div>

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans select-none pb-20">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div>
            <h1 className="text-xl font-bold text-slate-800">ระบบจัดการสินค้ารอจัดส่ง</h1>
            <p className="text-slate-500 text-sm mt-1">ตรวจสอบรายการบิลค้างส่งและติดตามสถานะสินค้าข้ามสาขา</p>
          </div>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2"
          >
            รีเฟรชข้อมูล
          </button>
        </div>

        {/* Tabs Selection */}
        <div className="flex flex-col md:flex-row gap-2 p-1 bg-white rounded-lg w-full md:max-w-3xl border border-slate-200 shadow-sm">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-sm font-bold rounded-md transition-colors ${activeTab === 'overview' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <List className="w-4 h-4" /> ภาพรวมทั้งหมด ({tasks.myTasks.length + tasks.followUpTasks.length})
          </button>
          <button
            onClick={() => setActiveTab('my_tasks')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-sm font-bold rounded-md transition-colors ${activeTab === 'my_tasks' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Package className="w-4 h-4" /> คลังเราต้องจัดส่ง ({tasks.myTasks.length})
          </button>
          <button
            onClick={() => setActiveTab('follow_ups')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-sm font-bold rounded-md transition-colors ${activeTab === 'follow_ups' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Activity className="w-4 h-4" /> ติดตามสาขาอื่น ({tasks.followUpTasks.length})
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-sm font-bold rounded-md transition-colors ${activeTab === 'completed' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Archive className="w-4 h-4" /> ประวัติสำเร็จ ({tasks.completedTasks.length})
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

              // ✨ แก้ไขตรรกะใหม่: ถ้าระบุพิกัดมา จะถือว่าเป็นการจัดส่ง (หรือมีข้อมูลให้ดู) ทันที
              const hasCoordinates = order.latitude && order.longitude;
              const isStorefrontTakeaway = (!order.shipping_address && !hasCoordinates) || (order.shipping_address?.includes('[รับหน้าร้าน]') && !hasCoordinates);
              const isMyTask = tasks.myTasks.some(t => t.id === order.id)

              const isAnyItemOutOfStock = order.order_items.some((item: any) => {
                const branchStock = item.products?.stock?.find((s: any) => Number(s.branch_id) === Number(item.fulfill_branch_id))
                const currentLiveQty = branchStock ? Number(branchStock.qty) : 0
                return currentLiveQty < item.qty
              })

              return (
                <div key={`${order.id}-${index}`} className={`bg-white border rounded-xl shadow-sm overflow-hidden transition-all ${isAnyItemOutOfStock && order.status === 'PENDING' ? 'border-red-300' : 'border-slate-200'}`}>
                  {/* Order Header */}
                  <div
                    onClick={() => toggleExpand(order.id)}
                    className="flex flex-wrap md:flex-nowrap items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border ${isStorefrontTakeaway ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                        <Package className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-sm font-bold text-slate-800 block">
                          เลขที่บิล: {order.order_code}
                          {activeTab === 'overview' && (
                            <span className={`ml-2 text-[10px] px-2 py-0.5 rounded border ${isMyTask ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                              {isMyTask ? 'คลังเราแพ็ค' : 'สาขาอื่นแพ็ค'}
                            </span>
                          )}
                        </span>
                        <span className="text-xs text-slate-500 font-medium mt-0.5 block">
                          วันที่: {new Date(order.created_at).toLocaleDateString('th-TH')} | ลูกค้า: {order.shipping_name || 'ไม่ได้ระบุ'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 mt-3 md:mt-0 ml-14 md:ml-0">
                      {isAnyItemOutOfStock && order.status === 'PENDING' && (
                        <span className="flex items-center gap-1 text-[10px] font-bold bg-red-100 text-red-600 border border-red-200 px-2 py-1 rounded-full animate-pulse">
                          <AlertTriangle className="w-3 h-3" /> สต็อกไม่พอ!
                        </span>
                      )}
                      <span className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border ${isStorefrontTakeaway ? 'text-indigo-600 bg-indigo-50 border-indigo-200' : 'text-amber-600 bg-amber-50 border-amber-200'} ${order.status === 'COMPLETED' ? '!text-emerald-600 !bg-emerald-50 !border-emerald-200' : ''}`}>
                        {order.status === 'COMPLETED' ? (
                          <><CheckCircle className="w-3.5 h-3.5" /> สำเร็จแล้ว</>
                        ) : isStorefrontTakeaway ? (
                          <><Store className="w-3.5 h-3.5" /> รอส่งมอบหน้าร้าน {order.order_items.length} รายการ</>
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
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                        {/* Column 1: Items List */}
                        <div className="lg:col-span-2 space-y-3">
                          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">รายการสินค้าในความรับผิดชอบ</h3>
                          <div className="space-y-2">
                            {order.order_items.map((item: any, itemIndex: number) => {
                              const branchStock = item.products?.stock?.find((s: any) => Number(s.branch_id) === Number(item.fulfill_branch_id))
                              const currentLiveQty = branchStock ? Number(branchStock.qty) : 0
                              const isOutOfStock = currentLiveQty < item.qty && order.status === 'PENDING'

                              return (
                                <div key={`${item.id}-${itemIndex}`} className={`flex items-center gap-3 p-3 rounded-lg border shadow-sm ${isOutOfStock ? 'bg-red-50/40 border-red-200' : 'bg-white border-slate-200'}`}>
                                  <div className={`w-12 h-12 rounded-md border flex items-center justify-center shrink-0 ${isOutOfStock ? 'opacity-50 grayscale bg-slate-100 border-slate-200' : 'bg-slate-50 border-slate-100'}`}>
                                    {item.products?.image_url ? (
                                      <img src={item.products?.image_url} alt={item.products?.name} className="w-full h-full object-contain p-1" />
                                    ) : (
                                      <span className="text-[10px] text-slate-300">No Img</span>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <span className={`text-sm font-semibold block truncate ${isOutOfStock ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                                      {item.products?.name}
                                    </span>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <span className="text-xs text-slate-500 block">SKU: {item.products?.sku}</span>
                                      {isOutOfStock && (
                                        <span className="flex items-center gap-1 text-[9px] text-red-600 font-bold bg-white border border-red-200 px-1.5 py-0.5 rounded shadow-sm">
                                          <AlertTriangle className="w-2.5 h-2.5" /> โดนซื้อตัดหน้า (เหลือ {currentLiveQty})
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <span className={`text-sm font-bold block ${isOutOfStock ? 'text-slate-400' : 'text-slate-800'}`}>x{item.qty}</span>
                                    <span className={`text-[11px] font-bold block ${isOutOfStock ? 'text-slate-400' : 'text-blue-600'}`}>{Number(item.price_at_sale).toLocaleString()} ฿</span>
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
                              </div>
                            ) : (
                              <>
                                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 pb-2 border-b border-slate-100 flex items-center gap-1.5">
                                  <Truck className="w-4 h-4 text-blue-500" /> ข้อมูลจัดส่งลูกค้า
                                </h3>
                                <div className="space-y-3 text-sm text-slate-600">
                                  <p><span className="font-semibold text-slate-700">ชื่อผู้รับ:</span> {order.shipping_name || '-'}</p>
                                  <p><span className="font-semibold text-slate-700">เบอร์โทร:</span> {order.shipping_phone || '-'}</p>
                                  <p className="leading-relaxed">
                                    <span className="font-semibold text-slate-700 block mb-1">ที่อยู่จัดส่ง:</span>
                                    {order.shipping_address || '-'}
                                  </p>

                                  {/* ✨ ส่วนแสดงพิกัด GPS และ Mini Map (ถ้ามีการปักหมุด) */}
                                  {hasCoordinates && (
                                    <div className="mt-3 pt-3 border-t border-dashed border-slate-200">
                                      <p className="font-semibold text-slate-700 text-xs mb-2 flex items-center gap-1">
                                        <MapPin className="w-3.5 h-3.5 text-blue-500" /> แผนที่และพิกัดจัดส่ง
                                      </p>

                                      {/* กล่อง Mini Map ตัวเล็ก */}
                                      <div className="w-full h-32 bg-slate-100 rounded-lg overflow-hidden border border-slate-200 mb-2 relative shadow-inner">
                                        <iframe
                                          title="Mini Map Preview"
                                          width="100%"
                                          height="100%"
                                          frameBorder="0"
                                          scrolling="no"
                                          src={`https://www.openstreetmap.org/export/embed.html?bbox=${order.longitude - 0.002},${order.latitude - 0.002},${order.longitude + 0.002},${order.latitude + 0.002}&layer=mapnik&marker=${order.latitude},${order.longitude}`}
                                          className="pointer-events-none"
                                        />
                                      </div>

                                      <div className="bg-blue-50 border border-blue-100 p-2.5 rounded-lg flex flex-col gap-2">
                                        <p className="text-[10px] text-blue-700 font-mono font-medium text-center truncate">
                                          {order.latitude}, {order.longitude}
                                        </p>
                                        <a
                                          href={`https://www.google.com/maps/dir/?api=1&destination=${order.latitude},${order.longitude}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="w-full py-2 bg-blue-600 text-white rounded text-xs font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
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

                          {/* Action Buttons (ปุ่มการทำงานต่างๆ เรียงสวยงาม) */}
                          <div className="space-y-2 pt-2">
                            {activeTab === 'completed' || order.status === 'COMPLETED' ? (
                              <div className="w-full py-3 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-lg text-sm font-bold flex items-center justify-center gap-2 shadow-sm cursor-not-allowed">
                                <CheckCircle className="w-4 h-4" /> บิลนี้ปิดงาน/ส่งมอบสำเร็จแล้ว
                              </div>
                            ) : (
                              <>
                                {isMyTask && (
                                  order.status === 'PENDING' ? (
                                    <button
                                      onClick={() => handleApproveStock(order.id, order.order_code, order.order_items)}
                                      disabled={approvingId === order.id || isAnyItemOutOfStock}
                                      className={`w-full py-2.5 text-white rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2 shadow-sm 
                                        ${isAnyItemOutOfStock ? 'bg-red-400 cursor-not-allowed' : 'bg-emerald-500 hover:bg-emerald-600'}`}
                                    >
                                      {isAnyItemOutOfStock ? (
                                        <><AlertTriangle className="w-4 h-4" /> ไม่สามารถอนุมัติได้ (สินค้าหมด)</>
                                      ) : (
                                        <>{approvingId === order.id ? 'กำลังตัดสต็อก...' : <><Banknote className="w-4 h-4" /> ยืนยันรับชำระเงิน & ตัดสต็อก</>}</>
                                      )}
                                    </button>
                                  ) : (
                                    <div className="w-full py-2.5 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-lg text-sm font-bold flex items-center justify-center gap-2 shadow-sm cursor-not-allowed">
                                      <CheckCircle className="w-4 h-4" /> จ่ายเงินและหักสต็อกแล้ว
                                    </div>
                                  )
                                )}

                                <button
                                  onClick={() => handleCompleteOrder(order.id, order.order_code, order.order_items)}
                                  disabled={processingId === order.id || order.status === 'PENDING'}
                                  className={`w-full py-2.5 text-white rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2 shadow-sm mt-2 ${order.status === 'PENDING' ? 'bg-slate-300 cursor-not-allowed' : (!isMyTask ? 'bg-slate-800 hover:bg-slate-900' : (isStorefrontTakeaway ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-blue-600 hover:bg-blue-700'))}`}
                                >
                                  <CheckCircle className="w-4 h-4" />
                                  {processingId === order.id ? 'กำลังอัปเดต...' :
                                    order.status === 'PENDING' ? 'รออนุมัติชำระเงิน' :
                                      (!isMyTask ? 'ลูกค้ารับของแล้ว (ปิดงานติดตาม)' :
                                        (isStorefrontTakeaway ? 'ส่งมอบลูกค้าหน้าร้านแล้ว' : 'จัดส่งเรียบร้อยแล้ว')
                                      )
                                  }
                                </button>
                              </>
                            )}

                            {isMyTask && (
                              <button
                                onClick={() => handlePrintSlip(order.order_code)}
                                className="w-full py-2.5 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 shadow-sm mt-2"
                              >
                                <Printer className="w-4 h-4" /> พิมพ์เอกสาร (ใบเสร็จ/ใบเสนอราคา)
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
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-slate-100 animate-fade-in">
            <div className="p-6 pb-4">
              <h3 className="font-black text-slate-800 text-sm mb-2">
                {confirmModal.title}
              </h3>
              <p className="text-slate-500 text-xs font-semibold leading-relaxed whitespace-pre-line">
                {confirmModal.description}
              </p>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2 justify-end">
              <button
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="px-3.5 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-100 transition-all cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => {
                  confirmModal.onConfirm()
                  setConfirmModal(prev => ({ ...prev, isOpen: false }))
                }}
                className={`px-3.5 py-2 text-white rounded-xl font-bold text-xs transition-all cursor-pointer ${confirmModal.confirmVariant === 'emerald' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-sm shadow-emerald-100' :
                    confirmModal.confirmVariant === 'blue' ? 'bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-100' :
                      'bg-slate-800 hover:bg-slate-900 shadow-sm shadow-slate-200'
                  }`}
              >
                {confirmModal.confirmText || 'ยืนยัน'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🧩 Print Dispatch Modal */}
      <PrintDispatchModal orderCode={printOrderCode} onClose={() => setPrintOrderCode(null)} />
    </div>
  )
}