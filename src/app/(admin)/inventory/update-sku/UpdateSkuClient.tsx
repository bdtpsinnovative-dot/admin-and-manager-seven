"use client";

import React, { useState, useEffect } from "react";
import {
  Tag,
  Search,
  Check,
  AlertCircle,
  Loader2,
  FileSpreadsheet,
  Download,
  Upload,
  RefreshCw,
  Layers,
  Hammer,
  Box,
  Armchair,
  Package,
  ShieldCheck,
  Info,
  Copy,
  ClipboardPaste,
  ArrowRight,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import {
  getProductsForSkuUpdate,
  updateProductSku,
  bulkUpdateProductSkus,
  validateSkuPairs,
} from "@/actions/sku";
import * as XLSX from "xlsx";

interface UpdateSkuClientProps {
  allowedTabs: string[];
  initialTab: string;
}

interface ProductItem {
  id: number;
  name: string;
  sku: string | null;
  barcode: string | null;
  category_id: string;
  image_url: string | null;
  color?: string | null;
  price?: number | null;
  status?: string | null;
}

interface SkuPairValidationItem {
  rowIndex?: number;
  oldSku: string;
  newSku: string;
  productId?: number;
  productName?: string;
  imageUrl?: string;
  status: "ready" | "not_found" | "duplicate_new_sku" | "same" | "invalid";
  message?: string;
}

const CATEGORY_MAP: Record<string, { label: string; dbCategory: string; icon: any; color: string }> = {
  PROP: { label: "Props (พร็อพ)", dbCategory: "prop", icon: Box, color: "text-purple-600 bg-purple-50 border-purple-200" },
  SLABS: { label: "Wood Slabs (แผ่นไม้)", dbCategory: "SLABS", icon: Layers, color: "text-blue-600 bg-blue-50 border-blue-200" },
  ROUGH: { label: "Rough Wood (ไม้ดิบ)", dbCategory: "rough_wood", icon: Hammer, color: "text-orange-600 bg-orange-50 border-orange-200" },
  FURNITURE: { label: "Furniture (เฟอร์นิเจอร์)", dbCategory: "furniture", icon: Armchair, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  ALL: { label: "ทุกหมวดหมู่ (All)", dbCategory: "ALL", icon: Package, color: "text-slate-700 bg-slate-100 border-slate-300" },
};

export default function UpdateSkuClient({ allowedTabs, initialTab }: UpdateSkuClientProps) {
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [activeMode, setActiveMode] = useState<"single" | "paste" | "excel">("paste");

  // Single mode states
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productSkus, setProductSkus] = useState<Record<number, string>>({});
  const [savingId, setSavingId] = useState<number | null>(null);
  const [rowStatus, setRowStatus] = useState<Record<number, { type: "success" | "error"; msg: string }>>({});
  const [copiedSku, setCopiedSku] = useState<string | null>(null);

  // Bulk / Paste states
  const [pasteText, setPasteText] = useState("");
  const [columnOrder, setColumnOrder] = useState<"new_old" | "old_new" | "auto">("new_old"); // 'new_old' matches user's screenshot!
  const [validatedList, setValidatedList] = useState<SkuPairValidationItem[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [bulkResult, setBulkResult] = useState<{
    success: boolean;
    updatedCount: number;
    skippedCount: number;
    errors: string[];
  } | null>(null);

  const currentCategoryConfig = CATEGORY_MAP[activeTab] || CATEGORY_MAP.PROP;

  // Load products when tab or search changes
  const fetchProducts = async (cat: string, query: string) => {
    setLoadingProducts(true);
    const dbCategory = CATEGORY_MAP[cat]?.dbCategory || "prop";
    try {
      const res = await getProductsForSkuUpdate({
        category: dbCategory,
        search: query,
        limit: 80,
      });
      if (res.data) {
        setProducts(res.data);
        const skuMap: Record<number, string> = {};
        res.data.forEach((p: ProductItem) => {
          skuMap[p.id] = p.sku || "";
        });
        setProductSkus(skuMap);
      }
    } catch (err) {
      console.error("Failed to fetch products:", err);
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    if (activeMode === "single") {
      fetchProducts(activeTab, search);
    }
  }, [activeTab, activeMode]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProducts(activeTab, search);
  };

  // Handle single SKU update
  const handleSaveSku = async (product: ProductItem) => {
    const newSku = (productSkus[product.id] || "").trim();
    if (!newSku) {
      setRowStatus((prev) => ({
        ...prev,
        [product.id]: { type: "error", msg: "กรุณาระบุรหัส SKU" },
      }));
      return;
    }

    setSavingId(product.id);
    setRowStatus((prev) => {
      const copy = { ...prev };
      delete copy[product.id];
      return copy;
    });

    try {
      const res = await updateProductSku(product.id, newSku);
      if (res.error) {
        setRowStatus((prev) => ({
          ...prev,
          [product.id]: { type: "error", msg: res.error || "เกิดข้อผิดพลาด" },
        }));
      } else {
        setProducts((prev) =>
          prev.map((p) => (p.id === product.id ? { ...p, sku: newSku } : p))
        );
        setRowStatus((prev) => ({
          ...prev,
          [product.id]: { type: "success", msg: `อัปเดต SKU เป็น "${newSku}" สำเร็จ!` },
        }));
      }
    } catch (err: any) {
      setRowStatus((prev) => ({
        ...prev,
        [product.id]: { type: "error", msg: err.message || "เกิดข้อผิดพลาดในการบันทึก" },
      }));
    } finally {
      setSavingId(null);
    }
  };

  const handleCopySku = (sku: string) => {
    if (!sku) return;
    navigator.clipboard.writeText(sku);
    setCopiedSku(sku);
    setTimeout(() => setCopiedSku(null), 2000);
  };

  // Parse Raw Lines (from Paste or Excel) into { oldSku, newSku }
  const parsePairsFromRawRows = (rawRows: string[][]): { oldSku: string; newSku: string }[] => {
    if (rawRows.length === 0) return [];

    let startIdx = 0;
    let oldIdx = 1;
    let newIdx = 0;

    // Check header
    const firstRow = rawRows[0] || [];
    const firstRowStr = firstRow.map((c) => String(c || "").trim().toLowerCase());
    const hasHeader =
      firstRowStr.some((c) => c.includes("sku") || c.includes("new") || c.includes("old") || c.includes("เดิม") || c.includes("ใหม่"));

    if (hasHeader) {
      startIdx = 1;
      const detectedNew = firstRowStr.findIndex((c) => c.includes("new") || c.includes("ใหม่"));
      const detectedOld = firstRowStr.findIndex((c) => c.includes("old") || c.includes("เดิม") || c.includes("เก่า"));

      if (detectedNew !== -1 && detectedOld !== -1) {
        newIdx = detectedNew;
        oldIdx = detectedOld;
      } else if (columnOrder === "old_new") {
        oldIdx = 0;
        newIdx = 1;
      } else {
        newIdx = 0;
        oldIdx = 1;
      }
    } else {
      if (columnOrder === "old_new") {
        oldIdx = 0;
        newIdx = 1;
      } else {
        newIdx = 0;
        oldIdx = 1;
      }
    }

    const pairs: { oldSku: string; newSku: string }[] = [];

    for (let i = startIdx; i < rawRows.length; i++) {
      const row = rawRows[i];
      if (!row || row.length === 0) continue;

      // Handle single column containing tuple: ('OLD_SKU', 'NEW_SKU') like Column C in screenshot!
      const lineStr = row.join(" ").trim();
      const tupleMatch = lineStr.match(/\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*\)/);
      if (tupleMatch) {
        pairs.push({
          oldSku: tupleMatch[1].trim(),
          newSku: tupleMatch[2].trim(),
        });
        continue;
      }

      const val1 = String(row[0] || "").trim();
      const val2 = String(row[1] || "").trim();

      if (!val1 && !val2) continue;

      let oldVal = "";
      let newVal = "";

      if (newIdx === 0 && oldIdx === 1) {
        newVal = val1;
        oldVal = val2;
      } else {
        oldVal = val1;
        newVal = val2;
      }

      if (oldVal || newVal) {
        pairs.push({ oldSku: oldVal, newSku: newVal });
      }
    }

    return pairs;
  };

  // Process text from Paste
  const handleProcessPastedText = async () => {
    const raw = pasteText.trim();
    if (!raw) {
      alert("กรุณาวางข้อมูลจาก Google Sheets หรือ Excel ก่อนครับ");
      return;
    }

    setIsValidating(true);
    setBulkResult(null);

    try {
      const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      const rawRows: string[][] = lines.map((l) => {
        if (l.includes("\t")) return l.split("\t");
        if (l.includes(",")) return l.split(",");
        return [l];
      });

      const pairs = parsePairsFromRawRows(rawRows);
      if (pairs.length === 0) {
        alert("ไม่พบข้อมูล SKU ในข้อความที่วาง กรุณาตรวจสอบรูปแบบ");
        setIsValidating(false);
        return;
      }

      // Validate against Database
      const res = await validateSkuPairs(pairs);
      if (res.data) {
        setValidatedList(res.data);
      } else {
        alert("ตรวจสอบข้อมูลไม่สำเร็จ: " + (res.error || "เกิดข้อผิดพลาด"));
      }
    } catch (err: any) {
      alert("เกิดข้อผิดพลาดในการประมวลผล: " + err.message);
    } finally {
      setIsValidating(false);
    }
  };

  // Process uploaded Excel file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsValidating(true);
    setBulkResult(null);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: "binary" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (rawJson.length <= 1) {
          alert("ไฟล์ไม่มีข้อมูล หรือมีเฉพาะหัวตาราง");
          setIsValidating(false);
          return;
        }

        const stringRows = rawJson.map((row) => (row || []).map((cell) => String(cell || "")));
        const pairs = parsePairsFromRawRows(stringRows);

        if (pairs.length === 0) {
          alert("ไม่พบข้อมูล SKU ในไฟล์ Excel");
          setIsValidating(false);
          return;
        }

        const res = await validateSkuPairs(pairs);
        if (res.data) {
          setValidatedList(res.data);
        } else {
          alert("ตรวจสอบข้อมูลไม่สำเร็จ: " + (res.error || ""));
        }
      } catch (err: any) {
        alert("อ่านไฟล์ไม่สำเร็จ: " + (err.message || ""));
      } finally {
        setIsValidating(false);
      }
    };

    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  // Bulk Excel download template
  const handleDownloadTemplate = () => {
    // Exactly matching user's screenshot! (Column A = NEW SKU, Column B = OLD SKU)
    const sampleData = [
      {
        "NEW SKU": "TR-DPR-TTA15517-D1-100/100",
        "OLD SKU": "TR-WDG-TTA15517-D1",
        "หมายเหตุ": "คอลัมน์ A = SKU ใหม่, คอลัมน์ B = SKU เดิม (ตามฟอร์แมตในภาพ)",
      },
      {
        "NEW SKU": "TR-MMA-TTA15826-P-0-D16H2-80/100",
        "OLD SKU": "TR-WMX-TTA15826-P-0-D16H2",
        "หมายเหตุ": "ตัวอย่างแถวที่ 2",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "SKU_Template");

    worksheet["!cols"] = [{ wch: 35 }, { wch: 30 }, { wch: 45 }];

    XLSX.writeFile(workbook, `Template_Update_SKU_${activeTab}.xlsx`);
  };

  // Confirm Bulk Execution
  const handleExecuteBulkUpdate = async () => {
    const readyItems = validatedList.filter((item) => item.status === "ready" && item.newSku);
    if (readyItems.length === 0) {
      alert("ไม่มีรายการที่มีสถานะพร้อมอัปเดต");
      return;
    }

    setBulkProcessing(true);
    try {
      const payload = readyItems.map((item) => ({
        productId: item.productId,
        oldSku: item.oldSku,
        newSku: item.newSku,
      }));

      const res = await bulkUpdateProductSkus(payload);
      setBulkResult(res);

      if (res.success) {
        // Update local validated list status
        setValidatedList((prev) =>
          prev.map((item) => {
            if (item.status === "ready") {
              return { ...item, status: "ready", message: "อัปเดตเรียบร้อยแล้ว ✓" };
            }
            return item;
          })
        );
      }
    } catch (err: any) {
      alert("เกิดข้อผิดพลาดในการอัปเดต: " + err.message);
    } finally {
      setBulkProcessing(false);
    }
  };

  const readyCount = validatedList.filter((i) => i.status === "ready").length;
  const notFoundCount = validatedList.filter((i) => i.status === "not_found").length;
  const duplicateCount = validatedList.filter((i) => i.status === "duplicate_new_sku").length;
  const sameCount = validatedList.filter((i) => i.status === "same").length;

  return (
    <div className="space-y-6">
      {/* 🛡️ SAFETY BANNER */}
      <div className="bg-gradient-to-r from-indigo-50 via-blue-50 to-emerald-50 border border-indigo-100 rounded-2xl p-5 shadow-xs">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-indigo-200">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="text-xs sm:text-sm text-slate-700 space-y-1">
            <div className="font-black text-indigo-950 flex items-center gap-2">
              <span>อัปเดต SKU ปลอดภัย 100% ไม่ลบสินค้า ไม่กระทบสต็อกและออเดอร์</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                In-Place Safe Update
              </span>
            </div>
            <p className="text-slate-600 leading-relaxed">
              หน้านี้ถูกสร้างขึ้นเพื่อแก้ปัญหาการลบสินค้าเดิมแล้วสร้างใหม่เพียงเพื่อเปลี่ยนรหัส SKU ซึ่งทำให้ประวัติการเดินสต็อก (Stock Movements), คำสั่งซื้อ (Order Items), และการเชื่อมโยงอื่นๆ สูญหาย ระบบนี้จะอัปเดตเฉพาะฟิลด์ <code className="bg-white/80 px-1.5 py-0.5 rounded text-indigo-700 font-mono font-bold">sku</code> ของสินค้านั้นโดยตรง ข้อมูลเดิมทั้งหมดจึงอยู่ครบถ้วนสมบูรณ์ครับ
            </p>
          </div>
        </div>
      </div>

      {/* TOP NAVIGATION & MODE SELECTION */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
        {/* Category Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {Object.keys(CATEGORY_MAP).map((tabKey) => {
              const cfg = CATEGORY_MAP[tabKey];
              const Icon = cfg.icon;
              const isSelected = activeTab === tabKey;
              return (
                <button
                  key={tabKey}
                  type="button"
                  onClick={() => setActiveTab(tabKey)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    isSelected
                      ? "bg-indigo-600 text-white shadow-sm shadow-indigo-200"
                      : "bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{cfg.label}</span>
                </button>
              );
            })}
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl shrink-0">
            <button
              type="button"
              onClick={() => setActiveMode("paste")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeMode === "paste"
                  ? "bg-white text-indigo-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <ClipboardPaste className="w-3.5 h-3.5 text-indigo-600" />
              <span>วางจาก Google Sheets (แนะนำ)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveMode("excel")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeMode === "excel"
                  ? "bg-white text-indigo-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>อัปโหลด Excel / CSV</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveMode("single")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeMode === "single"
                  ? "bg-white text-indigo-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>ค้นหาแก้ไขรายชิ้น</span>
            </button>
          </div>
        </div>

        {/* ============================================================ */}
        {/* MODE 1: PASTE FROM GOOGLE SHEETS / EXCEL (RECOMMENDED) */}
        {/* ============================================================ */}
        {activeMode === "paste" && (
          <div className="space-y-5">
            {/* Column Order Selection */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-indigo-600 shrink-0" />
                <span className="text-xs font-bold text-slate-800">
                  ลำดับคอลัมน์ของข้อมูลที่คัดลอกมา:
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold cursor-pointer hover:border-indigo-400">
                  <input
                    type="radio"
                    name="columnOrder"
                    value="new_old"
                    checked={columnOrder === "new_old"}
                    onChange={() => setColumnOrder("new_old")}
                    className="text-indigo-600"
                  />
                  <span>คอลัมน์ A: NEW SKU ➔ คอลัมน์ B: OLD SKU (ตามภาพตัวอย่าง)</span>
                </label>
                <label className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold cursor-pointer hover:border-indigo-400">
                  <input
                    type="radio"
                    name="columnOrder"
                    value="old_new"
                    checked={columnOrder === "old_new"}
                    onChange={() => setColumnOrder("old_new")}
                    className="text-indigo-600"
                  />
                  <span>คอลัมน์ A: OLD SKU ➔ คอลัมน์ B: NEW SKU</span>
                </label>
              </div>
            </div>

            {/* Paste Text Area */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700">
                  📋 วางข้อความที่คัดลอกจาก Google Sheets / Excel (กด Ctrl+V ที่นี่)
                </label>
                {pasteText && (
                  <button
                    type="button"
                    onClick={() => {
                      setPasteText("");
                      setValidatedList([]);
                      setBulkResult(null);
                    }}
                    className="text-[11px] text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    ล้างข้อความ
                  </button>
                )}
              </div>
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder={`วางแถวที่ก็อปมาจากตาราง เช่น:
TR-DPR-TTA15517-D1-100/100	TR-WDG-TTA15517-D1
TR-MMA-TTA15826-P-0-D16H2-80/100	TR-WMX-TTA15826-P-0-D16H2
หรือรูปแบบ Tuple: ('TR-WDG-TTA15517-D1', 'TR-DPR-TTA15517-D1-100/100')`}
                rows={6}
                className="w-full p-3.5 bg-slate-50 border border-slate-300 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded-xl text-xs font-mono text-slate-800 transition outline-hidden"
              />
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1">
                <p className="text-[11px] text-slate-500">
                  💡 รองรับทั้งการคัดลอก 2 คอลัมน์โดยตรงจาก Google Sheets และคอลัมน์ C ที่เป็นวงเล็บ Tuple ครับ
                </p>
                <button
                  type="button"
                  onClick={handleProcessPastedText}
                  disabled={isValidating || !pasteText.trim()}
                  className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  {isValidating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>กำลังตรวจสอบข้อมูลในระบบ...</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-3.5 h-3.5" />
                      <span>ตรวจสอบและจับคู่สินค้า ({pasteText.trim() ? pasteText.trim().split(/\r?\n/).length : 0} แถว)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* MODE 2: EXCEL / CSV UPLOAD */}
        {/* ============================================================ */}
        {activeMode === "excel" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Step 1: Download Template */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                    1
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-800">ดาวน์โหลดแบบฟอร์ม Excel</h3>
                    <p className="text-[11px] text-slate-500">ไฟล์ตัวอย่างตรงตามโครงสร้าง (NEW SKU, OLD SKU)</p>
                  </div>
                </div>
                <p className="text-xs text-slate-600">
                  ดาวน์โหลดไฟล์เทมเพลตมาตรฐานตามตารางตัวอย่าง นำไปกรอกรหัส SKU ที่ต้องการเปลี่ยน แล้วนำกลับมาอัปโหลด
                </p>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="w-full py-2.5 px-4 bg-white border border-slate-300 hover:border-emerald-500 hover:text-emerald-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-95"
                >
                  <Download className="w-4 h-4 text-emerald-600" />
                  <span>ดาวน์โหลด Template Excel (.xlsx)</span>
                </button>
              </div>

              {/* Step 2: Upload File */}
              <div className="p-5 rounded-2xl bg-indigo-50/50 border border-indigo-200 border-dashed space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                    2
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-indigo-950">อัปโหลดไฟล์เพื่อแก้ไข SKU</h3>
                    <p className="text-[11px] text-indigo-600">รองรับไฟล์ .xlsx, .xls, หรือ .csv</p>
                  </div>
                </div>

                <label className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-95">
                  <Upload className="w-4 h-4" />
                  <span>เลือกไฟล์ Excel / CSV จากเครื่อง</span>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* PREVIEW & VALIDATION RESULTS TABLE (FOR PASTE & EXCEL) */}
        {/* ============================================================ */}
        {(activeMode === "paste" || activeMode === "excel") && validatedList.length > 0 && (
          <div className="space-y-4 pt-4 border-t border-slate-200">
            {/* Summary Counters */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-800">
                  ผลการตรวจสอบ {validatedList.length} รายการ:
                </span>
                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  พร้อมอัปเดต {readyCount} รายการ
                </span>
                {notFoundCount > 0 && (
                  <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    ไม่พบ SKU เดิม {notFoundCount}
                  </span>
                )}
                {duplicateCount > 0 && (
                  <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5" />
                    SKU ใหม่ซ้ำ {duplicateCount}
                  </span>
                )}
                {sameCount > 0 && (
                  <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                    SKU เดิมเหมือนเดิม {sameCount}
                  </span>
                )}
              </div>

              {/* Confirm Execution Button */}
              <button
                type="button"
                onClick={handleExecuteBulkUpdate}
                disabled={bulkProcessing || readyCount === 0}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold transition shadow-md shadow-indigo-100 flex items-center gap-2 cursor-pointer active:scale-95"
              >
                {bulkProcessing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>กำลังบันทึกอัปเดต SKU ลงฐานข้อมูล...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>ยืนยันบันทึกอัปเดต SKU ที่พร้อม ({readyCount} รายการ)</span>
                  </>
                )}
              </button>
            </div>

            {/* Execution Result Banner */}
            {bulkResult && (
              <div
                className={`p-4 rounded-xl border ${
                  bulkResult.success
                    ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                    : "bg-rose-50 border-rose-200 text-rose-900"
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-sm">
                  {bulkResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                  )}
                  <span>
                    อัปเดต SKU สำเร็จเรียบร้อย {bulkResult.updatedCount} รายการ (ข้าม/ไม่สำเร็จ {bulkResult.skippedCount} รายการ)
                  </span>
                </div>
                {bulkResult.errors.length > 0 && (
                  <div className="mt-2 text-xs space-y-1 text-rose-700">
                    <p className="font-bold">รายละเอียดข้อผิดพลาด:</p>
                    <ul className="list-disc list-inside space-y-0.5">
                      {bulkResult.errors.slice(0, 6).map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Validation Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[500px] overflow-y-auto shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th className="p-3 w-12 text-center">#</th>
                    <th className="p-3">สินค้าที่ตรงกับ SKU เดิม</th>
                    <th className="p-3">SKU เดิม (OLD SKU)</th>
                    <th className="p-3">SKU ใหม่ (NEW SKU)</th>
                    <th className="p-3 w-64">สถานะการตรวจสอบ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {validatedList.map((item, idx) => (
                    <tr
                      key={idx}
                      className={`hover:bg-slate-50 ${
                        item.status === "ready"
                          ? "bg-emerald-50/20"
                          : item.status === "not_found"
                          ? "bg-amber-50/20"
                          : item.status === "duplicate_new_sku"
                          ? "bg-rose-50/20"
                          : ""
                      }`}
                    >
                      <td className="p-3 text-center text-slate-400 font-sans">{idx + 1}</td>

                      {/* Product Name & Thumbnail */}
                      <td className="p-3 font-sans">
                        {item.productName ? (
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                              {item.imageUrl ? (
                                <img
                                  src={item.imageUrl}
                                  alt={item.productName}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Package className="w-4 h-4 text-slate-400" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-slate-800 truncate max-w-xs" title={item.productName}>
                                {item.productName}
                              </div>
                              <div className="text-[10px] text-slate-400">ID: {item.productId}</div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic font-sans">(ไม่พบสินค้าในระบบ)</span>
                        )}
                      </td>

                      {/* Old SKU */}
                      <td className="p-3 text-slate-600 font-bold select-all">{item.oldSku || "-"}</td>

                      {/* New SKU */}
                      <td className="p-3 font-bold text-indigo-700 select-all">{item.newSku}</td>

                      {/* Status */}
                      <td className="p-3 font-sans">
                        {item.status === "ready" ? (
                          <div className="space-y-0.5">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              {item.message || "พร้อมอัปเดต"}
                            </span>
                          </div>
                        ) : item.status === "not_found" ? (
                          <div className="space-y-0.5">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 inline-flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 shrink-0" />
                              ไม่พบ SKU เดิม
                            </span>
                            <p className="text-[10px] text-amber-700 leading-tight">
                              ไม่มีสินค้า SKU นี้ในระบบ
                            </p>
                          </div>
                        ) : item.status === "duplicate_new_sku" ? (
                          <div className="space-y-1">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 inline-flex items-center gap-1">
                              <XCircle className="w-3 h-3 shrink-0" />
                              SKU ใหม่ซ้ำในระบบ
                            </span>
                            <p className="text-[11px] text-rose-600 leading-tight font-medium bg-rose-50/60 p-1.5 rounded border border-rose-100">
                              {item.message}
                            </p>
                          </div>
                        ) : item.status === "same" ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            เหมือนเดิม
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            {item.message || "ไม่ถูกต้อง"}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* MODE 3: SINGLE SKU SEARCH & EDIT */}
        {/* ============================================================ */}
        {activeMode === "single" && (
          <div className="space-y-4">
            <form onSubmit={handleSearchSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={`ค้นหาใน ${currentCategoryConfig.label} ด้วยชื่อสินค้า, SKU เดิม, หรือ Barcode...`}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100 rounded-xl text-sm text-slate-800 transition outline-hidden"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
              <button
                type="submit"
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-2 cursor-pointer active:scale-95 shrink-0"
              >
                {loadingProducts ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                <span>ค้นหา</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  fetchProducts(activeTab, "");
                }}
                className="px-3.5 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                title="ล้างการค้นหา"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingProducts ? "animate-spin" : ""}`} />
              </button>
            </form>

            {loadingProducts ? (
              <div className="p-12 text-center text-slate-400 space-y-3">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-500" />
                <p className="text-xs font-medium">กำลังโหลดข้อมูลสินค้าในหมวดหมู่นี้...</p>
              </div>
            ) : products.length === 0 ? (
              <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-2xl space-y-2">
                <Box className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-sm font-bold text-slate-700">ไม่พบสินค้าในหมวดนี้ หรือไม่ตรงกับคำค้นหา</p>
                <p className="text-xs text-slate-400">ลองเปลี่ยนหมวดหมู่ด้านบน หรือระบุคำค้นหาอื่น</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <div className="bg-slate-50/80 px-4 py-2.5 grid grid-cols-12 gap-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <div className="col-span-12 sm:col-span-5">สินค้า / รหัส ID</div>
                  <div className="col-span-12 sm:col-span-3">SKU ปัจจุบัน</div>
                  <div className="col-span-12 sm:col-span-4">กำหนด SKU ใหม่ & บันทึก</div>
                </div>

                {products.map((item) => {
                  const currentInput = productSkus[item.id] ?? (item.sku || "");
                  const isModified = currentInput.trim() !== (item.sku || "").trim();
                  const isSaving = savingId === item.id;
                  const status = rowStatus[item.id];

                  return (
                    <div
                      key={item.id}
                      className={`p-3.5 grid grid-cols-12 gap-3 items-center transition-colors ${
                        isModified ? "bg-indigo-50/30" : "hover:bg-slate-50/60"
                      }`}
                    >
                      <div className="col-span-12 sm:col-span-5 flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Package className="w-5 h-5 text-slate-300" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-800 truncate" title={item.name}>
                            {item.name}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                            <span>ID: <code className="font-mono font-semibold text-slate-600">{item.id}</code></span>
                            <span>•</span>
                            <span className="capitalize">{item.category_id}</span>
                            {item.barcode && (
                              <>
                                <span>•</span>
                                <span className="font-mono text-[10px] text-slate-500">{item.barcode}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="col-span-12 sm:col-span-3 flex items-center gap-2">
                        {item.sku ? (
                          <div className="flex items-center gap-1.5">
                            <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-xs font-mono font-bold text-slate-700 select-all">
                              {item.sku}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopySku(item.sku!)}
                              className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                              title="คัดลอก SKU"
                            >
                              {copiedSku === item.sku ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-amber-600 italic bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            (ยังไม่มี SKU)
                          </span>
                        )}
                      </div>

                      <div className="col-span-12 sm:col-span-4 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={currentInput}
                            onChange={(e) => {
                              const val = e.target.value;
                              setProductSkus((prev) => ({ ...prev, [item.id]: val }));
                              if (rowStatus[item.id]) {
                                setRowStatus((prev) => {
                                  const copy = { ...prev };
                                  delete copy[item.id];
                                  return copy;
                                });
                              }
                            }}
                            placeholder="ระบุรหัส SKU ใหม่..."
                            className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-mono font-bold border transition outline-hidden ${
                              isModified
                                ? "border-indigo-400 bg-white ring-2 ring-indigo-100 text-indigo-900"
                                : "border-slate-300 bg-slate-50 text-slate-700 focus:bg-white focus:border-indigo-500"
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveSku(item)}
                            disabled={isSaving || !currentInput.trim() || !isModified}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 shrink-0 cursor-pointer ${
                              isModified
                                ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs active:scale-95"
                                : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                            }`}
                          >
                            {isSaving ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin" />
                                <span>บันทึก</span>
                              </>
                            ) : (
                              <>
                                <Check className="w-3 h-3" />
                                <span>บันทึก SKU</span>
                              </>
                            )}
                          </button>
                        </div>

                        {status && (
                          <div
                            className={`text-[11px] flex items-center gap-1.5 font-medium animate-fadeIn ${
                              status.type === "success" ? "text-emerald-600" : "text-rose-600"
                            }`}
                          >
                            {status.type === "success" ? (
                              <Check className="w-3 h-3 shrink-0" />
                            ) : (
                              <AlertCircle className="w-3 h-3 shrink-0" />
                            )}
                            <span className="truncate">{status.msg}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
