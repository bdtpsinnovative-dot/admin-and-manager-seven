"use client";

import { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import { 
  ArrowLeft, 
  Layers, 
  Package, 
  Link2, 
  CheckCircle2, 
  Sparkles, 
  Plus,
  ArrowUp,
  ArrowDown,
  Star,
  Trash2,
  MoveRight,
  Check,
  X,
  Loader2,
  ExternalLink,
  ImageIcon,
  Eye,
  EyeOff,
  Edit2,
  Search,
  Grid,
  Database
} from "lucide-react";
import { 
  JournalCategoryWithImages, 
  JournalImageWithProducts, 
  LinkedProduct,
  addJournalImages,
  setJournalCoverImage,
  reorderJournalImage,
  moveJournalImagesCategory,
  deleteJournalImages,
  createJournalCategory,
  updateJournalCategory,
  deleteJournalCategory,
  toggleJournalCategoryActive
} from "@/actions/journal-collections";
import ProductPickerModal from "../app-management/collections/ProductPickerModal";

export default function WebGalleryClient({
  initialCategories,
}: {
  initialCategories: JournalCategoryWithImages[];
}) {
  const [categories, setCategories] = useState<JournalCategoryWithImages[]>(initialCategories);
  // activeCategoryId = null หมายถึงอยู่หน้า Overview (รวม 9 หมวด)
  // activeCategoryId = string หมายถึงกำลังเจาะลึกจัดการรูปในหมวดนั้น
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);

  // Search & Filter in Overview
  const [searchQuery, setSearchQuery] = useState("");

  // Selected Images for Bulk Actions (in Category Detail View)
  const [selectedImageIds, setSelectedImageIds] = useState<number[]>([]);
  const [targetMoveCategoryId, setTargetMoveCategoryId] = useState<string>("");

  // Modal States
  const [selectedImageForPicker, setSelectedImageForPicker] = useState<JournalImageWithProducts | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isAddImagesModalOpen, setIsAddImagesModalOpen] = useState(false);
  const [newImageUrlsText, setNewImageUrlsText] = useState("");

  // Category Create / Edit Modal
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<JournalCategoryWithImages | null>(null);
  const [catFormTitleEn, setCatFormTitleEn] = useState("");
  const [catFormTitleTh, setCatFormTitleTh] = useState("");
  const [catFormSlug, setCatFormSlug] = useState("");
  const [catFormQuery, setCatFormQuery] = useState("");
  const [catFormDescEn, setCatFormDescEn] = useState("");
  const [catFormDescTh, setCatFormDescTh] = useState("");
  const [catFormCover, setCatFormCover] = useState("");

  const [isPending, startTransition] = useTransition();

  const currentCategory = activeCategoryId 
    ? categories.find((c) => c.id === activeCategoryId) || null 
    : null;

  // Stats
  const totalCategories = categories.length;
  const totalImages = categories.reduce((sum, c) => sum + c.images.length, 0);
  const activeCategoriesCount = categories.filter((c) => c.isActive).length;

  const filteredCategories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter(
      (c) =>
        c.titleEn.toLowerCase().includes(q) ||
        c.titleTh.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q) ||
        (c.categoryQuery && c.categoryQuery.toLowerCase().includes(q))
    );
  }, [categories, searchQuery]);

  // Selection Logic
  const handleToggleSelectImage = (id: number) => {
    setSelectedImageIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (!currentCategory) return;
    if (selectedImageIds.length === currentCategory.images.length) {
      setSelectedImageIds([]);
    } else {
      setSelectedImageIds(currentCategory.images.map((img) => img.id));
    }
  };

  // 1. Tag Products
  const handleOpenPicker = (image: JournalImageWithProducts) => {
    setSelectedImageForPicker(image);
    setIsPickerOpen(true);
  };

  const handleSuccessProductTag = (updatedImageId: number, newProducts: LinkedProduct[]) => {
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

  // 2. Set Cover Image
  const handleSetCover = (imageId: number) => {
    if (!currentCategory) return;
    startTransition(async () => {
      try {
        await setJournalCoverImage(currentCategory.id, imageId);
        setCategories((prev) =>
          prev.map((cat) => {
            if (cat.id !== currentCategory.id) return cat;
            const target = cat.images.find((i) => i.id === imageId);
            const others = cat.images.filter((i) => i.id !== imageId);
            const reordered = target ? [target, ...others] : cat.images;
            return {
              ...cat,
              coverImageUrl: target?.imageUrl || cat.coverImageUrl,
              images: reordered.map((img, idx) => ({ ...img, sortOrder: idx + 1 })),
            };
          })
        );
      } catch (err: any) {
        alert(err.message || "เกิดข้อผิดพลาดในการตั้งรูปปก");
      }
    });
  };

  // 3. Reorder Image (Up/Down)
  const handleReorder = (imageId: number, direction: "up" | "down") => {
    if (!currentCategory) return;
    startTransition(async () => {
      try {
        await reorderJournalImage(imageId, direction, currentCategory.id);
        setCategories((prev) =>
          prev.map((cat) => {
            if (cat.id !== currentCategory.id) return cat;
            const idx = cat.images.findIndex((i) => i.id === imageId);
            if (idx === -1) return cat;
            const targetIdx = direction === "up" ? idx - 1 : idx + 1;
            if (targetIdx < 0 || targetIdx >= cat.images.length) return cat;

            const newImgs = [...cat.images];
            const temp = newImgs[idx];
            newImgs[idx] = newImgs[targetIdx];
            newImgs[targetIdx] = temp;

            return {
              ...cat,
              images: newImgs.map((img, i) => ({ ...img, sortOrder: i + 1 })),
            };
          })
        );
      } catch (err: any) {
        alert(err.message || "ไม่สามารถสลับลำดับได้");
      }
    });
  };

  // 4. Add Images
  const handleAddImages = () => {
    if (!currentCategory) return;
    const urls = newImageUrlsText
      .split("\n")
      .map((u) => u.trim())
      .filter((u) => u.startsWith("http"));

    if (urls.length === 0) {
      alert("กรุณากรอก URL รูปภาพที่ถูกต้องอย่างน้อย 1 ลิงก์");
      return;
    }

    startTransition(async () => {
      try {
        await addJournalImages(currentCategory.id, urls);
        setIsAddImagesModalOpen(false);
        setNewImageUrlsText("");
        window.location.reload();
      } catch (err: any) {
        alert(err.message || "ไม่สามารถเพิ่มรูปภาพได้");
      }
    });
  };

  // 5. Bulk Move Category
  const handleBulkMove = () => {
    if (selectedImageIds.length === 0 || !targetMoveCategoryId) return;

    startTransition(async () => {
      try {
        await moveJournalImagesCategory(selectedImageIds, targetMoveCategoryId);
        setSelectedImageIds([]);
        window.location.reload();
      } catch (err: any) {
        alert(err.message || "ไม่สามารถย้ายหมวดหมู่ได้");
      }
    });
  };

  // 6. Delete Image(s)
  const handleDeleteImages = (ids: number[]) => {
    if (!confirm(`คุณต้องการลบรูปภาพที่เลือกจำนวน ${ids.length} รูปใช่หรือไม่?`)) return;

    startTransition(async () => {
      try {
        await deleteJournalImages(ids);
        setSelectedImageIds([]);
        setCategories((prev) =>
          prev.map((cat) => ({
            ...cat,
            images: cat.images.filter((img) => !ids.includes(img.id)),
          }))
        );
      } catch (err: any) {
        alert(err.message || "ไม่สามารถลบรูปภาพได้");
      }
    });
  };

  // 7. Toggle Category Active
  const handleToggleCategoryActive = (category: JournalCategoryWithImages) => {
    const nextStatus = !category.isActive;
    startTransition(async () => {
      try {
        await toggleJournalCategoryActive(category.id, nextStatus);
        setCategories((prev) =>
          prev.map((c) => (c.id === category.id ? { ...c, isActive: nextStatus } : c))
        );
      } catch (err: any) {
        alert(err.message || "ไม่สามารถเปลี่ยนสถานะได้");
      }
    });
  };

  // 8. Open Category Modal (Create / Edit)
  const handleOpenCategoryModal = (cat?: JournalCategoryWithImages) => {
    if (cat) {
      setEditingCategory(cat);
      setCatFormTitleEn(cat.titleEn);
      setCatFormTitleTh(cat.titleTh);
      setCatFormSlug(cat.slug);
      setCatFormQuery(cat.categoryQuery || "");
      setCatFormDescEn(cat.descriptionEn || "");
      setCatFormDescTh(cat.descriptionTh || "");
      setCatFormCover(cat.coverImageUrl || "");
    } else {
      setEditingCategory(null);
      setCatFormTitleEn("");
      setCatFormTitleTh("");
      setCatFormSlug("");
      setCatFormQuery("");
      setCatFormDescEn("");
      setCatFormDescTh("");
      setCatFormCover("");
    }
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = () => {
    if (!catFormTitleEn || !catFormSlug) {
      alert("กรุณากรอกชื่อหมวดหมู่ (EN) และ Slug");
      return;
    }

    startTransition(async () => {
      try {
        const payload = {
          titleEn: catFormTitleEn,
          titleTh: catFormTitleTh,
          slug: catFormSlug,
          categoryQuery: catFormQuery,
          descriptionEn: catFormDescEn,
          descriptionTh: catFormDescTh,
          coverImageUrl: catFormCover,
        };

        if (editingCategory) {
          await updateJournalCategory(editingCategory.id, payload);
        } else {
          await createJournalCategory(payload);
        }

        setIsCategoryModalOpen(false);
        window.location.reload();
      } catch (err: any) {
        alert(err.message || "ไม่สามารถบันทึกหมวดหมู่ได้");
      }
    });
  };

  const handleDeleteCategory = (cat: JournalCategoryWithImages) => {
    if (!confirm(`คุณต้องการลบหมวดหมู่ "${cat.titleEn}" พร้อมรูปภาพทั้งหมดในหมวดนี้หรือไม่?`)) return;

    startTransition(async () => {
      try {
        await deleteJournalCategory(cat.id);
        setCategories((prev) => prev.filter((c) => c.id !== cat.id));
      } catch (err: any) {
        alert(err.message || "ไม่สามารถลบหมวดหมู่ได้");
      }
    });
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 sm:p-6 lg:p-8 font-sans text-slate-800">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* ========================================================================= */}
        {/* VIEW 1: OVERVIEW DASHBOARD (หน้ารวมหมวดหมู่ 9 หมวด - ตามรูป Screenshot 100%) */}
        {/* ========================================================================= */}
        {!currentCategory && (
          <div className="space-y-6 animate-in fade-in duration-200">
            
            {/* --- 1. Top Header Banner --- */}
            <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100">
                  <ImageIcon className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                    จัดการ แกลเลอรี่หน้าเว็บ (Journal Collections)
                  </h1>
                  <p className="mt-0.5 text-xs sm:text-sm text-slate-500">
                    จัดการหมวดหมู่ รูปภาพ (90+ รูป) และคำอธิบาย 2 ภาษา สำหรับแสดงผลบนหน้า Journal เว็บไซต์
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleOpenCategoryModal()}
                className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-600/20 hover:bg-blue-700 active:scale-95 transition self-start sm:self-auto"
              >
                <Plus className="h-4 w-4 stroke-[3]" />
                เพิ่มหมวดหมู่ใหม่
              </button>
            </div>

            {/* --- 2. Stats Bar + Search --- */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              
              {/* Stat 1 */}
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
                <div>
                  <p className="text-xs font-semibold text-slate-400">หมวดหมู่ทั้งหมด</p>
                  <p className="mt-1 font-mono text-xl font-bold text-slate-900">{totalCategories} หมวด</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-500 border border-slate-100">
                  <Layers className="h-5 w-5" />
                </div>
              </div>

              {/* Stat 2 */}
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
                <div>
                  <p className="text-xs font-semibold text-slate-400">รูปภาพในระบบ</p>
                  <p className="mt-1 font-mono text-xl font-bold text-blue-600">{totalImages} รูป</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                  <ImageIcon className="h-5 w-5" />
                </div>
              </div>

              {/* Stat 3 */}
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
                <div>
                  <p className="text-xs font-semibold text-slate-400">เปิดแสดงผลหน้าเว็บ</p>
                  <p className="mt-1 font-mono text-xl font-bold text-emerald-600">{activeCategoriesCount} หมวด</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <Eye className="h-5 w-5" />
                </div>
              </div>

              {/* Search Box */}
              <div className="relative flex items-center">
                <Search className="absolute left-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ค้นหาหมวดหมู่, Slug..."
                  className="h-full w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 py-3 text-xs font-medium text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 shadow-2xs"
                />
              </div>

            </div>

            {/* --- 3. Categories Grid List (เหมือนในรูป Screenshot 100%) --- */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredCategories.map((cat) => {
                const cover = cat.coverImageUrl || cat.images[0]?.imageUrl || "";

                return (
                  <div
                    key={cat.id}
                    className="group relative flex flex-col rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-2xs hover:border-slate-300 hover:shadow-lg transition-all duration-300"
                  >
                    {/* Top Cover Image with Badges */}
                    <div className="relative aspect-16/10 w-full overflow-hidden bg-slate-100">
                      {cover ? (
                        <img
                          src={cover}
                          alt={cat.titleEn}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-slate-300">
                          <ImageIcon className="h-10 w-10" />
                        </div>
                      )}

                      {/* Number & Image Count Badge */}
                      <div className="absolute top-3 left-3 flex items-center gap-1.5">
                        <span className="rounded-lg bg-black/70 px-2 py-0.5 font-mono text-[11px] font-bold text-white backdrop-blur-xs">
                          #{String(cat.sortOrder).padStart(2, "0")}
                        </span>
                        <span className="rounded-lg bg-blue-600 px-2 py-0.5 font-mono text-[11px] font-bold text-white shadow-xs">
                          {cat.images.length} รูป
                        </span>
                      </div>

                      {/* Active Status Badge */}
                      <button
                        type="button"
                        onClick={() => handleToggleCategoryActive(cat)}
                        className={`absolute top-3 right-3 flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold backdrop-blur-xs shadow-xs transition ${
                          cat.isActive
                            ? "bg-emerald-500/90 text-white"
                            : "bg-slate-700/80 text-slate-300"
                        }`}
                      >
                        {cat.isActive ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                        {cat.isActive ? "เปิดอยู่" : "ปิดอยู่"}
                      </button>
                    </div>

                    {/* Content Section */}
                    <div className="flex-1 p-5 flex flex-col justify-between space-y-4">
                      <div className="space-y-2">
                        {/* Title EN & Slug */}
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-base font-bold text-slate-900 tracking-tight">
                            {cat.titleEn}
                          </h3>
                          <span className="rounded-md bg-blue-50 px-2 py-0.5 font-mono text-[10px] font-bold text-blue-600">
                            /{cat.slug}
                          </span>
                        </div>

                        {/* Title TH */}
                        {cat.titleTh && (
                          <p className="text-xs font-semibold text-slate-600">{cat.titleTh}</p>
                        )}

                        {/* Description */}
                        {cat.descriptionTh || cat.descriptionEn ? (
                          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                            {cat.descriptionTh || cat.descriptionEn}
                          </p>
                        ) : null}

                        {/* Product Category Link Tag */}
                        {cat.categoryQuery && (
                          <div className="pt-1">
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                              ลิงก์สินค้า: {cat.categoryQuery}
                            </span>
                          </div>
                        )}

                        {/* Mini Thumbnails Strip */}
                        <div className="flex items-center gap-1.5 pt-2">
                          {cat.images.slice(0, 4).map((img) => (
                            <div
                              key={img.id}
                              className="relative h-10 w-10 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 shrink-0"
                            >
                              <img src={img.imageUrl} alt="" className="h-full w-full object-cover" />
                            </div>
                          ))}
                          {cat.images.length > 4 && (
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 font-mono text-xs font-bold text-slate-500">
                              +{cat.images.length - 4}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Card Action Buttons (เข้าจัดการรูปภาพ / แก้ไข / ลบ) */}
                      <div className="flex items-center gap-2 border-t border-slate-100 pt-3">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveCategoryId(cat.id);
                            setSelectedImageIds([]);
                          }}
                          className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-50 py-2.5 text-xs font-bold text-blue-700 hover:bg-blue-600 hover:text-white transition shadow-2xs active:scale-95"
                        >
                          <ImageIcon className="h-4 w-4" />
                          จัดการรูปภาพ ({cat.images.length})
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => handleOpenCategoryModal(cat)}
                          className="rounded-xl border border-slate-200 p-2.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"
                          title="แก้ไขข้อมูลหมวดหมู่"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(cat)}
                          className="rounded-xl border border-slate-200 p-2.5 text-slate-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition"
                          title="ลบหมวดหมู่นี้"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: CATEGORY IMAGES & PRODUCT TAGGING (จัดการรูปในหมวด & ผูกสินค้า) */}
        {/* ========================================================================= */}
        {currentCategory && (
          <div className="space-y-6 animate-in fade-in duration-200">
            
            {/* Top Navigation Bar & Category Tabs */}
            <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-xs sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setActiveCategoryId(null);
                    setSelectedImageIds([]);
                  }}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 shadow-2xs"
                  title="กลับสู่หน้ารวมหมวดหมู่"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-blue-100 px-2.5 py-0.5 font-mono text-xs font-bold text-blue-700">
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

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddImagesModalOpen(true)}
                  className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-600/20 hover:bg-blue-700 active:scale-95 transition"
                >
                  <Plus className="h-4 w-4 stroke-[3]" />
                  เพิ่มรูปภาพ (วางหลายลิงก์)
                </button>

                {/* Switcher */}
                <div className="flex flex-wrap gap-1.5 ml-2 border-l border-slate-200 pl-3">
                  {categories.map((cat) => {
                    const active = cat.id === activeCategoryId;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setActiveCategoryId(cat.id);
                          setSelectedImageIds([]);
                        }}
                        className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                          active
                            ? "bg-slate-900 text-white shadow-xs"
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

            {/* Selection / Bulk Actions Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 shadow-2xs">
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={currentCategory.images.length > 0 && selectedImageIds.length === currentCategory.images.length}
                    onChange={handleSelectAll}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs font-bold text-slate-800">
                    เลือกทั้งหมดในหมวดนี้ ({currentCategory.images.length} รูป)
                  </span>
                </label>
                <span className="hidden sm:inline text-xs text-slate-400">|</span>
                <span className="text-xs text-slate-500">
                  คลิกที่รูปเพื่อเลือก / กดย้ายข้ามหมวดได้ง่ายๆ
                </span>
              </div>

              {selectedImageIds.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 animate-in fade-in duration-150">
                  <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                    เลือกแล้ว {selectedImageIds.length} รูป
                  </span>

                  <div className="flex items-center gap-1">
                    <select
                      value={targetMoveCategoryId}
                      onChange={(e) => setTargetMoveCategoryId(e.target.value)}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800 outline-none"
                    >
                      <option value="">เลือกหมวดที่ต้องการย้ายไป...</option>
                      {categories
                        .filter((c) => c.id !== currentCategory.id)
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            ย้ายไป: {c.titleEn}
                          </option>
                        ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleBulkMove}
                      disabled={!targetMoveCategoryId || isPending}
                      className="inline-flex items-center gap-1 rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800 transition disabled:opacity-40"
                    >
                      <MoveRight className="h-3.5 w-3.5" /> ย้าย
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteImages(selectedImageIds)}
                    disabled={isPending}
                    className="inline-flex items-center gap-1 rounded-xl bg-red-50 text-red-600 border border-red-200 px-3 py-1.5 text-xs font-bold hover:bg-red-100 transition"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> ลบ ({selectedImageIds.length})
                  </button>
                </div>
              )}
            </div>

            {/* Images Grid */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
              {currentCategory.images.length === 0 ? (
                <div className="py-16 text-center text-slate-400">
                  <ImageIcon className="h-10 w-10 mx-auto text-slate-300 mb-2 stroke-1" />
                  <p className="text-sm font-semibold text-slate-600">ยังไม่มีรูปภาพในหมวดนี้</p>
                  <button
                    type="button"
                    onClick={() => setIsAddImagesModalOpen(true)}
                    className="mt-3 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 transition"
                  >
                    <Plus className="h-4 w-4" /> เพิ่มรูปภาพตอนนี้
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {currentCategory.images.map((img, idx) => {
                    const isSelected = selectedImageIds.includes(img.id);
                    const isCover = img.sortOrder === 1;
                    const linkedCount = img.linkedProducts.length;

                    return (
                      <div
                        key={img.id}
                        className={`group relative flex flex-col rounded-2xl border bg-white overflow-hidden transition-all duration-200 ${
                          isSelected
                            ? "border-blue-600 ring-2 ring-blue-600/20 shadow-md"
                            : "border-slate-200 hover:border-slate-300 hover:shadow-md"
                        }`}
                      >
                        {/* Thumbnail Stage */}
                        <div className="relative aspect-square w-full bg-slate-100 overflow-hidden">
                          <img
                            src={img.imageUrl}
                            alt=""
                            loading="lazy"
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />

                          {/* Checkbox Top-Left */}
                          <button
                            type="button"
                            onClick={() => handleToggleSelectImage(img.id)}
                            className={`absolute top-2 left-2 z-10 flex h-6 w-6 items-center justify-center rounded-lg border shadow-xs transition-all ${
                              isSelected
                                ? "bg-blue-600 border-blue-600 text-white"
                                : "bg-white/90 border-slate-300 text-transparent hover:border-slate-500"
                            }`}
                          >
                            <Check className="h-3.5 w-3.5 stroke-[3]" />
                          </button>

                          {/* Cover / Order Badge Top-Right */}
                          <div className="absolute top-2 right-2 flex items-center gap-1">
                            {isCover ? (
                              <span className="rounded-md bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-xs">
                                #1 รูปปก
                              </span>
                            ) : (
                              <span className="rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-mono font-bold text-white backdrop-blur-xs">
                                #{img.sortOrder}
                              </span>
                            )}
                          </div>

                          {/* Linked Badge overlay bottom */}
                          <div className="absolute bottom-2 left-2 right-2">
                            {linkedCount > 0 ? (
                              <div className="flex items-center justify-between rounded-xl bg-slate-900/85 px-2.5 py-1 text-white backdrop-blur-xs shadow-xs">
                                <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                                  <CheckCircle2 className="h-3 w-3" /> ผูก {linkedCount} ชิ้น
                                </span>
                                <div className="flex -space-x-1 overflow-hidden">
                                  {img.linkedProducts.slice(0, 3).map((p) => (
                                    <div key={p.id} className="inline-block h-4 w-4 rounded-full ring-1 ring-white bg-slate-200 overflow-hidden">
                                      {p.imageUrl && <img src={p.imageUrl} alt="" className="h-full w-full object-cover" />}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div className="rounded-xl bg-amber-500/85 px-2 py-0.5 text-center text-[10px] font-bold text-white backdrop-blur-xs shadow-xs">
                                ยังไม่ผูกสินค้า
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Linked Products Details list */}
                        <div className="p-3 flex-1 flex flex-col justify-between space-y-2.5 bg-white">
                          {linkedCount > 0 ? (
                            <div className="space-y-1">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                สินค้าในรูป:
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
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400 italic py-0.5">
                              ยังไม่มีสินค้าที่ผูกไว้กับรูปนี้
                            </p>
                          )}

                          {/* Tag Product Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenPicker(img)}
                            className={`w-full inline-flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition-all shadow-xs active:scale-95 ${
                              linkedCount > 0
                                ? "bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
                                : "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-600/20"
                            }`}
                          >
                            <Link2 className="h-3.5 w-3.5" />
                            {linkedCount > 0 ? "แก้ไขสินค้าที่ผูก" : "🔗 ผูกสินค้าในรูปนี้"}
                          </button>

                          {/* Action Bar (Reorder, Set Cover, Delete) */}
                          <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-slate-500">
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleReorder(img.id, "up")}
                                disabled={idx === 0 || isPending}
                                className="rounded-lg p-1 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-25"
                                title="เลื่อนขึ้น"
                              >
                                <ArrowUp className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleReorder(img.id, "down")}
                                disabled={idx === currentCategory.images.length - 1 || isPending}
                                className="rounded-lg p-1 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-25"
                                title="เลื่อนลง"
                              >
                                <ArrowDown className="h-3.5 w-3.5" />
                              </button>
                            </div>

                            <div className="flex items-center gap-1">
                              {!isCover && (
                                <button
                                  type="button"
                                  onClick={() => handleSetCover(img.id)}
                                  disabled={isPending}
                                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold text-amber-600 hover:bg-amber-50"
                                  title="ตั้งเป็นรูปปก"
                                >
                                  <Star className="h-3 w-3" /> รูปปก
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleDeleteImages([img.id])}
                                disabled={isPending}
                                className="rounded-lg p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
                                title="ลบรูปนี้"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>

                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        )}

      </div>

      {/* --- 1. Product Picker Modal (ค้นหาสินค้า Prop ผูกกับรูป) --- */}
      <ProductPickerModal
        image={selectedImageForPicker}
        categoryTitle={currentCategory?.titleEn || ""}
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        onSuccess={handleSuccessProductTag}
      />

      {/* --- 2. Add Images Modal (วางหลาย URL) --- */}
      {isAddImagesModalOpen && currentCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                เพิ่มรูปภาพในหมวด {currentCategory.titleEn}
              </h3>
              <button
                onClick={() => setIsAddImagesModalOpen(false)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <p className="text-xs text-slate-500">
                วางลิงก์รูปภาพ (URL) บรรทัดละ 1 ลิงก์ (รองรับ Cloudflare R2, Storage):
              </p>
              <textarea
                value={newImageUrlsText}
                onChange={(e) => setNewImageUrlsText(e.target.value)}
                placeholder="https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/..."
                rows={6}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-800 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
              />
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddImagesModalOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleAddImages}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                บันทึกรูปภาพ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- 3. Category Create / Edit Modal --- */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {editingCategory ? `แก้ไขหมวดหมู่: ${editingCategory.titleEn}` : "เพิ่มหมวดหมู่ Collection ใหม่"}
              </h3>
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    ชื่อหมวดภาษาอังกฤษ (EN) *
                  </label>
                  <input
                    type="text"
                    value={catFormTitleEn}
                    onChange={(e) => setCatFormTitleEn(e.target.value)}
                    placeholder="เช่น VASE & VESSELS"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    ชื่อหมวดภาษาไทย (TH)
                  </label>
                  <input
                    type="text"
                    value={catFormTitleTh}
                    onChange={(e) => setCatFormTitleTh(e.target.value)}
                    placeholder="เช่น แจกันและภาชนะ"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Slug (URL) *
                  </label>
                  <input
                    type="text"
                    value={catFormSlug}
                    onChange={(e) => setCatFormSlug(e.target.value)}
                    placeholder="เช่น vase-and-vessels"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    ลิงก์หมวดสินค้า (category_query)
                  </label>
                  <input
                    type="text"
                    value={catFormQuery}
                    onChange={(e) => setCatFormQuery(e.target.value)}
                    placeholder="เช่น Vase หรือ SCULPTURE"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  คำบรรยายภาษาอังกฤษ (Description EN)
                </label>
                <textarea
                  value={catFormDescEn}
                  onChange={(e) => setCatFormDescEn(e.target.value)}
                  placeholder="English editorial description..."
                  rows={2}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  คำบรรยายภาษาไทย (Description TH)
                </label>
                <textarea
                  value={catFormDescTh}
                  onChange={(e) => setCatFormDescTh(e.target.value)}
                  placeholder="คำบรรยายภาษาไทย..."
                  rows={2}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  URL รูปภาพหน้าปก (Cover Image URL)
                </label>
                <input
                  type="text"
                  value={catFormCover}
                  onChange={(e) => setCatFormCover(e.target.value)}
                  placeholder="https://..."
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSaveCategory}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                บันทึกหมวดหมู่
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
