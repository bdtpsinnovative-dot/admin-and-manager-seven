"use client"

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { getPrintDispatchData } from '@/actions/dispatch'
import { Printer, ArrowLeft } from 'lucide-react'
import PrintDispatchDocument from '@/components/PrintDispatchDocument'

export default function PrintQuotationPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const isEmbedQuery = searchParams.get('embed') === 'true'

  const orderCode = params.order_code as string
  
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (orderCode) loadData()
  }, [orderCode])

  async function loadData() {
    setLoading(true)
    const res = await getPrintDispatchData(orderCode)
    if (res.success && res.data) {
      setData(res.data)
    } else {
      alert("ดึงข้อมูลใบเสนอราคาไม่สำเร็จ หรือไม่มีรายการนี้ในระบบ")
    }
    setLoading(false)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center font-light text-neutral-400 tracking-widest animate-pulse">LOADING...</div>
  if (!data) return <div className="min-h-screen flex items-center justify-center font-light text-red-400 tracking-widest">DOCUMENT NOT FOUND</div>

  const isEmbed = isEmbedQuery || (typeof window !== 'undefined' && window.location.search.includes('embed=true'))

  return (
    <div className={`min-h-screen bg-[#F9F9F9] p-4 sm:p-8 font-sans text-neutral-900 ${isEmbed ? 'p-0 sm:p-4' : ''}`}>
      
      <style dangerouslySetInnerHTML={{__html: `
        ${isEmbed ? `
          .print\\:hidden, aside, nav, header { display: none !important; }
          main { margin-left: 0 !important; padding: 0 !important; }
        ` : ''}
        @media print {
          html, body {
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
            background-color: white !important;
          }
          body * { visibility: hidden; }
          #print-section, #print-section * { visibility: visible; }
          #print-section {
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            position: static !important; 
            width: 100% !important; 
            max-width: 210mm !important;
            box-sizing: border-box !important;
            min-height: 255mm !important;
            padding: 4mm 6mm !important;
            box-shadow: none !important;
            margin: 0 auto !important;
          }
          @page { 
            size: A4 portrait; 
            margin: 5mm 6mm !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          table { border-collapse: separate !important; border-spacing: 0 !important; width: 100% !important; }
          tbody { display: table-row-group !important; }
          thead { display: table-header-group !important; }
          tr, td, th { page-break-inside: avoid !important; break-inside: avoid !important; -webkit-column-break-inside: avoid !important; }
        }
      `}} />

      {/* เมนูควบคุม (ไม่แสดงตอน Print) */}
      {!isEmbed && (
        <div className="max-w-[850px] mx-auto mb-6 flex justify-between items-center print:hidden">
          <Link href="/sale/vanguard-dispatch" className="flex items-center gap-2 text-neutral-500 hover:text-black font-medium text-sm transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to System
          </Link>
          <button 
            onClick={() => window.print()} 
            className="flex items-center gap-2 px-6 py-2.5 bg-neutral-900 text-white rounded-full font-medium text-sm hover:bg-black transition-all shadow-md hover:shadow-lg"
          >
            <Printer className="w-4 h-4" /> Print Document
          </button>
        </div>
      )}

      {/* 📄 พื้นที่กระดาษ A4 (เรียกใช้ Component ร่วม) */}
      <PrintDispatchDocument 
        data={data} 
        className="max-w-[850px] mx-auto px-8 py-6 shadow-[0_0_40px_rgba(0,0,0,0.05)] min-h-[1122px] print:min-h-[255mm]"
      />
    </div>
  )
}
