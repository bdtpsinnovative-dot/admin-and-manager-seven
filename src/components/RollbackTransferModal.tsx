"use client"

import React from 'react'

interface RollbackTransferModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void> | void
  transferCode: string
  fromBranchName?: string
  toBranchName?: string
  loading?: boolean
}

export default function RollbackTransferModal({
  isOpen,
  onClose,
  onConfirm,
  transferCode,
  fromBranchName,
  toBranchName,
  loading = false,
}: RollbackTransferModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 text-center">
          {/* Header Icon */}
          <div className="mx-auto w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 mb-4 shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-7 h-7">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
            </svg>
          </div>

          <h3 className="text-xl font-black text-slate-900 mb-1">
            ยกเลิกใบโอนและดึงยอดสต็อกกลับ
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            โปรดตรวจสอบรายละเอียดเอกสารก่อนยืนยันการคืนยอด
          </p>

          {/* Details Card */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 my-4 text-left">
            <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-slate-200/60">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">เลขที่เอกสาร</span>
              <span className="font-mono font-bold text-sm text-slate-800 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-xs">
                {transferCode || '-'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/60">
                <span className="text-slate-400 block font-medium mb-0.5">สาขาต้นทาง (คืนสต็อกเข้า)</span>
                <span className="font-bold text-emerald-700 truncate block">
                  {fromBranchName || '-'}
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/60">
                <span className="text-slate-400 block font-medium mb-0.5">สาขาปลายทาง (ดึงสต็อกออก)</span>
                <span className="font-bold text-rose-600 truncate block">
                  {toBranchName || '-'}
                </span>
              </div>
            </div>
          </div>

          {/* Warning / Summary Box */}
          <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200/70 text-left mb-6">
            <div className="flex items-start gap-2.5">
              <svg className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="text-xs text-amber-900 leading-relaxed">
                <span className="font-bold block mb-1">ผลกระทบต่อสต็อกสินค้า:</span>
                <ul className="list-disc list-inside text-slate-700 space-y-1">
                  <li>ดึงยอดสินค้าที่รับเข้า ออกจากคลังปลายทาง</li>
                  <li>คืนยอดสต็อกสินค้า กลับเข้าคลังต้นทาง</li>
                  <li>ปรับสถานะเอกสารเป็น <span className="font-bold text-rose-700">ยกเลิกแล้ว (CANCELLED)</span></li>
                </ul>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-3 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl font-bold text-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 px-4 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-rose-600/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>กำลังดึงยอดกลับ...</span>
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
                  </svg>
                  <span>ยืนยันดึงยอดกลับ</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
