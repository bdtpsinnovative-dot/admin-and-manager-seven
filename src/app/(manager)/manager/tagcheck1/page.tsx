"use client"

import { useEffect, useState } from "react"
import { fetchTagDiscrepancies, type TagDiscrepancy, type TagSummary } from "@/actions/tagcheck1"
import { AlertCircle, Tag, PackageX, CheckCircle2, Boxes, ScanLine } from "lucide-react"

export default function TagCheckPage() {
  const [items, setItems] = useState<TagDiscrepancy[]>([])
  const [summary, setSummary] = useState<TagSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      const result = await fetchTagDiscrepancies()
      setItems(result.data)
      setSummary(result.summary)
      setFetchError(result.error)
      setLoading(false)
    }
    loadData()
  }, [])

  if (loading) {
    return <div className="p-8 text-center text-slate-500">กำลังโหลดข้อมูล...</div>
  }

  if (fetchError) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-700">
          <div className="font-bold mb-2">เกิด Error ครับ</div>
          <div className="text-sm font-mono break-all">{fetchError}</div>
        </div>
      </div>
    )
  }

  const excessTags = items.filter(item => item.diff > 0)
  const missingTags = items.filter(item => item.diff < 0)
  const isBalanced = summary && summary.total_stock_qty === summary.total_tag_count

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8 pb-20">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Tag className="w-6 h-6 text-blue-600" />
          ตรวจสอบความถูกต้องของ RFID Tag
        </h1>
        <p className="text-slate-500 mt-1">
          เปรียบเทียบยอดระหว่างตารางสต็อก (ยอดจริง) และจำนวน Tag ในระบบ
        </p>
      </div>

      {/* Summary Panel */}
      {summary ? (
        <div className={`rounded-3xl p-6 border ${isBalanced ? "bg-emerald-50 border-emerald-200" : "bg-orange-50 border-orange-200"}`}>
          <div className="flex items-center gap-2 mb-4">
            {isBalanced
              ? <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              : <AlertCircle className="w-5 h-5 text-orange-500" />
            }
            <span className={`font-bold text-lg ${isBalanced ? "text-emerald-700" : "text-orange-700"}`}>
              {isBalanced ? "ยอดสต็อกตรงกับ Tag ทั้งหมด" : "ยอดรวมไม่ตรงกัน — ต้องตรวจสอบ"}
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-4 text-center shadow-sm">
              <div className="text-2xl font-black text-slate-800">{summary.total_products.toLocaleString()}</div>
              <div className="text-xs text-slate-500 mt-1 flex items-center justify-center gap-1">
                <Boxes className="w-3 h-3" /> SKU ทั้งหมด
              </div>
            </div>
            <div className="bg-white rounded-2xl p-4 text-center shadow-sm">
              <div className="text-2xl font-black text-blue-700">{summary.total_stock_qty.toLocaleString()}</div>
              <div className="text-xs text-slate-500 mt-1">ยอดสต็อกรวม</div>
            </div>
            <div className="bg-white rounded-2xl p-4 text-center shadow-sm">
              <div className={`text-2xl font-black ${isBalanced ? "text-emerald-600" : "text-orange-500"}`}>
                {summary.total_tag_count.toLocaleString()}
              </div>
              <div className="text-xs text-slate-500 mt-1 flex items-center justify-center gap-1">
                <ScanLine className="w-3 h-3" /> ยอด Tag รวม
              </div>
            </div>
            <div className="bg-white rounded-2xl p-4 text-center shadow-sm">
              <div className={`text-2xl font-black ${isBalanced ? "text-emerald-600" : "text-rose-600"}`}>
                {(summary.total_tag_count - summary.total_stock_qty > 0 ? "+" : "") + (summary.total_tag_count - summary.total_stock_qty).toLocaleString()}
              </div>
              <div className="text-xs text-slate-500 mt-1">ผลต่าง (Tag − สต็อก)</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-50 border border-slate-200 rounded-3xl p-4 text-sm text-slate-500 text-center">
          ไม่สามารถโหลดยอดรวมได้ (อาจเป็นเพราะ table stock / rfid_tags ไม่ตรง schema)
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* ฝั่งที่ 1: Tag เกิน */}
        <div className="bg-white border border-rose-100 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center gap-2 text-rose-600 font-bold mb-4">
            <AlertCircle className="w-5 h-5" />
            <h2>Tag เกินสต็อกจริง (ต้องลบออก)</h2>
            <span className="ml-auto bg-rose-100 text-rose-700 px-3 py-1 rounded-full text-sm">
              {excessTags.length} รายการ
            </span>
          </div>
          
          <div className="space-y-3">
            {excessTags.length === 0 ? (
              <p className="text-slate-400 text-center py-8">ไม่มีรายการ Tag เกิน</p>
            ) : (
              excessTags.map((item) => (
                <div key={item.product_id} className="p-4 bg-rose-50/50 rounded-2xl border border-rose-100 flex justify-between items-center gap-4">
                  <div className="flex items-center gap-3">
                    {/* 👈 แทรกรูปภาพตรงนี้ */}
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.product_name} className="w-12 h-12 rounded-lg object-cover border border-rose-200" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-slate-200 flex items-center justify-center text-[10px] text-slate-400">No Pic</div>
                    )}
                    <div>
                      <div className="font-bold text-slate-800 text-sm">{item.product_name}</div>
                      <div className="text-xs text-slate-500 font-mono mt-1">{item.barcode || 'ไม่มีบาร์โค้ด'}</div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-rose-600 font-black text-lg">เกินมา {item.diff} อัน</div>
                    <div className="text-xs text-slate-500">
                      สต็อก: {item.stock_qty} | Tag: {item.tag_count}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ฝั่งที่ 2: Tag ขาด */}
        <div className="bg-white border border-amber-100 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center gap-2 text-amber-600 font-bold mb-4">
            <PackageX className="w-5 h-5" />
            <h2>Tag ขาด (ต้องสร้างเพิ่ม)</h2>
            <span className="ml-auto bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-sm">
              {missingTags.length} รายการ
            </span>
          </div>

          <div className="space-y-3">
            {missingTags.length === 0 ? (
              <p className="text-slate-400 text-center py-8">ไม่มีรายการ Tag ขาด</p>
            ) : (
              missingTags.map((item) => (
                <div key={item.product_id} className="p-4 bg-amber-50/50 rounded-2xl border border-amber-100 flex justify-between items-center gap-4">
                  <div className="flex items-center gap-3">
                    {/* 👈 แทรกรูปภาพตรงนี้เหมือนกัน */}
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.product_name} className="w-12 h-12 rounded-lg object-cover border border-amber-200" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-slate-200 flex items-center justify-center text-[10px] text-slate-400">No Pic</div>
                    )}
                    <div>
                      <div className="font-bold text-slate-800 text-sm">{item.product_name}</div>
                      <div className="text-xs text-slate-500 font-mono mt-1">{item.barcode || 'ไม่มีบาร์โค้ด'}</div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-amber-600 font-black text-lg">ขาดไป {Math.abs(item.diff)} อัน</div>
                    <div className="text-xs text-slate-500">
                      สต็อก: {item.stock_qty} | Tag: {item.tag_count}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}