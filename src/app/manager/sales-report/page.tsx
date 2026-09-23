"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
// ❌ ลบ createBrowserClient ออก
// import { createBrowserClient } from "@supabase/ssr" 

import { 
  BarChart3, 
  Download, 
  RefreshCcw, 
  FileText 
} from "lucide-react"

// ✅ เรียกใช้ Server Action แทน
import { getSalesReport, getUserProfile } from "@/actions/sales_report"

// --- Types ---
interface SaleRecord {
  day: string
  branch_id: number
  bills: number
  subtotal: number
  discount: number
  vat_amount: number
  total: number
  cash_total: number
  promptpay_total: number
  note: string | null
  closed_at: string
}

interface GroupedRow extends SaleRecord {
  period: string
}

interface Profile {
  branch_id: number
  branch_name: string
  full_name: string
}

// --- Helper Functions ---
const fmtMoney = (n: number) => n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const safeNum = (x: any) => (Number.isFinite(Number(x)) ? Number(x) : 0)
const pad2 = (n: number | string) => String(n).padStart(2, "0")

export default function SalesReportPage() {
  // --- State ---
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [rawData, setRawData] = useState<SaleRecord[]>([])
  
  // Filter State
  const [mode, setMode] = useState<"day" | "month" | "year">("day")
  const [selYear, setSelYear] = useState<number>(new Date().getFullYear())
  const [selMonth, setSelMonth] = useState<number>(new Date().getMonth() + 1)
  const [selDay, setSelDay] = useState<number>(new Date().getDate())

  // Dropdown Options
  const years = useMemo(() => {
    const current = new Date().getFullYear()
    return Array.from({ length: 5 }, (_, i) => current - 2 + i)
  }, [])
  
  const daysInSelectedMonth = useMemo(() => {
    return new Date(selYear, selMonth, 0).getDate()
  }, [selYear, selMonth])

  // ❌ ลบส่วนนี้ทิ้งครับ (ตัวต้นเหตุ Error)
  /* const supabase = createBrowserClient(...) */

  // --- 1. Load Profile (ผ่าน Server Action) ---
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        // ✅ ใช้ Server Action แทนการยิง Supabase หน้าบ้าน
        const res = await getUserProfile()
        
        if (res.profile) {
          setProfile(res.profile)
        } else {
           console.error("Profile Error:", res.error)
        }
      } catch (err) {
        console.error("Unexpected Error:", err)
      }
    }
    fetchProfile()
  }, [])

  // --- 2. Fetch Data (ผ่าน Server Action) ---
  const loadData = useCallback(async () => {
    if (!profile) return
    setLoading(true)

    try {
      // ✅ เรียก Server Action
      // (ส่ง branch_id ของตัวเองไป แต่ Server จะเช็คสิทธิ์ซ้ำอีกทีเพื่อความปลอดภัย)
      const { data, error } = await getSalesReport(
          mode, 
          selYear, 
          selMonth, 
          String(profile.branch_id)
      )

      if (error) {
          alert("โหลดข้อมูลไม่สำเร็จ: " + error)
      } else {
          let result = data as SaleRecord[]

          // ⚠️ Logic เพิ่มเติม: 
          // Server Action โหมด 'day' จะส่งมา "ทั้งเดือน" (เพื่อให้ Reuse กับกราฟได้)
          // เราต้องกรองเฉพาะวันที่เลือกใน Client
          if (mode === "day") {
             const exactDay = `${selYear}-${pad2(selMonth)}-${pad2(selDay)}`
             result = result.filter(r => r.day === exactDay)
          }

          setRawData(result)
      }
    } catch (err) {
      console.error("Fetch Data Error:", err)
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อ")
    } finally {
      setLoading(false)
    }
  }, [profile, mode, selYear, selMonth, selDay])

  // Trigger loadData เมื่อ filter เปลี่ยน
  useEffect(() => {
    loadData()
  }, [loadData])

  // --- 3. Process Data (Grouping) ---
  const processedData = useMemo(() => {
    if (mode === "day") {
      return rawData.map(r => ({ ...r, period: r.day }))
    }

    // Grouping Logic for Month/Year
    const map = new Map<string, GroupedRow>()
    
    rawData.forEach(r => {
      const key = mode === "month" ? r.day.slice(0, 7) : r.day.slice(0, 4)
      
      if (!map.has(key)) {
        map.set(key, {
          period: key,
          day: key,
          branch_id: r.branch_id,
          bills: 0, subtotal: 0, discount: 0, vat_amount: 0, total: 0, 
          cash_total: 0, promptpay_total: 0, note: "", closed_at: ""
        })
      }

      const cur = map.get(key)!
      cur.bills += safeNum(r.bills)
      cur.subtotal += safeNum(r.subtotal)
      cur.discount += safeNum(r.discount)
      cur.vat_amount += safeNum(r.vat_amount)
      cur.total += safeNum(r.total)
      cur.cash_total += safeNum(r.cash_total)
      cur.promptpay_total += safeNum(r.promptpay_total)
      if (r.note) cur.note = r.note 
    })

    return Array.from(map.values()).sort((a, b) => a.period.localeCompare(b.period))
  }, [rawData, mode])

  // Calculate Summary
  const summary = useMemo(() => {
    const sumTotal = processedData.reduce((acc, r) => acc + safeNum(r.total), 0)
    const sumBills = processedData.reduce((acc, r) => acc + safeNum(r.bills), 0)
    return { sumTotal, sumBills }
  }, [processedData])

  // --- Actions ---
  const handleExportCSV = () => {
    if (processedData.length === 0) return alert("ไม่มีข้อมูลให้ Export")

    const header = ["period", "bills", "subtotal", "discount", "vat_amount", "total", "cash_total", "promptpay_total", "note"]
    const lines = [header.join(",")]

    processedData.forEach(r => {
      const line = [
        r.period,
        safeNum(r.bills),
        safeNum(r.subtotal).toFixed(2),
        safeNum(r.discount).toFixed(2),
        safeNum(r.vat_amount).toFixed(2),
        safeNum(r.total).toFixed(2),
        safeNum(r.cash_total).toFixed(2),
        safeNum(r.promptpay_total).toFixed(2),
        `"${String(r.note ?? "").replaceAll('"', '""')}"`
      ]
      lines.push(line.join(","))
    })

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `sales-report-${mode}-${new Date().toLocaleDateString("en-CA")}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const setToday = () => {
    const now = new Date()
    setSelYear(now.getFullYear())
    setSelMonth(now.getMonth() + 1)
    setSelDay(now.getDate())
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      
      {/* --- Header --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-blue-600" />
            รายงานยอดขาย (Manager)
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            สาขา: <span className="font-bold text-slate-700">{profile?.branch_name || "กำลังโหลด..."}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-bold shadow-sm transition-all">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* --- Controls / Filters --- */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 items-center justify-between">
        
        {/* Mode Toggles */}
        <div className="flex bg-slate-100 p-1 rounded-xl w-full md:w-auto">
          {[
            { id: "day", label: "รายวัน" },
            { id: "month", label: "รายเดือน" },
            { id: "year", label: "รายปี" }
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id as any)}
              className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                mode === m.id ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Date Pickers */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-center md:justify-end">
          <select 
            value={selYear} 
            onChange={(e) => setSelYear(Number(e.target.value))}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {years.map(y => <option key={y} value={y}>ปี {y}</option>)}
          </select>

          {mode !== "year" && (
            <select 
              value={selMonth} 
              onChange={(e) => setSelMonth(Number(e.target.value))}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
               {["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."].map((m, i) => (
                 <option key={i} value={i+1}>{pad2(i+1)} ({m})</option>
               ))}
            </select>
          )}

          {mode === "day" && (
             <select 
               value={selDay} 
               onChange={(e) => setSelDay(Number(e.target.value))}
               className="px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
             >
               {Array.from({ length: daysInSelectedMonth }, (_, i) => i + 1).map(d => (
                 <option key={d} value={d}>วันที่ {d}</option>
               ))}
             </select>
          )}

          <button onClick={setToday} className="px-3 py-2 text-blue-600 text-sm font-bold hover:bg-blue-50 rounded-lg">วันนี้</button>
          <button onClick={loadData} className="p-2 bg-slate-100 rounded-lg hover:bg-slate-200 text-slate-600">
            <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* --- Summary Cards --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
         <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-2xl shadow-lg text-white">
            <div className="flex items-center gap-2 mb-1 opacity-80">
               <FileText className="w-4 h-4" />
               <span className="text-xs font-bold uppercase tracking-wider">จำนวนบิลรวม</span>
            </div>
            <div className="text-4xl font-black">{summary.sumBills.toLocaleString()} <span className="text-lg font-medium opacity-70">บิล</span></div>
         </div>
         <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 ring-4 ring-slate-50">
            <div className="flex items-center gap-2 mb-1 text-slate-500">
               <span className="text-2xl font-bold">฿</span>
               <span className="text-xs font-bold uppercase tracking-wider">ยอดขายรวมสุทธิ</span>
            </div>
            <div className="text-4xl font-black text-slate-800">{fmtMoney(summary.sumTotal)}</div>
         </div>
      </div>

      {/* --- Data Table --- */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase">ช่วงเวลา</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase text-right">จำนวนบิล</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase text-right">Subtotal</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase text-right text-rose-500">ส่วนลด</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase text-right">VAT</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-900 uppercase text-right">ยอดรวม (Total)</th>
                <th className="px-6 py-4 text-[11px] font-bold text-emerald-600 uppercase text-right">เงินสด</th>
                <th className="px-6 py-4 text-[11px] font-bold text-blue-600 uppercase text-right">โอน/QR</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase">หมายเหตุ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {processedData.length === 0 ? (
                <tr>
                   <td colSpan={9} className="px-6 py-20 text-center text-slate-400 font-medium">
                     {loading ? "กำลังโหลดข้อมูล..." : "ไม่พบข้อมูลในช่วงที่เลือก"}
                   </td>
                </tr>
              ) : (
                processedData.map((r, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4 text-sm font-bold text-slate-700 whitespace-nowrap">{r.period}</td>
                    <td className="px-6 py-4 text-sm text-right font-medium">{r.bills.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-right text-slate-500">{fmtMoney(r.subtotal)}</td>
                    <td className="px-6 py-4 text-sm text-right text-rose-500 font-medium">-{fmtMoney(r.discount)}</td>
                    <td className="px-6 py-4 text-sm text-right text-slate-400">{fmtMoney(r.vat_amount)}</td>
                    <td className="px-6 py-4 text-right">
                       <span className="text-sm font-black text-slate-900 underline decoration-slate-200 underline-offset-4">
                         {fmtMoney(r.total)}
                       </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-bold text-emerald-600 italic">{fmtMoney(r.cash_total)}</td>
                    <td className="px-6 py-4 text-sm text-right font-bold text-blue-600 italic">{fmtMoney(r.promptpay_total)}</td>
                    <td className="px-6 py-4 text-[11px] text-slate-400 max-w-[150px] truncate" title={r.note || ""}>
                      {r.note || "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}