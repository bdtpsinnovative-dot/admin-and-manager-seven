"use client"

import { useState } from "react"
import Link from "next/link"
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Database,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Wrench,
  Zap,
} from "lucide-react"
import type { DailyAuditItem, MaintenanceState } from "@/lib/algorithm-maintenance"
import { triggerMaintenanceAction } from "@/actions/algorithm"

function formatDateTime(val: string | null) {
  if (!val) return "ยังไม่มีข้อมูล"
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(val))
}

function formatNumber(num: number) {
  return new Intl.NumberFormat("th-TH").format(num)
}

export default function HealthDashboardClient({
  initialState,
  initialAudit,
}: {
  initialState: MaintenanceState
  initialAudit: DailyAuditItem[]
}) {
  const [state, setState] = useState<MaintenanceState>(initialState)
  const [audit, setAudit] = useState<DailyAuditItem[]>(initialAudit)
  const [isRunning, setIsRunning] = useState(false)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const completedDays = audit.filter((a) => a.status === "complete" || a.status === "repaired").length
  const totalAuditDays = audit.length
  const completenessPercent = Math.round((completedDays / totalAuditDays) * 100)

  async function handleRunManualCheck() {
    setIsRunning(true)
    setActionMessage(null)
    setActionError(null)

    try {
      const res = await triggerMaintenanceAction()
      if (res.success) {
        setActionMessage(`✅ ${res.message} (ใช้เวลา ${(res.durationMs / 1000).toFixed(1)} วินาที)`)
        // Refresh page data dynamically
        const { getAlgorithmHealthAction } = await import("@/actions/algorithm")
        const fresh = await getAlgorithmHealthAction()
        setState(fresh.state)
        setAudit(fresh.dailyAudit)
      } else {
        setActionError(`⚠️ ${res.message}`)
      }
    } catch (err: any) {
      setActionError(`❌ เกิดข้อผิดพลาดในการตรวจสอบ: ${err?.message || String(err)}`)
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="w-full space-y-6">
      {/* Top Header & Navigation */}
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              สถานะระบบอัลกอริทึม & ตรวจสอบบัก (System Health & Audit)
            </h1>
            <p className="mt-0.5 text-xs text-slate-500">
              ตรวจสอบความสมบูรณ์ของข้อมูลรายวัน ตรวจจับบักอัตโนมัติ และติดตามการซ่อมแซมข้อมูล
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <nav className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            <Link
              href="/algorithm"
              className="whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            >
              ภาพรวม
            </Link>
            <Link
              href="/algorithm/audience"
              className="whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            >
              Audience
            </Link>
            <Link
              href="/algorithm/traffic"
              className="whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            >
              Traffic
            </Link>
            <Link
              href="/algorithm/products"
              className="whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            >
              สินค้าทั้งหมด
            </Link>
            <Link
              href="/algorithm/health"
              className="whitespace-nowrap rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-colors"
            >
              สถานะระบบ
            </Link>
          </nav>

          <button
            type="button"
            onClick={handleRunManualCheck}
            disabled={isRunning}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isRunning ? "animate-spin" : ""}`} />
            {isRunning ? "กำลังตรวจสอบและซ่อมแซม..." : "รันตรวจสอบและซ่อมทันที"}
          </button>
        </div>
      </div>

      {/* Action Notification Banners */}
      {actionMessage && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800 animate-fadeIn">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          <p>{actionMessage}</p>
        </div>
      )}

      {actionError && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800 animate-fadeIn">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
          <p>{actionError}</p>
        </div>
      )}

      {/* 4 Metric Cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Pipeline Health */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">สถานะระบบหลัก</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <Activity className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {state.last_run_status === "error" ? "พบข้อผิดพลาด" : "สมบูรณ์ (Healthy)"}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            อัปเดตล่าสุด: {formatDateTime(state.last_run_at)}
          </p>
        </div>

        {/* Card 2: 30-Day Completeness */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">ความสมบูรณ์ของข้อมูล</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {completedDays} / {totalAuditDays} วัน
            </span>
            <span className="text-xs font-bold text-blue-600">({completenessPercent}%)</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-blue-600 transition-all duration-500"
              style={{ width: `${completenessPercent}%` }}
            />
          </div>
        </div>

        {/* Card 3: Bug Auto-Repaired */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">การตรวจจับ & ซ่อมแซม</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
              <Wrench className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {formatNumber(state.repaired_bugs_count)} ครั้ง
            </span>
            <span className="text-xs font-bold text-purple-600">ซ่อมสำเร็จ</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {state.active_bugs_count === 0 ? "ไม่มีบักค้างในระบบ (0 Pending)" : `ค้างรอซ่อม ${state.active_bugs_count} วัน`}
          </p>
        </div>

        {/* Card 4: Raw Storage Footprint */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">ขนาดตารางข้อมูลดิบ (10 วัน)</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <Database className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {formatNumber(state.raw_events_count)} แถว
            </span>
            <span className="text-xs font-bold text-emerald-600">เบาหวิว</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {state.raw_events_count < 30000 ? "ประสิทธิภาพฐานข้อมูลดีเยี่ยม (< 1s)" : "เริ่มมีขนาดใหญ่"}
          </p>
        </div>
      </section>

      {/* Main Section: 30-Day Daily Audit Table */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">ตารางตรวจสอบความสมบูรณ์ของข้อมูลย้อนหลัง 30 วัน</h2>
            <p className="text-xs text-slate-500">
              แสดงสถานะการสรุปยอดประจำวัน วันที่ตรวจพบบัก และผลการซ่อมแซมอัตโนมัติ
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs font-semibold text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              สรุปครบถ้วน (100%)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-purple-500" />
              ซ่อมแซมสำเร็จ
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
              กำลังเก็บข้อมูล/รอสรุป
            </span>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">วันที่ (Date)</th>
                <th className="px-4 py-3 text-center">สถานะ</th>
                <th className="px-4 py-3 text-right">จำนวนสินค้าที่สรุป</th>
                <th className="px-4 py-3 text-right">ยอดวิวรวม</th>
                <th className="px-4 py-3 text-right">ยอดดูไม่ซ้ำ</th>
                <th className="px-4 py-3">บันทึกการซ่อมแซม / หมายเหตุ</th>
                <th className="px-4 py-3 text-right">ประมวลผลล่าสุด</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {audit.map((item) => {
                const isComplete = item.status === "complete"
                const isRepaired = item.status === "repaired"
                const isPending = item.status === "pending"

                return (
                  <tr key={item.date} className="transition-colors hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono font-semibold text-slate-900">
                      {item.date}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {isComplete && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                          <CheckCircle2 className="h-3 w-3" />
                          สมบูรณ์
                        </span>
                      )}
                      {isRepaired && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-1 text-xs font-bold text-purple-700">
                          <Wrench className="h-3 w-3" />
                          ซ่อมสำเร็จ
                        </span>
                      )}
                      {isPending && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                          <Clock className="h-3 w-3" />
                          กำลังเก็บข้อมูล
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-700">
                      {item.productsCount > 0 ? `${formatNumber(item.productsCount)} ชิ้น` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums font-semibold text-slate-900">
                      {item.totalViews > 0 ? formatNumber(item.totalViews) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-700">
                      {item.uniqueViews > 0 ? formatNumber(item.uniqueViews) : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {item.bugNote || (isComplete ? "ข้อมูลครบถ้วน 100% ไม่มีข้อผิดพลาด" : "—")}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-slate-400">
                      {formatDateTime(item.lastUpdated)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 2: Recent Logs */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">ประวัติการทำงานของระบบ (Recent Maintenance Logs)</h2>
        <p className="text-xs text-slate-500">
          บันทึกผลการรันจริงย้อนหลัง ทั้งรอบอัตโนมัติประจำเที่ยงคืน (00:05 น.) และรอบที่สั่งรันด้วยมือ
        </p>

        <div className="mt-4 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
          {state.recent_logs && state.recent_logs.length > 0 ? (
            state.recent_logs.map((log, idx) => (
              <div key={idx} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between hover:bg-slate-50">
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      log.status === "success" || log.status === "repaired"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    ✓
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{log.action}</p>
                    <p className="mt-0.5 text-xs text-slate-600">{log.message}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-400 sm:text-right">
                  <span>{(log.duration_ms / 1000).toFixed(1)}s</span>
                  <span className="whitespace-nowrap">{formatDateTime(log.timestamp)}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-sm text-slate-400">
              ยังไม่มีประวัติการรันที่บันทึกไว้ (จะเริ่มบันทึกรอบแรกเมื่อรันตรวจสอบ)
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
