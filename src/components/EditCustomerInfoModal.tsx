"use client"

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, User, Phone, MapPin, Loader2, Check, AlertCircle } from 'lucide-react'
import { updateOrderCustomerInfo } from '@/actions/dispatch'

interface EditCustomerInfoModalProps {
  isOpen: boolean
  orderId: number | null
  orderCode: string
  initialData: {
    shipping_name: string | null
    shipping_phone: string | null
    shipping_address: string | null
  }
  onClose: () => void
  onSuccess: (updated: {
    shipping_name: string
    shipping_phone: string
    shipping_address: string
  }) => void
}

export default function EditCustomerInfoModal({
  isOpen,
  orderId,
  orderCode,
  initialData,
  onClose,
  onSuccess
}: EditCustomerInfoModalProps) {
  const [mounted, setMounted] = useState(false)
  const [shippingName, setShippingName] = useState(initialData.shipping_name || '')
  const [shippingPhone, setShippingPhone] = useState(initialData.shipping_phone || '')
  const [shippingAddress, setShippingAddress] = useState(initialData.shipping_address || '')
  const [isSaving, setIsSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (isOpen) {
      setShippingName(initialData.shipping_name || '')
      setShippingPhone(initialData.shipping_phone || '')
      setShippingAddress(initialData.shipping_address || '')
      setErrorMsg(null)
    }
  }, [isOpen, initialData])

  if (!isOpen || !mounted || !orderId) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setErrorMsg(null)

    try {
      const res = await updateOrderCustomerInfo(orderId, {
        shipping_name: shippingName,
        shipping_phone: shippingPhone,
        shipping_address: shippingAddress
      })

      if (!res.success) {
        setErrorMsg(res.error || 'ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง')
        return
      }

      onSuccess({
        shipping_name: shippingName.trim(),
        shipping_phone: shippingPhone.trim(),
        shipping_address: shippingAddress.trim()
      })
      onClose()
    } catch (err: any) {
      setErrorMsg(err?.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ')
    } finally {
      setIsSaving(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                แก้ไขข้อมูลลูกค้า / ข้อมูลจัดส่ง
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                เลขที่บิล: <span className="font-mono font-bold text-slate-700">{orderCode}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Info Notice */}
          <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl flex items-start gap-2.5 text-xs text-amber-900 leading-relaxed">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">หมายเหตุสำคัญ:</span> การแก้ไขนี้จะเปลี่ยนเฉพาะชื่อผู้รับ เบอร์โทรศัพท์ และที่อยู่จัดส่งเท่านั้น 
              <span className="font-semibold text-amber-950"> จะไม่มีการแตะต้องหรือเปลี่ยนแปลงรายการสินค้าและสต็อกใดๆ ทั้งสิ้น</span>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-medium">
              ⚠️ {errorMsg}
            </div>
          )}

          {/* ชื่อผู้รับ / ลูกค้า */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" /> ชื่อผู้รับ / ชื่อลูกค้า
            </label>
            <input
              type="text"
              value={shippingName}
              onChange={(e) => setShippingName(e.target.value)}
              placeholder="ระบุชื่อผู้รับสินค้า..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all text-slate-800 font-medium"
              autoFocus
            />
          </div>

          {/* เบอร์โทรศัพท์ */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-slate-400" /> เบอร์โทรศัพท์
            </label>
            <input
              type="tel"
              value={shippingPhone}
              onChange={(e) => setShippingPhone(e.target.value)}
              placeholder="ระบุเบอร์โทรศัพท์ (เช่น 081-xxx-xxxx)..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all text-slate-800 font-medium"
            />
          </div>

          {/* ที่อยู่จัดส่ง */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400" /> ที่อยู่จัดส่ง
            </label>
            <textarea
              rows={3}
              value={shippingAddress}
              onChange={(e) => setShippingAddress(e.target.value)}
              placeholder="ระบุบ้านเลขที่ ถนน แขวง/ตำบล เขต/อำเภอ จังหวัด รหัสไปรษณีย์..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all text-slate-800 leading-relaxed resize-none font-medium"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2.5 text-sm font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl text-sm font-bold shadow-sm shadow-emerald-600/30 flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> กำลังบันทึก...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" /> บันทึกการแก้ไข
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
