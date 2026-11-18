'use client'

import { useState } from 'react'
import { RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react'

export default function RevalidateZenslabButton() {
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handlePurge = async () => {
    if (loading) return
    setLoading(true)
    setNotice(null)
    try {
      const res = await fetch('/api/revalidate-zenslab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: 'all' }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.ok) {
        setNotice({
          type: 'error',
          text: json?.error || 'ล้างแคชไม่สำเร็จ กรุณาตรวจสอบค่า Env บน Vercel',
        })
      } else if (json?.cloudflare?.skipped) {
        setNotice({
          type: 'success',
          text: 'ล้างแคช Vercel Zen-Slab เรียบร้อยแล้ว (ยังไม่ได้ตั้งค่า Cloudflare Purge)',
        })
      } else if (json?.cloudflare && json.cloudflare.ok === false) {
        setNotice({
          type: 'error',
          text: `ล้างแคช Vercel แล้ว แต่ Cloudflare ไม่สำเร็จ: ${json.cloudflare.error || ''}`,
        })
      } else {
        setNotice({
          type: 'success',
          text: 'ล้างแคช Zen-Slab (Vercel + Cloudflare) เรียบร้อยแล้ว',
        })
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
    <div className="relative flex items-center">
      <button
        type="button"
        onClick={handlePurge}
        disabled={loading}
        className="w-full sm:w-auto px-4 py-2 bg-amber-50 border border-amber-300 rounded-lg text-amber-800 text-sm font-bold hover:bg-amber-100 hover:border-amber-400 flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95 disabled:opacity-60 cursor-pointer whitespace-nowrap"
        title="ล้างแคชหน้าเว็บ zen-slab.com (สินค้า, ฟิลเตอร์, ส่วนลด) โดยไม่กระทบสต็อกสดและรอบอัลกอริทึม 7 วัน"
      >
        <RefreshCw className={`w-4 h-4 text-amber-700 ${loading ? 'animate-spin' : ''}`} />
        {loading ? 'กำลังล้างแคช...' : 'ล้างแคช Zen-Slab'}
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
