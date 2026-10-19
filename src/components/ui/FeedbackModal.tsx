"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { 
  AlertTriangle, 
  Trash2, 
  CheckCircle2, 
  ShieldAlert, 
  Info, 
  X, 
  Loader2 
} from "lucide-react"

export type FeedbackModalType = 'confirm' | 'danger' | 'warning' | 'error' | 'success' | 'info'

export interface FeedbackModalProps {
  isOpen: boolean
  type?: FeedbackModalType
  title: string
  subtitle?: string
  message?: string
  details?: string | string[]
  confirmText?: string
  cancelText?: string
  confirmVariant?: 'danger' | 'primary' | 'success'
  isLoading?: boolean
  onConfirm?: () => void
  onClose: () => void
}

export default function FeedbackModal({
  isOpen,
  type = 'info',
  title,
  subtitle,
  message,
  details,
  confirmText,
  cancelText = 'ยกเลิก',
  confirmVariant,
  isLoading = false,
  onConfirm,
  onClose
}: FeedbackModalProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!isOpen || !mounted) return null

  const isConfirm = type === 'confirm' || type === 'danger' || Boolean(onConfirm)

  // กำหนดไอคอนและโทนสีตามประเภท
  let icon = <Info className="w-7 h-7 text-blue-600" />
  let iconBg = "bg-blue-50 text-blue-600 ring-blue-100/70"
  let defaultConfirmVariant: 'danger' | 'primary' | 'success' = 'primary'
  let defaultConfirmText = "ตกลง"

  if (type === 'danger' || type === 'confirm') {
    icon = <Trash2 className="w-7 h-7 text-rose-600" />
    iconBg = "bg-rose-50 text-rose-600 ring-rose-100/70"
    defaultConfirmVariant = 'danger'
    defaultConfirmText = "ยืนยันการลบ"
  } else if (type === 'warning') {
    icon = <ShieldAlert className="w-7 h-7 text-amber-600" />
    iconBg = "bg-amber-50 text-amber-600 ring-amber-100/70"
    defaultConfirmVariant = 'primary'
    defaultConfirmText = "รับทราบ"
  } else if (type === 'error') {
    icon = <AlertTriangle className="w-7 h-7 text-rose-600" />
    iconBg = "bg-rose-50 text-rose-600 ring-rose-100/70"
    defaultConfirmVariant = 'danger'
    defaultConfirmText = "เข้าใจแล้ว"
  } else if (type === 'success') {
    icon = <CheckCircle2 className="w-7 h-7 text-emerald-600" />
    iconBg = "bg-emerald-50 text-emerald-600 ring-emerald-100/70"
    defaultConfirmVariant = 'success'
    defaultConfirmText = "ตกลง"
  }

  const finalConfirmVariant = confirmVariant || defaultConfirmVariant
  const finalConfirmText = confirmText || defaultConfirmText

  // แยกรายละเอียดข้อความหากมี
  const detailLines: string[] = Array.isArray(details)
    ? details
    : typeof details === 'string'
      ? details.split('\n').filter(line => line.trim().length > 0)
      : []

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ปุ่มปิดมุมบน */}
        <button
          type="button"
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition cursor-pointer disabled:opacity-50"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 sm:p-7">
          {/* ส่วนหัวและไอคอน */}
          <div className="flex items-start gap-4">
            <div className={`w-13 h-13 rounded-2xl flex items-center justify-center ring-8 shadow-xs shrink-0 ${iconBg}`}>
              {icon}
            </div>
            <div className="flex-1 pr-6">
              <h3 className="text-lg font-bold text-slate-900 leading-snug">
                {title}
              </h3>
              {subtitle && (
                <p className="text-xs font-semibold text-slate-500 mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {/* ข้อความหลัก */}
          {message && (
            <div className="mt-4 text-sm text-slate-600 leading-relaxed font-normal">
              {message}
            </div>
          )}

          {/* กล่องแสดงรายละเอียดข้อผิดพลาด / ข้อมูลหลายบรรทัด */}
          {detailLines.length > 0 && (
            <div className="mt-4 max-h-60 overflow-y-auto bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-xs text-slate-700 space-y-2">
              {detailLines.map((line, idx) => {
                const isBullet = line.trim().startsWith('•') || line.trim().startsWith('-')
                const cleanLine = isBullet ? line.replace(/^[•\-]\s*/, '') : line

                return (
                  <div key={idx} className="flex items-start gap-2 leading-relaxed">
                    {isBullet ? (
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0" />
                    ) : null}
                    <span className="font-medium text-slate-700 break-words flex-1">
                      {cleanLine}
                    </span>
                  </div>
                )
              })}
            </div>
          )}

          {/* ปุ่มการกระทำ Action Buttons */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            {isConfirm && (
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs sm:text-sm transition cursor-pointer disabled:opacity-50"
              >
                {cancelText}
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                if (onConfirm) {
                  onConfirm()
                } else {
                  onClose()
                }
              }}
              disabled={isLoading}
              className={`px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-sm transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95 ${
                finalConfirmVariant === 'danger'
                  ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-200'
                  : finalConfirmVariant === 'success'
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200'
                    : 'bg-slate-900 hover:bg-slate-800 text-white'
              }`}
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{finalConfirmText}</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
