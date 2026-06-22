"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import {
  LayoutDashboard, Package, LogOut, User, Menu, Store,
  Users, Receipt, BarChart3, Box, X, Settings,
  Tag, History, Layers, PackageCheck, ShoppingCart,
  Truck, FileText, SearchCode // 🔴 ✨ เพิ่มไอคอน SearchCode สำหรับใช้เช็คยอดเปรียบเทียบครับนาย
} from "lucide-react"
import { logoutAction } from "../actions/auth" 

type ManagerSidebarProps = {
  userName: string
  branchName: string
  userAvatar: string 
}

export default function ManagerSidebar({ userName, branchName, userAvatar }: ManagerSidebarProps) {
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const menuItems = [
    { name: "ภาพรวม",         href: "/manager/dashboard",   icon: LayoutDashboard },
    { name: "ขายสินค้า (POS)",  href: "/manager/pos",         icon: Store }, 
    { name: "สต็อกหน้าร้าน",  href: "/manager/publicstock", icon: Box },
   //  { name: "รับสินค้า (ลอต)", href: "/manager/lots",          icon: Layers },
    { name: "(lotการรับเข้า)", href: "/manager/receive-check", icon: PackageCheck },
    
    // 🔴 ✨ เพิ่มเมนูตรวจสอบยอด RFID ชนสต๊อกจริง ลิงก์ตรงไปที่โฟลเดอร์ stock-compare ของนายเลยครับ
    { name: "ตรวจสอบยอด RFID", href: "/manager/stock-compare", icon: SearchCode },

    { name: "ประวัติสต็อก",    href: "/manager/stocklog",    icon: History },
    { name: "ตรวจสอบใบโอน",    href: "/manager/receive-check1",    icon: FileText }, 
    { name: "มอนิเตอร์ค้างส่ง",   href: "/manager/vanguard-dispatch", icon: Truck },
  ]

  return (
    <>
      {/* ✅ เพิ่ม Style เพื่อซ่อน Scrollbar */}
      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <aside className="hidden md:flex fixed left-0 top-0 z-50 h-screen w-[88px] hover:w-72 bg-white border-r border-slate-200 shadow-2xl transition-all duration-300 ease-in-out group flex-col overflow-hidden font-sans">
        
        {/* --- 1. Header Logo --- */}
        <div className="h-24 flex items-center shrink-0 pl-6 overflow-hidden relative">
           <div className="min-w-[40px] h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center text-white text-xl font-black shadow-lg shadow-blue-200 z-20">M</div>
           <div className="ml-4 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-[-10px] group-hover:translate-x-0 whitespace-nowrap">
              <h1 className="text-xl font-extrabold text-slate-800 tracking-tight leading-none">MANAGER</h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Control Panel</p>
           </div>
        </div>

        {/* --- 2. Navigation Section (Hide Scrollbar) --- */}
        <nav className="flex-1 py-6 space-y-2 overflow-y-auto no-scrollbar px-3">
           {menuItems.map((item) => {
             const isActive = pathname.startsWith(item.href)
             return (
               <Link key={item.href} href={item.href} className={`relative flex items-center h-14 rounded-2xl transition-all duration-300 overflow-hidden ${isActive ? "bg-blue-600 text-white shadow-md shadow-blue-200" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`}>
                 <div className="min-w-[64px] h-full flex items-center justify-center shrink-0">
                    <item.icon className={`w-6 h-6 transition-transform duration-300 ${isActive ? "scale-110" : "group-hover:scale-110"}`} />
                 </div>
                 <span className={`whitespace-nowrap font-bold text-base opacity-0 group-hover:opacity-100 transition-all duration-300 delay-75 ${isActive ? "translate-x-0" : "translate-x-2 group-hover:translate-x-0"}`}>{item.name}</span>
                 {isActive && (<div className="absolute right-4 w-2 h-2 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>)}
               </Link>
             )
           })}
        </nav>

        {/* --- 3. User Profile & Settings --- */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
           <div className="flex items-center overflow-hidden">
             
             {/* Avatar Section */}
             <div className="min-w-[56px] h-14 flex items-center justify-center">
                <div className="w-10 h-10 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center text-slate-400 shadow-sm overflow-hidden relative">
                   <img src={userAvatar} alt="Profiles" className="w-full h-full object-cover" onError={(e) => e.currentTarget.style.display = 'none'} />
                   <div className="absolute inset-0 flex items-center justify-center -z-10">
                      <User className="w-5 h-5" />
                   </div>
                </div>
             </div>
             
             <div className="flex-1 ml-1 opacity-0 group-hover:opacity-100 transition-all duration-300 overflow-hidden whitespace-nowrap">
                <p className="text-sm font-bold text-slate-800 truncate">{userName}</p>
                <p className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                   <Store className="w-3 h-3" /> {branchName}
                </p>
             </div>

             {/* Group Settings and Logout button */}
             <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 delay-100">
                <Link href="/manager/profiles" className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="โปรไฟล์/ตั้งค่า">
                   <Settings className="w-4 h-4" />
                </Link>
                <form action={logoutAction}>
                   <button className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="ออกจากระบบ">
                      <LogOut className="w-4 h-4" />
                   </button>
                </form>
             </div>
           </div>
        </div>
      </aside>

      {/* --- Mobile View --- */}
      <div className="md:hidden fixed top-0 inset-x-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 h-16 flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
             <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">M</div>
             <span className="font-bold text-slate-800 text-sm">MANAGER</span>
          </div>
          <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg">
            <Menu className="w-6 h-6"/>
          </button>
      </div>

      {isMobileMenuOpen && (<div className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm md:hidden" onClick={() => setIsMobileMenuOpen(false)} />)}
      <div className={`fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-2xl transform transition-transform duration-300 ease-out md:hidden flex flex-col ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="h-16 flex items-center justify-between px-6 border-b border-slate-100">
             <span className="font-bold text-slate-800">Menu</span>
             <button onClick={() => setIsMobileMenuOpen(false)}><X className="w-6 h-6 text-slate-400"/></button>
          </div>
          <div className="flex-1 py-4 px-4 space-y-1 overflow-y-auto no-scrollbar">
             {menuItems.map((item) => (
               <Link key={item.href} href={item.href} onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold ${pathname.startsWith(item.href) ? "bg-blue-600 text-white" : "text-slate-500"}`}>
                  <item.icon className="w-5 h-5" /> {item.name}
               </Link>
             ))}
          </div>
          <div className="p-4 border-t border-slate-100">
             <div className="flex items-center justify-between mb-4 px-2">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center border overflow-hidden shrink-0">
                      <img src={userAvatar} className="w-full h-full object-cover" onError={(e) => e.currentTarget.style.display='none'} />
                      <User className="absolute w-5 h-5 text-slate-300 -z-10" />
                   </div>
                   <div><p className="font-bold text-sm">{userName}</p><p className="text-xs text-slate-500">{branchName}</p></div>
                </div>
                {/* Mobile Settings Icon */}
                <Link href="/manager/profiles" className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl transition-colors">
                   <Settings className="w-5 h-5" />
                </Link>
             </div>
             <form action={logoutAction}>
                <button className="w-full py-2 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs hover:bg-red-50 hover:text-red-500 transition-colors">ออกจากระบบ</button>
             </form>
          </div>
      </div>
    </>
  )
}