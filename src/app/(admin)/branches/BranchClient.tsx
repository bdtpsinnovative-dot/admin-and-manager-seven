"use client"

import { useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createBranch, deleteBranch, updateBranchType, updateBranchLocation } from "../../../actions/branches"
import dynamic from 'next/dynamic'

const MapPicker = dynamic(() => import('./MapPicker'), { 
  ssr: false, 
  loading: () => (
    <div className="h-[250px] w-full bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 text-sm animate-pulse border border-slate-200">
      กำลังโหลดแผนที่...
    </div>
  ) 
})

interface Branch {
  id: number
  branch_code: string
  branch_name: string
  branch_type: 'SHOWROOM' | 'FACTORY'
  latitude: number | null
  longitude: number | null
  created_at: string
}

export default function BranchClient({ initialBranches }: { initialBranches: Branch[] }) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  
  const [loading, setLoading] = useState(false)
  const [updatingId, setUpdatingId] = useState<number | null>(null)
  const [toast, setToast] = useState<{ type: 'ok'|'err'|'warn', title: string, msg: string } | null>(null)
  const [filterType, setFilterType] = useState<'ALL' | 'SHOWROOM' | 'FACTORY'>('ALL')
  
  const [isOpenModal, setIsOpenModal] = useState(false)
  const [showMap, setShowMap] = useState(false) 
  
  const [editModeBranch, setEditModeBranch] = useState<Branch | null>(null)
  const [geoLoc, setGeoLoc] = useState({ lat: "", lng: "" })
  const [mapsUrl, setMapsUrl] = useState("")

  const showToast = (type: 'ok'|'err'|'warn', title: string, msg: string) => {
    setToast({ type, title, msg })
    setTimeout(() => setToast(null), 3000)
  }

  const handleLocationSelect = useCallback((lat: string, lng: string) => {
    setGeoLoc(prev => {
      if (prev.lat === lat && prev.lng === lng) return prev
      return { lat, lng }
    })
  }, [])

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      showToast('warn', 'ไม่รองรับ', 'เบราว์เซอร์นี้ไม่รองรับการดึงพิกัด')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGeoLoc({ lat: position.coords.latitude.toString(), lng: position.coords.longitude.toString() })
        showToast('ok', 'ดึงพิกัดสำเร็จ', 'ดึงตำแหน่งของคุณเรียบร้อย')
      },
      () => showToast('err', 'ล้มเหลว', 'กรุณาอนุญาตสิทธิ์ตำแหน่ง')
    )
  }

  const handleParseMapsUrl = (url: string) => {
    setMapsUrl(url)
    if (!url.trim()) return

    const regexAt = /@(-?\d+\.\d+),(-?\d+\.\d+)/
    const regexQ = /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/
    const regexRaw = /^(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)$/

    const match = url.match(regexAt) || url.match(regexQ) || url.match(regexRaw)

    if (match) {
      const lat = match[1]
      const lng = match[2]
      setGeoLoc({ lat, lng })
      showToast('ok', 'แยกพิกัดสำเร็จ', `ดึงค่า Lat: ${lat}, Lng: ${lng} เรียบร้อย`)
    } else if (url.includes("goo.gl") || url.includes("maps.app.goo.gl")) {
      showToast('warn', 'ลิงก์ไม่รองรับ', 'ลิงก์ย่อไม่มีข้อมูลพิกัด กรุณาใช้ลิงก์เต็มจากเบราว์เซอร์ครับ')
    }
  }

  const handleOpenAdd = () => {
    setEditModeBranch(null)
    setGeoLoc({ lat: "", lng: "" })
    setMapsUrl("")
    setShowMap(false)
    setIsOpenModal(true)
  }

  const handleOpenEditLocation = (branch: Branch) => {
    setEditModeBranch(branch)
    setGeoLoc({ 
      lat: branch.latitude ? branch.latitude.toString() : "", 
      lng: branch.longitude ? branch.longitude.toString() : "" 
    })
    setMapsUrl("")
    setShowMap(true) 
    setIsOpenModal(true)
  }

  const handleCloseModal = () => {
    setIsOpenModal(false)
    setTimeout(() => {
      setEditModeBranch(null)
      setShowMap(false)
      setMapsUrl("")
    }, 200)
  }

  const handleFormSubmit = async (formData: FormData) => {
    setLoading(true)

    if (editModeBranch) {
      if (!geoLoc.lat || !geoLoc.lng) {
        showToast('warn', 'แจ้งเตือน', 'กรุณาระบุพิกัดให้ครบถ้วนก่อนบันทึก')
        setLoading(false)
        return
      }
      
      const res = await updateBranchLocation(editModeBranch.id, Number(geoLoc.lat), Number(geoLoc.lng))
      
      if (res.error) {
        showToast('err', 'อัปเดตไม่สำเร็จ', res.error)
      } else {
        showToast('ok', 'อัปเดตสำเร็จ', 'บันทึกพิกัดใหม่เรียบร้อย')
        handleCloseModal()
        router.refresh()
      }
    } else {
      const res = await createBranch(formData)
      if (res.error) {
        showToast('err', 'บันทึกไม่สำเร็จ', res.error)
      } else {
        showToast('ok', 'บันทึกสำเร็จ', res.message || "เพิ่มข้อมูลเรียบร้อย")
        formRef.current?.reset()
        handleCloseModal()
        router.refresh()
      }
    }
    setLoading(false)
  }

  const handleUpdateType = async (id: number, newType: 'SHOWROOM' | 'FACTORY') => {
    setUpdatingId(id)
    const res = await updateBranchType(id, newType)
    setUpdatingId(null)
    if (res.error) showToast('err', 'อัปเดตไม่สำเร็จ', res.error)
    else {
      showToast('ok', 'เปลี่ยนสำเร็จ', 'สลับประเภทเรียบร้อย')
      router.refresh()
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("ยืนยันการลบสาขานี้?")) return
    const res = await deleteBranch(id)
    if (res.error) showToast('err', 'ลบไม่สำเร็จ', res.error)
    else {
      showToast('ok', 'ลบสำเร็จ', 'ลบข้อมูลเรียบร้อย')
      router.refresh()
    }
  }

  const dtFmt = new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short" })
  const filteredBranches = initialBranches.filter(b => filterType === 'ALL' ? true : b.branch_type === filterType)

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-800 pb-20">
      
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/70 backdrop-blur-md border-b border-slate-200/60">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Branches Management</h1>
            <p className="text-sm text-slate-500 mt-0.5">จัดการสาขา โรงงาน และพิกัดแผนที่</p>
          </div>
          <button
            onClick={handleOpenAdd}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-4 py-2.5 rounded-xl shadow-md transition-all active:scale-95"
          >
            + เพิ่มสถานที่ใหม่
          </button>
        </div>
      </header>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 w-[min(400px,90vw)] animate-in fade-in slide-in-from-top-4">
          <div className={`rounded-xl border shadow-lg p-4 flex items-start gap-3 bg-white ${toast.type === 'ok' ? 'border-emerald-100' : toast.type === 'warn' ? 'border-amber-100' : 'border-rose-100'}`}>
            <div className={`mt-0.5 w-2.5 h-2.5 rounded-full shrink-0 ${toast.type === 'ok' ? 'bg-emerald-500' : toast.type === 'warn' ? 'bg-amber-500' : 'bg-rose-500'}`} />
            <div className="flex-1">
              <h4 className="text-sm font-bold text-slate-800">{toast.title}</h4>
              <p className="text-sm text-slate-500 mt-0.5">{toast.msg}</p>
            </div>
            <button onClick={() => setToast(null)} className="text-slate-400 hover:text-slate-600">✕</button>
          </div>
        </div>
      )}

      {/* Main Table */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="rounded-2xl border border-slate-200/60 bg-white shadow-sm overflow-hidden min-h-[500px]">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-base font-bold text-slate-800">รายการทั้งหมด</h2>
            <div className="flex bg-slate-100/80 p-1 rounded-lg">
              {['ALL', 'SHOWROOM', 'FACTORY'].map((type) => (
                <button 
                  key={type}
                  onClick={() => setFilterType(type as any)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${filterType === type ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  {type === 'ALL' ? 'ทั้งหมด' : type === 'SHOWROOM' ? 'โชว์รูม' : 'โรงงาน'}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider w-[15%]">รหัส</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider w-[20%]">ประเภท</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">ชื่อสถานที่</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">พิกัด</th>
                  <th className="px-6 py-4 w-[5%]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredBranches.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center text-slate-400 text-sm">ไม่มีข้อมูล</td>
                  </tr>
                ) : (
                  filteredBranches.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-6 py-4 font-mono text-sm font-bold text-slate-700">{r.branch_code}</td>
                      <td className="px-6 py-4">
                        <select
                          value={r.branch_type}
                          onChange={(e) => handleUpdateType(r.id, e.target.value as any)}
                          disabled={updatingId === r.id}
                          className={`text-xs font-bold rounded-full px-3 py-1.5 cursor-pointer outline-none border text-center ${r.branch_type === 'SHOWROOM' ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' : 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100'} ${updatingId === r.id ? 'opacity-50 cursor-wait' : ''}`}
                        >
                          <option value="SHOWROOM">โชว์รูม</option>
                          <option value="FACTORY">โรงงาน</option>
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-semibold text-slate-800">{r.branch_name}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{r.created_at ? dtFmt.format(new Date(r.created_at)) : "-"}</div>
                      </td>
                      <td className="px-6 py-4">
                        {r.latitude && r.longitude ? (
                          <div className="flex flex-col gap-2.5">
                            {/* 🗺️ โซน Mini Map ที่ใหญ่ขึ้นและซูมเลื่อนได้เต็มที่ */}
                            <div className="h-40 w-72 rounded-xl overflow-hidden border border-slate-200 shrink-0 shadow-sm relative group bg-slate-100">
                              <iframe
                                width="100%"
                                height="100%"
                                frameBorder="0"
                                scrolling="no"
                                marginHeight={0}
                                marginWidth={0}
                                // ลบ pointer-events-none ออกไปแล้ว ทำให้ตอบสนองเมาส์ได้
                                src={`https://maps.google.com/maps?q=${r.latitude},${r.longitude}&hl=th&z=15&output=embed`}
                                className="w-full h-full" 
                              ></iframe>
                              
                              {/* ไอคอนเปิดหน้าเต็มจอ แอบอยู่มุมขวาบน จะโผล่มาตอนเอาเมาส์ชี้ */}
                              <a 
                                href={`https://maps.google.com/maps?q=${r.latitude},${r.longitude}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="absolute top-2 right-2 bg-white/95 hover:bg-white text-slate-700 p-1.5 rounded-lg shadow-md opacity-0 group-hover:opacity-100 transition-all border border-slate-200 flex items-center justify-center"
                                title="เปิด Google Maps เต็มจอ"
                              >
                                ↗️
                              </a>
                            </div>

                            {/* ✏️ โซนโชว์พิกัดและปุ่มแก้ไข (จัดเรียงใหม่สวยๆ) */}
                            <div className="flex items-center justify-between w-72">
                              <div className="text-[11px] text-slate-500 font-mono bg-slate-50 px-2 py-1 rounded-md border border-slate-200/60 shadow-sm">
                                {Number(r.latitude).toFixed(4)}, {Number(r.longitude).toFixed(4)}
                              </div>
                              <button 
                                onClick={() => handleOpenEditLocation(r)}
                                className="text-[11px] font-bold text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1 bg-blue-50 hover:bg-blue-100 border border-blue-100 px-2.5 py-1 rounded-md"
                              >
                                ✏️ แก้ไขพิกัด
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button 
                            onClick={() => handleOpenEditLocation(r)}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 hover:text-amber-800 bg-amber-50 border border-amber-100 hover:bg-amber-100 px-3 py-1.5 rounded-xl transition-all shadow-sm"
                          >
                            📍 กดเพื่อปักพิกัด
                          </button>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right align-top">
                        <button onClick={() => handleDelete(r.id)} className="text-xs font-bold text-rose-500 hover:text-rose-700 px-2 py-1 opacity-0 group-hover:opacity-100 transition-all mt-2">
                          ลบ
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Modal Popup */}
      {isOpenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={handleCloseModal} />
          
          <div className="relative w-full max-w-lg transform overflow-hidden rounded-2xl bg-white p-6 shadow-2xl transition-all border border-slate-100 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-slate-900">
                {editModeBranch ? 'อัปเดตพิกัดแผนที่' : 'เพิ่มสถานที่ใหม่'}
              </h3>
              <button onClick={handleCloseModal} className="text-slate-400 text-sm hover:text-slate-600">✕</button>
            </div>

            <form ref={formRef} action={handleFormSubmit} className="space-y-4">
              
              {editModeBranch ? (
                <div className="mb-2 bg-blue-50 p-4 rounded-xl border border-blue-100">
                  <div className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">กำลังแก้ไขพิกัดของ:</div>
                  <div className="text-lg font-black text-blue-900">{editModeBranch.branch_name}</div>
                  <div className="text-sm font-mono text-blue-700 mt-1">รหัส: {editModeBranch.branch_code}</div>
                </div>
              ) : (
                <>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">ประเภท</label>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="cursor-pointer">
                        <input type="radio" name="branch_type" value="SHOWROOM" className="peer sr-only" defaultChecked />
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-center text-sm font-medium text-slate-600 peer-checked:border-blue-500 peer-checked:bg-blue-50 peer-checked:text-blue-700 transition-all">โชว์รูม</div>
                      </label>
                      <label className="cursor-pointer">
                        <input type="radio" name="branch_type" value="FACTORY" className="peer sr-only" />
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-center text-sm font-medium text-slate-600 peer-checked:border-orange-500 peer-checked:bg-orange-50 peer-checked:text-orange-700 transition-all">โรงงาน</div>
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">รหัสสถานที่</label>
                      <input name="branch_code" type="text" placeholder="เช่น FAC-02" required className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm uppercase focus:ring-1 focus:ring-blue-500 outline-none" autoComplete="off" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">ชื่อสถานที่</label>
                      <input name="branch_name" type="text" placeholder="เช่น โรงงานอยุธยา" required className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none" autoComplete="off" />
                    </div>
                  </div>
                </>
              )}

              {/* 🔗 โซนวางลิงก์ Auto-Parse */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 space-y-1.5 mt-4">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                  🔗 ทางลัด: วางลิงก์ Google Maps หรือพิกัด
                </label>
                <input
                  type="text"
                  placeholder="วางลิงก์ที่ก๊อปมา เช่น https://maps.app.goo.gl/..."
                  value={mapsUrl}
                  onChange={(e) => handleParseMapsUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') e.preventDefault()
                  }}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                  autoComplete="off"
                />
                <p className="text-[10px] text-slate-400">
                  * รองรับลิงก์เต็มจากบราวเซอร์ หรือข้อความพิกัด "Lat, Lng" ตรงๆ
                </p>
              </div>

              {/* 💡 โซนแผนที่ */}
              <div className="border-t border-slate-100 pt-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">พิกัดสถานที่</label>
                  
                  <div className="flex gap-2">
                    <button 
                      type="button" 
                      onClick={() => setShowMap(!showMap)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${showMap ? 'bg-slate-200 text-slate-700' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}
                    >
                      {showMap ? 'ปิดแผนที่' : '🗺️ เปิดแผนที่จิ้มเลือก'}
                    </button>
                    <button 
                      type="button" 
                      onClick={getCurrentLocation}
                      className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-all"
                    >
                      📍 ตำแหน่งฉัน
                    </button>
                  </div>
                </div>

                {showMap && (
                  <div className="mb-4">
                    <MapPicker onLocationSelect={handleLocationSelect} />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <input 
                      name="latitude" 
                      type="number" 
                      step="any"
                      placeholder="Latitude" 
                      value={geoLoc.lat}
                      onChange={(e) => setGeoLoc({...geoLoc, lat: e.target.value})}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500" 
                      readOnly 
                    />
                  </div>
                  <div>
                    <input 
                      name="longitude" 
                      type="number" 
                      step="any"
                      placeholder="Longitude" 
                      value={geoLoc.lng}
                      onChange={(e) => setGeoLoc({...geoLoc, lng: e.target.value})}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500" 
                      readOnly
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100 mt-6">
                <button type="button" onClick={handleCloseModal} className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">ยกเลิก</button>
                <button type="submit" disabled={loading} className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white py-2.5 text-sm font-semibold disabled:opacity-50 shadow-md">
                  {loading ? 'กำลังบันทึก...' : (editModeBranch ? 'บันทึกพิกัดใหม่' : 'บันทึกข้อมูล')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}