"use client"

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getTransferItems, getTransferById, receiveStockAction, cancelTransferAction } from '@/actions/receive-stock'

export default function TransferDetailPage() {
  const params = useParams()
  const router = useRouter()
  
  const transferId = Number(params.id)

  const [header, setHeader] = useState<any>(null)
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!transferId) return
    
    Promise.all([
      getTransferById(transferId),
      getTransferItems(transferId)
    ]).then(([headerData, itemsData]) => {
      setHeader(headerData)
      setItems(itemsData.map(item => ({ ...item, received_qty: item.transfer_qty })))
    }).catch(err => {
      console.error(err)
      alert("ไม่พบข้อมูลใบโอน")
    }).finally(() => {
      setLoading(false)
    })
  }, [transferId])

  const handleQtyChange = (itemId: number, value: string) => {
    const newQty = value === '' ? 0 : Number(value)
    setItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, received_qty: newQty } : item
    ))
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    const result = await receiveStockAction(transferId, items)
    
    if (result.error) {
      alert(result.error)
      setSubmitting(false)
    } else {
      alert('รับสินค้าสำเร็จ! ยอดสต็อกอัปเดตเรียบร้อย')
      router.push('/manager/receive-check') 
    }
  }

  const handleCancelTransfer = async () => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการยกเลิกใบโอนสินค้านี้?')) return
    
    setSubmitting(true)
    const result = await cancelTransferAction(transferId)
    
    if (result.error) {
      alert(result.error)
      setSubmitting(false)
    } else {
      alert('ยกเลิกการโอนสินค้าเรียบร้อยแล้ว!')
      router.push('/manager/receive-check')
    }
  }

  const handlePrint = () => {
    window.print();
  }

  if (loading) return <div className="p-6 text-center text-slate-500">กำลังโหลดข้อมูล...</div>
  if (!header) return <div className="p-6 text-center text-red-500">ไม่พบข้อมูล</div>

  const totalTransferQty = items.reduce((sum, item) => sum + Number(item.transfer_qty || 0), 0)
  const totalReceivedQty = items.reduce((sum, item) => sum + Number(item.received_qty || 0), 0)

  // ==========================================
  // ✨ LOGIC สำหรับตอนปริ้นท์ (แบ่งหน้าละ 15 แถว)
  // ==========================================
  const ROWS_PER_PAGE = 15 
  const printPages = []
  
  if (items.length > 0) {
    for (let i = 0; i < items.length; i += ROWS_PER_PAGE) {
      const chunk = [...items.slice(i, i + ROWS_PER_PAGE)]
      while (chunk.length < ROWS_PER_PAGE) {
        chunk.push(null)
      }
      printPages.push(chunk)
    }
  } else {
    printPages.push(Array(ROWS_PER_PAGE).fill(null))
  }

  return (
    <>
      {/* ================================================================
        1. WEB VIEW (จอแสดงผลปกติ) 
        ================================================================
      */}
      <div className="p-6 bg-slate-50 min-h-screen relative print:hidden">
        
        {submitting && (
          <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-900/40 backdrop-blur-sm">
            <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center max-w-sm w-full mx-4 text-center animate-in fade-in zoom-in duration-300">
              <div className="w-16 h-16 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin mb-6"></div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">กำลังบันทึกข้อมูล...</h2>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">
                ระบบกำลังอัปเดตสต็อกสินค้าเข้าคลัง<br/>
                <span className="text-red-500 font-bold">ห้ามปิดหรือรีเฟรชหน้านี้เด็ดขาด</span>
              </p>
            </div>
          </div>
        )}

        <div className="max-w-5xl mx-auto flex justify-between items-center mb-6">
          <button 
            onClick={() => router.back()}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-medium transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
            กลับไปหน้ารายการ
          </button>

          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 text-white hover:bg-slate-700 rounded-xl font-bold transition-colors shadow-lg shadow-slate-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.728 6.75h10.545m-10.545 0V3h10.545v3.75m-10.545 0h10.545M6.728 6.75c-1.242 0-2.25.986-2.25 2.197v5.253c0 1.21.996 2.197 2.228 2.219l10.59.186c1.242.022 2.264-.972 2.264-2.183v-5.276c0-1.21-.996-2.197-2.228-2.219l-10.59-.186Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 16.5h3v3h-3v-3Z" />
            </svg>
            พิมพ์ใบโอน
          </button>
        </div>

        <div className="max-w-5xl mx-auto bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200">
          <div className="border-b-2 border-slate-800 pb-6 mb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div>
              <h1 className="text-3xl font-black text-slate-900 mb-2 uppercase tracking-tight">
                ใบโอนสินค้า <span className="text-xl font-bold text-slate-500 ml-2 tracking-normal">{header.isOutbound ? '(ใบส่งของ)' : '(ใบรับของ)'}</span>
              </h1>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 mt-4 text-sm text-slate-700">
                <div className="flex items-center gap-2">
                  <span className="font-bold w-20">ต้นทาง:</span> 
                  <span className="px-3 py-1 bg-slate-100 rounded-md font-medium">{header.from_branch?.branch_name || '-'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold w-20">ปลายทาง:</span> 
                  <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-md font-medium">{header.to_branch?.branch_name || '-'}</span>
                </div>
              </div>
            </div>
            
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-right min-w-[200px]">
              <div className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">เลขที่เอกสาร</div>
              <div className="text-xl font-black text-slate-800 mb-2">{header.transfer_code}</div>
              <span className={`px-3 py-1 rounded-full font-bold text-xs inline-block
                ${header.status === 'PENDING' ? 'bg-orange-100 text-orange-700' : 
                  header.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 
                  'bg-slate-200 text-slate-700'}`}
              >
                สถานะ: {header.status}
              </span>
            </div>
          </div>

          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-blue-600">
              <path fillRule="evenodd" d="M2 3a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H2Zm0 4.5h16V16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7.5Zm5.75 2.25a.75.75 0 0 0 0 1.5h4.5a.75.75 0 0 0 0-1.5h-4.5Z" clipRule="evenodd" />
            </svg>
            รายการสินค้า {header.isOutbound ? '(ตรวจสอบก่อนส่ง)' : '(ตรวจสอบตอนรับ)'}
          </h2>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-100 text-slate-800 border-b-2 border-slate-300">
                <tr>
                  <th className="p-4 font-bold text-center w-16">ลำดับ</th>
                  <th className="p-4 font-bold">รายละเอียดสินค้า</th>
                  <th className="p-4 text-center font-bold w-32">ยอดส่ง</th>
                  <th className="p-4 text-center font-bold w-40">{header.isOutbound ? 'ยอดรับจริง' : 'เช็คยอดรับ'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item, index) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 text-center text-slate-400 font-medium">{index + 1}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-lg bg-slate-50 border border-slate-200 flex-shrink-0 flex items-center justify-center overflow-hidden">
                          {item.products?.image_url ? (
                            <img src={item.products.image_url} alt={item.products?.name} className="w-full h-full object-cover"/>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-slate-300">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                            </svg>
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-slate-800 text-base">{item.products?.name}</div>
                          <div className="text-xs text-slate-500 mt-0.5 bg-slate-100 w-fit px-2 py-0.5 rounded border border-slate-200">
                            SKU: {item.products?.sku || '-'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-center text-lg font-black text-slate-700">{item.transfer_qty}</td>
                    <td className="p-4 text-center bg-slate-50/50">
                      {header.isOutbound ? (
                        <span className="text-slate-400 font-bold text-lg">{item.received_qty || '-'}</span>
                      ) : (
                        <input
                          type="number"
                          min="0"
                          value={item.received_qty === 0 ? '' : item.received_qty}
                          onChange={(e) => handleQtyChange(item.id, e.target.value)}
                          placeholder="0"
                          className="w-full max-w-[100px] px-2 py-2 text-center bg-white border-2 border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-xl font-bold text-blue-700 transition-all"
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100 border-t-2 border-slate-300 text-slate-800">
                <tr>
                  <td colSpan={2} className="p-4 text-right font-black text-base uppercase">รวมจำนวนสินค้าทั้งหมด:</td>
                  <td className="p-4 text-center font-black text-2xl text-slate-800">{totalTransferQty}</td>
                  <td className="p-4 text-center font-black text-2xl text-blue-700">
                    {header.isOutbound ? '-' : totalReceivedQty}
                  </td>
                </tr>
                {!header.isOutbound && totalReceivedQty !== totalTransferQty && (
                  <tr>
                    <td colSpan={4} className="px-4 py-3 text-right text-sm font-bold text-red-600 bg-red-50 border-t border-red-100">
                      ⚠️ ตรวจพบส่วนต่าง: ยอดรับจริงไม่ตรงกับยอดที่ส่ง ({Math.abs(totalReceivedQty - totalTransferQty)} ชิ้น)
                    </td>
                  </tr>
                )}
              </tfoot>
            </table>
          </div>

          {header.status === 'PENDING' && (
            <div className="mt-8 flex justify-end border-t-2 border-slate-100 pt-6">
              {header.isOutbound ? (
                <button
                  onClick={handleCancelTransfer}
                  disabled={submitting}
                  className="px-8 py-3.5 bg-red-600 text-white rounded-xl font-bold text-lg hover:bg-red-700 active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg shadow-red-500/30 flex items-center gap-2"
                >
                  {submitting ? 'กำลังดำเนินการ...' : 'ยกเลิกการโอนสินค้า'}
                </button>
              ) : (
                <div className="flex items-center gap-6">
                  {totalReceivedQty !== totalTransferQty && (
                    <span className="text-red-600 font-bold text-sm bg-red-50 px-4 py-2 rounded-lg border border-red-100 animate-pulse">
                      โปรดตรวจสอบยอดรับอีกครั้ง!
                    </span>
                  )}
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="px-10 py-4 bg-blue-600 text-white rounded-xl font-black text-lg hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50 shadow-xl shadow-blue-500/30 flex items-center gap-2 border-b-4 border-blue-800 active:border-b-0 active:mt-4"
                  >
                    {submitting ? 'กำลังบันทึกข้อมูล...' : 'บันทึกรับสินค้าเข้าคลัง'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ================================================================
        2. PRINT VIEW (สำหรับการพิมพ์ลงกระดาษ A4)
        ================================================================
      */}
      <div className="hidden print:block w-full bg-white text-black font-sans">
        
        {/* 🟢 อัปเดต CSS บังคับ margin: 0 เพื่อซ่อน Header/Footer ของ Browser ทั้งหมด */}
        <style type="text/css" media="print">
          {`
            @page { 
              size: A4; 
              margin: 0; 
            }
            body { 
              -webkit-print-color-adjust: exact; 
              print-color-adjust: exact; 
            }
          `}
        </style>

        {printPages.map((pageItems, pageIdx) => {
          const isLastPage = pageIdx === printPages.length - 1

          return (
            <div 
              key={pageIdx} 
              className="flex flex-col mx-auto relative box-border" 
              // 🟢 ปรับโครงสร้างหน้าเป็น 297mm (เต็ม A4) แล้วใช้ padding (10mm) แทนการใช้ margin
              style={{ width: '190mm', height: '297mm', padding: '10mm 0', pageBreakAfter: 'always' }}
            >
              
              {/* --- ส่วนบน (Header) --- */}
              <div>
                <div className="flex justify-between items-end border-b-2 border-black pb-3 mb-3">
                  <div>
                    <h1 className="text-2xl font-black text-black mb-1">
                      ใบโอนสินค้า {header.isOutbound ? '(ใบส่งของ)' : '(ใบรับของ)'}
                    </h1>
                    <div className="text-sm">
                      <p><span className="font-bold inline-block w-16">ต้นทาง:</span> {header.from_branch?.branch_name || '-'}</p>
                      <p><span className="font-bold inline-block w-16">ปลายทาง:</span> {header.to_branch?.branch_name || '-'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold mb-1">เลขที่เอกสาร</p>
                    <h2 className="text-lg font-black">{header.transfer_code}</h2>
                    <p className="text-xs mt-1">หน้า {pageIdx + 1} / {printPages.length}</p>
                  </div>
                </div>

                <div className="font-bold mb-2 flex justify-between text-sm">
                  <span>รายการสินค้า (ตรวจสอบก่อนส่ง)</span>
                  <span>วันที่พิมพ์: {new Date().toLocaleDateString('th-TH')}</span>
                </div>

                {/* --- ตารางสินค้า --- */}
                <table className="w-full text-sm text-black border-collapse border border-black">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-black p-1 text-center w-12 font-bold text-xs">ลำดับ</th>
                      <th className="border border-black p-1 text-center w-16 font-bold text-xs">รูป</th>
                      <th className="border border-black p-1 text-left font-bold px-2 text-xs">รายละเอียดสินค้า</th>
                      <th className="border border-black p-1 text-center w-20 font-bold text-xs">ยอดส่ง</th>
                      <th className="border border-black p-1 text-center w-20 font-bold text-xs">ยอดรับจริง</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map((item, rowIdx) => {
                      const globalIndex = pageIdx * ROWS_PER_PAGE + rowIdx + 1
                      
                      return (
                        <tr key={rowIdx} className="h-[54px]"> 
                          {item ? (
                            <>
                              <td className="border border-black p-1 text-center font-medium">{globalIndex}</td>
                              <td className="border border-black p-1 text-center">
                                {item.products?.image_url ? (
                                  <img src={item.products.image_url} alt="" className="w-9 h-9 object-cover mx-auto" />
                                ) : (
                                  <div className="w-9 h-9 bg-gray-100 mx-auto border border-gray-300"></div>
                                )}
                              </td>
                              <td className="border border-black p-1 px-2">
                                <div className="font-bold text-[13px] leading-tight max-w-[280px] truncate">{item.products?.name}</div>
                                <div className="text-[10px] text-gray-600 mt-[2px]">SKU: {item.products?.sku || '-'}</div>
                              </td>
                              <td className="border border-black p-1 text-center font-bold text-base">{item.transfer_qty}</td>
                              <td className="border border-black p-1 text-center"></td>
                            </>
                          ) : (
                            <>
                              <td className="border border-black p-1 text-center text-transparent">-</td>
                              <td className="border border-black p-1"></td>
                              <td className="border border-black p-1"></td>
                              <td className="border border-black p-1"></td>
                              <td className="border border-black p-1"></td>
                            </>
                          )}
                        </tr>
                      )
                    })}
                  </tbody>
                  {isLastPage && (
                    <tfoot>
                      <tr>
                        <td colSpan={3} className="border border-black p-2 pr-2 text-right font-bold">รวมจำนวนสินค้าทั้งหมด:</td>
                        <td className="border border-black p-2 text-center font-black text-lg">{totalTransferQty}</td>
                        <td className="border border-black p-2 text-center"></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
              
              {/* 🟢 ลบส่วนผู้รับ/ผู้ส่งออกไปเรียบร้อยแล้ว */}

            </div>
          )
        })}
      </div>

    </>
  )
}