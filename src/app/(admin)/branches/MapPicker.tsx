"use client"

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  useEffect(() => {
    if (lat && lng) {
      map.flyTo([lat, lng], 16, { animate: true, duration: 1.5 })
    }
  }, [lat, lng, map])
  return null
}

function LocationMarker({ position, setPosition }: { position: any; setPosition: any }) {
  useMapEvents({
    click(e) {
      setPosition({ lat: e.latlng.lat, lng: e.latlng.lng })
    },
  })
  return position === null ? null : (
    <Marker position={position} icon={icon}></Marker>
  )
}

interface SearchResult {
  place_id: number
  display_name: string
  lat: string
  lon: string
}

export default function MapPicker({ onLocationSelect }: { onLocationSelect: (lat: string, lng: string) => void }) {
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({ lat: 13.7563, lng: 100.5018 })
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null)
  
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)

  useEffect(() => {
    if (position) {
      onLocationSelect(position.lat.toString(), position.lng.toString())
    }
  }, [position, onLocationSelect])

  // 💡 จุดที่ 1: เอา e.preventDefault() ออก เพราะเราไม่ได้ใช้แท็ก form แล้ว
  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    setIsSearching(true)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&countrycodes=th&limit=5`
      )
      const data = await res.json()
      setSearchResults(data)
    } catch (err) {
      console.error("ค้นหาที่อยู่ล้มเหลว:", err)
    } finally {
      setIsSearching(false)
    }
  }

  const handleSelectPlace = (place: SearchResult) => {
    const lat = Number(place.lat)
    const lng = Number(place.lon)
    
    setMapCenter({ lat, lng })
    setPosition({ lat, lng })
    setSearchResults([])
    setSearchQuery(place.display_name)
  }

  return (
    <div className="space-y-3">
      
      {/* 💡 จุดที่ 2: เปลี่ยนจาก <form> เป็น <div> ธรรมดา */}
      <div className="relative z-[500]">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="🔍 ค้นหาชื่อสถานที่, อำเภอ, จังหวัด..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            // 💡 จุดที่ 3: ดักจับปุ่ม Enter ตรงนี้แทน
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault() // ป้องกันไม่ให้ฟอร์มแม่ (BranchClient) ทริกเกอร์ Submit
                handleSearch()
              }
            }}
            className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
          />
          <button
            type="button" // 💡 จุดที่ 4: เปลี่ยนจาก submit เป็น button 
            onClick={handleSearch} // ผูกฟังก์ชันเข้ากับ onClick แทน
            disabled={isSearching}
            className="bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs px-4 rounded-xl shadow transition-colors disabled:opacity-50 shrink-0"
          >
            {isSearching ? 'กำลังค้น...' : 'ค้นหา'}
          </button>
        </div>

        {/* กล่องผลลัพธ์การเสิร์ช */}
        {searchResults.length > 0 && (
          <ul className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto overflow-x-hidden divide-y divide-slate-50">
            {searchResults.map((place) => (
              <li key={place.place_id}>
                <button
                  type="button"
                  onClick={() => handleSelectPlace(place)}
                  className="w-full text-left px-4 py-3 text-xs hover:bg-slate-50 transition-colors block text-slate-700 truncate"
                >
                  📍 {place.display_name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="relative w-full h-[400px] rounded-xl overflow-hidden border border-slate-200 shadow-inner z-0">
        <MapContainer center={[mapCenter.lat, mapCenter.lng]} zoom={10} style={{ height: '100%', width: '100%', zIndex: 1 }}>
          <TileLayer 
            attribution='© OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
          />
          <LocationMarker position={position} setPosition={setPosition} />
          <RecenterMap lat={mapCenter.lat} lng={mapCenter.lng} />
        </MapContainer>
        
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[400] bg-slate-900/80 backdrop-blur text-white px-4 py-1.5 rounded-full shadow-md text-[11px] font-bold pointer-events-none tracking-wide">
          👆 พิมพ์ค้นหาด้านบน หรือเลื่อนแผนที่แล้วคลิกเพื่อปักหมุด
        </div>
      </div>

    </div>
  )
}