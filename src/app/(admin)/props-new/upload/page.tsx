"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { addProp } from "@/actions/props";
import { ArrowLeft, Save, Loader2, PackageOpen } from "lucide-react";
import Link from "next/link";

export default function UploadPropPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addProp(new FormData(e.currentTarget));
      alert("บันทึกสินค้า Prop เรียบร้อยแล้ว");
      router.push("/props-new");
    } catch (err: any) {
      alert("มีปัญหาตอนบันทึก: " + err.message);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6 text-slate-800">
      
      {/* Back link */}
      <div className="mb-4">
        <Link href="/props-new" className="inline-flex items-center text-sm text-slate-500 hover:text-blue-600 transition">
          <ArrowLeft className="w-4 h-4 mr-1" /> กลับหน้าคลัง Props
        </Link>
      </div>

      <div className="bg-white rounded border border-slate-200 p-6 shadow-sm">
        <div className="mb-8 border-b border-slate-100 pb-4">
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <PackageOpen className="w-6 h-6 text-indigo-600" />
            <span>เพิ่มสินค้าใหม่ (New Prop)</span>
          </h1>
          <p className="text-slate-500 text-xs mt-1">กรอกข้อมูลเพื่อบันทึกสินค้าประกอบฉากเข้าคลังสต็อก</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Item NO. (SKU)</label>
              <input name="item_no" required placeholder="เช่น HPST..." className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded text-sm focus:border-indigo-500 outline-none font-medium" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">CODE/SKU (Barcode)</label>
              <input name="code_sku" required placeholder="เช่น ML-VA-CR-..." className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded text-sm focus:border-indigo-500 outline-none font-medium" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Color (สีสินค้า)</label>
            <input name="color" placeholder="Pink, Grey, Beige..." className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded text-sm focus:border-indigo-500 outline-none font-medium" />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">URL รูปภาพ</label>
            <input
              name="image_url"
              type="url"
              placeholder="https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/..."
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded text-xs focus:border-indigo-500 outline-none font-mono"
            />
            <p className="text-[10px] text-slate-400">ระบุ URL ไฟล์รูปภาพจากคลังเก็บรูป R2 (หากไม่มีรูปให้เว้นว่างไว้ก่อน)</p>
          </div>

          {/* Dimensions */}
          <div className="bg-slate-50 rounded border border-slate-200 p-4">
            <p className="text-xs font-bold text-slate-500 uppercase mb-4 text-center tracking-wider border-b border-slate-200 pb-2">ขนาดสินค้า (Dimensions - Centimeters)</p>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-blue-600 uppercase text-center block">Width (W)</label>
                <input name="width_cm" type="number" step="0.1" placeholder="0.0" className="w-full p-2 bg-white border border-slate-200 rounded outline-none text-center font-bold text-blue-600 focus:border-blue-400" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-green-600 uppercase text-center block">Depth (D)</label>
                <input name="length_cm" type="number" step="0.1" placeholder="0.0" className="w-full p-2 bg-white border border-slate-200 rounded outline-none text-center font-bold text-green-600 focus:border-green-400" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-purple-600 uppercase text-center block">Height (H)</label>
                <input name="thickness_cm" type="number" step="0.1" placeholder="0.0" className="w-full p-2 bg-white border border-slate-200 rounded outline-none text-center font-bold text-purple-600 focus:border-purple-400" />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold text-sm transition disabled:bg-slate-300 flex items-center justify-center gap-2 shadow-sm"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>กำลังบันทึกลงฐานข้อมูล...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>บันทึกข้อมูลสินค้า</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
