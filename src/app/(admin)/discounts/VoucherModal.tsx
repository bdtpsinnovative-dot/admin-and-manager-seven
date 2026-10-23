"use client";

import React, { useState, useEffect, useRef } from "react";
import QRCode from "qrcode";
import { toPng } from "html-to-image";
import { saveAs } from "file-saver";
import {
  X,
  Printer,
  Download,
  Share2,
  Scissors,
  Ticket,
  Check,
  Copy,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Layers,
  Smartphone,
  Calendar,
  Building2,
  User,
  ShieldCheck,
  CheckCircle2,
  Loader2,
  Palette,
} from "lucide-react";

export interface VoucherItem {
  id: string | number;
  title: string;
  coupon_code?: string;
  is_tiered?: boolean;
  tiers?: Array<{
    min_spend: number | string;
    discount_type: "percentage" | "fixed";
    discount_value: number | string;
  }>;
  discount_type?: "percentage" | "fixed";
  discount_value?: number | string;
  min_spend?: number | string;
  max_discount_amount?: number | string;
  collection_name?: string | null;
  attribution?: {
    lead_sales?: string;
    partner_company?: string;
    partner_sales?: string;
    note?: string;
  } | null;
  start_date?: string | null;
  end_date?: string | null;
  usage_limit?: number | null;
  description?: string;
}

interface VoucherModalProps {
  isOpen: boolean;
  onClose: () => void;
  vouchers: VoucherItem[];
}

type ThemeType = "gold" | "terra" | "dark";
type ViewMode = "single" | "sheet_a4";
type SheetLayout = "4_per_page" | "6_per_page";

export default function VoucherModal({ isOpen, onClose, vouchers }: VoucherModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>("single");
  const [theme, setTheme] = useState<ThemeType>("gold");
  const [sheetLayout, setSheetLayout] = useState<SheetLayout>("4_per_page");
  const [qrCodes, setQrCodes] = useState<Record<string, string>>({});
  const [isExporting, setIsExporting] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [savedImageUrl, setSavedImageUrl] = useState<string | null>(null);

  const singleVoucherRef = useRef<HTMLDivElement>(null);
  const sheetA4Ref = useRef<HTMLDivElement>(null);

  // Generate QR codes for all vouchers
  useEffect(() => {
    if (!isOpen || vouchers.length === 0) return;
    let isMounted = true;

    async function generateQRs() {
      const qrs: Record<string, string> = {};
      for (const v of vouchers) {
        const code = v.coupon_code || String(v.id);
        try {
          const url = await QRCode.toDataURL(code, {
            width: 300,
            margin: 1,
            color: {
              dark: "#1e293b",
              light: "#ffffff",
            },
          });
          qrs[code] = url;
        } catch (e) {
          console.error("QR error:", e);
        }
      }
      if (isMounted) setQrCodes(qrs);
    }

    generateQRs();
    return () => {
      isMounted = false;
    };
  }, [isOpen, vouchers]);

  if (!isOpen || vouchers.length === 0) return null;

  const currentVoucher = vouchers[currentIndex] || vouchers[0];

  const copyCode = (code: string) => {
    navigator.clipboard?.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Export Single Voucher as Image (Save to Mobile / Share)
  const handleSaveSingleImage = async () => {
    if (!singleVoucherRef.current) return;
    setIsExporting(true);
    try {
      const dataUrl = await toPng(singleVoucherRef.current, {
        quality: 0.98,
        pixelRatio: 2.5,
        cacheBust: true,
      });

      const fileName = `voucher-${currentVoucher.coupon_code || "coupon"}.png`;

      // Check for mobile Web Share API with file support
      if (typeof navigator !== "undefined" && navigator.canShare) {
        try {
          const res = await fetch(dataUrl);
          const blob = await res.blob();
          const file = new File([blob], fileName, { type: "image/png" });

          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: `บัตรส่วนลด Terra Home: ${currentVoucher.coupon_code}`,
              text: `บัตรกำนัลส่วนลดพิเศษ ${currentVoucher.title} รหัสคูปอง: ${currentVoucher.coupon_code}`,
              files: [file],
            });
            setIsExporting(false);
            return;
          }
        } catch (err: any) {
          if (err.name === "AbortError") {
            setIsExporting(false);
            return;
          }
          console.log("Web Share fallback to direct download:", err);
        }
      }

      // Download file
      saveAs(dataUrl, fileName);
      setSavedImageUrl(dataUrl);
    } catch (err) {
      console.error("Export error:", err);
      alert("ไม่สามารถสร้างรูปภาพได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsExporting(false);
    }
  };

  // Export A4 Sheet as Image
  const handleSaveSheetImage = async () => {
    if (!sheetA4Ref.current) return;
    setIsExporting(true);
    try {
      const dataUrl = await toPng(sheetA4Ref.current, {
        quality: 0.95,
        pixelRatio: 2,
        cacheBust: true,
      });

      const fileName = `vouchers-A4-sheet-${new Date().toISOString().slice(0, 10)}.png`;

      // Check mobile Web Share API
      if (typeof navigator !== "undefined" && navigator.canShare) {
        try {
          const res = await fetch(dataUrl);
          const blob = await res.blob();
          const file = new File([blob], fileName, { type: "image/png" });

          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: "บัตรส่วนลดกระดาษ A4 - Terra Home",
              files: [file],
            });
            setIsExporting(false);
            return;
          }
        } catch (err: any) {
          if (err.name === "AbortError") {
            setIsExporting(false);
            return;
          }
        }
      }

      saveAs(dataUrl, fileName);
      setSavedImageUrl(dataUrl);
    } catch (err) {
      console.error("Export error:", err);
      alert("ไม่สามารถสร้างรูปภาพได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsExporting(false);
    }
  };

  // Print A4 Paper
  const handlePrint = () => {
    window.print();
  };

  // Helper formatting dates
  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "ไม่จำกัดระยะเวลา";
    try {
      return new Date(dateStr).toLocaleDateString("th-TH", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static print:overflow-visible">
      {/* 🛑 Print CSS Rule */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
          body * {
            visibility: hidden;
          }
          #voucher-print-area, #voucher-print-area * {
            visibility: visible;
          }
          #voucher-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 0;
          }
          @page {
            size: A4 portrait;
            margin: 8mm;
          }
        }
      `,
        }}
      />

      <div
        className="bg-white rounded-3xl border border-slate-200 w-full max-w-5xl max-h-[96vh] flex flex-col shadow-2xl overflow-hidden print:border-none print:shadow-none print:max-h-none print:w-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Control Header (Hidden on Print) */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 text-white shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <Ticket className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight">
                  ระบบออกแบบ & แจกบัตรคูปอง (Voucher Studio)
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] font-bold">
                  {vouchers.length} ใบ
                </span>
              </div>
              <p className="text-xs text-slate-300">
                เลือกรูปแบบเพื่อเซฟภาพลงมือถือ (LINE) หรือสั่งพิมพ์เป็นกระดาษ A4 แจกลูกค้า
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar: Switch View, Theme, Layout (Hidden on Print) */}
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-200/80 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setViewMode("single")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewMode === "single"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Smartphone className="w-3.5 h-3.5 text-amber-600" />
              <span>บัตรเดี่ยว (ส่งมือถือ/LINE)</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("sheet_a4")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewMode === "sheet_a4"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              <span>กระดาษ A4 (รวมหลายใบ)</span>
            </button>
          </div>

          {/* Theme Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 hidden sm:inline flex items-center gap-1">
              <Palette className="w-3.5 h-3.5" /> ธีม:
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setTheme("gold")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition border cursor-pointer ${
                  theme === "gold"
                    ? "bg-amber-100 text-amber-900 border-amber-400 shadow-2xs font-black"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-amber-400 to-yellow-600" />
                <span>Gold Luxury</span>
              </button>
              <button
                type="button"
                onClick={() => setTheme("terra")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition border cursor-pointer ${
                  theme === "terra"
                    ? "bg-emerald-100 text-emerald-900 border-emerald-400 shadow-2xs font-black"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                <span>Terra Green</span>
              </button>
              <button
                type="button"
                onClick={() => setTheme("dark")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition border cursor-pointer ${
                  theme === "dark"
                    ? "bg-slate-900 text-white border-slate-800 shadow-2xs font-black"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-slate-800" />
                <span>Black & Gold</span>
              </button>
            </div>
          </div>

          {/* Sheet Layout (if sheet_a4) */}
          {viewMode === "sheet_a4" && (
            <div className="flex items-center gap-1.5 bg-slate-200/80 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setSheetLayout("4_per_page")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  sheetLayout === "4_per_page"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                4 ใบ / แผ่น A4 (2×2)
              </button>
              <button
                type="button"
                onClick={() => setSheetLayout("6_per_page")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  sheetLayout === "6_per_page"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                6 ใบ / แผ่น A4 (2×3)
              </button>
            </div>
          )}

          {/* Quick Pagination for Single View */}
          {viewMode === "single" && vouchers.length > 1 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                disabled={currentIndex === 0}
                className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 disabled:opacity-30 hover:bg-slate-100 transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-mono font-bold text-slate-700">
                {currentIndex + 1} / {vouchers.length}
              </span>
              <button
                type="button"
                onClick={() => setCurrentIndex((prev) => Math.min(vouchers.length - 1, prev + 1))}
                disabled={currentIndex === vouchers.length - 1}
                className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 disabled:opacity-30 hover:bg-slate-100 transition cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100/80 flex flex-col items-center justify-start min-h-[380px]">
          {/* ============================================================== */}
          {/* MODE 1: SINGLE VOUCHER (FOR MOBILE SCREEN / LINE DISTRIBUTION) */}
          {/* ============================================================== */}
          {viewMode === "single" && (
            <div className="w-full flex flex-col items-center gap-6">
              <div
                ref={singleVoucherRef}
                className="w-full max-w-[540px] transition-all duration-300 drop-shadow-xl"
              >
                <VoucherCard
                  voucher={currentVoucher}
                  qrCodeUrl={qrCodes[currentVoucher.coupon_code || String(currentVoucher.id)]}
                  theme={theme}
                  copiedCode={copiedCode}
                  onCopy={copyCode}
                  size="large"
                />
              </div>

              {/* Mobile Quick Guide */}
              <div className="text-center text-xs text-slate-500 max-w-sm">
                💡 <span className="font-semibold text-slate-700">แนะนำ:</span> กดปุ่ม{" "}
                <b>"บันทึกรูปเข้ามือถือ (LINE)"</b> ด้านล่าง เพื่อเซฟเป็นรูปภาพเข้าอัลบั้มรูป
                หรือกดแชร์ส่งต่อให้ลูกค้าใน LINE ได้ทันที
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* MODE 2: A4 SHEET (MULTI-VOUCHER WITH SCISSOR CUT LINES)         */}
          {/* ============================================================== */}
          {viewMode === "sheet_a4" && (
            <div id="voucher-print-area" className="w-full flex flex-col items-center">
              <div
                ref={sheetA4Ref}
                className={`bg-white border border-slate-300 rounded-sm shadow-xl p-6 sm:p-8 mx-auto box-border ${
                  sheetLayout === "4_per_page"
                    ? "w-full max-w-[794px] min-h-[1123px] grid grid-cols-2 gap-6"
                    : "w-full max-w-[794px] min-h-[1123px] grid grid-cols-2 gap-4"
                }`}
                style={{
                  width: "100%",
                  maxWidth: "210mm",
                  backgroundColor: "#ffffff",
                }}
              >
                {vouchers.map((v, idx) => (
                  <div key={v.id || idx} className="relative flex flex-col">
                    <VoucherCard
                      voucher={v}
                      qrCodeUrl={qrCodes[v.coupon_code || String(v.id)]}
                      theme={theme}
                      copiedCode={copiedCode}
                      onCopy={copyCode}
                      size={sheetLayout === "4_per_page" ? "medium" : "compact"}
                    />

                    {/* Dotted Cut Guidelines */}
                    <div className="absolute -bottom-3 left-0 right-0 flex items-center justify-center opacity-40 hover:opacity-100 transition print:opacity-40">
                      <div className="w-full border-b border-dashed border-slate-400" />
                      <Scissors className="w-3.5 h-3.5 text-slate-500 mx-1 shrink-0 rotate-90" />
                      <div className="w-full border-b border-dashed border-slate-400" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Action Footer (Hidden on Print) */}
        <div className="p-4 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden">
          <div className="text-xs text-slate-500">
            {viewMode === "single" ? (
              <span>
                กำลังดูคูปองใบที่ <b className="text-slate-800">{currentIndex + 1}</b> จากทั้งหมด{" "}
                <b className="text-slate-800">{vouchers.length}</b> ใบ
              </span>
            ) : (
              <span>
                จัดเรียงในหน้ากระดาษ A4 รวม <b className="text-slate-800">{vouchers.length}</b> ใบ
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Save to Mobile / Download Button */}
            <button
              type="button"
              disabled={isExporting}
              onClick={viewMode === "single" ? handleSaveSingleImage : handleSaveSheetImage}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black text-xs sm:text-sm shadow-md transition active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>กำลังสร้างรูปภาพ...</span>
                </>
              ) : (
                <>
                  <Smartphone className="w-4 h-4" />
                  <span>บันทึกรูปเข้ามือถือ (LINE)</span>
                </>
              )}
            </button>

            {/* Print A4 Paper / Save PDF */}
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm shadow-md transition active:scale-95 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>พิมพ์กระดาษ A4 / บันทึก PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm transition cursor-pointer"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// SUB-COMPONENT: VOUCHER CARD (PREMIUM LUXURY DESIGN)
// =========================================================================
interface VoucherCardProps {
  voucher: VoucherItem;
  qrCodeUrl?: string;
  theme: ThemeType;
  copiedCode: string | null;
  onCopy: (code: string) => void;
  size?: "large" | "medium" | "compact";
}

function VoucherCard({
  voucher,
  qrCodeUrl,
  theme,
  copiedCode,
  onCopy,
  size = "large",
}: VoucherCardProps) {
  const isPercent = voucher.discount_type === "percentage";
  const code = voucher.coupon_code || String(voucher.id);
  const isTiered = voucher.is_tiered && voucher.tiers && voucher.tiers.length > 0;

  // Format valid date
  const dateRange =
    voucher.start_date || voucher.end_date
      ? `${voucher.start_date ? new Date(voucher.start_date).toLocaleDateString("th-TH") : "ทันที"} – ${
          voucher.end_date ? new Date(voucher.end_date).toLocaleDateString("th-TH") : "ไม่จำกัด"
        }`
      : "ไม่จำกัดระยะเวลา";

  // Theme styling definitions
  const themeStyles = {
    gold: {
      cardBg: "bg-gradient-to-br from-[#1c1813] via-[#2c2419] to-[#14110d] text-amber-50",
      border: "border border-amber-500/40",
      ticketBg: "bg-gradient-to-r from-amber-950/80 to-[#221a0f] border-amber-400/50",
      accentBadge: "bg-amber-400/20 text-amber-300 border-amber-400/30",
      pillTier: "bg-amber-500/15 border-amber-400/30 text-amber-200",
      goldText: "bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-300 bg-clip-text text-transparent",
      goldAccent: "text-amber-400",
      divider: "border-amber-500/20",
      logoBadge: "bg-amber-400/10 text-amber-300 border-amber-400/30",
    },
    terra: {
      cardBg: "bg-gradient-to-br from-[#0c1f17] via-[#132c22] to-[#0a1610] text-emerald-50",
      border: "border border-emerald-500/40",
      ticketBg: "bg-gradient-to-r from-emerald-950/80 to-[#0e241c] border-emerald-400/50",
      accentBadge: "bg-emerald-400/20 text-emerald-300 border-emerald-400/30",
      pillTier: "bg-emerald-500/15 border-emerald-400/30 text-emerald-200",
      goldText: "bg-gradient-to-r from-emerald-200 via-teal-100 to-emerald-300 bg-clip-text text-transparent",
      goldAccent: "text-emerald-400",
      divider: "border-emerald-500/20",
      logoBadge: "bg-emerald-400/10 text-emerald-300 border-emerald-400/30",
    },
    dark: {
      cardBg: "bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0b1120] text-slate-100",
      border: "border border-slate-700",
      ticketBg: "bg-slate-900/90 border-slate-600",
      accentBadge: "bg-slate-700 text-slate-200 border-slate-600",
      pillTier: "bg-slate-800 border-slate-700 text-slate-300",
      goldText: "bg-gradient-to-r from-slate-100 via-white to-slate-200 bg-clip-text text-transparent",
      goldAccent: "text-amber-400",
      divider: "border-slate-700",
      logoBadge: "bg-slate-800 text-slate-300 border-slate-700",
    },
  }[theme];

  return (
    <div
      className={`relative rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between ${themeStyles.cardBg} ${themeStyles.border} ${
        size === "compact" ? "p-4 min-h-[220px]" : size === "medium" ? "p-5 min-h-[260px]" : "p-6 sm:p-7 min-h-[300px]"
      }`}
    >
      {/* Decorative luxury background graphics */}
      <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-amber-500/10 blur-2xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 w-48 h-48 rounded-full bg-amber-400/5 blur-2xl pointer-events-none" />

      {/* Luxury Perforated Ticket Notches */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-slate-100 border border-slate-300 print:bg-white" />
      <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-5 h-5 rounded-full bg-slate-100 border border-slate-300 print:bg-white" />

      {/* TOP HEADER: Brand & Badge */}
      <div className="flex items-center justify-between gap-2 border-b pb-3.5 border-dashed border-amber-500/25">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-white/10 p-1 flex items-center justify-center border border-white/20">
            <img
              src="/logo.terra.home.png"
              alt="Logo"
              className="max-h-full max-w-full object-contain filter invert brightness-200"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          </div>
          <div>
            <div className="text-[11px] font-black tracking-widest uppercase text-amber-300">
              TERRA HOME & ZENSLAB
            </div>
            <div className="text-[9px] text-amber-200/70 tracking-wider uppercase font-semibold">
              EXCLUSIVE PRIVILEGE VOUCHER
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border flex items-center gap-1 ${themeStyles.accentBadge}`}
          >
            <Sparkles className="w-2.5 h-2.5" />
            <span>GIFT VOUCHER</span>
          </span>
        </div>
      </div>

      {/* MIDDLE BODY: Title, Discount Tiers, Scope */}
      <div className="py-4 flex-1 flex flex-col justify-center">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <span className="text-[10px] uppercase font-bold text-amber-300/80 tracking-wider block">
              {voucher.collection_name || "สิทธิประโยชน์ทั้งร้าน (GLOBAL)"}
            </span>
            <h3
              className={`font-black tracking-tight leading-tight mt-0.5 ${themeStyles.goldText} ${
                size === "compact" ? "text-base line-clamp-1" : "text-lg sm:text-xl"
              }`}
            >
              {voucher.title}
            </h3>

            {/* Discount Display */}
            {isTiered ? (
              <div className="mt-2 space-y-1.5">
                <div className="text-xs font-bold text-amber-300 flex items-center gap-1">
                  <span>ส่วนลดขั้นบันได (Tiered Discount):</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {voucher.tiers?.map((t, idx) => (
                    <span
                      key={idx}
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border ${themeStyles.pillTier}`}
                    >
                      ≥฿{Number(t.min_spend).toLocaleString()}:{" "}
                      <b className="ml-1 text-white">
                        {t.discount_type === "percentage"
                          ? `${t.discount_value}%`
                          : `฿${Number(t.discount_value).toLocaleString()}`}
                      </b>
                    </span>
                  ))}
                </div>
                {voucher.max_discount_amount && (
                  <span className="text-[10px] text-amber-200/60 block">
                    (ลดสูงสุด ฿{Number(voucher.max_discount_amount).toLocaleString()})
                  </span>
                )}
              </div>
            ) : (
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white drop-shadow-sm">
                  {isPercent
                    ? `${voucher.discount_value}% OFF`
                    : `฿${Number(voucher.discount_value).toLocaleString()} OFF`}
                </span>
                <span className="text-xs text-amber-200/70 font-medium">
                  {voucher.min_spend
                    ? `(เมื่อซื้อครบ ฿${Number(voucher.min_spend).toLocaleString()})`
                    : "(ไม่มีขั้นต่ำ)"}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Attribution (Sales & Partner info) */}
        {voucher.attribution && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5 pt-2 border-t border-amber-500/15 text-[10px]">
            {voucher.attribution.lead_sales && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/10 text-amber-200 font-semibold">
                <User className="w-2.5 h-2.5 text-amber-400" />
                <span>เซลส์: {voucher.attribution.lead_sales}</span>
              </span>
            )}
            {voucher.attribution.partner_company && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/10 text-amber-200 font-semibold">
                <Building2 className="w-2.5 h-2.5 text-amber-400" />
                <span>บริษัท: {voucher.attribution.partner_company}</span>
              </span>
            )}
            {voucher.attribution.partner_sales && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/10 text-amber-200 font-semibold">
                <span>คู่ค้า: {voucher.attribution.partner_sales}</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* BOTTOM STRIP: Tactile Ticket Code Box + QR Code */}
      <div
        className={`rounded-2xl border border-dashed p-3 flex items-center justify-between gap-3 ${themeStyles.ticketBg}`}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 text-[10px] text-amber-300 font-bold uppercase tracking-wider">
            <Ticket className="w-3.5 h-3.5 text-amber-400" />
            <span>รหัสคูปองสำหรับใช้สิทธิ์:</span>
          </div>
          <div className="font-mono text-base sm:text-xl font-black tracking-widest text-white mt-0.5 select-all truncate drop-shadow-sm">
            {code}
          </div>
          <div className="text-[9px] text-amber-200/60 mt-0.5 flex items-center gap-1">
            <Calendar className="w-2.5 h-2.5" />
            <span>ใช้ได้ถึง: {dateRange}</span>
          </div>
        </div>

        {/* QR Code Container */}
        <div className="shrink-0 flex items-center gap-2">
          {qrCodeUrl ? (
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white p-1 rounded-xl shadow-md border border-amber-300 flex items-center justify-center">
              <img
                src={qrCodeUrl}
                alt={`QR ${code}`}
                className="w-full h-full object-contain"
              />
            </div>
          ) : (
            <div className="w-14 h-14 bg-white/10 rounded-xl flex items-center justify-center text-[10px] text-slate-400">
              QR...
            </div>
          )}

          {/* Quick Copy Button (Hidden on Print) */}
          <button
            type="button"
            onClick={() => onCopy(code)}
            title="คัดลอกรหัส"
            className="w-8 h-8 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 flex items-center justify-center text-white transition active:scale-95 print:hidden cursor-pointer"
          >
            {copiedCode === code ? (
              <Check className="w-4 h-4 text-emerald-400" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
