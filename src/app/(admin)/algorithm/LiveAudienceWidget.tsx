"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Users, Radio, Monitor, Smartphone, ExternalLink, Activity } from "lucide-react"
import ConcurrentTimelineChart from "./ConcurrentTimelineChart"

type ViewerPresence = {
  key: string
  tabId: string
  pageType: string
  pagePath: string
  productId: number | null
  deviceType: "mobile" | "desktop" | string
  onlineAt: string
}

function formatPageLabel(type: string, path: string, productId: number | null) {
  if (type === "product" && productId) return `สินค้า SKU / ID: #${productId}`
  if (type === "product") return `หน้ารายละเอียดสินค้า (${path})`
  if (type === "prop_listing") return "หน้ารวมสินค้า Prop"
  if (type === "home") return "หน้าแรก (Home)"
  if (type === "cart") return "ตะกร้าสินค้า (Cart)"
  if (type === "journal") return "บทความ / Journal"
  if (type === "contact") return "หน้าติดต่อเรา"
  return path || "หน้าอื่นๆ"
}

export default function LiveAudienceWidget() {
  const [connected, setConnected] = useState(false)
  const [viewers, setViewers] = useState<ViewerPresence[]>([])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase.channel("prop-live-audience")

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState()
        const parsed: ViewerPresence[] = []

        for (const [key, presences] of Object.entries(state)) {
          const list = presences as Array<{
            tab_id?: string
            page_type?: string
            page_path?: string
            product_id?: number | null
            device_type?: string
            online_at?: string
          }>

          for (const item of list) {
            parsed.push({
              key,
              tabId: item.tab_id || key,
              pageType: item.page_type || "other",
              pagePath: item.page_path || "/",
              productId: item.product_id || null,
              deviceType: item.device_type || "desktop",
              onlineAt: item.online_at || new Date().toISOString(),
            })
          }
        }

        setViewers(parsed)
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setConnected(true)
        } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
          setConnected(false)
        }
      })

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [])

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-3.5 w-3.5">
            {connected ? (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500" />
              </>
            ) : (
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-slate-300" />
            )}
          </span>
          <h2 className="text-base md:text-lg font-bold text-slate-800 flex items-center gap-2">
            <Radio className="w-5 h-5 text-emerald-600" />
            ผู้ชมสดในเว็บตอนนี้ (Live Audience)
          </h2>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            Realtime WebSocket
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Activity className="w-4 h-4 text-emerald-500 animate-pulse" />
          {connected ? "เชื่อมต่อสดกับ Storefront อยู่" : "กำลังเชื่อมต่อ..."}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
        <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-slate-50 border border-emerald-100 p-4">
          <div className="text-xs font-medium text-emerald-800 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-emerald-600" />
            กำลังเปิดหน้าเว็บอยู่สดๆ
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-700">{viewers.length}</span>
            <span className="text-xs text-slate-500">แท็บ / คน</span>
          </div>
        </div>

        <div className="rounded-xl bg-slate-50 border border-slate-100 p-4">
          <div className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
            <Monitor className="w-4 h-4 text-slate-500" />
            กำลังดูหน้ารายละเอียดสินค้า
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-800">
              {viewers.filter((v) => v.pageType === "product").length}
            </span>
            <span className="text-xs text-slate-500">คน</span>
          </div>
        </div>

        <div className="rounded-xl bg-slate-50 border border-slate-100 p-4">
          <div className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
            <Smartphone className="w-4 h-4 text-slate-500" />
            กำลังเลือกดูหมวด / หน้าอื่นๆ
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-800">
              {viewers.filter((v) => v.pageType !== "product").length}
            </span>
            <span className="text-xs text-slate-500">คน</span>
          </div>
        </div>
      </div>

      {/* Concurrent & Peak Viewers 24-Hour Timeline */}
      <ConcurrentTimelineChart currentLiveCount={viewers.length} />

      {viewers.length > 0 ? (
        <div className="space-y-2 pt-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            รายการผู้ชมที่กำลังเปิดดูอยู่ (Active Viewers List)
          </div>
          <div className="divide-y divide-slate-100 rounded-xl border border-slate-100 bg-slate-50/50 max-h-60 overflow-y-auto">
            {viewers.map((viewer, idx) => (
              <div key={`${viewer.tabId}-${idx}`} className="flex items-center justify-between p-3 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  {viewer.deviceType === "mobile" ? (
                    <Smartphone className="w-4 h-4 text-slate-400 shrink-0" />
                  ) : (
                    <Monitor className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-700 truncate">
                      {formatPageLabel(viewer.pageType, viewer.pagePath, viewer.productId)}
                    </div>
                    <div className="text-slate-400 text-[11px] truncate flex items-center gap-1">
                      <span>{viewer.pagePath}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-white border border-slate-200 text-slate-600">
                    {viewer.deviceType}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Online
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/40 p-4 text-center text-xs text-slate-500">
          ยังไม่มีผู้ชมเปิดหน้าเว็บอยู่ในขณะนี้ (เมื่อมีคนเปิดเว็บ `terrahome.studio` ข้อมูลจะเด้งขึ้นมาสดๆ ทันที)
        </div>
      )}
    </div>
  )
}
