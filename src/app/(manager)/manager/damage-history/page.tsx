"use client"

import { useState, useEffect } from 'react'
import { getDamageHistory } from '@/actions/damage'
import { History, Package, AlertTriangle, Trash2, RefreshCw } from 'lucide-react'

export default function DamageHistoryPage() {
  const [records, setRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const res = await getDamageHistory()
    if (res.success && res.data) {
      setRecords(res.data)
    } else {
      alert(res.error || "โหลดข้อมูลไม่สำเร็จ")
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-semibold text-slate-500">
        <RefreshCw className="w-8 h-8 animate-spin text-red-500 mb-4" />
        กำลังโหลดประวัติของเสีย...
      </div>
    )
  }

  return (
    <div className="w-full space-y-6 font-sans select-none pb-20">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div>
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Trash2 className="w-6 h-6 text-red-500" />
              ประวัติการตัดสต็อกของเสีย
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              ตรวจสอบรายการสินค้าชำรุดที่ถูกตัดออกจากสาขาของคุณ (50 รายการล่าสุด)
            </p>
          </div>
          <button 
            onClick={loadData} 
            className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> รีเฟรชข้อมูล
          </button>
        </div>

        {/* Summary Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">จำนวนชิ้นที่เสียหายรวม</span>
            <p className="text-2xl font-black text-slate-800 mt-1">
              {records.reduce((sum: number, r: any) => sum + (Number(r.qty) || 0), 0).toLocaleString()} <span className="text-sm font-normal text-slate-500">ชิ้น</span>
            </p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">มูลค่าต้นทุนรวม</span>
            <p className="text-2xl font-black text-slate-700 mt-1">
              ฿{records.reduce((sum: number, r: any) => sum + ((Number(r.products?.cost) || 0) * (Number(r.qty) || 0)), 0).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-rose-200 bg-rose-50/20 shadow-sm">
            <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">มูลค่าราคาขายรวม</span>
            <p className="text-2xl font-black text-rose-600 mt-1">
              ฿{records.reduce((sum: number, r: any) => sum + ((Number(r.products?.price) || 0) * (Number(r.qty) || 0)), 0).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* History List */}
        <div className="space-y-4">
          {records.length === 0 ? (
            <div className="py-16 bg-white rounded-xl text-center text-slate-400 font-medium border border-dashed border-slate-300 flex flex-col items-center">
              <History className="w-12 h-12 mb-3 text-slate-300" />
              ยังไม่มีประวัติการตัดของเสียในสาขานี้
            </div>
          ) : (
            records.map((record: any) => (
              <div 
                key={record.id} 
                className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col md:flex-row items-start md:items-center p-4 gap-4 hover:border-red-200 transition-colors"
              >
                
                {/* Product Image */}
                <div className="w-16 h-16 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 overflow-hidden">
                  {record.products?.image_url ? (
                    <img 
                      src={record.products.image_url} 
                      alt={record.products?.name} 
                      className="w-full h-full object-contain p-1" 
                    />
                  ) : (
                    <Package className="w-6 h-6 text-slate-300" />
                  )}
                </div>

                {/* Product Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-slate-800 truncate">
                    {record.products?.name || 'ไม่ทราบชื่อสินค้า'}
                  </h3>
                  <div className="text-xs text-slate-500 mt-1 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                    <span>บาร์โค้ด: {record.products?.barcode || '-'}</span>
                    <span className="hidden sm:inline text-slate-300">|</span>
                    <span>วันที่: {new Date(record.created_at).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}</span>
                  </div>
                  
                  {/* Reason & User Badge */}
                  <div className="mt-2 flex items-center flex-wrap gap-2">
                    {record.branches?.branch_name && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100">
                        สาขา: {record.branches.branch_name}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-red-50 text-red-600 px-2 py-0.5 rounded border border-red-100">
                      <AlertTriangle className="w-3 h-3" /> สาเหตุ: {record.reason || 'ไม่ได้ระบุ'}
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">
                      โดย: {record.profiles?.full_name || 'ไม่ระบุตัวตน'}
                    </span>
                  </div>
                </div>

                {/* Price, Cost & Damaged Quantity */}
                <div className="mt-3 md:mt-0 w-full md:w-auto flex items-center justify-between md:justify-end gap-4 shrink-0">
                  <div className="text-right text-xs space-y-0.5">
                    <div className="text-slate-500">
                      ต้นทุน: <span className="font-bold text-slate-700">฿{((Number(record.products?.cost) || 0) * (Number(record.qty) || 1)).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      <span className="text-[10px] text-slate-400 block">(@฿{(Number(record.products?.cost) || 0).toLocaleString()})</span>
                    </div>
                    <div className="text-rose-600">
                      ราคาขาย: <span className="font-bold text-rose-600">฿{((Number(record.products?.price) || 0) * (Number(record.qty) || 1)).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      <span className="text-[10px] text-rose-400 block">(@฿{(Number(record.products?.price) || 0).toLocaleString()})</span>
                    </div>
                  </div>

                  <div className="bg-red-50 px-4 py-2 rounded-lg border border-red-100 text-center min-w-[75px]">
                    <span className="block text-[10px] text-red-500 font-bold uppercase tracking-wide mb-0.5">
                      จำนวนที่ตัด
                    </span>
                    <span className="block text-xl font-black text-red-600">
                      -{record.qty}
                    </span>
                  </div>
                </div>

              </div>
            ))
          )}
        </div>
    </div>
  )
}