"use client";

import React, { useState, useEffect, useRef } from "react";
import QRCode from "qrcode";
import { toPng } from "html-to-image";
import { saveAs } from "file-saver";
import {
  X,
  Printer,
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

type ThemeType = "ivory" | "obsidian" | "terra";
type ViewMode = "single" | "sheet_a4";
type SheetLayout = "4_per_page" | "6_per_page";

export default function VoucherModal({ isOpen, onClose, vouchers }: VoucherModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>("single");
  const [theme, setTheme] = useState<ThemeType>("ivory");
  const [sheetLayout, setSheetLayout] = useState<SheetLayout>("4_per_page");
  const [qrCodes, setQrCodes] = useState<Record<string, string>>({});
  const [isExporting, setIsExporting] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

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
            width: 280,
            margin: 1,
            color: {
              dark: "#1c1917",
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

  // Export Single Voucher as Image (Save to Mobile / Share to LINE)
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

      // Mobile Web Share API with file support
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
        }
      }

      // Fallback direct download
      saveAs(dataUrl, fileName);
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
        quality: 0.96,
        pixelRatio: 2,
        cacheBust: true,
      });

      const fileName = `vouchers-A4-${new Date().toISOString().slice(0, 10)}.png`;

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
    } catch (err) {
      console.error("Export error:", err);
      alert("ไม่สามารถสร้างรูปภาพได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static print:overflow-visible font-sans">
      {/* 🛑 Load Luxury Fonts & Print CSS */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700;800;900&family=Prompt:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=Space+Mono:wght@400;700&display=swap');

        .font-cinzel {
          font-family: 'Cinzel', serif, ui-serif;
        }
        .font-prompt {
          font-family: 'Prompt', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
        .font-spacemono {
          font-family: 'Space Mono', ui-monospace, SFMono-Regular, monospace;
        }

        @media print {
          body * {
            visibility: hidden !important;
          }
          #voucher-print-area, #voucher-print-area * {
            visibility: visible !important;
          }
          #voucher-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
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
        className="bg-white rounded-3xl border border-stone-200 w-full max-w-5xl max-h-[96vh] flex flex-col shadow-2xl overflow-hidden print:border-none print:shadow-none print:max-h-none print:w-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="px-5 py-4 border-b border-stone-200 flex flex-wrap items-center justify-between gap-3 bg-stone-900 text-stone-100 shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Ticket className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold font-prompt tracking-wide text-white">
                  ระบบจัดทำบัตรคูปองส่วนลด (Voucher Studio)
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold font-mono">
                  {vouchers.length} ใบ
                </span>
              </div>
              <p className="text-xs text-stone-400 font-prompt">
                ออกแบบบัตรกำนัลสไตล์ลักชัวรี เซฟเป็นรูปภาพส่ง LINE หรือสั่งพิมพ์ A4 แจกลูกค้าหน้าร้าน
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-800 hover:bg-stone-700 flex items-center justify-center text-stone-300 hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Toolbar: Switch View, Theme, Layout */}
        <div className="px-5 py-3 bg-stone-50 border-b border-stone-200 flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden font-prompt">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-stone-200/70 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setViewMode("single")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                viewMode === "single"
                  ? "bg-white text-stone-900 shadow-xs font-bold"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <Smartphone className="w-3.5 h-3.5 text-stone-700" />
              <span>บัตรเดี่ยว (ส่งมือถือ / LINE)</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("sheet_a4")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                viewMode === "sheet_a4"
                  ? "bg-white text-stone-900 shadow-xs font-bold"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-stone-700" />
              <span>กระดาษ A4 (รวมหลายใบ)</span>
            </button>
          </div>

          {/* Theme Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-stone-500 hidden sm:inline flex items-center gap-1">
              <Palette className="w-3.5 h-3.5" /> โทนสีบัตร:
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setTheme("ivory")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition border cursor-pointer ${
                  theme === "ivory"
                    ? "bg-[#FDFBF7] text-stone-900 border-amber-600/40 shadow-xs font-bold ring-1 ring-amber-600/20"
                    : "bg-white text-stone-600 border-stone-200 hover:bg-stone-100"
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-[#E5D7C0] border border-[#B39977]" />
                <span>ครีมงาช้าง (Ivory Sand)</span>
              </button>
              <button
                type="button"
                onClick={() => setTheme("obsidian")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition border cursor-pointer ${
                  theme === "obsidian"
                    ? "bg-stone-900 text-amber-200 border-stone-950 shadow-xs font-bold ring-1 ring-stone-700"
                    : "bg-white text-stone-600 border-stone-200 hover:bg-stone-100"
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-stone-950 border border-amber-500/50" />
                <span>ดำชาร์โคล (Obsidian Noir)</span>
              </button>
              <button
                type="button"
                onClick={() => setTheme("terra")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition border cursor-pointer ${
                  theme === "terra"
                    ? "bg-[#1E2822] text-[#E8E2D5] border-[#161E1A] shadow-xs font-bold"
                    : "bg-white text-stone-600 border-stone-200 hover:bg-stone-100"
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-[#27382E] border border-[#9E8B6E]" />
                <span>เขียวโอลีฟ (Wabi-Sabi)</span>
              </button>
            </div>
          </div>

          {/* Sheet Layout (if sheet_a4) */}
          {viewMode === "sheet_a4" && (
            <div className="flex items-center gap-1.5 bg-stone-200/70 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setSheetLayout("4_per_page")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  sheetLayout === "4_per_page"
                    ? "bg-white text-stone-900 shadow-xs font-bold"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                4 ใบ / แผ่น A4 (2×2)
              </button>
              <button
                type="button"
                onClick={() => setSheetLayout("6_per_page")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  sheetLayout === "6_per_page"
                    ? "bg-white text-stone-900 shadow-xs font-bold"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                6 ใบ / แผ่น A4 (2×3)
              </button>
            </div>
          )}

          {/* Pagination for Single View */}
          {viewMode === "single" && vouchers.length > 1 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                disabled={currentIndex === 0}
                className="w-7 h-7 rounded-lg bg-white border border-stone-200 flex items-center justify-center text-stone-600 disabled:opacity-30 hover:bg-stone-100 transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-mono font-bold text-stone-700">
                {currentIndex + 1} / {vouchers.length}
              </span>
              <button
                type="button"
                onClick={() => setCurrentIndex((prev) => Math.min(vouchers.length - 1, prev + 1))}
                disabled={currentIndex === vouchers.length - 1}
                className="w-7 h-7 rounded-lg bg-white border border-stone-200 flex items-center justify-center text-stone-600 disabled:opacity-30 hover:bg-stone-100 transition cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Main Preview Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-[#EFECE6] flex flex-col items-center justify-start min-h-[420px]">
          {/* ============================================================== */}
          {/* MODE 1: SINGLE VOUCHER (FOR MOBILE SCREEN / LINE DISTRIBUTION) */}
          {/* ============================================================== */}
          {viewMode === "single" && (
            <div className="w-full flex flex-col items-center gap-6">
              <div
                ref={singleVoucherRef}
                className="w-full max-w-[620px] transition-all duration-300 drop-shadow-2xl"
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

              {/* Mobile Guide */}
              <div className="text-center text-xs text-stone-600 max-w-sm font-prompt">
                ✨ <span className="font-semibold text-stone-900">แนะนำ:</span> กดปุ่ม{" "}
                <b className="text-stone-900">"บันทึกรูปเข้ามือถือ (LINE)"</b> ด้านล่าง เพื่อเซฟเป็นรูปภาพเข้าอัลบั้มรูป
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
                className={`bg-white border border-stone-300 shadow-2xl p-6 sm:p-8 mx-auto box-border ${
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
                    <div className="absolute -bottom-3 left-0 right-0 flex items-center justify-center opacity-40 hover:opacity-100 transition print:opacity-50">
                      <div className="w-full border-b border-dashed border-stone-400" />
                      <Scissors className="w-3.5 h-3.5 text-stone-500 mx-1 shrink-0 rotate-90" />
                      <div className="w-full border-b border-dashed border-stone-400" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Action Footer */}
        <div className="p-4 bg-white border-t border-stone-200 flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden font-prompt">
          <div className="text-xs text-stone-500">
            {viewMode === "single" ? (
              <span>
                กำลังดูคูปองใบที่ <b className="text-stone-900">{currentIndex + 1}</b> จากทั้งหมด{" "}
                <b className="text-stone-900">{vouchers.length}</b> ใบ
              </span>
            ) : (
              <span>
                จัดเรียงในหน้ากระดาษ A4 รวม <b className="text-stone-900">{vouchers.length}</b> ใบ
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Save to Mobile / Download Button */}
            <button
              type="button"
              disabled={isExporting}
              onClick={viewMode === "single" ? handleSaveSingleImage : handleSaveSheetImage}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-medium text-xs sm:text-sm shadow-md transition active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                  <span>กำลังสร้างรูปภาพ...</span>
                </>
              ) : (
                <>
                  <Smartphone className="w-4 h-4 text-amber-400" />
                  <span className="font-semibold">บันทึกรูปเข้ามือถือ (LINE)</span>
                </>
              )}
            </button>

            {/* Print A4 Paper / Save PDF */}
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-stone-300 bg-white hover:bg-stone-100 text-stone-800 font-semibold text-xs sm:text-sm shadow-xs transition active:scale-95 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-stone-600" />
              <span>พิมพ์กระดาษ A4 / บันทึก PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 font-medium text-xs sm:text-sm transition cursor-pointer"
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
// SUB-COMPONENT: LUXURY VOUCHER TICKET (TIMELESS STATIONERY DESIGN)
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

  const dateRange =
    voucher.start_date || voucher.end_date
      ? `${voucher.start_date ? new Date(voucher.start_date).toLocaleDateString("th-TH") : "ทันที"} – ${
          voucher.end_date ? new Date(voucher.end_date).toLocaleDateString("th-TH") : "ไม่จำกัด"
        }`
      : "ไม่จำกัดระยะเวลา";

  // Refined Color Schemes (Zero tacky gradients, pure high-end tactile stationery)
  const styles = {
    ivory: {
      cardBg: "bg-[#FDFBF7] text-[#1C1917]",
      border: "border border-[#D6C7AF]",
      innerHairline: "border border-[#E7DCCE]",
      stubBg: "bg-[#F5F0E6] text-[#1C1917]",
      perforateLine: "border-r-2 border-dashed border-[#D6C7AF]",
      notchColor: "bg-[#EFECE6]",
      goldAccent: "text-[#9E7D47]",
      goldBadge: "bg-[#F2ECE0] text-[#7A5B2B] border border-[#D6C7AF]",
      pillTier: "bg-[#F7F3EB] border border-[#DDD0BC] text-[#44403C]",
      subtleText: "text-[#78716C]",
      ruleLine: "border-[#E7DCCE]",
      qrBorder: "border-[#D6C7AF]",
      discountHighlight: "text-[#1C1917]",
    },
    obsidian: {
      cardBg: "bg-[#141416] text-[#F5F5F4]",
      border: "border border-[#38332B]",
      innerHairline: "border border-[#262420]",
      stubBg: "bg-[#1A1A1E] text-[#F5F5F4]",
      perforateLine: "border-r-2 border-dashed border-[#38332B]",
      notchColor: "bg-[#EFECE6]",
      goldAccent: "text-[#DFBA73]",
      goldBadge: "bg-[#25221B] text-[#DFBA73] border border-[#4D422E]",
      pillTier: "bg-[#1F1F24] border border-[#33312B] text-[#D6D3D1]",
      subtleText: "text-[#A8A29E]",
      ruleLine: "border-[#262420]",
      qrBorder: "border-[#38332B]",
      discountHighlight: "text-[#FFFFFF]",
    },
    terra: {
      cardBg: "bg-[#1E2822] text-[#F5F2EB]",
      border: "border border-[#38483D]",
      innerHairline: "border border-[#2B3830]",
      stubBg: "bg-[#18211C] text-[#F5F2EB]",
      perforateLine: "border-r-2 border-dashed border-[#38483D]",
      notchColor: "bg-[#EFECE6]",
      goldAccent: "text-[#C9B48F]",
      goldBadge: "bg-[#27352D] text-[#C9B48F] border border-[#4E5F53]",
      pillTier: "bg-[#243029] border border-[#38483D] text-[#D5CEBF]",
      subtleText: "text-[#9CA39B]",
      ruleLine: "border-[#2B3830]",
      qrBorder: "border-[#38483D]",
      discountHighlight: "text-[#FFFFFF]",
    },
  }[theme];

  return (
    <div
      className={`relative rounded-2xl overflow-hidden shadow-xl flex flex-row ${styles.cardBg} ${styles.border} ${
        size === "compact"
          ? "min-h-[190px]"
          : size === "medium"
          ? "min-h-[220px]"
          : "min-h-[250px]"
      }`}
    >
      {/* ============================================================== */}
      {/* LEFT SECTION: MAIN VOUCHER BODY                                */}
      {/* ============================================================== */}
      <div className="flex-1 p-4 sm:p-5 flex flex-col justify-between min-w-0 relative">
        {/* Subtle Double Hairline Frame */}
        <div
          className={`absolute inset-2 sm:inset-2.5 rounded-xl pointer-events-none ${styles.innerHairline}`}
        />

        {/* Brand Header */}
        <div className="flex items-center justify-between gap-2 z-10">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-stone-900/10 dark:bg-white/10 p-0.5 flex items-center justify-center shrink-0">
              <img
                src="/logo.terra.home.png"
                alt="Terra Home"
                className={`max-h-full max-w-full object-contain ${
                  theme !== "ivory" ? "filter invert brightness-200" : ""
                }`}
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            </div>
            <div>
              <div className="font-cinzel text-[11px] sm:text-xs font-bold tracking-[0.18em] uppercase leading-none">
                TERRA HOME & ZENSLAB
              </div>
              <div className="font-cinzel text-[8px] sm:text-[9px] tracking-[0.15em] text-[#9E7D47] uppercase mt-0.5">
                ARTISANAL LIVING & CRAFT
              </div>
            </div>
          </div>

          <span
            className={`font-cinzel text-[9px] sm:text-[10px] tracking-widest font-bold px-2 py-0.5 rounded-sm uppercase shrink-0 ${styles.goldBadge}`}
          >
            PRIVILEGE VOUCHER
          </span>
        </div>

        {/* Center Offer / Discount Body */}
        <div className="py-2.5 sm:py-3 z-10">
          <div className="font-prompt text-[10px] sm:text-[11px] tracking-wider uppercase font-semibold text-[#9E7D47] truncate">
            {voucher.collection_name || "สิทธิพิเศษสำหรับสินค้าทั้งร้าน (STOREWIDE PRIVILEGE)"}
          </div>

          {/* Title */}
          <h3
            className={`font-prompt font-semibold tracking-tight text-stone-900 dark:text-white leading-snug mt-0.5 ${
              size === "compact"
                ? "text-xs sm:text-sm line-clamp-1"
                : "text-sm sm:text-base line-clamp-1"
            } ${styles.discountHighlight}`}
          >
            {voucher.title}
          </h3>

          {/* Discount Presentation */}
          {isTiered ? (
            <div className="mt-2 space-y-1">
              <div className="font-prompt text-[11px] font-medium flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-bold text-[#9E7D47]">ส่วนลดขั้นบันได:</span>
                {voucher.tiers?.map((t, idx) => (
                  <span
                    key={idx}
                    className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-prompt font-medium ${styles.pillTier}`}
                  >
                    ครบ ฿{Number(t.min_spend).toLocaleString()}:{" "}
                    <b className="ml-1 text-stone-900 dark:text-white font-bold">
                      {t.discount_type === "percentage"
                        ? `${t.discount_value}%`
                        : `฿${Number(t.discount_value).toLocaleString()}`}
                    </b>
                  </span>
                ))}
              </div>
              {voucher.max_discount_amount && (
                <span className="font-prompt text-[9px] text-[#A8A29E] block">
                  (จำกัดส่วนลดสูงสุด ฿{Number(voucher.max_discount_amount).toLocaleString()})
                </span>
              )}
            </div>
          ) : (
            <div className="mt-1.5 flex items-baseline gap-2">
              <span
                className={`font-cinzel text-2xl sm:text-3xl font-extrabold tracking-tight ${styles.discountHighlight}`}
              >
                {isPercent
                  ? `${voucher.discount_value}% OFF`
                  : `฿${Number(voucher.discount_value).toLocaleString()} OFF`}
              </span>
              <span className="font-prompt text-xs font-normal text-stone-500">
                {voucher.min_spend
                  ? `(เมื่อช้อปครบ ฿${Number(voucher.min_spend).toLocaleString()})`
                  : "(ไม่มีขั้นต่ำ)"}
              </span>
            </div>
          )}
        </div>

        {/* Footer Meta: Attribution & Validity */}
        <div className="pt-2 border-t border-dashed z-10 flex flex-wrap items-center justify-between gap-1 text-[10px] font-prompt border-stone-300 dark:border-stone-800">
          <div className="flex items-center gap-2 flex-wrap">
            {voucher.attribution?.lead_sales && (
              <span className="flex items-center gap-1 font-medium">
                <User className="w-2.5 h-2.5 text-[#9E7D47]" />
                <span>เซลส์: {voucher.attribution.lead_sales}</span>
              </span>
            )}
            {voucher.attribution?.partner_company && (
              <span className="flex items-center gap-1 font-medium text-stone-500">
                <span>• บริษัท: {voucher.attribution.partner_company}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 text-[9px] text-stone-500">
            <Calendar className="w-2.5 h-2.5 text-[#9E7D47]" />
            <span>หมดเขต: {dateRange}</span>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* PERFORATED CUT NOTCHES (TOP & BOTTOM SEMI-CIRCLES)              */}
      {/* ============================================================== */}
      <div
        className={`w-3.5 -my-2 flex flex-col justify-between items-center relative z-20 ${styles.stubBg}`}
      >
        <div
          className={`w-4 h-4 rounded-full -mt-2 -ml-0.5 border border-stone-300 ${styles.notchColor} print:bg-white`}
        />
        <div className={`h-full border-r-2 border-dashed border-stone-300/80 my-1`} />
        <div
          className={`w-4 h-4 rounded-full -mb-2 -ml-0.5 border border-stone-300 ${styles.notchColor} print:bg-white`}
        />
      </div>

      {/* ============================================================== */}
      {/* RIGHT SECTION: STUB / QR CODE & COUPON CODE                    */}
      {/* ============================================================== */}
      <div
        className={`w-36 sm:w-44 p-3 sm:p-4 flex flex-col items-center justify-between text-center relative shrink-0 ${styles.stubBg}`}
      >
        {/* Top Header */}
        <div className="w-full">
          <div className="font-cinzel text-[8px] sm:text-[9px] tracking-[0.2em] uppercase font-bold text-[#9E7D47]">
            SCAN / REDEEM
          </div>
          <div className="font-prompt text-[9px] text-stone-500 leading-tight mt-0.5">
            สแกนเพื่อใช้สิทธิ์
          </div>
        </div>

        {/* QR Code */}
        <div className="my-1.5">
          {qrCodeUrl ? (
            <div
              className={`w-16 h-16 sm:w-20 sm:h-20 bg-white p-1 rounded-lg shadow-sm border ${styles.qrBorder} flex items-center justify-center`}
            >
              <img
                src={qrCodeUrl}
                alt={`QR ${code}`}
                className="w-full h-full object-contain"
              />
            </div>
          ) : (
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-stone-100 rounded-lg flex items-center justify-center text-[10px] text-stone-400 font-prompt">
              กำลังโหลด...
            </div>
          )}
        </div>

        {/* Voucher Code Box */}
        <div className="w-full">
          <div className="font-prompt text-[8px] text-stone-500 uppercase tracking-wider font-semibold">
            รหัสคูปอง
          </div>
          <div className="font-spacemono text-xs sm:text-sm font-bold tracking-wider text-stone-900 dark:text-white mt-0.5 select-all truncate">
            {code}
          </div>

          {/* Copy Button (Hidden on Print) */}
          <button
            type="button"
            onClick={() => onCopy(code)}
            className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-stone-200/60 dark:bg-white/10 hover:bg-stone-200 text-[9px] font-prompt font-semibold text-stone-700 dark:text-stone-300 transition active:scale-95 print:hidden cursor-pointer"
          >
            {copiedCode === code ? (
              <>
                <Check className="w-2.5 h-2.5 text-emerald-600" />
                <span className="text-emerald-700 font-bold">คัดลอกแล้ว</span>
              </>
            ) : (
              <>
                <Copy className="w-2.5 h-2.5" />
                <span>คัดลอกรหัส</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
