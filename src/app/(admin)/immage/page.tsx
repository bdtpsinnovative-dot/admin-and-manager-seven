"use client";

import { useState, useEffect, useMemo } from "react";
import { getCategoryOverview, updateBulkImageUrl, toggleTempImageStatus } from "@/actions/collection";
import { 
  Image as ImageIcon, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  UploadCloud, 
  Layers, 
  ExternalLink,
  AlertTriangle,
  Search,
  Sparkles,
  Armchair
} from "lucide-react";

type CategoryGroup = {
  productSup: string;
  currentImage: string | null;
  isTempImage: boolean;
  itemCount: number;
  isProp: boolean;
  tag: string;
};

export default function AdminCoverManager() {
  const [categories, setCategories] = useState<CategoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [inputUrls, setInputUrls] = useState<Record<string, string>>({});
  const [isTempInputs, setIsTempInputs] = useState<Record<string, boolean>>({});
  const [updatingSup, setUpdatingSup] = useState<string | null>(null);
  const [togglingSup, setTogglingSup] = useState<string | null>(null);
  
  // Filters & Search
  const [websiteFilter, setWebsiteFilter] = useState<"prop" | "furniture" | "all">("prop");
  const [statusFilter, setStatusFilter] = useState<"all" | "temp" | "missing" | "ready">("all");
  const [searchQuery, setSearchQuery] = useState("");

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

    const isTemp = isTempInputs[productSup] || false;

    setUpdatingSup(productSup);
    try {
      await updateBulkImageUrl(productSup, newUrl, isTemp);
      alert(`อัปเดตรูปภาพให้กลุ่ม [${productSup}] สำเร็จแล้วครับนาย!`);
      
      setInputUrls(prev => ({ ...prev, [productSup]: "" }));
      await loadData();
    } catch (error: any) {
      alert("เกิดข้อผิดพลาด: " + error.message);
    } finally {
      setUpdatingSup(null);
    }
  };

  const handleToggleTemp = async (cat: CategoryGroup) => {
    const nextStatus = !cat.isTempImage;
    setTogglingSup(cat.productSup);
    
    // Optimistic UI update
    setCategories(prev => prev.map(c => c.productSup === cat.productSup ? { ...c, isTempImage: nextStatus } : c));
    
    try {
      await toggleTempImageStatus(cat.productSup, nextStatus);
    } catch (error: any) {
      alert("เกิดข้อผิดพลาดในการเปลี่ยนสถานะ: " + error.message);
      await loadData();
    } finally {
      setTogglingSup(null);
    }
  };

  // กรองตามประเภทเว็บไซต์ก่อน (Prop vs Furniture)
  const scopedCategories = useMemo(() => {
    return categories.filter(cat => {
      if (websiteFilter === "prop") return cat.isProp;
      if (websiteFilter === "furniture") return !cat.isProp;
      return true;
    });
  }, [categories, websiteFilter]);

  // คำนวณยอดรวมตาม Scope ที่เลือก
  const totalCategories = scopedCategories.length;
  const totalItems = scopedCategories.reduce((sum, cat) => sum + cat.itemCount, 0);
  const tempCount = scopedCategories.filter(cat => cat.currentImage && cat.isTempImage).length;
  const missingCount = scopedCategories.filter(cat => !cat.currentImage).length;
  const readyCount = scopedCategories.filter(cat => cat.currentImage && !cat.isTempImage).length;

  const propTotalCount = categories.filter(c => c.isProp).length;
  const furnitureTotalCount = categories.filter(c => !c.isProp).length;

  // กรองตามการค้นหาและแท็บสถานะ
  const filteredCategories = useMemo(() => {
    return scopedCategories.filter(cat => {
      const matchSearch = cat.productSup.toLowerCase().includes(searchQuery.toLowerCase().trim());
      if (!matchSearch) return false;

      if (statusFilter === "temp") return !!cat.currentImage && cat.isTempImage;
      if (statusFilter === "missing") return !cat.currentImage;
      if (statusFilter === "ready") return !!cat.currentImage && !cat.isTempImage;
      return true;
    });
  }, [scopedCategories, searchQuery, statusFilter]);

  if (loading) {
    return <div className="min-h-screen bg-[#f4f1eb] flex items-center justify-center text-[#767167]"><RefreshCw className="animate-spin mr-2"/> กำลังจัดเรียงข้อมูลหมวดหมู่...</div>;
  }

  return (
    <div className="min-h-screen bg-[#f4f1eb] p-6 md:p-12 font-sans">
      <div className="max-w-6xl mx-auto">
        
        {/* Header & Grand Totals */}
        <div className="mb-6 border-b border-[#e1ded7] pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-light tracking-tight text-[#1c1b19] uppercase flex items-center gap-3">
              <ImageIcon className="w-6 h-6 text-[#767167]" /> 
              จัดการรูปปกหมวดหมู่
            </h1>
            <p className="text-[#767167] text-sm mt-2">
              ตรวจสอบและอัปเดตลิงก์รูปภาพยกกลุ่ม พร้อมแยกหมวดพรอพ (Terra) และเฟอร์นิเจอร์
            </p>
          </div>
          
          {/* Status Badges Cards */}
          <div className="flex flex-wrap items-center gap-3 bg-white border border-[#e1ded7] p-3 rounded-2xl shadow-sm">
            <div className="flex flex-col items-center px-3 border-r border-[#e1ded7]">
              <span className="text-[9px] text-[#767167] uppercase tracking-widest font-semibold">หมวดหมู่</span>
              <span className="text-lg font-bold text-[#1c1b19]">{totalCategories}</span>
            </div>
            <div className="flex flex-col items-center px-3 border-r border-[#e1ded7]">
              <span className="text-[9px] text-amber-600 uppercase tracking-widest font-semibold flex items-center gap-1">
                <AlertTriangle className="w-3 h-3"/> รูปชั่วคราว
              </span>
              <span className="text-lg font-bold text-amber-600">{tempCount}</span>
            </div>
            <div className="flex flex-col items-center px-3 border-r border-[#e1ded7]">
              <span className="text-[9px] text-rose-500 uppercase tracking-widest font-semibold flex items-center gap-1">
                <AlertCircle className="w-3 h-3"/> รอรูปปก
              </span>
              <span className="text-lg font-bold text-rose-500">{missingCount}</span>
            </div>
            <div className="flex flex-col items-center px-3">
              <span className="text-[9px] text-emerald-600 uppercase tracking-widest font-semibold flex items-center gap-1">
                <CheckCircle className="w-3 h-3"/> รูปจริง
              </span>
              <span className="text-lg font-bold text-emerald-600">{readyCount}</span>
            </div>
          </div>
        </div>

        {/* 🌟 1. ปุ่มเลือกประเภทเว็บ (Prop Terra Studio vs Furniture) */}
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <button
            onClick={() => setWebsiteFilter("prop")}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 shadow-sm ${websiteFilter === "prop" ? "bg-[#1c1b19] text-white" : "bg-white text-[#646057] hover:bg-[#e8e4dc] border border-[#e1ded7]"}`}
          >
            <Sparkles className="w-4 h-4 text-amber-400"/>
            <span>พรอพ / ของตกแต่ง (Terra Studio)</span>
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px]">{propTotalCount} หมวด</span>
          </button>

          <button
            onClick={() => setWebsiteFilter("furniture")}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 shadow-sm ${websiteFilter === "furniture" ? "bg-[#1c1b19] text-white" : "bg-white text-[#646057] hover:bg-[#e8e4dc] border border-[#e1ded7]"}`}
          >
            <Armchair className="w-4 h-4 text-blue-400"/>
            <span>เฟอร์นิเจอร์ (เว็บอื่น)</span>
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px]">{furnitureTotalCount} หมวด</span>
          </button>

          <button
            onClick={() => setWebsiteFilter("all")}
            className={`px-4 py-2.5 rounded-xl text-xs font-medium transition-all shadow-sm ${websiteFilter === "all" ? "bg-[#1c1b19] text-white" : "bg-white text-[#646057] hover:bg-[#e8e4dc] border border-[#e1ded7]"}`}
          >
            ดูทั้งหมด ({categories.length})
          </button>
        </div>

        {/* Filter Bar & Search */}
        <div className="mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 bg-[#e8e4dc] p-1.5 rounded-xl w-full md:w-auto overflow-x-auto">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${statusFilter === "all" ? "bg-white text-[#1c1b19] shadow-sm" : "text-[#767167] hover:text-[#1c1b19]"}`}
            >
              ทั้งหมด ({totalCategories})
            </button>
            <button
              onClick={() => setStatusFilter("temp")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${statusFilter === "temp" ? "bg-amber-500 text-white shadow-sm font-semibold" : "text-amber-700 hover:bg-amber-100/50"}`}
            >
              <AlertTriangle className="w-3.5 h-3.5"/> รูปชั่วคราว ({tempCount})
            </button>
            <button
              onClick={() => setStatusFilter("missing")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${statusFilter === "missing" ? "bg-rose-500 text-white shadow-sm font-semibold" : "text-rose-700 hover:bg-rose-100/50"}`}
            >
              <AlertCircle className="w-3.5 h-3.5"/> รอรูปปก ({missingCount})
            </button>
            <button
              onClick={() => setStatusFilter("ready")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${statusFilter === "ready" ? "bg-emerald-600 text-white shadow-sm font-semibold" : "text-emerald-700 hover:bg-emerald-100/50"}`}
            >
              <CheckCircle className="w-3.5 h-3.5"/> รูปจริง ({readyCount})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#767167]" />
            <input
              type="text"
              placeholder="ค้นหาชื่อหมวดหมู่..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-[#cdcac1] rounded-xl focus:outline-none focus:border-[#1c1b19] transition-colors shadow-sm"
            />
          </div>

        </div>

        {/* List แถวยาว (1 แถวต่อ 1 หมวดหมู่) */}
        <div className="space-y-4">
          {filteredCategories.map((cat) => (
            <div 
              key={cat.productSup} 
              className={`bg-white border rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center gap-6 transition-all ${cat.isTempImage && cat.currentImage ? "border-amber-300 bg-amber-50/20" : "border-[#e1ded7] hover:border-[#cdcac1]"}`}
            >
              
              {/* 1. รูป Thumbnail ทางซ้ายสุด */}
              <div className="w-24 h-24 flex-shrink-0 bg-[#ece9e4] rounded-xl overflow-hidden border border-[#e1ded7] relative flex items-center justify-center">
                {cat.currentImage ? (
                  <>
                    <img src={cat.currentImage} alt={cat.productSup} className="w-full h-full object-cover" />
                    {cat.isTempImage && (
                      <div className="absolute top-1 left-1 bg-amber-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded shadow flex items-center gap-0.5">
                        <AlertTriangle className="w-2.5 h-2.5"/> รอแก้
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center text-[#9a9488]">
                    <ImageIcon className="w-6 h-6 opacity-40 mb-1" />
                    <span className="text-[8px] uppercase tracking-widest font-medium">No Image</span>
                  </div>
                )}
              </div>

              {/* 2. ข้อมูลชื่อกลุ่มและสถานะ */}
              <div className="w-full md:w-52 flex-shrink-0 flex flex-col gap-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="text-sm font-bold text-[#1c1b19] uppercase tracking-wider">{cat.productSup}</h3>
                </div>

                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {cat.isProp ? (
                    <span className="bg-amber-100/70 text-amber-800 text-[9px] font-semibold px-2 py-0.5 rounded uppercase tracking-wider border border-amber-300">
                      🏺 Prop (Terra)
                    </span>
                  ) : (
                    <span className="bg-slate-100 text-slate-600 text-[9px] font-semibold px-2 py-0.5 rounded uppercase tracking-wider border border-slate-300">
                      🪑 เฟอร์นิเจอร์ (เว็บอื่น)
                    </span>
                  )}
                  <span className="bg-[#f4f1eb] text-[#646057] text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider border border-[#e1ded7]">
                    ยอดรวม {cat.itemCount} ชิ้น
                  </span>
                </div>
                
                {/* Status Badges */}
                <div className="mt-2 flex flex-col gap-1.5">
                  {!cat.currentImage ? (
                    <span className="text-[10px] text-rose-500 font-medium flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5"/> รออัปเดตรูปปก
                    </span>
                  ) : cat.isTempImage ? (
                    <span className="text-[10px] text-amber-600 font-semibold flex items-center gap-1.5 bg-amber-100/70 px-2 py-0.5 rounded-md w-fit border border-amber-300">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600"/> รูปชั่วคราว (รอแก้)
                    </span>
                  ) : (
                    <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5"/> รูปจริงพร้อมใช้งาน
                    </span>
                  )}

                  {/* Toggle Button for Temporary Status */}
                  {cat.currentImage && (
                    <button
                      onClick={() => handleToggleTemp(cat)}
                      disabled={togglingSup === cat.productSup}
                      title="กดเพื่อสลับสถานะรูปชั่วคราว/รูปจริง"
                      className={`text-[10px] font-medium px-2 py-1 rounded-lg border transition-all flex items-center gap-1.5 w-fit mt-1 ${cat.isTempImage ? "bg-amber-100 border-amber-300 text-amber-800 hover:bg-amber-200" : "bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200"}`}
                    >
                      <input 
                        type="checkbox" 
                        checked={cat.isTempImage} 
                        readOnly 
                        className="cursor-pointer accent-amber-600 w-3 h-3" 
                      />
                      <span>{cat.isTempImage ? "มาร์คเป็นรูปชั่วคราวไว้" : "ตั้งเป็นรูปชั่วคราว (รอแก้)"}</span>
                    </button>
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
                
                {/* Option to mark as temp during upload */}
                <div className="mt-2 flex items-center gap-2">
                  <label className="text-[10px] text-[#767167] flex items-center gap-1.5 cursor-pointer select-none">
                    <input 
                      type="checkbox"
                      checked={isTempInputs[cat.productSup] || false}
                      onChange={(e) => setIsTempInputs({ ...isTempInputs, [cat.productSup]: e.target.checked })}
                      className="accent-amber-600 w-3 h-3 rounded"
                    />
                    <span>บันทึกรูปนี้เป็น <strong className="text-amber-700 font-medium">รูปชั่วคราว (รอแก้)</strong></span>
                  </label>
                </div>
              </div>

              {/* 4. ปุ่มเซฟและปุ่มเปิดดูหน้าเว็บจริง */}
              <div className="w-full md:w-56 flex-shrink-0 mt-4 md:mt-0 md:self-end md:mb-1 flex items-center gap-2">
                <button 
                  onClick={() => handleUpdateImage(cat.productSup)}
                  disabled={updatingSup === cat.productSup || !inputUrls[cat.productSup]}
                  className="flex-1 bg-[#1c1b19] hover:bg-[#34322f] text-white text-[11px] uppercase tracking-widest font-medium py-3 rounded-xl transition-colors disabled:opacity-30 flex items-center justify-center gap-2"
                >
                  {updatingSup === cat.productSup ? (
                    <><RefreshCw className="w-3.5 h-3.5 animate-spin"/> อัปเดต...</>
                  ) : (
                    <><UploadCloud className="w-3.5 h-3.5"/> บันทึก</>
                  )}
                </button>

                {cat.isProp ? (
                  <a
                    href={`https://terrahome-studio.com/prop?category=${encodeURIComponent(cat.productSup)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="เปิดดูหน้าเว็บ Terra Home Studio"
                    className="flex items-center justify-center gap-1.5 bg-[#f4f1eb] hover:bg-[#e8e4dc] border border-[#cdcac1] text-[#1c1b19] text-[11px] uppercase tracking-wider font-medium px-3.5 py-3 rounded-xl transition-colors flex-shrink-0"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-[#767167]"/>
                    <span>ดูเว็บ</span>
                  </a>
                ) : (
                  <span 
                    title="หมวดนี้เป็นของเว็บเฟอร์นิเจอร์ ไม่มีในเว็บ Prop"
                    className="text-[10px] text-gray-400 bg-gray-100 border border-gray-200 px-2 py-3 rounded-xl text-center flex-shrink-0 select-none"
                  >
                    (เว็บอื่น)
                  </span>
                )}
              </div>

            </div>
          ))}

          {/* กรณีไม่มีข้อมูลที่ตรงกับเงื่อนไขการค้นหา */}
          {filteredCategories.length === 0 && (
            <div className="text-center py-16 bg-white border border-dashed border-[#cdcac1] rounded-2xl">
              <Layers className="w-8 h-8 mx-auto text-[#cdcac1] mb-3" />
              <p className="text-sm text-[#767167]">ไม่พบหมวดหมู่ที่ตรงกับเงื่อนไขครับนาย</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
