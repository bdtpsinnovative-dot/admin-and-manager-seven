'use client'

import { useState } from 'react'
import { RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react'

interface RevalidateTerraButtonProps {
  className?: string
  scope?: 'discounts' | 'products' | 'promotions' | 'all'
  label?: string
}

export default function RevalidateTerraButton({
  className = '',
  scope = 'discounts',
  label = 'ล้างแคชเว็บ Terra',
}: RevalidateTerraButtonProps) {
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handlePurge = async () => {
    if (loading) return
    setLoading(true)
    setNotice(null)
    try {
      const res = await fetch('/api/revalidate-terra', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.ok) {
        setNotice({
          type: 'error',
          text: json?.error || 'ล้างแคชเว็บ Terra ไม่สำเร็จ โปรดตรวจสอบการเชื่อมต่อ',
        })
      } else {
        const anyOk = json.results?.some((r: any) => r.ok)
        const failedTargets = json.results?.filter((r: any) => !r.ok) || []

        if (anyOk && failedTargets.length === 0) {
          setNotice({
            type: 'success',
            text: 'ล้างแคชเว็บ Terra Home Studio เรียบร้อยแล้วทุกช่องทาง',
          })
        } else if (anyOk && failedTargets.length > 0) {
          setNotice({
            type: 'success',
            text: `ล้างแคชสำเร็จบางเป้าหมาย (${json.results.length - failedTargets.length}/${json.results.length})`,
          })
        } else {
          setNotice({
            type: 'error',
            text: 'ไม่สามารถติดต่อเซิร์ฟเวอร์ปลายทางของ Terra ได้',
          })
        }
      }
    } catch (err: any) {
      setNotice({
        type: 'error',
        text: err?.message || 'เชื่อมต่อระบบล้างแคชไม่สำเร็จ',
      })
    } finally {
      setLoading(false)
      setTimeout(() => setNotice(null), 6000)
    }
  }

  return (
    <div className={`relative flex items-center ${className}`}>
      <button
        type="button"
        onClick={handlePurge}
        disabled={loading}
        className="w-full sm:w-auto px-3.5 py-2 bg-stone-100 border border-stone-300 rounded-lg text-stone-800 text-xs font-bold hover:bg-stone-200 hover:border-stone-400 flex items-center justify-center gap-1.5 transition-all shadow-2xs active:scale-95 disabled:opacity-60 cursor-pointer whitespace-nowrap"
        title="สั่งล้างแคชหน้าเว็บ terrahome-studio.com ทันที (ส่วนลด, โปรโมชั่น, แคตตาล็อกสินค้า)"
      >
        <RefreshCw className={`w-3.5 h-3.5 text-[#84492C] ${loading ? 'animate-spin' : ''}`} />
        {loading ? 'กำลังล้างแคช...' : label}
      </button>

      {notice && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border text-sm font-semibold max-w-md ${
            notice.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {notice.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          )}
          <span>{notice.text}</span>
        </div>
      )}
    </div>
  )
}
