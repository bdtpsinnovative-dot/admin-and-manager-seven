"use client"

import { useEffect, useState } from 'react'
import { ImageIcon, Maximize2, X } from 'lucide-react'

type LoadState = 'loading' | 'available' | 'missing'

export default function PaymentSlipViewer({
  orderId,
  orderCode,
  compact = false,
}: {
  orderId: number
  orderCode: string
  compact?: boolean
}) {
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [isOpen, setIsOpen] = useState(false)
  const thumbnailUrl = `/api/payment-slips/${orderId}?thumbnail=1`
  const fullImageUrl = `/api/payment-slips/${orderId}`

  useEffect(() => {
    if (!isOpen) return
    const previousOverflow = document.body.style.overflow
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false)
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  if (loadState === 'missing') {
    return compact ? (
      <span className="text-xs font-bold text-slate-300">—</span>
    ) : null
  }

  return (
    <>
      <button
        type="button"
        onClick={event => {
          event.stopPropagation()
          if (loadState === 'available') setIsOpen(true)
        }}
        disabled={loadState !== 'available'}
        className={compact
          ? 'group relative mx-auto block h-14 w-11 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 shadow-sm transition hover:border-emerald-300 hover:shadow-md disabled:cursor-default'
          : 'group flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-2.5 text-left shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50/30 disabled:cursor-default'
        }
        aria-label={`ดูสลิปของบิล ${orderCode}`}
      >
        <span className={compact
          ? 'absolute inset-0'
          : 'relative flex h-14 w-11 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100'
        }>
          {loadState === 'loading' && <span className="absolute inset-0 animate-pulse bg-slate-200" />}
          <img
            src={thumbnailUrl}
            alt={`สลิปของบิล ${orderCode}`}
            loading="lazy"
            onLoad={() => setLoadState('available')}
            onError={() => setLoadState('missing')}
            className={`h-full w-full object-cover transition-opacity ${loadState === 'available' ? 'opacity-100' : 'opacity-0'}`}
          />
        </span>

        {compact ? (
          loadState === 'available' && (
            <span className="absolute inset-0 flex items-center justify-center bg-slate-900/0 text-white opacity-0 transition group-hover:bg-slate-900/35 group-hover:opacity-100">
              <Maximize2 className="h-4 w-4" />
            </span>
          )
        ) : (
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <ImageIcon className="h-3.5 w-3.5 text-emerald-600" /> หลักฐานการชำระเงิน
            </span>
            <span className="mt-0.5 block text-[10px] text-slate-400">
              {loadState === 'loading' ? 'กำลังตรวจสอบสลิป...' : 'กดเพื่อดูรูปขนาดใหญ่'}
            </span>
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={`สลิปของบิล ${orderCode}`}
          onClick={() => setIsOpen(false)}
        >
          <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl" onClick={event => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800">หลักฐานการชำระเงิน</h3>
                <p className="mt-0.5 font-mono text-[10px] text-slate-400">{orderCode}</p>
              </div>
              <button type="button" onClick={() => setIsOpen(false)} className="rounded-full bg-slate-100 p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700" aria-label="ปิดรูปสลิป">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto bg-slate-100 p-3 sm:p-6">
              <img src={fullImageUrl} alt={`สลิปฉบับเต็มของบิล ${orderCode}`} className="mx-auto max-h-[76vh] max-w-full rounded-xl bg-white object-contain shadow-sm" />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
