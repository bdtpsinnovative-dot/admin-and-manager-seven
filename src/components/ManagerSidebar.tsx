"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect } from "react" // 🔴 เพิ่ม useEffect
import {
  LayoutDashboard, Store, Box, PackageCheck, SearchCode, History, 
  Truck, LogOut, User, Menu, X, Settings,
  ClipboardList, Layers, ClipboardCheck, BarChart4, 
  Search, SlidersHorizontal, UserCheck, ChevronDown,
  Package, ShieldCheck, Loader2 // 🔴 เพิ่ม Loader2 มาทำไอคอนหมุนๆ
} from "lucide-react"
import { logoutAction } from "../actions/auth" 

type ManagerSidebarProps = {
  userName: string
  branchName: string
  userAvatar: string 
}

type SubMenuItem = {
  name: string
  href: string
  icon: any
}

type MenuItem = {
  name: string
  icon: any
  subMenu: SubMenuItem[]
}

export default function ManagerSidebar({ userName, branchName, userAvatar }: ManagerSidebarProps) {
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  
  // 🔴 State สำหรับคุมการแสดงหน้าจอ Loading
  const [isNavigating, setIsNavigating] = useState(false)
  
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
    "ภาพรวมและหน้าร้าน": true,
  })

  // 🔴 เมื่อ pathname เปลี่ยน (แปลว่าโหลดหน้าใหม่เสร็จแล้ว) ให้ปิด Loading
  useEffect(() => {
    setIsNavigating(false)
  }, [pathname])

  useEffect(() => {
    const handleOpenMenu = () => setIsMobileMenuOpen(true)
    window.addEventListener("open-mobile-menu", handleOpenMenu)
    return () => window.removeEventListener("open-mobile-menu", handleOpenMenu)
  }, [])

  const toggleMenu = (menuName: string) => {
    setOpenMenus((prev) => ({
      ...prev,
      [menuName]: !prev[menuName],
    }))
  }

  const checkIsActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + '/')
  }

  // 🔴 ฟังก์ชันจัดการตอนกดคลิกเมนู
  const handleLinkClick = (href: string) => {
    // ถ้าหน้าที่จะไป ไม่ใช่หน้าปัจจุบัน ให้เปิด Loading หมุนๆ
    if (pathname !== href) {
      setIsNavigating(true)
    }
    // ปิดเมนูมือถือเสมอเมื่อมีการกดเลือก
    setIsMobileMenuOpen(false)
  }

  const menuItems: MenuItem[] = [
    {
      name: "ภาพรวมและหน้าร้าน",
      icon: Store,
      subMenu: [
        // { name: "ภาพรวม (dashboard)", href: "/manager/dashboard", icon: LayoutDashboard },
        { name: "ขายสินค้า ", href: "/manager/pos", icon: Store },
        { name: "สต็อกหน้าร้าน ", href: "/manager/publicstock", icon: Box },
        { name: "มอนิเตอร์ค้างส่ง", href: "/manager/vanguard-dispatch", icon: Truck },
        { name: "แสดงยอดนับ", href: "/manager/initial-count", icon: ClipboardList },
        { name: "ตรวจสอบยอดขาย", href: "/manager/sales-check", icon: UserCheck },
      ]
    },
    
    {
      name: "ระบบรับเข้าและโอน",
      icon: PackageCheck,
      subMenu: [
        { name: "ตรวจสอบใบโอน", href: "/manager/receive-check1", icon: ClipboardCheck },
        { name: "เช็ครับสินค้า", href: "/manager/receive-check", icon: PackageCheck }, 
        
      ]
    },
    {
      name: "ตรวจสอบและรายงาน",
      icon: ShieldCheck,
      subMenu: [
      
        // { name: "รายงานยอดขาย (sales-report)", href: "/manager/sales-report", icon: BarChart4 },
        
        { name: "ประวัติสต็อก", href: "/manager/stocklog", icon: History },
        
        { name: "ตรวจสอบยอด RFID", href: "/manager/stock-compare", icon: SearchCode },
        { name: "ค้นหาสต็อก", href: "/manager/stock-search", icon: Search },
        { name: "เช็คแท็กสินค้า", href: "/manager/tagcheck", icon: SlidersHorizontal },
        { name: "เช็คแท็กสำรอง", href: "/manager/tagcheck1", icon: SlidersHorizontal },
      ]
    }
  ]

  const isGroupActive = (item: MenuItem) => {
    return item.subMenu.some(sub => checkIsActive(sub.href))
  }

  return (
    <>
      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* 🔴 --- Loading Overlay หมุนติ้วๆ กลางจอ --- */}
      {isNavigating && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/20 backdrop-blur-sm transition-all duration-300">
          <div className="bg-white px-6 py-5 rounded-2xl shadow-xl flex flex-col items-center gap-3">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
            <span className="text-sm font-bold text-slate-700 animate-pulse">กำลังโหลดข้อมูล...</span>
          </div>
        </div>
      )}

      {/* --- Desktop Sidebar --- */}
      <aside className="hidden md:flex fixed left-0 top-0 z-50 h-screen w-[88px] hover:w-72 bg-white border-r border-slate-200 shadow-2xl transition-all duration-300 ease-in-out group flex-col overflow-hidden font-sans">
        
        <div className="h-24 flex items-center shrink-0 pl-6 overflow-hidden relative">
           <div className="min-w-[40px] h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center text-white text-xl font-black shadow-lg shadow-blue-200 z-20">M</div>
           <div className="ml-4 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-[-10px] group-hover:translate-x-0 whitespace-nowrap">
              <h1 className="text-xl font-extrabold text-slate-800 tracking-tight leading-none">MANAGER</h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Control Panel</p>
           </div>
        </div>

        <nav className="flex-1 py-6 space-y-2 overflow-y-auto no-scrollbar px-3">
           {menuItems.map((item) => {
             const isOpen = openMenus[item.name] || false
             const groupActive = isGroupActive(item)

             return (
               <div key={item.name} className="space-y-1">
                 <button 
                   onClick={() => toggleMenu(item.name)}
                   className={`w-full relative flex items-center h-14 rounded-2xl transition-all duration-300 overflow-hidden ${
                     groupActive 
                       ? "bg-slate-100 text-blue-600" 
                       : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                   }`}
                 >
                   <div className="min-w-[64px] h-full flex items-center justify-center shrink-0">
                      <item.icon className="w-6 h-6" />
                   </div>
                   <span className="whitespace-nowrap font-bold text-base opacity-0 group-hover:opacity-100 transition-all duration-300 delay-75 flex-1 text-left">
                     {item.name}
                   </span>
                   <div className={`mr-4 opacity-0 group-hover:opacity-100 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
                     <ChevronDown className="w-4 h-4" />
                   </div>
                 </button>

                 {isOpen && (
                   <div className="pl-6 pr-2 space-y-1 hidden group-hover:block border-l-2 border-slate-100 ml-7 transition-all duration-300">
                     {item.subMenu.map((sub) => {
                       const isActive = checkIsActive(sub.href)
                       return (
                         <Link 
                           key={sub.href} 
                           href={sub.href} 
                           onClick={() => handleLinkClick(sub.href)} // 🔴 เรียกฟังก์ชันเปิด Loading
                           className={`flex items-center h-10 px-3 rounded-xl transition-all duration-200 gap-2.5 ${
                             isActive 
                               ? "bg-blue-50 text-blue-600 font-bold" 
                               : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 font-medium"
                           }`}
                         >
                           <sub.icon className={`w-4 h-4 shrink-0 transition-transform ${isActive ? "scale-105" : ""}`} />
                           <span className="text-xs truncate">{sub.name}</span>
                         </Link>
                       )
                     })}
                   </div>
                 )}
               </div>
             )
           })}
        </nav>

        <div className="p-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
           <div className="flex items-center overflow-hidden">
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

             <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 delay-100">
                <Link 
                  href="/manager/profiles" 
                  onClick={() => handleLinkClick("/manager/profiles")} // 🔴 เพิ่มที่ปุ่มตั้งค่าด้วย
                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="โปรไฟล์/ตั้งค่า"
                >
                   <Settings className="w-4 h-4" />
                </Link>
                <form action={logoutAction} onSubmit={() => setIsNavigating(true)}> {/* 🔴 เพิ่มที่ปุ่มออกจากระบบ */}
                   <button className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="ออกจากระบบ">
                      <LogOut className="w-4 h-4" />
                   </button>
                </form>
             </div>
           </div>
        </div>
      </aside>

      {/* --- Mobile View --- */}
      {!(pathname === "/sale/pos" || pathname === "/manager/pos" || pathname.endsWith("/pos")) && (
        <div className="md:hidden fixed top-0 inset-x-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 h-16 flex items-center justify-between px-4">
            <div className="flex items-center gap-2">
               <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">M</div>
               <span className="font-bold text-slate-800 text-sm">MANAGER</span>
            </div>
            <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg">
              <Menu className="w-6 h-6"/>
            </button>
        </div>
      )}

      {isMobileMenuOpen && (<div className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm md:hidden" onClick={() => setIsMobileMenuOpen(false)} />)}
      <div className={`fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-2xl transform transition-transform duration-300 ease-out md:hidden flex flex-col ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="h-16 flex items-center justify-between px-6 border-b border-slate-100">
             <span className="font-bold text-slate-800">Menu</span>
             <button onClick={() => setIsMobileMenuOpen(false)}><X className="w-6 h-6 text-slate-400"/></button>
          </div>
          
          <div className="flex-1 py-4 px-4 space-y-1 overflow-y-auto no-scrollbar">
             {menuItems.map((item) => {
               const isOpen = openMenus[item.name] || false
               return (
                 <div key={item.name} className="space-y-1">
                   <button 
                     onClick={() => toggleMenu(item.name)}
                     className="w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-50"
                   >
                     <div className="flex items-center gap-3">
                       <item.icon className="w-5 h-5" />
                       <span>{item.name}</span>
                     </div>
                     <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                   </button>
                   
                   {isOpen && (
                     <div className="pl-7 pr-2 space-y-1 border-l-2 border-slate-100 ml-6 mt-1">
                       {item.subMenu.map((sub) => (
                         <Link 
                           key={sub.href} 
                           href={sub.href} 
                           onClick={() => handleLinkClick(sub.href)} // 🔴 ฝั่งมือถือก็ติด Loading
                           className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs ${
                             checkIsActive(sub.href) 
                               ? "bg-blue-50 text-blue-600 font-bold" 
                               : "text-slate-500 hover:bg-slate-50 font-medium"
                           }`}
                         >
                            <sub.icon className="w-4 h-4 shrink-0" /> 
                            <span className="truncate">{sub.name}</span>
                         </Link>
                       ))}
                     </div>
                   )}
                 </div>
               )
             })}
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
                <Link 
                  href="/manager/profiles" 
                  onClick={() => handleLinkClick("/manager/profiles")} // 🔴
                  className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl transition-colors"
                >
                   <Settings className="w-5 h-5" />
                </Link>
             </div>
             <form action={logoutAction} onSubmit={() => setIsNavigating(true)}> {/* 🔴 */}
                <button className="w-full py-2 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs hover:bg-red-50 hover:text-red-500 transition-colors">ออกจากระบบ</button>
             </form>
          </div>
      </div>
    </>
  )
}