"use client";

import { useState } from "react";
import { Smartphone, Globe, Sliders, Download, AlertCircle, Save, Loader2 } from "lucide-react";

interface AppSettings {
  android_app?: {
    maintenance: boolean;
    version: string;
    apk_url: string;
  };
  web_sale?: {
    maintenance: boolean;
  };
  web_manager?: {
    maintenance: boolean;
  };
}

interface Props {
  initialSettings: AppSettings;
  token: string;
}

export default function AppManagementForm({ initialSettings, token }: Props) {
  const [androidMaintenance, setAndroidMaintenance] = useState(
    initialSettings.android_app?.maintenance || false
  );
  const [androidVersion, setAndroidVersion] = useState(
    initialSettings.android_app?.version || "1.0"
  );
  const [androidApkUrl, setAndroidApkUrl] = useState(
    initialSettings.android_app?.apk_url || ""
  );

  const [saleMaintenance, setSaleMaintenance] = useState(
    initialSettings.web_sale?.maintenance || false
  );
  const [managerMaintenance, setManagerMaintenance] = useState(
    initialSettings.web_manager?.maintenance || false
  );

  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSave = async (key: string, value: any) => {
    setSaving(true);
    setStatusMsg(null);
    try {
      const res = await fetch("/api/system-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ key, value }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "บันทึกข้อมูลล้มเหลว");
      }

      setStatusMsg({ type: "success", text: `บันทึกตั้งค่า '${key}' สำเร็จ` });
    } catch (err: any) {
      console.error(err);
      setStatusMsg({ type: "error", text: err.message || "เกิดข้อผิดพลาดในการเชื่อมต่อ" });
    } finally {
      setSaving(false);
    }
  };

  const saveAll = async () => {
    setSaving(true);
    setStatusMsg(null);
    try {
      // Save Android App settings
      const resAndroid = await fetch("/api/system-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          key: "android_app",
          value: {
            maintenance: androidMaintenance,
            version: androidVersion,
            apk_url: androidApkUrl,
          },
        }),
      });

      // Save Sale Console settings
      const resSale = await fetch("/api/system-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          key: "web_sale",
          value: { maintenance: saleMaintenance },
        }),
      });

      // Save Manager Console settings
      const resManager = await fetch("/api/system-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          key: "web_manager",
          value: { maintenance: managerMaintenance },
        }),
      });

      if (!resAndroid.ok || !resSale.ok || !resManager.ok) {
        throw new Error("เกิดข้อผิดพลาดในการบันทึกค่าบางรายการ");
      }

      setStatusMsg({ type: "success", text: "บันทึกการตั้งค่าระบบทั้งหมดสำเร็จเสร็จเรียบร้อย" });
    } catch (err: any) {
      console.error(err);
      setStatusMsg({ type: "error", text: err.message || "เกิดข้อผิดพลาดการเชื่อมต่อ" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 font-sans">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Sliders className="w-8 h-8 text-blue-600" />
            ระบบควบคุมและจัดการแอปพลิเคชัน
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            ปรับเปลี่ยนโหมดปรับปรุงระบบเว็บและแอปพลิเคชัน PDA รวมถึงจัดการเวอร์ชันและไฟล์ติดตั้ง (.APK)
          </p>
        </div>
        
        <button
          onClick={saveAll}
          disabled={saving}
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold px-6 py-3 rounded-xl shadow-md shadow-blue-500/10 hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          บันทึกการตั้งค่าทั้งหมด
        </button>
      </div>

      {/* Notification Toast Alert */}
      {statusMsg && (
        <div
          className={`flex items-start gap-3 p-4 rounded-xl border text-sm transition-all duration-300 animate-fadeIn ${
            statusMsg.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          <AlertCircle className={`w-5 h-5 flex-shrink-0 ${statusMsg.type === "success" ? "text-emerald-500" : "text-rose-500"}`} />
          <div className="font-medium">{statusMsg.text}</div>
        </div>
      )}

      {/* Control Cards Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. Android PDA App Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6 hover:shadow-md transition-shadow duration-300">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
            <div className="bg-emerald-50 p-2.5 rounded-lg text-emerald-600">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">เครื่องสแกน PDA (Android App)</h2>
              <p className="text-xs text-slate-400">ควบคุมแอปพลิเคชันเวอร์ชันเครื่องสแกน RFID</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Maintenance Toggle */}
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
              <div>
                <span className="text-sm font-semibold text-slate-700 block">ปิดปรับปรุงระบบชั่วคราว</span>
                <span className="text-xs text-slate-400">แสดงหน้าปิดระบบขัดขวางบนแอป PDA</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={androidMaintenance}
                  onChange={(e) => setAndroidMaintenance(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>

            {/* Version Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">เลขเวอร์ชันแอปบังคับใช้งาน</label>
              <input
                type="text"
                placeholder="เช่น 1.0.1"
                value={androidVersion}
                onChange={(e) => setAndroidVersion(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            {/* APK URL Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Download className="w-3.5 h-3.5" /> ลิ้งก์ไฟล์ดาวน์โหลดอัปเดต (.APK)
              </label>
              <input
                type="url"
                placeholder="เช่น http://192.168.9.117:3000/downloads/app-debug.apk"
                value={androidApkUrl}
                onChange={(e) => setAndroidApkUrl(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
          </div>
        </div>

        {/* 2. Web Console Toggles */}
        <div className="space-y-6">
          {/* Sale Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4 hover:shadow-md transition-shadow duration-300">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="bg-blue-50 p-2.5 rounded-lg text-blue-600">
                <Globe className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800">ระบบงานขาย (Web Sale Console)</h2>
                <p className="text-xs text-slate-400">ควบคุมการใช้งานหน้าจอ POS แผนกขาย</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
              <div>
                <span className="text-sm font-semibold text-slate-700 block">ปิดปรับปรุงระบบชั่วคราว</span>
                <span className="text-xs text-slate-400">แผงพนักงานขายจะเข้าใช้งานไม่ได้</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={saleMaintenance}
                  onChange={(e) => setSaleMaintenance(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
              </label>
            </div>
          </div>

          {/* Manager Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4 hover:shadow-md transition-shadow duration-300">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="bg-indigo-50 p-2.5 rounded-lg text-indigo-600">
                <Sliders className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800">ระบบผู้จัดการ (Web Manager Console)</h2>
                <p className="text-xs text-slate-400">ควบคุมสิทธิ์และเปิด/ปิดระบบฝ่ายผู้บริหาร</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
              <div>
                <span className="text-sm font-semibold text-slate-700 block">ปิดปรับปรุงระบบชั่วคราว</span>
                <span className="text-xs text-slate-400">หน้าต่าง Manager จะเปิดโมดูลแจ้งปรับปรุง</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={managerMaintenance}
                  onChange={(e) => setManagerMaintenance(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
