"use client";

import { useState, useEffect } from "react";
import { getCategoryOverview, updateBulkImageUrl } from "@/actions/collection";
import { Image as ImageIcon, RefreshCw, CheckCircle, AlertCircle, UploadCloud, Layers } from "lucide-react";

type CategoryGroup = {
  productSup: string;
  currentImage: string | null;
  itemCount: number;
};

export default function AdminCoverManager() {
  const [categories, setCategories] = useState<CategoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [inputUrls, setInputUrls] = useState<Record<string, string>>({});
  const [updatingSup, setUpdatingSup] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getCategoryOverview();
      setCategories(data);
    } catch (error) {
      console.error("โหลดข้อมูลล้มเหลว", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateImage = async (productSup: string) => {
    const newUrl = inputUrls[productSup];
    if (!newUrl) return alert("กรุณาใส่ลิงก์รูปภาพก่อนกดอัปเดตครับนาย!");

    setUpdatingSup(productSup);
    try {
      await updateBulkImageUrl(productSup, newUrl);
      alert(`อัปเดตรูปภาพให้กลุ่ม [${productSup}] สำเร็จทั้ง ${categories.find(c => c.productSup === productSup)?.itemCount} ชิ้นแล้วครับนาย!`);
      
      setInputUrls(prev => ({ ...prev, [productSup]: "" }));
      await loadData();
    } catch (error: any) {
      alert("เกิดข้อผิดพลาด: " + error.message);
    } finally {
      setUpdatingSup(null);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-[#f4f1eb] flex items-center justify-center text-[#767167]"><RefreshCw className="animate-spin mr-2"/> กำลังจัดเรียงข้อมูลหมวดหมู่...</div>;
  }

  // คำนวณยอดรวม
  const totalCategories = categories.length;
  const totalItems = categories.reduce((sum, cat) => sum + cat.itemCount, 0);

  return (
    <div className="min-h-screen bg-[#f4f1eb] p-6 md:p-12 font-sans">
      <div className="max-w-6xl mx-auto">
        
        {/* Header & Grand Totals */}
        <div className="mb-8 border-b border-[#e1ded7] pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-light tracking-tight text-[#1c1b19] uppercase flex items-center gap-3">
              <ImageIcon className="w-6 h-6 text-[#767167]" /> 
              จัดการรูปปกหมวดหมู่
            </h1>
            <p className="text-[#767167] text-sm mt-2">
              ตรวจสอบและอัปเดตลิงก์รูปภาพยกกลุ่ม (อัปเดต 1 ครั้ง เปลี่ยนทุกชิ้นในหมวด)
            </p>
          </div>
          
          <div className="flex items-center gap-4 bg-white border border-[#e1ded7] px-5 py-3 rounded-xl shadow-sm">
            <div className="flex flex-col items-center px-4 border-r border-[#e1ded7]">
              <span className="text-[10px] text-[#767167] uppercase tracking-widest font-semibold">หมวดหมู่ทั้งหมด</span>
              <span className="text-xl font-bold text-[#1c1b19]">{totalCategories}</span>
            </div>
            <div className="flex flex-col items-center px-4">
              <span className="text-[10px] text-[#767167] uppercase tracking-widest font-semibold">พรอพรวมทุกชิ้น</span>
              <span className="text-xl font-bold text-[#1c1b19]">{totalItems}</span>
            </div>
          </div>
        </div>

        {/* List แถวยาว (1 แถวต่อ 1 หมวดหมู่) */}
        <div className="space-y-4">
          {categories.map((cat) => (
            <div 
              key={cat.productSup} 
              className="bg-white border border-[#e1ded7] rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center gap-6 hover:border-[#cdcac1] transition-colors"
            >
              
              {/* 1. รูป Thumbnail ทางซ้ายสุด */}
              <div className="w-24 h-24 flex-shrink-0 bg-[#ece9e4] rounded-xl overflow-hidden border border-[#e1ded7] relative flex items-center justify-center">
                {cat.currentImage ? (
                  <img src={cat.currentImage} alt={cat.productSup} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center text-[#9a9488]">
                    <ImageIcon className="w-6 h-6 opacity-40 mb-1" />
                    <span className="text-[8px] uppercase tracking-widest font-medium">No Image</span>
                  </div>
                )}
              </div>

              {/* 2. ข้อมูลชื่อกลุ่มและสถานะ */}
              <div className="w-full md:w-48 flex-shrink-0 flex flex-col gap-1">
                <h3 className="text-sm font-bold text-[#1c1b19] uppercase tracking-wider">{cat.productSup}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="bg-[#f4f1eb] text-[#646057] text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider border border-[#e1ded7]">
                    ยอดรวม {cat.itemCount} ชิ้น
                  </span>
                </div>
                <div className="mt-2">
                  {cat.currentImage ? (
                    <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5"/> มีรูปปกแล้ว</span>
                  ) : (
                    <span className="text-[10px] text-rose-500 font-medium flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5"/> รออัปเดตรูปปก</span>
                  )}
                </div>
              </div>

              {/* 3. ช่องกรอก URL ตรงกลาง */}
              <div className="flex-grow w-full">
                <label className="text-[10px] uppercase tracking-wider text-[#767167] font-medium block mb-1.5">
                  วางลิงก์รูปภาพใหม่ (URL)
                </label>
                <input 
                  type="url" 
                  placeholder="https://.../image.jpg" 
                  value={inputUrls[cat.productSup] || ""}
                  onChange={(e) => setInputUrls({ ...inputUrls, [cat.productSup]: e.target.value })}
                  className="w-full text-xs bg-[#f4f1eb]/50 border border-[#cdcac1] rounded-xl px-4 py-3 focus:outline-none focus:border-[#1c1b19] transition-colors"
                />
              </div>

              {/* 4. ปุ่มเซฟขวาสุด */}
              <div className="w-full md:w-36 flex-shrink-0 mt-4 md:mt-0 md:self-end md:mb-1">
                <button 
                  onClick={() => handleUpdateImage(cat.productSup)}
                  disabled={updatingSup === cat.productSup || !inputUrls[cat.productSup]}
                  className="w-full bg-[#1c1b19] hover:bg-[#34322f] text-white text-[11px] uppercase tracking-widest font-medium py-3 rounded-xl transition-colors disabled:opacity-30 flex items-center justify-center gap-2"
                >
                  {updatingSup === cat.productSup ? (
                    <><RefreshCw className="w-3.5 h-3.5 animate-spin"/> อัปเดต...</>
                  ) : (
                    <><UploadCloud className="w-3.5 h-3.5"/> บันทึก</>
                  )}
                </button>
              </div>

            </div>
          ))}

          {/* กรณีไม่มีข้อมูลเลย */}
          {categories.length === 0 && (
            <div className="text-center py-16 bg-white border border-dashed border-[#cdcac1] rounded-2xl">
              <Layers className="w-8 h-8 mx-auto text-[#cdcac1] mb-3" />
              <p className="text-sm text-[#767167]">ยังไม่มีหมวดหมู่ในระบบครับนาย</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}