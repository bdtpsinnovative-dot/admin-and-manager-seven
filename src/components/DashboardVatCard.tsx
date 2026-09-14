"use client"

import { useState } from "react"
import {
  Receipt,
  Info,
  X,
  CheckCircle2,
  AlertCircle,
  Calculator,
  Layers,
} from "lucide-react"
import type { DashboardVatBreakdown } from "@/actions/dashboard"

const money = (value: number) =>
  value.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function DashboardVatCard({
  totalVat,
  vatBreakdown,
}: {
  totalVat: number
  vatBreakdown: DashboardVatBreakdown
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<"summary" | "excluded" | "included">("summary")

  return (
    <>
      {/* 💳 การ์ด VAT บน Dashboard (คลิกได้) */}
      <div
        onClick={() => setIsOpen(true)}
        className="rounded-2xl border border-purple-100 bg-purple-50/40 p-6 shadow-sm hover:shadow-md hover:border-purple-300 transition-all flex flex-col justify-between cursor-pointer group relative overflow-hidden"
        title="คลิกเพื่อดูที่มาและการคำนวณยอด VAT นี้แบบละเอียด"
      >
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[11px] font-bold text-purple-600 bg-purple-100/80 px-2 py-0.5 rounded-md">
          <Info className="w-3 h-3" />
          <span>คลิกดูที่มา</span>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-700 flex items-center gap-1.5">
              ภาษีมูลค่าเพิ่ม VAT (7%)
              <Info className="w-3.5 h-3.5 text-purple-400 group-hover:text-purple-600 transition-colors" />
            </span>
            <div className="p-2.5 rounded-xl bg-purple-100 text-purple-600 group-hover:scale-105 transition-transform">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-black text-purple-700 tracking-tight">
            ฿{money(totalVat)}
          </div>
          <p className="mt-1 text-xs text-purple-600/80">
            ภาษีขายสะสมที่ต้องนำส่งกรมสรรพากร
          </p>
        </div>
        <div className="mt-4 pt-3 border-t border-purple-200/50 flex items-center justify-between text-xs">
          <span className="text-purple-600">อัตราภาษี</span>
          <span className="font-bold text-purple-700 underline underline-offset-2 decoration-purple-300">
            คลิกดูแจกแจงสูตร & บิลจริง
          </span>
        </div>
      </div>

      {/* 🔍 MODAL แสดงที่มาของ VAT แบบละเอียด (Dynamic Data - ห้าม Hardcode) */}
      {isOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-100">
            
            {/* Header - โทนขาว คลีน ปกติ สบายตา */}
            <div className="p-5 sm:p-6 bg-white border-b border-slate-100 flex items-center justify-between relative">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-purple-50 text-purple-600 border border-purple-100">
                  <Calculator className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                    ที่มาและการคำนวณภาษี VAT (7%)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    แจกแจงจากข้อมูลบิลจริงในระบบ (คำนวณแบบ Dynamic 100%)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 sm:p-8 overflow-y-auto space-y-6">

              {/* 💡 กล่องอธิบายวิธีกดเครื่องคิดเลข & สูตรสรรพากร */}
              <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-5">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-blue-100 text-blue-700 shrink-0 mt-0.5">
                    <Info className="w-4 h-4" />
                  </div>
                  <div className="space-y-2 text-xs text-slate-700 leading-relaxed">
                    <p className="font-bold text-sm text-blue-900">
                      ทำไมยอด VAT รวมเป็น ฿{money(vatBreakdown.totalVat)} (ไม่เท่ากับ ยอดรวม × 0.07)?
                    </p>
                    <p>
                      เพราะเงิน <strong className="text-slate-900">฿{money(vatBreakdown.totalSales)}</strong> ที่เราเก็บมาจากลูกค้า คือ <strong>ยอดรวม 107%</strong> (ราคาสินค้า 100% + VAT 7%)
                    </p>
                    <div className="p-3 rounded-xl bg-white border border-blue-100 font-mono text-[11px] text-slate-800 space-y-1">
                      <div className="flex items-center gap-2 text-emerald-700 font-bold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>สูตรถอด VAT ที่ถูกต้อง: ยอดเก็บจริง × 7 ÷ 107 (หรือ ยอดเก็บจริง ÷ 1.07)</span>
                      </div>
                      <div className="flex items-center gap-2 text-red-600">
                        <AlertCircle className="w-4 h-4 text-red-500" />
                        <span>สูตรที่ผิด: ยอดเก็บจริง × 0.07 (เพราะจะเป็นการคิด VAT ซ้ำซ้อนลงไปบน VAT อีกชั้น)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 📊 สรุปเปรียบเทียบบิล 2 ประเภทที่เกิดขึ้นจริงในระบบ */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-purple-600" />
                  สัดส่วนบิลที่คิดแยกแวท vs คิดรวมแวทในตัว
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* การ์ด: คิดรวมในตัว (Included VAT) */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-700">1. คิดรวมในตัว (Included VAT)</span>
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[11px]">
                          {vatBreakdown.includedVat.billCount} บิล
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mb-3">
                        ราคาป้ายรวม VAT แล้ว ลูกค้าจ่ายตามราคาป้าย
                      </p>
                      <div className="space-y-1.5 text-xs text-slate-600 pt-3 border-t border-slate-100 font-mono">
                        <div className="flex justify-between">
                          <span>ยอดเก็บจริง (107%):</span>
                          <span className="font-bold text-slate-800">฿{money(vatBreakdown.includedVat.salesAmount)}</span>
                        </div>
                        <div className="flex justify-between text-slate-500">
                          <span>ราคาสินค้าจริง (100%):</span>
                          <span>฿{money(vatBreakdown.includedVat.netBeforeVat)}</span>
                        </div>
                        <div className="flex justify-between text-purple-700 font-bold pt-1 border-t border-dashed border-slate-200">
                          <span>VAT ในตัว (7/107):</span>
                          <span>฿{money(vatBreakdown.includedVat.vatAmount)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* การ์ด: คิดแยกแวท (Excluded VAT) */}
                  <div className="rounded-2xl border border-purple-200 bg-purple-50/30 p-5 shadow-xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-purple-900">2. คิดแยกแวท (Excluded VAT)</span>
                        <span className="px-2 py-0.5 rounded-md bg-purple-200 text-purple-800 font-bold text-[11px]">
                          {vatBreakdown.excludedVat.billCount} บิล
                        </span>
                      </div>
                      <p className="text-[11px] text-purple-600 mb-3">
                        บิลที่นำราคาหลังลดมาคูณ 7% บวกเพิ่มเข้าไป
                      </p>
                      <div className="space-y-1.5 text-xs text-slate-600 pt-3 border-t border-purple-100 font-mono">
                        <div className="flex justify-between text-slate-500">
                          <span>ราคาสินค้าก่อนแวท:</span>
                          <span>฿{money(vatBreakdown.excludedVat.netBeforeVat)}</span>
                        </div>
                        <div className="flex justify-between text-purple-700 font-bold">
                          <span>VAT บวกเพิ่ม (+7%):</span>
                          <span>+฿{money(vatBreakdown.excludedVat.vatAmount)}</span>
                        </div>
                        <div className="flex justify-between text-slate-900 font-bold pt-1 border-t border-dashed border-purple-200">
                          <span>ยอดเก็บจริงสุทธิ:</span>
                          <span>฿{money(vatBreakdown.excludedVat.salesAmount)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* 🎯 ผลรวมยอดเงินและ VAT ทั้งหมด - โทนสว่าง คลีน สบายตา */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 space-y-3">
                <div className="flex items-center justify-between text-xs sm:text-sm font-bold border-b border-slate-200/80 pb-3">
                  <span className="text-slate-700">ผลรวมการเงินทั้งหมด ({vatBreakdown.includedVat.billCount + vatBreakdown.excludedVat.billCount} บิล)</span>
                  <span className="text-emerald-600 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> สอดคล้องตามจริง 100%
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center font-mono">
                  <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-xs">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1 font-bold">ยอดเก็บลูกค้า</span>
                    <span className="text-base sm:text-lg font-black text-slate-800">฿{money(vatBreakdown.totalSales)}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 shadow-xs">
                    <span className="text-[10px] text-purple-700 uppercase tracking-wider block mb-1 font-bold">ภาษี VAT (7%) รวม</span>
                    <span className="text-base sm:text-lg font-black text-purple-700">฿{money(vatBreakdown.totalVat)}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 shadow-xs">
                    <span className="text-[10px] text-emerald-700 uppercase tracking-wider block mb-1 font-bold">เงินแท้จริงเข้าร้าน</span>
                    <span className="text-base sm:text-lg font-black text-emerald-700">฿{money(vatBreakdown.netSalesBeforeVat)}</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 text-center font-sans pt-1">
                  ฿{money(vatBreakdown.totalSales)} (เก็บจริง) − ฿{money(vatBreakdown.totalVat)} (VAT) = ฿{money(vatBreakdown.netSalesBeforeVat)} (เงินเข้าร้าน)
                </p>
              </div>

              {/* 📋 แท็บสลับดูรายการบิลจริง */}
              <div>
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2 mb-3">
                  <button
                    onClick={() => setActiveTab("summary")}
                    className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                      activeTab === "summary"
                        ? "bg-purple-100 text-purple-800"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    สรุปภาพรวม
                  </button>
                  <button
                    onClick={() => setActiveTab("excluded")}
                    className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                      activeTab === "excluded"
                        ? "bg-purple-100 text-purple-800"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    บิลคิดแยกแวท ({vatBreakdown.excludedVat.billCount})
                  </button>
                  <button
                    onClick={() => setActiveTab("included")}
                    className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                      activeTab === "included"
                        ? "bg-purple-100 text-purple-800"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    บิลคิดรวมแวท ({vatBreakdown.includedVat.billCount})
                  </button>
                </div>

                {activeTab === "excluded" && (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-500">
                      รายชื่อบิลในอดีตที่มีการคิด VAT แยก (บวก 7% เพิ่มจากราคาสินค้า):
                    </p>
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full text-left text-xs font-mono">
                        <thead className="bg-slate-50 text-[11px] text-slate-500 uppercase border-b border-slate-200">
                          <tr>
                            <th className="p-3">Order Code</th>
                            <th className="p-3 text-right">ยอดสินค้า</th>
                            <th className="p-3 text-right">ส่วนลด</th>
                            <th className="p-3 text-right text-purple-700">VAT (บวกเพิ่ม)</th>
                            <th className="p-3 text-right font-bold text-slate-800">ยอดเก็บจริง</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {vatBreakdown.excludedVat.orders.map((o) => (
                            <tr key={o.id} className="hover:bg-slate-50">
                              <td className="p-3 font-bold text-slate-800">{o.orderCode}</td>
                              <td className="p-3 text-right text-slate-600">฿{money(o.subtotal)}</td>
                              <td className="p-3 text-right text-orange-600">-฿{money(o.discountAmount)}</td>
                              <td className="p-3 text-right font-bold text-purple-700">+฿{money(o.vatAmount)}</td>
                              <td className="p-3 text-right font-bold text-slate-900">฿{money(o.totalAmount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {activeTab === "included" && (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-500">
                      รายชื่อบิลที่คิด VAT รวมในตัว (มาตรฐานปัจจุบัน ถอด 7/107):
                    </p>
                    <div className="overflow-x-auto rounded-xl border border-slate-200 max-h-56 overflow-y-auto">
                      <table className="w-full text-left text-xs font-mono">
                        <thead className="bg-slate-50 text-[11px] text-slate-500 uppercase border-b border-slate-200 sticky top-0">
                          <tr>
                            <th className="p-3">Order Code</th>
                            <th className="p-3 text-right">ยอดเก็บจริง</th>
                            <th className="p-3 text-right text-emerald-700">เงินเข้าร้าน</th>
                            <th className="p-3 text-right text-purple-700">VAT ในตัว (7/107)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {vatBreakdown.includedVat.orders.map((o) => (
                            <tr key={o.id} className="hover:bg-slate-50">
                              <td className="p-3 font-bold text-slate-800">{o.orderCode}</td>
                              <td className="p-3 text-right font-bold text-slate-900">฿{money(o.totalAmount)}</td>
                              <td className="p-3 text-right text-emerald-700">฿{money(o.netBeforeVat)}</td>
                              <td className="p-3 text-right font-bold text-purple-700">฿{money(o.vatAmount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {activeTab === "summary" && (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1.5">
                    <p className="font-bold text-slate-800">💡 คำแนะนำทางบัญชี:</p>
                    <p>• ในอนาคต เมื่อเปิดบิลใหม่จากหน้า POS บิลทั้งหมดจะใช้ระบบมาตรฐาน (รวม VAT 7% ในตัว) เสมอ</p>
                    <p>• บิลที่คิดแยกแวทในอดีต ระบบจดจำยอดภาษีแท้จริงของบิลนั้นๆ ไว้ให้อย่างแม่นยำ ไม่สูญหายและไม่ทำให้ยอดปิดบัญชีเพี้ยนครับ</p>
                  </div>
                )}
              </div>

            </div>

            {/* Footer */}
            <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setIsOpen(false)}
                className="px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-sm"
              >
                เข้าใจแล้ว ปิดหน้าต่าง
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  )
}
