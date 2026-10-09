// src/components/gallery/ImageCropperModal.tsx
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  X, Crop, RotateCw, FlipHorizontal, 
  ZoomIn, ZoomOut, Check, RefreshCw, Sparkles, 
  Loader2, AlertCircle, ShieldCheck, Move
} from 'lucide-react';

export interface CropResult {
  blob: Blob;
  file: File;
  previewUrl: string;
}

interface ImageCropperModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  fileName?: string;
  title?: string;
  isReplacingExisting?: boolean;
  saveButtonText?: string;
  onSave: (result: CropResult) => Promise<void> | void;
}

type AspectRatioType = 'free' | '1:1' | '3:4' | '4:3' | '16:9' | 'original';

interface AspectOption {
  id: AspectRatioType;
  label: string;
  ratio: number | null; // width / height
  sub: string;
}

const ASPECT_OPTIONS: AspectOption[] = [
  { id: '1:1', label: '1:1 (จัตุรัส)', ratio: 1, sub: 'สี่เหลี่ยมจัตุรัส เหมาะกับแคตตาล็อก' },
  { id: '3:4', label: '3:4 (แนวตั้ง)', ratio: 3 / 4, sub: 'แนวตั้ง เหมาะกับมือถือ' },
  { id: '4:3', label: '4:3 (แนวนอน)', ratio: 4 / 3, sub: 'แนวนอนมาตรฐาน' },
  { id: '16:9', label: '16:9 (จอกว้าง)', ratio: 16 / 9, sub: 'จอกว้าง แบนเนอร์' },
  { id: 'free', label: 'อิสระ (Free)', ratio: null, sub: 'ลากปรับกรอบได้ตามใจชอบ' },
  { id: 'original', label: 'สัดส่วนเดิม', ratio: -1, sub: 'ตามอัตราส่วนของรูปภาพต้นฉบับ' },
];

export default function ImageCropperModal({
  isOpen,
  onClose,
  imageSrc,
  fileName = 'image.webp',
  title = 'ครอปและปรับแต่งรูปภาพ',
  isReplacingExisting = false,
  saveButtonText,
  onSave,
}: ImageCropperModalProps) {
  const [isLoadingImage, setIsLoadingImage] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isProcessingSave, setIsProcessingSave] = useState(false);

  // Source Image
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Canvas Viewport Ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Crop Controls
  const [aspect, setAspect] = useState<AspectRatioType>('1:1');
  const [rotation, setRotation] = useState<number>(0); // 0, 90, 180, 270
  const [flipH, setFlipH] = useState<boolean>(false);
  const [zoom, setZoom] = useState<number>(1); // 1.0 to 3.0
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Crop Box in canvas coordinate space: { x, y, w, h }
  const [cropBox, setCropBox] = useState<{ x: number; y: number; w: number; h: number }>({
    x: 0,
    y: 0,
    w: 280,
    h: 280,
  });

  // Canvas view dimensions (guaranteed generous size)
  const [viewSize, setViewSize] = useState({ width: 800, height: 480 });

  // Pointer interaction state
  const dragRef = useRef<{
    isDragging: boolean;
    mode: 'move-box' | 'resize-nw' | 'resize-ne' | 'resize-se' | 'resize-sw' | 'pan-image' | null;
    startX: number;
    startY: number;
    startBox: { x: number; y: number; w: number; h: number };
    startPan: { x: number; y: number };
  }>({
    isDragging: false,
    mode: null,
    startX: 0,
    startY: 0,
    startBox: { x: 0, y: 0, w: 280, h: 280 },
    startPan: { x: 0, y: 0 },
  });

  // 1. Load Image cleanly with proxy for CORS
  useEffect(() => {
    if (!isOpen || !imageSrc) return;

    setIsLoadingImage(true);
    setLoadError(null);
    setRotation(0);
    setFlipH(false);
    setZoom(1);
    setPan({ x: 0, y: 0 });

    const img = new Image();
    img.crossOrigin = 'anonymous';

    let loadUrl = imageSrc;
    if (imageSrc.startsWith('http://') || imageSrc.startsWith('https://')) {
      loadUrl = `/api/proxy-image?url=${encodeURIComponent(imageSrc)}`;
    }

    img.src = loadUrl;

    img.onload = () => {
      imgRef.current = img;
      setIsLoadingImage(false);
    };

    img.onerror = () => {
      if (loadUrl !== imageSrc) {
        const fallback = new Image();
        fallback.crossOrigin = 'anonymous';
        fallback.src = imageSrc;
        fallback.onload = () => {
          imgRef.current = fallback;
          setIsLoadingImage(false);
        };
        fallback.onerror = () => {
          setLoadError('ไม่สามารถโหลดรูปภาพเพื่อทำการครอปได้');
          setIsLoadingImage(false);
        };
      } else {
        setLoadError('ไม่สามารถโหลดรูปภาพเพื่อทำการครอปได้');
        setIsLoadingImage(false);
      }
    };

    return () => {
      imgRef.current = null;
    };
  }, [isOpen, imageSrc]);

  // 2. Measure viewport container using ResizeObserver with guaranteed minimum height
  useEffect(() => {
    if (!isOpen) return;

    const el = containerRef.current;
    if (!el) return;

    const updateSize = () => {
      const w = Math.max(el.clientWidth || 800, 320);
      const h = Math.max(el.clientHeight || 480, 420);
      setViewSize({ width: w, height: h });
    };

    updateSize();

    const ro = new ResizeObserver(() => updateSize());
    ro.observe(el);

    return () => ro.disconnect();
  }, [isOpen]);

  // Helper: Transformed image natural dimensions
  const getTransformedDimensions = useCallback(() => {
    const img = imgRef.current;
    if (!img) return { tWidth: 1, tHeight: 1 };
    const isRotated = rotation % 180 !== 0;
    return {
      tWidth: isRotated ? img.naturalHeight : img.naturalWidth,
      tHeight: isRotated ? img.naturalWidth : img.naturalHeight,
    };
  }, [rotation]);

  // Helper: Target aspect ratio ratio value
  const getTargetRatioValue = useCallback(
    (aspectType: AspectRatioType): number | null => {
      const opt = ASPECT_OPTIONS.find((o) => o.id === aspectType);
      if (!opt) return 1;
      if (opt.id === 'original') {
        const { tWidth, tHeight } = getTransformedDimensions();
        return tWidth / tHeight;
      }
      return opt.ratio;
    },
    [getTransformedDimensions]
  );

  // 3. Compute image placement metrics on canvas
  const getImageMetrics = useCallback(() => {
    const { tWidth, tHeight } = getTransformedDimensions();
    const canvasW = viewSize.width;
    const canvasH = viewSize.height;

    const padding = 40;
    const availW = Math.max(canvasW - padding * 2, 120);
    const availH = Math.max(canvasH - padding * 2, 120);

    const fitScale = Math.min(availW / tWidth, availH / tHeight);
    const scale = fitScale * zoom;

    const drawW = tWidth * scale;
    const drawH = tHeight * scale;

    const imgX = (canvasW - drawW) / 2 + pan.x;
    const imgY = (canvasH - drawH) / 2 + pan.y;

    return { canvasW, canvasH, tWidth, tHeight, scale, drawW, drawH, imgX, imgY };
  }, [viewSize, getTransformedDimensions, zoom, pan]);

  // 4. Initialize / Center Crop Box cleanly INSIDE the image
  const recenterCropBox = useCallback(
    (newAspect: AspectRatioType = aspect) => {
      const { canvasW, canvasH, drawW, drawH } = getImageMetrics();
      const targetRatio = getTargetRatioValue(newAspect);

      // Max allowed box size stays inside the visible image
      const maxAllowedW = drawW * 0.9;
      const maxAllowedH = drawH * 0.9;

      let boxW = maxAllowedW;
      let boxH = maxAllowedH;

      if (targetRatio !== null) {
        if (maxAllowedW / targetRatio <= maxAllowedH) {
          boxW = maxAllowedW;
          boxH = boxW / targetRatio;
        } else {
          boxH = maxAllowedH;
          boxW = boxH * targetRatio;
        }
      }

      boxW = Math.max(60, Math.round(boxW));
      boxH = Math.max(60, Math.round(boxH));

      // Centered on the canvas (where image center is)
      const boxX = Math.round((canvasW - boxW) / 2);
      const boxY = Math.round((canvasH - boxH) / 2);

      setCropBox({ x: boxX, y: boxY, w: boxW, h: boxH });
    },
    [aspect, getImageMetrics, getTargetRatioValue]
  );

  // Recenter when image is loaded or rotation changes
  useEffect(() => {
    if (!isLoadingImage && imgRef.current) {
      recenterCropBox(aspect);
    }
  }, [isLoadingImage, rotation, recenterCropBox, aspect]);

  // 5. Draw Canvas in real-time
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || isLoadingImage || !imgRef.current) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { canvasW, canvasH, drawW, drawH, imgX, imgY, tWidth, tHeight } = getImageMetrics();

    // Support High-DPI Retina screens
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    canvas.width = canvasW * dpr;
    canvas.height = canvasH * dpr;
    ctx.scale(dpr, dpr);

    // A. Background (Dark workspace with checkerboard)
    ctx.fillStyle = '#0f172a'; // slate-900
    ctx.fillRect(0, 0, canvasW, canvasH);

    const checkSize = 20;
    ctx.fillStyle = '#1e293b'; // slate-800
    for (let x = 0; x < canvasW; x += checkSize * 2) {
      for (let y = 0; y < canvasH; y += checkSize * 2) {
        ctx.fillRect(x, y, checkSize, checkSize);
        ctx.fillRect(x + checkSize, y + checkSize, checkSize, checkSize);
      }
    }

    // B. Draw Transformed Image
    const img = imgRef.current;
    ctx.save();
    ctx.translate(imgX + drawW / 2, imgY + drawH / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    if (flipH) ctx.scale(-1, 1);

    const origScale = drawW / tWidth;
    ctx.drawImage(
      img,
      (-img.naturalWidth * origScale) / 2,
      (-img.naturalHeight * origScale) / 2,
      img.naturalWidth * origScale,
      img.naturalHeight * origScale
    );
    ctx.restore();

    // Subtle photo border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(imgX, imgY, drawW, drawH);

    // C. Dark Shade Overlay outside Crop Box
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.62)';
    ctx.beginPath();
    ctx.rect(0, 0, canvasW, canvasH);
    ctx.rect(cropBox.x, cropBox.y, cropBox.w, cropBox.h);
    ctx.fill('evenodd');
    ctx.restore();

    // D. Crop Box White Border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(cropBox.x, cropBox.y, cropBox.w, cropBox.h);

    // E. Rule of Thirds Grid Lines inside Crop Box
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    // Vertical lines
    ctx.moveTo(cropBox.x + cropBox.w / 3, cropBox.y);
    ctx.lineTo(cropBox.x + cropBox.w / 3, cropBox.y + cropBox.h);
    ctx.moveTo(cropBox.x + (cropBox.w * 2) / 3, cropBox.y);
    ctx.lineTo(cropBox.x + (cropBox.w * 2) / 3, cropBox.y + cropBox.h);
    // Horizontal lines
    ctx.moveTo(cropBox.x, cropBox.y + cropBox.h / 3);
    ctx.lineTo(cropBox.x + cropBox.w, cropBox.y + cropBox.h / 3);
    ctx.moveTo(cropBox.x, cropBox.y + (cropBox.h * 2) / 3);
    ctx.lineTo(cropBox.x + cropBox.w, cropBox.y + (cropBox.h * 2) / 3);
    ctx.stroke();
    ctx.restore();

    // F. 4 Corner Handles (Purple circles with white border)
    const drawHandle = (hx: number, hy: number) => {
      ctx.save();
      ctx.beginPath();
      ctx.arc(hx, hy, 8, 0, Math.PI * 2);
      ctx.fillStyle = '#a855f7'; // purple-500
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.restore();
    };

    drawHandle(cropBox.x, cropBox.y); // NW
    drawHandle(cropBox.x + cropBox.w, cropBox.y); // NE
    drawHandle(cropBox.x, cropBox.y + cropBox.h); // SW
    drawHandle(cropBox.x + cropBox.w, cropBox.y + cropBox.h); // SE

    // G. Output Pixel Dimension Badge
    const outW = Math.max(1, Math.round((cropBox.w / drawW) * tWidth));
    const outH = Math.max(1, Math.round((cropBox.h / drawH) * tHeight));
    const badgeText = `${outW} × ${outH} px (${aspect})`;

    ctx.save();
    ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
    const textMetrics = ctx.measureText(badgeText);
    const badgeW = textMetrics.width + 18;
    const badgeH = 24;
    const badgeX = cropBox.x + 10;
    const badgeY = cropBox.y + cropBox.h - badgeH - 10;

    if (badgeY > cropBox.y + 12) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 6);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillText(badgeText, badgeX + 9, badgeY + 16);
    }
    ctx.restore();
  }, [
    viewSize,
    isLoadingImage,
    cropBox,
    rotation,
    flipH,
    zoom,
    pan,
    aspect,
    getImageMetrics,
  ]);

  // 6. Pointer Interaction Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    canvas.setPointerCapture(e.pointerId);

    // Hit test corner handles
    const handleRadius = 20;
    const nwDist = Math.hypot(clientX - cropBox.x, clientY - cropBox.y);
    const neDist = Math.hypot(clientX - (cropBox.x + cropBox.w), clientY - cropBox.y);
    const swDist = Math.hypot(clientX - cropBox.x, clientY - (cropBox.y + cropBox.h));
    const seDist = Math.hypot(clientX - (cropBox.x + cropBox.w), clientY - (cropBox.y + cropBox.h));

    let mode: 'move-box' | 'resize-nw' | 'resize-ne' | 'resize-se' | 'resize-sw' | 'pan-image' | null = null;

    if (nwDist <= handleRadius) mode = 'resize-nw';
    else if (neDist <= handleRadius) mode = 'resize-ne';
    else if (swDist <= handleRadius) mode = 'resize-sw';
    else if (seDist <= handleRadius) mode = 'resize-se';
    else if (
      clientX >= cropBox.x &&
      clientX <= cropBox.x + cropBox.w &&
      clientY >= cropBox.y &&
      clientY <= cropBox.y + cropBox.h
    ) {
      mode = 'move-box';
    } else {
      mode = 'pan-image';
    }

    dragRef.current = {
      isDragging: true,
      mode,
      startX: clientX,
      startY: clientY,
      startBox: { ...cropBox },
      startPan: { ...pan },
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    if (!dragRef.current.isDragging) {
      const handleRadius = 20;
      const nwDist = Math.hypot(clientX - cropBox.x, clientY - cropBox.y);
      const neDist = Math.hypot(clientX - (cropBox.x + cropBox.w), clientY - cropBox.y);
      const swDist = Math.hypot(clientX - cropBox.x, clientY - (cropBox.y + cropBox.h));
      const seDist = Math.hypot(clientX - (cropBox.x + cropBox.w), clientY - (cropBox.y + cropBox.h));

      if (nwDist <= handleRadius || seDist <= handleRadius) canvas.style.cursor = 'nwse-resize';
      else if (neDist <= handleRadius || swDist <= handleRadius) canvas.style.cursor = 'nesw-resize';
      else if (
        clientX >= cropBox.x &&
        clientX <= cropBox.x + cropBox.w &&
        clientY >= cropBox.y &&
        clientY <= cropBox.y + cropBox.h
      ) {
        canvas.style.cursor = 'move';
      } else {
        canvas.style.cursor = 'grab';
      }
      return;
    }

    const { mode, startX, startY, startBox, startPan } = dragRef.current;
    const deltaX = clientX - startX;
    const deltaY = clientY - startY;

    if (mode === 'pan-image') {
      setPan({ x: startPan.x + deltaX, y: startPan.y + deltaY });
      return;
    }

    if (mode === 'move-box') {
      const newX = Math.max(0, Math.min(startBox.x + deltaX, viewSize.width - startBox.w));
      const newY = Math.max(0, Math.min(startBox.y + deltaY, viewSize.height - startBox.h));
      setCropBox((prev) => ({ ...prev, x: Math.round(newX), y: Math.round(newY) }));
      return;
    }

    // Corner Resizing
    const targetRatio = getTargetRatioValue(aspect);
    const minSize = 50;

    let { x, y, w, h } = { ...startBox };

    if (mode === 'resize-se') {
      w = Math.max(minSize, startBox.w + deltaX);
      if (targetRatio !== null) {
        h = w / targetRatio;
      } else {
        h = Math.max(minSize, startBox.h + deltaY);
      }
    } else if (mode === 'resize-sw') {
      w = Math.max(minSize, startBox.w - deltaX);
      x = startBox.x + (startBox.w - w);
      if (targetRatio !== null) {
        h = w / targetRatio;
      } else {
        h = Math.max(minSize, startBox.h + deltaY);
      }
    } else if (mode === 'resize-ne') {
      w = Math.max(minSize, startBox.w + deltaX);
      if (targetRatio !== null) {
        const newH = w / targetRatio;
        y = startBox.y + (startBox.h - newH);
        h = newH;
      } else {
        h = Math.max(minSize, startBox.h - deltaY);
        y = startBox.y + (startBox.h - h);
      }
    } else if (mode === 'resize-nw') {
      w = Math.max(minSize, startBox.w - deltaX);
      x = startBox.x + (startBox.w - w);
      if (targetRatio !== null) {
        const newH = w / targetRatio;
        y = startBox.y + (startBox.h - newH);
        h = newH;
      } else {
        h = Math.max(minSize, startBox.h - deltaY);
        y = startBox.y + (startBox.h - h);
      }
    }

    // Keep within view bounds
    if (x < 0) {
      w += x;
      x = 0;
      if (targetRatio !== null) h = w / targetRatio;
    }
    if (y < 0) {
      h += y;
      y = 0;
      if (targetRatio !== null) w = h * targetRatio;
    }
    if (x + w > viewSize.width) {
      w = viewSize.width - x;
      if (targetRatio !== null) h = w / targetRatio;
    }
    if (y + h > viewSize.height) {
      h = viewSize.height - y;
      if (targetRatio !== null) w = h * targetRatio;
    }

    setCropBox({ x: Math.round(x), y: Math.round(y), w: Math.max(minSize, Math.round(w)), h: Math.max(minSize, Math.round(h)) });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (dragRef.current.isDragging) {
      dragRef.current.isDragging = false;
      dragRef.current.mode = null;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomDelta = e.deltaY < 0 ? 0.1 : -0.1;
    setZoom((z) => Math.max(1, Math.min(3, +(z + zoomDelta).toFixed(2))));
  };

  // 7. Aspect Ratio change handler
  const handleSelectAspect = (newAspect: AspectRatioType) => {
    setAspect(newAspect);
    recenterCropBox(newAspect);
  };

  // 8. Export Cropped WebP (< 1MB)
  const handleSaveCrop = async () => {
    const img = imgRef.current;
    if (!img) return;

    setIsProcessingSave(true);
    try {
      const { tWidth, tHeight, drawW, drawH, imgX, imgY } = getImageMetrics();

      // 1. Create transformed native canvas (rotated and flipped)
      const tCanvas = document.createElement('canvas');
      tCanvas.width = tWidth;
      tCanvas.height = tHeight;
      const tCtx = tCanvas.getContext('2d');
      if (!tCtx) throw new Error('Cannot create 2d context');

      tCtx.save();
      tCtx.translate(tWidth / 2, tHeight / 2);
      tCtx.rotate((rotation * Math.PI) / 180);
      if (flipH) tCtx.scale(-1, 1);
      tCtx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
      tCtx.restore();

      // 2. Map crop box to transformed image coordinates
      const relX = (cropBox.x - imgX) / drawW;
      const relY = (cropBox.y - imgY) / drawH;
      const relW = cropBox.w / drawW;
      const relH = cropBox.h / drawH;

      const srcX = Math.max(0, Math.round(relX * tWidth));
      const srcY = Math.max(0, Math.round(relY * tHeight));
      const srcW = Math.min(tWidth - srcX, Math.round(relW * tWidth));
      const srcH = Math.min(tHeight - srcY, Math.round(relH * tHeight));

      if (srcW <= 0 || srcH <= 0) {
        throw new Error('พิกัดการตัดภาพไม่ถูกต้อง กรุณาเลื่อนกรอบตัดให้อยู่ในขอบเขตภาพ');
      }

      // 3. Draw cropped slice onto final output canvas
      const outputCanvas = document.createElement('canvas');
      outputCanvas.width = srcW;
      outputCanvas.height = srcH;
      const outCtx = outputCanvas.getContext('2d');
      if (!outCtx) throw new Error('Cannot create output context');

      outCtx.drawImage(tCanvas, srcX, srcY, srcW, srcH, 0, 0, srcW, srcH);

      // 4. Convert to WebP and ensure file size < 1MB
      const getBlob = (quality: number): Promise<Blob> =>
        new Promise((resolve, reject) => {
          outputCanvas.toBlob(
            (b) => (b ? resolve(b) : reject(new Error('Export WebP failed'))),
            'image/webp',
            quality
          );
        });

      let quality = 0.9;
      let blob = await getBlob(quality);
      while (blob.size > 1024 * 1024 && quality > 0.35) {
        quality -= 0.1;
        blob = await getBlob(quality);
      }

      const cleanFileName = fileName.replace(/\.[^/.]+$/, '') + '.webp';
      const file = new File([blob], cleanFileName, { type: 'image/webp' });
      const previewUrl = URL.createObjectURL(blob);

      await onSave({ blob, file, previewUrl });
      onClose();
    } catch (err: any) {
      console.error('Crop save error:', err);
      alert('เกิดข้อผิดพลาดในการบันทึกรูป: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsProcessingSave(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl h-[88vh] max-h-[850px] min-h-[580px] overflow-hidden flex flex-col border border-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/90 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shadow-xs">
              <Crop size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm md:text-base flex items-center gap-2">
                {title}
                {isReplacingExisting && (
                  <span className="text-[11px] font-black uppercase px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md border border-emerald-200 flex items-center gap-1 shadow-2xs">
                    <ShieldCheck size={12} className="text-emerald-600" />
                    URL เดิมไม่เปลี่ยน
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400 truncate max-w-xs md:max-w-md">
                ไฟล์: {fileName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessingSave}
            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Aspect Ratio Selector Bar */}
        <div className="px-6 py-2.5 bg-slate-100/80 border-b border-slate-200/80 flex items-center gap-2 overflow-x-auto shrink-0 scrollbar-none">
          <span className="text-xs font-bold text-slate-500 shrink-0 mr-1 flex items-center gap-1">
            <Sparkles size={14} className="text-purple-600" />
            เลือกสัดส่วนภาพ:
          </span>
          {ASPECT_OPTIONS.map((opt) => {
            const isSelected = aspect === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleSelectAspect(opt.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/30 ring-2 ring-purple-600/20'
                    : 'bg-white text-slate-700 hover:bg-slate-200/70 border border-slate-200'
                }`}
                title={opt.sub}
              >
                <span>{opt.label}</span>
                {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
              </button>
            );
          })}
        </div>

        {/* Interactive Canvas Viewport (Guaranteed Spacious Height) */}
        <div 
          ref={containerRef}
          style={{ minHeight: '420px', flex: '1 1 420px' }}
          className="w-full bg-slate-950 relative overflow-hidden flex items-center justify-center select-none"
        >
          {isLoadingImage ? (
            <div className="flex flex-col items-center gap-3 text-slate-400">
              <Loader2 size={32} className="animate-spin text-purple-400" />
              <span className="text-xs font-medium">กำลังเตรียมรูปภาพสำหรับครอป...</span>
            </div>
          ) : loadError ? (
            <div className="flex flex-col items-center gap-3 text-red-400 p-6 text-center">
              <AlertCircle size={36} />
              <span className="text-sm font-semibold">{loadError}</span>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs mt-2"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          ) : (
            <canvas
              ref={canvasRef}
              style={{
                width: `${viewSize.width}px`,
                height: `${viewSize.height}px`,
              }}
              className="block touch-none"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onWheel={handleWheel}
            />
          )}

          {/* Quick Guide Overlay */}
          {!isLoadingImage && !loadError && (
            <div className="absolute top-3 left-4 bg-black/70 backdrop-blur-md text-white text-xs px-3.5 py-1.5 rounded-xl flex items-center gap-2 pointer-events-none border border-white/15 shadow-md">
              <Move size={13} className="text-purple-400" />
              <span>ลากกรอบสีขาวเพื่อย้ายตำแหน่ง • ลากจุดมุมสีม่วงเพื่อปรับขนาด • กลิ้งเมาส์เพื่อซูม</span>
            </div>
          )}
        </div>

        {/* Tools and Action Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4 shrink-0">
          
          {/* Zoom and Transform Controls */}
          <div className="flex items-center flex-wrap gap-2.5 w-full md:w-auto">
            {/* Zoom Controls */}
            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(1, +(z - 0.1).toFixed(2)))}
                className="p-1 text-slate-500 hover:text-slate-800 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
                title="ซูมออก (-)"
              >
                <ZoomOut size={16} />
              </button>
              <input
                type="range"
                min="1"
                max="3"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-20 md:w-28 accent-purple-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
              />
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(3, +(z + 0.1).toFixed(2)))}
                className="p-1 text-slate-500 hover:text-slate-800 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
                title="ซูมเข้า (+)"
              >
                <ZoomIn size={16} />
              </button>
              <span className="text-[11px] font-mono text-slate-500 min-w-8 text-right">
                {zoom.toFixed(1)}x
              </span>
            </div>

            {/* Rotate Clockwise */}
            <button
              type="button"
              onClick={() => setRotation((r) => (r + 90) % 360)}
              className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors shadow-2xs cursor-pointer"
              title="หมุนตามเข็ม 90 องศา"
            >
              <RotateCw size={15} className="text-purple-600" />
              <span>หมุน 90°</span>
            </button>

            {/* Flip Horizontal */}
            <button
              type="button"
              onClick={() => setFlipH((f) => !f)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors border shadow-2xs cursor-pointer ${
                flipH
                  ? 'bg-purple-100 border-purple-300 text-purple-700'
                  : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
              }`}
              title="พลิกภาพซ้าย-ขวา"
            >
              <FlipHorizontal size={15} />
              <span>พลิกแนวนอน</span>
            </button>

            {/* Reset */}
            <button
              type="button"
              onClick={() => {
                setRotation(0);
                setFlipH(false);
                setZoom(1);
                setPan({ x: 0, y: 0 });
                recenterCropBox(aspect);
              }}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              title="รีเซ็ตค่าเริ่มต้นและจัดกึ่งกลาง"
            >
              <RefreshCw size={15} />
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessingSave}
              className="px-4 py-2.5 text-xs md:text-sm font-semibold text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleSaveCrop}
              disabled={isProcessingSave || isLoadingImage || !!loadError}
              className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs md:text-sm rounded-xl transition-all shadow-md shadow-purple-600/25 disabled:opacity-50 cursor-pointer"
            >
              {isProcessingSave ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>กำลังบันทึกรูป...</span>
                </>
              ) : (
                <>
                  <Check size={16} />
                  <span>
                    {saveButtonText || (isReplacingExisting ? 'บันทึกทับรูปเดิม (คง URL เดิม)' : 'ยืนยันการตัดรูป')}
                  </span>
                </>
              )}
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
