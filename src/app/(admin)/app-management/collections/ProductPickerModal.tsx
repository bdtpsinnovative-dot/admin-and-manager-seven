"use client";

import { useState, useEffect, useTransition } from "react";
import { 
  X, 
  Search, 
  Package, 
  Check, 
  Loader2, 
  AlertCircle, 
  Trash2,
  Crop,
  Sparkles,
  Plus
} from "lucide-react";
import { 
  JournalImageWithProducts, 
  LinkedProduct,
  searchPropsProducts, 
  syncJournalImageProducts 
} from "@/actions/journal-collections";
import { searchProductsByVisualCrop, VisualSearchResult, CropBoxNormalized } from "@/actions/visual-search";
import ImageCropperOverlay from "./ImageCropperOverlay";

interface ProductPickerModalProps {
  image: JournalImageWithProducts | null;
  categoryTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (imageId: number, selectedProducts: LinkedProduct[]) => void;
}

export default function ProductPickerModal({
  image,
  categoryTitle,
  isOpen,
  onClose,
  onSuccess,
}: ProductPickerModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [products, setProducts] = useState<LinkedProduct[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<LinkedProduct[]>([]);
  
  // Visual Search Mode
  const [showVisualModal, setShowVisualModal] = useState(false);
  const [isVisualSearching, setIsVisualSearching] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<VisualSearchResult[]>([]);

  // Pagination States
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // เมื่อเปิด Modal ให้เซ็ตค่าเริ่มต้น
  useEffect(() => {
    if (isOpen && image) {
      setSearchQuery("");
      setErrorMessage(null);
      setPage(0);
      setAiSuggestions([]);
      setShowVisualModal(false);
      
      const initialSelected: LinkedProduct[] = (image.linkedProducts || []).map((p, idx) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        price: p.price,
        imageUrl: p.imageUrl,
        status: p.status,
        collectionGroupId: p.collectionGroupId,
        category: p.category,
        sortOrder: p.sortOrder || idx + 1,
      }));
      setSelectedProducts(initialSelected);

      loadInitialProducts("");
    }
  }, [isOpen, image]);

  const loadInitialProducts = async (query: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    setPage(0);
    try {
      const res = await searchPropsProducts(query, 0, 60);
      setProducts(res.products as LinkedProduct[]);
      setTotalCount(res.totalCount);
      setHasMore(res.hasMore);
    } catch (err: any) {
      setErrorMessage(err.message || "ไม่สามารถค้นหาสินค้าได้");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadMore = async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    const nextPage = page + 1;
    try {
      const res = await searchPropsProducts(searchQuery, nextPage, 60);
      setProducts((prev) => [...prev, ...(res.products as LinkedProduct[])]);
      setPage(nextPage);
      setHasMore(res.hasMore);
      setTotalCount(res.totalCount);
    } catch (err: any) {
      setErrorMessage(err.message || "ไม่สามารถโหลดสินค้าเพิ่มเติมได้");
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Trigger Visual Search
  const handleVisualCropSearch = async (targetImageUrl: string, cropBox?: CropBoxNormalized) => {
    setIsVisualSearching(true);
    setErrorMessage(null);
    try {
      const result = await searchProductsByVisualCrop(targetImageUrl, cropBox);
      setAiSuggestions(result.results);
      setShowVisualModal(false);
    } catch (err: any) {
      setErrorMessage(err.message || "ไม่สามารถค้นหาด้วยภาพได้");
    } finally {
      setIsVisualSearching(false);
    }
  };

  // Live Search (Text)
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      loadInitialProducts(searchQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery, isOpen]);

  if (!isOpen || !image) return null;

  const isSelected = (id: number) => selectedProducts.some((p) => p.id === id);

  const toggleProduct = (product: LinkedProduct | VisualSearchResult) => {
    if (isSelected(product.id)) {
      setSelectedProducts((prev) => prev.filter((p) => p.id !== product.id));
    } else {
      const newLinked: LinkedProduct = {
        id: product.id,
        name: product.name,
        sku: product.sku,
        price: product.price,
        imageUrl: product.imageUrl,
        status: product.status,
        collectionGroupId: product.collectionGroupId,
        category: product.category,
        sortOrder: selectedProducts.length + 1,
      };
      setSelectedProducts((prev) => [...prev, newLinked]);
    }
  };

  const removeSelected = (id: number) => {
    setSelectedProducts((prev) => prev.filter((p) => p.id !== id));
  };

  const handleSave = () => {
    startTransition(async () => {
      try {
        const productIds = selectedProducts.map((p) => p.id);
        const res = await syncJournalImageProducts(image.id, productIds);
        if (!res.success) {
          throw new Error("เกิดข้อผิดพลาดในการบันทึก");
        }
        onSuccess(image.id, selectedProducts);
        onClose();
      } catch (err: any) {
        setErrorMessage(err.message || "ไม่สามารถบันทึกรายการสินค้าได้");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-5 md:p-6 animate-in fade-in duration-150 font-sans">
      <div className="flex h-full max-h-[94vh] w-full max-w-7xl flex-col rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-200">
        
        {/* --- Main 2-Column Split Studio Body --- */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-hidden">
          
          {/* ========================================================================= */}
          {/* LEFT SIDEBAR (4 Cols ~340px): รูปภาพ Collection + ถาดสินค้าที่เลือกไว้ */}
          {/* ========================================================================= */}
          <div className="lg:col-span-4 border-b lg:border-b-0 lg:border-r border-slate-200 bg-slate-50 flex flex-col min-h-0 overflow-hidden">
            
            {/* Left Header */}
            <div className="p-4 border-b border-slate-200 bg-white flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded-md">
                  {categoryTitle}
                </span>
                <h2 className="text-sm font-bold text-slate-900 mt-1">
                  รูปภาพ #{image.sortOrder}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setShowVisualModal(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-2xs hover:bg-slate-50 transition"
              >
                <Crop className="h-3.5 w-3.5 text-slate-700" />
                ลากกรอบค้นหา
              </button>
            </div>

            {/* Collection Image Preview */}
            <div className="p-4 pb-2">
              <div className="relative aspect-4/3 w-full rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
                <img 
                  src={image.imageUrl} 
                  alt="" 
                  className="h-full w-full object-cover" 
                />
                <div className="absolute top-2 left-2 rounded-md bg-slate-900/80 px-2 py-0.5 text-[10px] font-mono font-bold text-white backdrop-blur-xs">
                  ภาพต้นฉบับ
                </div>
              </div>
            </div>

            {/* Selected Products Shelf (Vertical Scrollable List) */}
            <div className="flex-1 flex flex-col min-h-0 p-4 pt-2">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Package className="h-3.5 w-3.5 text-slate-700" />
                  สินค้าที่เลือกไว้ (<span className="font-mono font-bold text-slate-900">{selectedProducts.length}</span>)
                </span>
                {selectedProducts.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedProducts([])}
                    className="text-[11px] font-medium text-red-500 hover:text-red-700"
                  >
                    ล้างทั้งหมด
                  </button>
                )}
              </div>

              {selectedProducts.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/60 p-4 text-center text-xs text-slate-400">
                  <Package className="h-8 w-8 text-slate-300 stroke-1 mb-1" />
                  <span>คลิกเลือกสินค้าจากตารางทางขวาเพื่อผูกกับรูปนี้</span>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {selectedProducts.map((p) => (
                    <div
                      key={p.id}
                      className="group relative flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-2.5 shadow-2xs hover:border-slate-300 transition"
                    >
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-50 border border-slate-200 p-0.5">
                        {p.imageUrl ? (
                          <img src={p.imageUrl} alt="" className="h-full w-full object-contain" />
                        ) : (
                          <Package className="h-full w-full text-slate-400 p-1" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0 pr-6">
                        <p className="font-mono text-xs font-bold text-slate-900 truncate">
                          {p.sku || `ID: #${p.id}`}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          {p.name}
                        </p>
                        <p className="font-mono text-[11px] font-semibold text-slate-900 mt-0.5">
                          {p.price !== null ? `${Number(p.price).toLocaleString()} ฿` : "—"}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeSelected(p.id)}
                        className="absolute top-2 right-2 h-6 w-6 rounded-full bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-600 flex items-center justify-center transition"
                        title="เอาออก"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* ========================================================================= */}
          {/* RIGHT MAIN CATALOG (8 Cols): แถบค้นหา + ตารางสินค้าเต็มความสูง */}
          {/* ========================================================================= */}
          <div className="lg:col-span-8 flex flex-col min-h-0 bg-white">
            
            {/* Top Toolbar on Right */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-3 bg-white">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="พิมพ์ค้นหารหัส SKU, ชื่อสินค้า, รหัสกลุ่ม..."
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 pl-10 pr-10 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <button
                onClick={onClose}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable Product Catalog Grid (Takes 100% of height) */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-slate-50/60 space-y-4">
              
              {errorMessage && (
                <div className="rounded-xl bg-red-50 p-3 text-xs text-red-600 flex items-center gap-2 border border-red-200">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {errorMessage}
                </div>
              )}

              {/* AI Visual Matches Section (if user ran visual crop search) */}
              {aiSuggestions.length > 0 && (
                <div className="rounded-2xl border border-slate-300 bg-white p-4 space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      ผลลัพธ์ที่ตรงกับรูปภาพ ({aiSuggestions.length} ชิ้น)
                    </h3>
                    <button
                      type="button"
                      onClick={() => setAiSuggestions([])}
                      className="text-xs text-slate-400 hover:text-slate-600"
                    >
                      ล้างผลลัพธ์
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {aiSuggestions.map((product) => {
                      const selected = isSelected(product.id);
                      return (
                        <div
                          key={`ai-${product.id}`}
                          onClick={() => toggleProduct(product)}
                          className={`group relative flex flex-col rounded-xl border p-2.5 bg-white cursor-pointer transition select-none ${
                            selected
                              ? "border-slate-900 ring-1 ring-slate-900 shadow-sm"
                              : "border-slate-200 hover:border-slate-400 hover:shadow-2xs"
                          }`}
                        >
                          <div className="relative aspect-square w-full rounded-lg bg-slate-50 overflow-hidden flex items-center justify-center mb-2">
                            {product.imageUrl ? (
                              <img
                                src={product.imageUrl}
                                alt={product.name}
                                className="h-full w-full object-contain p-1"
                              />
                            ) : (
                              <Package className="h-6 w-6 text-slate-300" />
                            )}
                            <div className="absolute top-1.5 left-1.5 rounded bg-slate-900/80 px-1.5 py-0.5 text-[9px] font-mono font-bold text-white">
                              {product.matchScore}%
                            </div>
                            <div
                              className={`absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full border transition ${
                                selected
                                  ? "bg-slate-900 border-slate-900 text-white"
                                  : "bg-white border-slate-300 text-transparent"
                              }`}
                            >
                              <Check className="h-3 w-3 stroke-[2.5]" />
                            </div>
                          </div>

                          <div className="flex-1 flex flex-col justify-between">
                            <div>
                              <p className="font-mono text-xs font-bold text-slate-900 truncate">
                                {product.sku || `ID: #${product.id}`}
                              </p>
                              <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                                {product.name}
                              </p>
                            </div>
                            <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between">
                              <span className="font-mono text-xs font-bold text-slate-900">
                                {product.price !== null ? `${Number(product.price).toLocaleString()} ฿` : "—"}
                              </span>
                              <span className={`text-[10px] font-medium ${selected ? "text-slate-900 font-semibold" : "text-slate-400"}`}>
                                {selected ? "เลือกแล้ว" : "+ เลือก"}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Main Products Grid */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {searchQuery ? `ผลการค้นหา "${searchQuery}"` : "รายการสินค้า Prop ทั้งหมด"} ({totalCount.toLocaleString()} รายการ)
                  </span>
                </div>

                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-24 text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin text-slate-700 mb-2" />
                    <p className="text-xs">กำลังโหลดรายการสินค้า...</p>
                  </div>
                ) : products.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-24 text-slate-400">
                    <Package className="h-10 w-10 text-slate-300 mb-2 stroke-1" />
                    <p className="text-sm font-semibold text-slate-600">ไม่พบสินค้าที่ตรงกับคำค้นหา</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Generous 4-Column Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {products.map((product) => {
                        const selected = isSelected(product.id);
                        return (
                          <div
                            key={product.id}
                            onClick={() => toggleProduct(product)}
                            className={`group relative flex flex-col rounded-xl border p-2.5 bg-white cursor-pointer transition select-none ${
                              selected
                                ? "border-slate-900 ring-2 ring-slate-900/10 shadow-sm"
                                : "border-slate-200 hover:border-slate-400 hover:shadow-2xs"
                            }`}
                          >
                            <div className="relative aspect-square w-full rounded-lg bg-slate-50 overflow-hidden flex items-center justify-center mb-2">
                              {product.imageUrl ? (
                                <img
                                  src={product.imageUrl}
                                  alt={product.name}
                                  className="h-full w-full object-contain p-1"
                                  loading="lazy"
                                />
                              ) : (
                                <Package className="h-6 w-6 text-slate-300" />
                              )}
                              <div
                                className={`absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full border transition ${
                                  selected
                                    ? "bg-slate-900 border-slate-900 text-white scale-110"
                                    : "bg-white border-slate-300 text-transparent"
                                }`}
                              >
                                <Check className="h-3 w-3 stroke-[2.5]" />
                              </div>
                            </div>

                            <div className="flex-1 flex flex-col justify-between">
                              <div>
                                <p className="font-mono text-xs font-bold text-slate-900 truncate">
                                  {product.sku || `ID: #${product.id}`}
                                </p>
                                <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                                  {product.name}
                                </p>
                              </div>
                              <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between">
                                <span className="font-mono text-xs font-bold text-slate-900">
                                  {product.price !== null ? `${Number(product.price).toLocaleString()} ฿` : "—"}
                                </span>
                                <span className={`text-[10px] font-bold ${selected ? "text-slate-900" : "text-slate-400"}`}>
                                  {selected ? "✓ เลือกแล้ว" : "+ เลือก"}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Load More Button */}
                    {hasMore && (
                      <div className="pt-2 text-center">
                        <button
                          type="button"
                          onClick={handleLoadMore}
                          disabled={isLoadingMore}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition shadow-2xs"
                        >
                          {isLoadingMore && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-700" />}
                          โหลดสินค้าเพิ่มเติม
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>

            {/* Bottom Footer Action Bar on Right */}
            <div className="flex items-center justify-between border-t border-slate-200 px-6 py-3.5 bg-white">
              <div className="text-xs text-slate-600">
                เลือกสินค้าผูกไว้ <strong className="font-mono font-bold text-slate-900">{selectedProducts.length}</strong> รายการ
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isPending}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 transition shadow-xs"
                >
                  {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  บันทึกสินค้า ({selectedProducts.length})
                </button>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* --- Visual Crop Modal Overlay (กางแยกเป็น Pop-up เมื่อกดปุ่ม) --- */}
      {showVisualModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Crop className="h-4 w-4 text-slate-800" />
                <h3 className="text-sm font-semibold text-slate-900">
                  ค้นหาด้วยภาพถ่าย
                </h3>
              </div>
              <button
                onClick={() => setShowVisualModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="rounded-xl overflow-hidden border border-slate-200 bg-white">
              <ImageCropperOverlay
                imageUrl={image.imageUrl}
                onCropAndSearch={handleVisualCropSearch}
                isSearching={isVisualSearching}
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
