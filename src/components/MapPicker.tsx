"use client"
import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import { Search, Loader2, MapPin, X, Save, Navigation } from 'lucide-react'
import 'leaflet/dist/leaflet.css'

// แก้ปัญหาไอคอนหมุดไม่ขึ้นใน Next.js
const icon = L.icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
})

interface MapPickerProps {
  onSelectLocation: (lat: number, lng: number) => void;
  onClose: () => void;
  initialLat?: number | null;
  initialLng?: number | null;
}

// ✨ Component สั่งเด้งกล้องซูมเคลื่อนที่ตามพิกัด (Fly To)
function UpdateMapCenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  useEffect(() => {
    map.flyTo([lat, lng], 16, { animate: true, duration: 1.5 })
  }, [lat, lng, map])
  return null
}

export default function MapPicker({ onSelectLocation, onClose, initialLat, initialLng }: MapPickerProps) {
  // ตั้งค่าเริ่มต้น กทม. นนทบุรี
  const [position, setPosition] = useState<{lat: number, lng: number}>({ 
    lat: initialLat || 13.8282, 
    lng: initialLng || 100.5284 
  })

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isLocating, setIsLocating] = useState(false) // ✨ State ตอนกำลังดึง GPS ของตัวเอง

  // ฟังก์ชันคลิกเลือกพิกัดด้วยตัวเองบนแผนที่
  const LocationMarker = () => {
    useMapEvents({
      click(e) {
        setPosition({ lat: e.latlng.lat, lng: e.latlng.lng })
        setSearchResults([]) 
      },
    })
    return position ? <Marker position={[position.lat, position.lng]} icon={icon} /> : null
  }

  // ฟังก์ชันค้นหาตำแหน่งจากข้อความ (Smart Query)
  const handleSearchLocation = async () => {
    if (!searchQuery.trim()) return
    setIsSearching(true)
    
    try {
      const fetchNominatim = async (q: string) => {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5&countrycodes=th&addressdetails=1&accept-language=th`);
        return await res.json();
      }

      const query1 = searchQuery.trim();
      let combined: any[] = [];

      const data1 = await fetchNominatim(query1);
      combined = [...data1];

      const isMissingSoi = !query1.includes('ซอย') && !query1.includes('ถนน') && /[ก-๙]+/.test(query1) && /\d+/.test(query1);
      
      if (isMissingSoi) {
        let query2 = query1.replace(/([ก-๙a-zA-Z]+)\s*(\d+)/, 'ซอย $1 $2');
        if (query2 === query1) query2 = `ซอย ${query1}`;

        await new Promise(resolve => setTimeout(resolve, 300));
        const data2 = await fetchNominatim(query2);
        combined = [...combined, ...data2];
      }

      const uniqueData = Array.from(new Map(combined.map(item => [item.place_id, item])).values());

      if (uniqueData && uniqueData.length > 0) {
        const sortedData = uniqueData.sort((a, b) => {
          if (a.display_name.includes("ซอย") && !b.display_name.includes("ซอย")) return -1;
          return 0;
        });
        setSearchResults(sortedData.slice(0, 5));
      } else {
        setSearchResults([])
        alert("❌ ไม่พบสถานที่นี้ในระบบแผนที่ครับ ลองระบุคำค้นหาให้กว้างขึ้นดูครับนาย")
      }
    } catch (error) {
      console.error(error)
      alert("ระบบค้นหาแผนที่ขัดข้องชั่วคราว ลองใหม่อีกครั้งครับนาย")
    } finally {
      setIsSearching(false)
    }
  }

  // ✨ ฟังก์ชันดึงตำแหน่งปัจจุบันของตัวแอดมินเอง (GPS)
  const handleGetMyLocation = () => {
    if (!navigator.geolocation) {
      alert("เบราว์เซอร์หรืออุปกรณ์นี้ไม่รองรับระบบระบบระบุพิกัด GPS ครับ")
      return
    }

    setIsLocating(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude
        const lng = position.coords.longitude
        setPosition({ lat, lng })
        setSearchResults([]) // เคลียร์ผลการค้นหาเก่า
        setIsLocating(false)
      },
      (error) => {
        console.error(error)
        alert("❌ ไม่สามารถเข้าถึงตำแหน่งของคุณได้ รบกวนตรวจสอบการอนุญาต (Allow Location) บนเบราว์เซอร์ด้วยครับนาย")
        setIsLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000 } // เน้นพิกัดแม่นยำสูง
    )
  }

  const handleSelectResult = (result: any) => {
    const lat = parseFloat(result.lat)
    const lon = parseFloat(result.lon)
    setPosition({ lat, lng: lon })
    setSearchResults([]) 
    setSearchQuery(result.display_name.split(',')[0]) 
  }

  return (
    <div className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-3xl flex flex-col overflow-hidden shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
        
        {/* ส่วนหัวหน้าต่าง */}
        <div className="p-4 border-b flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-slate-800 flex items-center gap-1.5 text-sm sm:text-base">
            <MapPin className="w-4 h-4 text-blue-600" /> ระบบค้นหาและปักหมุดที่อยู่จัดส่งลูกค้า
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-red-500 font-bold px-3 py-1 bg-white rounded-xl border border-slate-200 text-xs transition-colors shadow-2xs">
            ปิดหน้าต่าง
          </button>
        </div>

        {/* 🔍 แถบค้นหาตำแหน่ง + ปุ่มพิกัดของฉัน */}
        <div className="p-4 bg-white border-b flex flex-col gap-2 relative z-50">
          <div className="flex flex-col sm:flex-row gap-2 w-full">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="พิมพ์ค้นหา เช่น เรวดี 21, ลาดพร้าว 101, ชื่อคอนโด..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchLocation()}
                className="w-full text-xs p-3 pr-10 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all font-medium text-slate-700 h-10"
              />
              {searchQuery && (
                <button 
                  onClick={() => { setSearchQuery(''); setSearchResults([]); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              {/* รายการผลลัพธ์ย้อยลงมา */}
              {searchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-[46px] bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden z-[9999] max-h-56 overflow-y-auto divide-y divide-slate-100">
                  {searchResults.map((result, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleSelectResult(result)}
                      className="p-3 text-xs text-slate-600 hover:bg-blue-50/80 hover:text-blue-700 cursor-pointer flex items-start gap-2 transition-colors"
                    >
                      <MapPin className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                      <span className="font-medium truncate text-left w-full">{result.display_name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="flex gap-2 shrink-0">
              {/* ปุ่มค้นหาตามข้อความ */}
              <button
                onClick={handleSearchLocation}
                disabled={isSearching || isLocating}
                className="bg-blue-600 text-white px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-xs h-10 flex-1 sm:flex-none"
              >
                {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                ค้นหาตำแหน่ง
              </button>

              {/* ✨ ปุ่มพิกัดของฉัน (Current Location) ดีไซน์ Clean Slate เข้าเซ็ต */}
              <button
                type="button"
                onClick={handleGetMyLocation}
                disabled={isSearching || isLocating}
                className="bg-slate-100 border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-xs h-10 flex-1 sm:flex-none"
              >
                {isLocating ? <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-500" /> : <Navigation className="w-3.5 h-3.5 text-slate-600 fill-slate-600" />}
                ตำแหน่งของฉัน
              </button>
            </div>
          </div>
        </div>

        {/* กระดานแผนที่หลัก */}
        <div className="h-[400px] w-full bg-slate-100 relative z-10">
          <MapContainer center={[position.lat, position.lng]} zoom={13} style={{ height: '100%', width: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <LocationMarker />
            <UpdateMapCenter lat={position.lat} lng={position.lng} />
          </MapContainer>
        </div>

        {/* แถบสรุปพิกัดและปุ่มบันทึกด้านล่าง */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-left w-full sm:w-auto">
            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Selected Coordinate</p>
            <p className="text-xs text-slate-700 font-bold mt-0.5">
              Lat: <span className="text-blue-600">{position.lat.toFixed(6)}</span>, Lng: <span className="text-blue-600">{position.lng.toFixed(6)}</span>
            </p>
          </div>
          
          <button 
            onClick={() => onSelectLocation(position.lat, position.lng)} 
            className="bg-[#1E293B] text-white px-6 py-3 rounded-xl font-bold text-xs hover:bg-slate-800 transition-all w-full sm:w-auto flex items-center justify-center gap-1.5 shadow-md shadow-slate-200"
          >
            <Save className="w-4 h-4" /> ยืนยันพิกัดตำแหน่งลูกค้า
          </button>
        </div>

      </div>
    </div>
  )
}