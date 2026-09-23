"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getTransfersList } from '@/actions/receive-stock'

export default function ReceiveCheckPage() {
  const router = useRouter()
  const [allTransfers, setAllTransfers] = useState<any[]>([])
  const [filteredTransfers, setFilteredTransfers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // ตัวกรองสำหรับการค้นหาด่วน
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [statusFilter, setStatusFilter] = useState('ALL')

  useEffect(() => {
    getTransfersList()
      .then(res => {
        const inboundWithFlag = res.inbound.map((item: any) => ({ ...item, transfer_type: 'inbound' }))
        const outboundWithFlag = res.outbound.map((item: any) => ({ ...item, transfer_type: 'outbound' }))
        
        const combined = [...inboundWithFlag, ...outboundWithFlag].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        
        setAllTransfers(combined)
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  // ระบบค้นหาและคัดกรองแบบ Real-time (ค้นหาจากเลขที่เอกสาร หรือ ชื่อคลังสินค้า)
  useEffect(() => {
    let result = [...allTransfers]

    // กรองตามสถานะ
    if (statusFilter !== 'ALL') {
      if (statusFilter === 'ACTIVE') {
        result = result.filter(t => ['DRAFT', 'PENDING', 'AWAITING_SHIPMENT'].includes(t.status))
      } else {
        result = result.filter(t => t.status === statusFilter)
      }
    }

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase()
      result = result.filter(t => 
        t.transfer_code.toLowerCase().includes(q) ||
        (t.from_branch?.branch_name && t.from_branch.branch_name.toLowerCase().includes(q)) ||
        (t.to_branch?.branch_name && t.to_branch.branch_name.toLowerCase().includes(q))
      )
    }

    setFilteredTransfers(result)
  }, [allTransfers, searchQuery, statusFilter])

  // ฟังก์ชันจัดฟอร์แมต วันที่-เดือน-ปี พ.ศ. ให้แสดงผลคลีนๆ
  const formatDate = (dateString: string) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    return `${day}-${month}-${year}`
  }

  // ตัวจัดการสีและสไตล์ของสเตตัสเอกสาร
  const getStatusLabelAndStyle = (status: string) => {
    switch (status) {
      case 'PENDING':
        return {
          text: 'รอดำเนินการ',
          dotColor: 'bg-slate-300',
          badgeClass: 'bg-slate-100 text-slate-700 hover:bg-slate-200'
        }
      case 'COMPLETED':
        return {
          text: 'รับสินค้าแล้ว',
          dotColor: 'bg-emerald-500',
          badgeClass: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
        }
      case 'DRAFT':
        return {
          text: 'แบบร่าง',
          dotColor: 'bg-amber-400',
          badgeClass: 'bg-amber-50 text-amber-800'
        }
      case 'AWAITING_SHIPMENT':
        return {
          text: 'รอแพ็คส่ง',
          dotColor: 'bg-orange-400',
          badgeClass: 'bg-orange-50 text-orange-800'
        }
      case 'CANCELLED':
        return {
          text: 'ยกเลิกแล้ว',
          dotColor: 'bg-rose-500',
          badgeClass: 'bg-rose-100 text-rose-800'
        }
      default:
        return {
          text: status,
          dotColor: 'bg-slate-300',
          badgeClass: 'bg-slate-100 text-slate-700'
        }
    }
  }

  return (
    <div className="p-6 bg-slate-50 min-h-screen font-sans text-slate-800 antialiased">
      <div className="max-w-6xl mx-auto">
        
        {/* หัวเว็บที่จัดรูปแบบให้สะอาดตาและมีช่องค้นหามินิมอลฝั่งขวา */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-slate-800">จัดการการโอนสินค้า (Transfers)</h1>

          <div className="flex items-center gap-2">
            {showSearch ? (
              <input
                type="text"
                placeholder="ค้นหาตามเลขที่หรือคลัง..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-500 w-48 transition-all shadow-sm"
                autoFocus
                onBlur={() => { if (!searchQuery) setShowSearch(false) }}
              />
            ) : (
              <button 
                onClick={() => setShowSearch(true)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-all border border-slate-200 bg-white shadow-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.602 10.602Z" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* แถบกรองสถานะ */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {[
            { key: 'ALL', label: 'ทั้งหมด', color: 'bg-slate-600' },
            { key: 'ACTIVE', label: 'รอดำเนินการ', color: 'bg-amber-500' },
            { key: 'COMPLETED', label: 'เสร็จสิ้นแล้ว', color: 'bg-emerald-500' },
            { key: 'CANCELLED', label: 'ยกเลิก', color: 'bg-rose-500' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                statusFilter === tab.key
                  ? `${tab.color} text-white border-transparent shadow-sm`
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {tab.label}
              {tab.key === 'ALL' && ` (${allTransfers.length})`}
              {tab.key === 'ACTIVE' && ` (${allTransfers.filter(t => ['DRAFT','PENDING','AWAITING_SHIPMENT'].includes(t.status)).length})`}
              {tab.key === 'COMPLETED' && ` (${allTransfers.filter(t => t.status === 'COMPLETED').length})`}
              {tab.key === 'CANCELLED' && ` (${allTransfers.filter(t => t.status === 'CANCELLED').length})`}
            </button>
          ))}
        </div>

        {/* ตารางแสดงรายการ */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              
              <thead className="bg-[#0284c7] text-white text-xs uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-5 w-16 font-medium text-center">ลำดับ</th>
                  <th className="py-3 px-5 w-32 font-medium">วันที่</th>
                  <th className="py-3 px-4 w-40 font-medium">ประเภท</th>
                  <th className="py-3 px-4 w-48 font-medium">เลขที่เอกสาร</th>
                  <th className="py-3 px-4 font-medium">คลังต้นทาง</th>
                  <th className="py-3 px-4 font-medium">คลังปลายทาง</th>
                  <th className="py-3 px-4 w-28 text-center font-medium">จำนวนโอน</th>
                  <th className="py-3 px-4 w-28 text-center font-medium">จำนวนรับ</th>
                  <th className="py-3 px-4 w-44 text-center font-medium">สถานะ</th>
                  <th className="py-3 px-4 w-16 text-center"></th>
                </tr>
              </thead>
              
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={10} className="py-10 text-center text-slate-400">
                      กำลังโหลดข้อมูลงานโอนสต็อก...
                    </td>
                  </tr>
                ) : filteredTransfers.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-10 text-center text-slate-400">
                      ไม่พบรายการโอนสินค้าในคลังขณะนี้
                    </td>
                  </tr>
                ) : (
                  filteredTransfers.map((t, index) => {
                    const statusConfig = getStatusLabelAndStyle(t.status)
                    const isInbound = t.transfer_type === 'inbound'
                    
                    // คำนวณจำนวนชิ้นรวม
                    const totalTransferQty = t.stock_transfer_items?.reduce((sum: number, item: any) => sum + (Number(item.transfer_qty) || 0), 0) || 0
                    const totalReceivedQty = t.stock_transfer_items?.reduce((sum: number, item: any) => sum + (Number(item.received_qty) || 0), 0) || 0

                    return (
                      <tr 
                        key={`${t.id}-${t.transfer_type}`}
                        className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                        onClick={() => router.push(`/manager/receive-check1/${t.id}?type=${t.transfer_type}`)}
                      >
                        {/* 0. ลำดับ */}
                        <td className="py-3.5 px-5 font-medium text-slate-500 text-[13px] text-center">
                          {index + 1}
                        </td>
                        {/* 1. วันที่สร้างเอกสาร */}
                        <td className="py-3.5 px-5 font-medium text-slate-800 text-[13px]">
                          {formatDate(t.created_at)}
                        </td>
 
                        {/* 2. ประเภทการโอน */}
                        <td className="py-3.5 px-4">
                          {isInbound ? (
                            t.status === 'COMPLETED' ? (
                              <span className="text-[11px] px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg font-bold border border-emerald-200/60 inline-block">
                                โอนเข้า (รับแล้ว)
                              </span>
                            ) : (
                              <span className="text-[11px] px-2.5 py-1 bg-amber-50 text-amber-700 rounded-lg font-bold border border-amber-200/60 inline-block">
                                โอนเข้า (รอรับ)
                              </span>
                            )
                          ) : (
                            t.status === 'COMPLETED' ? (
                              <span className="text-[11px] px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg font-bold border border-blue-200/60 inline-block">
                                โอนออก (ส่งแล้ว)
                              </span>
                            ) : (
                              <span className="text-[11px] px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg font-bold border border-slate-200/60 inline-block">
                                โอนออก
                              </span>
                            )
                          )}
                        </td>
 
                        {/* 3. รหัสเอกสาร + จุดสถานะสี */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${statusConfig.dotColor} shrink-0`}></span>
                            <span className="font-mono font-semibold text-slate-700 text-[13px] group-hover:text-blue-600 transition-colors">
                              {t.transfer_code}
                            </span>
                          </div>
                        </td>
 
                        {/* 4. คลังต้นทาง */}
                        <td className="py-3.5 px-4 text-slate-700 font-medium text-[13px]">
                          {t.from_branch?.branch_name || '-'}
                        </td>
 
                        {/* 5. คลังปลายทาง */}
                        <td className="py-3.5 px-4 text-slate-700 font-medium text-[13px]">
                          {t.to_branch?.branch_name || '-'}
                        </td>

                        {/* 5.1 จำนวนโอน */}
                        <td className="py-3.5 px-4 text-center font-bold text-slate-700 text-[13px]">
                          {totalTransferQty} ชิ้น
                        </td>

                        {/* 5.2 จำนวนรับ */}
                        <td className="py-3.5 px-4 text-center font-bold text-[13px]">
                          {t.status === 'COMPLETED' ? (
                            <span className="text-emerald-600">{totalReceivedQty} ชิ้น</span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
{/* 6. สถานะเอกสาร */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="inline-flex items-center justify-between w-36 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200/60 shadow-sm transition-all bg-slate-50 text-slate-700">
                            <span>{statusConfig.text}</span>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3 h-3 text-slate-400 ml-1.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                            </svg>
                          </div>
                        </td>

                        {/* 7. ปุ่ม Action รายละเอียดเพิ่มเติมด้านขวาสุด */}
                        <td className="py-3.5 px-4 text-center">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/manager/receive-check1/${t.id}?type=${t.transfer_type}`);
                            }}
                            className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg border border-slate-200/50 hover:bg-blue-50/50 transition-all shadow-sm"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM12.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM18.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>

            </table>
          </div>
        </div>

      </div>
    </div>
  )
}