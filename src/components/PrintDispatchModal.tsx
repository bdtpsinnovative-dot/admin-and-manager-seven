"use client"

import { useEffect, useState } from 'react'
import { getPrintDispatchData } from '@/actions/dispatch'
import { Printer, X } from 'lucide-react'
import PrintDispatchDocument from '@/components/PrintDispatchDocument'

interface PrintDispatchModalProps {
  orderCode: string | null
  onClose: () => void
}

export default function PrintDispatchModal({ orderCode, onClose }: PrintDispatchModalProps) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (orderCode) {
      loadData(orderCode)
    } else {
      setData(null)
    }
  }, [orderCode])

  async function loadData(code: string) {
    setLoading(true)
    const res = await getPrintDispatchData(code)
    if (res.success && res.data) {
      setData(res.data)
    } else {
      setData(null)
    }
    setLoading(false)
  }

  if (!orderCode) return null

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center print:hidden">
        <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900"></div>
          <p className="text-xs font-bold text-neutral-600">กำลังโหลดเอกสาร...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center print:hidden">
        <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-4 max-w-sm">
          <p className="text-xs font-bold text-red-500 text-center">ไม่พบเอกสารในระบบ หรือดึงข้อมูลล้มเหลว</p>
          <button 
            onClick={onClose} 
            className="px-4 py-2 bg-neutral-900 text-white rounded-xl text-xs font-bold hover:bg-neutral-800 transition-all cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex justify-center items-start p-4 sm:p-8 print:p-0 print:bg-white">
      
      {/* 🛑 CSS ดักการ Print */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body { background-color: white !important; }
          body * { visibility: hidden; }
          #print-section, #print-section * { visibility: visible; }
          #print-section { 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 100%; 
            padding: 5mm 10mm !important; 
            box-shadow: none !important;
            margin: 0;
          }
          @page { 
            size: A4; 
            margin: 0; 
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          tr { page-break-inside: avoid; }
        }
      `}} />

      <div className="w-full max-w-[850px] print:w-full print:max-w-full">
        {/* เมนูควบคุม (ไม่แสดงตอน Print) */}
        <div className="mb-6 flex justify-between items-center print:hidden bg-white px-6 py-4 rounded-2xl shadow-md border border-neutral-100">
          <button 
            onClick={onClose} 
            className="flex items-center gap-2 text-neutral-500 hover:text-black font-semibold text-xs transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" /> ปิดหน้าต่าง
          </button>
          <button 
            onClick={() => window.print()} 
            className="flex items-center gap-2 px-5 py-2 bg-neutral-900 text-white rounded-full font-bold text-xs hover:bg-black transition-all shadow-md hover:shadow-lg cursor-pointer"
          >
            <Printer className="w-4 h-4" /> พิมพ์เอกสาร
          </button>
        </div>

        {/* 📄 พื้นที่กระดาษ A4 (เรียกใช้ Component ร่วม) */}
        <PrintDispatchDocument 
          data={data} 
          className="w-full px-8 py-6 shadow-[0_0_40px_rgba(0,0,0,0.1)] min-h-[1122px] rounded-2xl print:rounded-none"
        />
      </div>
    </div>
  )
}
