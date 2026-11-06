"use client"

import React, { useState, useEffect } from 'react'
import {
  X, FileText, Calendar, Building2, User, Lock, Loader2, Phone, MapPin, CreditCard, AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'
import { updateOrderQuotation } from '@/actions/sales-check'

interface SaleOrderItem {
  id: number
  qty: number
  priceAtSale: number
  totalItemAmount: number
  productName: string
  productSku: string
  imageUrl: string | null
  fulfillBranchName: string
}

export interface EditQuotationTarget {
  id: number
  orderCode: string
  createdAt: string
  branchName?: string
  shippingName?: string | null
  shippingPhone?: string | null
  shippingAddress?: string | null
  companyNameTh?: string | null
  companyNameEn?: string | null
  companyAddress?: string | null
  taxId?: string | null
  discountSnapshot?: any
  items?: SaleOrderItem[]
  saleName?: string | null
  salePhone?: string | null
}

interface EditQuotationModalProps {
  order: EditQuotationTarget | null
  onClose: () => void
  onSuccess: (updatedData: {
    id: number
    orderCode: string
    createdAt: string
    shippingName: string
    shippingPhone: string
    shippingAddress: string
    companyNameTh: string
    companyNameEn: string
    companyAddress: string
    taxId: string
    discountSnapshot: any
  }) => void
}

export default function EditQuotationModal({ order, onClose, onSuccess }: EditQuotationModalProps) {
  if (!order) return null

  const snapshot = typeof order.discountSnapshot === 'object' && order.discountSnapshot !== null
    ? order.discountSnapshot
    : (() => {
        try {
          return JSON.parse(order.discountSnapshot || '{}')
        } catch {
          return {}
        }
      })()

  // Form states
  const [orderCode, setOrderCode] = useState('')
  const [dateTime, setDateTime] = useState('')
  const [customerType, setCustomerType] = useState<'INDIVIDUAL' | 'CORPORATE'>('INDIVIDUAL')
  const [branchType, setBranchType] = useState<'NONE' | 'HEAD_OFFICE' | 'BRANCH'>('NONE')
  const [branchCode, setBranchCode] = useState('')
  const [shippingName, setShippingName] = useState('')
  const [shippingPhone, setShippingPhone] = useState('')
  const [taxId, setTaxId] = useState('')
  const [companyNameTh, setCompanyNameTh] = useState('')
  const [companyNameEn, setCompanyNameEn] = useState('')
  const [companyAddress, setCompanyAddress] = useState('')
  const [shippingAddress, setShippingAddress] = useState('')
  const [quotationNote, setQuotationNote] = useState('')
  const [salespersonName, setSalespersonName] = useState('')
  const [salespersonPhone, setSalespersonPhone] = useState('')
  const [saving, setSaving] = useState(false)

  // Initialize values when order opens
  useEffect(() => {
    if (order) {
      setOrderCode(order.orderCode || '')
      // Date ISO local string for datetime-local
      const d = new Date(order.createdAt)
      const localIso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
      setDateTime(localIso)

      // Customer type
      setCustomerType(snapshot.customer_type === 'CORPORATE' ? 'CORPORATE' : 'INDIVIDUAL')

      // Branch type
      if (snapshot.branch_type === 'HEAD_OFFICE') {
        setBranchType('HEAD_OFFICE')
      } else if (snapshot.branch_type === 'BRANCH') {
        setBranchType('BRANCH')
      } else {
        setBranchType('NONE')
      }
      setBranchCode(snapshot.branch_code || '')

      // Customer fields
      setShippingName(order.shippingName || '')
      setShippingPhone(order.shippingPhone || '')
      setTaxId(order.taxId || '')
      setCompanyNameTh(order.companyNameTh || '')
      setCompanyNameEn(order.companyNameEn || '')
      setCompanyAddress(order.companyAddress || '')
      setShippingAddress(order.shippingAddress || '')
      setQuotationNote(snapshot.quotation_note || '')

      // ✨ ไม่ดึงจาก coupon.lead_sales เพราะเป็นชื่อของโค้ดส่วนลด ให้ดึงจาก profile ของบัญชีที่ขาย (order.saleName/salePhone)
      const rawSnapName = snapshot.salesperson_name?.trim() || ''
      const isCouponLead = Boolean(
        rawSnapName &&
        snapshot.coupon?.lead_sales &&
        rawSnapName.toLowerCase() === snapshot.coupon.lead_sales.trim().toLowerCase()
      )
      const customName = isCouponLead ? '' : rawSnapName

      setSalespersonName(customName || order.saleName || '')
      setSalespersonPhone(snapshot.salesperson_phone?.trim() || order.salePhone || '')
    }
  }, [order])

  const setQuickYesterday = () => {
    if (!dateTime) return
    const current = new Date(dateTime)
    current.setDate(current.getDate() - 1)
    const localIso = new Date(current.getTime() - current.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
    setDateTime(localIso)
  }

  const setQuickNow = () => {
    const now = new Date()
    const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
    setDateTime(localIso)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanOrderCode = orderCode.trim()
    if (!cleanOrderCode) {
      toast.error('กรุณาระบุเลขที่บิล / เลขที่เอกสาร')
      return
    }

    if (!dateTime) {
      toast.error('กรุณาระบุวันและเวลาของเอกสาร')
      return
    }

    setSaving(true)
    try {
      const selectedDate = new Date(dateTime).toISOString()
      const effectiveBranchType = branchType === 'NONE' ? null : branchType
      const effectiveBranchCode = branchType === 'BRANCH' ? branchCode.trim() : null

      const res = await updateOrderQuotation(order.id, {
        orderCode: cleanOrderCode,
        createdAt: selectedDate,
        shippingName: shippingName.trim(),
        shippingPhone: shippingPhone.trim(),
        shippingAddress: shippingAddress.trim(),
        companyNameTh: companyNameTh.trim(),
        companyNameEn: companyNameEn.trim(),
        companyAddress: companyAddress.trim(),
        taxId: taxId.trim(),
        branchType: effectiveBranchType,
        branchCode: effectiveBranchCode,
        customerType: customerType,
        quotationNote: quotationNote.trim(),
        salespersonName: salespersonName.trim() || null,
        salespersonPhone: salespersonPhone.trim() || null,
      })

      if (res.success) {
        toast.success(`อัปเดตใบเสนอราคา/เอกสาร ${cleanOrderCode} เรียบร้อยแล้ว`)
        onSuccess({
          id: order.id,
          orderCode: cleanOrderCode,
          createdAt: selectedDate,
          shippingName: shippingName.trim(),
          shippingPhone: shippingPhone.trim(),
          shippingAddress: shippingAddress.trim(),
          companyNameTh: companyNameTh.trim(),
          companyNameEn: companyNameEn.trim(),
          companyAddress: companyAddress.trim(),
          taxId: taxId.trim(),
          discountSnapshot: {
            ...snapshot,
            branch_type: effectiveBranchType,
            branch_code: effectiveBranchCode,
            customer_type: customerType,
            quotation_note: quotationNote.trim(),
            salesperson_name: salespersonName.trim() || null,
            salesperson_phone: salespersonPhone.trim() || null,
          }
        })
        onClose()
      } else {
        toast.error('บันทึกไม่สำเร็จ: ' + res.error)
      }
    } catch (err: any) {
      toast.error('เกิดข้อผิดพลาด: ' + (err.message || err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">
                แก้ไขใบเสนอราคา / เอกสารการขาย
              </h3>
              <p className="text-xs text-slate-500 font-mono flex items-center gap-1.5 mt-0.5">
                <span>เลขที่บิล:</span>
                <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  {orderCode || order.orderCode}
                </span>
                {order.branchName && (
                  <span className="text-slate-400 font-sans">({order.branchName})</span>
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          {/* 1. รายการสินค้าในเอกสาร (จำนวนสินค้าล็อคถาวร - Read Only ตามกฎ) */}
          <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-slate-700 font-bold text-xs uppercase tracking-wider">
                <Lock className="w-3.5 h-3.5 text-amber-600" />
                <span>รายการสินค้าในบิล ({order.items?.length || 0} รายการ)</span>
              </div>
              <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md font-semibold flex items-center gap-1">
                <AlertCircle className="w-3 h-3 text-amber-600" />
                จำนวนสินค้าถูกล็อคถาวร ป้องกันสต็อกคลาดเคลื่อน
              </span>
            </div>

            <div className="divide-y divide-slate-200/80 bg-white rounded-lg border border-slate-200 overflow-hidden">
              {order.items && order.items.length > 0 ? (
                order.items.map((item, idx) => (
                  <div key={item.id || idx} className="p-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 overflow-hidden">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.productName} className="w-full h-full object-contain" />
                        ) : (
                          <span className="text-[9px] text-slate-300">ไม่มีรูป</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-800 text-xs truncate" title={item.productName}>
                          {item.productName}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono truncate">
                          SKU: {item.productSku || '-'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0 text-right">
                      {/* Quantity: LOCKED READ-ONLY */}
                      <div className="px-2.5 py-1 rounded bg-slate-100 text-slate-800 font-black text-xs border border-slate-200">
                        {item.qty} ชิ้น
                      </div>
                      <div className="font-bold text-slate-700 text-xs min-w-[70px]">
                        ฿{item.totalItemAmount?.toLocaleString('th-TH', { minimumFractionDigits: 2 }) || '0.00'}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-3 text-center text-slate-400 italic">ไม่มีรายการสินค้า</div>
              )}
            </div>
          </div>

          {/* 2. เลขที่บิล และ วันที่ออกเอกสาร */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 2.1 เลขที่บิล / เลขที่เอกสาร */}
            <div className="space-y-2">
              <label className="flex items-center gap-1.5 font-bold text-slate-700">
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                <span>เลขที่บิล / รหัสเอกสาร (Doc No.):</span>
              </label>
              <input
                type="text"
                value={orderCode}
                onChange={(e) => setOrderCode(e.target.value)}
                placeholder="เช่น KW26-1101-1"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100"
                required
              />
              <p className="text-[10px] text-slate-400">
                สามารถแก้ไขเลขที่บิลได้ (เช่น เมื่อต้องการจัดลำดับเลขเอกสารใหม่)
              </p>
            </div>

            {/* 2.2 วันที่ออกเอกสาร */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 font-bold text-slate-700">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  <span>วันที่ออกเอกสาร (Date):</span>
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={setQuickYesterday}
                    className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-medium transition cursor-pointer"
                  >
                    เมื่อวาน (-1 วัน)
                  </button>
                  <button
                    type="button"
                    onClick={setQuickNow}
                    className="px-2 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-medium transition cursor-pointer"
                  >
                    เวลาปัจจุบัน
                  </button>
                </div>
              </div>
              <input
                type="datetime-local"
                value={dateTime}
                onChange={(e) => setDateTime(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100"
                required
              />
            </div>
          </div>

          {/* 3. ประเภทลูกค้าและข้อมูลสาขา */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* ประเภทลูกค้า */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-500" />
                <span>ประเภทลูกค้า:</span>
              </label>
              <div className="flex rounded-lg border border-slate-200 p-1 bg-slate-50">
                <button
                  type="button"
                  onClick={() => setCustomerType('INDIVIDUAL')}
                  className={`flex-1 py-1.5 rounded-md text-xs font-bold transition cursor-pointer ${
                    customerType === 'INDIVIDUAL'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  บุคคลธรรมดา
                </button>
                <button
                  type="button"
                  onClick={() => setCustomerType('CORPORATE')}
                  className={`flex-1 py-1.5 rounded-md text-xs font-bold transition cursor-pointer ${
                    customerType === 'CORPORATE'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  นิติบุคคล / บริษัท
                </button>
              </div>
            </div>

            {/* สำนักงานใหญ่ / สาขา */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                <span>สำนักงานใหญ่ / สาขา:</span>
              </label>
              <div className="flex rounded-lg border border-slate-200 p-1 bg-slate-50">
                <button
                  type="button"
                  onClick={() => setBranchType('NONE')}
                  className={`flex-1 py-1.5 rounded-md text-xs font-bold transition cursor-pointer ${
                    branchType === 'NONE'
                      ? 'bg-white text-slate-800 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  ไม่ระบุ
                </button>
                <button
                  type="button"
                  onClick={() => setBranchType('HEAD_OFFICE')}
                  className={`flex-1 py-1.5 rounded-md text-xs font-bold transition cursor-pointer ${
                    branchType === 'HEAD_OFFICE'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  สำนักงานใหญ่
                </button>
                <button
                  type="button"
                  onClick={() => setBranchType('BRANCH')}
                  className={`flex-1 py-1.5 rounded-md text-xs font-bold transition cursor-pointer ${
                    branchType === 'BRANCH'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  สาขา
                </button>
              </div>
            </div>
          </div>

          {/* รหัสสาขา (ถ้าเลือกสาขา) */}
          {branchType === 'BRANCH' && (
            <div className="space-y-1">
              <label className="font-bold text-slate-700">รหัสสาขา (เช่น 00001):</label>
              <input
                type="text"
                value={branchCode}
                onChange={(e) => setBranchCode(e.target.value)}
                placeholder="ระบุรหัสสาขา 5 หลัก..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
          )}

          {/* 4. ข้อมูลลูกค้าและผู้ติดต่อ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-bold text-slate-700">ชื่อลูกค้า / ผู้ติดต่อ:</label>
              <input
                type="text"
                value={shippingName}
                onChange={(e) => setShippingName(e.target.value)}
                placeholder="เช่น นาย สมชาย ใจดี"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-slate-700 flex items-center gap-1">
                <Phone className="w-3 h-3 text-slate-400" />
                <span>เบอร์โทรศัพท์ติดต่อ:</span>
              </label>
              <input
                type="text"
                value={shippingPhone}
                onChange={(e) => setShippingPhone(e.target.value)}
                placeholder="เช่น 081-234-5678"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
          </div>

          {/* 5. เลขประจำตัวผู้เสียภาษี (Tax ID) */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700 flex items-center gap-1">
              <CreditCard className="w-3 h-3 text-slate-400" />
              <span>เลขประจำตัวผู้เสียภาษี (Tax ID / เลขบัตรประชาชน 13 หลัก):</span>
            </label>
            <input
              type="text"
              value={taxId}
              onChange={(e) => setTaxId(e.target.value.replace(/\D/g, ''))}
              maxLength={13}
              placeholder="เลข 13 หลัก..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-mono tracking-wider font-bold"
            />
          </div>

          {/* 6. ข้อมูลบริษัท/นิติบุคคล */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-bold text-slate-700">ชื่อบริษัท / ร้านค้า (ภาษาไทย):</label>
              <input
                type="text"
                value={companyNameTh}
                onChange={(e) => setCompanyNameTh(e.target.value)}
                placeholder="เช่น บริษัท สยามเฟอร์นิเจอร์ จำกัด"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-slate-700">ชื่อบริษัท (ภาษาอังกฤษ ถ้ามี):</label>
              <input
                type="text"
                value={companyNameEn}
                onChange={(e) => setCompanyNameEn(e.target.value)}
                placeholder="e.g. Siam Furniture Co., Ltd."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* 7. ที่อยู่ออกเอกสารภาษี */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-slate-400" />
              <span>ที่อยู่ออกเอกสาร / ใบกำกับภาษี:</span>
            </label>
            <textarea
              rows={2}
              value={companyAddress}
              onChange={(e) => setCompanyAddress(e.target.value)}
              placeholder="เลขที่ อาคาร ซอย ถนน แขวง/ตำบล เขต/อำเภอ จังหวัด รหัสไปรษณีย์..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-blue-500 leading-relaxed"
            />
          </div>

          {/* 8. ที่อยู่จัดส่งสินค้า */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-700 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-400" />
                <span>ที่อยู่จัดส่งสินค้า (Shipping Address):</span>
              </label>
              <button
                type="button"
                onClick={() => setShippingAddress(companyAddress)}
                className="text-[11px] text-blue-600 hover:underline cursor-pointer"
              >
                คัดลอกจากที่อยู่ออกเอกสาร
              </button>
            </div>
            <textarea
              rows={2}
              value={shippingAddress}
              onChange={(e) => setShippingAddress(e.target.value)}
              placeholder="ที่อยู่สำหรับจัดส่งของ..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-blue-500 leading-relaxed"
            />
          </div>

          {/* 9. ข้อมูลพนักงานขาย / เซลล์ (Salesperson) */}
          <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <div className="font-bold text-amber-900 text-xs flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-amber-600" />
                <span>ข้อมูลพนักงานขาย / เซลล์ (ผู้ดูแลบิลนี้):</span>
              </div>
              {order.saleName && (
                <button
                  type="button"
                  onClick={() => {
                    setSalespersonName(order.saleName || '')
                    setSalespersonPhone(order.salePhone || '')
                  }}
                  className="text-[11px] text-amber-800 hover:text-amber-950 underline cursor-pointer font-medium"
                >
                  ใช้ชื่อและเบอร์จากโปรไฟล์ ({order.saleName})
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">ชื่อเซลล์ (Salesperson):</label>
                <input
                  type="text"
                  value={salespersonName}
                  onChange={(e) => setSalespersonName(e.target.value)}
                  placeholder={order.saleName ? `เช่น ${order.saleName}` : 'ชื่อพนักงานขาย / เซลล์...'}
                  className="w-full px-3 py-1.5 bg-white border border-amber-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-amber-600" />
                  <span>เบอร์โทรเซลล์:</span>
                </label>
                <input
                  type="text"
                  value={salespersonPhone}
                  onChange={(e) => setSalespersonPhone(e.target.value)}
                  placeholder={order.salePhone ? `เช่น ${order.salePhone}` : 'เช่น 081-xxx-xxxx'}
                  className="w-full px-3 py-1.5 bg-white border border-amber-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>
            </div>
            <p className="text-[10.5px] text-amber-700/80 leading-normal">
              * ข้อมูลส่วนนี้จะดึงจากหน้า &ldquo;ข้อมูลส่วนตัว (My Profile)&rdquo; ของบัญชีที่ขายเป็นหลัก หากแก้ไขข้อมูลในโปรไฟล์ เอกสารจะอัปเดตให้อัตโนมัติ
            </p>
          </div>

          {/* 10. หมายเหตุใบเสนอราคา */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700">หมายเหตุท้ายเอกสาร / เงื่อนไขเพิ่มเติม:</label>
            <textarea
              rows={2}
              value={quotationNote}
              onChange={(e) => setQuotationNote(e.target.value)}
              placeholder="เช่น ยืนยันราคาภายใน 30 วัน, มัดจำ 50%..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold transition cursor-pointer text-xs"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold transition cursor-pointer shadow-sm text-xs flex items-center gap-1.5"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>กำลังบันทึก...</span>
                </>
              ) : (
                <span>บันทึกการแก้ไขเอกสาร</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
