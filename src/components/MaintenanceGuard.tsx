"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

interface Props {
  type: "web_sale" | "web_manager";
  children: React.ReactNode;
}

export default function MaintenanceGuard({ type, children }: Props) {
  const pathname = usePathname();
  const [isMaintenance, setIsMaintenance] = useState(false);

  useEffect(() => {
    const checkMaintenance = async () => {
      try {
        const res = await fetch("/api/system-settings");
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.settings) {
            const status = data.settings[type]?.maintenance === true;
            setIsMaintenance(status);
          }
        }
      } catch (err) {
        console.error("Failed to check maintenance status:", err);
      }
    };

    checkMaintenance();
  }, [pathname, type]);

  if (isMaintenance) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white font-sans p-6 text-center">
        <div className="bg-slate-800 p-8 rounded-2xl shadow-xl max-w-md w-full border border-slate-700 animate-fadeIn">
          <div className="text-amber-500 mb-4">
            <svg className="w-16 h-16 mx-auto animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-2">
            ระบบ{type === "web_sale" ? "ฝ่ายขาย (Sale)" : "ผู้จัดการ (Manager)"} ปรับปรุงชั่วคราว
          </h1>
          <p className="text-slate-400 text-sm mb-6">
            ระบบงานฝั่งเว็บไซต์อยู่ระหว่างการปรับปรุงระบบชั่วคราว ขออภัยในความไม่สะดวกครับ กรุณาลองใหม่อีกครั้งในภายหลัง
          </p>
          <div className="text-slate-500 text-xs">
            Powered by Admin Control Panel
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
