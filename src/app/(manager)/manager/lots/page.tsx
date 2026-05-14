import React from "react"
import { redirect } from "next/navigation"
import Link from "next/link"
import { getInitialProfile } from "@/actions/tagcheck"
import { getManagerLots, type StockLot } from "@/actions/lots"
import { Layers, ChevronRight, Clock, CheckCircle2, AlertTriangle, RotateCw, Send } from "lucide-react"

const STATUS_MAP: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  SENT:      { label: "รอรับ",        cls: "bg-blue-100 text-blue-700",      icon: <Send className="w-3.5 h-3.5" /> },
  RECEIVING: { label: "กำลังรับ",     cls: "bg-amber-100 text-amber-700",    icon: <RotateCw className="w-3.5 h-3.5" /> },
  PARTIAL:   { label: "รับบางส่วน",   cls: "bg-orange-100 text-orange-700",  icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  COMPLETED: { label: "ครบแล้ว ✓",    cls: "bg-emerald-100 text-emerald-700",icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
}

const fmtDate = (d: string | null) => d
  ? new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short" }).format(new Date(d))
  : "—"

export default async function ManagerLotsPage() {
  const profile = await getInitialProfile()
  if (!profile) redirect("/login")

  const lots = await getManagerLots(profile.branch_id)

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-5 pb-20">
      <div>
        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
          <Layers className="w-7 h-7 text-indigo-600" /> รับสินค้า (ลอต)
        </h1>
        <p className="text-slate-500 text-sm mt-1">สาขา {profile.branch_name}</p>
      </div>

      {lots.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
          <Layers className="w-12 h-12 text-slate-200" />
          <p className="font-bold text-sm">ไม่มีลอตที่รอรับสินค้าขณะนี้</p>
          <p className="text-xs text-slate-300">ลอตที่ส่งมาจาก Admin จะปรากฏที่นี่</p>
        </div>
      ) : (
        <div className="space-y-3">
          {lots.map((lot) => {
            const s = STATUS_MAP[lot.status] ?? STATUS_MAP.SENT
            const pct = lot.expected_total > 0
              ? Math.min(100, Math.round((lot.received_total / lot.expected_total) * 100))
              : 0

            return (
              <Link
                key={lot.id}
                href={`/manager/lots/${lot.id}`}
                className="block bg-white rounded-[1.5rem] border-2 border-slate-100 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-slate-900 text-base">{lot.lot_code}</span>
                      <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-lg uppercase ${s.cls}`}>
                        {s.icon}{s.label}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 font-medium mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      ส่งมา {fmtDate(lot.sent_at)}
                    </div>
                    {lot.note && (
                      <p className="text-xs text-slate-400 italic mt-1 line-clamp-1">{lot.note}</p>
                    )}
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-300 shrink-0 mt-1" />
                </div>

                <div className="mt-4 space-y-1.5">
                  <div className="flex justify-between text-xs font-bold text-slate-500">
                    <span>{lot.item_count} รายการ · รับแล้ว {lot.received_total.toLocaleString()} / {lot.expected_total.toLocaleString()} ชิ้น</span>
                    <span className={pct >= 100 ? "text-emerald-600" : "text-indigo-600"}>{pct}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${pct >= 100 ? "bg-emerald-500" : "bg-indigo-500"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
