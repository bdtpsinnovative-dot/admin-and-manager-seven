"use client"

import { useEffect, useState } from 'react'
import { getPrintDispatchData } from '@/actions/dispatch'
import { Printer, X } from 'lucide-react'

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

  const calculateTotal = () => {
    if (!data?.order_items) return 0;
    return data.order_items.reduce((sum: number, item: any) => {
      const branchStock = item.products?.stock?.find((s: any) => Number(s.branch_id) === Number(item.fulfill_branch_id));
      const currentLiveQty = branchStock ? Number(branchStock.qty) : 0;
      const isOutOfStock = currentLiveQty < item.qty && data.status === 'PENDING';

      if (isOutOfStock) return sum;

      const price = item.price || item.products?.price || 0;
      return sum + (price * item.qty);
    }, 0);
  }

  const grandTotal = calculateTotal();

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

        {/* 📄 พื้นที่กระดาษ A4 */}
        <div id="print-section" className="w-full bg-white px-8 py-6 shadow-[0_0_40px_rgba(0,0,0,0.1)] flex flex-col min-h-[1122px] rounded-2xl print:rounded-none">
          
          {/* ================= HEADER ================= */}
          <div className="flex justify-between items-start pb-3 border-b border-neutral-200">
            <div>
              <img 
                src="/logo.terra.home.png" 
                alt="Terra Home Studio Logo" 
                className="h-10 w-auto object-contain mb-2 mix-blend-multiply" 
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const fallback = document.getElementById('logo-fallback');
                  if (fallback) fallback.style.display = 'block';
                }}
              />
              <h1 id="logo-fallback" className="hidden text-2xl font-black tracking-tighter text-neutral-900 flex-col leading-none mb-2">
                TERRA <span className="font-light tracking-wide text-sm text-neutral-500 mt-0.5">HOME STUDIO</span>
              </h1>

              <div className="mt-1 text-[8px] text-neutral-500 leading-tight tracking-wide">
                <p className="font-bold text-neutral-800 uppercase">Operated by TPS GARDEN FURNITURE CO., LTD</p>
                <p>351/7-8 Soi Bangkok-Nonthaburi 13, Bangkok-Nonthaburi Road,</p>
                <p>Bang Sue Subdistrict, Bang Sue District, Bangkok 10800</p>
                <p className="mt-0.5 text-neutral-400">TAX ID: 010555XXXXXXX &nbsp;|&nbsp; TEL: 02-XXX-XXXX</p>
              </div>
            </div>
            
            <div className="text-right flex flex-col items-end">
              <h2 className="text-3xl font-light tracking-[0.2em] uppercase text-neutral-200">
                {data.status === 'PENDING' ? 'Quote' : 'Receipt'}
              </h2>
              
              <div className={`mt-1 px-2.5 py-0.5 text-[8px] font-bold uppercase tracking-widest rounded-sm border inline-block
                ${data.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 
                  data.status === 'PROCESSING' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                  data.status === 'CANCELLED' ? 'bg-red-50 text-red-600 border-red-200' :
                  'bg-neutral-50 text-neutral-600 border-neutral-200'}`}
              >
                {data.status === 'COMPLETED' ? 'COMPLETED / DELIVERED' :
                 data.status === 'PROCESSING' ? 'PAID / PROCESSING' :
                 data.status === 'CANCELLED' ? 'CANCELLED' :
                 'PENDING PAYMENT'}
              </div>
            </div>
          </div>

          {/* ================= INFO SECTION ================= */}
          <div className="py-3 flex justify-between items-end">
            <div className="w-1/2">
              <h3 className="text-[8px] font-bold uppercase tracking-[0.15em] text-neutral-400 mb-1">Prepared For</h3>
              <p className="text-sm font-semibold text-neutral-900 mb-0.5">{data.shipping_name || 'ไม่ระบุชื่อลูกค้า'}</p>
              <p className="text-[9px] text-neutral-500 leading-tight max-w-[280px]">{data.shipping_address || 'ไม่ระบุที่อยู่'}</p>
              <p className="text-[9px] text-neutral-500 mt-0.5">Tel: <span className="text-neutral-900">{data.shipping_phone || '-'}</span></p>
            </div>
            
            <div className="w-1/2 text-right">
              <table className="ml-auto text-[9px] text-neutral-600">
                <tbody>
                  <tr>
                    <td className="pr-3 pb-1 text-right font-medium text-neutral-400">Doc No.</td>
                    <td className="font-semibold text-neutral-900 pb-1">{data.order_code}</td>
                  </tr>
                  <tr>
                    <td className="pr-3 pb-1 text-right font-medium text-neutral-400">Date</td>
                    <td className="font-semibold text-neutral-900 pb-1">{new Date(data.created_at).toLocaleDateString('en-GB')}</td>
                  </tr>
                  <tr>
                    <td className="pr-3 text-right font-medium text-neutral-400">Valid Until</td>
                    <td className="font-semibold text-neutral-900">30 Days</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* ================= ITEMS TABLE ================= */}
          <div className="mb-2 flex-grow">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-neutral-200 text-[8px] uppercase tracking-[0.1em] text-neutral-400">
                  <th className="pb-1.5 font-semibold w-8 text-center">#</th>
                  <th className="pb-1.5 font-semibold w-16 text-center">Image</th>
                  <th className="pb-1.5 font-semibold">Description</th>
                  <th className="pb-1.5 font-semibold text-center w-10">Qty</th>
                  <th className="pb-1.5 font-semibold text-right w-16">Price</th>
                  <th className="pb-1.5 font-semibold text-right w-20">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {data.order_items.map((item: any, index: number) => {
                  const branchStock = item.products?.stock?.find((s: any) => Number(s.branch_id) === Number(item.fulfill_branch_id));
                  const currentLiveQty = branchStock ? Number(branchStock.qty) : 0;
                  const isOutOfStock = currentLiveQty < item.qty && data.status === 'PENDING';

                  const price = item.price || item.products?.price || 0;
                  const total = price * item.qty;
                  const imageUrl = item.products?.image_url || 'https://placehold.co/150x150?text=No+Image';

                  return (
                    <tr key={item.id} className={`group ${isOutOfStock ? 'opacity-50 grayscale' : ''}`}>
                      <td className="py-2 text-center text-neutral-300 text-[9px] align-top mt-1">{index + 1}</td>
                      <td className="py-2 text-center align-top">
                        <div className="w-10 h-10 bg-[#F8F8F8] rounded-md overflow-hidden mx-auto relative">
                          <img 
                            src={imageUrl} 
                            alt={item.products?.name} 
                            className="w-full h-full object-cover mix-blend-multiply"
                          />
                        </div>
                      </td>
                      <td className="py-2 px-2 align-top">
                        <p className={`text-[11px] font-semibold leading-tight ${isOutOfStock ? 'text-neutral-400 line-through' : 'text-neutral-800'}`}>
                          {item.products?.name}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <p className="text-[8px] text-neutral-400 uppercase tracking-wide">SKU: {item.products?.sku || '-'}</p>
                          
                          {isOutOfStock && (
                            <span className="text-[7px] font-bold text-red-500 border border-red-200 px-1 rounded-sm uppercase tracking-wide">
                              Out of Stock
                            </span>
                          )}

                          {!isOutOfStock && item.branches?.branch_name && (
                            <span className="px-1 py-[1px] bg-neutral-100 text-neutral-500 rounded-sm text-[7px] font-semibold tracking-wide">
                              Fulfill by: {item.branches.branch_name}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 text-center align-top text-[10px] text-neutral-600">
                        {isOutOfStock ? <span className="line-through">{item.qty}</span> : item.qty}
                      </td>
                      <td className="py-2 text-right align-top text-[10px] text-neutral-600">
                        {isOutOfStock ? '-' : price.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 text-right align-top text-[11px] font-semibold text-neutral-800">
                        {isOutOfStock ? (
                          <span className="text-red-500 font-bold">0.00</span>
                        ) : (
                          total.toLocaleString('th-TH', { minimumFractionDigits: 2 })
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* ================= FOOTER SECTION ================= */}
          <div className="mt-auto">
            <div className="flex justify-between items-start pt-3 border-t border-neutral-200">
              <div className="w-1/2 pr-6 mt-1">
                <h3 className="text-[8px] font-bold uppercase tracking-[0.15em] text-neutral-400 mb-1">Terms & Conditions</h3>
                <p className="text-[8px] text-neutral-500 leading-tight">
                  1. ใบเสนอราคานี้มีผล 30 วันนับจากวันที่ออกเอกสาร<br/>
                  2. กรุณาตรวจสอบรายการสินค้าให้ถูกต้องก่อนยืนยันการสั่งซื้อ<br/>
                  3. สินค้าซื้อแล้วไม่รับเปลี่ยนหรือคืน ยกเว้นกรณีชำรุดจากการผลิต
                </p>
              </div>
              <div className="w-56">
                <div className="flex justify-between py-1 text-[9px] text-neutral-500">
                  <span>Subtotal</span>
                  <span>{grandTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between py-1 text-[9px] text-neutral-500">
                  <span>VAT (7%)</span>
                  <span>Included</span>
                </div>
                <div className="flex justify-between py-2 mt-1 border-t border-neutral-900">
                  <span className="text-[10px] font-bold text-neutral-900 uppercase tracking-widest mt-0.5">Total (THB)</span>
                  <span className="text-base font-bold text-neutral-900">{grandTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-12 text-center mt-6">
              <div>
                <div className="h-6 border-b border-neutral-300 w-full mb-1.5"></div>
                <p className="font-medium text-neutral-900 text-[8px] uppercase tracking-wider">Authorized Signature</p>
                <p className="text-neutral-400 text-[7px] mt-0.5">Terra Home Studio</p>
              </div>
              <div>
                <div className="h-6 border-b border-neutral-300 w-full mb-1.5"></div>
                <p className="font-medium text-neutral-900 text-[8px] uppercase tracking-wider">Accepted By</p>
                <p className="text-neutral-400 text-[7px] mt-0.5">Customer / Client</p>
              </div>
            </div>

            <div className="text-center mt-4 text-[7px] text-neutral-300 uppercase tracking-widest">
              Thank you for your business
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
