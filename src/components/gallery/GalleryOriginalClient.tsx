// src/components/gallery/GalleryOriginalClient.tsx
'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  ImagePlus, UploadCloud, Copy, X, CheckCircle2, 
  Loader2, ArrowLeft, Image as ImageIcon, Trash2, 
  CheckSquare, Square, RefreshCcw, Search, Sparkles
} from 'lucide-react';

const PAGE_SIZE = 40; 
const TARGET_FOLDER = 'original'; 

interface GalleryImage {
  name: string;
  url: string;
  updatedAt: number;
  size?: number;
}

interface GalleryOriginalClientProps {
  backHref?: string;
  backLabel?: string;
}

export default function GalleryOriginalClient({ backHref, backLabel }: GalleryOriginalClientProps) {
  const pathname = usePathname();
  const isManagerRoute = pathname?.startsWith('/manager');
  const resolvedBackHref = backHref || (isManagerRoute ? '/manager/dashboard' : '/dashboard');
  const resolvedBackLabel = backLabel || (isManagerRoute ? 'กลับแดชบอร์ด Manager' : 'กลับแดชบอร์ด Admin');

  const [images, setImages] = useState<GalleryImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [showOver1MBOnly, setShowOver1MBOnly] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  const [isAutoCompressing, setIsAutoCompressing] = useState(false);
  const [compressProgress, setCompressProgress] = useState(0);
  const [compressTotal, setCompressTotal] = useState(0);
  const [compressLog, setCompressLog] = useState<string[]>([]);
  const stopCompressionRef = useRef(false);

  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'preview' | 'compressing' | 'uploading'>('idle');
  
  const [replaceFileName, setReplaceFileName] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });

  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchImages(false, false); 
  }, []);

  const fetchImages = async (isLoadMore = false, over1MBValue?: boolean) => {
    if (isLoadMore) setIsLoadingMore(true);
    else { setIsLoading(true); setOffset(0); }

    const currentOffset = isLoadMore ? offset : 0;
    const isOver1MB = over1MBValue !== undefined ? over1MBValue : showOver1MBOnly;

    try {
      // เติม &t=${Date.now()} ป้องกันแคช เพื่อให้ดึงรูปใหม่ล่าสุดเสมอ
      const response = await fetch(`/api/r2?folder=${TARGET_FOLDER}&limit=${PAGE_SIZE}&offset=${currentOffset}&over1MB=${isOver1MB}&t=${Date.now()}`);
      if (!response.ok) throw new Error('Failed to fetch images');
      
      const data = await response.json();
      const imageList: GalleryImage[] = data.images || [];
      setTotalCount(data.totalCount || 0);

      if (imageList.length < PAGE_SIZE) setHasMore(false);
      else setHasMore(true);

      if (isLoadMore) setImages(prev => [...prev, ...imageList]);
      else setImages(imageList);
      
      setOffset(currentOffset + imageList.length);
    } catch (error: any) {
      console.error(error);
      alert('ดึงรูปภาพไม่สำเร็จ: ' + error.message);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const handleToggleOver1MB = (val: boolean) => {
    setShowOver1MBOnly(val);
    fetchImages(false, val);
  };

  const formatSize = (bytes?: number) => {
    if (bytes === undefined || bytes === null) return '-';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = 2;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const handleAutoCompress = async () => {
    if (!window.confirm(`คุณต้องการบีบอัดรูปภาพที่เกิน 1MB ทั้งหมด ${totalCount} รูปโดยอัตโนมัติใช่หรือไม่?\n(รูปเดิมจะโดนทับด้วยขนาดไฟล์ที่เล็กลง และ URL คงเดิม)`)) return;

    setIsAutoCompressing(true);
    setCompressProgress(0);
    setCompressTotal(totalCount);
    setCompressLog(['🚀 เริ่มต้นระบบบีบอัดรูปภาพอัตโนมัติ...', '----------------------------']);
    stopCompressionRef.current = false;

    let processed = 0;
    const batchLimit = 5;

    try {
      while (processed < totalCount && !stopCompressionRef.current) {
        setCompressLog(prev => [...prev, `⏳ กำลังบีบอัดรูปภาพชุดถัดไป (จำกัดครั้งละ ${batchLimit} รูป)...`]);

        const response = await fetch(`/api/r2/compress-all?limit=${batchLimit}`, {
          method: 'POST',
        });

        if (!response.ok) {
          throw new Error('API request failed');
        }

        const data = await response.json();
        
        if (data.error) {
          throw new Error(data.error);
        }

        const count = data.compressedCount ?? 0;
        if (count === 0) {
          setCompressLog(prev => [...prev, '✅ บีบอัดเสร็จสิ้น! ไม่มีรูปที่เกิน 1MB เหลืออยู่แล้ว']);
          break;
        }

        processed += count;
        setCompressProgress(processed);

        const logLines = (data.results || []).map((r: any) => 
          `   • ${r.name}: ${formatSize(r.oldSize)} ➔ ${formatSize(r.newSize)} (ลดลง ${Math.round((1 - r.newSize/r.oldSize) * 100)}%)`
        );
        setCompressLog(prev => [...prev, ...logLines]);

        fetchImages(false, true);

        await new Promise(r => setTimeout(r, 1000));
      }
      
      if (stopCompressionRef.current) {
        setCompressLog(prev => [...prev, '🛑 หยุดการบีบอัดรูปภาพโดยผู้ใช้งาน']);
      }
    } catch (err: any) {
      console.error(err);
      setCompressLog(prev => [...prev, `❌ เกิดข้อผิดพลาด: ${err.message}`]);
    } finally {
      setIsAutoCompressing(false);
      fetchImages(false, true);
    }
  };

  const handleDeleteImages = async (fileNames: string[]) => {
    if (!window.confirm(`คุณแน่ใจหรือไม่ที่จะลบรูปภาพ ${fileNames.length} รายการนี้?`)) return;

    setIsDeleting(true);
    try {
      const response = await fetch('/api/r2', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileNames, folder: TARGET_FOLDER })
      });

      if (!response.ok) throw new Error('Failed to delete images');

      setImages(prev => prev.filter(img => !fileNames.includes(img.name)));
      setSelectedImages([]); 
      showToast(`✅ ลบรูปภาพเรียบร้อย!`);
      setOffset(prev => Math.max(0, prev - fileNames.length));
    } catch (error: any) {
      alert('ลบรูปภาพไม่สำเร็จ: ' + error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleSelection = (fileName: string) => {
    setSelectedImages(prev => 
      prev.includes(fileName) ? prev.filter(name => name !== fileName) : [...prev, fileName]
    );
  };

  const handleReplaceClick = (fileName: string) => {
    setReplaceFileName(fileName);
    setIsModalOpen(true);
  };

  const onFilesSelect = useCallback((files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    
    const fileArray = Array.from(files);
    
    if (replaceFileName) {
       if (fileArray.length > 1) alert('การแทนที่รูปภาพ สามารถเลือกได้เพียง 1 ไฟล์เท่านั้น');
       setSelectedFiles([fileArray[0]]);
       const url = URL.createObjectURL(fileArray[0]);
       setPreviewUrls((previousUrls) => {
         previousUrls.forEach((previousUrl) => URL.revokeObjectURL(previousUrl));
         return [url];
       });
       setUploadStatus('preview');
       return;
    }

    setSelectedFiles((previousFiles) => [...previousFiles, ...fileArray]);
    const urls = fileArray.map(f => URL.createObjectURL(f));
    setPreviewUrls((previousUrls) => [...previousUrls, ...urls]);
    setUploadStatus('preview');
  }, [replaceFileName]);

  // รับรูปจากคลิปบอร์ด (เช่น Ctrl+V screenshot)
  useEffect(() => {
    if (!isModalOpen || uploadStatus === 'compressing' || uploadStatus === 'uploading') return;

    const handlePaste = (event: ClipboardEvent) => {
      const clipboardData = event.clipboardData;
      if (!clipboardData) return;

      const imageFiles = Array.from(clipboardData.items)
        .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
        .map((item) => item.getAsFile())
        .filter((file): file is File => file !== null);

      const filesToUpload = imageFiles.length > 0
        ? imageFiles
        : Array.from(clipboardData.files).filter((file) => file.type.startsWith('image/'));

      if (filesToUpload.length === 0) return;

      event.preventDefault();
      onFilesSelect(filesToUpload);
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isModalOpen, onFilesSelect, uploadStatus]);

  // บีบอัดรูปและแปลงเป็น WebP โดยคุมขนาดไม่ให้เกิน 1MB
  const convertToWebP = async (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      const objectUrl = URL.createObjectURL(file);
      img.src = objectUrl;

      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const width = img.width;
        const height = img.height;

        canvas.width  = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          return reject(new Error('Cannot get canvas context'));
        }

        ctx.drawImage(img, 0, 0, width, height);
        URL.revokeObjectURL(objectUrl);

        let quality = 0.85;
        let blob: Blob | null = null;
        const tryCompress = async (q: number): Promise<Blob> => 
          new Promise((r) => canvas.toBlob((b) => r(b!), 'image/webp', q));

        do {
          blob = await tryCompress(quality);
          if (blob.size > 1024 * 1024) quality -= 0.1;
          else break;
        } while (quality > 0.1);

        resolve(blob);
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Failed to load image'));
      };
    });
  };

  const handleUploadClick = async () => {
    if (selectedFiles.length === 0) return;
    
    setUploadProgress({ current: 0, total: selectedFiles.length });
    let successCount = 0;

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        
        setUploadStatus('compressing');
        setUploadProgress({ current: i + 1, total: selectedFiles.length });
        
        const compressedBlob = await convertToWebP(file);
        
        const fileName = (replaceFileName && selectedFiles.length === 1) 
          ? replaceFileName 
          : `${Date.now()}-${Math.floor(Math.random() * 1000)}.webp`;

        setUploadStatus('uploading');

        // ขอ presigned URL จาก server แล้วอัพตรงไป R2
        const presignRes = await fetch('/api/presign-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName, folder: TARGET_FOLDER }),
        });
        if (!presignRes.ok) throw new Error(`ขอ presigned URL ไม่สำเร็จสำหรับไฟล์ ${file.name}`);
        const { presignedUrl } = await presignRes.json();

        const response = await fetch(presignedUrl, {
          method: 'PUT',
          headers: { 'Content-Type': 'image/webp' },
          body: compressedBlob,
        });

        if (!response.ok) throw new Error(`Upload failed for ${file.name}`);
        successCount++;
        
        if (i < selectedFiles.length - 1) {
          await new Promise(r => setTimeout(r, 100));
        }
      }

      closeModal();
      if (replaceFileName && selectedFiles.length === 1) {
        showToast('✅ แทนที่รูปภาพเรียบร้อย (URL เดิม)');
      } else {
        showToast(`✅ อัปโหลดสำเร็จ ${successCount} รูปภาพ!`);
      }
      
      fetchImages(false); 

    } catch (error: any) {
      alert('เกิดข้อผิดพลาด: ' + error.message);
      setUploadStatus('idle');
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setUploadStatus('idle');
    previewUrls.forEach(url => URL.revokeObjectURL(url));
    setPreviewUrls([]);
    setSelectedFiles([]);
    setReplaceFileName(null); 
    setUploadProgress({ current: 0, total: 0 });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => showToast('📋 คัดลอก URL เรียบร้อยแล้ว!'));
  };

  const copySelectedLinks = () => {
    if (selectedImages.length === 0) return;

    const selectedUrls = selectedImages
      .map(name => {
        const found = images.find(img => img.name === name);
        return found ? found.url : null;
      })
      .filter(Boolean);

    if (selectedUrls.length === 0) return;

    const textToCopy = selectedUrls.join('\n');

    navigator.clipboard.writeText(textToCopy).then(() => {
      showToast(`📋 คัดลอก ${selectedUrls.length} ลิงก์เรียบร้อยแล้ว (พร้อมวางลงในชีท)!`);
    }).catch(err => {
      console.error(err);
      alert('คัดลอกไม่สำเร็จ: ' + err.message);
    });
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const filteredImages = useMemo(() => {
    if (!searchQuery.trim()) return images;
    const q = searchQuery.toLowerCase().trim();
    return images.filter(img => img.name.toLowerCase().includes(q));
  }, [images, searchQuery]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 p-3 md:p-6 font-sans relative pb-24">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100/50 shadow-sm">
              <ImagePlus size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">คลังรูปภาพต้นฉบับ (Cloudflare R2)</h1>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md">
                  Original
                </span>
              </div>
              <p className="text-xs md:text-sm text-slate-500 mt-1">
                จัดการรูปอัตราส่วนเดิม แปลงเป็น WebP คุมขนาด &lt; 1MB ซิงค์กับระบบคลาวด์ R2 (โฟลเดอร์ original)
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            {totalCount > 0 && showOver1MBOnly && (
              <button 
                onClick={handleAutoCompress}
                disabled={isAutoCompressing}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs md:text-sm font-bold rounded-xl transition-all shadow-sm disabled:opacity-50"
              >
                <Sparkles size={16} /> บีบอัดรูปเกิน 1MB ({totalCount} รูป)
              </button>
            )}
            
            <Link 
              href={resolvedBackHref} 
              className="flex items-center justify-center gap-2 px-4 py-2 text-xs md:text-sm font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 rounded-xl transition-colors border border-slate-200"
            >
              <ArrowLeft size={16} /> {resolvedBackLabel}
            </Link>

            <button 
              onClick={() => { setReplaceFileName(null); setIsModalOpen(true); }}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs md:text-sm font-bold rounded-xl transition-all shadow-md shadow-emerald-600/20"
            >
              <UploadCloud size={18} /> อัปโหลดรูปใหม่
            </button>
          </div>
        </div>

        {/* Action bar for multi-selected images */}
        {selectedImages.length > 0 && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-wrap justify-between items-center gap-3 shadow-sm animate-in fade-in slide-in-from-top-4">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-emerald-900 font-bold text-sm">
                เลือกแล้ว {selectedImages.length} รูป
              </span>
              <button 
                onClick={() => {
                  const allVisibleNames = filteredImages.map(img => img.name);
                  const isAllSelected = allVisibleNames.every(name => selectedImages.includes(name));
                  if (isAllSelected) {
                    setSelectedImages([]);
                  } else {
                    setSelectedImages(allVisibleNames);
                  }
                }}
                className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 bg-emerald-200/80 hover:bg-emerald-200 px-3 py-1.5 rounded-lg transition-colors"
              >
                {filteredImages.length > 0 && filteredImages.every(img => selectedImages.includes(img.name)) 
                  ? 'ยกเลิกการเลือกทั้งหมด' 
                  : 'เลือกทั้งหมดในหน้านี้'}
              </button>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              <button 
                onClick={copySelectedLinks}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs md:text-sm font-bold rounded-xl transition-colors shadow-sm cursor-pointer"
                title="คัดลอกทุกลิงก์ที่เลือก นำไปวางใน Google Sheet / Excel จะเรียงแยกบรรทัดให้อัตโนมัติ"
              >
                <Copy size={16} />
                คัดลอก {selectedImages.length} ลิงก์ (วางลงชีท)
              </button>

              <button 
                onClick={() => setSelectedImages([])}
                className="px-3 py-2 text-xs md:text-sm font-semibold text-emerald-700 hover:bg-emerald-100 rounded-xl transition-colors"
              >
                ยกเลิก
              </button>

              <button 
                onClick={() => handleDeleteImages(selectedImages)}
                disabled={isDeleting}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white text-xs md:text-sm font-bold rounded-xl transition-colors shadow-sm"
              >
                {isDeleting ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                ลบที่เลือก
              </button>
            </div>
          </div>
        )}

        {/* Gallery Container */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 md:p-6 space-y-5">
          {/* Controls: Search & Over 1MB Toggle */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1 sm:w-64">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ค้นหาชื่อไฟล์..."
                  className="w-full pl-9 pr-3 py-2 text-xs md:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-slate-50/50"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X size={14} />
                  </button>
                )}
              </div>
              <span className={`px-2.5 py-1 text-xs font-bold rounded-full whitespace-nowrap ${
                showOver1MBOnly ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'
              }`}>
                {showOver1MBOnly ? `เกิน 1MB: ${totalCount} รูป` : `ทั้งหมด: ${totalCount} รูป`}
              </span>
            </div>

            <button
              onClick={() => handleToggleOver1MB(!showOver1MBOnly)}
              className={`flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl border transition-all shadow-sm ${
                showOver1MBOnly 
                  ? 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100' 
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              ⚠️ {showOver1MBOnly ? 'แสดงรูปภาพทั้งหมด' : 'แสดงเฉพาะรูปที่เกิน 1MB'}
            </button>
          </div>

          {isLoading ? (
            <div className="py-24 flex flex-col items-center justify-center text-slate-500 gap-3">
              <Loader2 className="animate-spin text-emerald-500" size={36} />
              <p className="text-sm font-semibold text-slate-600">กำลังโหลดรูปภาพจาก Cloudflare R2...</p>
            </div>
          ) : filteredImages.length === 0 ? (
            <div className="py-24 flex flex-col items-center justify-center text-slate-400 gap-3">
              <ImageIcon size={48} className="opacity-25" />
              <p className="text-sm font-medium">
                {searchQuery ? 'ไม่พบรูปภาพที่ตรงกับคำค้นหา' : 'ยังไม่มีรูปภาพในคลังต้นฉบับ'}
              </p>
            </div>
          ) : (
            <>
              {/* Image Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 md:gap-4">
                {filteredImages.map((img) => {
                  const isSelected = selectedImages.includes(img.name);
                  const imageUrlWithCacheBuster = `${img.url}?v=${img.updatedAt}`;

                  return (
                    <div 
                      key={img.name} 
                      className={`group bg-white border rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col relative ${
                        isSelected 
                          ? 'border-emerald-500 shadow-md ring-2 ring-emerald-500/20' 
                          : 'border-slate-200 hover:border-emerald-300'
                      }`}
                    >
                      {/* Checkbox button */}
                      <button
                        onClick={() => toggleSelection(img.name)}
                        className={`absolute top-2 left-2 z-10 p-1.5 rounded-lg transition-all ${
                          isSelected 
                            ? 'bg-emerald-500 text-white opacity-100' 
                            : 'bg-white/90 text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-white hover:text-emerald-500 shadow-sm'
                        }`}
                        title={isSelected ? 'ยกเลิกการเลือก' : 'เลือกรูปนี้'}
                      >
                        {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                      </button>

                      {/* Replace button */}
                      <button
                        onClick={() => handleReplaceClick(img.name)}
                        className="absolute top-2 right-9 z-10 p-1.5 bg-white/90 text-emerald-600 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-emerald-50 transition-all shadow-sm"
                        title="อัปโหลดรูปทับไฟล์นี้ (คง URL เดิม)"
                      >
                        <RefreshCcw size={16} />
                      </button>

                      {/* Delete button */}
                      <button
                        onClick={() => handleDeleteImages([img.name])}
                        disabled={isDeleting}
                        className="absolute top-2 right-2 z-10 p-1.5 bg-white/90 text-red-500 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-600 transition-all shadow-sm"
                        title="ลบรูปนี้"
                      >
                        <Trash2 size={16} />
                      </button>

                      {/* Image Thumbnail Container */}
                      <div 
                        className="h-44 bg-slate-50/70 relative overflow-hidden flex items-center justify-center p-2.5 cursor-pointer"
                        onClick={() => toggleSelection(img.name)} 
                      >
                        <img 
                          src={imageUrlWithCacheBuster} 
                          alt={img.name} 
                          loading="lazy" 
                          className={`max-w-full max-h-full object-contain transition-transform duration-300 ${isSelected ? 'scale-95' : 'group-hover:scale-105'}`}
                        />
                        {/* Size Badge */}
                        <span className={`absolute bottom-2 right-2 px-2 py-0.5 text-[10px] font-bold rounded-md shadow-sm border ${
                          img.size && img.size > 1024 * 1024 
                            ? 'bg-rose-50 border-rose-200 text-rose-600 font-extrabold' 
                            : 'bg-slate-900/70 border-transparent text-white backdrop-blur-sm'
                        }`}>
                          {formatSize(img.size)}
                        </span>
                      </div>

                      {/* Filename & Copy button */}
                      <div className="p-2.5 border-t border-slate-100 flex items-center justify-between gap-1.5 bg-white mt-auto">
                        <span className="text-xs text-slate-600 font-medium truncate" title={img.name}>
                          {img.name}
                        </span>
                        <button 
                          onClick={(e) => { e.stopPropagation(); copyToClipboard(img.url); }}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors shrink-0"
                          title="คัดลอก URL"
                        >
                          <Copy size={15} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Load More Button */}
              {hasMore && !searchQuery && (
                <div className="mt-8 flex justify-center">
                  <button
                    onClick={() => fetchImages(true)}
                    disabled={isLoadingMore}
                    className="flex items-center gap-2 px-6 py-2.5 bg-white border border-slate-200 text-slate-700 font-semibold text-xs md:text-sm rounded-full hover:bg-slate-50 hover:text-emerald-600 transition-colors shadow-sm disabled:opacity-70"
                  >
                    {isLoadingMore ? <><Loader2 size={16} className="animate-spin text-emerald-500" /> กำลังโหลดเพิ่ม...</> : 'โหลดรูปเพิ่ม'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal Upload & Preview */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
            
            <div className="flex justify-between items-center p-5 border-b border-slate-100 shrink-0 bg-slate-50/80">
              <h2 className="text-base md:text-lg font-bold text-slate-800 flex items-center gap-2">
                <UploadCloud className="text-emerald-600" size={22} />
                {replaceFileName ? 'แทนที่รูปภาพเดิม (คง URL เดิม)' : 'อัปโหลดรูปต้นฉบับสู่ Cloudflare R2'}
              </h2>
              <button 
                onClick={closeModal}
                disabled={uploadStatus === 'compressing' || uploadStatus === 'uploading'}
                className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-xl transition-colors disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto">
              {uploadStatus === 'idle' && (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                  onDrop={(e) => {
                    e.preventDefault(); setIsDragging(false);
                    if (e.dataTransfer.files?.length > 0) onFilesSelect(e.dataTransfer.files);
                  }}
                  className={`border-2 border-dashed rounded-2xl p-8 md:p-10 text-center cursor-pointer transition-all ${
                    isDragging ? 'border-emerald-500 bg-emerald-50/70' : 'border-slate-300 hover:border-emerald-400 hover:bg-slate-50/80'
                  }`}
                >
                  <input 
                    type="file" 
                    accept="image/*"
                    multiple={!replaceFileName} 
                    ref={fileInputRef} 
                    onChange={(e) => { if (e.target.files?.length) onFilesSelect(e.target.files); }}
                    className="hidden" 
                  />
                  <ImageIcon size={44} className="mx-auto text-slate-300 mb-3" />
                  <p className="font-semibold text-slate-700 text-sm md:text-base">
                    คลิก ลากไฟล์ หรือกด <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-xs font-mono">Ctrl+V</kbd> เพื่อวางรูปที่นี่
                  </p>
                  <p className="text-xs text-slate-400 mt-1.5">
                    (ระบบจะรักษาสัดส่วนภาพเดิม และแปลงเป็น WebP ขนาด &lt; 1MB อัตโนมัติ)
                  </p>
                </div>
              )}

              {uploadStatus === 'preview' && previewUrls.length > 0 && (
                <div className="flex flex-col gap-4">
                  <div className={`grid gap-3 overflow-y-auto max-h-[50vh] ${previewUrls.length > 1 ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-1'}`}>
                    {previewUrls.map((url, idx) => (
                      <div key={idx} className={`relative w-full ${previewUrls.length === 1 ? 'h-72' : 'h-32'} bg-slate-100 rounded-2xl overflow-hidden flex items-center justify-center p-2 border border-slate-200`}>
                        <img 
                          src={url} 
                          alt={`Preview ${idx + 1}`} 
                          className="max-w-full max-h-full object-contain shadow-sm"
                        />
                        {previewUrls.length > 1 && (
                          <span className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-md shadow-sm">
                            {idx + 1}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {previewUrls.length > 1 && (
                    <div className="text-xs md:text-sm font-semibold text-emerald-700 bg-emerald-50 py-2.5 px-3 rounded-xl text-center border border-emerald-100">
                      เตรียมอัปโหลดทั้งหมด {selectedFiles.length} ไฟล์
                    </div>
                  )}

                  <div className="flex justify-end gap-3 mt-2">
                    <button 
                      onClick={() => { setUploadStatus('idle'); previewUrls.forEach(u => URL.revokeObjectURL(u)); setPreviewUrls([]); setSelectedFiles([]); }}
                      className="px-4 py-2 text-xs md:text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                    >
                      ยกเลิก
                    </button>
                    <button 
                      onClick={handleUploadClick}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs md:text-sm font-bold rounded-xl transition-all shadow-md shadow-emerald-600/20"
                    >
                      ยืนยันและอัปโหลด {previewUrls.length > 1 ? `(${previewUrls.length})` : ''}
                    </button>
                  </div>
                </div>
              )}

              {(uploadStatus === 'compressing' || uploadStatus === 'uploading') && (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                  <Loader2 className="animate-spin text-emerald-600" size={42} />
                  <div>
                    <p className="font-bold text-slate-800 text-sm md:text-base">
                      {uploadStatus === 'compressing' 
                        ? `กำลังบีบอัดภาพที่ ${uploadProgress.current}/${uploadProgress.total} (WebP)...` 
                        : `กำลังอัปโหลดภาพที่ ${uploadProgress.current}/${uploadProgress.total} เข้าสู่ Cloudflare R2...`}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">กรุณารอสักครู่ ห้ามปิดหน้าต่างนี้</p>
                  </div>
                  {uploadProgress.total > 1 && (
                    <div className="w-full max-w-xs bg-slate-100 rounded-full h-2.5 mt-4 overflow-hidden border border-slate-200">
                      <div 
                        className="bg-emerald-500 h-full transition-all duration-300" 
                        style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Auto Compress Progress Modal */}
      {(isAutoCompressing || compressLog.length > 0) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[80vh] animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50/80 shrink-0">
              <h2 className="text-base md:text-lg font-bold text-slate-800 flex items-center gap-2">
                ⚡ {isAutoCompressing ? 'กำลังบีบอัดรูปภาพอัตโนมัติ' : 'บีบอัดรูปภาพอัตโนมัติเสร็จสิ้น'}
              </h2>
              {!isAutoCompressing && (
                <button 
                  onClick={() => setCompressLog([])}
                  className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-xl transition-colors"
                >
                  <X size={20} />
                </button>
              )}
            </div>

            <div className="p-6 flex-1 overflow-y-auto flex flex-col gap-4">
              <div className="space-y-2">
                <div className="flex justify-between text-xs md:text-sm font-bold text-slate-700">
                  <span>ความคืบหน้า</span>
                  <span>{compressProgress} / {compressTotal} รูป</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200">
                  <div 
                    className="bg-amber-500 h-full transition-all duration-500 rounded-full" 
                    style={{ width: `${compressTotal > 0 ? (compressProgress / compressTotal) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div className="flex-1 min-h-[250px] bg-slate-950 text-emerald-400 p-4 rounded-2xl font-mono text-xs overflow-y-auto space-y-1.5 border border-slate-800 shadow-inner">
                {compressLog.map((log, idx) => (
                  <div key={idx} className="whitespace-pre-wrap">{log}</div>
                ))}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/80 flex justify-end gap-3 shrink-0">
              {isAutoCompressing ? (
                <button
                  onClick={() => { stopCompressionRef.current = true; }}
                  className="px-5 py-2.5 text-xs md:text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all shadow-sm flex items-center gap-2"
                >
                  🛑 หยุดการทำงาน
                </button>
              ) : (
                <button
                  onClick={() => setCompressLog([])}
                  className="px-6 py-2.5 text-xs md:text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-sm"
                >
                  ปิดหน้าต่างนี้
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      <div className={`fixed bottom-6 right-6 flex items-center gap-2.5 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl transition-all duration-300 z-50 ${
        toastMsg ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'
      }`}>
        <CheckCircle2 size={20} className="text-emerald-400 shrink-0" />
        <span className="text-xs md:text-sm font-medium">{toastMsg}</span>
      </div>

    </div>
  );
}
