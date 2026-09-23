"use client"

import { useState, useEffect } from "react"
import { 
  CalendarCheck, RefreshCcw, CheckCircle2, 
  AlertCircle, Wallet, Banknote, CalendarDays, Loader2,
  XCircle, HelpCircle, X
} from "lucide-react"

// ✅ เรียกใช้ Server Action
import { getPendingDays, closeDayAction, getUserProfile } from "@/actions/close_day"

// --- Types ---
interface DaySummary {
  dayKey: string
  bills: number
  total: number
  cash_total: number
  promptpay_total: number
}

interface Profile {
  branch_id: number
  branch_name: string
  full_name: string
}

// --- Helper Functions ---
const fmtMoney = (n: number) => n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const ddmmyyyy = (dayKey: string) => { const [y, m, d] = dayKey.split("-"); return `${d}/${m}/${y}` }

export default function CloseDayPage() {
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [pendingDays, setPendingDays] = useState<DaySummary[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)

  // 🔥 State สำหรับ Alert Modal (Success/Error)
  const [alertState, setAlertState] = useState<{
    isOpen: boolean;
    type: 'success' | 'error';
    title: string;
    message: string;
  }>({ isOpen: false, type: 'success', title: '', message: '' })

  // 🔥 State สำหรับ Confirm Modal (ยืนยันการทำรายการ)
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: (() => Promise<void>) | null; // เก็บฟังก์ชันที่จะทำงานเมื่อกดยืนยัน
  }>({ isOpen: false, title: '', message: '', action: null })

  // --- 1. Init: Load Profile ---
  useEffect(() => {
    const init = async () => {
      setLoading(true)
      try {
        const res = await getUserProfile()
        
        if (res.error || !res.profile) {
           console.error("Auth Error:", res.error)
           return
        }

        setCurrentUser(res.user)
        setProfile(res.profile)
        await loadPendingSales(res.profile.branch_id)

      } catch (err) {
        console.error("Init Error:", err)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  // --- Helper: Show Alert ---
  const showAlert = (type: 'success' | 'error', title: string, message: string) => {
    setAlertState({ isOpen: true, type, title, message })
  }

  // --- 2. Load Function ---
  const loadPendingSales = async (branchId: number) => {
      const { data, error } = await getPendingDays(branchId)
      if (error) {
          showAlert('error', 'โหลดข้อมูลไม่สำเร็จ', error)
      } else {
          setPendingDays(data as DaySummary[])
      }
  }

  // --- 3. Close Logic (เตรียมการ) ---
  const prepareCloseDay = (daySummary: DaySummary) => {
    const { dayKey } = daySummary
    // เปิด Modal ยืนยัน แทนการใช้ confirm()
    setConfirmState({
        isOpen: true,
        title: `ยืนยันปิดยอดวัน ${ddmmyyyy(dayKey)}`,
        message: `ยอดรวมทั้งสิ้น ฿${fmtMoney(daySummary.total)} ต้องการดำเนินการต่อหรือไม่?`,
        action: () => executeCloseDay(daySummary) // ส่งฟังก์ชันตัวจริงไปรอไว้
    })
  }

  const prepareCloseAll = () => {
    if (pendingDays.length === 0) return
    setConfirmState({
        isOpen: true,
        title: 'ยืนยันปิดยอดทั้งหมด',
        message: `คุณกำลังจะปิดยอดค้างทั้งหมด ${pendingDays.length} วัน ดำเนินการต่อหรือไม่?`,
        action: () => executeCloseAll()
    })
  }

  // --- 4. Execution Logic (ทำงานจริง) ---
  const executeCloseDay = async (daySummary: DaySummary) => {
    if (!profile) return
    setConfirmState(prev => ({ ...prev, isOpen: false })) // ปิด Modal ยืนยัน
    setProcessing(true)
    
    const res = await closeDayAction(profile.branch_id, daySummary.dayKey)

    if (res.error) {
        showAlert('error', 'ปิดยอดไม่สำเร็จ', res.error)
    } else {
        showAlert('success', 'ปิดยอดสำเร็จ', `ปิดยอดประจำวันที่ ${ddmmyyyy(daySummary.dayKey)} เรียบร้อยแล้ว`)
        await loadPendingSales(profile.branch_id)
    }
    setProcessing(false)
  }

  const executeCloseAll = async () => {
    if (!profile) return
    setConfirmState(prev => ({ ...prev, isOpen: false }))
    setProcessing(true)
    
    // วนลูปปิดทีละวัน (หรือจะแก้ Server Action ให้รับ Array ก็ได้)
    let errorCount = 0
    for (const d of pendingDays) { 
        const res = await closeDayAction(profile.branch_id, d.dayKey) 
        if (res.error) errorCount++
    }

    await loadPendingSales(profile.branch_id)
    setProcessing(false)

    if (errorCount > 0) {
        showAlert('error', 'ปิดยอดไม่ครบทุกรายการ', `มีบางรายการเกิดข้อผิดพลาด (${errorCount} รายการ)`)
    } else {
        showAlert('success', 'ดำเนินการเสร็จสิ้น', 'ปิดยอดค้างทั้งหมดเรียบร้อยแล้ว')
    }
  }

  const totalPendingAmount = pendingDays.reduce((sum, d) => sum + d.total, 0)
  const totalPendingBills = pendingDays.reduce((sum, d) => sum + d.bills, 0)

  if (loading) return (
    <div className="flex flex-col h-[60vh] items-center justify-center text-slate-400 gap-3">
      <Loader2 className="w-8 h-8 animate-spin text-blue-500"/> 
      <p>กำลังโหลดข้อมูล...</p>
    </div>
  )

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <CalendarCheck className="w-7 h-7 text-blue-600" />
            ปิดรอบรายวัน (Hidden Backend)
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            สาขา: <span className="font-bold text-slate-700">{profile?.branch_name}</span> | 
            ผู้ทำรายการ: {profile?.full_name}
          </p>
        </div>
        <div className="flex gap-2">
           <button 
             onClick={() => profile && loadPendingSales(profile.branch_id)}
             disabled={processing}
             className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 hover:text-blue-600 font-bold transition-all disabled:opacity-50"
           >
             <RefreshCcw className={`w-4 h-4 ${processing ? 'animate-spin' : ''}`} /> 
             รีเฟรช
           </button>
           
           {pendingDays.length > 0 && (
             <button 
               onClick={prepareCloseAll}
               disabled={processing}
               className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-xl hover:bg-slate-900 font-bold shadow-lg shadow-slate-200 transition-all disabled:opacity-50"
             >
               <CheckCircle2 className="w-4 h-4" /> 
               ปิดยอดทั้งหมด ({pendingDays.length})
             </button>
           )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center h-32">
           <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-orange-50 text-orange-600 rounded-lg"><AlertCircle className="w-4 h-4"/></div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">วันค้างปิดรอบ</span>
           </div>
           <div className="text-3xl font-black text-slate-800">{pendingDays.length} <span className="text-lg font-medium text-slate-400">วัน</span></div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center h-32">
           <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg"><Banknote className="w-4 h-4"/></div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">ยอดเงินรอปิดงบ</span>
           </div>
           <div className="text-3xl font-black text-blue-600">฿{fmtMoney(totalPendingAmount)}</div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center h-32">
           <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg"><Wallet className="w-4 h-4"/></div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">จำนวนบิลรวม</span>
           </div>
           <div className="text-3xl font-black text-emerald-700">{totalPendingBills.toLocaleString()} <span className="text-lg font-medium text-slate-400">บิล</span></div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden min-h-[300px] flex flex-col">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white">
           <h2 className="font-bold text-slate-800 flex items-center gap-2">
             <CalendarDays className="w-5 h-5 text-blue-600"/> รายการรอปิดยอด (เฉพาะสาขานี้)
           </h2>
        </div>
        
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left">
            <thead className="bg-white border-b border-slate-100 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">วันที่</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-right">จำนวนบิล</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-right">เงินสด</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-right">โอน/QR</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-right">ยอดรวม</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {pendingDays.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-300">
                       <CheckCircle2 className="w-12 h-12 text-slate-200" />
                       <p className="font-medium text-slate-400">ไม่มีรายการค้างปิดรอบ</p>
                    </div>
                  </td>
                </tr>
              ) : (
                pendingDays.map((d) => (
                  <tr key={d.dayKey} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                       <span className="text-sm font-bold text-slate-700 font-mono">{ddmmyyyy(d.dayKey)}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 text-right font-mono">{d.bills}</td>
                    <td className="px-6 py-4 text-sm text-slate-500 font-mono text-right">{fmtMoney(d.cash_total)}</td>
                    <td className="px-6 py-4 text-sm text-slate-500 font-mono text-right">{fmtMoney(d.promptpay_total)}</td>
                    <td className="px-6 py-4 text-right">
                       <span className="text-sm font-bold text-slate-900 font-mono">฿{fmtMoney(d.total)}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                       <button 
                         onClick={() => prepareCloseDay(d)}
                         disabled={processing}
                         className="px-4 py-1.5 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all shadow-sm disabled:opacity-50"
                       >
                         ปิดรอบ
                       </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* =================================================================================== */}
      {/* 🔥 ALERT MODAL (Success / Error) */}
      {/* =================================================================================== */}
      {alertState.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col items-center p-6 animate-in zoom-in-95 duration-200">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${alertState.type === 'success' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                    {alertState.type === 'success' ? <CheckCircle2 className="w-8 h-8"/> : <XCircle className="w-8 h-8"/>}
                </div>
                <h3 className={`text-xl font-bold mb-2 ${alertState.type === 'success' ? 'text-slate-800' : 'text-red-600'}`}>
                    {alertState.title}
                </h3>
                <p className="text-slate-500 text-center mb-6 text-sm leading-relaxed">
                    {alertState.message}
                </p>
                <button 
                    onClick={() => setAlertState(prev => ({ ...prev, isOpen: false }))}
                    className={`w-full py-3 rounded-xl font-bold text-white shadow-lg transition-transform active:scale-95 ${alertState.type === 'success' ? 'bg-green-600 hover:bg-green-700 shadow-green-200' : 'bg-slate-800 hover:bg-slate-900 shadow-slate-200'}`}
                >
                    รับทราบ
                </button>
            </div>
        </div>
      )}

      {/* =================================================================================== */}
      {/* 🔥 CONFIRM MODAL (Yes / No) */}
      {/* =================================================================================== */}
      {confirmState.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col p-6 animate-in zoom-in-95 duration-200 relative">
                <button onClick={() => setConfirmState(prev => ({ ...prev, isOpen: false }))} className="absolute top-4 right-4 text-slate-300 hover:text-slate-500 transition"><X className="w-5 h-5"/></button>
                
                <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <HelpCircle className="w-6 h-6"/>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">
                            {confirmState.title}
                        </h3>
                        <p className="text-slate-500 text-sm mt-1 leading-relaxed">
                            {confirmState.message}
                        </p>
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100">
                    <button 
                        onClick={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
                        className="px-5 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-colors"
                    >
                        ยกเลิก
                    </button>
                    <button 
                        onClick={() => confirmState.action && confirmState.action()}
                        className="px-6 py-2.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 transition-transform active:scale-95"
                    >
                        ยืนยันการปิดยอด
                    </button>
                </div>
            </div>
        </div>
      )}

    </div>
  )
}