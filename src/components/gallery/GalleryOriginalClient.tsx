// src/components/gallery/GalleryOriginalClient.tsx
'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  ImagePlus, UploadCloud, Copy, X, CheckCircle2, 
  Loader2, ArrowLeft, Image as ImageIcon, Trash2, 
  CheckSquare, Square, RefreshCcw, Search, Sparkles, Pencil,
  Folder, FolderPlus, Lock, Unlock, KeyRound, Eye, EyeOff, FolderOpen,
  ChevronRight
} from 'lucide-react';

const PAGE_SIZE = 40; 

interface GalleryImage {
  name: string;
  url: string;
  updatedAt: number;
  size?: number;
}

export interface FolderItem {
  id: string;
  name: string;
  isProtected: boolean;
}

interface GalleryOriginalClientProps {
  backHref?: string;
  backLabel?: string;
}

export default function GalleryOriginalClient(_props: GalleryOriginalClientProps = {}) {
  const _pathname = usePathname();

  // --- Folder Management State ---
  const [folders, setFolders] = useState<FolderItem[]>([
    { id: 'original', name: 'โฟลเดอร์หลัก (Original)', isProtected: true }
  ]);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [isLoadingFolders, setIsLoadingFolders] = useState(true);

  // --- Master PIN Lock State ---
  const [isUnlockedOriginal, setIsUnlockedOriginal] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [showPinPassword, setShowPinPassword] = useState(false);
  const [pendingFolderToSwitch, setPendingFolderToSwitch] = useState<string | null>(null);

  // --- Create Folder Modal State ---
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  // --- Delete Folder State ---
  const [isDeletingFolder, setIsDeletingFolder] = useState(false);

  // --- Image Gallery State ---
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

  const [renameModalData, setRenameModalData] = useState<{ oldName: string; newName: string } | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);

  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper ดึง PIN จาก Session สำหรับโฟลเดอร์หลัก
  const getAuthHeaders = useCallback((folderToCheck?: string, pinOverride?: string): HeadersInit => {
    const target = folderToCheck !== undefined ? folderToCheck : (currentFolder || 'original');
    if (target === 'original') {
      const pin = pinOverride || (typeof window !== 'undefined' ? sessionStorage.getItem('r2_unlocked_original') : null) || '';
      return { 'x-folder-pin': pin };
    }
    return {};
  }, [currentFolder]);

  // ดึงรายการโฟลเดอร์จาก R2
  const fetchFolders = async () => {
    setIsLoadingFolders(true);
    try {
      const res = await fetch('/api/r2/folders');
      if (!res.ok) throw new Error('Failed to fetch folders');
      const data = await res.json();
      if (data.folders) {
        setFolders(data.folders);
      }
    } catch (err: any) {
      console.error('Fetch folders error:', err);
    } finally {
      setIsLoadingFolders(false);
    }
  };

  // โหลดข้อมูลเริ่มต้นเมื่อเปิดหน้าเว็บ (ไม่เด้งถามรหัส PIN อัตโนมัติ ให้ผู้ใช้เลือกโฟลเดอร์ก่อน)
  useEffect(() => {
    fetchFolders();

    // เช็คว่าใน Session ปลดล็อคโฟลเดอร์หลักไว้หรือยัง
    const savedPin = typeof window !== 'undefined' ? sessionStorage.getItem('r2_unlocked_original') : null;
    if (savedPin) {
      setIsUnlockedOriginal(true);
    }
    setIsLoading(false);
  }, []);

  // ดึงรูปภาพตามโฟลเดอร์ที่กำลังเลือกอยู่
  const fetchImages = async (
    isLoadMore = false, 
    over1MBValue?: boolean, 
    folderToFetch?: string,
    pinOverride?: string
  ) => {
    const targetFolder = folderToFetch !== undefined ? folderToFetch : currentFolder;
    if (!targetFolder) {
      setIsLoading(false);
      setIsLoadingMore(false);
      return;
    }

    if (isLoadMore) setIsLoadingMore(true);
    else { setIsLoading(true); setOffset(0); }

    const currentOffset = isLoadMore ? offset : 0;
    const isOver1MB = over1MBValue !== undefined ? over1MBValue : showOver1MBOnly;

    try {
      const headers = getAuthHeaders(targetFolder, pinOverride);
      const response = await fetch(
        `/api/r2?folder=${encodeURIComponent(targetFolder)}&limit=${PAGE_SIZE}&offset=${currentOffset}&over1MB=${isOver1MB}&t=${Date.now()}`,
        { headers }
      );

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        if (response.status === 401 && errData.error === 'PIN_REQUIRED') {
          setIsUnlockedOriginal(false);
          setIsPinModalOpen(true);
          throw new Error('กรุณากรอกรหัสผ่านเพื่อเข้าใช้งานโฟลเดอร์หลัก');
        }
        throw new Error(errData.error || `HTTP ${response.status}`);
      }
      
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
      if (!error.message.includes('รหัสผ่าน')) {
        alert('ดึงรูปภาพไม่สำเร็จ: ' + error.message);
      }
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  // สลับโฟลเดอร์
  const handleSelectFolder = (folder: FolderItem) => {
    if (folder.id === currentFolder) return;

    if (folder.isProtected) {
      // โฟลเดอร์หลัก: เช็คว่าปลดล็อคแล้วหรือยัง
      const savedPin = typeof window !== 'undefined' ? sessionStorage.getItem('r2_unlocked_original') : null;
      if (savedPin || isUnlockedOriginal) {
        setIsUnlockedOriginal(true);
        setCurrentFolder(folder.id);
        fetchImages(false, showOver1MBOnly, folder.id, savedPin || undefined);
      } else {
        setPendingFolderToSwitch(folder.id);
        setPinInput('');
        setPinError(null);
        setIsPinModalOpen(true);
      }
    } else {
      // โฟลเดอร์ของน้องฝึกงาน: เข้าได้อิสระ ไม่ต้องใส่รหัส
      setCurrentFolder(folder.id);
      fetchImages(false, showOver1MBOnly, folder.id);
    }
  };

  // ปิดหน้าต่างใส่รหัส PIN
  const handleClosePinModal = () => {
    setIsPinModalOpen(false);
    setPinInput('');
    setPinError(null);
    setPendingFolderToSwitch(null);
  };

  // ยืนยันรหัสผ่าน PIN สำหรับโฟลเดอร์หลัก (ตรวจสอบกับ API หลังบ้าน ไม่เปิดเผยรหัสใน client)
  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const enteredPin = pinInput.trim();
    if (!enteredPin) return;

    try {
      const res = await fetch(`/api/r2?folder=original&limit=1&offset=0&t=${Date.now()}`, {
        headers: { 'x-folder-pin': enteredPin }
      });

      if (!res.ok) {
        setPinError('รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง');
        return;
      }

      sessionStorage.setItem('r2_unlocked_original', enteredPin);
      setIsUnlockedOriginal(true);
      setIsPinModalOpen(false);
      setPinError(null);
      setPinInput('');
      
      const target = pendingFolderToSwitch || 'original';
      setCurrentFolder(target);
      setPendingFolderToSwitch(null);
      fetchImages(false, showOver1MBOnly, target, enteredPin);
      showToast('🔓 ปลดล็อคโฟลเดอร์หลักสำเร็จ');
    } catch (err: any) {
      setPinError('ตรวจสอบรหัสผ่านไม่สำเร็จ: ' + err.message);
    }
  };

  // ล็อคโฟลเดอร์หลักคืน
  const handleLockOriginalFolder = () => {
    sessionStorage.removeItem('r2_unlocked_original');
    setIsUnlockedOriginal(false);
    showToast('🔒 ล็อคโฟลเดอร์หลักเรียบร้อย');
    setCurrentFolder(null); // พากลับหน้าเลือกโฟลเดอร์
    setImages([]);
    setTotalCount(0);
  };

  // สร้างโฟลเดอร์ใหม่ให้น้องฝึกงาน
  const handleCreateFolderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    setIsCreatingFolder(true);
    try {
      const res = await fetch('/api/r2/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderName: newFolderName.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create folder');

      // เพิ่มเข้า state และสลับไปที่โฟลเดอร์นั้นทันที
      setFolders(prev => [...prev, data.folder]);
      setCurrentFolder(data.folder.id);
      setIsCreateFolderModalOpen(false);
      setNewFolderName('');
      showToast(`📁 สร้างโฟลเดอร์ "${data.folder.name}" สำเร็จ!`);
      
      // ดึงรูปของโฟลเดอร์ใหม่ (ซึ่งจะว่างเปล่า)
      fetchImages(false, false, data.folder.id);
    } catch (err: any) {
      alert('สร้างโฟลเดอร์ไม่สำเร็จ: ' + err.message);
    } finally {
      setIsCreatingFolder(false);
    }
  };

  // ลบโฟลเดอร์ของน้องฝึกงาน
  const handleDeleteCurrentFolder = async () => {
    if (!currentFolder) return;
    const currentFolderObj = folders.find(f => f.id === currentFolder);
    if (!currentFolderObj || currentFolderObj.isProtected) return;

    if (!window.confirm(`คุณแน่ใจหรือไม่ที่จะลบโฟลเดอร์ "${currentFolderObj.name}" และรูปทั้งหมดในโฟลเดอร์นี้?`)) return;

    setIsDeletingFolder(true);
    try {
      const res = await fetch('/api/r2/folders', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId: currentFolder })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete folder');
      }

      setFolders(prev => prev.filter(f => f.id !== currentFolder));
      showToast(`🗑️ ลบโฟลเดอร์ "${currentFolderObj.name}" เรียบร้อย!`);

      // สลับกลับไปหน้าเลือกโฟลเดอร์
      setCurrentFolder(null);
      setImages([]);
      setTotalCount(0);
    } catch (err: any) {
      alert('ลบโฟลเดอร์ไม่สำเร็จ: ' + err.message);
    } finally {
      setIsDeletingFolder(false);
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

  // บีบอัดภาพเกิน 1MB
  const handleAutoCompress = async () => {
    if (!window.confirm(`คุณต้องการบีบอัดรูปภาพที่เกิน 1MB ทั้งหมด ${totalCount} รูปในโฟลเดอร์นี้ใช่หรือไม่?`)) return;

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

        if (!response.ok) throw new Error('API request failed');
        const data = await response.json();
        if (data.error) throw new Error(data.error);

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

  // ลบรูปภาพที่เลือก
  const handleDeleteImages = async (fileNames: string[]) => {
    if (!window.confirm(`คุณแน่ใจหรือไม่ที่จะลบรูปภาพ ${fileNames.length} รายการนี้ในโฟลเดอร์ปัจจุบัน?`)) return;

    setIsDeleting(true);
    try {
      const response = await fetch('/api/r2', {
        method: 'DELETE',
        headers: { 
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ fileNames, folder: currentFolder })
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || data.error || 'Failed to delete images');
      }

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

  // แก้ไขชื่อไฟล์รูปภาพ
  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameModalData || !renameModalData.newName.trim()) return;
    if (renameModalData.oldName === renameModalData.newName.trim()) {
      setRenameModalData(null);
      return;
    }
    setIsRenaming(true);
    try {
      const res = await fetch('/api/r2', {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          oldName: renameModalData.oldName,
          newName: renameModalData.newName.trim(),
          folder: currentFolder
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Failed to rename image');

      setImages(prev => prev.map(img => img.name === renameModalData.oldName ? {
        ...img,
        name: data.name,
        url: data.url,
        updatedAt: Date.now()
      } : img));
      showToast(`✅ เปลี่ยนชื่อเป็น "${data.name}" เรียบร้อย!`);
      setRenameModalData(null);
    } catch (err: any) {
      alert('เปลี่ยนชื่อรูปภาพไม่สำเร็จ: ' + err.message);
    } finally {
      setIsRenaming(false);
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

  // รับรูปจากคลิปบอร์ด (Ctrl+V)
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

  // บีบอัดรูปเป็น WebP < 1MB
  const convertToWebP = async (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      const objectUrl = URL.createObjectURL(file);
      img.src = objectUrl;

      img.onload = async () => {
        const canvas = document.createElement('canvas');
        canvas.width  = img.width;
        canvas.height = img.height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          return reject(new Error('Cannot get canvas context'));
        }

        ctx.drawImage(img, 0, 0, img.width, img.height);
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

  // อัปโหลดไฟล์เข้าโฟลเดอร์ปัจจุบัน
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

        // ขอ presigned URL ตรงเข้า Cloudflare R2
        const presignRes = await fetch('/api/presign-image', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            ...getAuthHeaders()
          },
          body: JSON.stringify({ fileName, folder: currentFolder }),
        });
        if (!presignRes.ok) {
          const errData = await presignRes.json().catch(() => ({}));
          throw new Error(errData.message || errData.error || `ขอ presigned URL ไม่สำเร็จสำหรับไฟล์ ${file.name}`);
        }
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

  const activeFolderObj = useMemo(() => {
    if (!currentFolder) return null;
    return folders.find(f => f.id === currentFolder) || { id: currentFolder, name: currentFolder, isProtected: currentFolder === 'original' };
  }, [currentFolder, folders]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 p-3 md:p-6 font-sans relative pb-24">
      <div className="max-w-7xl mx-auto space-y-5">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 md:p-6 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100/50 shadow-sm">
              <ImagePlus size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">
                  {currentFolder ? 'รูปภาพต้นฉบับ R2' : 'คลังภาพ Cloudflare R2'}
                </h1>
                {activeFolderObj && (
                  <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md flex items-center gap-1 ${
                    activeFolderObj.isProtected 
                      ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  }`}>
                    {activeFolderObj.isProtected ? <Lock size={10} /> : <FolderOpen size={10} />}
                    {activeFolderObj.name}
                  </span>
                )}
              </div>
              <p className="text-xs md:text-sm text-slate-500 mt-1">
                {currentFolder 
                  ? `อัปโหลดรูปอัตราส่วนเดิม แปลงเป็น WebP คุมขนาด < 1MB (โฟลเดอร์: ${activeFolderObj?.name || currentFolder})`
                  : 'เลือกโฟลเดอร์สำหรับทำงาน หรือสร้างโฟลเดอร์ใหม่เพื่ออัปโหลดและตรวจเช็ครูปภาพ'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            {currentFolder && totalCount > 0 && showOver1MBOnly && (
              <button 
                onClick={handleAutoCompress}
                disabled={isAutoCompressing}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs md:text-sm font-bold rounded-xl transition-all shadow-sm disabled:opacity-50"
              >
                <Sparkles size={16} /> บีบอัดรูปเกิน 1MB ({totalCount} รูป)
              </button>
            )}

            {currentFolder && (
              <button
                onClick={() => {
                  setCurrentFolder(null);
                  setImages([]);
                  setTotalCount(0);
                  setSearchQuery('');
                  setSelectedImages([]);
                }}
                className="flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs md:text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors border border-slate-200 cursor-pointer"
                title="กลับไปเลือกโฟลเดอร์อื่น"
              >
                <FolderOpen size={15} /> สลับโฟลเดอร์
              </button>
            )}
            
            {/* นำปุ่มกลับแดชบอร์ดออกตามคำสั่ง เพื่อป้องกันไม่ให้ผู้ใช้หรือน้องฝึกงานหลุดเข้าแดชบอร์ด */}

            {currentFolder ? (
              <button 
                onClick={() => { setReplaceFileName(null); setIsModalOpen(true); }}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs md:text-sm font-bold rounded-xl transition-all shadow-md shadow-emerald-600/20"
              >
                <UploadCloud size={18} /> อัปโหลดรูปลงโฟลเดอร์นี้
              </button>
            ) : (
              <button 
                onClick={() => { setNewFolderName(''); setIsCreateFolderModalOpen(true); }}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs md:text-sm font-bold rounded-xl transition-all shadow-md shadow-blue-600/20"
              >
                <FolderPlus size={18} /> + สร้างโฟลเดอร์ใหม่
              </button>
            )}
          </div>
        </div>

        {!currentFolder ? (
          /* 🗂️ หน้าแรก: จอเลือกโฟลเดอร์สำหรับทำงาน (Folder Selection Hub) */
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 md:p-10 space-y-8 animate-in fade-in duration-300">
            <div className="max-w-xl mx-auto text-center space-y-2">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto border border-blue-100 shadow-sm">
                <FolderOpen size={32} />
              </div>
              <h2 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">
                เลือกโฟลเดอร์ที่ต้องการเข้าใช้งาน
              </h2>
              <p className="text-xs md:text-sm text-slate-500">
                น้องฝึกงานสามารถคลิกเลือกโฟลเดอร์ของตนเองเพื่ออัปโหลดและตรวจเช็คภาพได้ทันที หรือกดสร้างโฟลเดอร์ใหม่
              </p>
            </div>

            {isLoadingFolders ? (
              <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400">
                <Loader2 className="animate-spin text-blue-600" size={32} />
                <span className="text-xs font-semibold">กำลังโหลดรายชื่อโฟลเดอร์จาก Cloudflare R2...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5 max-w-5xl mx-auto">
                {/* 1. โฟลเดอร์หลัก (Original) */}
                {folders.filter(f => f.isProtected).map(f => (
                  <div
                    key={f.id}
                    onClick={() => handleSelectFolder(f)}
                    className="group relative bg-gradient-to-br from-amber-50/50 via-white to-amber-50/30 hover:to-amber-100/50 border-2 border-amber-200/90 hover:border-amber-400 rounded-2xl p-5 cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-1 flex flex-col justify-between min-h-[175px]"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center border border-amber-200 shadow-inner group-hover:scale-105 transition-transform">
                          {isUnlockedOriginal ? <Unlock size={22} /> : <Lock size={22} />}
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          isUnlockedOriginal 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-100 text-amber-800 border-amber-200'
                        }`}>
                          {isUnlockedOriginal ? '🔓 ปลดล็อคแล้ว' : '🔒 มีรหัสผ่าน'}
                        </span>
                      </div>
                      <h3 className="font-black text-slate-800 text-base group-hover:text-amber-700 transition-colors">
                        {f.name}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                        คลังภาพต้นฉบับหลักของระบบ (สำหรับผู้ดูแลระบบ)
                      </p>
                    </div>

                    <div className="pt-3 border-t border-amber-100/80 flex items-center justify-between text-xs font-bold text-amber-700 mt-3">
                      <span>{isUnlockedOriginal ? 'เข้าสู่โฟลเดอร์หลัก' : 'ปลดล็อคเพื่อเข้าใช้งาน'}</span>
                      <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                ))}

                {/* 2. โฟลเดอร์น้องฝึกงานแต่ละคน */}
                {folders.filter(f => !f.isProtected).map(f => (
                  <div
                    key={f.id}
                    onClick={() => handleSelectFolder(f)}
                    className="group relative bg-white hover:bg-slate-50/80 border-2 border-slate-200 hover:border-emerald-500 rounded-2xl p-5 cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-1 flex flex-col justify-between min-h-[175px]"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-inner group-hover:scale-105 transition-transform">
                          <Folder size={22} />
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          ✨ น้องฝึกงาน (ฟรี PIN)
                        </span>
                      </div>
                      <h3 className="font-black text-slate-800 text-base group-hover:text-emerald-700 transition-colors truncate" title={f.name}>
                        📁 {f.name}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                        โฟลเดอร์สำหรับตรวจเช็คและอัปโหลดรูปภาพของ {f.name}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-emerald-600 mt-3">
                      <span>คลิกเพื่อเข้าใช้งานทันที</span>
                      <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                ))}

                {/* 3. การ์ดสร้างโฟลเดอร์ใหม่ */}
                <div
                  onClick={() => { setNewFolderName(''); setIsCreateFolderModalOpen(true); }}
                  className="group border-2 border-dashed border-blue-300 hover:border-blue-500 bg-blue-50/20 hover:bg-blue-50/50 rounded-2xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md min-h-[175px]"
                >
                  <div className="w-11 h-11 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <FolderPlus size={22} />
                  </div>
                  <span className="text-sm font-bold text-blue-700 mt-3 group-hover:underline">
                    + สร้างโฟลเดอร์ใหม่
                  </span>
                  <span className="text-[11px] text-slate-400 mt-1">
                    สำหรับน้องฝึกงานที่ยังไม่มีโฟลเดอร์
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>

        {/* 📁 Folder Bar: แถบเลือกและจัดการโฟลเดอร์ */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-3.5 md:p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-thin">
            <span className="text-xs font-bold text-slate-400 shrink-0 uppercase tracking-wider pl-1">
              โฟลเดอร์:
            </span>

            {folders.map((folder) => {
              const isSelected = currentFolder === folder.id;
              return (
                <button
                  key={folder.id}
                  onClick={() => handleSelectFolder(folder)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs md:text-sm font-bold transition-all shrink-0 cursor-pointer ${
                    isSelected
                      ? folder.isProtected
                        ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                        : 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                      : 'bg-slate-100/90 text-slate-600 hover:bg-slate-200 hover:text-slate-900 border border-slate-200/80'
                  }`}
                >
                  {folder.isProtected ? (
                    isUnlockedOriginal ? <Unlock size={14} className="shrink-0" /> : <Lock size={14} className="shrink-0" />
                  ) : (
                    <Folder size={14} className="shrink-0" />
                  )}
                  <span>{folder.name}</span>
                </button>
              );
            })}
          </div>

          {/* Action Buttons ในส่วน Folder */}
          <div className="flex items-center gap-2 shrink-0 justify-end pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
            {/* ปุ่มล็อคโฟลเดอร์หลักคืน เมื่ออยู่ใน original */}
            {currentFolder === 'original' && isUnlockedOriginal && (
              <button
                onClick={handleLockOriginalFolder}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition-all"
                title="ล็อคโฟลเดอร์หลักคืนเพื่อความปลอดภัย"
              >
                <Lock size={13} /> ล็อคโฟลเดอร์หลัก
              </button>
            )}

            {/* ปุ่มกลับหน้าเลือกโฟลเดอร์ */}
            <button
              onClick={() => {
                setCurrentFolder(null);
                setImages([]);
                setTotalCount(0);
                setSearchQuery('');
                setSelectedImages([]);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition-all"
              title="กลับไปหน้าเลือกโฟลเดอร์"
            >
              <FolderOpen size={13} /> เปลี่ยนโฟลเดอร์
            </button>

            {/* ปุ่มลบโฟลเดอร์น้องฝึกงาน (ถ้าเลือกโฟลเดอร์นั้นอยู่) */}
            {activeFolderObj && !activeFolderObj.isProtected && (
              <button
                onClick={handleDeleteCurrentFolder}
                disabled={isDeletingFolder}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-all disabled:opacity-50"
                title={`ลบโฟลเดอร์ ${activeFolderObj.name}`}
              >
                {isDeletingFolder ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                ลบโฟลเดอร์นี้
              </button>
            )}

            {/* ปุ่มสร้างโฟลเดอร์ใหม่ */}
            <button
              onClick={() => { setNewFolderName(''); setIsCreateFolderModalOpen(true); }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs md:text-sm font-bold text-blue-700 bg-blue-50 hover:bg-blue-100/80 border border-blue-200 rounded-xl transition-all shadow-sm"
            >
              <FolderPlus size={15} /> + สร้างโฟลเดอร์ใหม่
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
              <p className="text-sm font-semibold text-slate-600">กำลังโหลดรูปภาพจาก Cloudflare R2 ({activeFolderObj?.name || currentFolder})...</p>
            </div>
          ) : filteredImages.length === 0 ? (
            <div className="py-24 flex flex-col items-center justify-center text-slate-400 gap-3">
              <ImageIcon size={48} className="opacity-25" />
              <p className="text-sm font-medium">
                {searchQuery ? 'ไม่พบรูปภาพที่ตรงกับคำค้นหา' : `ยังไม่มีรูปภาพในโฟลเดอร์ "${activeFolderObj?.name || currentFolder}"`}
              </p>
              <button
                onClick={() => { setReplaceFileName(null); setIsModalOpen(true); }}
                className="mt-2 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-xl border border-emerald-200 transition-all flex items-center gap-1.5"
              >
                <UploadCloud size={16} /> อัปโหลดรูปแรกในโฟลเดอร์นี้
              </button>
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

                      {/* Rename button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setRenameModalData({ oldName: img.name, newName: img.name });
                        }}
                        className="absolute top-2 right-16 z-10 p-1.5 bg-white/90 text-blue-600 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-blue-50 transition-all shadow-sm"
                        title="แก้ไขชื่อไฟล์รูปภาพนี้"
                      >
                        <Pencil size={16} />
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
      </>
    )}
      </div>

      {/* 🔒 PIN Verification Modal สำหรับโฟลเดอร์หลัก original */}
      {isPinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden p-6 space-y-5 animate-in zoom-in-95 duration-200 border border-slate-200 relative">
            <button
              type="button"
              onClick={handleClosePinModal}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-xl transition-colors"
              title="ปิด"
            >
              <X size={18} />
            </button>

            <div className="text-center space-y-2 pt-2">
              <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto border border-amber-200 shadow-sm">
                <KeyRound size={28} />
              </div>
              <h2 className="text-lg font-black text-slate-800">ยืนยันรหัสผ่านโฟลเดอร์หลัก</h2>
              <p className="text-xs text-slate-500">
                โฟลเดอร์หลัก (Original) ถูกตั้งรหัสผ่านป้องกันไว้ กรุณากรอกรหัสผ่านเพื่อเข้าใช้งาน
              </p>
            </div>

            <form onSubmit={handlePinSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-600">
                  รหัสผ่าน (PIN)
                </label>
                <div className="relative">
                  <input
                    type={showPinPassword ? 'text' : 'password'}
                    autoFocus
                    value={pinInput}
                    onChange={(e) => { setPinInput(e.target.value); setPinError(null); }}
                    placeholder="กรอกรหัสผ่าน..."
                    className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-mono tracking-wider"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPinPassword(!showPinPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    {showPinPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {pinError && (
                  <p className="text-xs font-semibold text-rose-600 animate-in fade-in">
                    ⚠️ {pinError}
                  </p>
                )}
              </div>

              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleClosePinModal}
                  className="flex-1 px-4 py-2.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={!pinInput.trim()}
                  className="flex-1 px-4 py-2.5 text-xs md:text-sm font-bold text-white bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 rounded-xl transition-all shadow-md shadow-amber-500/20 flex items-center justify-center gap-1.5"
                >
                  <Unlock size={16} /> ปลดล็อค
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 📁 Create Folder Modal */}
      {isCreateFolderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50/80">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <FolderPlus className="text-blue-600" size={20} />
                สร้างโฟลเดอร์ใหม่
              </h2>
              <button 
                onClick={() => setIsCreateFolderModalOpen(false)}
                disabled={isCreatingFolder}
                className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-xl transition-colors disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateFolderSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ชื่อโฟลเดอร์ (เช่น น้องมิว, ตรวจงาน_รอบเช้า)
                </label>
                <input
                  type="text"
                  autoFocus
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="พิมพ์ชื่อโฟลเดอร์..."
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  * โฟลเดอร์จะถูกสร้างขึ้นใน Cloudflare R2 โดยตรง น้องฝึกงานเข้าใช้งานได้ทันที
                </p>
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateFolderModalOpen(false)}
                  disabled={isCreatingFolder}
                  className="px-4 py-2 text-xs md:text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isCreatingFolder || !newFolderName.trim()}
                  className="px-5 py-2 text-xs md:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 rounded-xl transition-all shadow-md shadow-blue-600/20 flex items-center gap-2"
                >
                  {isCreatingFolder ? <Loader2 size={16} className="animate-spin" /> : null}
                  สร้างโฟลเดอร์
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Upload & Preview */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
            
            <div className="flex justify-between items-center p-5 border-b border-slate-100 shrink-0 bg-slate-50/80">
              <h2 className="text-base md:text-lg font-bold text-slate-800 flex items-center gap-2">
                <UploadCloud className="text-emerald-600" size={22} />
                {replaceFileName ? 'แทนที่รูปภาพเดิม (คง URL เดิม)' : `อัปโหลดรูปสู่โฟลเดอร์ "${activeFolderObj?.name || currentFolder || ''}"`}
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
                    (บันทึกลง: {currentFolder} | แปลงเป็น WebP ขนาด &lt; 1MB อัตโนมัติ)
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
                      เตรียมอัปโหลดทั้งหมด {selectedFiles.length} ไฟล์ เข้าโฟลเดอร์ {activeFolderObj?.name || currentFolder}
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
                        : `กำลังอัปโหลดภาพที่ ${uploadProgress.current}/${uploadProgress.total} สู่โฟลเดอร์ ${activeFolderObj?.name || currentFolder}...`}
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

      {/* ✏️ Rename File Modal */}
      {renameModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50/80">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Pencil className="text-blue-600" size={18} />
                แก้ไขชื่อไฟล์รูปภาพ
              </h2>
              <button 
                onClick={() => setRenameModalData(null)}
                disabled={isRenaming}
                className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-xl transition-colors disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRenameSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  ชื่อเดิม
                </label>
                <p className="text-xs text-slate-400 font-mono bg-slate-50 p-2.5 rounded-xl border border-slate-200 truncate">
                  {renameModalData.oldName}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ชื่อไฟล์ใหม่ (รวมนามสกุลไฟล์ เช่น .webp, .jpg)
                </label>
                <input
                  type="text"
                  autoFocus
                  value={renameModalData.newName}
                  onChange={(e) => setRenameModalData({ ...renameModalData, newName: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                  placeholder="ตั้งชื่อไฟล์ใหม่..."
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setRenameModalData(null)}
                  disabled={isRenaming}
                  className="px-4 py-2 text-xs md:text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isRenaming || !renameModalData.newName.trim()}
                  className="px-5 py-2 text-xs md:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-xl transition-all shadow-md shadow-blue-600/20 flex items-center gap-2"
                >
                  {isRenaming ? <Loader2 size={16} className="animate-spin" /> : null}
                  บันทึกชื่อใหม่
                </button>
              </div>
            </form>
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
