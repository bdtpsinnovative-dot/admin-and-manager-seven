"use client"

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { getPrintDispatchData } from '@/actions/dispatch'
import { Printer, X } from 'lucide-react'
import PrintDispatchDocument from '@/components/PrintDispatchDocument'

interface PrintDispatchModalProps {
  orderCode: string | null
  onClose: () => void
  autoPrint?: boolean
}

export default function PrintDispatchModal({ orderCode, onClose, autoPrint = false }: PrintDispatchModalProps) {
  const [mounted, setMounted] = useState(false)
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (orderCode) {
      loadData(orderCode)
    } else {
      setData(null)
    }
  }, [orderCode])

  const handlePrint = () => {
    const originalTitle = document.title
    const prefix = data?.status === 'PENDING' ? 'Quote' : 'Receipt'
    document.title = `${prefix}_${orderCode || 'document'}`
    window.print()
    setTimeout(() => {
      document.title = originalTitle
    }, 1000)
  }

  useEffect(() => {
    if (data && autoPrint) {
      const timer = setTimeout(() => {
        handlePrint()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [data, autoPrint])

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

  if (!mounted || !orderCode) return null

  if (loading) {
    return createPortal(
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center print:hidden">
        <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900"></div>
          <p className="text-xs font-bold text-neutral-600">กำลังโหลดเอกสาร...</p>
        </div>
      </div>,
      document.body
    )
  }

  if (!data) {
    return createPortal(
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
      </div>,
      document.body
    )
  }

  return createPortal(
    <div id="print-modal-root" className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex justify-center items-start p-4 sm:p-8 print:p-0 print:bg-white print:static print:overflow-visible">
      
      {/* 🛑 CSS ดักการ Print */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          html, body {
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
            background-color: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          /* ซ่อน layout และ elements อื่นๆ ใน body ทั้งหมด เพื่อไม่ให้กินพื้นที่ layout */
          body > *:not(#print-modal-root) {
            display: none !important;
          }
          #print-modal-root {
            display: block !important;
            position: static !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            box-shadow: none !important;
          }
          #print-section { 
            position: static !important;
            width: 100% !important; 
            max-width: 100% !important;
            min-height: 275mm !important;
            height: 275mm !important;
            padding: 6mm 10mm !important; 
            box-shadow: none !important;
            margin: 0 auto !important;
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
          @page { 
            size: A4 portrait; 
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
          <div className="flex items-center gap-2">
            <button 
              onClick={handlePrint} 
              className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 active:scale-95 text-white rounded-full font-bold text-xs transition-all shadow-md cursor-pointer"
              title="พิมพ์หรือบันทึกเป็นไฟล์ PDF"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9.5 8.5h-2V13h2c.55 0 1-.45 1-1s-.45-.5-1-.5zm5.5 0h-2v4h2c.55 0 1-.45 1-1v-2c0-.55-.45-1-1-1zm-6-3.5h-3v7h1.5v-2.5h1.5c.83 0 1.5-.67 1.5-1.5v-1.5c0-.83-.67-1.5-1.5-1.5zm6 0h-3v7h1.5v-2h1.5c.83 0 1.5-.67 1.5-1.5v-2c0-.83-.67-1.5-1.5-1.5zm4 0h-3.5v7H18v-2.5h1.5V11H18V9.5h2.5V8z"/>
              </svg>
              บันทึกเป็น PDF
            </button>
            <button 
              onClick={handlePrint} 
              className="flex items-center gap-2 px-5 py-2 bg-neutral-900 text-white rounded-full font-bold text-xs hover:bg-black transition-all shadow-md hover:shadow-lg cursor-pointer"
            >
              <Printer className="w-4 h-4" /> พิมพ์เอกสาร
            </button>
          </div>
        </div>

        {/* 📄 พื้นที่กระดาษ A4 (เรียกใช้ Component ร่วม) */}
        <PrintDispatchDocument 
          data={data} 
          className="w-full px-8 py-6 shadow-[0_0_40px_rgba(0,0,0,0.1)] min-h-[1122px] print:min-h-0 print:h-auto rounded-2xl print:rounded-none"
        />
      </div>
    </div>,
    document.body
  )
}
