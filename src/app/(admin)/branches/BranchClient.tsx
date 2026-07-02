"use client"

import { useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createBranch, deleteBranch, updateBranchType, updateBranchLocation } from "../../../actions/branches"
import dynamic from 'next/dynamic'
import { 
  Building2, Plus, Store, Factory, MapPin, Navigation, 
  Map, Link as LinkIcon, X, ExternalLink, Edit3, Trash2, Loader2,
  ChevronDown, ChevronUp
} from "lucide-react"

const MapPicker = dynamic(() => import('./MapPicker'), { 
  ssr: false, 
  loading: () => (
    <div className="h-[250px] w-full bg-slate-100 rounded flex items-center justify-center text-slate-400 text-sm animate-pulse border border-slate-200">
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

  // State to track which map is currently expanded in the table
  const [expandedMapId, setExpandedMapId] = useState<number | null>(null)

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
  const filteredBranches = initialBranches
    .filter(b => filterType === 'ALL' ? true : b.branch_type === filterType)
    .sort((a, b) => {
      if (a.branch_type === 'FACTORY' && b.branch_type !== 'FACTORY') return -1
      if (a.branch_type !== 'FACTORY' && b.branch_type === 'FACTORY') return 1
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-20">
      
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Building2 className="w-6 h-6 text-indigo-600" />
              <span>Branches Management</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">จัดการสาขา โรงงาน และพิกัดแผนที่</p>
          </div>
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-semibold text-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>เพิ่มสถานที่ใหม่</span>
          </button>
        </div>
      </header>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 w-[min(400px,90vw)] animate-in fade-in slide-in-from-top-4">
          <div className={`rounded border shadow-lg p-4 flex items-start gap-3 bg-white ${toast.type === 'ok' ? 'border-emerald-200' : toast.type === 'warn' ? 'border-amber-200' : 'border-rose-200'}`}>
            <div className={`mt-0.5 w-2.5 h-2.5 rounded-full shrink-0 ${toast.type === 'ok' ? 'bg-emerald-500' : toast.type === 'warn' ? 'bg-amber-500' : 'bg-rose-500'}`} />
            <div className="flex-1">
              <h4 className="text-sm font-bold text-slate-800">{toast.title}</h4>
              <p className="text-xs text-slate-500 mt-0.5">{toast.msg}</p>
            </div>
            <button onClick={() => setToast(null)} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 md:px-6 py-6">
        <div className="rounded border border-slate-200 bg-white shadow-sm overflow-hidden min-h-[500px]">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">รายการทั้งหมด</h2>
            <div className="flex bg-slate-100 p-1 rounded">
              {['ALL', 'SHOWROOM', 'FACTORY'].map((type) => (
                <button 
                  key={type}
                  onClick={() => setFilterType(type as any)}
                  className={`px-3.5 py-1 text-xs font-semibold rounded transition ${filterType === type ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  {type === 'ALL' ? 'ทั้งหมด' : type === 'SHOWROOM' ? 'โชว์รูม' : 'โรงงาน'}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100/50 text-slate-500 font-semibold text-xs">
                  <th className="px-6 py-3 w-[25%]">ชื่อสถานที่</th>
                  <th className="px-6 py-3 w-[15%]">รหัส</th>
                  <th className="px-6 py-3 w-[22%]">ประเภท</th>
                  <th className="px-6 py-3">พิกัดตำแหน่ง</th>
                  <th className="px-6 py-3 w-[8%] text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBranches.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center text-slate-400 italic">ไม่มีข้อมูลสถานที่</td>
                  </tr>
                ) : (
                  filteredBranches.map((r) => {
                    const isMapOpen = expandedMapId === r.id;
                    return (
                      <tr key={r.id} className="hover:bg-slate-50/50 transition-colors group">
                        {/* 💡 ชื่อสถานที่ขึ้นก่อนเพื่อนเป็นคอลัมน์แรก */}
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-800">{r.branch_name}</div>
                          <div className="text-[11px] text-slate-400 mt-1">สร้างเมื่อ {r.created_at ? dtFmt.format(new Date(r.created_at)) : "-"}</div>
                        </td>

                        <td className="px-6 py-4 font-mono font-bold text-slate-700">{r.branch_code}</td>
                        
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {r.branch_type === 'SHOWROOM' ? (
                              <Store className="w-4 h-4 text-blue-600 shrink-0" />
                            ) : (
                              <Factory className="w-4 h-4 text-orange-600 shrink-0" />
                            )}
                            <select
                              value={r.branch_type}
                              onChange={(e) => handleUpdateType(r.id, e.target.value as any)}
                              disabled={updatingId === r.id}
                              className={`text-xs font-semibold rounded px-2.5 py-1.5 cursor-pointer outline-none border bg-white transition ${r.branch_type === 'SHOWROOM' ? 'text-blue-700 border-blue-200 hover:bg-blue-50/50' : 'text-orange-700 border-orange-200 hover:bg-orange-50/50'} ${updatingId === r.id ? 'opacity-50 cursor-wait' : ''}`}
                            >
                              <option value="SHOWROOM">โชว์รูม</option>
                              <option value="FACTORY">โรงงาน</option>
                            </select>
                          </div>
                        </td>

                        {/* 💡 แสดงเฉพาะพิกัดตัวเลข และมีปุ่มเปิด/ปิดแผนที่ตามที่ขอ เพื่อความเรียบร้อยสะอาดตา */}
                        <td className="px-6 py-4">
                          {r.latitude && r.longitude ? (
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center gap-2.5 flex-wrap">
                                <span className="text-[11px] text-slate-500 font-mono bg-slate-50 px-2 py-1 rounded border border-slate-200">
                                  {Number(r.latitude).toFixed(5)}, {Number(r.longitude).toFixed(5)}
                                </span>
                                <button
                                  onClick={() => setExpandedMapId(isMapOpen ? null : r.id)}
                                  className="text-[11px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-2.5 py-1 rounded flex items-center gap-1 transition"
                                >
                                  {isMapOpen ? (
                                    <>
                                      <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                                      <span>ซ่อนแผนที่</span>
                                    </>
                                  ) : (
                                    <>
                                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                                      <span>ดูแผนที่</span>
                                    </>
                                  )}
                                </button>
                                <button 
                                  onClick={() => handleOpenEditLocation(r)}
                                  className="text-[11px] font-bold text-blue-600 hover:text-blue-800 transition flex items-center gap-1 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded"
                                >
                                  <Edit3 className="w-3 h-3" /> 
                                  <span>แก้ไขพิกัด</span>
                                </button>
                              </div>

                              {/* โซน Mini Map แบบ Toggle */}
                              {isMapOpen && (
                                <div className="h-36 w-64 rounded overflow-hidden border border-slate-200 relative group bg-slate-50 mt-1 animate-in fade-in slide-in-from-top-2 duration-150">
                                  <iframe
                                    width="100%"
                                    height="100%"
                                    frameBorder="0"
                                    scrolling="no"
                                    marginHeight={0}
                                    marginWidth={0}
                                    src={`https://maps.google.com/maps?q=${r.latitude},${r.longitude}&hl=th&z=15&output=embed`}
                                    className="w-full h-full" 
                                  ></iframe>
                                  
                                  <a 
                                    href={`https://maps.google.com/maps?q=${r.latitude},${r.longitude}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="absolute top-2 right-2 bg-white/90 hover:bg-white text-slate-700 p-1.5 rounded border border-slate-200 shadow-sm opacity-0 group-hover:opacity-100 transition"
                                    title="เปิด Google Maps เต็มจอ"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </a>
                                </div>
                              )}
                            </div>
                          ) : (
                            <button 
                              onClick={() => handleOpenEditLocation(r)}
                              className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 hover:text-amber-800 bg-amber-50 border border-amber-100 hover:bg-amber-100 px-3 py-1.5 rounded transition shadow-sm"
                            >
                              <MapPin className="w-3.5 h-3.5 animate-bounce" /> 
                              <span>ปักพิกัดแผนที่</span>
                            </button>
                          )}
                        </td>

                        <td className="px-6 py-4 text-right align-top">
                          <button onClick={() => handleDelete(r.id)} 
                            className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-slate-100 transition opacity-0 group-hover:opacity-100 mt-2"
                            title="ลบสถานที่"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    )
                  })
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
          
          <div className="relative w-full max-w-lg transform overflow-hidden rounded border border-slate-200 bg-white p-5 shadow-xl transition-all animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3 bg-slate-50/50 -m-5 p-5">
              <h3 className="text-base font-bold text-slate-900">
                {editModeBranch ? 'อัปเดตพิกัดแผนที่' : 'เพิ่มสถานที่ใหม่'}
              </h3>
              <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form ref={formRef} action={handleFormSubmit} className="space-y-4 pt-2">
              
              {editModeBranch ? (
                <div className="mb-2 bg-blue-50/50 p-4 rounded border border-blue-200">
                  <div className="text-xs font-bold text-blue-600 uppercase mb-1">กำลังแก้ไขพิกัดของ:</div>
                  <div className="text-base font-bold text-blue-900">{editModeBranch.branch_name}</div>
                  <div className="text-xs font-mono text-blue-700 mt-1">รหัส: {editModeBranch.branch_code}</div>
                </div>
              ) : (
                <>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">ประเภทสถานที่</label>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="cursor-pointer">
                        <input type="radio" name="branch_type" value="SHOWROOM" className="peer sr-only" defaultChecked />
                        <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-center text-sm font-semibold text-slate-600 peer-checked:border-blue-500 peer-checked:bg-blue-50 peer-checked:text-blue-700 transition">โชว์รูม</div>
                      </label>
                      <label className="cursor-pointer">
                        <input type="radio" name="branch_type" value="FACTORY" className="peer sr-only" />
                        <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-center text-sm font-semibold text-slate-600 peer-checked:border-orange-500 peer-checked:bg-orange-50 peer-checked:text-orange-700 transition">โรงงาน</div>
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">รหัสสถานที่</label>
                      <input name="branch_code" type="text" placeholder="เช่น FAC-02" required className="w-full rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm uppercase focus:border-indigo-500 outline-none" autoComplete="off" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">ชื่อสถานที่</label>
                      <input name="branch_name" type="text" placeholder="เช่น โรงงานอยุธยา" required className="w-full rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-indigo-500 outline-none" autoComplete="off" />
                    </div>
                  </div>
                </>
              )}

              {/* link input */}
              <div className="bg-slate-50 p-3 rounded border border-slate-200 space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase flex items-center gap-1">
                  <LinkIcon className="w-3.5 h-3.5 text-slate-400" />
                  <span>ลิงก์ Google Maps หรือ พิกัด Lat, Lng</span>
                </label>
                <input
                  type="text"
                  placeholder="วางลิงก์ที่ก๊อปมา เช่น https://maps.app.goo.gl/..."
                  value={mapsUrl}
                  onChange={(e) => handleParseMapsUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') e.preventDefault()
                  }}
                  className="w-full rounded border border-slate-200 bg-white px-3 py-1.5 text-xs focus:border-indigo-500 outline-none"
                  autoComplete="off"
                />
                <p className="text-[10px] text-slate-400 leading-tight">
                  * รองรับลิงก์เต็มจากเบราว์เซอร์ หรือค่าพิกัดพิกัด "Lat, Lng" ตรงๆ
                </p>
              </div>

              {/* map picker */}
              <div className="border-t border-slate-100 pt-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">พิกัดตำแหน่ง</label>
                  
                  <div className="flex gap-2">
                    <button 
                      type="button" 
                      onClick={() => setShowMap(!showMap)}
                      className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded transition ${showMap ? 'bg-slate-200 text-slate-700' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-100'}`}
                    >
                      <Map className="w-3.5 h-3.5" />
                      <span>{showMap ? 'ปิดแผนที่' : 'เปิดแผนที่ปักหมุด'}</span>
                    </button>
                    <button 
                      type="button" 
                      onClick={getCurrentLocation}
                      className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-100 px-2.5 py-1 rounded transition"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>ตำแหน่งฉัน</span>
                    </button>
                  </div>
                </div>

                {showMap && (
                  <div className="mb-3 border border-slate-200 rounded overflow-hidden">
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
                      className="w-full rounded border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500 font-mono" 
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
                      className="w-full rounded border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500 font-mono" 
                      readOnly
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-slate-100 mt-6">
                <button type="button" onClick={handleCloseModal} className="flex-1 rounded border border-slate-200 bg-white py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">ยกเลิก</button>
                <button type="submit" disabled={loading} className="flex-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white py-2 text-sm font-bold disabled:opacity-50 transition shadow-sm flex items-center justify-center gap-1.5">
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>กำลังบันทึก...</span>
                    </>
                  ) : (
                    <span>{editModeBranch ? 'บันทึกพิกัดใหม่' : 'บันทึกข้อมูล'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}