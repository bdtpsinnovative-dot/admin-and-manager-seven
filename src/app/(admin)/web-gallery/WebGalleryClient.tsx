"use client"

import { useState, useTransition } from "react"
import { 
  JournalCategory, 
  JournalImageItem,
  saveJournalCategory, 
  deleteJournalCategory,
  getJournalCategoryWithImages,
  addJournalImages,
  deleteJournalImages,
  updateJournalImage,
  reorderJournalImages,
  moveJournalImages
} from "@/actions/web-gallery"
import { 
  Images, Plus, Search, Edit2, Trash2, ExternalLink, 
  Eye, EyeOff, Image as ImageIcon, ArrowUpDown, 
  Check, X, Loader2, Sparkles, Layers, ArrowLeft,
  Copy, UploadCloud, MoveUp, MoveDown, CheckSquare, 
  Square, FolderInput, Wand2
} from "lucide-react"

interface WebGalleryClientProps {
  initialCategories: JournalCategory[]
  fetchError: string | null
}

const CATEGORY_PRESETS = [
  {
    title_en: "VASE & VESSELS",
    title_th: "แจกันและภาชนะ",
    slug: "vase-and-vessels",
    category_query: "Vase",
    description_en: "Vases and vessels with organic silhouettes and tactile finishes designed to hold botanicals or stand alone as sculpture.",
    description_th: "แจกันและภาชนะดีไซน์มินิมอล ช่วยเติมความสดชื่นและเอกลักษณ์ให้กับทุกมุมของบ้าน",
  },
  {
    title_en: "FIGURE",
    title_th: "ตุ๊กตาตกแต่ง",
    slug: "figure",
    category_query: "FIGURE",
    description_en: "Artful figures and charming collectibles that bring warmth and character to shelves and mantels.",
    description_th: "ตุ๊กตาและรูปปั้นตกแต่งชิ้นเล็ก สะท้อนความน่ารักและอบอุ่น",
  },
  {
    title_en: "SCULPTURE",
    title_th: "ประติมากรรมตกแต่ง",
    slug: "sculpture",
    category_query: "Sculpture",
    description_en: "Sculptural forms that celebrate texture, light, and understated elegance in modern living.",
    description_th: "งานประติมากรรมที่เติมเสน่ห์อันเรียบสงบและมีมิติให้กับพื้นที่",
  },
  {
    title_en: "BOOKED",
    title_th: "ตกแต่งชั้นหนังสือ",
    slug: "booked",
    category_query: "BOOKED",
    description_en: "Bookends and shelf decor designed to bring structure and sophistication to your book collection.",
    description_th: "ของตกแต่งชั้นหนังสือและที่คั่นหนังสือสะท้อนรสนิยมอันสง่างาม",
  },
  {
    title_en: "CANDLE HOLDERS",
    title_th: "เชิงเทียน",
    slug: "candle-holders",
    category_query: "CANDLE HOLDERS",
    description_en: "Candle holders with sculptural forms that cast a warm, intimate glow over living spaces.",
    description_th: "เชิงเทียนช่วยเติมบรรยากาศอบอุ่นและความโรแมนติกในทุกช่วงเวลา",
  },
  {
    title_en: "ACCESSORIES",
    title_th: "ของตกแต่งอื่น ๆ",
    slug: "accessories",
    category_query: "Accessories",
    description_en: "Curated home accessories that add subtle depth and finishing touches to every interior.",
    description_th: "ของตกแต่งและพร็อพคัดสรรพิเศษเพื่อสร้างบรรยากาศที่สมบูรณ์แบบ",
  },
  {
    title_en: "DINING & TABLEWARE",
    title_th: "เครื่องใช้บนโต๊ะอาหาร",
    slug: "dining-and-tableware",
    category_query: "Dining",
    description_en: "Refined tableware and dining accents that make everyday dining feel like a special occasion.",
    description_th: "เครื่องใช้บนโต๊ะอาหารดีไซน์ประณีต ยกระดับทุกมื้ออาหาร",
  },
  {
    title_en: "DRESSING & BATH",
    title_th: "ของใช้ในห้องน้ำและห้องแต่งตัว",
    slug: "dressing-and-bath",
    category_query: "Bath",
    description_en: "Thoughtfully crafted accents for the bath and vanity that promote calm, orderly routines.",
    description_th: "ของใช้และของตกแต่งห้องแต่งตัวและห้องน้ำเพื่อความผ่อนคลาย",
  },
  {
    title_en: "ART & WALL DECOR",
    title_th: "งานศิลปะและของตกแต่งผนัง",
    slug: "art-and-wall-decor",
    category_query: "Wall Decor",
    description_en: "Wall art and decorative hanging pieces that transform empty walls into inspired galleries.",
    description_th: "งานศิลปะและของตกแต่งผนังเพิ่มมิติและเรื่องราวให้กับพื้นที่",
  },
]

export default function WebGalleryClient({ initialCategories, fetchError }: WebGalleryClientProps) {
  const [categories, setCategories] = useState<JournalCategory[]>(initialCategories)
  const [search, setSearch] = useState("")
  const [isPending, startTransition] = useTransition()

  // Modal หมวดหมู่
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Partial<JournalCategory> | null>(null)

  // Drawer / View จัดการรูปภาพในหมวดหมู่
  const [selectedCategory, setSelectedCategory] = useState<JournalCategory | null>(null)
  const [categoryImages, setCategoryImages] = useState<JournalImageItem[]>([])
  const [isLoadingImages, setIsLoadingImages] = useState(false)

  // การเลือกรูปภาพเพื่อจัดการเป็นชุด (Batch Select)
  const [selectedImageIds, setSelectedImageIds] = useState<number[]>([])
  const [targetMoveCategoryId, setTargetMoveCategoryId] = useState<string>("")

  // Modal เพิ่มหลายรูป (Batch Add URLs)
  const [isBatchAddOpen, setIsBatchAddOpen] = useState(false)
  const [bulkUrlsInput, setBulkUrlsInput] = useState("")

  // Toast Notification
  const [toastMsg, setToastMsg] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 3000)
  }

  // กรองหมวดหมู่ตามช่องค้นหา
  const filteredCategories = categories.filter(c => 
    c.title_en.toLowerCase().includes(search.toLowerCase()) ||
    (c.title_th && c.title_th.toLowerCase().includes(search.toLowerCase())) ||
    c.slug.toLowerCase().includes(search.toLowerCase()) ||
    (c.category_query && c.category_query.toLowerCase().includes(search.toLowerCase()))
  )

  // คำนวณสถิติภาพรวม
  const totalImagesCount = categories.reduce((sum, c) => sum + (c.images_count || 0), 0)
  const activeCategoriesCount = categories.filter(c => c.is_active).length

  // โหลดรูปภาพทั้งหมดของหมวดหมู่ที่เลือก
  const handleOpenImagesManager = async (cat: JournalCategory) => {
    setSelectedCategory(cat)
    setSelectedImageIds([])
    setIsLoadingImages(true)
    try {
      const res = await getJournalCategoryWithImages(cat.id)
      if (res.error) {
        alert(res.error)
      } else {
        setCategoryImages(res.images)
      }
    } catch (err: any) {
      alert("โหลดรูปภาพไม่สำเร็จ: " + err.message)
    } finally {
      setIsLoadingImages(false)
    }
  }

  // สลับการเลือกรูปภาพ
  const toggleSelectImage = (id: number) => {
    setSelectedImageIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    )
  }

  // เลือกทั้งหมด / ยกเลิกการเลือก
  const handleToggleSelectAll = () => {
    if (selectedImageIds.length === categoryImages.length) {
      setSelectedImageIds([])
    } else {
      setSelectedImageIds(categoryImages.map(img => img.id))
    }
  }

  // ย้ายรูปภาพที่เลือกไปยังหมวดหมู่อื่น (Move Selected Images)
  const handleMoveSelectedImages = async () => {
    if (!targetMoveCategoryId) {
      alert("กรุณาเลือกหมวดหมู่ปลายทางที่ต้องการย้ายไป")
      return
    }
    if (selectedImageIds.length === 0) {
      alert("กรุณาเลือกรูปภาพที่ต้องการย้าย")
      return
    }

    const targetCat = categories.find(c => c.id === targetMoveCategoryId)

    startTransition(async () => {
      const res = await moveJournalImages(selectedImageIds, targetMoveCategoryId)
      if (res.error) {
        alert("ย้ายรูปภาพไม่สำเร็จ: " + res.error)
      } else {
        showToast(`📦 ย้ายรูปภาพ ${res.count} รูป ไปยังหมวด "${targetCat?.title_en || 'เป้าหมาย'}" สำเร็จ!`)
        // ลบรูปที่ย้ายออกจากหน้านี้
        setCategoryImages(prev => prev.filter(img => !selectedImageIds.includes(img.id)))
        // อัปเดตตัวเลขนับจำนวนรูปใน categories state
        setCategories(prev => prev.map(c => {
          if (c.id === selectedCategory?.id) {
            return { ...c, images_count: Math.max(0, (c.images_count || 0) - selectedImageIds.length) }
          }
          if (c.id === targetMoveCategoryId) {
            return { ...c, images_count: (c.images_count || 0) + selectedImageIds.length }
          }
          return c
        }))
        setSelectedImageIds([])
        setTargetMoveCategoryId("")
      }
    })
  }

  // บันทึกหมวดหมู่ (เพิ่มใหม่ / แก้ไข)
  const handleSaveCategorySubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingCategory?.title_en || !editingCategory?.slug) {
      alert("กรุณากรอกชื่อภาษาอังกฤษ และ Slug")
      return
    }

    startTransition(async () => {
      const res = await saveJournalCategory({
        id: editingCategory.id,
        slug: editingCategory.slug!,
        sort_order: Number(editingCategory.sort_order) || 0,
        title_en: editingCategory.title_en!,
        title_th: editingCategory.title_th || null,
        description_en: editingCategory.description_en || null,
        description_th: editingCategory.description_th || null,
        category_query: editingCategory.category_query || null,
        cover_image_url: editingCategory.cover_image_url || null,
        is_active: editingCategory.is_active ?? true,
      })

      if (res.error) {
        alert("บันทึกไม่สำเร็จ: " + res.error)
      } else {
        showToast("✅ บันทึกข้อมูลหมวดหมู่เรียบร้อยแล้ว!")
        setIsCategoryModalOpen(false)
        setEditingCategory(null)
        window.location.reload()
      }
    })
  }

  // ลบหมวดหมู่
  const handleDeleteCategory = async (cat: JournalCategory) => {
    if (!window.confirm(`คุณแน่ใจหรือไม่ที่จะลบหมวดหมู่ "${cat.title_en}"?\n(รูปภาพทั้งหมดในหมวดนี้ ${cat.images_count || 0} รูป จะถูกลบไปด้วย)`)) {
      return
    }

    startTransition(async () => {
      const res = await deleteJournalCategory(cat.id)
      if (res.error) {
        alert("ลบไม่สำเร็จ: " + res.error)
      } else {
        setCategories(prev => prev.filter(c => c.id !== cat.id))
        showToast("🗑️ ลบหมวดหมู่เรียบร้อยแล้ว!")
      }
    })
  }

  // สลับสถานะเปิด/ปิดการแสดงผลหมวดหมู่
  const handleToggleCategoryActive = async (cat: JournalCategory) => {
    const updatedStatus = !cat.is_active
    setCategories(prev => prev.map(c => c.id === cat.id ? { ...c, is_active: updatedStatus } : c))

    await saveJournalCategory({
      id: cat.id,
      slug: cat.slug,
      sort_order: cat.sort_order,
      title_en: cat.title_en,
      title_th: cat.title_th,
      description_en: cat.description_en,
      description_th: cat.description_th,
      category_query: cat.category_query,
      cover_image_url: cat.cover_image_url,
      is_active: updatedStatus,
    })
    showToast(updatedStatus ? "👁️ เปิดการแสดงผลแล้ว" : "🔒 ซ่อนการแสดงผลแล้ว")
  }

  // เพิ่มรูปภาพเป็นชุด (Batch Add Image URLs)
  const handleBulkAddImagesSubmit = async () => {
    if (!selectedCategory) return
    const rawUrls = bulkUrlsInput
      .split(/[\n,]+/)
      .map(u => u.trim())
      .filter(u => u.startsWith("http://") || u.startsWith("https://"))

    if (rawUrls.length === 0) {
      alert("กรุณากรอก URL รูปภาพอย่างน้อย 1 รายการ")
      return
    }

    startTransition(async () => {
      const res = await addJournalImages(selectedCategory.id, rawUrls)
      if (res.error) {
        alert("เพิ่มรูปภาพไม่สำเร็จ: " + res.error)
      } else {
        showToast(`✨ เพิ่มรูปภาพสำเร็จ ${res.count} รูป!`)
        setBulkUrlsInput("")
        setIsBatchAddOpen(false)
        handleOpenImagesManager(selectedCategory)
      }
    })
  }

  // ลบรูปภาพที่เลือกหลายรูป
  const handleDeleteSelectedImages = async () => {
    if (selectedImageIds.length === 0) return
    if (!window.confirm(`คุณแน่ใจหรือไม่ที่จะลบรูปภาพ ${selectedImageIds.length} รูปที่เลือกนี้?`)) return

    startTransition(async () => {
      const res = await deleteJournalImages(selectedImageIds)
      if (res.error) {
        alert("ลบไม่สำเร็จ: " + res.error)
      } else {
        setCategoryImages(prev => prev.filter(img => !selectedImageIds.includes(img.id)))
        showToast(`🗑️ ลบรูปภาพ ${selectedImageIds.length} รูปเรียบร้อย!`)
        setSelectedImageIds([])
      }
    })
  }

  // ลบรูปภาพเดี่ยว
  const handleDeleteSingleImage = async (imageId: number) => {
    if (!window.confirm("คุณต้องการลบรูปภาพนี้ใช่หรือไม่?")) return

    startTransition(async () => {
      const res = await deleteJournalImages([imageId])
      if (res.error) {
        alert("ลบไม่สำเร็จ: " + res.error)
      } else {
        setCategoryImages(prev => prev.filter(img => img.id !== imageId))
        showToast("🗑️ ลบรูปภาพเรียบร้อยแล้ว!")
      }
    })
  }

  // สลับสถานะเปิด/ปิด รูปภาพ
  const handleToggleImageActive = async (img: JournalImageItem) => {
    const nextStatus = !img.is_active
    setCategoryImages(prev => prev.map(i => i.id === img.id ? { ...i, is_active: nextStatus } : i))
    await updateJournalImage(img.id, { is_active: nextStatus })
    showToast(nextStatus ? "แสดงรูปภาพนี้" : "ซ่อนรูปภาพนี้")
  }

  // ตั้งเป็นรูปปกหมวดหมู่ (Set as Cover Image)
  const handleSetAsCover = async (imgUrl: string) => {
    if (!selectedCategory) return
    startTransition(async () => {
      await saveJournalCategory({
        id: selectedCategory.id,
        slug: selectedCategory.slug,
        sort_order: selectedCategory.sort_order,
        title_en: selectedCategory.title_en,
        cover_image_url: imgUrl,
      })
      setSelectedCategory(prev => prev ? { ...prev, cover_image_url: imgUrl } : null)
      setCategories(prev => prev.map(c => c.id === selectedCategory.id ? { ...c, cover_image_url: imgUrl } : c))
      showToast("🌟 ตั้งเป็นรูปปกหมวดหมู่เรียบร้อย!")
    })
  }

  // ย้ายลำดับรูปภาพขึ้น / ลง
  const handleMoveImage = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= categoryImages.length) return

    const newImages = [...categoryImages]
    const temp = newImages[index]
    newImages[index] = newImages[targetIndex]
    newImages[targetIndex] = temp

    const updatedPayload = newImages.map((img, idx) => ({
      id: img.id,
      sort_order: idx + 1,
    }))

    setCategoryImages(newImages.map((img, idx) => ({ ...img, sort_order: idx + 1 })))

    startTransition(async () => {
      await reorderJournalImages(updatedPayload)
      showToast("🔄 บันทึกลำดับรูปภาพเรียบร้อย!")
    })
  }

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 text-sm font-medium border border-slate-700">
          <Sparkles size={18} className="text-amber-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {fetchError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl text-sm">
          ⚠️ เกิดข้อผิดพลาดในการโหลดข้อมูล: {fetchError}
        </div>
      )}

      {/* VIEW 1: ถ้าเปิดหน้าจัดการรูปภาพในหมวดหมู่ */}
      {selectedCategory ? (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Header ย้อนกลับและข้อมูลหมวดหมู่ */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  setSelectedCategory(null)
                  setSelectedImageIds([])
                }}
                className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors flex items-center justify-center cursor-pointer"
                title="กลับหน้ารวมหมวดหมู่"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 text-xs font-bold rounded-md">
                    ลำดับ {selectedCategory.sort_order}
                  </span>
                  <h1 className="text-xl font-bold text-slate-800">
                    {selectedCategory.title_en} {selectedCategory.title_th && `(${selectedCategory.title_th})`}
                  </h1>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Slug: <code className="text-blue-600 bg-blue-50 px-1 py-0.5 rounded">{selectedCategory.slug}</code> | 
                  ทั้งหมด {categoryImages.length} รูป
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <button
                onClick={() => setIsBatchAddOpen(true)}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm cursor-pointer"
              >
                <Plus size={18} />
                + เพิ่มรูปภาพ (วางหลายลิงก์)
              </button>
            </div>
          </div>

          {/* แถบเครื่องมือ "ย้ายรูปภาพข้ามหมวดหมู่" เมื่อมีการเลือกรูป (Multi-Select Action Bar) */}
          {selectedImageIds.length > 0 && (
            <div className="bg-emerald-600 text-white p-4 rounded-2xl shadow-lg flex flex-wrap items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4">
              <div className="flex items-center gap-3">
                <span className="bg-white/20 px-3 py-1 rounded-lg text-sm font-bold">
                  เลือกแล้ว {selectedImageIds.length} รูป
                </span>
                <button
                  onClick={handleToggleSelectAll}
                  className="text-xs font-semibold underline hover:text-emerald-100 cursor-pointer"
                >
                  {selectedImageIds.length === categoryImages.length ? "ยกเลิกการเลือกทั้งหมด" : "เลือกทั้งหมด"}
                </button>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Dropdown เลือกหมวดหมู่ปลายทาง */}
                <div className="flex items-center gap-2 bg-white text-slate-800 p-1 rounded-xl shadow-sm">
                  <span className="text-xs font-bold text-slate-500 pl-2">ย้ายไปหมวด:</span>
                  <select
                    value={targetMoveCategoryId}
                    onChange={(e) => setTargetMoveCategoryId(e.target.value)}
                    className="text-xs font-semibold py-1.5 px-2 bg-slate-50 rounded-lg outline-none cursor-pointer border border-slate-200"
                  >
                    <option value="">-- เลือกหมวดหมู่เป้าหมาย --</option>
                    {categories
                      .filter(c => c.id !== selectedCategory.id)
                      .map(c => (
                        <option key={c.id} value={c.id}>
                          {c.title_en} ({c.title_th || c.slug})
                        </option>
                      ))
                    }
                  </select>
                  <button
                    onClick={handleMoveSelectedImages}
                    disabled={!targetMoveCategoryId || isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    {isPending ? <Loader2 size={14} className="animate-spin" /> : <FolderInput size={14} />}
                    ย้ายรูปทันที
                  </button>
                </div>

                <button
                  onClick={handleDeleteSelectedImages}
                  disabled={isPending}
                  className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm cursor-pointer"
                >
                  <Trash2 size={14} />
                  ลบที่เลือก
                </button>
              </div>
            </div>
          )}

          {/* ตาราง/การ์ดรูปภาพในหมวดหมู่นี้ */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            {isLoadingImages ? (
              <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
                <Loader2 size={32} className="animate-spin text-blue-600" />
                <p className="text-sm">กำลังโหลดรายการรูปภาพในหมวดหมู่นี้...</p>
              </div>
            ) : categoryImages.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3 text-center">
                <ImageIcon size={48} className="opacity-30" />
                <h3 className="font-bold text-slate-700">ยังไม่มีรูปภาพในหมวดหมู่นี้</h3>
                <p className="text-xs text-slate-400 max-w-md">
                  คุณสามารถเพิ่มรูปภาพใหม่ หรือย้ายรูปภาพจากหมวด &quot;ALL ITEMS&quot; มาใส่ในหมวดนี้ได้เลยครับ
                </p>
                <button
                  onClick={() => setIsBatchAddOpen(true)}
                  className="mt-2 flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  <Plus size={16} /> วางลิงก์รูปภาพตอนนี้
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 text-xs font-semibold text-slate-500">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleToggleSelectAll}
                      className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 font-bold cursor-pointer"
                    >
                      {selectedImageIds.length === categoryImages.length ? <CheckSquare size={16} /> : <Square size={16} />}
                      {selectedImageIds.length === categoryImages.length ? "ยกเลิกการเลือก" : "เลือกทั้งหมดในหมวดนี้"}
                    </button>
                    <span>({categoryImages.length} รูป)</span>
                  </div>
                  <span className="text-slate-400">คลิกที่รูปเพื่อเลือก / กดย้ายข้ามหมวดได้ง่ายๆ</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {categoryImages.map((img, idx) => {
                    const isCover = selectedCategory.cover_image_url === img.image_url
                    const isSelected = selectedImageIds.includes(img.id)

                    return (
                      <div
                        key={img.id}
                        onClick={() => toggleSelectImage(img.id)}
                        className={`group bg-white border rounded-xl overflow-hidden shadow-sm transition-all duration-200 flex flex-col relative cursor-pointer ${
                          isSelected
                            ? 'ring-2 ring-emerald-500 border-emerald-500 bg-emerald-50/20'
                            : isCover
                            ? 'ring-2 ring-blue-500 border-blue-500'
                            : 'border-slate-200 hover:border-blue-300'
                        } ${!img.is_active ? 'opacity-60 bg-slate-50' : ''}`}
                      >
                        {/* Checkbox เลือกรูป */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleSelectImage(img.id)
                          }}
                          className={`absolute top-2 left-2 z-20 p-1 rounded-lg transition-all ${
                            isSelected
                              ? 'bg-emerald-500 text-white opacity-100'
                              : 'bg-white/80 text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-white hover:text-emerald-500'
                          }`}
                        >
                          {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                        </button>

                        {/* ป้ายลำดับ & สถานะ Cover */}
                        <div className="absolute top-2 left-9 z-10 flex gap-1 items-center">
                          <span className="bg-slate-900/80 backdrop-blur-sm text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow">
                            #{idx + 1}
                          </span>
                          {isCover && (
                            <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow">
                              รูปปก
                            </span>
                          )}
                        </div>

                        {/* ปุ่มควบคุมด้านขวาบน */}
                        <div className="absolute top-2 right-2 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleToggleImageActive(img)
                            }}
                            className="p-1 bg-white/90 hover:bg-white text-slate-600 rounded shadow text-xs"
                            title={img.is_active ? "ซ่อนรูปนี้" : "แสดงรูปนี้"}
                          >
                            {img.is_active ? <Eye size={14} /> : <EyeOff size={14} className="text-rose-500" />}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteSingleImage(img.id)
                            }}
                            className="p-1 bg-white/90 hover:bg-white text-rose-600 rounded shadow text-xs"
                            title="ลบรูปนี้"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>

                        {/* Preview Image */}
                        <div className="aspect-square bg-slate-100 relative overflow-hidden flex items-center justify-center p-2">
                          <img
                            src={img.image_url}
                            alt={img.alt_text || `Journal Image ${idx + 1}`}
                            className={`max-w-full max-h-full object-contain transition-transform duration-300 ${isSelected ? 'scale-95' : 'group-hover:scale-105'}`}
                            loading="lazy"
                          />
                        </div>

                        {/* Footer Controls */}
                        <div 
                          className="p-2 bg-white border-t border-slate-100 flex flex-col gap-1.5 mt-auto"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-between text-[11px] text-slate-500">
                            <span className="truncate max-w-[90px]" title={img.image_url}>
                              {img.image_url.split('/').pop()}
                            </span>
                            <div className="flex items-center gap-0.5">
                              <button
                                type="button"
                                onClick={() => handleMoveImage(idx, 'up')}
                                disabled={idx === 0}
                                className="p-1 text-slate-400 hover:text-blue-600 disabled:opacity-20 rounded"
                                title="ย้ายขึ้น"
                              >
                                <MoveUp size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMoveImage(idx, 'down')}
                                disabled={idx === categoryImages.length - 1}
                                className="p-1 text-slate-400 hover:text-blue-600 disabled:opacity-20 rounded"
                                title="ย้ายลง"
                              >
                                <MoveDown size={13} />
                              </button>
                            </div>
                          </div>

                          {!isCover && (
                            <button
                              type="button"
                              onClick={() => handleSetAsCover(img.image_url)}
                              className="w-full py-1 bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-600 text-[10px] font-semibold rounded transition-colors text-center cursor-pointer"
                            >
                              ตั้งเป็นรูปปก
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* VIEW 2: หน้ารวมหมวดหมู่ทั้งหมด (Main Categories Grid) */
        <div className="space-y-6">
          {/* Header Bar */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                <Images size={26} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">จัดการ แกลเลอลี่หน้าเว็ป (Journal Collections)</h1>
                <p className="text-xs text-slate-500 mt-1">
                  จัดการหมวดหมู่ รูปภาพ (90+ รูป) และคำอธิบาย 2 ภาษา สำหรับแสดงผลบนหน้า Journal เว็บไซต์
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <button
                onClick={() => {
                  setEditingCategory({
                    sort_order: categories.length + 1,
                    is_active: true,
                    title_en: "",
                    title_th: "",
                    slug: "",
                    category_query: "",
                    description_en: "",
                    description_th: "",
                    cover_image_url: "",
                  })
                  setIsCategoryModalOpen(true)
                }}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm cursor-pointer"
              >
                <Plus size={18} />
                + เพิ่มหมวดหมู่ใหม่
              </button>
            </div>
          </div>

          {/* Quick Stats & Search Bar */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400">หมวดหมู่ทั้งหมด</p>
                <h3 className="text-xl font-bold text-slate-800 mt-0.5">{categories.length} หมวด</h3>
              </div>
              <div className="p-2.5 bg-slate-50 text-slate-600 rounded-lg">
                <Layers size={20} />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400">รูปภาพในระบบ</p>
                <h3 className="text-xl font-bold text-blue-600 mt-0.5">{totalImagesCount} รูป</h3>
              </div>
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
                <ImageIcon size={20} />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400">เปิดแสดงผลหน้าเว็บ</p>
                <h3 className="text-xl font-bold text-emerald-600 mt-0.5">{activeCategoriesCount} หมวด</h3>
              </div>
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
                <Eye size={20} />
              </div>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center">
              <div className="relative w-full">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="ค้นหาหมวดหมู่, Slug..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Grid Cards หมวดหมู่ */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCategories.map((cat) => (
              <div
                key={cat.id}
                className={`bg-white rounded-2xl border transition-all duration-200 shadow-sm hover:shadow-md flex flex-col overflow-hidden ${
                  cat.is_active ? 'border-slate-200' : 'border-slate-200 opacity-60 bg-slate-50/50'
                }`}
              >
                {/* Cover Image & Category Badges */}
                <div className="relative h-48 bg-slate-100 overflow-hidden group">
                  {cat.cover_image_url ? (
                    <img
                      src={cat.cover_image_url}
                      alt={cat.title_en}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 gap-2">
                      <ImageIcon size={36} />
                      <span className="text-xs">ยังไม่มีรูปหน้าปก</span>
                    </div>
                  )}

                  {/* Badges on Top */}
                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <span className="px-2.5 py-1 bg-slate-900/80 backdrop-blur-sm text-white text-xs font-bold rounded-lg shadow">
                      #{String(cat.sort_order).padStart(2, '0')}
                    </span>
                    <span className="px-2.5 py-1 bg-blue-600/90 backdrop-blur-sm text-white text-xs font-semibold rounded-lg shadow">
                      {cat.images_count || 0} รูป
                    </span>
                  </div>

                  {/* Toggle Active Button */}
                  <button
                    onClick={() => handleToggleCategoryActive(cat)}
                    className="absolute top-3 right-3 p-2 bg-white/90 hover:bg-white text-slate-700 rounded-lg shadow transition-colors text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    title={cat.is_active ? "คลิกเพื่อซ่อน" : "คลิกเพื่อเปิดแสดง"}
                  >
                    {cat.is_active ? <Eye size={14} className="text-emerald-600" /> : <EyeOff size={14} className="text-rose-500" />}
                    <span>{cat.is_active ? "เปิดอยู่" : "ซ่อน"}</span>
                  </button>
                </div>

                {/* Content Info */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-slate-800 tracking-tight">
                        {cat.title_en}
                      </h3>
                      <code className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                        /{cat.slug}
                      </code>
                    </div>

                    {cat.title_th && (
                      <p className="text-xs font-medium text-slate-500 mt-0.5">
                        {cat.title_th}
                      </p>
                    )}

                    {cat.description_th && (
                      <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                        {cat.description_th}
                      </p>
                    )}

                    {cat.category_query && (
                      <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg w-fit font-medium">
                        <span>ลิงก์สินค้า:</span>
                        <span className="font-bold">{cat.category_query}</span>
                      </div>
                    )}
                  </div>

                  {/* 4-Image Strip Preview */}
                  {cat.preview_images && cat.preview_images.length > 0 && (
                    <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100">
                      {cat.preview_images.map((img, idx) => (
                        <div key={idx} className="w-12 h-12 rounded-lg bg-slate-100 overflow-hidden border border-slate-200">
                          <img src={img} alt="" className="w-full h-full object-cover" />
                        </div>
                      ))}
                      {(cat.images_count || 0) > 4 && (
                        <div className="w-12 h-12 rounded-lg bg-slate-50 border border-dashed border-slate-300 flex items-center justify-center text-[10px] font-bold text-slate-400">
                          +{(cat.images_count || 0) - 4}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions Buttons */}
                  <div className="flex items-center gap-2 pt-2">
                    <button
                      onClick={() => handleOpenImagesManager(cat)}
                      className="flex-1 flex items-center justify-center gap-2 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                    >
                      <ImageIcon size={15} />
                      จัดการรูปภาพ ({cat.images_count || 0})
                    </button>
                    <button
                      onClick={() => {
                        setEditingCategory(cat)
                        setIsCategoryModalOpen(true)
                      }}
                      className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                      title="แก้ไขข้อมูลหมวดหมู่"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(cat)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                      title="ลบหมวดหมู่นี้"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL 1: เพิ่ม/แก้ไข ข้อมูลหมวดหมู่ (Category Form with Presets) */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-100 overflow-hidden my-8">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-lg">
                {editingCategory?.id ? "✏️ แก้ไขหมวดหมู่" : "✨ เพิ่มหมวดหมู่ใหม่"}
              </h3>
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveCategorySubmit} className="p-6 space-y-4">
              {/* Quick Template Presets */}
              {!editingCategory?.id && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-2">
                    <Wand2 size={14} className="text-amber-500" />
                    <span>เลือกสร้างจากแม่แบบด่วน (1 คลิก):</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {CATEGORY_PRESETS.map((preset) => (
                      <button
                        key={preset.slug}
                        type="button"
                        onClick={() => {
                          setEditingCategory(prev => ({
                            ...prev,
                            title_en: preset.title_en,
                            title_th: preset.title_th,
                            slug: preset.slug,
                            category_query: preset.category_query,
                            description_en: preset.description_en,
                            description_th: preset.description_th,
                          }))
                        }}
                        className="px-2.5 py-1 bg-white hover:bg-blue-50 hover:text-blue-600 text-slate-600 text-xs font-semibold rounded-lg border border-slate-200 shadow-xs transition-colors cursor-pointer"
                      >
                        + {preset.title_en}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ชื่อภาษาอังกฤษ (EN) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น ORNAMENT"
                    value={editingCategory?.title_en || ""}
                    onChange={(e) => setEditingCategory(prev => ({ ...prev, title_en: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ชื่อภาษาไทย (TH)
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น ของประดับตกแต่ง"
                    value={editingCategory?.title_th || ""}
                    onChange={(e) => setEditingCategory(prev => ({ ...prev, title_th: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Slug (URL Path) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น ornament, candle-holders"
                    value={editingCategory?.slug || ""}
                    onChange={(e) => setEditingCategory(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ลำดับการแสดงผล (Sort Order)
                  </label>
                  <input
                    type="number"
                    value={editingCategory?.sort_order ?? 1}
                    onChange={(e) => setEditingCategory(prev => ({ ...prev, sort_order: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  หมวดหมู่สินค้าปลายทาง (Category Query)
                </label>
                <input
                  type="text"
                  placeholder="เช่น Sculpture, BOOKED, Accessories (สำหรับกดลิงก์ไปหน้าสินค้า)"
                  value={editingCategory?.category_query || ""}
                  onChange={(e) => setEditingCategory(prev => ({ ...prev, category_query: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  URL รูปหน้าปกหลัก (Cover Image URL)
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={editingCategory?.cover_image_url || ""}
                  onChange={(e) => setEditingCategory(prev => ({ ...prev, cover_image_url: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs"
                />
                {editingCategory?.cover_image_url && (
                  <div className="mt-2 w-full h-32 rounded-xl bg-slate-100 overflow-hidden border border-slate-200 flex items-center justify-center">
                    <img src={editingCategory.cover_image_url} alt="Cover Preview" className="h-full w-full object-contain" />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  คำอธิบายภาษาอังกฤษ (EN Description)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ornaments that bring a quiet sense of character..."
                  value={editingCategory?.description_en || ""}
                  onChange={(e) => setEditingCategory(prev => ({ ...prev, description_en: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  คำอธิบายภาษาไทย (TH Description)
                </label>
                <textarea
                  rows={2}
                  placeholder="ของประดับที่เติมเสน่ห์อย่างเรียบสงบให้กับพื้นที่..."
                  value={editingCategory?.description_th || ""}
                  onChange={(e) => setEditingCategory(prev => ({ ...prev, description_th: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="is_active_toggle"
                  checked={editingCategory?.is_active ?? true}
                  onChange={(e) => setEditingCategory(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <label htmlFor="is_active_toggle" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  เปิดแสดงผลบนหน้าเว็บไซต์ (Active)
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl transition-colors font-medium cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {isPending && <Loader2 size={16} className="animate-spin" />}
                  บันทึกข้อมูล
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: เพิ่มรูปภาพทีละหลายรูป (Bulk Paste Image URLs) */}
      {isBatchAddOpen && selectedCategory && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-100 overflow-hidden my-8">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">
                  📥 วางหลายลิงก์รูปภาพ ({selectedCategory.title_en})
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  วาง URL รูปภาพที่คัดลอกมาจากหน้า Gallery (สามารถวางทีละ 10 - 90 ลิงก์ได้เลยครับ)
                </p>
              </div>
              <button
                onClick={() => setIsBatchAddOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  วางรายการ URL รูปภาพ (บรรทัดละ 1 ลิงก์):
                </label>
                <textarea
                  rows={8}
                  placeholder={`https://pub-xxx.r2.dev/original/1781170108353-289.webp\nhttps://pub-xxx.r2.dev/original/1781493997242-568.webp\nhttps://pub-xxx.r2.dev/original/1781494014928-487.webp`}
                  value={bulkUrlsInput}
                  onChange={(e) => setBulkUrlsInput(e.target.value)}
                  className="w-full p-3 border border-slate-200 rounded-xl text-xs font-mono outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Preview จำนวนลิงก์ที่ตรวจพบ */}
              {(() => {
                const detected = bulkUrlsInput
                  .split(/[\n,]+/)
                  .map(u => u.trim())
                  .filter(u => u.startsWith("http://") || u.startsWith("https://"))
                return (
                  <div className="flex items-center justify-between text-xs px-3 py-2 bg-blue-50 text-blue-800 rounded-xl font-medium">
                    <span>ตรวจพบ URL ที่ถูกต้อง:</span>
                    <span className="font-bold">{detected.length} ลิงก์</span>
                  </div>
                )
              })()}

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsBatchAddOpen(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl transition-colors font-medium cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleBulkAddImagesSubmit}
                  disabled={isPending}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {isPending ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
                  เพิ่มรูปภาพทั้งหมดเข้าหมวดนี้
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
