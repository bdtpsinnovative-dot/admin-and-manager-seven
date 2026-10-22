"use client";
import React, { useEffect, useRef, useState, useTransition, useMemo, useCallback } from "react";
import Link from "next/link";
import JsBarcode from "jsbarcode";
import QRCode from "qrcode";
import { updatePropImageUrl, getPropsBatch, getPropsBySkus } from "@/actions/props";
import PropBoxCalculator from "./PropBoxCalculator";
import { 
  Search, X, Check, Edit, Printer, FileDown, FileUp, 
  Package, Image as ImageIcon, Loader2, Plus, Trash2, Save 
} from "lucide-react";

const BarcodeSvg = React.memo(function BarcodeSvg({ value }: { value: string }) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (ref.current && value) {
      try {
        JsBarcode(ref.current, value, {
          format: "CODE128",
          width: 1.4,
          height: 32,
          displayValue: true,
          fontSize: 9,
          margin: 2,
          textMargin: 1,
        });
      } catch {}
    }
  }, [value]);
  return <svg ref={ref} className="w-full" />;
});

export function getProductDisplaySize(item: any): string {
  if (!item) return "";
  const specs = item.specs || {};
  const cat = item.category_id;

  // 1. หมวด prop: แสดงเป็น cm
  if (cat === "prop") {
    const L = item.length_cm ?? specs.length_cm;
    const W = item.width_cm ?? specs.width_cm;
    const T = item.thickness_cm ?? specs.thickness_cm;
    const parts = [L, W, T].filter((v) => v != null && v !== "");
    if (parts.length > 0) {
      return `${parts.join("×")} cm`;
    }
    return specs.size || "";
  }

  // 2. หมวดแผ่นไม้ (SLABS), ไม้ดิบ (rough_wood), เฟอร์นิเจอร์ (furniture)
  if (specs.dimensions) {
    const clean = String(specs.dimensions).replace(/-/g, "×");
    return clean.toUpperCase().includes("MM") ? clean : `${clean} MM`;
  }

  if (specs.size && (specs.size.includes("-") || specs.size.includes("×") || specs.size.toUpperCase().includes("MM"))) {
    const clean = String(specs.size).replace(/-/g, "×");
    return clean.toUpperCase().includes("MM") ? clean : `${clean} MM`;
  }

  const L = specs.length_cm ?? item.length_cm;
  const W = specs.width_cm ?? item.width_cm;
  const T = specs.thickness_cm ?? item.thickness_cm;
  const parts = [L, W, T].filter((v) => v != null && v !== "");
  if (parts.length > 0) {
    return `${parts.join("×")} mm`;
  }

  if (specs.size) {
    return `Size ${specs.size}`;
  }

  return "";
}

export interface DiscountInfo {
  hasDiscount: boolean;
  originalPrice: number;
  finalPrice: number;
  discountType: "PERCENT" | "FIXED";
  discountValue: number;
  discountName: string;
  badgeText: string;
}

export function getProductDiscountInfo(
  product: any,
  activeDiscounts: any[]
): DiscountInfo | null {
  if (!product || !activeDiscounts || !Array.isArray(activeDiscounts) || activeDiscounts.length === 0) {
    return null;
  }

  const originalPrice = Number(product.price) || 0;
  if (originalPrice <= 0) return null;

  const prodId = String(product.id);
  const now = new Date();

  let bestDiscount: any = null;
  let maxDiscountAmount = 0;

  for (const disc of activeDiscounts) {
    if (!disc.active) continue;

    // Check date bounds if configured
    if (disc.start_date && new Date(disc.start_date) > now) continue;
    if (disc.end_date && new Date(disc.end_date) < now) continue;

    const rules = disc.discount_rules;
    if (!Array.isArray(rules)) continue;

    const isMatch = rules.some((r: any) => String(r.product_id) === prodId);
    if (!isMatch) continue;

    const val = Number(disc.value) || 0;
    if (val <= 0) continue;

    let discountAmount = 0;
    if (disc.discount_type === "PERCENT") {
      discountAmount = originalPrice * (val / 100);
      if (disc.max_discount && Number(disc.max_discount) > 0) {
        discountAmount = Math.min(discountAmount, Number(disc.max_discount));
      }
    } else {
      discountAmount = val;
    }

    if (discountAmount > maxDiscountAmount) {
      maxDiscountAmount = discountAmount;
      bestDiscount = disc;
    }
  }

  if (!bestDiscount || maxDiscountAmount <= 0) return null;

  const finalPrice = Math.max(0, originalPrice - maxDiscountAmount);
  const badgeText =
    bestDiscount.discount_type === "PERCENT"
      ? `-${bestDiscount.value}%`
      : `-฿${Number(bestDiscount.value).toLocaleString()}`;

  return {
    hasDiscount: true,
    originalPrice,
    finalPrice: Math.round(finalPrice),
    discountType: bestDiscount.discount_type,
    discountValue: bestDiscount.value,
    discountName: bestDiscount.name,
    badgeText,
  };
}

interface ProductCardProps {
  item: any;
  isSelected: boolean;
  displayImage?: string;
  discountInfo?: DiscountInfo | null;
  onToggle: (id: number) => void;
  onEditImage: (e: React.MouseEvent, item: any) => void;
}

const ProductCard = React.memo(function ProductCard({
  item,
  isSelected,
  displayImage,
  discountInfo,
  onToggle,
  onEditImage,
}: ProductCardProps) {
  const sizeStr = getProductDisplaySize(item);
  const materialStr = item.material || item.specs?.material || '';

  return (
    <div onClick={() => onToggle(item.id)}
      className={`bg-white rounded border hover:shadow transition overflow-hidden cursor-pointer relative
        ${isSelected ? 'border-blue-500 bg-blue-50/10' : 'border-slate-200 hover:border-slate-300'}`}>

      <div className="relative aspect-square bg-slate-50 m-1.5 rounded border border-slate-100 overflow-hidden">
        <div className={`absolute top-1.5 left-1.5 z-10 w-4 h-4 rounded border flex items-center justify-center
          ${isSelected ? 'bg-blue-500 border-blue-500' : 'bg-white border-slate-300'}`}>
          {isSelected && <Check className="text-white w-3 h-3" />}
        </div>
        <button onClick={(e) => onEditImage(e, item)}
          title="เปลี่ยนรูปภาพ"
          suppressHydrationWarning
          className="absolute top-1.5 right-1.5 z-10 w-6 h-6 rounded bg-white/90 hover:bg-white border border-slate-200 flex items-center justify-center shadow-sm transition active:scale-95">
          <Edit className="w-3.5 h-3.5 text-slate-500" />
        </button>
        <img src={displayImage || "/placeholder.png"} alt={item.name} loading="lazy"
          className="object-contain w-full h-full p-1.5" />
      </div>

      <div className="px-2.5 pb-3 pt-1">
        <div className="flex items-center gap-1 mb-1.5 flex-wrap">
          {item.category_id && (
            <span className="text-[9px] bg-slate-900 text-white px-1.5 py-0.5 rounded font-bold">
              {item.category_id === "prop"
                ? "พร็อพ"
                : item.category_id === "furniture"
                ? "เฟอร์ฯ"
                : item.category_id === "SLABS"
                ? "แผ่นไม้"
                : item.category_id === "rough_wood"
                ? "ไม้ดิบ"
                : item.category_id}
            </span>
          )}
          {discountInfo && (
            <span className="text-[9px] bg-rose-600 text-white px-1.5 py-0.5 rounded font-black shadow-2xs">
              ลด {discountInfo.badgeText}
            </span>
          )}
          {materialStr && (
            <span className="text-[9px] bg-amber-50 text-amber-700 border border-amber-200/60 px-1.5 py-0.5 rounded font-bold">{materialStr}</span>
          )}
          <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold uppercase">{item.color || '–'}</span>
          {sizeStr && (
            <span className="text-[9px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-bold">{sizeStr}</span>
          )}
        </div>
        <h3 className="text-xs font-bold text-slate-800 mb-1.5 line-clamp-1">{item.name}</h3>

        <div className="bg-slate-50 rounded p-1 border border-slate-100">
          {item.barcode
            ? <BarcodeSvg value={item.barcode} />
            : <p className="text-center text-[10px] text-slate-400 py-2">ไม่มีบาร์โค้ด</p>}
        </div>

        {/* Price Display */}
        <div className="mt-1.5 pt-1 border-t border-slate-100 flex items-baseline justify-between">
          {discountInfo ? (
            <>
              <span className="text-[10px] text-slate-400 line-through font-mono">
                ฿{Number(discountInfo.originalPrice).toLocaleString()}
              </span>
              <span className="text-xs font-black text-rose-600 font-mono">
                ฿{Number(discountInfo.finalPrice).toLocaleString()}
              </span>
            </>
          ) : item.price > 0 ? (
            <span className="text-xs font-bold text-slate-800 font-mono ml-auto">
              ฿{Number(item.price).toLocaleString()}
            </span>
          ) : (
            <span className="text-[10px] text-slate-400 ml-auto">ไม่ระบุราคา</span>
          )}
        </div>
      </div>
    </div>
  );
});

interface Props {
  initialProducts: any[];
  initialTotalCount: number;
  initialCategoryCounts: Record<string, number>;
  initialActiveDiscounts?: any[];
}

const CATEGORY_OPTIONS = [
  { key: "prop", label: "พร็อพ & ตกแต่ง", icon: "🏺" },
  { key: "furniture", label: "เฟอร์นิเจอร์", icon: "🛋️" },
  { key: "SLABS", label: "แผ่นไม้", icon: "🪵" },
  { key: "rough_wood", label: "ไม้ดิบ", icon: "🌲" },
  { key: "ALL", label: "ทั้งหมด", icon: "🌟" },
];

export default function PropsClient({ initialProducts, initialTotalCount, initialCategoryCounts, initialActiveDiscounts = [] }: Props) {
  const [products, setProducts] = useState<any[]>(initialProducts);
  const [totalCount, setTotalCount] = useState<number>(initialTotalCount);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>(initialCategoryCounts);
  const [activeDiscounts] = useState<any[]>(initialActiveDiscounts);
  const [selectedCategory, setSelectedCategory] = useState<string>("prop");
  const [batchSize, setBatchSize] = useState<number>(100);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [isChangingCategory, setIsChangingCategory] = useState<boolean>(false);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [showCalculator, setShowCalculator] = useState<boolean>(true);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [printLogoMode, setPrintLogoMode] = useState<"auto" | "zenslab" | "terra" | "woodslabs">("auto");
  const [printOrientation, setPrintOrientation] = useState<"portrait" | "landscape">("landscape");
  const [printTargets, setPrintTargets] = useState<any[]>([]);
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState("");
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");

  // Category Switch Handler
  const handleCategoryChange = async (catKey: string) => {
    if (catKey === selectedCategory && !isChangingCategory) return;
    setSelectedCategory(catKey);
    setIsChangingCategory(true);
    try {
      const res = await getPropsBatch({
        category: catKey,
        offset: 0,
        limit: batchSize,
        search: searchQuery,
      });
      setProducts(res.products);
      setTotalCount(res.totalCount);
    } catch (err) {
      console.error("Error switching category:", err);
    } finally {
      setIsChangingCategory(false);
    }
  };

  // Debounced search on server
  useEffect(() => {
    let isCancelled = false;
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await getPropsBatch({
          category: selectedCategory,
          offset: 0,
          limit: batchSize,
          search: searchQuery,
        });
        if (!isCancelled) {
          setProducts(res.products);
          setTotalCount(res.totalCount);
        }
      } catch (err) {
        console.error("Error searching props:", err);
      } finally {
        if (!isCancelled) setIsSearching(false);
      }
    }, 300);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery, selectedCategory, batchSize]);

  // Infinite Scroll / Load Next Batch
  const loadNextBatch = useCallback(async () => {
    if (isLoadingMore || products.length >= totalCount) return;
    setIsLoadingMore(true);
    try {
      const res = await getPropsBatch({
        category: selectedCategory,
        offset: products.length,
        limit: batchSize,
        search: searchQuery,
      });
      setProducts((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        const newItems = res.products.filter((p: any) => !existingIds.has(p.id));
        return [...prev, ...newItems];
      });
      setTotalCount(res.totalCount);
    } catch (err) {
      console.error("Failed to load more products:", err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, products.length, totalCount, selectedCategory, batchSize, searchQuery]);

  // Image edit
  const [editImageItem, setEditImageItem] = useState<any | null>(null);
  const [editImageUrl, setEditImageUrl] = useState("");
  const [localImages, setLocalImages] = useState<Record<number, string>>({});
  const [isPending, startTransition] = useTransition();
  const [imageError, setImageError] = useState("");

  const toggleSelect = useCallback((id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const toggleAll = () =>
    setSelected(selected.size === products.length ? new Set() : new Set(products.map((p) => p.id)));

  const openEditImage = useCallback(
    (e: React.MouseEvent, item: any) => {
      e.stopPropagation();
      setEditImageItem(item);
      setEditImageUrl(localImages[item.id] ?? item.image_url ?? "");
      setImageError("");
    },
    [localImages]
  );

  const saveImage = () => {
    if (!editImageItem) return;
    const url = editImageUrl.trim();
    startTransition(async () => {
      try {
        await updatePropImageUrl(editImageItem.id, url);
        setLocalImages((prev) => ({ ...prev, [editImageItem.id]: url }));
        setEditImageItem(null);
      } catch {
        setImageError("บันทึกไม่สำเร็จ กรุณาลองใหม่");
      }
    });
  };

  const openModal = (targets: any[]) => {
    const q: Record<number, number> = {};
    targets.forEach((p) => {
      q[p.id] = 1;
    });
    setQuantities(q);
    setPrintTargets(targets);
    setShowModal(true);
  };

  const totalSets = printTargets.reduce((s, p) => s + (quantities[p.id] || 1), 0);

  // ฟังก์ชันจัดการข้อมูลที่ Paste มาจาก Google Sheets (ค้นหาข้ามฐานข้อมูล 9,095 รายการโดยตรง)
  const handleImport = async () => {
    const lines = importText.split("\n");
    const skuQtyMap: Record<string, number> = {};
    const skusToLookup: string[] = [];

    lines.forEach((line) => {
      if (!line.trim()) return;
      const parts = line.split("\t");
      if (parts.length >= 2) {
        const qty = parseInt(parts[0].trim());
        const skuOrCode = parts[1].trim();

        if (!isNaN(qty) && qty > 0 && skuOrCode) {
          skuQtyMap[skuOrCode.toLowerCase()] = qty;
          skusToLookup.push(skuOrCode);
        }
      }
    });

    if (skusToLookup.length === 0) {
      alert("ไม่พบข้อมูล กรุณาตรวจสอบว่า Copy มาถูกคอลัมน์ไหม (จำนวน [Tab] รหัสสินค้า)");
      return;
    }

    setIsImporting(true);
    try {
      const serverMatched = await getPropsBySkus(skusToLookup);
      const newQuantities: Record<number, number> = {};
      const targets: any[] = [];
      const matchedSkuSet = new Set<string>();

      serverMatched.forEach((p) => {
        const q =
          skuQtyMap[(p.sku || "").toLowerCase()] ||
          skuQtyMap[(p.barcode || "").toLowerCase()] ||
          skuQtyMap[(p.name || "").toLowerCase()] ||
          1;
        newQuantities[p.id] = q;
        targets.push(p);
        if (p.sku) matchedSkuSet.add(p.sku.toLowerCase());
        if (p.barcode) matchedSkuSet.add(p.barcode.toLowerCase());
      });

      const notFound = skusToLookup.filter((s) => !matchedSkuSet.has(s.toLowerCase()));

      if (targets.length > 0) {
        setQuantities(newQuantities);
        setPrintTargets(targets);
        setSelected(new Set(targets.map((p) => p.id)));
        setShowImportModal(false);
        setImportText("");
        setShowModal(true);

        if (notFound.length > 0) {
          alert(`ดึงข้อมูลสำเร็จ ${targets.length} รายการ\nแต่ไม่พบรหัสเหล่านี้ในระบบ:\n${notFound.join(", ")}`);
        }
      } else {
        alert("ไม่พบข้อมูลรหัสสินค้าที่ตรงกับในระบบเลยครับนาย");
      }
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการค้นหารหัสสินค้าจากฐานข้อมูล");
    } finally {
      setIsImporting(false);
    }
  };


  const printQrPhoto = async () => {
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) return;
    const isLandscape = printOrientation === "landscape";
    const groups: string[] = [];

    for (const p of printTargets) {
      const sets = quantities[p.id] || 1;
      const val = p.barcode || p.sku || '';
      
      let qrImg = '';
      try { 
        qrImg = await QRCode.toDataURL(val, { width: 200, margin: 1, errorCorrectionLevel: 'M' }); 
      } catch {}

      const specs = p.specs || {};
      const L = p.length_cm ?? specs.length_cm ?? '';
      const W = p.width_cm ?? specs.width_cm ?? '';
      const T = p.thickness_cm ?? specs.thickness_cm ?? '';
      
      const sizeStr = getProductDisplaySize(p) || ((L || W || T) ? `${L}×${W}×${T} CM` : (specs.size || ''));
      const colorStr = p.color || '';
      const materialStr = p.material || specs.material || '';
      const detailStr = [colorStr, materialStr].filter(Boolean).join(' · ');

      // Check discount
      const discInfo = getProductDiscountInfo(p, activeDiscounts);
      const originalPriceVal = Number(p.price);
      const originalPriceStr = originalPriceVal > 0 
        ? new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 0 }).format(originalPriceVal) 
        : '';

      let priceHtml = '';
      if (discInfo && discInfo.finalPrice > 0) {
        const finalPriceStr = new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 0 }).format(discInfo.finalPrice);
        priceHtml = `
          <div class="price-discount-wrap">
            <div class="price-strike-line">
              <span class="price-old">${originalPriceStr}</span>
              <span class="price-disc-badge">${discInfo.badgeText}</span>
            </div>
            <div class="price-val price-val-discounted">${finalPriceStr}</div>
          </div>
        `;
      } else if (originalPriceStr) {
        priceHtml = `<div class="price-val">${originalPriceStr}</div>`;
      }

      for (let i = 0; i < sets; i++) {
        let logoSrc = "/logo.terra.home.png";
        let logoClass = "logo-img logo-terra";

        const isSlabItem = p.category_id === "SLABS" || selectedCategory === "SLABS";

        if (printLogoMode === "zenslab" || printLogoMode === "woodslabs" || (printLogoMode === "auto" && isSlabItem)) {
          logoSrc = "/logo.zenslab.png";
          logoClass = "logo-img logo-zenslab";
        }

        groups.push(`
          <div class="tag-card">
            <div class="tag-photo">
              <img src="${p.image_url || ''}" onerror="this.style.display='none'" />
            </div>
            <div class="tag-info">
              <div class="pname" title="${p.name || ''}">${p.name || ''}</div>
              <div class="sku-line"><span class="label">SKU:</span>${p.sku || '—'}</div>
              ${sizeStr ? `<div class="spec-size">${sizeStr}</div>` : ''}
              ${detailStr ? `<div class="spec-detail">${detailStr}</div>` : ''}
            </div>
            <div class="tag-right">
              <div class="right-logo">
                <img src="${logoSrc}" alt="Logo" class="${logoClass}" onerror="this.style.display='none'" />
              </div>
              <div class="qr-box">
                <img src="${qrImg}" class="qr-img" />
              </div>
              ${priceHtml}
            </div>
          </div>`);
      }
    }
    const pageSize = isLandscape ? 40 : 42;
    const pages: string[] = [];
    for (let i = 0; i < groups.length; i += pageSize) {
      const chunk = groups.slice(i, i + pageSize);
      pages.push(`<div class="page"><div class="grid">${chunk.join("")}</div></div>`);
    }

    const cssStyles = isLandscape
      ? `
      @page{size:A4 landscape;margin:5mm 28.5mm}
      *{margin:0;padding:0;box-sizing:border-box}
      body{margin:0;padding:0;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;}
      .page{width:calc(297mm - 57mm);height:calc(210mm - 10mm);overflow:hidden;page-break-after:always}
      .page:last-child{page-break-after:auto}
      .grid{display:grid;grid-template-columns:repeat(4,60mm);grid-template-rows:repeat(10,20mm);width:240mm;height:200mm;border-top:1px solid #bbb;border-left:1px solid #bbb;gap:0;}
      
      .tag-card { 
        width: 60mm;
        height: 20mm;
        display: flex;
        flex-direction: row;
        align-items: center;
        border-right: 1px solid #bbb; 
        border-bottom: 1px solid #bbb; 
        background: #fff; 
        padding: 1.0mm 1.2mm;
        overflow: hidden;
        position: relative;
        gap: 1.2mm;
        box-sizing: border-box;
      }
      
      .tag-photo {
        width: 16mm;
        height: 18mm;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        flex-shrink: 0;
        border: 1px solid #e2e8f0;
        border-radius: 2px;
        background: #f8fafc;
        padding: 0.5mm;
        box-sizing: border-box;
      }
      
      .tag-photo img {
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
        display: block;
      }
      
      .tag-info {
        flex: 1;
        min-width: 0;
        height: 18mm;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        overflow: hidden;
      }

      .pname {
        font-size: 5.2pt;
        font-weight: 800;
        color: #0f172a;
        line-height: 1.15;
        max-height: 2.3em;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        word-break: break-word;
        letter-spacing: -0.15px;
      }
      
      .sku-line {
        font-size: 4.8pt;
        font-weight: 800;
        color: #000;
        line-height: 1.1;
        word-break: break-all;
        letter-spacing: -0.15px;
      }
      
      .sku-line .label {
        color: #475569;
        font-weight: 700;
        margin-right: 0.3mm;
      }
      
      .spec-size {
        font-size: 4.3pt;
        font-weight: 600;
        color: #334155;
        line-height: 1;
        word-break: break-word;
      }

      .spec-detail {
        font-size: 4.2pt;
        font-weight: 500;
        color: #64748b;
        line-height: 1;
        word-break: break-word;
      }
      
      .tag-right {
        width: 11.5mm;
        height: 18mm;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: space-between;
        flex-shrink: 0;
      }

      .right-logo {
        height: 2.6mm;
        max-width: 11.5mm;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .right-logo .logo-img {
        height: 2.6mm;
        max-width: 11.5mm;
        object-fit: contain;
        display: block;
        opacity: 0.85;
      }
      
      .qr-box {
        width: 9.5mm;
        height: 9.5mm;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #fff;
      }
      
      .qr-img {
        width: 100%;
        height: 100%;
        object-fit: contain;
        display: block;
      }
      
      .price-val {
        font-size: 8.5pt;
        font-weight: 900;
        color: #000;
        line-height: 1;
        letter-spacing: -0.3px;
        white-space: nowrap;
        text-align: center;
      }

      .price-discount-wrap {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        line-height: 1;
        width: 100%;
        overflow: hidden;
      }

      .price-strike-line {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.3mm;
        margin-bottom: 0.2mm;
      }

      .price-old {
        font-size: 4.2pt;
        font-weight: 600;
        color: #64748b;
        text-decoration: line-through;
        white-space: nowrap;
        line-height: 1;
      }

      .price-disc-badge {
        font-size: 3.8pt;
        font-weight: 800;
        color: #fff;
        background: #dc2626;
        padding: 0.1mm 0.6mm;
        border-radius: 1px;
        line-height: 1;
        white-space: nowrap;
      }

      .price-val-discounted {
        font-size: 8pt;
        font-weight: 900;
        color: #dc2626;
        line-height: 1;
        letter-spacing: -0.3px;
        white-space: nowrap;
        text-align: center;
      }
    `
      : `
      @page{size:A4 portrait;margin:8.5mm 15mm}
      *{margin:0;padding:0;box-sizing:border-box}
      body{margin:0;padding:0;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;}
      .page{width:calc(210mm - 30mm);height:calc(297mm - 17mm);overflow:hidden;page-break-after:always}
      .page:last-child{page-break-after:auto}
      .grid{display:grid;grid-template-columns:repeat(3,60mm);grid-template-rows:repeat(14,20mm);width:180mm;height:280mm;border-top:1px solid #bbb;border-left:1px solid #bbb;gap:0;}
      
      .tag-card { 
        width: 60mm;
        height: 20mm;
        display: flex;
        flex-direction: row;
        align-items: center;
        border-right: 1px solid #bbb; 
        border-bottom: 1px solid #bbb; 
        background: #fff; 
        padding: 1.0mm 1.2mm;
        overflow: hidden;
        position: relative;
        gap: 1.2mm;
        box-sizing: border-box;
      }
      
      .tag-photo {
        width: 16mm;
        height: 18mm;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        flex-shrink: 0;
        border: 1px solid #e2e8f0;
        border-radius: 2px;
        background: #f8fafc;
        padding: 0.5mm;
        box-sizing: border-box;
      }
      
      .tag-photo img {
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
        display: block;
      }
      
      .tag-info {
        flex: 1;
        min-width: 0;
        height: 18mm;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        overflow: hidden;
      }

      .pname {
        font-size: 5.2pt;
        font-weight: 800;
        color: #0f172a;
        line-height: 1.15;
        max-height: 2.3em;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        word-break: break-word;
        letter-spacing: -0.15px;
      }
      
      .sku-line {
        font-size: 4.8pt;
        font-weight: 800;
        color: #000;
        line-height: 1.1;
        word-break: break-all;
        letter-spacing: -0.15px;
      }
      
      .sku-line .label {
        color: #475569;
        font-weight: 700;
        margin-right: 0.3mm;
      }
      
      .spec-size {
        font-size: 4.3pt;
        font-weight: 600;
        color: #334155;
        line-height: 1;
        word-break: break-word;
      }

      .spec-detail {
        font-size: 4.2pt;
        font-weight: 500;
        color: #64748b;
        line-height: 1;
        word-break: break-word;
      }
      
      .tag-right {
        width: 11.5mm;
        height: 18mm;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: space-between;
        flex-shrink: 0;
      }

      .right-logo {
        height: 2.6mm;
        max-width: 11.5mm;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .right-logo .logo-img {
        height: 2.6mm;
        max-width: 11.5mm;
        object-fit: contain;
        display: block;
        opacity: 0.85;
      }
      
      .qr-box {
        width: 9.5mm;
        height: 9.5mm;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #fff;
      }
      
      .qr-img {
        width: 100%;
        height: 100%;
        object-fit: contain;
        display: block;
      }
      
      .price-val {
        font-size: 8.5pt;
        font-weight: 900;
        color: #000;
        line-height: 1;
        letter-spacing: -0.3px;
        white-space: nowrap;
        text-align: center;
      }

      .price-discount-wrap {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        line-height: 1;
        width: 100%;
        overflow: hidden;
      }

      .price-strike-line {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.3mm;
        margin-bottom: 0.2mm;
      }

      .price-old {
        font-size: 4.2pt;
        font-weight: 600;
        color: #64748b;
        text-decoration: line-through;
        white-space: nowrap;
        line-height: 1;
      }

      .price-disc-badge {
        font-size: 3.8pt;
        font-weight: 800;
        color: #fff;
        background: #dc2626;
        padding: 0.1mm 0.6mm;
        border-radius: 1px;
        line-height: 1;
        white-space: nowrap;
      }

      .price-val-discounted {
        font-size: 8pt;
        font-weight: 900;
        color: #dc2626;
        line-height: 1;
        letter-spacing: -0.3px;
        white-space: nowrap;
        text-align: center;
      }
    `;

    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title></title>
    <style>
      ${cssStyles}
    </style></head><body>
    ${pages.join("")}
    <script>window.onload=()=>{const imgs=Array.from(document.images);const d=()=>{window.print();window.onafterprint=()=>window.close();};const t=setTimeout(d,2500);Promise.all(imgs.map(img=>img.complete?Promise.resolve():new Promise(r=>{img.onload=r;img.onerror=r;}))).then(()=>{clearTimeout(t);setTimeout(d,100);});};<\/script>
    </body></html>`);
    win.document.close();
  };

  const printLegacyHanging = async () => {
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) return;
    const groups: string[] = [];

    for (const p of printTargets) {
      const sets = quantities[p.id] || 1;
      const val = p.barcode || p.sku || '';
      
      let qrImg = '';
      try { 
        qrImg = await QRCode.toDataURL(val, { width: 200, margin: 1, errorCorrectionLevel: 'M' }); 
      } catch {}

      const specs = p.specs || {};
      const L = p.length_cm ?? specs.length_cm ?? '';
      const W = p.width_cm ?? specs.width_cm ?? '';
      const T = p.thickness_cm ?? specs.thickness_cm ?? '';
      
      const sizeStr = getProductDisplaySize(p);
      const colorStr = p.color || '';
      const materialStr = p.material || specs.material || '';

      // Check discount
      const discInfo = getProductDiscountInfo(p, activeDiscounts);
      const originalPriceVal = Number(p.price);
      const originalPriceStr = originalPriceVal > 0 
        ? new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 0 }).format(originalPriceVal) 
        : '';

      let priceHtml = '';
      if (discInfo && discInfo.finalPrice > 0) {
        const finalPriceStr = new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 0 }).format(discInfo.finalPrice);
        priceHtml = `
          <div class="price-discount-wrap">
            <div class="price-strike-line">
              <span class="price-old">${originalPriceStr}</span>
              <span class="price-disc-badge">${discInfo.badgeText}</span>
            </div>
            <div class="price-val price-val-discounted">${finalPriceStr}</div>
          </div>
        `;
      } else if (originalPriceStr) {
        priceHtml = `<div class="price-val">${originalPriceStr}</div>`;
      }

      for (let i = 0; i < sets; i++) {
        let logoSrc = "/logo.terra.home.png";
        let logoClass = "logo-img logo-terra";

        const isSlabItem = p.category_id === "SLABS" || selectedCategory === "SLABS";

        if (printLogoMode === "zenslab" || printLogoMode === "woodslabs" || (printLogoMode === "auto" && isSlabItem)) {
          logoSrc = "/logo.zenslab.png";
          logoClass = "logo-img logo-zenslab";
        }

        groups.push(`
          <div class="group">
            <div class="hole"></div>
            
            <div class="photo-sec">
              <img src="${p.image_url || ''}" onerror="this.style.display='none'" />
            </div>
            
            <div class="bottom-sec">
              <div class="price-section-wrap">
                <div class="qr-box">
                  <img src="${qrImg}" class="qr-img" />
                </div>
                <div class="price-box">
                  <div class="price-top">
                    <div class="price-logo">
                      <img src="${logoSrc}" alt="Logo" class="${logoClass}" />
                    </div>
                    <div class="sku-val">${p.sku || '—'}</div>
                    ${materialStr ? `<div class="mat-val">${materialStr}</div>` : ''}
                    ${sizeStr ? `<div class="size-val">${sizeStr}</div>` : ''}
                  </div>
                  <div class="price-bottom">
                    ${priceHtml}
                  </div>
                </div>
              </div>
            </div>
          </div>`);
      }
    }
    const pages: string[] = [];
    for (let i = 0; i < groups.length; i += 25) {
      const chunk = groups.slice(i, i + 25);
      pages.push(`<div class="page"><div class="grid">${chunk.join("")}</div></div>`);
    }
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title></title>
    <style>
      @page{size:A4;margin:8mm}
      *{margin:0;padding:0;box-sizing:border-box;-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important}
      body{margin:0;padding:0;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important}
      .page{width:calc(210mm - 16mm);height:calc(297mm - 16mm);overflow:hidden;page-break-after:always}
      .page:last-child{page-break-after:auto}
      
      .grid{display:grid;grid-template-columns:repeat(5,1fr);grid-template-rows:repeat(5,56mm);gap:0; border-top:1px solid #bbb; border-left:1px solid #bbb;}
      
      .group { 
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
        border-right: 1px solid #bbb; 
        border-bottom: 1px solid #bbb; 
        background: #fff; 
        padding: 0.6mm 1.2mm 0.6mm 1.2mm;
        height: 56mm;
        box-sizing: border-box;
        overflow: hidden;
        position: relative;
      }
      
      .hole {
        width: 1.6mm;
        height: 1.6mm;
        border: none;
        background: transparent;
        margin: 0.2mm auto 0.2mm auto;
        flex-shrink: 0;
      }
      
      .photo-sec {
        height: 26.5mm;
        min-height: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        margin-bottom: 0.3mm;
      }
      
      .photo-sec img {
        max-width: 37mm;
        max-height: 26.5mm;
        width: 100%;
        height: 100%;
        object-fit: contain;
        display: block;
      }
      
      .bottom-sec {
        display: flex;
        align-items: stretch;
        justify-content: space-between;
        border-top: 1px dashed #bbb;
        height: 26mm;
        box-sizing: border-box;
        padding: 0.5mm 0 0.5mm 0;
        margin-top: auto;
        width: 100%;
      }
      
      .price-section-wrap {
        display: flex;
        align-items: stretch;
        justify-content: space-between;
        width: 100%;
        gap: 1.2mm;
        height: 100%;
      }
      
      .qr-box {
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        width: 15.5mm;
      }
      
      .qr-img {
        width: 15.5mm;
        height: 15.5mm;
        object-fit: contain;
        display: block;
      }
      
      .price-box {
        text-align: right;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        justify-content: space-between;
        height: 100%;
        flex-grow: 1;
        min-width: 0;
      }

      .price-top {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        text-align: right;
        width: 100%;
      }

      .price-bottom {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        justify-content: flex-end;
        width: 100%;
        margin-top: auto;
      }
      
      .price-logo {
        display: flex;
        justify-content: flex-end;
        align-items: flex-start;
        line-height: 1;
        margin-bottom: 0.15mm;
      }
      
      .price-logo .logo-img {
        height: 3.2mm;
        max-width: 16mm;
        object-fit: contain;
        display: block;
      }
      
      .price-logo .logo-img.logo-woodslabs,
      .price-logo .logo-img.logo-zenslab {
        height: 3.2mm;
      }
      
      .sku-val {
        font-size: 4.2pt;
        line-height: 1.1;
        color: #000000;
        text-align: right;
        word-break: break-all;
        font-weight: 800;
        margin: 0.1mm 0;
      }

      .mat-val {
        font-size: 4.8pt;
        line-height: 1.1;
        color: #000000;
        text-align: right;
        word-break: break-all;
        font-weight: 800;
        margin: 0.1mm 0;
      }

      .size-val {
        font-size: 4.8pt;
        line-height: 1.1;
        color: #000000;
        text-align: right;
        word-break: break-all;
        font-weight: 800;
        margin: 0.1mm 0;
      }
      
      .price-discount-wrap {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        justify-content: flex-end;
        line-height: 1;
      }

      .price-strike-line {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 0.6mm;
        line-height: 1;
        margin-bottom: 0.2mm;
      }

      .price-old {
        font-size: 5pt;
        line-height: 1;
        color: #64748b;
        text-decoration: line-through;
        font-weight: 700;
      }

      .price-disc-badge {
        font-size: 4.5pt;
        line-height: 1;
        background: #dc2626;
        color: #ffffff;
        font-weight: 900;
        padding: 0.1mm 0.5mm;
        border-radius: 0.3mm;
        letter-spacing: -0.2px;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      .price-val {
        font-size: 11pt;
        font-weight: 900;
        color: #000000;
        line-height: 1;
        white-space: nowrap;
      }

      .price-val-discounted {
        font-size: 11pt;
        font-weight: 900;
        color: #dc2626 !important;
        line-height: 1;
        white-space: nowrap;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    </style></head><body>
    ${pages.join("")}
    <script>window.onload=()=>{window.print();window.onafterprint=()=>window.close()}<\/script>
    </body></html>`);
    win.document.close();
  };

  const allSelected = useMemo(() => {
    if (products.length === 0) return false;
    if (selected.size < products.length) return false;
    return products.every((p) => selected.has(p.id));
  }, [products, selected]);

  const selectedProducts = useMemo(() => {
    if (selected.size === 0) return [];
    return products.filter((p) => selected.has(p.id));
  }, [products, selected]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoadingMore && products.length < totalCount) {
          loadNextBatch();
        }
      },
      { rootMargin: "600px" }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }
    return () => observer.disconnect();
  }, [products.length, totalCount, isLoadingMore, loadNextBatch]);

  return (
    <>
      <div className="p-4 md:p-6 bg-slate-50 min-h-screen font-sans text-slate-800">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Package className="w-6 h-6 text-indigo-600" />
              <span>Inventory & Tag Printing <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold">หน้าที่ 2 (เวอร์ชันทดลอง)</span></span>
            </h1>
            <p className="text-slate-500 text-xs mt-0.5">
              พิมพ์ป้ายราคา QR Barcode ข้ามทุกหมวดหมู่ (โหลดแล้ว {products.length.toLocaleString()} จากทั้งหมด {totalCount.toLocaleString()} รายการ)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/propsfina"
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
            >
              ⬅️ กลับหน้าหลัก propsfina
            </Link>
            <button
              type="button"
              onClick={() => setShowCalculator(!showCalculator)}
              className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition"
            >
              {showCalculator ? "ซ่อนเครื่องคำนวณกล่อง" : "เปิดเครื่องคำนวณกล่อง"}
            </button>
            <Link href="/props/upload" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-xs transition">
              + Add New Prop
            </Link>
          </div>
        </div>

        {/* Category Tabs Bar */}
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
          {CATEGORY_OPTIONS.map((cat) => {
            const count = categoryCounts[cat.key] || 0;
            const isActive = selectedCategory === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                disabled={isChangingCategory}
                onClick={() => handleCategoryChange(cat.key)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition shrink-0 ${
                  isActive
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200"
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                    isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {count.toLocaleString()}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & Batch Size Controls Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อ, SKU, บาร์โค้ด, สี..."
              className="w-full pl-9 pr-8 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-indigo-500 bg-white"
            />
            {isSearching && (
              <Loader2 className="w-4 h-4 animate-spin text-indigo-500 absolute right-3 top-1/2 -translate-y-1/2" />
            )}
            {!isSearching && searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Batch Size Selector (โหลดทีละเท่าไหร่) */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-lg flex-shrink-0">
            <span className="text-xs text-slate-500 font-medium">โหลดทีละ:</span>
            {[50, 100, 200].map((sz) => (
              <button
                key={sz}
                type="button"
                onClick={() => setBatchSize(sz)}
                className={`px-2 py-0.5 rounded-md text-xs font-bold transition ${
                  batchSize === sz
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {sz}
              </button>
            ))}
            <span className="text-[11px] text-slate-400">รายการ</span>
          </div>
        </div>

        {showCalculator && (
          <PropBoxCalculator
            products={products}
            filteredProducts={products}
            selectedProducts={selectedProducts}
          />
        )}

        {/* Action Bar */}
        <div className="flex items-center gap-2 mb-6 bg-white p-3 rounded border border-slate-200 flex-wrap">
          <button
            onClick={toggleAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
          >
            <span
              className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${
                allSelected ? "bg-slate-800 border-slate-800" : "border-slate-300 bg-white"
              }`}
            >
              {allSelected && <Check className="text-white w-2.5 h-2.5" />}
            </span>
            <span>{allSelected ? "ยกเลิกที่แสดงทั้งหมด" : "เลือกที่แสดงทั้งหมด"}</span>
          </button>

          <button
            onClick={() => setShowImportModal(true)}
            disabled={isImporting}
            className="flex items-center gap-1 px-3 py-1.5 rounded border border-green-200 bg-green-50/50 text-green-600 text-xs font-semibold hover:bg-green-50 transition disabled:opacity-50"
          >
            {isImporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileUp className="w-3.5 h-3.5" />}
            <span>{isImporting ? "กำลังค้นหา..." : "นำเข้าจาก Sheets"}</span>
          </button>

          {selected.size > 0 && (
            <button
              onClick={() => openModal(selectedProducts)}
              className="flex items-center gap-1 px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>พิมพ์ที่เลือก ({selected.size})</span>
            </button>
          )}

          {selected.size > 0 && (
            <span className="ml-auto text-xs text-slate-500 font-medium">
              เลือก {selected.size} รายการ (จากที่โหลดอยู่ {products.length})
            </span>
          )}
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {products.length === 0 && !isChangingCategory && !isSearching && (
            <div className="col-span-full text-center py-16 border border-slate-200 border-dashed rounded bg-white text-slate-400">
              <p className="font-semibold">ไม่พบสินค้าในหมวดหมู่นี้ {searchQuery ? `ที่ตรงกับ "${searchQuery}"` : ""}</p>
            </div>
          )}

          {(isChangingCategory || isSearching) && products.length === 0 ? (
            <div className="col-span-full text-center py-16 bg-white rounded border border-slate-200 flex flex-col items-center justify-center gap-2 text-slate-500">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              <span className="text-xs font-medium">กำลังโหลดรายการสินค้า...</span>
            </div>
          ) : (
            products.map((item) => (
              <ProductCard
                key={item.id}
                item={item}
                isSelected={selected.has(item.id)}
                displayImage={localImages[item.id] ?? item.image_url}
                discountInfo={getProductDiscountInfo(item, activeDiscounts)}
                onToggle={toggleSelect}
                onEditImage={openEditImage}
              />
            ))
          )}
        </div>

        {/* Loading Indicator & Load More Controls */}
        <div className="py-6 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
          {products.length < totalCount ? (
            <div ref={loadMoreRef} className="flex flex-col items-center gap-2">
              <span className="text-slate-400">
                กำลังแสดง <b>{products.length.toLocaleString()}</b> จากทั้งหมด <b>{totalCount.toLocaleString()}</b> รายการ
              </span>
              <button
                type="button"
                disabled={isLoadingMore}
                onClick={loadNextBatch}
                className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl transition shadow-2xs flex items-center gap-2 disabled:opacity-50"
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                    <span>กำลังโหลด {Math.min(batchSize, totalCount - products.length)} รายการถัดไป...</span>
                  </>
                ) : (
                  <span>โหลดเพิ่มอีก {Math.min(batchSize, totalCount - products.length)} รายการ</span>
                )}
              </button>
            </div>
          ) : (
            products.length > 0 && (
              <span className="text-slate-400">
                แสดงสินค้าครบทั้งหมด <b>{totalCount.toLocaleString()}</b> รายการแล้ว
              </span>
            )
          )}
        </div>
      </div>

      {/* Print Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded border border-slate-200 w-full max-w-2xl max-h-[80vh] flex flex-col shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
              <div>
                <h2 className="text-base font-bold text-slate-800">เลือกจำนวนที่ต้องการพิมพ์</h2>
                <p className="text-slate-500 text-xs mt-0.5">
                  รวม <b>{totalSets} ชุด</b> | 1 ชุด = รูป + QR x 2 + ข้อมูล
                </p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-slate-100 rounded text-slate-400 transition">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-4 space-y-2 bg-slate-50">
              {printTargets.map(p => {
                const specs = p.specs || {};
                const L = p.length_cm ?? specs.length_cm ?? '';
                const W = p.width_cm ?? specs.width_cm ?? '';
                const T = p.thickness_cm ?? specs.thickness_cm ?? '';
                const sizeStr = (L || W || T) ? `${L}×${W}×${T} CM` : (specs.size || '');
                return (
                  <div key={p.id} className="flex items-center gap-3 bg-white rounded border border-slate-200 p-2.5">
                    <img src={p.image_url || "/placeholder.png"} alt={p.name}
                      className="w-10 h-10 object-contain rounded bg-slate-50 border shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{p.name}</p>
                      <p className="text-xs font-mono text-slate-400 truncate">{p.barcode || p.sku}</p>
                      {sizeStr && <p className="text-xs text-blue-600 font-semibold">{sizeStr}</p>}
                      {(() => {
                        const disc = getProductDiscountInfo(p, activeDiscounts);
                        if (disc && disc.finalPrice > 0) {
                          return (
                            <div className="flex items-center gap-1.5 text-xs font-mono mt-0.5">
                              <span className="line-through text-slate-400">
                                ฿{Number(disc.originalPrice).toLocaleString()}
                              </span>
                              <span className="font-bold text-rose-600">
                                ฿{Number(disc.finalPrice).toLocaleString()}
                              </span>
                              <span className="bg-rose-100 text-rose-700 text-[10px] font-bold px-1.5 py-0.2 rounded">
                                {disc.badgeText}
                              </span>
                            </div>
                          );
                        } else if (p.price > 0) {
                          return (
                            <p className="text-xs font-semibold text-slate-700 font-mono mt-0.5">
                              ฿{Number(p.price).toLocaleString()}
                            </p>
                          );
                        }
                        return null;
                      })()}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-xs text-slate-500">ชุด:</span>
                      <button onClick={() => setQuantities(q => ({ ...q, [p.id]: Math.max(1, (q[p.id] || 1) - 1) }))}
                        className="w-7 h-7 rounded bg-slate-100 font-bold text-slate-600 hover:bg-slate-200 transition text-sm">−</button>
                      <input type="number" min={1} value={quantities[p.id] || 1}
                        onChange={e => setQuantities(q => ({ ...q, [p.id]: Math.max(1, parseInt(e.target.value) || 1) }))}
                        className="w-11 text-center border border-slate-200 rounded text-xs font-bold py-1 bg-white" />
                      <button onClick={() => setQuantities(q => ({ ...q, [p.id]: (q[p.id] || 1) + 1 }))}
                        className="w-7 h-7 rounded bg-slate-100 font-bold text-slate-600 hover:bg-slate-200 transition text-sm">+</button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-4 border-t border-slate-200 flex flex-col gap-2.5 bg-white">
              {/* Logo Selection Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                <span className="font-bold text-slate-700 flex items-center gap-1.5">
                  🏷️ โลโก้บนป้าย:
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPrintLogoMode("auto")}
                    className={`px-2.5 py-1 rounded text-xs font-semibold transition ${
                      printLogoMode === "auto"
                        ? "bg-slate-900 text-white shadow-xs"
                        : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    อัตโนมัติตามหมวด {selectedCategory === "SLABS" ? "(🪵 ZenSlab)" : "(Terra Home)"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrintLogoMode("zenslab")}
                    className={`px-2.5 py-1 rounded text-xs font-semibold transition ${
                      printLogoMode === "zenslab" || printLogoMode === "woodslabs"
                        ? "bg-amber-800 text-white shadow-xs"
                        : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    🪵 ZenSlab
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrintLogoMode("terra")}
                    className={`px-2.5 py-1 rounded text-xs font-semibold transition ${
                      printLogoMode === "terra"
                        ? "bg-stone-800 text-white shadow-xs"
                        : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    Terra Home
                  </button>
                </div>
              </div>

              {/* Orientation Mode Selector */}
              <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded p-2">
                <span className="text-xs font-semibold text-slate-700">แนวกระดาษพิมพ์ A4 (ป้าย 6×2 ซม.):</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPrintOrientation("portrait")}
                    className={`px-3 py-1.5 rounded text-xs font-bold transition flex items-center gap-1.5 ${
                      printOrientation === "portrait"
                        ? "bg-white text-orange-600 border border-orange-200 shadow-sm"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <span>📄</span>
                    <span>A4 แนวตั้ง (42 ป้าย/แผ่น)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrintOrientation("landscape")}
                    className={`px-3 py-1.5 rounded text-xs font-bold transition flex items-center gap-1.5 ${
                      printOrientation === "landscape"
                        ? "bg-white text-orange-600 border border-orange-200 shadow-sm"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <span>📑</span>
                    <span>A4 แนวนอน (40 ป้าย/แผ่น)</span>
                  </button>
                </div>
              </div>

              <button onClick={printQrPhoto}
                className="flex flex-col items-center gap-1 py-3.5 rounded border border-orange-300 bg-gradient-to-r from-orange-50 to-amber-50 hover:from-orange-100 hover:to-amber-100 transition text-slate-800 text-sm shadow-sm">
                <span className="font-bold text-sm text-orange-950 flex items-center gap-2">
                  <span>🏷️</span>
                  <span>พิมพ์ป้าย 6×2 ซม. ({printOrientation === "landscape" ? "A4 แนวนอน · 40 ป้าย/แผ่น" : "A4 แนวตั้ง · 42 ป้าย/แผ่น"})</span>
                </span>
                <span className="text-[11px] text-slate-600">
                  {printOrientation === "landscape"
                    ? "A4 แนวนอน · 4 คอลัมน์ × 10 แถว (40 ป้าย/แผ่น) · สัดส่วน 3 ส่วน: รูปซ้าย · ข้อมูลกลาง · QR และราคาขวา"
                    : "A4 แนวตั้ง · 3 คอลัมน์ × 14 แถว (42 ป้าย/แผ่น) · สัดส่วน 3 ส่วน: รูปซ้าย · ข้อมูลกลาง · QR และราคาขวา"}
                </span>
              </button>

              <button onClick={printLegacyHanging}
                className="w-full py-2 rounded border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition text-xs font-medium flex items-center justify-center gap-1.5">
                <span>🖨️</span>
                <span>หรือ พิมพ์ป้ายแบบเดิม (A4 แนวตั้ง · 25 ป้าย/แผ่น แบบเจาะรูห้อย)</span>
              </button>
              <button onClick={() => setShowModal(false)}
                className="w-full py-2 rounded-lg border border-slate-200 font-semibold text-slate-500 hover:bg-slate-50 transition text-sm">
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Edit Modal */}
      {editImageItem && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setEditImageItem(null)}>
          <div className="bg-white rounded border border-slate-200 w-full max-w-sm flex flex-col gap-4 p-5 shadow-xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-base font-bold text-slate-800">เปลี่ยนรูปภาพ</h2>
            <p className="text-xs text-slate-400 -mt-2 truncate">{editImageItem.name}</p>

            {/* Preview */}
            <div className="bg-slate-50 rounded border border-slate-100 aspect-square flex items-center justify-center overflow-hidden">
              {editImageUrl ? (
                <img src={editImageUrl} alt="preview" className="object-contain w-full h-full p-2"
                  onError={e => (e.currentTarget.style.opacity = "0.3")} />
              ) : (
                <ImageIcon className="w-10 h-10 text-slate-300" />
              )}
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">URL รูปภาพ</label>
              <input
                type="url"
                value={editImageUrl}
                onChange={e => { setEditImageUrl(e.target.value); setImageError(""); }}
                placeholder="https://example.com/image.jpg"
                className="w-full border border-slate-200 rounded px-3 py-2 text-sm outline-none focus:border-indigo-500"
                autoFocus
              />
              {imageError && <p className="text-red-500 text-xs mt-1">{imageError}</p>}
            </div>

            <div className="flex gap-2">
              <button onClick={() => setEditImageItem(null)}
                className="flex-1 py-2 rounded border border-slate-200 text-sm font-semibold text-slate-500 hover:bg-slate-50 transition">
                ยกเลิก
              </button>
              <button onClick={saveImage} disabled={isPending}
                className="flex-1 py-2 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold transition disabled:opacity-50 flex items-center justify-center gap-1.5">
                {isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>บันทึก...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>บันทึก</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowImportModal(false)}>
          <div className="bg-white rounded border border-slate-200 w-full max-w-2xl flex flex-col shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
              <div>
                <h2 className="text-base font-bold text-slate-800">นำเข้าจำนวนจาก Google Sheets / Excel</h2>
                <p className="text-slate-500 text-xs mt-0.5">
                  คัดลอกข้อมูล 2 คอลัมน์ (จำนวน [Tab] รหัสสินค้า) แล้ววางในช่องด้านล่าง
                </p>
              </div>
              <button onClick={() => setShowImportModal(false)} className="p-1 hover:bg-slate-100 rounded text-slate-400 transition">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4">
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder={"2\tFD-D24031A\n2\tFD-D24031B\n1\tFB-E24015A"}
                className="w-full h-56 p-3 border border-slate-200 rounded focus:border-indigo-500 outline-none font-mono text-xs resize-none"
              />
            </div>
            <div className="p-4 border-t border-slate-200 flex justify-end gap-2 bg-slate-50">
              <button onClick={() => setShowImportModal(false)}
                className="px-4 py-2 rounded border border-slate-200 font-semibold text-slate-600 hover:bg-white transition text-xs">
                ยกเลิก
              </button>
              <button onClick={handleImport}
                className="px-4 py-2 rounded bg-green-600 hover:bg-green-700 text-white font-semibold transition text-xs shadow-sm">
                ประมวลผลและเตรียมพิมพ์
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
