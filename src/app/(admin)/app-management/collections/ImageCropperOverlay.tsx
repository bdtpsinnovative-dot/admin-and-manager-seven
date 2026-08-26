"use client";

import { useState, useRef } from "react";
import { Search, Loader2 } from "lucide-react";
import { CropBoxNormalized } from "@/actions/visual-search";

interface ImageCropperOverlayProps {
  imageUrl: string;
  onCropAndSearch: (imageUrl: string, cropBox?: CropBoxNormalized) => void;
  isSearching: boolean;
}

export default function ImageCropperOverlay({
  imageUrl,
  onCropAndSearch,
  isSearching,
}: ImageCropperOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [cropBox, setCropBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current || isSearching) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    setStartPos({ x, y });
    setCropBox({ x, y, width: 0, height: 0 });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || !startPos || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const currentX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const currentY = Math.max(0, Math.min(e.clientY - rect.top, rect.height));

    const x = Math.min(startPos.x, currentX);
    const y = Math.min(startPos.y, currentY);
    const width = Math.abs(currentX - startPos.x);
    const height = Math.abs(currentY - startPos.y);

    setCropBox({ x, y, width, height });
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    // ถ้ากรอบเล็กเกินไป ให้เคลียร์
    if (cropBox && (cropBox.width < 15 || cropBox.height < 15)) {
      setCropBox(null);
    }
  };

  const handleTriggerSearch = () => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    if (cropBox && cropBox.width >= 15 && cropBox.height >= 15) {
      const normCrop: CropBoxNormalized = {
        xPercent: cropBox.x / container.clientWidth,
        yPercent: cropBox.y / container.clientHeight,
        widthPercent: cropBox.width / container.clientWidth,
        heightPercent: cropBox.height / container.clientHeight,
      };
      onCropAndSearch(imageUrl, normCrop);
    } else {
      onCropAndSearch(imageUrl);
    }
  };

  const hasValidCrop = cropBox && cropBox.width >= 15 && cropBox.height >= 15;

  return (
    <div className="flex flex-col space-y-3 font-sans">
      {/* Helper Bar */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-0.5">
        <span>ลากกรอบสี่เหลี่ยมคลุมสินค้า หรือกดค้นหาจากทั้งภาพ</span>
        {cropBox && (
          <button
            type="button"
            onClick={() => setCropBox(null)}
            className="text-xs font-medium text-slate-700 hover:text-slate-900 underline"
          >
            ล้างกรอบ
          </button>
        )}
      </div>

      {/* Main Image Stage */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className="relative w-full max-h-[460px] rounded-xl overflow-hidden bg-slate-950 select-none cursor-crosshair border border-slate-200 flex items-center justify-center"
      >
        <img
          src={imageUrl}
          alt="Collection Look"
          className="max-h-[460px] w-auto object-contain pointer-events-none"
        />

        {/* Crisp White Crop Box with Dimmed Outside */}
        {hasValidCrop && (
          <div
            className="absolute border border-white bg-white/10 shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] pointer-events-none"
            style={{
              left: `${cropBox.x}px`,
              top: `${cropBox.y}px`,
              width: `${cropBox.width}px`,
              height: `${cropBox.height}px`,
            }}
          >
            {/* Corner Markers */}
            <div className="absolute -top-1 -left-1 h-2 w-2 bg-white border border-slate-900" />
            <div className="absolute -top-1 -right-1 h-2 w-2 bg-white border border-slate-900" />
            <div className="absolute -bottom-1 -left-1 h-2 w-2 bg-white border border-slate-900" />
            <div className="absolute -bottom-1 -right-1 h-2 w-2 bg-white border border-slate-900" />
          </div>
        )}

        {/* Searching Loading Overlay */}
        {isSearching && (
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-2xs flex flex-col items-center justify-center text-white z-20">
            <Loader2 className="h-6 w-6 animate-spin text-white mb-2" />
            <p className="text-xs font-medium text-slate-200">กำลังค้นหาภาพที่ใกล้เคียง...</p>
          </div>
        )}
      </div>

      {/* Action Footer under Image */}
      <div className="flex items-center justify-between pt-1">
        <span className="text-xs text-slate-500">
          {hasValidCrop ? "เลือกพื้นที่แล้ว" : "พร้อมค้นหา"}
        </span>

        <button
          type="button"
          onClick={handleTriggerSearch}
          disabled={isSearching}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800 active:scale-98 transition disabled:opacity-50"
        >
          {isSearching ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Search className="h-3.5 w-3.5" />
          )}
          {isSearching ? "กำลังค้นหา..." : hasValidCrop ? "ค้นหาเฉพาะจุดที่เลือก" : "ค้นหาจากทั้งภาพ"}
        </button>
      </div>
    </div>
  );
}
