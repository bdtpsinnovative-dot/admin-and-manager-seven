"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
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
  ChevronLeft,
  ChevronRight,
  Layers,
  Smartphone,
  Calendar,
  Building2,
  User,
  Loader2,
  Palette,
  CreditCard,
  Sparkles,
  Image as ImageIcon,
  QrCode as QrCodeIcon,
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
  collection_image?: string | null;
  image_url?: string | null;
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
type ViewMode = "sheet_a4" | "qr_stickers" | "single";
type SheetLayout = "duo_5_pairs" | "10_business_cards" | "8_business_cards" | "3_stacked" | "4_grid";
type SingleFormat = "duo_pair" | "business_card" | "qr_sticker";
type BrandLogoChoice = "dual" | "terra" | "zenslab";
type QrStickerSize = "1_inch" | "1.5_inch" | "2_inch";

function getStickerTargetCount(size: QrStickerSize): number {
  if (size === "1_inch") return 54; // 6 cols x 9 rows
  if (size === "1.5_inch") return 24; // 4 cols x 6 rows
  return 12; // 3 cols x 4 rows
}

function buildQrStickers(
  vouchers: VoucherItem[],
  size: QrStickerSize,
  autoFill: boolean
): VoucherItem[] {
  if (!vouchers || vouchers.length === 0) return [];
  if (!autoFill) return vouchers;

  const target = getStickerTargetCount(size);
  const result: VoucherItem[] = [];
  for (let i = 0; i < target; i++) {
    const v = vouchers[i % vouchers.length];
    result.push({
      ...v,
      id: `${v.id}_stk_${i}`,
    });
  }
  return result;
}

interface VoucherPairItem {
  left: VoucherItem;
  right: VoucherItem;
  id: string;
}

function buildVoucherPairs(vouchers: VoucherItem[], autoFill: boolean): VoucherPairItem[] {
  if (!vouchers || vouchers.length === 0) return [];
  const targetPairs = autoFill ? 5 : Math.max(1, Math.ceil(vouchers.length / 2));
  const pairs: VoucherPairItem[] = [];

  for (let i = 0; i < targetPairs; i++) {
    if (vouchers.length === 1) {
      pairs.push({
        left: vouchers[0],
        right: {
          ...vouchers[0],
          id: `${vouchers[0].id}_pair_${i}`,
        },
        id: `pair_${i}`,
      });
    } else {
      const leftIdx = (i * 2) % vouchers.length;
      const rightIdx = (i * 2 + 1) % vouchers.length;
      pairs.push({
        left: vouchers[leftIdx],
        right: vouchers[rightIdx],
        id: `pair_${i}_${vouchers[leftIdx].id}_${vouchers[rightIdx].id}`,
      });
    }
  }

  return pairs;
}

function getBrandLogoSrc(brand: BrandLogoChoice = "dual", theme: ThemeType = "ivory") {
  const isDark = theme !== "ivory";
  if (brand === "terra") {
    return isDark ? "/logo.terra.home.png" : "/logo.terra.home.dark.png";
  }
  if (brand === "zenslab") {
    return isDark ? "/logo.zenslab.light.png" : "/logo.zenslab.png";
  }
  // dual (Terra Home & ZenSlab)
  return isDark ? "/logo.dual.terra_first.light.png" : "/logo.dual.terra_first.dark.png";
}

function getCardPhotoUrl(
  voucher: VoucherItem,
  brandLogo: BrandLogoChoice = "dual",
  customImage?: string | null
): string {
  if (customImage) return customImage;
  const rawUrl = voucher.image_url || voucher.collection_image;
  if (rawUrl) {
    if (rawUrl.startsWith("http") || rawUrl.startsWith("data:") || rawUrl.startsWith("/")) {
      return rawUrl;
    }
    return `https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/${rawUrl}`;
  }
  // Fallback showcase image
  if (brandLogo === "zenslab") {
    return "/banner.zenslab.webp";
  }
  return "/banner.terrahome.webp";
}

export default function VoucherModal({ isOpen, onClose, vouchers }: VoucherModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>("sheet_a4");
  const [theme, setTheme] = useState<ThemeType>("ivory");
  const [brandChoice, setBrandChoice] = useState<BrandLogoChoice>("dual");
  const [sheetLayout, setSheetLayout] = useState<SheetLayout>("duo_5_pairs");
  const [singleFormat, setSingleFormat] = useState<SingleFormat>("duo_pair");
  const [qrStickerSize, setQrStickerSize] = useState<QrStickerSize>("1.5_inch");
  const [autoFillSheet, setAutoFillSheet] = useState(true);
  const [showPhoto, setShowPhoto] = useState(true);
  const [customImage, setCustomImage] = useState<string | null>(null);
  const [qrCodes, setQrCodes] = useState<Record<string, string>>({});
  const [isExporting, setIsExporting] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const singleVoucherRef = useRef<HTMLDivElement>(null);
  const sheetA4Ref = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === "string") {
        setCustomImage(event.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

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
            width: 320,
            margin: 1,
            color: {
              dark: "#0f172a",
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

  const duoPairs = useMemo(
    () => buildVoucherPairs(vouchers, autoFillSheet),
    [vouchers, autoFillSheet]
  );

  const qrStickers = useMemo(
    () => buildQrStickers(vouchers, qrStickerSize, autoFillSheet),
    [vouchers, qrStickerSize, autoFillSheet]
  );

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
        filter: (node) => {
          if (node instanceof HTMLElement) {
            if (
              node.classList.contains("print:hidden") ||
              node.classList.contains("no-export") ||
              node.classList.contains("no-print")
            ) {
              return false;
            }
          }
          return true;
        },
      });

      const fileName =
        singleFormat === "qr_sticker"
          ? `qr-sticker-${qrStickerSize}-${currentVoucher.coupon_code || "code"}.png`
          : singleFormat === "duo_pair"
          ? `voucher-duo-couple-${currentVoucher.coupon_code || "pair"}.png`
          : `voucher-card-${currentVoucher.coupon_code || "coupon"}.png`;

      // Mobile Web Share API with file support
      if (typeof navigator !== "undefined" && navigator.canShare) {
        try {
          const res = await fetch(dataUrl);
          const blob = await res.blob();
          const file = new File([blob], fileName, { type: "image/png" });

          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              title:
                singleFormat === "qr_sticker"
                  ? `สติกเกอร์ QR Code: ${currentVoucher.coupon_code}`
                  : singleFormat === "duo_pair"
                  ? `คูปองจับคู่สิทธิพิเศษ Terra Home & ZenSlab: ${currentVoucher.coupon_code}`
                  : `นามบัตรส่วนลด Terra Home: ${currentVoucher.coupon_code}`,
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
        filter: (node) => {
          if (node instanceof HTMLElement) {
            if (
              node.classList.contains("print:hidden") ||
              node.classList.contains("no-export") ||
              node.classList.contains("no-print")
            ) {
              return false;
            }
          }
          return true;
        },
      });

      const fileName =
        viewMode === "qr_stickers"
          ? `qr-stickers-${qrStickerSize}-A4-${new Date().toISOString().slice(0, 10)}.png`
          : `vouchers-A4-${sheetLayout}-${new Date().toISOString().slice(0, 10)}.png`;

      if (typeof navigator !== "undefined" && navigator.canShare) {
        try {
          const res = await fetch(dataUrl);
          const blob = await res.blob();
          const file = new File([blob], fileName, { type: "image/png" });

          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              title:
                viewMode === "qr_stickers"
                  ? `สติกเกอร์ QR Code A4 (${qrStickerSize === "1_inch" ? "1 นิ้ว" : qrStickerSize === "1.5_inch" ? "1.5 นิ้ว" : "2 นิ้ว"}) - Terra Home`
                  : "นามบัตรส่วนลดกระดาษ A4 - Terra Home",
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
    // 1. เลือก Element ที่จะพิมพ์ (ถ้าอยู่โหมด single ให้พิมพ์ใบเดี่ยว ถ้าอยู่ sheet_a4 ให้พิมพ์ทั้งแผ่น A4)
    const printElement =
      viewMode === "single"
        ? singleVoucherRef.current
        : sheetA4Ref.current || document.getElementById("voucher-print-area");

    if (!printElement) {
      window.print();
      return;
    }

    // 2. สร้าง Invisible Iframe สำหรับ Print โดยเฉพาะ (ป้องกันหน้าว่าง 7 แผ่น จาก CSS Next.js Layout)
    let iframe = document.getElementById("voucher-print-iframe") as HTMLIFrameElement | null;
    if (iframe) {
      iframe.remove();
    }
    iframe = document.createElement("iframe");
    iframe.id = "voucher-print-iframe";
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.style.visibility = "hidden";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }

    // 3. รวบรวม Stylesheets และฟอนต์ทั้งหมดจากหน้าเว็บปัจจุบัน
    let stylesHtml = "";
    document.querySelectorAll("link[rel='stylesheet'], style").forEach((el) => {
      stylesHtml += el.outerHTML;
    });

    const isSingle = viewMode === "single";
    const isDuoSingle = isSingle && singleFormat === "duo_pair";
    const isQrSingle = isSingle && singleFormat === "qr_sticker";
    const isQrStickers = viewMode === "qr_stickers";

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>พิมพ์นามบัตรส่วนลด Terra Home & ZenSlab</title>
          ${stylesHtml}
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800;900&family=Prompt:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&family=Space+Mono:wght@700&display=swap');

            @page {
              size: A4 portrait;
              margin: ${
                isSingle
                  ? isDuoSingle
                    ? "16mm auto"
                    : isQrSingle
                    ? "30mm auto"
                    : "25mm auto"
                  : isQrStickers
                  ? "8mm 8mm"
                  : "6mm 8mm"
              };
            }

            *, *::before, *::after {
              box-sizing: border-box !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }

            html, body {
              margin: 0 !important;
              padding: 0 !important;
              background-color: #ffffff !important;
              background: #ffffff !important;
              width: 100% !important;
              height: auto !important;
              min-height: 0 !important;
              overflow: visible !important;
            }

            .font-cinzel {
              font-family: 'Cinzel', serif, ui-serif !important;
            }
            .font-prompt {
              font-family: 'Prompt', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
            }
            .font-spacemono {
              font-family: 'Space Mono', ui-monospace, monospace !important;
            }

            .print-wrapper {
              width: 100% !important;
              max-width: ${
                isSingle
                  ? isDuoSingle
                    ? "190mm"
                    : isQrSingle
                    ? "80mm"
                    : "130mm"
                  : "210mm"
              } !important;
              margin: 0 auto !important;
              padding: 0 !important;
              background: #ffffff !important;
            }

            /* ลบกรอบและเงาหน้ากระดาษ preview ตอนพิมพ์จริง */
            .print-wrapper > div {
              box-shadow: none !important;
              border: none !important;
              margin: 0 auto !important;
            }

            .print\\:hidden, .no-print {
              display: none !important;
            }

            .break-inside-avoid {
              break-inside: avoid !important;
              page-break-inside: avoid !important;
            }
          </style>
        </head>
        <body>
          <div class="print-wrapper">
            ${printElement.outerHTML}
          </div>
          <script>
            window.onload = function() {
              const imgs = Array.from(document.images);
              const triggerPrint = function() {
                try {
                  window.focus();
                  window.print();
                } catch(e) {
                  console.error(e);
                }
              };

              if (imgs.length === 0) {
                setTimeout(triggerPrint, 250);
                return;
              }

              let loaded = 0;
              const checkAll = function() {
                loaded++;
                if (loaded >= imgs.length) {
                  setTimeout(triggerPrint, 250);
                }
              };

              imgs.forEach(function(img) {
                if (img.complete) {
                  checkAll();
                } else {
                  img.onload = checkAll;
                  img.onerror = checkAll;
                }
              });

              setTimeout(triggerPrint, 1500);
            };
          <\/script>
        </body>
      </html>
    `);
    doc.close();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static print:overflow-visible font-sans">
      {/* 🛑 Load Luxury Fonts & Print CSS */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800;900&family=Prompt:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&family=Space+Mono:wght@700&display=swap');

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
          html, body {
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
            background: #ffffff !important;
            background-color: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          body > *:not(#__next),
          nav, aside, header, footer {
            display: none !important;
          }

          .print\\:hidden, .no-print {
            display: none !important;
          }

          @page {
            size: A4 portrait;
            margin: 6mm 8mm;
          }

          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `,
        }}
      />

      <div
        className="bg-white rounded-2xl border border-stone-200/90 w-full max-w-5xl max-h-[92vh] flex flex-col shadow-xl overflow-hidden print:border-none print:shadow-none print:max-h-none print:w-full print:max-w-full print:overflow-visible print:p-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Minimalist, Human-Designed Luxury SaaS */}
        <div className="px-6 py-3.5 border-b border-stone-200 flex items-center justify-between bg-white shrink-0 print:hidden font-prompt">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-base font-bold text-stone-900 tracking-tight">
                พิมพ์นามบัตรและคูปองส่วนลด
              </h2>
              <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 text-xs font-mono font-medium">
                {vouchers.length} ใบ
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              ขนาดนามบัตรมาตรฐาน (9 × 5.4 ซม.) พิมพ์ลง A4 ได้ 10 ใบต่อแผ่น หรือส่งออกรูปสำหรับแจกลูกค้า
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition cursor-pointer"
            title="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar - Sleek Unified Segmented Controls (No Emojis / No Rainbow Clutter) */}
        <div className="px-6 py-2.5 bg-stone-50/90 border-b border-stone-200/80 flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden font-prompt text-xs">
          <div className="flex items-center gap-3 flex-wrap">
            {/* 1. View Mode Segmented Control */}
            <div className="inline-flex bg-stone-200/60 p-0.5 rounded-lg">
              <button
                type="button"
                onClick={() => setViewMode("sheet_a4")}
                className={`px-3 py-1.5 rounded-md transition cursor-pointer flex items-center gap-1.5 ${
                  viewMode === "sheet_a4"
                    ? "bg-white text-stone-900 font-semibold shadow-2xs"
                    : "text-stone-600 hover:text-stone-900 font-medium"
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-stone-600" />
                <span>แผ่นคูปอง A4</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("qr_stickers")}
                className={`px-3 py-1.5 rounded-md transition cursor-pointer flex items-center gap-1.5 ${
                  viewMode === "qr_stickers"
                    ? "bg-white text-stone-900 font-semibold shadow-2xs"
                    : "text-stone-600 hover:text-stone-900 font-medium"
                }`}
              >
                <QrCodeIcon className="w-3.5 h-3.5 text-amber-600" />
                <span>สติกเกอร์ QR Code</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("single")}
                className={`px-3 py-1.5 rounded-md transition cursor-pointer flex items-center gap-1.5 ${
                  viewMode === "single"
                    ? "bg-white text-stone-900 font-semibold shadow-2xs"
                    : "text-stone-600 hover:text-stone-900 font-medium"
                }`}
              >
                <Smartphone className="w-3.5 h-3.5 text-stone-600" />
                <span>รูปเดี่ยว (แชร์ LINE)</span>
              </button>
            </div>

            <div className="h-4 w-px bg-stone-300 hidden sm:block" />

            {/* 2. Brand Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-stone-500 font-medium hidden md:inline">แบรนด์:</span>
              <div className="inline-flex bg-stone-200/60 p-0.5 rounded-lg">
                <button
                  type="button"
                  onClick={() => setBrandChoice("dual")}
                  className={`px-2.5 py-1.5 rounded-md transition cursor-pointer ${
                    brandChoice === "dual"
                      ? "bg-white text-stone-900 font-semibold shadow-2xs"
                      : "text-stone-600 hover:text-stone-900 font-medium"
                  }`}
                >
                  Terra & Zen
                </button>
                <button
                  type="button"
                  onClick={() => setBrandChoice("zenslab")}
                  className={`px-2.5 py-1.5 rounded-md transition cursor-pointer ${
                    brandChoice === "zenslab"
                      ? "bg-white text-stone-900 font-semibold shadow-2xs"
                      : "text-stone-600 hover:text-stone-900 font-medium"
                  }`}
                >
                  ZenSlab
                </button>
                <button
                  type="button"
                  onClick={() => setBrandChoice("terra")}
                  className={`px-2.5 py-1.5 rounded-md transition cursor-pointer ${
                    brandChoice === "terra"
                      ? "bg-white text-stone-900 font-semibold shadow-2xs"
                      : "text-stone-600 hover:text-stone-900 font-medium"
                  }`}
                >
                  Terra Home
                </button>
              </div>
            </div>

            <div className="h-4 w-px bg-stone-300 hidden sm:block" />

            {/* 3. Paper Tone Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-stone-500 font-medium hidden md:inline">โทนสี:</span>
              <div className="inline-flex bg-stone-200/60 p-0.5 rounded-lg">
                <button
                  type="button"
                  onClick={() => setTheme("ivory")}
                  className={`px-2.5 py-1.5 rounded-md transition cursor-pointer flex items-center gap-1.5 ${
                    theme === "ivory"
                      ? "bg-white text-stone-900 font-semibold shadow-2xs"
                      : "text-stone-600 hover:text-stone-900 font-medium"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-[#E5D7C0] border border-[#B39977]" />
                  <span>งาช้าง</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTheme("obsidian")}
                  className={`px-2.5 py-1.5 rounded-md transition cursor-pointer flex items-center gap-1.5 ${
                    theme === "obsidian"
                      ? "bg-white text-stone-900 font-semibold shadow-2xs"
                      : "text-stone-600 hover:text-stone-900 font-medium"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-stone-900" />
                  <span>ชาร์โคล</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTheme("terra")}
                  className={`px-2.5 py-1.5 rounded-md transition cursor-pointer flex items-center gap-1.5 ${
                    theme === "terra"
                      ? "bg-white text-stone-900 font-semibold shadow-2xs"
                      : "text-stone-600 hover:text-stone-900 font-medium"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-[#27382E]" />
                  <span>โอลีฟ</span>
                </button>
              </div>
            </div>

            <div className="h-4 w-px bg-stone-300 hidden sm:block" />

            {/* 4. Photo Toggle & Upload (Hidden when viewing QR Stickers) */}
            {viewMode !== "qr_stickers" && (viewMode !== "single" || singleFormat !== "qr_sticker") && (
              <div className="flex items-center gap-1.5">
                <span className="text-stone-500 font-medium hidden md:inline">รูปสินค้า:</span>
                <div className="inline-flex bg-stone-200/60 p-0.5 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setShowPhoto(true)}
                    className={`px-2.5 py-1.5 rounded-md transition cursor-pointer ${
                      showPhoto
                        ? "bg-white text-stone-900 font-semibold shadow-2xs"
                        : "text-stone-600 hover:text-stone-900 font-medium"
                    }`}
                  >
                    แสดงรูป
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPhoto(false)}
                    className={`px-2.5 py-1.5 rounded-md transition cursor-pointer ${
                      !showPhoto
                        ? "bg-white text-stone-900 font-semibold shadow-2xs"
                        : "text-stone-600 hover:text-stone-900 font-medium"
                    }`}
                  >
                    ซ่อนรูป
                  </button>
                </div>

                {showPhoto && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-2.5 py-1.5 rounded-md bg-white hover:bg-stone-50 text-stone-700 font-medium text-xs transition cursor-pointer flex items-center gap-1 border border-stone-200 shadow-2xs"
                      title="คลิกเพื่ออัปโหลดรูปภาพสินค้าเองลงบนนามบัตร"
                    >
                      <ImageIcon className="w-3.5 h-3.5 text-stone-500" />
                      <span>เปลี่ยนรูป...</span>
                    </button>
                    {customImage && (
                      <button
                        type="button"
                        onClick={() => setCustomImage(null)}
                        className="text-stone-400 hover:text-rose-600 text-xs font-medium transition cursor-pointer px-1"
                        title="ล้างรูปที่อัปโหลด กลับไปใช้รูปตั้งต้น"
                      >
                        รีเซ็ต
                      </button>
                    )}
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            )}
          </div>

          {/* Right Controls: A4 Layout, QR Stickers, or Single Navigation */}
          <div className="flex items-center gap-2">
            {viewMode === "sheet_a4" && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-stone-500 font-medium hidden lg:inline">รูปแบบ A4:</span>
                <div className="inline-flex bg-stone-200/60 p-0.5 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setSheetLayout("duo_5_pairs")}
                    className={`px-2.5 py-1.5 rounded-md transition cursor-pointer flex items-center gap-1 ${
                      sheetLayout === "duo_5_pairs"
                        ? "bg-white text-stone-900 font-semibold shadow-2xs"
                        : "text-stone-600 hover:text-stone-900 font-medium"
                    }`}
                  >
                    <Ticket className="w-3.5 h-3.5 text-amber-600" />
                    <span>คูปองจับคู่ (5 คู่)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSheetLayout("10_business_cards")}
                    className={`px-2.5 py-1.5 rounded-md transition cursor-pointer ${
                      sheetLayout === "10_business_cards"
                        ? "bg-white text-stone-900 font-semibold shadow-2xs"
                        : "text-stone-600 hover:text-stone-900 font-medium"
                    }`}
                  >
                    10 ใบเดี่ยว
                  </button>
                  <button
                    type="button"
                    onClick={() => setSheetLayout("8_business_cards")}
                    className={`px-2.5 py-1.5 rounded-md transition cursor-pointer ${
                      sheetLayout === "8_business_cards"
                        ? "bg-white text-stone-900 font-semibold shadow-2xs"
                        : "text-stone-600 hover:text-stone-900 font-medium"
                    }`}
                  >
                    8 ใบ
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setAutoFillSheet(!autoFillSheet)}
                  className={`px-2.5 py-1.5 rounded-md transition text-xs cursor-pointer border ${
                    autoFillSheet
                      ? "bg-amber-50 border-amber-300 text-amber-900 font-semibold shadow-2xs"
                      : "bg-white border-stone-200 text-stone-600 hover:text-stone-900 font-medium"
                  }`}
                  title="เปิดเพื่อเติมคูปองให้เต็มแผ่น 5 คู่ (10 ใบ) บน A4 อัตโนมัติ ป้องกันพื้นที่ว่างโล่ง"
                >
                  {autoFillSheet ? "✓ เต็มแผ่น (5 คู่)" : "ตามที่เลือก"}
                </button>
              </div>
            )}

            {viewMode === "qr_stickers" && (
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="text-stone-500 font-medium hidden lg:inline">ขนาดสติกเกอร์:</span>
                  <div className="inline-flex bg-stone-200/60 p-0.5 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setQrStickerSize("1_inch")}
                      className={`px-2.5 py-1.5 rounded-md transition cursor-pointer ${
                        qrStickerSize === "1_inch"
                          ? "bg-white text-stone-900 font-semibold shadow-2xs"
                          : "text-stone-600 hover:text-stone-900 font-medium"
                      }`}
                      title="สี่เหลี่ยม 1 นิ้ว (2.54 × 2.54 ซม.) พิมพ์ได้ 54 ดวงต่อแผ่น A4"
                    >
                      1 นิ้ว (54 ดวง)
                    </button>
                    <button
                      type="button"
                      onClick={() => setQrStickerSize("1.5_inch")}
                      className={`px-2.5 py-1.5 rounded-md transition cursor-pointer ${
                        qrStickerSize === "1.5_inch"
                          ? "bg-white text-stone-900 font-semibold shadow-2xs"
                          : "text-stone-600 hover:text-stone-900 font-medium"
                      }`}
                      title="สี่เหลี่ยม 1.5 นิ้ว (3.81 × 3.81 ซม.) พิมพ์ได้ 24 ดวงต่อแผ่น A4"
                    >
                      1.5 นิ้ว (24 ดวง)
                    </button>
                    <button
                      type="button"
                      onClick={() => setQrStickerSize("2_inch")}
                      className={`px-2.5 py-1.5 rounded-md transition cursor-pointer ${
                        qrStickerSize === "2_inch"
                          ? "bg-white text-stone-900 font-semibold shadow-2xs"
                          : "text-stone-600 hover:text-stone-900 font-medium"
                      }`}
                      title="สี่เหลี่ยม 2 นิ้ว (5.08 × 5.08 ซม.) พิมพ์ได้ 12 ดวงต่อแผ่น A4"
                    >
                      2 นิ้ว (12 ดวง)
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setAutoFillSheet(!autoFillSheet)}
                  className={`px-2.5 py-1.5 rounded-md transition text-xs cursor-pointer border ${
                    autoFillSheet
                      ? "bg-amber-50 border-amber-300 text-amber-900 font-semibold shadow-2xs"
                      : "bg-white border-stone-200 text-stone-600 hover:text-stone-900 font-medium"
                  }`}
                  title="เปิดเพื่อพิมพ์สติกเกอร์ให้เต็มแผ่น A4 อัตโนมัติ"
                >
                  {autoFillSheet
                    ? `✓ เต็มแผ่น (${getStickerTargetCount(qrStickerSize)} ดวง)`
                    : `ตามที่เลือก (${vouchers.length} ดวง)`}
                </button>
              </div>
            )}

            {viewMode === "single" && (
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="text-stone-500 font-medium hidden md:inline">รูปแบบ:</span>
                  <div className="inline-flex bg-stone-200/60 p-0.5 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setSingleFormat("duo_pair")}
                      className={`px-2.5 py-1.5 rounded-md transition cursor-pointer flex items-center gap-1 ${
                        singleFormat === "duo_pair"
                          ? "bg-white text-stone-900 font-semibold shadow-2xs"
                          : "text-stone-600 hover:text-stone-900 font-medium"
                      }`}
                    >
                      <Ticket className="w-3.5 h-3.5 text-amber-600" />
                      <span>คูปองคู่ (Duo)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSingleFormat("business_card")}
                      className={`px-2.5 py-1.5 rounded-md transition cursor-pointer ${
                        singleFormat === "business_card"
                          ? "bg-white text-stone-900 font-semibold shadow-2xs"
                          : "text-stone-600 hover:text-stone-900 font-medium"
                      }`}
                    >
                      นามบัตร
                    </button>
                    <button
                      type="button"
                      onClick={() => setSingleFormat("qr_sticker")}
                      className={`px-2.5 py-1.5 rounded-md transition cursor-pointer flex items-center gap-1 ${
                        singleFormat === "qr_sticker"
                          ? "bg-white text-stone-900 font-semibold shadow-2xs"
                          : "text-stone-600 hover:text-stone-900 font-medium"
                      }`}
                    >
                      <QrCodeIcon className="w-3.5 h-3.5 text-amber-600" />
                      <span>สติกเกอร์ QR</span>
                    </button>
                  </div>
                </div>

                {singleFormat === "qr_sticker" && (
                  <div className="inline-flex bg-stone-200/60 p-0.5 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setQrStickerSize("1_inch")}
                      className={`px-2 py-1 rounded transition text-xs cursor-pointer ${
                        qrStickerSize === "1_inch"
                          ? "bg-white text-stone-900 font-semibold shadow-2xs"
                          : "text-stone-600 hover:text-stone-900 font-medium"
                      }`}
                    >
                      1 นิ้ว
                    </button>
                    <button
                      type="button"
                      onClick={() => setQrStickerSize("1.5_inch")}
                      className={`px-2 py-1 rounded transition text-xs cursor-pointer ${
                        qrStickerSize === "1.5_inch"
                          ? "bg-white text-stone-900 font-semibold shadow-2xs"
                          : "text-stone-600 hover:text-stone-900 font-medium"
                      }`}
                    >
                      1.5 นิ้ว
                    </button>
                    <button
                      type="button"
                      onClick={() => setQrStickerSize("2_inch")}
                      className={`px-2 py-1 rounded transition text-xs cursor-pointer ${
                        qrStickerSize === "2_inch"
                          ? "bg-white text-stone-900 font-semibold shadow-2xs"
                          : "text-stone-600 hover:text-stone-900 font-medium"
                      }`}
                    >
                      2 นิ้ว
                    </button>
                  </div>
                )}

                {vouchers.length > 1 && (
                  <div className="flex items-center gap-1.5 bg-stone-200/60 p-0.5 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                      disabled={currentIndex === 0}
                      className="w-6 h-6 rounded flex items-center justify-center text-stone-600 disabled:opacity-30 hover:bg-white transition cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-mono font-medium text-stone-700 px-1">
                      {currentIndex + 1} / {vouchers.length}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCurrentIndex((prev) => Math.min(vouchers.length - 1, prev + 1))}
                      disabled={currentIndex === vouchers.length - 1}
                      className="w-6 h-6 rounded flex items-center justify-center text-stone-600 disabled:opacity-30 hover:bg-white transition cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Main Canvas Preview */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-stone-100/80 flex flex-col items-center justify-start min-h-[440px] print:p-0 print:bg-white print:overflow-visible print:min-h-0 print:block">
          {/* ============================================================== */}
          {/* MODE 1: SINGLE VOUCHER (FOR MOBILE SCREEN / LINE DISTRIBUTION) */}
          {/* ============================================================== */}
          {viewMode === "single" && (
            <div className="w-full flex flex-col items-center gap-4">
              <div
                ref={singleVoucherRef}
                className={`transition-all duration-300 drop-shadow-lg flex justify-center items-center ${
                  singleFormat === "duo_pair"
                    ? "w-full max-w-[840px]"
                    : singleFormat === "qr_sticker"
                    ? "w-auto"
                    : "w-full max-w-[560px]"
                }`}
              >
                {singleFormat === "duo_pair" ? (
                  <DuoVoucherPair
                    voucherLeft={currentVoucher}
                    voucherRight={
                      vouchers.length > 1
                        ? vouchers[(currentIndex + 1) % vouchers.length]
                        : currentVoucher
                    }
                    qrCodeLeft={qrCodes[currentVoucher.coupon_code || String(currentVoucher.id)]}
                    qrCodeRight={
                      qrCodes[
                        (vouchers.length > 1
                          ? vouchers[(currentIndex + 1) % vouchers.length]
                          : currentVoucher
                        ).coupon_code ||
                          String(
                            (vouchers.length > 1
                              ? vouchers[(currentIndex + 1) % vouchers.length]
                              : currentVoucher
                            ).id
                          )
                      ]
                    }
                    theme={theme}
                    brandChoice={brandChoice}
                    showPhoto={showPhoto}
                    customImage={customImage}
                    onPhotoClick={() => fileInputRef.current?.click()}
                    copiedCode={copiedCode}
                    onCopy={copyCode}
                    size="business_card"
                  />
                ) : singleFormat === "qr_sticker" ? (
                  <QrSticker
                    voucher={currentVoucher}
                    qrCodeUrl={qrCodes[currentVoucher.coupon_code || String(currentVoucher.id)]}
                    size={qrStickerSize}
                    brandChoice={brandChoice}
                    theme={theme}
                    copiedCode={copiedCode}
                    onCopy={copyCode}
                  />
                ) : (
                  <VoucherCard
                    voucher={currentVoucher}
                    qrCodeUrl={qrCodes[currentVoucher.coupon_code || String(currentVoucher.id)]}
                    theme={theme}
                    brandLogo={brandChoice}
                    showPhoto={showPhoto}
                    customImage={customImage}
                    onPhotoClick={() => fileInputRef.current?.click()}
                    copiedCode={copiedCode}
                    onCopy={copyCode}
                    size="business_card"
                  />
                )}
              </div>

              <div className="text-center text-xs text-stone-500 font-prompt">
                {singleFormat === "duo_pair"
                  ? "คูปองจับคู่ 1 ชุด (2 ใบเชื่อมกัน มีรอยปรุฉีกตรงกลาง) บันทึกรูปเพื่อส่งแชร์เข้า LINE หรือสั่งพิมพ์ได้ทันที"
                  : singleFormat === "qr_sticker"
                  ? `สติกเกอร์ QR Code สี่เหลี่ยม ขนาด ${
                      qrStickerSize === "1_inch"
                        ? "1 นิ้ว (2.54 × 2.54 ซม.)"
                        : qrStickerSize === "1.5_inch"
                        ? "1.5 นิ้ว (3.81 × 3.81 ซม.)"
                        : "2 นิ้ว (5.08 × 5.08 ซม.)"
                    } พร้อมรหัสคูปองชัดเจนด้านล่าง บันทึกรูป PNG หรือพิมพ์ได้ทันที`
                  : "ขนาดนามบัตรมาตรฐาน (9 × 5.4 ซม.) พอดีกระเป๋าสตางค์"}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* MODE 2: QR CODE STICKERS SHEET (A4 1", 1.5", 2" SQUARES)       */}
          {/* ============================================================== */}
          {viewMode === "qr_stickers" && (
            <div id="voucher-print-area" className="w-full flex flex-col items-center">
              <div
                ref={sheetA4Ref}
                className="bg-white border border-stone-300 shadow-2xl mx-auto box-border print:border-none print:shadow-none"
                style={{
                  width: "100%",
                  maxWidth: "210mm",
                  minHeight: "297mm",
                  padding:
                    qrStickerSize === "1_inch"
                      ? "10mm 10mm"
                      : qrStickerSize === "1.5_inch"
                      ? "12mm 12mm"
                      : "15mm 12mm",
                  display: "grid",
                  gridTemplateColumns:
                    qrStickerSize === "1_inch"
                      ? "repeat(6, 25.4mm)"
                      : qrStickerSize === "1.5_inch"
                      ? "repeat(4, 38.1mm)"
                      : "repeat(3, 50.8mm)",
                  columnGap:
                    qrStickerSize === "1_inch"
                      ? "6mm"
                      : qrStickerSize === "1.5_inch"
                      ? "9mm"
                      : "14mm",
                  rowGap:
                    qrStickerSize === "1_inch"
                      ? "5mm"
                      : qrStickerSize === "1.5_inch"
                      ? "7mm"
                      : "14mm",
                  justifyContent: "center",
                  alignContent: "center",
                  backgroundColor: "#ffffff",
                }}
              >
                {qrStickers.map((v, idx) => (
                  <div key={v.id || idx} className="break-inside-avoid flex items-center justify-center">
                    <QrSticker
                      voucher={v}
                      qrCodeUrl={qrCodes[v.coupon_code || String(v.id)]}
                      size={qrStickerSize}
                      brandChoice={brandChoice}
                      theme={theme}
                      copiedCode={copiedCode}
                      onCopy={copyCode}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* MODE 3: A4 SHEET (MULTI-VOUCHER WITH SCISSOR CUT LINES)         */}
          {/* ============================================================== */}
          {viewMode === "sheet_a4" && (
            <div id="voucher-print-area" className="w-full flex flex-col items-center">
              <div
                ref={sheetA4Ref}
                className={`bg-white border border-stone-300 shadow-2xl mx-auto box-border ${
                  sheetLayout === "duo_5_pairs"
                    ? "w-full max-w-[794px] min-h-[1123px] flex flex-col gap-3.5 p-6"
                    : sheetLayout === "10_business_cards"
                    ? "w-full max-w-[794px] min-h-[1123px] grid grid-cols-2 gap-x-4 gap-y-3.5 p-6"
                    : sheetLayout === "8_business_cards"
                    ? "w-full max-w-[794px] min-h-[1123px] grid grid-cols-2 gap-x-5 gap-y-4 p-6"
                    : "w-full max-w-[794px] min-h-[1123px] grid grid-cols-2 gap-6 p-8"
                }`}
                style={{
                  width: "100%",
                  maxWidth: "210mm",
                  backgroundColor: "#ffffff",
                }}
              >
                {sheetLayout === "duo_5_pairs" ? (
                  duoPairs.map((pair, idx) => (
                    <div key={pair.id || idx} className="relative flex flex-col">
                      <DuoVoucherPair
                        voucherLeft={pair.left}
                        voucherRight={pair.right}
                        qrCodeLeft={qrCodes[pair.left.coupon_code || String(pair.left.id)]}
                        qrCodeRight={qrCodes[pair.right.coupon_code || String(pair.right.id)]}
                        theme={theme}
                        brandChoice={brandChoice}
                        showPhoto={showPhoto}
                        customImage={customImage}
                        onPhotoClick={() => fileInputRef.current?.click()}
                        copiedCode={copiedCode}
                        onCopy={copyCode}
                        size="business_card"
                      />

                      {idx < duoPairs.length - 1 && (
                        <div className="flex items-center justify-center my-1 opacity-50 hover:opacity-100 transition print:opacity-60">
                          <div className="w-full border-b border-dashed border-stone-400" />
                          <span className="flex items-center gap-1 text-[7.5px] font-prompt font-semibold text-stone-500 uppercase px-2 shrink-0">
                            <Scissors className="w-2.5 h-2.5" />
                            <span>ตัดตามรอยเพื่อแจกเป็นคู่ (DUO PAIR #{idx + 1})</span>
                          </span>
                          <div className="w-full border-b border-dashed border-stone-400" />
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  vouchers.map((v, idx) => (
                    <div key={v.id || idx} className="relative flex flex-col">
                      <VoucherCard
                        voucher={v}
                        qrCodeUrl={qrCodes[v.coupon_code || String(v.id)]}
                        theme={theme}
                        brandLogo={brandChoice}
                        showPhoto={showPhoto}
                        customImage={customImage}
                        onPhotoClick={() => fileInputRef.current?.click()}
                        copiedCode={copiedCode}
                        onCopy={copyCode}
                        size={
                          sheetLayout === "10_business_cards"
                            ? "business_card"
                            : sheetLayout === "8_business_cards"
                            ? "business_card_tall"
                            : "medium"
                        }
                      />

                      {/* Dotted Cut Guidelines */}
                      <div className="absolute -bottom-2 left-0 right-0 flex items-center justify-center opacity-40 hover:opacity-100 transition print:opacity-50">
                        <div className="w-full border-b border-dashed border-stone-400" />
                        <Scissors className="w-3 h-3 text-stone-500 mx-1 shrink-0 rotate-90" />
                        <div className="w-full border-b border-dashed border-stone-400" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Action Footer - Clean, Human-Designed & Practical */}
        <div className="px-6 py-3.5 bg-white border-t border-stone-200 flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden font-prompt">
          <div className="text-xs text-stone-500">
            {viewMode === "single" ? (
              singleFormat === "qr_sticker" ? (
                <span>
                  สติกเกอร์ QR Code ({qrStickerSize === "1_inch" ? "1 นิ้ว (2.54 × 2.54 ซม.)" : qrStickerSize === "1.5_inch" ? "1.5 นิ้ว (3.81 × 3.81 ซม.)" : "2 นิ้ว (5.08 × 5.08 ซม.)"}) • รหัส: {currentVoucher.coupon_code} ({currentIndex + 1}/{vouchers.length})
                </span>
              ) : singleFormat === "duo_pair" ? (
                <span>คูปองจับคู่ (Duo Paired) • Terra Home & ZenSlab</span>
              ) : (
                <span>
                  ใบที่ {currentIndex + 1} จาก {vouchers.length} ใบ
                </span>
              )
            ) : viewMode === "qr_stickers" ? (
              <span>
                แผ่นสติกเกอร์ QR Code A4 ขนาด {qrStickerSize === "1_inch" ? "1 นิ้ว (54 ดวง)" : qrStickerSize === "1.5_inch" ? "1.5 นิ้ว (24 ดวง)" : "2 นิ้ว (12 ดวง)"}
              </span>
            ) : (
              <span>
                กระดาษ A4 ({sheetLayout === "duo_5_pairs" ? "5 ชุดคูปองคู่ (10 ใบ)" : sheetLayout === "10_business_cards" ? "10 ใบนามบัตร" : "8 ใบ"})
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isExporting}
              onClick={viewMode === "single" ? handleSaveSingleImage : handleSaveSheetImage}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 font-medium text-xs transition active:scale-95 disabled:opacity-50 cursor-pointer shadow-2xs"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-stone-500" />
                  <span>กำลังส่งออก...</span>
                </>
              ) : (
                <>
                  <Smartphone className="w-3.5 h-3.5 text-stone-500" />
                  <span>บันทึกรูป (PNG)</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-stone-900 hover:bg-stone-800 text-white font-medium text-xs shadow-xs transition active:scale-95 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-stone-200" />
              <span>พิมพ์ A4 (EPSON / PDF)</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-stone-500 hover:text-stone-800 font-medium text-xs transition cursor-pointer"
            >
              ปิด
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// SUB-COMPONENT: LUXURY BUSINESS CARD VOUCHER TICKET
// =========================================================================
interface VoucherCardProps {
  voucher: VoucherItem;
  qrCodeUrl?: string;
  theme: ThemeType;
  brandLogo?: BrandLogoChoice;
  showPhoto?: boolean;
  customImage?: string | null;
  onPhotoClick?: () => void;
  copiedCode: string | null;
  onCopy: (code: string) => void;
  size?: "large" | "medium" | "compact" | "business_card" | "business_card_tall";
}

function VoucherCard({
  voucher,
  qrCodeUrl,
  theme,
  brandLogo = "dual",
  showPhoto = true,
  customImage = null,
  onPhotoClick,
  copiedCode,
  onCopy,
  size = "business_card",
}: VoucherCardProps) {
  const isPercent = voucher.discount_type === "percentage";
  const code = voucher.coupon_code || String(voucher.id);
  const isTiered = voucher.is_tiered && voucher.tiers && voucher.tiers.length > 0;
  const isBusinessCard = size === "business_card" || size === "business_card_tall";
  const photoUrl = showPhoto ? getCardPhotoUrl(voucher, brandLogo, customImage) : null;

  const dateRange =
    voucher.start_date || voucher.end_date
      ? `${voucher.start_date ? new Date(voucher.start_date).toLocaleDateString("th-TH") : "ทันที"} – ${
          voucher.end_date ? new Date(voucher.end_date).toLocaleDateString("th-TH") : "ไม่จำกัด"
        }`
      : "ไม่จำกัดระยะเวลา";

  // 100% Explicit High-Contrast Styling (ZERO reliance on dark: classes, ensuring crystal-clear text!)
  const styles = {
    ivory: {
      cardBg: "bg-[#FAF7F0]",
      border: "border-2 border-[#D4C3A3]",
      innerHairline: "border border-[#C9B591]/60",
      stubBg: "bg-[#F3ECE0]",
      notchColor: "bg-[#E7E3DC]",
      brandTitle: "text-[#111827]",
      brandSub: "text-[#854D0E]",
      privilegeBadge: "bg-[#EDE2CE] text-[#854D0E] border border-[#C9B591]",
      scopeLabel: "text-[#854D0E]",
      titleText: "text-[#0F172A]",
      tierLabel: "text-[#854D0E]",
      pillTier: "bg-[#FAF7F0] border border-[#C9B591] text-[#111827]",
      pillTierValue: "text-[#92400E]",
      maxDiscountText: "text-[#78716C]",
      discountBig: "text-[#0F172A]",
      discountSub: "text-[#57534E]",
      metaBorder: "border-[#C9B591]/40",
      metaIcon: "text-[#854D0E]",
      metaText: "text-[#1F2937]",
      metaSubText: "text-[#57534E]",
      stubHeader: "text-[#854D0E]",
      stubSub: "text-[#57534E]",
      qrBorder: "border border-[#D4C3A3] shadow-xs",
      codeLabel: "text-[#854D0E]",
      codeValue: "text-[#0F172A]",
      copyBtn: "bg-[#EDE2CE] text-[#334155] hover:bg-[#E2D4BC] border border-[#C9B591]",
    },
    obsidian: {
      cardBg: "bg-[#111215]",
      border: "border-2 border-[#C5A566]/70",
      innerHairline: "border border-[#C5A566]/30",
      stubBg: "bg-[#17181D]",
      notchColor: "bg-[#E7E3DC]",
      brandTitle: "text-[#FFFFFF]",
      brandSub: "text-[#DFBA73]",
      privilegeBadge: "bg-[#232019] text-[#DFBA73] border border-[#C5A566]/60",
      scopeLabel: "text-[#DFBA73]",
      titleText: "text-[#FFFFFF]",
      tierLabel: "text-[#DFBA73]",
      pillTier: "bg-[#202026] border border-[#443E33] text-[#E2E8F0]",
      pillTierValue: "text-[#FDE68A]",
      maxDiscountText: "text-[#94A3B8]",
      discountBig: "text-[#FFFFFF]",
      discountSub: "text-[#CBD5E1]",
      metaBorder: "border-[#33312B]",
      metaIcon: "text-[#DFBA73]",
      metaText: "text-[#F1F5F9]",
      metaSubText: "text-[#94A3B8]",
      stubHeader: "text-[#DFBA73]",
      stubSub: "text-[#94A3B8]",
      qrBorder: "border border-[#C5A566]/70 shadow-xs",
      codeLabel: "text-[#DFBA73]",
      codeValue: "text-[#FFFFFF]",
      copyBtn: "bg-[#25252D] text-[#E2E8F0] hover:bg-[#32323D] border border-[#443E33]",
    },
    terra: {
      cardBg: "bg-[#18231C]",
      border: "border-2 border-[#A39171]/70",
      innerHairline: "border border-[#A39171]/35",
      stubBg: "bg-[#131C16]",
      notchColor: "bg-[#E7E3DC]",
      brandTitle: "text-[#FFFFFF]",
      brandSub: "text-[#D8C7A5]",
      privilegeBadge: "bg-[#253228] text-[#D8C7A5] border border-[#A39171]/60",
      scopeLabel: "text-[#D8C7A5]",
      titleText: "text-[#FFFFFF]",
      tierLabel: "text-[#D8C7A5]",
      pillTier: "bg-[#212C24] border border-[#485346] text-[#E2E8F0]",
      pillTierValue: "text-[#FDE68A]",
      maxDiscountText: "text-[#94A3B8]",
      discountBig: "text-[#FFFFFF]",
      discountSub: "text-[#CBD5E1]",
      metaBorder: "border-[#2E3C32]",
      metaIcon: "text-[#D8C7A5]",
      metaText: "text-[#F1F5F9]",
      metaSubText: "text-[#94A3B8]",
      stubHeader: "text-[#D8C7A5]",
      stubSub: "text-[#94A3B8]",
      qrBorder: "border border-[#A39171]/70 shadow-xs",
      codeLabel: "text-[#D8C7A5]",
      codeValue: "text-[#FFFFFF]",
      copyBtn: "bg-[#233027] text-[#E2E8F0] hover:bg-[#2F3F34] border border-[#485346]",
    },
  }[theme];

  return (
    <div
      className={`relative rounded-xl overflow-hidden shadow-md flex flex-row ${styles.cardBg} ${styles.border} ${
        size === "business_card"
          ? "min-h-[155px] max-h-[168px]"
          : size === "business_card_tall"
          ? "min-h-[165px] max-h-[185px]"
          : size === "compact"
          ? "min-h-[175px]"
          : size === "medium"
          ? "min-h-[195px]"
          : "min-h-[250px]"
      }`}
    >
      {/* ============================================================== */}
      {/* LEFT SECTION: MAIN VOUCHER BODY                                */}
      {/* ============================================================== */}
      <div
        className={`flex-1 flex flex-col justify-between min-w-0 relative ${
          isBusinessCard ? "p-2.5 sm:p-3" : "p-3.5 sm:p-5"
        }`}
      >
        {/* Subtle Double Hairline Frame */}
        <div
          className={`absolute ${
            isBusinessCard ? "inset-1.5" : "inset-2 sm:inset-2.5"
          } rounded-lg pointer-events-none ${styles.innerHairline}`}
        />

        {/* Brand Header with Genuine Official Brand Logos */}
        <div className="flex items-center justify-between gap-1.5 z-10">
          <div className="flex items-center min-w-0">
            <img
              src={getBrandLogoSrc(brandLogo, theme)}
              alt={
                brandLogo === "terra"
                  ? "Terra Home Studio"
                  : brandLogo === "zenslab"
                  ? "ZenSlab"
                  : "Terra Home & ZenSlab"
              }
              className={`w-auto object-contain object-left ${
                isBusinessCard ? "h-4.5 sm:h-5 max-w-[145px]" : "h-6 sm:h-7.5 max-w-[220px]"
              }`}
            />
          </div>

          <span
            className={`font-cinzel ${
              isBusinessCard
                ? "text-[7px] sm:text-[8px] px-1.5 py-0.5"
                : "text-[9px] sm:text-[10px] px-2 py-0.5"
            } tracking-widest font-black rounded-xs uppercase shrink-0 ${styles.privilegeBadge}`}
          >
            VOUCHER
          </span>
        </div>

        {/* Center Offer / Discount Body with Product Photo */}
        <div className={`z-10 ${isBusinessCard ? "py-1 sm:py-1.5" : "py-2 sm:py-3"} flex items-center gap-2.5 sm:gap-3`}>
          {photoUrl && (
            <div
              onClick={onPhotoClick}
              title="คลิกเพื่อเปลี่ยนรูปภาพสินค้า"
              className={`relative shrink-0 rounded-lg overflow-hidden border border-[#C9B591]/50 shadow-xs cursor-pointer group bg-stone-100 ${
                isBusinessCard
                  ? "w-12 h-12 sm:w-14 sm:h-14"
                  : size === "compact"
                  ? "w-14 h-14 sm:w-16 sm:h-16"
                  : "w-16 h-16 sm:w-20 sm:h-20"
              }`}
            >
              <img
                src={photoUrl}
                alt={voucher.title}
                className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/banner.terrahome.webp";
                }}
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition flex items-center justify-center opacity-0 group-hover:opacity-100 print:hidden no-export">
                <ImageIcon className="w-3.5 h-3.5 text-white drop-shadow" />
              </div>
            </div>
          )}

          {/* Text Details: Scope, Title, Discount */}
          <div className="flex-1 min-w-0">
            <div
              className={`font-prompt ${
                isBusinessCard ? "text-[8px] sm:text-[9px]" : "text-[10px] sm:text-[11px]"
              } tracking-wider uppercase font-bold truncate ${styles.scopeLabel}`}
            >
              {voucher.collection_name || "สิทธิพิเศษทั้งร้าน (STOREWIDE)"}
            </div>

            {/* Title - Deep contrast, perfectly visible! */}
            <h3
              className={`font-prompt font-extrabold tracking-tight leading-snug mt-0.5 ${
                isBusinessCard
                  ? "text-xs sm:text-[12.5px] line-clamp-1"
                  : size === "compact"
                  ? "text-xs sm:text-sm line-clamp-1"
                  : size === "medium"
                  ? "text-sm sm:text-base line-clamp-1"
                  : "text-base sm:text-lg line-clamp-1"
              } ${styles.titleText}`}
            >
              {voucher.title}
            </h3>

            {/* Discount Presentation */}
            {isTiered ? (
              <div className={`${isBusinessCard ? "mt-0.5 space-y-0.5" : "mt-1.5 space-y-1"}`}>
                <div
                  className={`font-prompt ${
                    isBusinessCard ? "text-[8.5px] sm:text-[9.5px]" : "text-[10px] sm:text-[11px]"
                  } font-semibold flex items-center gap-1 flex-wrap`}
                >
                  <span className={`text-[8.5px] sm:text-[9.5px] font-bold ${styles.tierLabel}`}>
                    ส่วนลดขั้นบันได:
                  </span>
                  {voucher.tiers?.map((t, idx) => (
                    <span
                      key={idx}
                      className={`inline-flex items-center rounded-sm font-prompt font-semibold ${styles.pillTier} ${
                        isBusinessCard ? "px-1.5 py-0.2 text-[8px] sm:text-[8.5px]" : "px-2 py-0.5 text-[9px] sm:text-[10px]"
                      }`}
                    >
                      ครบ ฿{Number(t.min_spend).toLocaleString()}:{" "}
                      <b className={`ml-0.5 font-bold ${styles.pillTierValue}`}>
                        {t.discount_type === "percentage"
                          ? `${t.discount_value}%`
                          : `฿${Number(t.discount_value).toLocaleString()}`}
                      </b>
                    </span>
                  ))}
                </div>
                {voucher.max_discount_amount && (
                  <span
                    className={`font-prompt ${
                      isBusinessCard ? "text-[7.5px]" : "text-[8px] sm:text-[9px]"
                    } font-medium block ${styles.maxDiscountText}`}
                  >
                    (ลดสูงสุด ฿{Number(voucher.max_discount_amount).toLocaleString()})
                  </span>
                )}
              </div>
            ) : (
              <div className="mt-0.5 flex items-baseline gap-1.5">
                <span
                  className={`font-cinzel ${
                    isBusinessCard
                      ? "text-base sm:text-lg"
                      : size === "compact"
                      ? "text-xl sm:text-2xl"
                      : "text-2xl sm:text-3xl"
                  } font-black tracking-tight ${styles.discountBig}`}
                >
                  {isPercent
                    ? `${voucher.discount_value}% OFF`
                    : `฿${Number(voucher.discount_value).toLocaleString()} OFF`}
                </span>
                <span
                  className={`font-prompt ${
                    isBusinessCard ? "text-[8.5px]" : "text-[10px] sm:text-xs"
                  } font-medium ${styles.discountSub}`}
                >
                  {voucher.min_spend
                    ? `(เมื่อช้อปครบ ฿${Number(voucher.min_spend).toLocaleString()})`
                    : "(ไม่มีขั้นต่ำ)"}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Footer Meta: Attribution & Validity */}
        <div
          className={`border-t border-dashed z-10 flex flex-wrap items-center justify-between gap-1 font-prompt ${styles.metaBorder} ${
            isBusinessCard ? "pt-1 text-[8px] sm:text-[8.5px]" : "pt-1.5 sm:pt-2 text-[9px] sm:text-[10px]"
          }`}
        >
          <div className="flex items-center gap-1.5 flex-wrap">
            {voucher.attribution?.lead_sales && (
              <span className={`flex items-center gap-0.5 font-semibold ${styles.metaText}`}>
                <User className="w-2 h-2 text-[#854D0E]" />
                <span>เซลส์: {voucher.attribution.lead_sales}</span>
              </span>
            )}
            {voucher.attribution?.partner_company && (
              <span className={`flex items-center gap-0.5 font-medium ${styles.metaSubText}`}>
                <span>• {voucher.attribution.partner_company}</span>
              </span>
            )}
          </div>

          <div className={`flex items-center gap-0.5 font-medium ${styles.metaSubText}`}>
            <Calendar className="w-2 h-2 text-[#854D0E]" />
            <span>หมดเขต: {dateRange}</span>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* PERFORATED CUT NOTCHES (TOP & BOTTOM SEMI-CIRCLES)              */}
      {/* ============================================================== */}
      <div
        className={`w-3 -my-2 flex flex-col justify-between items-center relative z-20 ${styles.stubBg}`}
      >
        <div
          className={`w-3.5 h-3.5 rounded-full -mt-2 -ml-0.5 border border-stone-300 ${styles.notchColor} print:bg-white`}
        />
        <div className="h-full border-r-2 border-dashed border-stone-300/80 my-1" />
        <div
          className={`w-3.5 h-3.5 rounded-full -mb-2 -ml-0.5 border border-stone-300 ${styles.notchColor} print:bg-white`}
        />
      </div>

      {/* ============================================================== */}
      {/* RIGHT SECTION: STUB / QR CODE & COUPON CODE                    */}
      {/* ============================================================== */}
      <div
        className={`${
          isBusinessCard
            ? "w-24 sm:w-28 py-2.5 px-2"
            : size === "compact" || size === "medium"
            ? "w-28 sm:w-32 py-3 px-2 sm:px-2.5"
            : "w-40 sm:w-48 p-3 sm:p-4"
        } flex flex-col items-center justify-between text-center relative shrink-0 ${styles.stubBg}`}
      >
        {/* Top Header */}
        <div className="w-full shrink-0">
          <div
            className={`font-cinzel ${
              isBusinessCard ? "text-[7.5px] sm:text-[8px]" : "text-[9px] sm:text-[10px]"
            } tracking-[0.16em] uppercase font-black leading-tight ${styles.stubHeader}`}
          >
            SCAN CODE
          </div>
          <div
            className={`font-prompt ${
              isBusinessCard ? "text-[7px]" : "text-[8.5px] sm:text-[9px]"
            } font-medium leading-none mt-0.5 ${styles.stubSub}`}
          >
            สแกนรับสิทธิ์
          </div>
        </div>

        {/* QR Code */}
        <div className="my-auto flex items-center justify-center shrink-0">
          {qrCodeUrl ? (
            <div
              className={`${
                isBusinessCard
                  ? "w-14 h-14 p-0.5"
                  : size === "compact" || size === "medium"
                  ? "w-16 h-16 p-1"
                  : "w-20 h-20 sm:w-24 sm:h-24 p-1"
              } bg-white rounded-lg shadow-xs border ${styles.qrBorder} flex items-center justify-center`}
            >
              <img
                src={qrCodeUrl}
                alt={`QR ${code}`}
                className="w-full h-full object-contain"
              />
            </div>
          ) : (
            <div className="w-12 h-12 bg-stone-100 rounded-lg flex items-center justify-center text-[9px] text-stone-400 font-prompt">
              QR...
            </div>
          )}
        </div>

        {/* Voucher Code Box */}
        <div
          onClick={() => onCopy(code)}
          title="คลิกเพื่อคัดลอกรหัสคูปอง"
          className="w-full shrink-0 cursor-pointer group select-all"
        >
          <div
            className={`font-prompt ${
              isBusinessCard ? "text-[7.5px]" : "text-[8.5px]"
            } uppercase tracking-wider font-bold ${styles.codeLabel} flex items-center justify-center gap-0.5`}
          >
            <span>รหัสคูปอง</span>
            <Copy className="w-2 h-2 opacity-0 group-hover:opacity-100 transition print:hidden no-export" />
          </div>
          <div
            className={`font-spacemono ${
              isBusinessCard
                ? "text-[10px] sm:text-[11px] font-black leading-tight"
                : size === "compact" || size === "medium"
                ? "text-[11px] sm:text-xs font-bold"
                : "text-sm sm:text-base font-bold"
            } tracking-wider mt-0.5 truncate ${styles.codeValue}`}
          >
            {code}
          </div>
          {copiedCode === code && (
            <div className="text-[7.5px] font-prompt font-bold text-emerald-600 print:hidden no-export leading-none mt-0.5">
              ✓ คัดลอกแล้ว
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// SUB-COMPONENT: LUXURY DUO PAIRED VOUCHER (คูปองจับคู่)
// =========================================================================
interface DuoVoucherPairProps {
  voucherLeft: VoucherItem;
  voucherRight: VoucherItem;
  qrCodeLeft?: string;
  qrCodeRight?: string;
  theme: ThemeType;
  brandChoice: BrandLogoChoice;
  showPhoto?: boolean;
  customImage?: string | null;
  onPhotoClick?: () => void;
  copiedCode: string | null;
  onCopy: (code: string) => void;
  size?: "large" | "medium" | "compact" | "business_card" | "business_card_tall";
}

function DuoVoucherPair({
  voucherLeft,
  voucherRight,
  qrCodeLeft,
  qrCodeRight,
  theme,
  brandChoice,
  showPhoto = true,
  customImage = null,
  onPhotoClick,
  copiedCode,
  onCopy,
  size = "business_card",
}: DuoVoucherPairProps) {
  // If brandChoice is "dual", left is Terra Home, right is ZenSlab!
  const leftBrand = brandChoice === "dual" ? "terra" : brandChoice;
  const rightBrand = brandChoice === "dual" ? "zenslab" : brandChoice;

  return (
    <div className="relative flex flex-col w-full group">
      {/* Duo Header Badge Bar */}
      <div className="flex items-center justify-between px-3 py-1 mb-1 bg-stone-100 rounded-lg border border-stone-200 print:bg-transparent print:border-none print:px-1 print:py-0 print:mb-0.5">
        <div className="flex items-center gap-1.5 font-prompt text-[9px] sm:text-[9.5px] font-bold text-stone-800">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-600 print:hidden" />
          <span className="uppercase tracking-wider">คูปองจับคู่สิทธิพิเศษ (DUO PRIVILEGE COUPON)</span>
        </div>
        <div className="font-cinzel text-[8px] sm:text-[8.5px] font-black tracking-widest text-stone-500 uppercase">
          TERRA HOME & ZENSLAB
        </div>
      </div>

      {/* The 2 Joined Cards with Center Perforation */}
      <div className="relative flex items-stretch gap-0 rounded-xl p-1 bg-stone-100/70 border border-stone-300 shadow-xs print:bg-transparent print:border-none print:shadow-none print:p-0">
        {/* Left Voucher Card */}
        <div className="flex-1 min-w-0">
          <VoucherCard
            voucher={voucherLeft}
            qrCodeUrl={qrCodeLeft}
            theme={theme}
            brandLogo={leftBrand}
            showPhoto={showPhoto}
            customImage={customImage}
            onPhotoClick={onPhotoClick}
            copiedCode={copiedCode}
            onCopy={onCopy}
            size={size}
          />
        </div>

        {/* Center Perforation Spine */}
        <div className="w-6 -my-1 flex flex-col justify-between items-center relative z-20 shrink-0">
          <div className="w-4 h-4 rounded-full -mt-2 bg-stone-200 border border-stone-300 print:bg-white" />
          <div className="h-full border-r-2 border-dashed border-stone-400/90 my-1 flex items-center justify-center relative">
            <div className="absolute bg-[#FAF7F0] border border-[#C9B591] px-1.5 py-0.5 rounded-full text-[6.5px] font-prompt font-bold text-[#854D0E] uppercase tracking-wider whitespace-nowrap shadow-2xs rotate-90 print:bg-white">
              ✂ ฉีกแยกได้
            </div>
          </div>
          <div className="w-4 h-4 rounded-full -mb-2 bg-stone-200 border border-stone-300 print:bg-white" />
        </div>

        {/* Right Voucher Card */}
        <div className="flex-1 min-w-0">
          <VoucherCard
            voucher={voucherRight}
            qrCodeUrl={qrCodeRight}
            theme={theme}
            brandLogo={rightBrand}
            showPhoto={showPhoto}
            customImage={customImage}
            onPhotoClick={onPhotoClick}
            copiedCode={copiedCode}
            onCopy={onCopy}
            size={size}
          />
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// SUB-COMPONENT: SQUARE QR CODE STICKER (1", 1.5", 2" WITH COUPON CODE)
// =========================================================================
interface QrStickerProps {
  voucher: VoucherItem;
  qrCodeUrl?: string;
  size: QrStickerSize;
  brandChoice?: BrandLogoChoice;
  theme?: ThemeType;
  copiedCode?: string | null;
  onCopy?: (code: string) => void;
}

function QrSticker({
  voucher,
  qrCodeUrl,
  size,
  brandChoice = "dual",
  theme = "ivory",
  copiedCode,
  onCopy,
}: QrStickerProps) {
  const code = voucher.coupon_code || String(voucher.id);
  const isCopied = copiedCode === code;
  const isPercent = voucher.discount_type === "percentage";
  const discountText = voucher.discount_value
    ? isPercent
      ? `ลด ${voucher.discount_value}%`
      : `ลด ฿${Number(voucher.discount_value).toLocaleString()}`
    : "";

  const brandName =
    brandChoice === "zenslab"
      ? "ZENSLAB"
      : brandChoice === "terra"
      ? "TERRA HOME"
      : "TERRA & ZEN";

  // Visual Theme Config
  const themeStyles = {
    ivory: {
      cardBg: "bg-[#FAF7F0]",
      border: "border-[#C9B591]",
      brandText: "text-[#854D0E]",
      codeText: "text-[#0F172A]",
      discountBadge: "bg-[#EDE2CE] text-[#854D0E] border-[#C9B591]",
      qrWrapper: "bg-white border border-[#D4C3A3]/60",
      subText: "text-[#78716C]",
    },
    obsidian: {
      cardBg: "bg-[#111215]",
      border: "border-[#C5A566]/70",
      brandText: "text-[#DFBA73]",
      codeText: "text-[#FFFFFF]",
      discountBadge: "bg-[#232019] text-[#DFBA73] border-[#C5A566]/60",
      qrWrapper: "bg-white border border-stone-800",
      subText: "text-[#94A3B8]",
    },
    terra: {
      cardBg: "bg-[#F4F6F4]",
      border: "border-[#3D5A36]/60",
      brandText: "text-[#27382E]",
      codeText: "text-[#141F18]",
      discountBadge: "bg-[#E3EBE4] text-[#27382E] border-[#A3B899]",
      qrWrapper: "bg-white border border-[#A3B899]/60",
      subText: "text-[#4A6741]",
    },
  }[theme];

  // Dimensions & typography based on 1", 1.5", 2"
  const sizeConfig = {
    "1_inch": {
      widthMm: "25.4mm",
      heightMm: "25.4mm",
      padding: "p-[1.5mm]",
      brandClass: "text-[6px] font-cinzel font-black tracking-widest leading-none pt-0.5",
      qrSizeMm: "14.5mm",
      codeClass: "text-[7.5px] font-spacemono font-extrabold tracking-wider leading-none pb-0.5",
      showBadge: false,
      showSub: false,
    },
    "1.5_inch": {
      widthMm: "38.1mm",
      heightMm: "38.1mm",
      padding: "p-[2.2mm]",
      brandClass: "text-[8px] font-cinzel font-black tracking-widest leading-none pt-0.5",
      qrSizeMm: "22.5mm",
      codeClass: "text-[9.5px] font-spacemono font-black tracking-widest leading-none pb-0.5",
      showBadge: false,
      showSub: !!discountText,
    },
    "2_inch": {
      widthMm: "50.8mm",
      heightMm: "50.8mm",
      padding: "p-[3mm]",
      brandClass: "text-[9.5px] font-cinzel font-black tracking-widest leading-tight",
      qrSizeMm: "29mm",
      codeClass: "text-[12px] font-spacemono font-black tracking-widest leading-tight pb-0.5",
      showBadge: !!discountText,
      showSub: true,
    },
  }[size];

  return (
    <div
      onClick={() => onCopy?.(code)}
      title="คลิกเพื่อคัดลอกรหัสคูปอง"
      className={`group relative flex flex-col items-center justify-between box-border rounded-md border border-dashed cursor-pointer select-none transition-all active:scale-98 print:cursor-default print:border-solid print:shadow-none print:break-inside-avoid ${themeStyles.cardBg} ${themeStyles.border} ${sizeConfig.padding}`}
      style={{
        width: sizeConfig.widthMm,
        height: sizeConfig.heightMm,
        minWidth: sizeConfig.widthMm,
        minHeight: sizeConfig.heightMm,
        maxWidth: sizeConfig.widthMm,
        maxHeight: sizeConfig.heightMm,
        boxSizing: "border-box",
      }}
    >
      {/* Copied Flash Notification (Screen Only) */}
      {isCopied && (
        <div className="absolute inset-0 bg-stone-900/90 text-white flex flex-col items-center justify-center rounded-[inherit] z-30 print:hidden animate-in fade-in duration-150">
          <span className="text-[10px] font-prompt font-bold">คัดลอกแล้ว!</span>
          <span className="text-[7.5px] font-spacemono opacity-80">{code}</span>
        </div>
      )}

      {/* Top Header: Brand Name & Optional Discount Badge on 2" */}
      <div className="w-full flex items-center justify-between px-0.5 shrink-0 overflow-hidden">
        <span
          className={`truncate max-w-full uppercase text-center w-full ${themeStyles.brandText} ${sizeConfig.brandClass}`}
        >
          {brandName}
        </span>
        {sizeConfig.showBadge && discountText && (
          <span
            className={`hidden 2xl:inline-block px-1 py-0.2 text-[7.5px] font-prompt font-bold rounded-full border shrink-0 ${themeStyles.discountBadge}`}
          >
            {discountText}
          </span>
        )}
      </div>

      {/* Center: Square QR Code */}
      <div
        className={`flex items-center justify-center rounded-xs p-0.5 shrink-0 shadow-2xs ${themeStyles.qrWrapper}`}
        style={{
          width: sizeConfig.qrSizeMm,
          height: sizeConfig.qrSizeMm,
        }}
      >
        {qrCodeUrl ? (
          <img
            src={qrCodeUrl}
            alt={`QR Code: ${code}`}
            className="w-full h-full object-contain"
            style={{ imageRendering: "pixelated" }}
          />
        ) : (
          <div className="w-full h-full bg-stone-100 flex items-center justify-center text-[7px] text-stone-400 font-mono">
            QR
          </div>
        )}
      </div>

      {/* Bottom: Coupon Code + Optional Discount/Expiry */}
      <div className="w-full flex flex-col items-center justify-center shrink-0 px-0.5 leading-none overflow-hidden">
        <span
          className={`truncate max-w-full text-center ${themeStyles.codeText} ${sizeConfig.codeClass}`}
        >
          {code}
        </span>
        {sizeConfig.showSub && discountText && (
          <span
            className={`truncate max-w-full text-center font-prompt text-[7px] font-semibold mt-0.5 ${themeStyles.subText}`}
          >
            {discountText}
          </span>
        )}
      </div>
    </div>
  );
}
