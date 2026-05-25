"use client"

import { useState } from "react"

interface CountItem {
  id: number
  qty: number
  created_at: string
  products: {
    id: number
    name: string
    price: number
    image_url: string | null
  } | null
  stock_initial_counts: {
    branches: {
      branch_name: string
    } | null
  } | null
}

export default function InitialCountClient({ items }: { items: CountItem[] }) {
  const [currentPage, setCurrentPage] = useState(1)
  
  const handlePrint = () => {
    window.print()
  }

  const totalQty = items.reduce((sum, item) => sum + (item.qty || 0), 0)
  const totalPrice = items.reduce((sum, item) => {
    const price = item.products?.price || 0
    return sum + (price * item.qty)
  }, 0)

  // 💡 แก้ไข 1: ลดเหลือหน้าละ 10 รายการ จะได้ไม่ล้นความสูงของ A4
  const ITEMS_PER_PAGE = 12
  const totalPages = Math.max(1, Math.ceil(items.length / ITEMS_PER_PAGE))
  
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const currentWebItems = items.slice(startIndex, startIndex + ITEMS_PER_PAGE)

  const chunks = Array.from({ length: totalPages }, (_, i) =>
    items.slice(i * ITEMS_PER_PAGE, (i + 1) * ITEMS_PER_PAGE)
  )

  const printDate = new Date().toLocaleDateString('th-TH', { 
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' 
  })

  const handlePrevPage = () => setCurrentPage((prev) => Math.max(1, prev - 1))
  const handleNextPage = () => setCurrentPage((prev) => Math.min(totalPages, prev + 1))

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { size: A4; margin: 10mm; }
          body > nav, body > header, #layout-header { display: none !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}} />

      <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-800 pb-20 print:bg-white print:pb-0 print:text-black">
        
        {/* 💻 ส่วนหน้าเว็บ (พิมพ์ไม่ติด) */}
        <div className="print:hidden">
          <header className="sticky top-0 z-30 bg-white/70 backdrop-blur-md border-b border-slate-200/60">
            <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">รายงานสินค้าตั้งต้นคลัง</h1>
                <p className="text-sm text-slate-500 mt-0.5">สรุปยอดสินค้ารายตัวที่นับเข้ามาล่าสุดในระบบ</p>
              </div>
              <button onClick={handlePrint} className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-slate-800 border border-transparent rounded-xl hover:bg-slate-700 transition-all shadow-sm">
                🖨️ พิมพ์รายงาน
              </button>
            </div>
          </header>

          <main className="max-w-5xl mx-auto px-6 py-8">
            <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm overflow-hidden flex flex-col">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-4 py-3 text-xs font-bold text-slate-500 w-[8%]">รูป</th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-500">ชื่อสินค้า</th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-500 w-[15%] text-right">ราคา/ชิ้น</th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-500 w-[18%]">สาขา</th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-500 w-[15%] text-right">จำนวนตั้งต้น</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {currentWebItems.length === 0 ? (
                      <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400 text-sm">ไม่มีข้อมูล</td></tr>
                    ) : (
                      currentWebItems.map((item) => {
                        const product = item.products
                        const branchName = item.stock_initial_counts?.branches?.branch_name || "ไม่ระบุสาขา"
                        return (
                          <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-4 py-3 align-middle">
                              {product?.image_url ? (
                                <img src={product.image_url} alt={product.name} className="w-10 h-10 object-cover rounded-md border border-slate-200 shadow-sm" />
                              ) : <div className="w-10 h-10 bg-slate-100 rounded-md flex items-center justify-center text-[9px] text-slate-400 border border-slate-200">No Pic</div>}
                            </td>
                            <td className="px-4 py-3 align-middle font-medium text-slate-800 text-sm">{product?.name || "Unknown Product"}</td>
                            <td className="px-4 py-3 align-middle text-right text-sm">฿{(product?.price || 0).toLocaleString('th-TH')}</td>
                            <td className="px-4 py-3 align-middle text-slate-500 text-sm">{branchName}</td>
                            <td className="px-4 py-3 align-middle text-right"><span className="font-semibold text-slate-800 text-base">{item.qty.toLocaleString('th-TH')}</span><span className="text-xs text-slate-400 ml-1">ชิ้น</span></td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                  {items.length > 0 && (
                    <tfoot className="bg-slate-50/80 border-t border-slate-200">
                      <tr>
                        <td colSpan={2} className="px-4 py-4 text-right font-bold text-slate-700 text-sm">รวมทั้งสิ้น (Grand Total)</td>
                        <td className="px-4 py-4 text-right font-bold text-rose-600 text-sm">มูลค่ารวม: ฿{totalPrice.toLocaleString('th-TH')}</td>
                        <td className="px-4 py-4 text-right font-bold text-slate-700 text-sm">จำนวนรวม:</td>
                        <td className="px-4 py-4 text-right"><span className="font-black text-indigo-600 text-lg">{totalQty.toLocaleString('th-TH')}</span><span className="text-xs text-slate-500 ml-1">ชิ้น</span></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>

              {items.length > ITEMS_PER_PAGE && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-white">
                  <div className="text-sm text-slate-500">แสดงรายการที่ {startIndex + 1} ถึง {Math.min(startIndex + ITEMS_PER_PAGE, items.length)} จากทั้งหมด {items.length} รายการ</div>
                  <div className="flex items-center gap-2">
                    <button onClick={handlePrevPage} disabled={currentPage === 1} className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50">ก่อนหน้า</button>
                    <div className="text-sm font-semibold text-slate-700 px-2">หน้า {currentPage} / {totalPages}</div>
                    <button onClick={handleNextPage} disabled={currentPage === totalPages} className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50">ถัดไป</button>
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>

        {/* 🖨️ ส่วนงานพิมพ์ */}
        <div className="hidden print:block w-full">
          {chunks.map((chunk, pageIndex) => (
            // 💡 แก้ไข 2: ใส่เงื่อนไขว่า ถ้าเป็นหน้าสุดท้าย ห้ามใช้คลาส break-after-page เด็ดขาด (จะได้ไม่มีหน้าเปล่า)
            <div 
              key={`page-${pageIndex}`} 
              className={`pt-2 ${pageIndex === totalPages - 1 ? '' : 'break-after-page'}`}
            >
              <div className="border-b-2 border-black pb-4 mb-4">
                <h1 className="text-2xl font-black text-black text-center tracking-wide mb-6 mt-4">รายงานสรุปสินค้าตั้งต้นคลัง</h1>
                <div className="flex justify-between items-end text-sm font-bold text-black px-2">
                  <p>วันที่พิมพ์: {printDate}</p>
                  <p className="bg-slate-100 px-3 py-1 rounded-md border border-slate-300">หน้า {pageIndex + 1} / {totalPages}</p>
                </div>
              </div>

              <table className="w-full text-left border-collapse text-[12px]">
                <thead>
                  <tr className="border-black border-b-2">
                    <th className="px-2 py-3 font-bold text-black w-[8%]">รูป</th>
                    <th className="px-2 py-3 font-bold text-black">ชื่อสินค้า</th>
                    <th className="px-2 py-3 font-bold text-black w-[15%] text-right">ราคา/ชิ้น</th>
                    <th className="px-2 py-3 font-bold text-black w-[18%]">สาขา</th>
                    <th className="px-2 py-3 font-bold text-black w-[15%] text-right">จำนวนตั้งต้น</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  {chunk.length === 0 ? (
                    <tr><td colSpan={5} className="px-2 py-8 text-center text-black text-sm">ไม่มีข้อมูล</td></tr>
                  ) : (
                    chunk.map((item) => {
                      const product = item.products
                      const branchName = item.stock_initial_counts?.branches?.branch_name || "ไม่ระบุสาขา"
                      return (
                        <tr key={`print-${item.id}`} className="break-inside-avoid">
                          <td className="px-2 py-3 align-middle">
                            {product?.image_url ? (
                              <img src={product.image_url} alt={product.name} className="w-10 h-10 object-cover rounded border border-slate-300" />
                            ) : <div className="w-10 h-10 bg-slate-100 rounded flex items-center justify-center text-[9px] border border-slate-300">No Pic</div>}
                          </td>
                          <td className="px-2 py-3 align-middle font-bold text-black">{product?.name || "Unknown Product"}</td>
                          <td className="px-2 py-3 align-middle text-right text-black">฿{(product?.price || 0).toLocaleString('th-TH')}</td>
                          <td className="px-2 py-3 align-middle text-black">{branchName}</td>
                          <td className="px-2 py-3 align-middle text-right"><span className="font-bold text-black text-[14px]">{item.qty.toLocaleString('th-TH')}</span><span className="text-[11px] text-black ml-1">ชิ้น</span></td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
                {pageIndex === totalPages - 1 && items.length > 0 && (
                  <tfoot className="border-black border-t-2">
                    <tr>
                      <td colSpan={2} className="px-2 py-4 text-right font-bold text-black text-sm">รวมทั้งสิ้น (Grand Total)</td>
                      <td className="px-2 py-4 text-right font-bold text-black text-sm">มูลค่ารวม: ฿{totalPrice.toLocaleString('th-TH')}</td>
                      <td className="px-2 py-4 text-right font-bold text-black text-sm">จำนวนรวม:</td>
                      <td className="px-2 py-4 text-right"><span className="font-bold text-black text-base">{totalQty.toLocaleString('th-TH')}</span><span className="text-[11px] text-black ml-1">ชิ้น</span></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}