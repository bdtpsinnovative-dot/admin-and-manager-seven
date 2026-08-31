"use client"

import { useState } from 'react'
import { formatProductSup } from '@/utils/exportQuote'

interface PrintDispatchDocumentProps {
  data: any
  className?: string
}

export default function PrintDispatchDocument({ data, className = "" }: PrintDispatchDocumentProps) {
  const [logoError, setLogoError] = useState(false)

  const calculateTotal = () => {
    if (!data?.order_items) return 0;
    return data.order_items.reduce((sum: number, item: any) => {
      const branchStock = item.products?.stock?.find((s: any) => Number(s.branch_id) === Number(item.fulfill_branch_id));
      const currentLiveQty = branchStock ? Number(branchStock.qty) : 0;
      const isOutOfStock = currentLiveQty < item.qty && data.status === 'PENDING';

      if (isOutOfStock) return sum;

      const price = item.price_at_sale ?? item.products?.price ?? 0;
      return sum + (price * item.qty);
    }, 0);
  }

  const totalItemsPrice = calculateTotal();
  const specialDiscountPercent = Number(data?.special_discount_percent || 0);
  const specialDiscountBaht = Number(data?.special_discount_baht || 0);
  const afterBaht = Math.max(0, totalItemsPrice - specialDiscountBaht);
  const specialDiscountPercentAmount = afterBaht * (specialDiscountPercent / 100);

  // Prioritize values from database if they exist
  const totalItemsPriceFromDb = data?.subtotal !== undefined && data?.subtotal !== null && Number(data.subtotal) > 0
    ? Number(data.subtotal)
    : null;

  const totalSpecialDiscountFromDb = data?.discount_amount !== undefined && data?.discount_amount !== null
    ? Number(data.discount_amount)
    : null;

  const grandTotalFromDb = data?.total_amount !== undefined && data?.total_amount !== null && Number(data.total_amount) > 0
    ? Number(data.total_amount)
    : null;

  const subtotal = totalItemsPriceFromDb ?? totalItemsPrice;
  const totalSpecialDiscount = totalSpecialDiscountFromDb !== null ? totalSpecialDiscountFromDb : (specialDiscountBaht + specialDiscountPercentAmount);
  const grandTotal = grandTotalFromDb ?? Math.max(0, subtotal - totalSpecialDiscount);

  const vatAmount = grandTotal - (grandTotal / 1.07);
  const subTotalWithoutVat = grandTotal - vatAmount;

  return (
    <div 
      id="print-section" 
      className={`bg-white text-neutral-900 flex flex-col min-h-[1050px] print:min-h-[275mm] ${className}`}
    >
      {/* ================= HEADER SECTION ================= */}
      <div className="flex justify-between items-start pb-3 border-b border-neutral-200">
        <div>
          {logoError ? (
            <h1 className="text-2xl font-black tracking-tighter text-neutral-900 flex flex-col leading-none mb-2">
              TERRA <span className="font-light tracking-wide text-sm text-neutral-500 mt-0.5">HOME STUDIO</span>
            </h1>
          ) : (
            <img 
              src="/logo.terra.home.png" 
              alt="Terra Home Studio Logo" 
              className="h-10 w-auto object-contain mb-2 mix-blend-multiply" 
              onError={() => setLogoError(true)}
            />
          )}

          <div className="mt-1 text-[8px] text-neutral-500 leading-tight tracking-wide">
            <p className="font-bold text-neutral-800 uppercase">Operated by TPS GARDEN FURNITURE CO., LTD</p>
            <p>351/7-8 Soi Bangkok-Nonthaburi 13, Bangkok-Nonthaburi Road,</p>
            <p>Bang Sue Subdistrict, Bang Sue District, Bangkok 10800</p>
            <p className="mt-0.5 text-neutral-400">TAX ID: 0105541075911</p>
          </div>
        </div>
        
        <div className="text-right flex flex-col items-end">
          <h2 className="text-3xl font-light tracking-[0.2em] uppercase text-neutral-200">
            {data.status === 'PENDING' ? 'Quote' : 'Receipt'}
          </h2>
          
          <p className={`mt-1 text-[8.5px] font-bold uppercase tracking-widest
            ${data.status === 'COMPLETED' ? 'text-emerald-600' : 
              data.status === 'PROCESSING' ? 'text-blue-600' :
              data.status === 'CANCELLED' ? 'text-red-600' :
              'text-neutral-500'}`}
          >
            {data.status === 'COMPLETED' ? 'COMPLETED / DELIVERED' :
             data.status === 'PROCESSING' ? 'PAID / PROCESSING' :
             data.status === 'CANCELLED' ? 'CANCELLED' :
             'PENDING PAYMENT'}
          </p>
        </div>
      </div>

      {/* ================= INFO SECTION ================= */}
      <div className="py-3 flex justify-between items-end">
        <div className="w-1/2">
          <h3 className="text-[8px] font-bold uppercase tracking-[0.15em] text-neutral-400 mb-1">Prepared For</h3>
          {data.tax_id ? (
            <>
              <p className="text-sm font-semibold text-neutral-900 mb-0.5">{data.company_name_th || data.company_name_en}</p>
              {data.company_name_th && data.company_name_en && (
                <p className="text-[9px] text-neutral-500 leading-tight mb-0.5">{data.company_name_en}</p>
              )}
              <p className="text-[9px] text-neutral-500 leading-tight max-w-[280px]">{data.company_address || data.shipping_address}</p>
              {data.tax_id && (
                <p className="text-[9px] text-neutral-500 mt-0.5">Tax ID: <span className="text-neutral-900 font-medium">{data.tax_id}</span></p>
              )}
              <p className="text-[9px] text-neutral-500 mt-0.5">Contact: <span className="text-neutral-900">{data.shipping_name || '-'}</span> (Tel: <span className="text-neutral-900">{data.shipping_phone || '-'}</span>)</p>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-neutral-900 mb-0.5">{data.shipping_name || 'ไม่ระบุชื่อลูกค้า'}</p>
              <p className="text-[9px] text-neutral-500 leading-tight max-w-[280px]">{data.shipping_address || 'ไม่ระบุที่อยู่'}</p>
              <p className="text-[9px] text-neutral-500 mt-0.5">Tel: <span className="text-neutral-900">{data.shipping_phone || '-'}</span></p>
            </>
          )}
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
              <th className="pb-2 font-semibold w-8 text-center">#</th>
              <th className="pb-2 font-semibold w-20 text-center">Image</th>
              <th className="pb-2 font-semibold">Description</th>
              <th className="pb-2 font-semibold text-center w-10">Qty</th>
              <th className="pb-2 font-semibold text-right w-16">Price</th>
              <th className="pb-2 font-semibold text-right w-16">VAT (7%)</th>
              <th className="pb-2 font-semibold text-right w-20">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {data.order_items.map((item: any, index: number) => {
              const p = item.products || {};
              const branchStock = p.stock?.find((s: any) => Number(s.branch_id) === Number(item.fulfill_branch_id));
              const currentLiveQty = branchStock ? Number(branchStock.qty) : 0;
              const isOutOfStock = currentLiveQty < item.qty && data.status === 'PENDING';

              const price = item.price_at_sale ?? p.price ?? 0;
              const total = price * item.qty;
              const rowVat = isOutOfStock ? 0 : (total - (total / 1.07));
              const totalWithVat = total;
              const imageUrl = p.image_url || 'https://placehold.co/150x150?text=No+Image';

              // Specs, dimensions & product type
              const rawSub = p.collection_groups?.product_sup || p.specs?.product_sup;
              const productSup = formatProductSup(rawSub);
              const material = p.specs?.material;
              const w = p.width_cm ?? p.specs?.width_cm;
              const d = p.length_cm ?? p.specs?.length_cm;
              const h = p.thickness_cm ?? p.specs?.thickness_cm;
              const sizeStr = (w || d || h) ? `W${w || '-'} x D${d || '-'} x H${h || '-'} cm` : null;

              return (
                <tr key={item.id} className={`group ${isOutOfStock ? 'opacity-50 grayscale' : ''}`}>
                  <td className="py-1.5 text-center text-neutral-300 text-[9px] align-middle">{index + 1}</td>
                  <td className="py-1.5 text-center align-middle w-20">
                    <div className="w-13 h-13 bg-[#F8F8F8] border border-neutral-200 rounded-lg overflow-hidden mx-auto relative flex items-center justify-center p-0.5">
                      <img 
                        src={imageUrl} 
                        alt={p.name || item.name} 
                        className="max-w-full max-h-full object-contain mix-blend-multiply"
                      />
                    </div>
                  </td>
                  <td className="py-1.5 px-2 align-middle">
                    <p className={`text-[11.5px] font-semibold leading-tight ${isOutOfStock ? 'text-neutral-400 line-through' : 'text-neutral-900'}`}>
                      {p.name || item.name}
                    </p>
                    <div className="text-[8px] text-neutral-500 mt-0.5 leading-normal font-normal">
                      <p>
                        <span className="text-neutral-400">SKU:</span> {p.sku || item.sku || '-'}
                        {productSup && productSup !== '-' && (
                          <>
                            <span className="text-neutral-300 mx-1.5">•</span>
                            <span className="text-neutral-400">ชนิด:</span> {productSup}
                          </>
                        )}
                        {sizeStr && (
                          <>
                            <span className="text-neutral-300 mx-1.5">•</span>
                            <span className="text-neutral-400">ขนาด:</span> {sizeStr}
                          </>
                        )}
                        {material && (
                          <>
                            <span className="text-neutral-300 mx-1.5">•</span>
                            <span className="text-neutral-400">วัสดุ:</span> {material}
                          </>
                        )}
                      </p>
                      {item.branches?.branch_name && !isOutOfStock && (
                        <p className="text-[7.5px] text-neutral-400 mt-0.5">
                          Fulfill by: {item.branches.branch_name}
                        </p>
                      )}
                      {isOutOfStock && (
                        <p className="text-[7.5px] font-bold text-red-500 uppercase tracking-wide mt-0.5">
                          Out of Stock
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="py-1.5 text-center align-middle text-[10px] text-neutral-600">
                    {isOutOfStock ? <span className="line-through">{item.qty}</span> : item.qty}
                  </td>
                  <td className="py-1.5 text-right align-middle text-[10px] text-neutral-600">
                    {isOutOfStock ? '-' : (price / 1.07).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-1.5 text-right align-middle text-[10px] text-neutral-600">
                    {isOutOfStock ? '-' : rowVat.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-1.5 text-right align-middle text-[11px] font-semibold text-neutral-800">
                    {isOutOfStock ? (
                      <span className="text-red-500 font-bold">0.00</span>
                    ) : (
                      totalWithVat.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* ================= FOOTER SECTION ================= */}
      <div className="mt-auto break-inside-avoid print:break-inside-avoid">
        <div className="flex justify-between items-start pt-2 border-t border-neutral-200">
          <div className="w-1/2 pr-6 mt-0.5">
            <h3 className="text-[8px] font-bold uppercase tracking-[0.15em] text-neutral-400 mb-1">Terms & Conditions</h3>
            <p className="text-[7.5px] text-neutral-500 leading-tight">
              1. ใบเสนอราคานี้มีผล 30 วันนับจากวันที่ออกเอกสาร<br/>
              2. กรุณาตรวจสอบรายการสินค้าให้ถูกต้องก่อนยืนยันการสั่งซื้อ<br/>
              3. สินค้าซื้อแล้วไม่รับเปลี่ยนหรือคืน ยกเว้นกรณีชำรุดจากการผลิต
            </p>
          </div>
          <div className="w-56">
            {totalSpecialDiscount !== 0 ? (
              <>
                <div className="flex justify-between py-0.5 text-[9px] text-neutral-500">
                  <span>Subtotal</span>
                  <span>{subtotal.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className={`flex justify-between py-0.5 text-[9px] ${totalSpecialDiscount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  <span>{totalSpecialDiscount > 0 ? 'Special Discount' : 'Rounding Surcharge'}</span>
                  <span>{totalSpecialDiscount > 0 ? '-' : '+'} {Math.abs(totalSpecialDiscount).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between py-0.5 text-[9px] text-neutral-500 border-t border-neutral-100">
                  <span>Subtotal (Before VAT)</span>
                  <span>{subTotalWithoutVat.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between py-0.5 text-[9px] text-neutral-500">
                <span>Subtotal (Before VAT)</span>
                <span>{subTotalWithoutVat.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            )}
            <div className="flex justify-between py-0.5 text-[9px] text-neutral-500">
              <span>VAT (7%)</span>
              <span>{vatAmount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between py-1.5 mt-0.5 border-t border-neutral-900">
              <span className="text-[10px] font-bold text-neutral-900 uppercase tracking-widest mt-0.5">Total (THB)</span>
              <span className="text-base font-bold text-neutral-900">{grandTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-12 text-center mt-3.5">
          <div>
            <div className="h-5 border-b border-neutral-300 w-full mb-1"></div>
            <p className="font-medium text-neutral-900 text-[8px] uppercase tracking-wider">Authorized Signature</p>
            <p className="text-neutral-400 text-[7px] mt-0.5">Terra Home Studio</p>
          </div>
          <div>
            <div className="h-5 border-b border-neutral-300 w-full mb-1"></div>
            <p className="font-medium text-neutral-900 text-[8px] uppercase tracking-wider">Accepted By</p>
            <p className="text-neutral-600 font-bold text-[7px] mt-0.5">{data?.profiles?.full_name || 'Customer / Client'}</p>
          </div>
        </div>

        <div className="text-center mt-2.5 text-[7px] text-neutral-300 uppercase tracking-widest">
          Thank you for your business
        </div>
      </div>
    </div>
  )
}
