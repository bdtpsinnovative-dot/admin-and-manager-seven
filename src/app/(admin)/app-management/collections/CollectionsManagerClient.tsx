"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  ArrowLeft, 
  Layers, 
  Package, 
  Link2, 
  CheckCircle2, 
  Sparkles, 
  ExternalLink,
  Search,
  Plus
} from "lucide-react";
import { 
  JournalCategoryWithImages, 
  JournalImageWithProducts, 
  LinkedProduct 
} from "@/actions/journal-collections";
import ProductPickerModal from "./ProductPickerModal";

export default function CollectionsManagerClient({
  initialCategories,
}: {
  initialCategories: JournalCategoryWithImages[];
}) {
  const [categories, setCategories] = useState<JournalCategoryWithImages[]>(initialCategories);
  const [activeCategoryId, setActiveCategoryId] = useState<string>(
    initialCategories[0]?.id || ""
  );

  // Modal State
  const [selectedImage, setSelectedImage] = useState<JournalImageWithProducts | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const currentCategory = categories.find((c) => c.id === activeCategoryId) || categories[0];

  const handleOpenPicker = (image: JournalImageWithProducts) => {
    setSelectedImage(image);
    setIsModalOpen(true);
  };

  const handleSuccessUpdate = (updatedImageId: number, newProducts: LinkedProduct[]) => {
    setCategories((prev) =>
      prev.map((cat) => ({
        ...cat,
        images: cat.images.map((img) =>
          img.id === updatedImageId
            ? { ...img, linkedProducts: newProducts }
            : img
        ),
      }))
    );
  };

  if (!currentCategory) {
    return (
      <div className="p-8 text-center text-slate-500">
        ไม่พบข้อมูล Collection / Journal
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 sm:p-6 lg:p-8 font-sans">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* --- Top Navigation Bar & Category Selector --- */}
        <div className="flex flex-col gap-4 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/app-management"
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-blue-100 px-2 py-0.5 font-mono text-[11px] font-bold text-blue-700">
                  ลำดับ {currentCategory.sortOrder}
                </span>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  {currentCategory.titleEn} {currentCategory.titleTh ? `(${currentCategory.titleTh})` : ""}
                </h1>
              </div>
              <p className="mt-1 text-xs text-slate-500 font-mono">
                Slug: <span className="text-blue-600 font-semibold">{currentCategory.slug}</span> · ทั้งหมด {currentCategory.images.length} รูป
              </p>
            </div>
          </div>

          {/* Category Dropdown/Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-400">เลือกหมวด:</span>
            <div className="flex flex-wrap gap-1.5">
              {categories.map((cat) => {
                const active = cat.id === activeCategoryId;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCategoryId(cat.id)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                      active
                        ? "bg-slate-900 text-white shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
                    }`}
                  >
                    {cat.titleEn}
                    <span className="ml-1.5 opacity-60 font-normal">({cat.images.length})</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* --- Main Collection Images Grid (สไตล์ตามรูปที่ให้มา) --- */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs">
          
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                รายการรูปภาพในหมวด ({currentCategory.images.length} รูป)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                กดที่ปุ่ม <strong>"ผูกสินค้า"</strong> บนรูปเพื่อเลือกสินค้าที่ปรากฏอยู่ในรูปนั้น
              </p>
            </div>
          </div>

          {currentCategory.images.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Layers className="h-10 w-10 mx-auto text-slate-300 mb-2 stroke-1" />
              <p className="text-sm font-semibold text-slate-600">ยังไม่มีรูปภาพในหมวดนี้</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {currentCategory.images.map((img) => {
                const linkedCount = img.linkedProducts.length;
                const isCover = img.sortOrder === 1;

                return (
                  <div
                    key={img.id}
                    className="group relative flex flex-col rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs hover:border-blue-400 hover:shadow-md transition-all duration-200"
                  >
                    {/* Image Area */}
                    <div className="relative aspect-square w-full overflow-hidden bg-slate-100">
                      <img
                        src={img.imageUrl}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />

                      {/* Number & Cover Badge */}
                      <div className="absolute top-2 left-2 flex items-center gap-1">
                        <span className="rounded-md bg-black/70 px-2 py-0.5 text-[10px] font-mono font-bold text-white backdrop-blur-xs">
                          #{img.sortOrder}
                        </span>
                        {isCover && (
                          <span className="rounded-md bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-xs">
                            รูปปก
                          </span>
                        )}
                      </div>

                      {/* Linked Badge overlay */}
                      <div className="absolute bottom-2 left-2 right-2">
                        {linkedCount > 0 ? (
                          <div className="flex items-center justify-between rounded-xl bg-slate-900/80 px-2.5 py-1 text-white backdrop-blur-xs shadow-xs">
                            <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                              <CheckCircle2 className="h-3.5 w-3.5" /> ผูกแล้ว {linkedCount} ชิ้น
                            </span>
                            <div className="flex -space-x-1.5 overflow-hidden">
                              {img.linkedProducts.slice(0, 3).map((p) => (
                                <div key={p.id} className="inline-block h-4 w-4 rounded-full ring-1 ring-white bg-slate-200 overflow-hidden">
                                  {p.imageUrl && <img src={p.imageUrl} alt="" className="h-full w-full object-cover" />}
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-xl bg-amber-500/85 px-2.5 py-1 text-center text-[10px] font-bold text-white backdrop-blur-xs shadow-xs">
                            ยังไม่ได้ผูกสินค้า
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Linked Products Details list (จิ๋ว) */}
                    <div className="p-3 flex-1 flex flex-col justify-between space-y-2.5">
                      {linkedCount > 0 ? (
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            สินค้าในรูปนี้:
                          </p>
                          <div className="space-y-1">
                            {img.linkedProducts.slice(0, 2).map((p) => (
                              <div key={p.id} className="flex items-center gap-1.5 text-xs text-slate-700 truncate">
                                <span className="font-mono text-[10px] font-bold text-blue-600 shrink-0">
                                  {p.sku || `#${p.id}`}
                                </span>
                                <span className="truncate text-slate-600 text-[11px]">{p.name}</span>
                              </div>
                            ))}
                            {linkedCount > 2 && (
                              <p className="text-[10px] font-medium text-slate-400">
                                และอีก {linkedCount - 2} รายการ...
                              </p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic py-1">
                          ยังไม่มีสินค้าที่ผูกไว้กับรูปนี้
                        </p>
                      )}

                      {/* Tag Button */}
                      <button
                        type="button"
                        onClick={() => handleOpenPicker(img)}
                        className={`w-full inline-flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition-all shadow-xs active:scale-95 ${
                          linkedCount > 0
                            ? "bg-slate-100 text-slate-800 hover:bg-blue-50 hover:text-blue-600 border border-slate-200"
                            : "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-600/20"
                        }`}
                      >
                        <Link2 className="h-3.5 w-3.5" />
                        {linkedCount > 0 ? "แก้ไขสินค้าที่ผูก" : "ผูกสินค้าในรูปนี้"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* --- Product Picker Modal --- */}
      <ProductPickerModal
        image={selectedImage}
        categoryTitle={currentCategory.titleEn}
        categories={categories}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleSuccessUpdate}
      />
    </div>
  );
}
