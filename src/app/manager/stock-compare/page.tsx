//src/app/(manager)/manager/stock-compare/page.tsx

"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getComparisonData } from '@/actions/stock-compare'

interface StockCompare {
  productId: number
  sku: string
  name: string
  imageUrl: string | null
  specs: any 
  systemQty: number   
  countedQty: number  
  diff: number        
}

export default function StockComparePage() {
  const [data, setData] = useState<StockCompare[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  
  // State สำหรับจัดการฟิลเตอร์ (ALL = ทั้งหมด, COUNTED = สแกนเจอ, MISSING = ขาดหาย)
  const [filterType, setFilterType] = useState<'ALL' | 'COUNTED' | 'MISSING'>('ALL')

  async function fetchComparison() {
    setLoading(true)
    const result = await getComparisonData()
    setData(result)
    setLoading(false)
  }

  useEffect(() => {
    fetchComparison()
  }, [])

  // คำนวณยอดสรุปการ์ดด้านบน
  const totalSystem = data.reduce((sum, item) => sum + item.systemQty, 0)
  const totalCounted = data.reduce((sum, item) => sum + item.countedQty, 0)
  const totalMissing = data.filter(i => i.diff < 0).reduce((sum, item) => sum + Math.abs(item.diff), 0)

  // ลอจิกการกรองข้อมูล (รวมทั้ง Search และ ฟิลเตอร์ปุ่ม)
  const filteredData = data.filter(item => {
    // 1. เช็คคำค้นหา
    const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        item.sku.toLowerCase().includes(searchQuery.toLowerCase())
    
    // 2. เช็คฟิลเตอร์
    let matchFilter = true
    if (filterType === 'COUNTED') matchFilter = item.countedQty > 0
    if (filterType === 'MISSING') matchFilter = item.diff < 0

    return matchSearch && matchFilter
  })

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans print:p-0 print:bg-white">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Inject CSS print style for better PDF layout */}
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            body {
              background-color: white !important;
              color: black !important;
              font-size: 12px;
            }
            @page {
              margin: 1.5cm;
              size: portrait;
            }
            tr {
              page-break-inside: avoid;
            }
            thead {
              display: table-header-group;
            }
          }
        `}} />

        {/* หัวข้อรายงานเฉพาะตอนพิมพ์ (Print Only Header) */}
        <div className="hidden print:block border-b border-slate-300 pb-3 mb-6">
          <h1 className="text-3xl font-extrabold text-black">
            {filterType === 'ALL' ? 'ทั้งหมด' : 
             filterType === 'COUNTED' ? 'สแกนเจอ' : 
             'ขาดหาย'}
          </h1>
          <p className="text-slate-500 text-xs mt-1">วันที่พิมพ์รายงาน: {new Date().toLocaleString('th-TH')}</p>
        </div>

        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              รายงานตรวจสอบยอดนับสต๊อก{' '}
              <span className="text-blue-600 font-extrabold">
                {filterType === 'ALL' ? 'ทั้งหมด' : 
                 filterType === 'COUNTED' ? 'ที่สแกนเจอ' : 
                 'ที่ขาดหาย'}
              </span>{' '}
              (RFID)
            </h1>
            <p className="text-slate-500 text-sm mt-1">เปรียบเทียบรายการสินค้าทั้งหมดในระบบ กับยอดที่สแกนได้จริงรายสาขา</p>
          </div>

          <div className="flex items-center gap-2">
            {/* ปุ่มพิมพ์รายงานสรุป */}
            <button 
              onClick={() => window.print()}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white font-bold rounded-xl shadow-md shadow-emerald-255/30 hover:bg-emerald-700 hover:shadow-lg hover:-translate-y-0.5 transition-all active:translate-y-0"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.821V21m0 0h10.56m-10.56 0V15.3m10.56 5.7h1.68a1.68 1.68 0 001.68-1.68V11.1a1.68 1.68 0 00-1.68-1.68H3.36a1.68 1.68 0 00-1.68 1.68v8.4a1.68 1.68 0 001.68 1.68h1.68m10.56 0V15.3m-10.56 0h10.56M16.8 15.3V6H7.2v9.3m12.18-5.325a.3.3 0 11-.6 0 .3.3 0 01.6 0z" />
              </svg>
              พิมพ์รายงานสรุป (Print)
            </button>

            {/* ปุ่มกลับหน้าค้นหาตำแหน่ง */}
            <Link 
              href="/manager/stock-search"
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-bold rounded-xl shadow-md shadow-blue-200 hover:bg-blue-700 hover:shadow-lg hover:-translate-y-0.5 transition-all active:translate-y-0"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              ไประบบค้นหาตำแหน่ง (Locator)
            </Link>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:hidden">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-sm font-medium">ยอดสต๊อกในระบบทั้งหมด</p>
              <p className="text-3xl font-bold text-slate-800 mt-1">{totalSystem}</p>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-sm font-medium">ยอดที่สแกนได้จริง (RFID)</p>
              <p className="text-3xl font-bold text-indigo-600 mt-1">{totalCounted}</p>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-red-100 flex items-center justify-between">
            <div>
              <p className="text-red-500 text-sm font-medium">ยอดสินค้าที่ขาดหาย</p>
              <p className="text-3xl font-bold text-red-600 mt-1">{totalMissing}</p>
            </div>
          </div>
        </div>

        {/* ส่วนค้นหา และ ฟิลเตอร์ */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 print:hidden">
          {/* Search Bar */}
          <div className="relative w-full sm:w-96">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="ค้นหาชื่อ หรือ รหัสสินค้า (SKU)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-slate-800"
            />
          </div>

          {/* ปุ่ม Filter แบบ Toggle */}
          <div className="flex bg-slate-200/60 p-1 rounded-xl w-full sm:w-auto">
            <button 
              onClick={() => setFilterType('ALL')} 
              className={`flex-1 sm:flex-none px-5 py-2 rounded-lg text-sm font-semibold transition-all ${filterType === 'ALL' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              ทั้งหมด
            </button>
            <button 
              onClick={() => setFilterType('COUNTED')} 
              className={`flex-1 sm:flex-none px-5 py-2 rounded-lg text-sm font-semibold transition-all ${filterType === 'COUNTED' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-indigo-600'}`}
            >
              สแกนเจอ
            </button>
            <button 
              onClick={() => setFilterType('MISSING')} 
              className={`flex-1 sm:flex-none px-5 py-2 rounded-lg text-sm font-semibold transition-all ${filterType === 'MISSING' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-red-600'}`}
            >
              ขาดหาย
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden print:shadow-none print:border-slate-300">
          {loading ? (
            <div className="p-10 text-center text-slate-500 font-medium flex flex-col items-center justify-center gap-3">
              <svg className="animate-spin h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              กำลังดึงข้อมูล...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-sm font-semibold text-slate-600 print:bg-slate-100 print:text-black">
                    <th className="p-4 print:p-2">สินค้า</th>
                    <th className="p-4 text-center print:p-2">ยอดระบบ</th>
                    <th className="p-4 text-center print:p-2">ยอดนับได้ (RFID)</th>
                    <th className="p-4 text-center print:p-2">ผลต่าง</th>
                    <th className="p-4 text-center print:p-2">สถานะ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 print:divide-slate-300">
                  {filteredData.map((item) => (
                    <tr key={item.productId} className="hover:bg-slate-50/50 transition-colors print:hover:bg-transparent">
                      <td className="p-4 print:p-2">
                        <div className="flex items-center gap-3">
                          {/* ซ่อนรูปสินค้าตอนปริ้นท์รายงานเพื่อความสะอาดเรียบร้อยและประหยัดหมึก */}
                          <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden shrink-0 print:hidden">
                            {item.imageUrl ? (
                              <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-xs text-slate-400">No Img</span>
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800 print:text-black">{item.name}</p>
                            <p className="text-xs text-slate-500 mt-0.5 print:text-slate-600">
                              SKU: {item.sku} | 
                              {item.specs?.material ? ` ${item.specs.material}` : ''} 
                              {item.specs?.thickness_cm ? ` หนา ${item.specs.thickness_cm}cm` : ''} 
                              {item.specs?.group_size ? ` (${item.specs.group_size})` : ''}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-center font-medium text-slate-600 print:p-2 print:text-black">{item.systemQty}</td>
                      <td className="p-4 text-center font-bold text-indigo-600 print:p-2 print:text-indigo-800">{item.countedQty}</td>
                      <td className="p-4 text-center print:p-2">
                        <span className={`font-bold ${item.diff > 0 ? 'text-green-600' : item.diff < 0 ? 'text-red-600' : 'text-slate-450'}`}>
                          {item.diff > 0 ? `+${item.diff}` : item.diff}
                        </span>
                      </td>
                      <td className="p-4 text-center print:p-2">
                        {item.diff === 0 ? (
                          <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 print:bg-transparent print:text-green-800 print:border print:border-green-300">ตรงกัน</span>
                        ) : item.diff > 0 ? (
                          <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 print:bg-transparent print:text-blue-800 print:border print:border-blue-300">สินค้าเกิน</span>
                        ) : (
                          <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 print:bg-transparent print:text-red-800 print:border print:border-red-300">สินค้าขาด</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredData.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-10 text-center text-slate-500">
                        {filterType === 'COUNTED' ? 'ไม่พบสินค้าที่สแกนเจอ' : 
                         filterType === 'MISSING' ? 'ยอดเยี่ยม! ไม่มีสินค้าขาดหายในระบบ' : 
                         'ไม่พบข้อมูลสต๊อก'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}