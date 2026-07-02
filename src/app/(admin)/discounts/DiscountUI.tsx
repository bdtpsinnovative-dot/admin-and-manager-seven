"use client"

import { useState, useRef, useEffect } from "react"
import { createDiscount, toggleDiscountStatus, deleteDiscount, updateDiscount, removeDiscountRule } from "../../../actions/discoun"
import { Loader2, Plus, Trash2, Tag, Search, X, Check, Package, Edit, Save, XCircle, CheckCircle } from "lucide-react"

const R2_BASE = "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/"

function getImageUrl(url: string | null | undefined): string | null {
  if (!url) return null
  if (url.startsWith("http")) return url
  return R2_BASE + url
}

// ── Product Search Picker (multi-select, scrollable) ──────────────────────
function ProductPicker({ products }: { products: any[] }) {
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<any[]>([])

  const filtered = products.filter(p =>
    !query.trim() ||
    p.name?.toLowerCase().includes(query.toLowerCase()) ||
    p.sku?.toLowerCase().includes(query.toLowerCase())
  )

  const toggle = (p: any) => {
    setSelected(prev =>
      prev.some(s => s.id === p.id)
        ? prev.filter(s => s.id !== p.id)
        : [...prev, p]
    )
  }

  const removeOne = (id: any) => setSelected(prev => prev.filter(s => s.id !== id))
  const clearAll = () => setSelected([])
  const selectAll = () => setSelected(filtered)

  const isSelected = (p: any) => selected.some(s => s.id === p.id)

  return (
    <div className="flex flex-col h-full gap-3">
      {/* hidden input — ส่ง JSON array */}
      <input type="hidden" name="product_ids" value={JSON.stringify(selected.map(s => s.id))} />

      {/* Search + stats bar */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="ค้นหาชื่อ หรือ SKU..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-9 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition"
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {/* Select all / clear */}
        <button type="button" onClick={selectAll}
          className="px-3 py-2 text-xs font-semibold text-indigo-600 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition whitespace-nowrap">
          เลือกทั้งหมด ({filtered.length})
        </button>
        {selected.length > 0 && (
          <button type="button" onClick={clearAll}
            className="px-3 py-2 text-xs font-semibold text-slate-500 bg-slate-100 rounded-xl hover:bg-slate-200 transition whitespace-nowrap">
            ล้าง
          </button>
        )}
      </div>

      {/* Selected chips */}
      {selected.length > 0 && (
        <div className="flex-shrink-0 bg-indigo-50 border border-indigo-200 rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-indigo-600">
              เลือกแล้ว {selected.length} รายการ
            </p>
            <button type="button" onClick={clearAll} className="text-[10px] text-indigo-400 hover:text-red-500 transition">ล้างทั้งหมด</button>
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
            {selected.map(p => (
              <div key={p.id} className="flex items-center gap-1.5 bg-white border border-indigo-200 rounded-lg px-2 py-1 shadow-sm">
                <div className="w-5 h-5 rounded overflow-hidden flex-shrink-0">
                  {getImageUrl(p.image_url)
                    ? <img src={getImageUrl(p.image_url)!} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full bg-slate-100 flex items-center justify-center"><Package className="w-3 h-3 text-slate-300" /></div>
                  }
                </div>
                <span className="text-xs text-slate-700 font-medium max-w-[120px] truncate">{p.name || p.sku}</span>
                <button type="button" onClick={() => removeOne(p.id)} className="text-slate-300 hover:text-red-400 transition flex-shrink-0">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scrollable product list */}
      <div className="flex-1 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 min-h-0">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-10">
            <Package className="w-10 h-10 text-slate-200 mb-2" />
            <p className="text-sm text-slate-400">ไม่พบสินค้าที่ตรงกับ &quot;{query}&quot;</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map(p => {
              const imgUrl = getImageUrl(p.image_url)
              const sel = isSelected(p)
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggle(p)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition group
                    ${sel ? 'bg-indigo-50 hover:bg-indigo-100' : 'hover:bg-white'}`}
                >
                  {/* Checkbox */}
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition
                    ${sel ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 group-hover:border-indigo-400'}`}>
                    {sel && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                  </div>
                  {/* Image */}
                  <div className={`w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 border transition
                    ${sel ? 'border-indigo-300' : 'border-slate-200 group-hover:border-indigo-200'}`}>
                    {imgUrl
                      ? <img src={imgUrl} alt={p.name} className="w-full h-full object-cover"
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                      : <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                          <Package className="w-5 h-5 text-slate-300" />
                        </div>
                    }
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold truncate ${sel ? 'text-indigo-700' : 'text-slate-800'}`}>
                      {p.name || '—'}
                    </p>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">{p.sku}</p>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      <p className="text-[10px] text-slate-400 flex-shrink-0">
        {selected.length > 0
          ? `เลือก ${selected.length} จาก ${products.length} รายการ · เว้นว่าง = ใช้กับทุกสินค้า`
          : `${filtered.length} รายการ · ไม่เลือก = ใช้กับทุกสินค้า`
        }
      </p>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function DiscountClient({
  discounts,
  products,
  branches
}: {
  discounts: any[]
  products: any[]
  branches: any[]
}) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  // Edit state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingDiscount, setEditingDiscount] = useState<any | null>(null)
  const [editLoading, setEditLoading] = useState(false)

  // Alert state
  const [alertState, setAlertState] = useState<{
    isOpen: boolean;
    type: 'success' | 'error';
    title: string;
    message: string;
  }>({ isOpen: false, type: 'success', title: '', message: '' })

  // Rule removing loading
  const [removingRuleId, setRemovingRuleId] = useState<number | null>(null)

  const handleSubmit = async (formData: FormData) => {
    setLoading(true)
    const res = await createDiscount(formData)
    setLoading(false)
    if (res?.error) {
      setAlertState({ isOpen: true, type: 'error', title: 'เกิดข้อผิดพลาด', message: res.error })
    } else {
      setIsModalOpen(false)
      setAlertState({ isOpen: true, type: 'success', title: 'สำเร็จ!', message: 'สร้างส่วนลดใหม่เรียบร้อยแล้ว' })
    }
  }

  const handleEdit = async (formData: FormData) => {
    setEditLoading(true)
    const res = await updateDiscount(formData)
    setEditLoading(false)
    if (res?.error) {
      setAlertState({ isOpen: true, type: 'error', title: 'เกิดข้อผิดพลาด', message: res.error })
    } else {
      setIsEditModalOpen(false)
      setEditingDiscount(null)
      setAlertState({ isOpen: true, type: 'success', title: 'สำเร็จ!', message: 'แก้ไขส่วนลดเรียบร้อยแล้ว' })
    }
  }

  const handleRemoveRule = async (ruleId: number) => {
    setRemovingRuleId(ruleId)
    const res = await removeDiscountRule(ruleId)
    setRemovingRuleId(null)
    if (res?.error) {
      setAlertState({ isOpen: true, type: 'error', title: 'เกิดข้อผิดพลาด', message: res.error })
    } else {
      setAlertState({ isOpen: true, type: 'success', title: 'สำเร็จ!', message: 'ถอดสินค้าออกจากส่วนลดแล้ว' })
    }
  }

  return (
    <div className="p-6 bg-slate-50 min-h-screen font-sans">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Tag className="w-6 h-6 text-indigo-600" /> จัดการส่วนลด (Discounts)
          </h1>
          <p className="text-slate-500 text-sm mt-1">สร้างและจัดการโปรโมชั่น คูปองส่วนลด</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center gap-2 text-sm font-bold"
        >
          <Plus className="w-4 h-4" /> สร้างส่วนลดใหม่
        </button>
      </div>

      {/* Discount Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">ชื่อโปรโมชั่น</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">มูลค่า</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">ใช้กับ</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-center">สถานะ</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {discounts.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-sm">
                  ยังไม่มีส่วนลด — กด &quot;สร้างส่วนลดใหม่&quot; เพื่อเริ่มต้น
                </td>
              </tr>
            ) : discounts.map((item) => {
              // หาสินค้าที่ผูกกับ rules พร้อม rule.id
              const linkedItems = (item.discount_rules || [])
                .map((r: any) => {
                  const product = r.product_id ? products.find(p => p.id === r.product_id) : null
                  return product ? { ...product, ruleId: r.id } : null
                })
                .filter(Boolean)

              return (
                <tr key={item.id} className="hover:bg-slate-50 transition group">
                  <td className="px-6 py-4">
                    <p className="font-bold text-sm text-slate-800">{item.name}</p>
                    {item.code && <p className="text-xs text-slate-400 font-mono mt-0.5">{item.code}</p>}
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg text-xs font-bold">
                      {item.discount_type === 'PERCENT' ? `${item.value}%` : `฿${item.value}`}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {linkedItems.length === 0 ? (
                      <span className="text-xs text-slate-400">ทุกสินค้า</span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {linkedItems.slice(0, 4).map((lp: any) => (
                          <div key={lp.ruleId} className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 group/chip">
                            <div className="w-5 h-5 rounded overflow-hidden flex-shrink-0">
                              {getImageUrl(lp.image_url)
                                ? <img src={getImageUrl(lp.image_url)!} alt="" className="w-full h-full object-cover" />
                                : <Package className="w-3 h-3 text-slate-300" />
                              }
                            </div>
                            <span className="text-xs text-slate-600 font-medium max-w-[100px] truncate">{lp.name || lp.sku}</span>
                            {/* ปุ่มถอดสินค้าออก */}
                            <button
                              onClick={() => handleRemoveRule(lp.ruleId)}
                              disabled={removingRuleId === lp.ruleId}
                              className="text-slate-300 hover:text-red-500 transition flex-shrink-0 opacity-0 group-hover/chip:opacity-100"
                              title="ถอดสินค้านี้ออก"
                            >
                              {removingRuleId === lp.ruleId
                                ? <Loader2 className="w-3 h-3 animate-spin" />
                                : <X className="w-3 h-3" />
                              }
                            </button>
                          </div>
                        ))}
                        {linkedItems.length > 4 && (
                          <div className="flex items-center px-2 py-1 bg-indigo-50 border border-indigo-200 rounded-lg">
                            <span className="text-xs font-bold text-indigo-600">+{linkedItems.length - 4}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => toggleDiscountStatus(item.id, item.active)}
                      className={`h-6 w-11 rounded-full transition-colors ${item.active ? 'bg-green-500' : 'bg-slate-300'}`}
                    >
                      <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform ${item.active ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {/* ปุ่มแก้ไข */}
                      <button
                        onClick={() => { setEditingDiscount(item); setIsEditModalOpen(true); }}
                        className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition"
                        title="แก้ไขส่วนลด"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {/* ปุ่มลบ */}
                      <button
                        onClick={() => {
                          if (confirm("ต้องการลบส่วนลดนี้ออกถาวรใช่หรือไม่?")) {
                            deleteDiscount(item.id)
                          }
                        }}
                        className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition"
                        title="ลบส่วนลด"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* =================================================================================== */}
      {/* ALERT MODAL */}
      {/* =================================================================================== */}
      {alertState.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" style={{ animation: 'fadeIn 0.2s ease-out' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col items-center p-8" style={{ animation: 'scaleIn 0.25s ease-out' }}>
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${alertState.type === 'success' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
              {alertState.type === 'success' ? <CheckCircle className="w-8 h-8" /> : <XCircle className="w-8 h-8" />}
            </div>
            <h3 className={`text-xl font-bold mb-2 ${alertState.type === 'success' ? 'text-slate-800' : 'text-red-600'}`}>
              {alertState.title}
            </h3>
            <p className="text-slate-500 text-center mb-6 text-sm leading-relaxed">
              {alertState.message}
            </p>
            <button
              onClick={() => {
                setAlertState({ ...alertState, isOpen: false });
                if (alertState.type === 'success') window.location.reload();
              }}
              className={`w-full py-3 rounded-xl font-bold text-white shadow-lg transition-all active:scale-[0.97] ${alertState.type === 'success' ? 'bg-green-600 hover:bg-green-700 shadow-green-200' : 'bg-slate-800 hover:bg-slate-900 shadow-slate-200'}`}
            >
              {alertState.type === 'success' ? 'ตกลง' : 'รับทราบ'}
            </button>
          </div>
        </div>
      )}

      {/* =================================================================================== */}
      {/* EDIT MODAL */}
      {/* =================================================================================== */}
      {isEditModalOpen && editingDiscount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" style={{ animation: 'fadeIn 0.2s ease-out' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]" style={{ animation: 'scaleIn 0.25s ease-out' }}>

            {/* Header */}
            <div className="flex justify-between items-center px-6 py-5 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-md">
                  <Edit className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">แก้ไขส่วนลด</h2>
                  <p className="text-[11px] text-slate-500">{editingDiscount.name}</p>
                </div>
              </div>
              <button onClick={() => { setIsEditModalOpen(false); setEditingDiscount(null); }} className="p-2 hover:bg-slate-200/50 rounded-xl transition">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto p-6">
              <form onSubmit={async (e) => { e.preventDefault(); await handleEdit(new FormData(e.currentTarget)); }} className="space-y-5">
                <input type="hidden" name="discount_id" value={editingDiscount.id} />

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">ชื่อโปรโมชั่น</label>
                  <input
                    name="name"
                    defaultValue={editingDiscount.name}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">ประเภท</label>
                    <select
                      name="discount_type"
                      defaultValue={editingDiscount.discount_type}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-300 transition"
                    >
                      <option value="PERCENT">เปอร์เซ็นต์ (%)</option>
                      <option value="FIXED">จำนวนเงิน (฿)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">มูลค่า</label>
                    <input
                      name="value"
                      type="number"
                      step="0.01"
                      min="0"
                      defaultValue={editingDiscount.value}
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-300 transition font-mono"
                    />
                  </div>
                </div>

                {branches.length > 0 && (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">ใช้กับสาขา</label>
                    <select
                      name="branch_id"
                      defaultValue={editingDiscount.discount_rules?.[0]?.branch_id || ""}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-300 transition"
                    >
                      <option value="">ทุกสาขา</option>
                      {branches.map((b: any) => (
                        <option key={b.id} value={b.id}>{b.branch_name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* แสดงสินค้าที่ผูกอยู่ — ถอดออกได้ */}
                {(() => {
                  const linkedItems = (editingDiscount.discount_rules || [])
                    .map((r: any) => {
                      const product = r.product_id ? products.find(p => p.id === r.product_id) : null
                      return product ? { ...product, ruleId: r.id } : null
                    })
                    .filter(Boolean)

                  if (linkedItems.length === 0) return null

                  return (
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                        สินค้าที่ผูกอยู่ ({linkedItems.length} รายการ)
                      </label>
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 max-h-48 overflow-y-auto space-y-1.5">
                        {linkedItems.map((lp: any) => (
                          <div key={lp.ruleId} className="flex items-center gap-3 bg-white rounded-lg px-3 py-2 border border-slate-100 group/item hover:border-red-200 transition">
                            <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 border border-slate-200">
                              {getImageUrl(lp.image_url)
                                ? <img src={getImageUrl(lp.image_url)!} alt="" className="w-full h-full object-cover" />
                                : <div className="w-full h-full bg-slate-100 flex items-center justify-center"><Package className="w-4 h-4 text-slate-300" /></div>
                              }
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-700 truncate">{lp.name || '—'}</p>
                              <p className="text-[10px] text-slate-400 font-mono">{lp.sku}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveRule(lp.ruleId)}
                              disabled={removingRuleId === lp.ruleId}
                              className="text-slate-300 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition opacity-0 group-hover/item:opacity-100 disabled:opacity-50"
                              title="ถอดสินค้านี้ออก"
                            >
                              {removingRuleId === lp.ruleId
                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                : <X className="w-4 h-4" />
                              }
                            </button>
                          </div>
                        ))}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1.5">กดปุ่ม X เพื่อถอดสินค้าออกจากส่วนลดนี้</p>
                    </div>
                  )
                })()}

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button type="button" onClick={() => { setIsEditModalOpen(false); setEditingDiscount(null); }} className="px-5 py-2.5 text-sm text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition">
                    ยกเลิก
                  </button>
                  <button type="submit" disabled={editLoading} className="px-6 py-2.5 text-sm bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition font-bold flex items-center gap-2 disabled:opacity-50">
                    {editLoading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        กำลังบันทึก...
                      </span>
                    ) : (
                      <><Save className="w-4 h-4" /> บันทึกการแก้ไข</>
                    )}
                  </button>
                </div>

              </form>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================================== */}
      {/* CREATE MODAL — ใหญ่ 2 คอลัมน์ */}
      {/* =================================================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[88vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">

            {/* Header */}
            <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100 flex-shrink-0">
              <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                <Tag className="w-5 h-5 text-indigo-500" /> สร้างส่วนลดใหม่
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form action={handleSubmit} className="flex flex-1 min-h-0">

              {/* ── ซ้าย: ฟอร์มตั้งค่าส่วนลด ── */}
              <div className="w-80 flex-shrink-0 border-r border-slate-100 flex flex-col">
                <div className="flex-1 overflow-y-auto px-8 py-6 space-y-5">

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">ชื่อโปรโมชั่น *</label>
                    <input
                      name="name"
                      required
                      placeholder="เช่น ลดราคาฤดูฝน 2025"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">ประเภทส่วนลด</label>
                    <select
                      name="discount_type"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-300 transition"
                    >
                      <option value="PERCENT">เปอร์เซ็นต์ (%)</option>
                      <option value="FIXED">จำนวนเงิน (฿)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">มูลค่า *</label>
                    <input
                      name="value"
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      placeholder="เช่น 10 หรือ 500"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-300 transition"
                    />
                  </div>

                  {branches.length > 0 && (
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">ใช้กับสาขา</label>
                      <select
                        name="branch_id"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-300 transition"
                      >
                        <option value="">ทุกสาขา</option>
                        {branches.map((b: any) => (
                          <option key={b.id} value={b.id}>{b.branch_name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                </div>

                {/* Actions */}
                <div className="px-8 py-5 border-t border-slate-100 flex gap-3 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-500 hover:text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 disabled:opacity-50 flex items-center justify-center gap-2 transition"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    {loading ? "กำลังบันทึก..." : "บันทึก"}
                  </button>
                </div>
              </div>

              {/* ── ขวา: เลือกสินค้า ── */}
              <div className="flex-1 flex flex-col min-h-0 px-8 py-6">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-4 flex-shrink-0">
                  เลือกสินค้าที่ใช้ส่วนลด
                </p>
                <div className="flex-1 min-h-0">
                  <ProductPicker products={products} />
                </div>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Global Animations */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.92); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>

    </div>
  )
}
