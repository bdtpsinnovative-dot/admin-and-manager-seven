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

  // 🎟️ แยกประเภทส่วนลดจาก discount_snapshot และฐานข้อมูล
  const snapshot = data?.discount_snapshot;

  // ข้อมูลพนักงานขาย / เซลล์ (Salesperson)
  // ✨ ดึงจาก Profile ของบัญชีที่ "ออกบิล" (orders.user_id -> profiles) เป็นหลัก
  // ลำดับความสำคัญ:
  // 1. ตรวจสอบชื่อเฉพาะที่ระบุแก้ไขในเอกสาร (snapshot.salesperson_name) ที่ไม่ใช่ชื่อจากโค้ดส่วนลด
  // 2. ดึงจาก Profile ของบัญชีคนที่ออกบิล (data?.profiles?.full_name และ data?.profiles?.phone)
  // 3. ไม่ดึงชื่อจากโค้ดส่วนลด (coupon.lead_sales) มาแสดงเป็นผู้ลงนาม/คนขายเด็ดขาด
  const issuerProfileName = data?.profiles?.full_name?.trim() || null;
  const issuerProfilePhone = data?.profiles?.phone?.trim() || null;

  const rawSnapshotName = snapshot?.salesperson_name?.trim() || null;
  const isCouponLead = Boolean(
    rawSnapshotName &&
    snapshot?.coupon?.lead_sales &&
    rawSnapshotName.toLowerCase() === snapshot.coupon.lead_sales.trim().toLowerCase()
  );
  const customSalesName = isCouponLead ? null : rawSnapshotName;

  const salespersonName = customSalesName || issuerProfileName || null;
  const salespersonPhone = snapshot?.salesperson_phone?.trim() || issuerProfilePhone || null;

  // 1. ส่วนลดคูปอง (Coupon Discount)
  const couponObj = snapshot?.coupon;
  const couponCode = couponObj?.code || null;
  const couponDiscountAmount = Number(couponObj?.discount_amount || 0);

  // 2. ส่วนลดเซ็ตโปรโมชั่น (Set Promotion Discount)
  const setDiscountAmount = Number(snapshot?.set_discount_amount || 0);

  // 3. ส่วนลดพิเศษท้ายบิล (Special Discount / Rounding Adjustment)
  const specialPercent = Number(data?.special_discount_percent ?? snapshot?.special_discount?.percent ?? 0);
  const specialBaht = Number(data?.special_discount_baht ?? snapshot?.special_discount?.baht ?? 0);

  let specialDiscountAmount = 0;
  if (specialPercent > 0 || specialBaht !== 0) {
    if (specialPercent > 0) {
      const baseBeforeSpecial = Math.max(0, subtotal - (totalSpecialDiscount - specialBaht));
      const afterBaht = Math.max(0, baseBeforeSpecial - specialBaht);
      specialDiscountAmount = specialBaht + (afterBaht * (specialPercent / 100));
    } else {
      specialDiscountAmount = specialBaht;
    }
  }

  // 4. ส่วนลดสินค้า / โปรโมชั่นระดับสินค้า (Item / Promotion Discount)
  let itemPromotionDiscount = Math.max(
    0,
    Math.round((totalSpecialDiscount - couponDiscountAmount - setDiscountAmount - specialDiscountAmount) * 100) / 100
  );

  // Fallback สำหรับบิลเก่าที่ไม่มี snapshot แยกประเภท
  if (
    couponDiscountAmount === 0 &&
    setDiscountAmount === 0 &&
    itemPromotionDiscount === 0 &&
    specialDiscountAmount === 0 &&
    totalSpecialDiscount > 0
  ) {
    specialDiscountAmount = totalSpecialDiscount;
  }

  const netGoodsPrice = Math.max(0, subtotal - totalSpecialDiscount);
  const isOrderEligibleOver20k = netGoodsPrice >= 20000;
  const shippingCost = Number(data?.discount_snapshot?.shipping_cost || 0);
  const shippingWaived = Boolean(data?.discount_snapshot?.shipping_waived && isOrderEligibleOver20k);
  const shippingCharged = shippingWaived ? 0 : shippingCost;
  const grandTotal = grandTotalFromDb ?? Math.max(0, netGoodsPrice + shippingCharged);

  const vatAmountFromDb = data?.vat_amount !== undefined && data?.vat_amount !== null && Number(data.vat_amount) > 0
    ? Number(data.vat_amount)
    : null;

  const vatAmount = vatAmountFromDb ?? (grandTotal - (grandTotal / 1.07));
  const subTotalWithoutVat = grandTotal - vatAmount;

  // 🪵 ตรวจสอบว่าเป็นบิลไม้แผ่นสแลป (Wood Slabs / ZENSLABS) เท่านั้น (ไม่รวมพรอพที่มีคำว่า Wood/ไม้ ในชื่อสินค้า)
  const isSlabDoc = Boolean(data?.discount_snapshot?.is_slab_order) || Boolean(data?.order_items?.some((item: any) => {
    const cat = (item.products?.category_id || '').toUpperCase().trim();
    const sku = (item.products?.sku || '').toUpperCase().trim();
    const isSlabItem = Boolean(item.isSlab || item.products?.isSlab);
    return (
      isSlabItem ||
      cat === 'SLABS' ||
      sku.startsWith('ZLB-') ||
      sku.startsWith('WOODSLABS') ||
      sku.startsWith('LEG-')
    );
  }));

  const woodPermitFee = isSlabDoc
    ? (data?.discount_snapshot?.wood_permit_fee !== undefined
        ? Number(data.discount_snapshot.wood_permit_fee)
        : (data?.wood_permit_fee !== undefined && data?.wood_permit_fee !== null
            ? Number(data.wood_permit_fee)
            : 5000))
    : 0;

  const depositPercent = isSlabDoc
    ? Number(data?.deposit_percent ?? data?.discount_snapshot?.deposit_percent ?? 50)
    : 100;

  // ถ้ายอด total_amount จากฐานข้อมูลถูกบันทึกมาจากหน้า POS ที่มี is_slab_order แล้ว ยอดนั้นจะรวมค่าใบกำกับไม้ 5,000 ไว้แล้ว
  const dbAlreadyIncludesPermit = Boolean(data?.discount_snapshot?.is_slab_order && grandTotalFromDb !== null);
  const goodsTotalWithVat = isSlabDoc && dbAlreadyIncludesPermit
    ? Math.max(0, grandTotal - woodPermitFee - shippingCharged)
    : grandTotal;
  const finalGrandTotal = isSlabDoc
    ? (dbAlreadyIncludesPermit ? grandTotal : (grandTotal + woodPermitFee))
    : grandTotal;

  const savedDepositAmount = Number(data?.discount_snapshot?.deposit_amount || 0);
  const depositAmount = isSlabDoc
    ? (savedDepositAmount > 0 && savedDepositAmount <= finalGrandTotal
        ? savedDepositAmount
        : Math.round(finalGrandTotal * (depositPercent / 100) * 100) / 100)
    : finalGrandTotal;
  const remainingBalance = isSlabDoc ? Math.max(0, Math.round((finalGrandTotal - depositAmount) * 100) / 100) : 0;

  // โลโก้หัวบิล: แสดง ZENSLAB เฉพาะเมื่อมีสินค้าหมวดแผ่นไม้ ZENSLABS ในบิลเท่านั้น นอกนั้นเป็น TERRA HOME STUDIO
  const isZenslabDoc = isSlabDoc;

  const logoSrc = isZenslabDoc ? '/logo.zenslab.png' : '/logo.terra.home.png';
  const logoAlt = isZenslabDoc ? 'ZENSLAB Logo' : 'Terra Home Studio Logo';

  return (
    <div 
      id="print-section" 
      className={`bg-white text-neutral-900 flex flex-col justify-between ${className}`}
    >
      {/* 🛑 CSS ดักการตัดหน้าสำหรับใบเสนอราคา/ใบเสร็จ A4 (WebKit / iOS Safari / iPad / Chrome) */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          #print-section {
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            position: static !important;
            box-sizing: border-box !important;
            width: 100% !important;
            max-width: 210mm !important;
            min-height: 297mm !important;
            padding: 8mm 10mm !important;
            margin: 0 auto !important;
            overflow: visible !important;
            background: white !important;
          }
          #print-section table {
            border-collapse: separate !important;
            border-spacing: 0 !important;
            width: 100% !important;
          }
          #print-section thead {
            display: table-header-group !important;
          }
          #print-section tbody {
            display: table-row-group !important;
          }
          #print-section tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            -webkit-column-break-inside: avoid !important;
          }
          #print-section td, #print-section th {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            -webkit-column-break-inside: avoid !important;
          }
          #print-section .break-inside-avoid {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            -webkit-column-break-inside: avoid !important;
          }
        }
      `}} />
      {/* ================= HEADER SECTION ================= */}
      <div className="flex justify-between items-start pb-3 border-b border-neutral-200">
        <div>
          {logoError ? (
            <h1 className="text-2xl font-black tracking-tighter text-neutral-900 flex flex-col leading-none mb-2">
              {isZenslabDoc ? (
                'ZENSLAB'
              ) : (
                <>TERRA <span className="font-light tracking-wide text-sm text-neutral-500 mt-0.5">HOME STUDIO</span></>
              )}
            </h1>
          ) : (
            <img 
              src={logoSrc} 
              alt={logoAlt} 
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
            {data.status === 'PENDING'
              ? 'Quote'
              : ((data.tax_id || data.company_name_th || data.discount_snapshot?.customer_type === 'CORPORATE')
                  ? 'Tax Invoice / Receipt'
                  : 'Receipt')}
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
          {(data.tax_id || data.company_name_th || data.company_name_en || data.discount_snapshot?.customer_type === 'CORPORATE') ? (
            <>
              <p className="text-sm font-semibold text-neutral-900 mb-0.5">
                {data.company_name_th || data.company_name_en || data.shipping_name}
                {data.discount_snapshot?.branch_type === 'HEAD_OFFICE' ? ' (สำนักงานใหญ่)' : 
                 data.discount_snapshot?.branch_type === 'BRANCH' ? ` (สาขา: ${data.discount_snapshot?.branch_code || '-'})` : ''}
              </p>
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
                <td className="pr-3 pb-1 text-right font-medium text-neutral-400">Valid Until</td>
                <td className="font-semibold text-neutral-900 pb-1">30 Days</td>
              </tr>
              {salespersonName && (
                <tr>
                  <td className="pr-3 text-right font-medium text-neutral-400">Salesperson</td>
                  <td className="font-semibold text-neutral-900">
                    {salespersonName}
                    {salespersonPhone && <span className="font-normal text-neutral-500 ml-1">({salespersonPhone})</span>}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {data.status === 'CANCELLED' && (
        <div className="mb-3 p-2 bg-rose-50 border border-rose-200 rounded text-rose-700 text-[9px] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold bg-rose-600 text-white text-[8px] px-1.5 py-0.5 rounded">ยกเลิกแล้ว</span>
            {data?.discount_snapshot?.cancel_reason ? (
              <span><strong className="text-rose-900">เหตุผล:</strong> {data.discount_snapshot.cancel_reason}</span>
            ) : (
              <span className="text-rose-500 italic">ไม่ได้ระบุเหตุผลการยกเลิก</span>
            )}
          </div>
          {data?.discount_snapshot?.cancelled_at && (
            <span className="text-[8px] text-rose-400">
              {new Date(data.discount_snapshot.cancelled_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      )}

      {/* ================= ITEMS TABLE ================= */}
      <div className="mb-2 flex-1 flex flex-col">
        <table className="w-full text-left" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
          <thead>
            <tr className="border-b border-neutral-200 text-[8px] uppercase tracking-[0.1em] text-neutral-400">
              <th className="pb-2 font-semibold w-8 text-center border-b border-neutral-200">#</th>
              <th className="pb-2 font-semibold w-20 text-center border-b border-neutral-200">Image</th>
              <th className="pb-2 font-semibold border-b border-neutral-200">Description</th>
              <th className="pb-2 font-semibold text-center w-10 border-b border-neutral-200">Qty</th>
              <th className="pb-2 font-semibold text-right w-16 border-b border-neutral-200">Price</th>
              <th className="pb-2 font-semibold text-right w-16 border-b border-neutral-200">VAT (7%)</th>
              <th className="pb-2 font-semibold text-right w-20 border-b border-neutral-200">Amount</th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              const outOfStockSnapshot = (data?.discount_snapshot?.out_of_stock_products || []).map(String);
              const isWholeOrderPreOrder = Boolean(data?.discount_snapshot?.is_preorder);

              return data.order_items.map((item: any, index: number) => {
                const p = item.products || {};
                const branchStock = p.stock?.find((s: any) => Number(s.branch_id) === Number(item.fulfill_branch_id));
                const currentLiveQty = branchStock ? Number(branchStock.qty) : 0;
                const prodId = String(item.product_id || p.id || '');
                const isRecordedPreOrder = prodId ? outOfStockSnapshot.includes(prodId) : false;

                // ตรวจสอบสถานะพรีออเดอร์:
                // 1) หากบิลยังรอชำระ (PENDING): เช็คจาก snapshot ที่ระบบบันทึกไว้ หรือหากสต็อกสดไม่พอขาย
                // 2) หากบิลชำระเงิน/ตัดสต็อกไปแล้ว (PROCESSING / COMPLETED): เช็คจาก snapshot ที่บันทึกไว้ตอนเปิดบิล
                //    หรือเช็คว่าสต็อกติดลบ (< 0) เท่านั้น (ถ้าสต็อกเหลือ 0 จากการขายชิ้นสุดท้าย จะไม่ถือเป็นพรีออเดอร์)
                const isPreOrder = data.status === 'PENDING'
                  ? (isRecordedPreOrder || (isWholeOrderPreOrder && outOfStockSnapshot.length === 0) || currentLiveQty < item.qty)
                  : (isRecordedPreOrder || (isWholeOrderPreOrder && outOfStockSnapshot.length === 0) || currentLiveQty < 0);


              const price = item.price_at_sale ?? p.price ?? 0;
              const total = price * item.qty;
              const rowVat = total - (total / 1.07);
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
                <tr 
                  key={item.id} 
                  className="group break-inside-avoid print:break-inside-avoid"
                  style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
                >
                  <td className="py-1.5 border-b border-neutral-100 text-center text-neutral-300 text-[9px] align-middle">{index + 1}</td>
                  <td className="py-1.5 border-b border-neutral-100 text-center align-middle w-20">
                    <div className="w-13 h-13 bg-[#F8F8F8] border border-neutral-200 rounded-lg overflow-hidden mx-auto relative flex items-center justify-center p-0.5">
                      <img 
                        src={imageUrl} 
                        alt={p.name || item.name} 
                        className="max-w-full max-h-full object-contain mix-blend-multiply"
                      />
                    </div>
                  </td>
                  <td className="py-1.5 border-b border-neutral-100 px-2 align-middle">
                    <div className="break-inside-avoid" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                      <p className="text-[11.5px] font-semibold leading-tight text-neutral-900">
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
                        {isPreOrder ? (
                          <p className="text-[7.5px] font-medium text-amber-700 mt-0.5">
                            พรีออเดอร์ (Pre-order){item.branches?.branch_name ? ` • คลัง: ${item.branches.branch_name}` : ''}
                          </p>
                        ) : item.branches?.branch_name ? (
                          <p className="text-[7.5px] text-neutral-400 mt-0.5">
                            Fulfill by: {item.branches.branch_name}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td className="py-1.5 border-b border-neutral-100 text-center align-middle text-[10px] text-neutral-600">
                    {item.qty}
                  </td>
                  <td className="py-1.5 border-b border-neutral-100 text-right align-middle text-[10px] text-neutral-600">
                    {(price / 1.07).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-1.5 border-b border-neutral-100 text-right align-middle text-[10px] text-neutral-600">
                    {rowVat.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-2 border-b border-neutral-100 text-right align-middle text-[11px] font-semibold text-neutral-800">
                    {totalWithVat.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              )
            })
          })()}
          </tbody>
        </table>
      </div>

      {/* ================= FOOTER SECTION ================= */}
      <div 
        className="mt-auto pt-6 break-inside-avoid print:break-inside-avoid"
        style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
      >
        {isSlabDoc ? (
          <div>
            <div className="flex justify-between items-start gap-6 pt-3 border-t border-neutral-200">
              {/* Left: Terms & Conditions + Signatures */}
              <div className="flex-1 pr-4">
                <h3 className="text-[8px] font-bold uppercase tracking-[0.15em] text-neutral-400 mb-1">Terms & Conditions</h3>
                <p className="text-[7.5px] text-neutral-500 leading-tight mb-4">
                  1. ใบเสนอราคานี้มีผล 30 วันนับจากวันที่ออกเอกสาร<br/>
                  2. กรุณาตรวจสอบรายการสินค้าให้ถูกต้องก่อนยืนยันการสั่งซื้อ<br/>
                  3. สินค้าซื้อแล้วไม่รับเปลี่ยนหรือคืน ยกเว้นกรณีชำรุดจากการผลิต<br/>
                  4. สินค้าแผ่นไม้เป็นสินค้าเฉพาะตัว (One of a kind) ยืนยันการจองสต็อกเมื่อชำระเงินมัดจำ {depositPercent}% เรียบร้อยแล้ว
                </p>

                <div className="grid grid-cols-2 gap-8 text-center mt-6">
                  <div>
                    <div className="h-6 border-b border-neutral-300 w-full mb-1"></div>
                    <p className="font-medium text-neutral-900 text-[8px] uppercase tracking-wider">Authorized Signature</p>
                    <p className="text-neutral-700 font-bold text-[7.5px] mt-0.5">
                      {salespersonName || 'ผู้มีอำนาจลงนาม / พนักงานขาย'}
                    </p>
                    {salespersonPhone && (
                      <p className="text-neutral-500 text-[7px]">โทร: {salespersonPhone}</p>
                    )}
                    <p className="text-neutral-400 text-[6.5px]">ทีพีเอส การ์เด้น เฟอร์นิเจอร์ จำกัด</p>
                  </div>
                  <div>
                    <div className="h-6 border-b border-neutral-300 w-full mb-1"></div>
                    <p className="font-medium text-neutral-900 text-[8px] uppercase tracking-wider">Accepted By (ลูกค้า)</p>
                    <p className="text-neutral-700 font-bold text-[7.5px] mt-0.5">{data?.company_name_th || data?.shipping_name || 'Customer / Client'}</p>
                  </div>
                </div>
              </div>

              {/* Right: Slab Special Summary Table */}
              <div className="w-[330px]">
                <table className="w-full text-[9px] border-collapse border border-neutral-300">
                  <tbody>
                    {totalSpecialDiscount > 0 && (
                      <>
                        <tr className="border-b border-neutral-300">
                          <td className="py-1 px-2.5 font-medium text-neutral-700">Subtotal (ราคาสินค้ารวม)</td>
                          <td className="py-1 px-2.5 text-right font-mono font-semibold text-neutral-900 w-32">
                            {subtotal.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                        {itemPromotionDiscount > 0 && (
                          <tr className="border-b border-neutral-300 text-red-600">
                            <td className="py-1 px-2.5 font-medium">ส่วนลดสินค้า / โปรโมชั่น</td>
                            <td className="py-1 px-2.5 text-right font-mono font-semibold">
                              - {itemPromotionDiscount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        )}
                        {setDiscountAmount > 0 && (
                          <tr className="border-b border-neutral-300 text-red-600">
                            <td className="py-1 px-2.5 font-medium">ส่วนลดเซ็ตโปรโมชั่น</td>
                            <td className="py-1 px-2.5 text-right font-mono font-semibold">
                              - {setDiscountAmount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        )}
                        {couponDiscountAmount > 0 && (
                          <tr className="border-b border-neutral-300 text-red-600">
                            <td className="py-1 px-2.5 font-medium">ส่วนลดคูปอง {couponCode ? `(${couponCode})` : ''}</td>
                            <td className="py-1 px-2.5 text-right font-mono font-semibold">
                              - {couponDiscountAmount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        )}
                        {specialDiscountAmount !== 0 && (
                          <tr className={`border-b border-neutral-300 ${specialDiscountAmount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                            <td className="py-1 px-2.5 font-medium">
                              {specialDiscountAmount > 0 
                                ? `ส่วนลดพิเศษท้ายบิล${specialPercent > 0 ? ` (${specialPercent}%)` : ''}` 
                                : 'ยอดปัดเศษ'}
                            </td>
                            <td className="py-1 px-2.5 text-right font-mono font-semibold">
                              {specialDiscountAmount > 0 ? '-' : '+'} {Math.abs(specialDiscountAmount).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        )}
                      </>
                    )}
                    <tr className="border-b border-neutral-300">
                      <td className="py-1 px-2.5 font-medium text-neutral-700">Total (ราคารวมก่อน VAT)</td>
                      <td className="py-1 px-2.5 text-right font-mono font-semibold text-neutral-900 w-32">
                        {subTotalWithoutVat.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr className="bg-[#B4A5D9]/40 border-b border-neutral-300 h-2">
                      <td colSpan={2} className="py-0 px-0"></td>
                    </tr>
                    <tr className="border-b border-neutral-300">
                      <td className="py-1 px-2.5 font-medium text-neutral-700">Total (ราคารวมก่อน VAT)</td>
                      <td className="py-1 px-2.5 text-right font-mono font-semibold text-neutral-900">
                        {subTotalWithoutVat.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr className="border-b border-neutral-300">
                      <td className="py-1 px-2.5 font-medium text-neutral-700">ภาษีมูลค่าเพิ่ม VAT 7%</td>
                      <td className="py-1 px-2.5 text-right font-mono font-semibold text-neutral-900">
                        {vatAmount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr className="border-b border-neutral-300">
                      <td className="py-1 px-2.5 font-medium text-neutral-700">ราคา(สินค้า)ทั้งหมด รวมภาษี</td>
                      <td className="py-1 px-2.5 text-right font-mono font-semibold text-neutral-900">
                        {goodsTotalWithVat.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr className="border-b border-neutral-300">
                      <td className="py-1 px-2.5 font-medium text-neutral-700">ค่าขนส่งสินค้า</td>
                      <td className="py-1 px-2.5 text-right font-mono font-semibold text-neutral-900">
                        {shippingCost > 0 ? shippingCost.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                      </td>
                    </tr>
                    <tr className="border-b border-neutral-300">
                      <td className="py-1 px-2.5 font-medium text-neutral-700">ค่าใบกำกับไม้</td>
                      <td className="py-1 px-2.5 text-right font-mono font-semibold text-neutral-900">
                        {woodPermitFee > 0 ? woodPermitFee.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                      </td>
                    </tr>
                    <tr className="bg-[#FDE047] border-y-2 border-neutral-900 font-bold">
                      <td className="py-1.5 px-2.5 text-[10px] text-neutral-900">Grand Total</td>
                      <td className="py-1.5 px-2.5 text-right font-mono text-[11px] text-neutral-900">
                        {finalGrandTotal.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr className="border-b border-neutral-300">
                      <td className="py-1 px-2.5 font-medium text-neutral-700">
                        <div className="flex items-center justify-between">
                          <span>ยอดเปอร์เซ็นการมัดจำ</span>
                          <span className="bg-[#B4A5D9] text-[#2E1065] text-[8.5px] font-bold px-2 py-0.5 rounded">
                            {depositPercent}%
                          </span>
                        </div>
                      </td>
                      <td className="py-1 px-2.5 text-right font-mono font-bold text-neutral-900">
                        {depositAmount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr className="border-b border-neutral-300">
                      <td className="py-1 px-2.5 font-medium text-neutral-700">ยอดส่วนต่างที่เหลือ</td>
                      <td className="py-1 px-2.5 text-right font-mono font-bold text-neutral-900">
                        {remainingBalance.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Bank Account Info Box (Purple Box) */}
                <div className="mt-2.5 bg-[#B4A5D9]/50 border border-[#9884C6] p-2.5 rounded text-center text-[#2E1065]">
                  <p className="text-[8.5px] font-bold">กรุณาโอนเข้าบัญชี:</p>
                  <p className="text-[9.5px] font-bold mt-0.5">ชื่อบัญชี : ทีพีเอส การ์เด้น เฟอร์นิเจอร์ จำกัด</p>
                  <p className="text-[8.5px] font-medium mt-0.5">ธนาคารกสิกรไทย สาขา บางโพ</p>
                  <p className="text-[9.5px] font-bold mt-0.5 font-mono">เลขที่บัญชี : 033 1 08813 7 (กระแสรายวัน)</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex justify-between items-start pt-3 border-t border-neutral-200">
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

                    {/* 1. ส่วนลดสินค้า / โปรโมชั่นระดับสินค้า */}
                    {itemPromotionDiscount > 0 && (
                      <div className="flex justify-between py-0.5 text-[9px] text-red-600">
                        <span>Item / Promotion Discount</span>
                        <span>- {itemPromotionDiscount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    )}

                    {/* 2. ส่วนลดเซ็ตโปรโมชั่น */}
                    {setDiscountAmount > 0 && (
                      <div className="flex justify-between py-0.5 text-[9px] text-red-600">
                        <span>Set Promotion Discount</span>
                        <span>- {setDiscountAmount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    )}

                    {/* 3. คูปองส่วนลด */}
                    {couponDiscountAmount > 0 && (
                      <div className="flex justify-between py-0.5 text-[9px] text-red-600 font-medium">
                        <span>Coupon Discount {couponCode ? `(${couponCode})` : ''}</span>
                        <span>- {couponDiscountAmount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    )}

                    {/* 4. ส่วนลดพิเศษท้ายบิล / ปัดเศษ */}
                    {specialDiscountAmount !== 0 && (
                      <div className={`flex justify-between py-0.5 text-[9px] ${specialDiscountAmount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                        <span>
                          {specialDiscountAmount > 0 
                            ? `Special Discount${specialPercent > 0 ? ` (${specialPercent}%)` : ''}` 
                            : 'Rounding Adjustment'}
                        </span>
                        <span>
                          {specialDiscountAmount > 0 ? '-' : '+'} {Math.abs(specialDiscountAmount).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}

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
                {shippingCost > 0 && (
                  <>
                    <div className="flex justify-between py-0.5 text-[9px] text-neutral-600 font-medium">
                      <span>Shipping Fee (ค่าจัดส่ง)</span>
                      <span>+{shippingCost.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    {shippingWaived && (
                      <div className="flex justify-between py-0.5 text-[9px] text-emerald-600 font-medium">
                        <span>Shipping Discount (ส่วนลดค่าจัดส่ง ยอดครบ 20,000฿)</span>
                        <span>-{shippingCost.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    )}
                  </>
                )}
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
                <p className="text-neutral-700 font-bold text-[7.5px] mt-0.5">
                  {salespersonName || 'Terra Home Studio'}
                </p>
                {salespersonPhone && (
                  <p className="text-neutral-500 text-[7px]">โทร: {salespersonPhone}</p>
                )}
                <p className="text-neutral-400 text-[6.5px]">Terra Home Studio</p>
              </div>
              <div>
                <div className="h-5 border-b border-neutral-300 w-full mb-1"></div>
                <p className="font-medium text-neutral-900 text-[8px] uppercase tracking-wider">Accepted By</p>
                <p className="text-neutral-700 font-bold text-[7.5px] mt-0.5">{data?.company_name_th || data?.shipping_name || 'Customer / Client'}</p>
              </div>
            </div>
          </div>
        )}

        <div className="text-center mt-3 text-[7px] text-neutral-300 uppercase tracking-widest">
          Thank you for your business
        </div>
      </div>
    </div>
  )
}
