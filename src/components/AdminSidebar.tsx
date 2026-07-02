"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "../actions/auth";
import {
  LayoutDashboard, Box, PlusCircle, ShoppingCart,
  MapPin, Tag, LogOut, Users, Receipt,
  BarChart3, History, Package, Settings, Frame,
  Layers, ShieldCheck, AlertTriangle
} from "lucide-react";

// 1. เมนูที่ใช้บ่อย (งานประจำวัน)
const primaryItems = [
  // { name: "Dashboard",       href: "/dashboard",    icon: LayoutDashboard },
  // { name: "สต็อกทุกสาขา",   href: "/stock-all",    icon: Package },
  // { name: "ประวัติสต็อก",    href: "/stockmovement",icon: History },
  // { name: "ขายสินค้า (Slab)",href: "/sale_slab",    icon: ShoppingCart },
  { name: "สินค้าทั้งหมด",   href: "/inventory",    icon: Box },
  // { name: "เพิ่มสินค้า",     href: "/addproduct",   icon: PlusCircle },
  { name: "Props / Decor",   href: "/props",        icon: Frame },
  { name: "จัดการลอต",       href: "/lots",         icon: Layers },
];

// 2. เมนูการจัดการและรายงาน
const secondaryItems = [
  { name: "จัดการสาขา",      href: "/branches",     icon: MapPin },
  { name: "ส่วนลด",          href: "/discounts",    icon: Tag },
  { name: "พนักงาน",         href: "/employees",    icon: Users },
  // { name: "ใบเสร็จ",         href: "/receipts",     icon: Receipt },
  // { name: "รายงานยอดขาย",    href: "/sales-report", icon: BarChart3 },
  { name: "ตรวจสอบ RFID ยอดเกิน", href: "/rfid-mismatch", icon: AlertTriangle },
  { name: "Backup & Restore", href: "/backup",       icon: ShieldCheck },
];

interface UserData {
  name: string;
  role: string;
  avatar: string;
}

export default function AdminSidebar({ user }: { user?: UserData }) {
  const pathname = usePathname();
  const collapsedWidth = "w-[80px]";

  const safeUser = user || {
    name: "System User",
    role: "Guest",
    avatar: `https://ui-avatars.com/api/?name=User&background=cbd5e1&color=64748b`
  };

  const renderItems = (items: typeof primaryItems) => (
    items.map((item) => {
      const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
      return (
        <Link 
          key={item.href} 
          href={item.href} 
          className={`relative flex items-center h-12 mx-3 rounded-xl transition-all duration-200 group/item overflow-hidden ${isActive ? "bg-blue-50 text-blue-600 shadow-sm shadow-blue-50" : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"}`}
        >
          {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 bg-blue-600 rounded-full" />}
          <div className="min-w-[48px] h-full flex items-center justify-center">
            <item.icon className={`h-5 w-5 ${isActive ? "stroke-blue-600 stroke-[2.5px]" : "stroke-current stroke-2"}`} />
          </div>
          <span className={`ml-1 font-medium text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-300 delay-75 ${isActive ? "text-blue-700 font-bold" : ""}`}>
            {item.name}
          </span>
        </Link>
      );
    })
  );

  return (
    <>
      {/* เพิ่ม Style เพื่อซ่อน Scrollbar */}
      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <aside className={`group fixed left-0 top-0 z-50 h-screen ${collapsedWidth} bg-white border-r border-slate-100 shadow-2xl transition-all duration-300 ease-in-out hover:w-72 overflow-hidden flex flex-col font-sans`}>
        
        {/* --- 1. Logo Section --- */}
        <div className="h-24 flex items-center shrink-0">
          <div className={`${collapsedWidth} shrink-0 flex items-center justify-center`}>
            <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center text-xl font-black shadow-lg shadow-blue-200">W</div>
          </div>
          <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-[-10px] group-hover:translate-x-0 whitespace-nowrap overflow-hidden">
            <h1 className="text-xl font-bold text-slate-800 leading-none">WoodSlab</h1>
            <p className="text-[10px] text-slate-400 font-bold tracking-[0.2em] uppercase mt-1">Admin Panel</p>
          </div>
        </div>

        {/* --- 2. Menu Sections --- */}
        <nav className="flex-1 py-2 overflow-y-auto no-scrollbar flex flex-col">
          <div className="space-y-1">
            {renderItems(primaryItems)}
          </div>

          <div className="mx-6 my-4 border-t border-slate-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="px-7 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
             <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Management</span>
          </div>

          <div className="space-y-1 mb-6">
            {renderItems(secondaryItems)}
          </div>
        </nav>

        {/* --- 3. User Section (จัดกลุ่มโปรไฟล์และล็อกเอาท์ใหม่) --- */}
        <div className="p-4 border-t border-slate-100 bg-white shrink-0">
          <div className="flex items-center overflow-hidden relative">
            <div className="min-w-[48px] flex items-center justify-center">
               <div className="h-10 w-10 rounded-full bg-slate-100 border-2 border-white shadow-sm overflow-hidden flex items-center justify-center">
                  <img src={safeUser.avatar} alt="User" className="h-full w-full object-cover" />
               </div>
            </div>
            
            <div className="ml-3 flex-1 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-all duration-300 overflow-hidden whitespace-nowrap">
              <div className="overflow-hidden mr-2">
                  <p className="text-sm font-bold text-slate-800 truncate">{safeUser.name}</p>
                  <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider truncate">{safeUser.role}</p>
              </div>

              {/* ปุ่มควบคุม: โปรไฟล์ (เฟือง) และ ล็อกเอาท์ */}
              <div className="flex items-center gap-1">
                <Link 
                  href="/profiles" 
                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="โปรไฟล์"
                >
                  <Settings className="h-4 w-4" />
                </Link>
                <button 
                  onClick={() => logoutAction()} 
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  title="ออกจากระบบ"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}