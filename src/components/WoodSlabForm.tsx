"use client"

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createInitialProduct, updateProduct, deleteProduct, uploadProductImage } from '../actions/woodslab'
import { 
  Loader2, UploadCloud, X, 
  PackagePlus, RotateCcw, Save, Image as ImageIcon, 
  Images, Plus, CheckCircle, AlertCircle, Info, Trash2, Edit,
  Layers, Hammer, Box, Armchair, Copy, Check, RefreshCw, FolderOpen, Sparkles
} from 'lucide-react'

const UPLOAD_MAX_BYTES = 350 * 1024 
const UPLOAD_MAX_DIM = 1600 

type CategoryType = 'SLABS' | 'rough_wood' | 'prop' | 'furniture'

export default function WoodSlabForm({ 
  initialData, 
  canViewCosts = true,
  initialCategory = 'SLABS'
}: { 
  initialData?: any
  canViewCosts?: boolean 
  initialCategory?: CategoryType
}) {
  const router = useRouter()
  const isEditMode = !!initialData

  const resolvedInitialCat: CategoryType = (
    initialData?.category_id === 'prop' ? 'prop' :
    initialData?.category_id === 'furniture' ? 'furniture' :
    initialData?.category_id === 'rough_wood' ? 'rough_wood' :
    initialData?.category_id ? 'SLABS' : initialCategory
  )

  const [activeCategory, setActiveCategory] = useState<CategoryType>(resolvedInitialCat)
  const [loading, setLoading] = useState(false)
  const [loadingText, setLoadingText] = useState('')
  const [progress, setProgress] = useState(0)
  const [toast, setToast] = useState<{ title: string, msg: string, type: 'success'|'error'|'info' } | null>(null)
  const [cacheBuster, setCacheBuster] = useState<number>(0)
  const [copiedUrl, setCopiedUrl] = useState(false)

  const [mainFile, setMainFile] = useState<File | null>(null)
  const [existingMainPath, setExistingMainPath] = useState<string | null>(initialData?.image_url || null)
  const [extraFiles, setExtraFiles] = useState<{ file: File, id: number }[]>([])
  const [existingExtraImages, setExistingExtraImages] = useState<Array<{ path: string; sort?: number; role?: string; replacementFile?: File }>>([])

  const mainInputRef = useRef<HTMLInputElement>(null)
  const extraInputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  const colGroup = Array.isArray(initialData?.collection_groups)
    ? initialData?.collection_groups[0]
    : initialData?.collection_groups

  useEffect(() => {
    if (initialData) {
      setExistingMainPath(initialData.image_url || null)
      if (Array.isArray(initialData.specs?.images)) {
        setExistingExtraImages(initialData.specs.images)
      }
      if (initialData.category_id === 'prop' || initialData.category_id === 'furniture' || initialData.category_id === 'rough_wood' || initialData.category_id === 'SLABS') {
        setActiveCategory(initialData.category_id)
      }
    }
  }, [initialData])

  const showToast = (title: string, msg: string, type: 'success'|'error'|'info' = 'info') => {
    setToast({ title, msg, type })
    setTimeout(() => setToast(null), 4500)
  }

  const getDisplayUrl = (url: string | null | undefined) => {
    if (!url) return ""
    if (!cacheBuster) return url
    return url.includes('?') ? `${url}&_cb=${cacheBuster}` : `${url}?_cb=${cacheBuster}`
  }

  const parseDims = (sizeText: string) => {
    const nums = sizeText.match(/(\d+(?:\.\d+)?)/g)?.map(Number) || []
    if (nums.length < 3) return null
    const length = nums[0]
    const thickness = nums[nums.length - 1]
    const mid = nums.slice(1, -1)
    const width = mid.length ? Math.max(...mid) : nums[1]
    return { l: length, w: width, t: thickness }
  }

  const blobToWebpSmart = async (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = document.createElement('img')
      const src = URL.createObjectURL(file)
      img.onload = async () => {
        URL.revokeObjectURL(src)
        let w = img.width, h = img.height
        let scale = Math.min(1, UPLOAD_MAX_DIM / Math.max(w, h))

        for (let pass = 0; pass < 2; pass++) {
          const canvas = document.createElement("canvas")
          canvas.width = Math.max(1, Math.round(w * scale))
          canvas.height = Math.max(1, Math.round(h * scale))
          const ctx = canvas.getContext("2d")
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height)

          let q = 0.82
          let out: Blob | null = await new Promise(res => canvas.toBlob(blob => res(blob), "image/webp", q))

          while (out && out.size > UPLOAD_MAX_BYTES && q > 0.55) {
            q -= 0.07
            out = await new Promise(res => canvas.toBlob(blob => res(blob), "image/webp", q))
          }
          
          if (out && out.size <= UPLOAD_MAX_BYTES) {
            resolve(out)
            return
          }
          scale *= 0.85 
        }
        
        const canvas = document.createElement("canvas")
        canvas.width = Math.max(1, Math.round(w * scale))
        canvas.height = Math.max(1, Math.round(h * scale))
        const ctx = canvas.getContext("2d")
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height)
        canvas.toBlob(blob => resolve(blob!), "image/webp", 0.6)
      }
      img.onerror = reject
      img.src = src
    })
  }

  const smartUploadImage = async (params: {
    blob: Blob
    existingUrl?: string | null
    productId: string | number
    role: 'main' | 'extra' | 'group'
  }) => {
    const formData = new FormData()
    formData.append('file', params.blob, `${params.role}.webp`)
    if (params.existingUrl) {
      formData.append('existingUrl', params.existingUrl)
    }
    formData.append('productId', String(params.productId))
    formData.append('role', params.role)

    const res = await uploadProductImage(formData)
    if (res.error || !res.url) throw new Error(res.error || 'อัปโหลดรูปภาพไม่สำเร็จ')
    return res
  }

  const handleMainFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setMainFile(e.target.files[0])
  }

  const handleExtraFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setExtraFiles(prev => [...prev, ...files.map(f => ({ file: f, id: Math.random() }))])
  }

  const handleReplaceExistingExtra = (index: number, file: File | undefined) => {
    if (!file) return
    setExistingExtraImages(prev =>
      prev.map((item, idx) => (idx === index ? { ...item, replacementFile: file } : item))
    )
  }

  const removeExtraNew = (index: number) => {
    setExtraFiles(prev => prev.filter((_, i) => i !== index))
  }

  const removeExtraExisting = (index: number) => {
    setExistingExtraImages(prev => prev.filter((_, i) => i !== index))
  }

  const handleCopyUrl = async () => {
    if (!existingMainPath) return
    try {
      await navigator.clipboard.writeText(existingMainPath)
      setCopiedUrl(true)
      setTimeout(() => setCopiedUrl(false), 2000)
    } catch {
      // ignore
    }
  }

  const handleDelete = async () => {
    if (!confirm("คุณแน่ใจหรือไม่ที่จะลบสินค้านี้?")) return
    setLoading(true)
    setLoadingText('กำลังลบข้อมูล...')
    
    try {
      const res = await deleteProduct(initialData.id)
      if (res.error) throw new Error(res.error)
      
      showToast('ลบสำเร็จ', 'ลบสินค้าเรียบร้อยแล้ว', 'success')
      const tab = activeCategory === 'prop' ? 'PROP' : activeCategory === 'furniture' ? 'FURNITURE' : activeCategory === 'rough_wood' ? 'ROUGH' : 'SLABS'
      window.location.href = `/inventory?tab=${tab}`
    } catch (err: any) {
      showToast('ผิดพลาด', err.message, 'error')
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    if (!isEditMode && !mainFile && !existingMainPath) {
      return showToast('ข้อมูลไม่ครบ', 'กรุณาอัปโหลดรูปหลัก หรือระบุ URL รูปภาพ', 'error')
    }
    
    setLoading(true)
    setProgress(5)
    setLoadingText(isEditMode ? 'กำลังบันทึกการแก้ไข...' : 'กำลังเตรียมข้อมูล...')

    try {
      const formData = new FormData(e.currentTarget)
      const categoryId = activeCategory

      // รักษาค่า specs เดิมไว้ก่อนเสมอ เพื่อไม่ให้ข้อมูลสำคัญของหมวดนั้นๆ หาย
      const specsRaw: Record<string, any> = {
        ...(initialData?.specs || {})
      }

      let topLengthCm: number | null = initialData?.length_cm ?? null
      let topWidthCm: number | null = initialData?.width_cm ?? null
      let topThicknessCm: number | null = initialData?.thickness_cm ?? null

      // =========================================================
      // 1. แยกจัดการสเปกตาม 4 หมวดหมู่
      // =========================================================
      if (categoryId === 'SLABS') {
        const sizeStr = (formData.get('spec_size') as string || '').trim()
        const dims = parseDims(sizeStr)

        const specKeys = [
          'size', 'material', 'finish', 'grade', 'origin',
          'spec_type', 'edge_design', 'panel_design',
          'color_craft', 'texture_craft', 'panel_craft', 'brightness'
        ]
        specKeys.forEach(key => {
          const val = formData.get(`spec_${key}`)
          if (val !== null) {
            const trimmed = String(val).trim()
            if (trimmed !== '') specsRaw[key] = trimmed
            else delete specsRaw[key]
          }
        })
        if (specsRaw.spec_type) {
          specsRaw.type = specsRaw.spec_type
        }
        if (dims) {
          specsRaw.length_cm = dims.l
          specsRaw.width_cm = dims.w
          specsRaw.thickness_cm = dims.t
          topLengthCm = dims.l
          topWidthCm = dims.w
          topThicknessCm = dims.t
        }
      } else if (categoryId === 'rough_wood') {
        const sizeRawStr = (formData.get('spec_size_raw') as string || '').trim()
        const dims = parseDims(sizeRawStr)

        specsRaw.type = 'rough'
        if (sizeRawStr) {
          specsRaw.size_raw = sizeRawStr
          specsRaw.size = sizeRawStr
        }
        const roughKeys = ['panel_craft', 'material', 'grade', 'finish', 'warehouse', 'maintain_time']
        roughKeys.forEach(key => {
          const val = formData.get(`spec_${key}`)
          if (val !== null) {
            const trimmed = String(val).trim()
            if (trimmed !== '') specsRaw[key] = trimmed
            else delete specsRaw[key]
          }
        })

        const manualL = formData.get('spec_length_cm') as string
        const manualW = formData.get('spec_width_cm') as string
        const manualT = formData.get('spec_thickness_cm') as string

        if (manualL || manualW || manualT) {
          const l = manualL ? Number(manualL) : (dims?.l ?? 0)
          const w = manualW ? Number(manualW) : (dims?.w ?? 0)
          const t = manualT ? Number(manualT) : (dims?.t ?? 0)
          specsRaw.length_cm = l
          specsRaw.width_cm = w
          specsRaw.thickness_cm = t
          topLengthCm = l
          topWidthCm = w
          topThicknessCm = t
        } else if (dims) {
          specsRaw.length_cm = dims.l
          specsRaw.width_cm = dims.w
          specsRaw.thickness_cm = dims.t
          topLengthCm = dims.l
          topWidthCm = dims.w
          topThicknessCm = dims.t
        }
      } else if (categoryId === 'prop' || categoryId === 'furniture') {
        const wRaw = formData.get('spec_width_cm') as string
        const dRaw = formData.get('spec_length_cm') as string
        const hRaw = formData.get('spec_thickness_cm') as string

        const w = wRaw !== null && wRaw.trim() !== '' ? Number(wRaw) : null
        const d = dRaw !== null && dRaw.trim() !== '' ? Number(dRaw) : null
        const h = hRaw !== null && hRaw.trim() !== '' ? Number(hRaw) : null

        specsRaw.width_cm = w
        specsRaw.length_cm = d
        specsRaw.thickness_cm = h
        topWidthCm = w
        topLengthCm = d
        topThicknessCm = h

        const groupSize = (formData.get('spec_group_size') as string || '').trim()
        const material = (formData.get('spec_material') as string || '').trim()
        const brand = (formData.get('spec_brand') as string || '').trim()

        specsRaw.group_size = groupSize || null
        specsRaw.material = material || null
        specsRaw.brand = brand || null

        if (canViewCosts) {
          const costDollarRaw = formData.get('spec_cost_dollar') as string
          const costThShippingRaw = formData.get('spec_cost_th_shipping') as string
          const mainCostRaw = formData.get('cost') as string

          if (costDollarRaw !== null) {
            specsRaw.cost_dollar = costDollarRaw.trim() !== '' ? Number(costDollarRaw) : null
          }
          if (costThShippingRaw !== null) {
            specsRaw.cost_th_shipping = costThShippingRaw.trim() !== '' ? Number(costThShippingRaw) : null
          } else if (mainCostRaw !== null && mainCostRaw.trim() !== '') {
            specsRaw.cost_th_shipping = Number(mainCostRaw)
          }
        }
      }

      // =========================================================
      // 2. จัดการ SKU ตามหมวดหมู่
      // =========================================================
      let skuPrefix = 'WOODSLABS'
      if (categoryId === 'prop') skuPrefix = 'PROP'
      else if (categoryId === 'rough_wood') skuPrefix = 'ROUGH'
      else if (categoryId === 'furniture') skuPrefix = 'FURN'

      const rawSku = (formData.get('sku') as string || '').trim()
      const sku = rawSku
        ? (isEditMode ? rawSku : (rawSku.toUpperCase().startsWith(skuPrefix) ? rawSku : rawSku))
        : `${skuPrefix}-${Date.now()}`

      const colorVal = (formData.get('color') as string || '').trim() || null
      const factoryNameVal = (formData.get('factory_name') as string || '').trim() || null
      const collectionGroupIdVal = (formData.get('collection_group_id') as string || '').trim() || null

      const payload: any = {
        name: formData.get('name'),
        barcode: formData.get('barcode') || '',
        sku,
        category_id: categoryId,
        color: colorVal,
        price: Number(formData.get('price') || 0),
        unit: formData.get('unit') || (categoryId === 'prop' || categoryId === 'furniture' ? 'ชิ้น' : 'แผ่น'),
        weight: Number(formData.get('weight') || 0),
        status: formData.get('status') || 'active',
        description: formData.get('description') || null,
        length_cm: topLengthCm,
        width_cm: topWidthCm,
        thickness_cm: topThicknessCm,
        specs: specsRaw
      }

      if (categoryId === 'prop' || categoryId === 'furniture') {
        payload.factory_name = factoryNameVal ?? ''
        payload.collection_group_id = collectionGroupIdVal
        payload._group_meta = {
          product_sup: (formData.get('group_product_sup') as string || '').trim() || undefined,
          name: (formData.get('group_name') as string || '').trim() || undefined,
          cover_image_url: (formData.get('group_cover_image_url') as string || '').trim() || undefined,
        }
      }

      if (canViewCosts) {
        if (categoryId === 'prop') {
          const shippingCost = formData.get('spec_cost_th_shipping') as string
          payload.cost = shippingCost !== null && shippingCost.trim() !== '' ? Number(shippingCost) : Number(formData.get('cost') || 0)
        } else {
          payload.cost = Number(formData.get('cost') || 0)
        }
      }

      let productId = initialData?.id
      
      if (!isEditMode) {
        const { id, error } = await createInitialProduct(payload)
        if (error) throw new Error(error)
        productId = id
      }

      // =========================================================
      // 3. อัปโหลดรูปหลัก (เขียนทับ URL เดิมบน Cloudflare R2 / Supabase Storage)
      // =========================================================
      let finalMainUrl = existingMainPath

      if (mainFile) {
        setProgress(30)
        setLoadingText(
          existingMainPath
            ? 'กำลังอัปโหลดรูปหลักทับ URL เดิม (Cloudflare R2 / Storage)...'
            : 'กำลังอัปโหลดรูปหลักขึ้น Cloudflare R2...'
        )
        const mainBlob = await blobToWebpSmart(mainFile)
        const upRes = await smartUploadImage({
          blob: mainBlob,
          existingUrl: existingMainPath,
          productId,
          role: 'main'
        })
        finalMainUrl = upRes.url!
        setExistingMainPath(finalMainUrl)
      }

      // =========================================================
      // 4. อัปโหลดรูปเพิ่มเติม (Gallery) - รองรับทั้งเปลี่ยนรูปเดิมทับ URL เดิม และเพิ่มรูปใหม่
      // =========================================================
      const finalExtraImages: Array<{ path: string; sort: number; role: string }> = []

      for (let i = 0; i < existingExtraImages.length; i++) {
        const item = existingExtraImages[i]
        if (item.replacementFile) {
          setProgress(45 + Math.round((i / Math.max(1, existingExtraImages.length)) * 20))
          setLoadingText(`กำลังเปลี่ยนรูป Gallery ที่ ${i + 1} ทับ URL เดิม...`)
          const blob = await blobToWebpSmart(item.replacementFile)
          const upRes = await smartUploadImage({
            blob,
            existingUrl: item.path,
            productId,
            role: 'extra'
          })
          finalExtraImages.push({
            path: upRes.url!,
            sort: i + 1,
            role: item.role || 'extra'
          })
        } else {
          finalExtraImages.push({
            path: item.path,
            sort: i + 1,
            role: item.role || 'extra'
          })
        }
      }

      if (extraFiles.length > 0) {
        for (let i = 0; i < extraFiles.length; i++) {
          const percent = 65 + Math.round(((i + 1) / extraFiles.length) * 20)
          setProgress(percent)
          setLoadingText(`กำลังอัปโหลดรูปเพิ่มเติมใหม่ ${i + 1}/${extraFiles.length}...`)

          const blob = await blobToWebpSmart(extraFiles[i].file)
          const upRes = await smartUploadImage({
            blob,
            existingUrl: null,
            productId,
            role: 'extra'
          })

          finalExtraImages.push({
            path: upRes.url!,
            sort: finalExtraImages.length + 1,
            role: 'extra'
          })
        }
      }

      setProgress(90)
      setLoadingText('กำลังบันทึกข้อมูลลงฐานข้อมูล...')

      const finalSpecs = {
        ...specsRaw,
        images: finalExtraImages,
        images_count: finalExtraImages.length
      }

      const updatePayload: any = {
        ...payload,
        specs: finalSpecs,
        image_url: finalMainUrl
      }

      const res = await updateProduct(productId, updatePayload)
      if (res.error) throw new Error(res.error)

      setProgress(100)
      setLoadingText('เสร็จสิ้น!')
      setMainFile(null)
      setExtraFiles([])
      setExistingExtraImages(finalExtraImages)
      setCacheBuster(Date.now())
      
      setTimeout(() => {
        showToast(
          'บันทึกสำเร็จ',
          mainFile && existingMainPath
            ? 'อัปเดตข้อมูลและเขียนทับรูปภาพใน URL เดิมเรียบร้อยแล้ว!'
            : 'บันทึกข้อมูลสินค้าเรียบร้อยแล้ว!',
          'success'
        )
        setLoading(false)
        if (!isEditMode) {
          router.push(`/inventory/${productId}`)
        } else {
          router.refresh()
        }
      }, 400)

    } catch (err: any) {
      console.error(err)
      setLoading(false)
      showToast('เกิดข้อผิดพลาด', err.message || 'Unknown error', 'error')
    }
  }

  const isSlab = activeCategory === 'SLABS'
  const isRough = activeCategory === 'rough_wood'
  const isProp = activeCategory === 'prop'
  const isFurniture = activeCategory === 'furniture'

  const isR2Url = existingMainPath?.includes('.r2.dev/')

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-20">
      
      {toast && (
        <div className="fixed top-5 right-5 z-50 animate-[slideIn_0.3s_ease-out]">
          <div className={`bg-white border-l-4 p-4 rounded-xl shadow-xl flex items-start gap-3 w-80 sm:w-96 
            ${toast.type === 'success' ? 'border-green-500' : toast.type === 'error' ? 'border-red-500' : 'border-blue-500'}`}>
            <div className="mt-0.5">
              {toast.type === 'success' && <CheckCircle className="w-5 h-5 text-green-500" />}
              {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-red-500" />}
              {toast.type === 'info' && <Info className="w-5 h-5 text-blue-500" />}
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">{toast.title}</h3>
              <p className="text-xs text-slate-600 mt-1">{toast.msg}</p>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
          <div className="text-lg font-semibold text-slate-700">กำลังดำเนินการ...</div>
          <div className="text-sm text-slate-500 mt-2">{loadingText}</div>
          <div className="w-64 h-2 bg-slate-200 rounded-full mt-4 overflow-hidden">
            <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${progress}%` }}></div>
          </div>
        </div>
      )}

      <form ref={formRef} onSubmit={handleSubmit} className="max-w-6xl mx-auto px-4 py-6">
        
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                {isEditMode ? <Edit className="w-7 h-7 text-orange-600" /> : <PackagePlus className="w-7 h-7 text-blue-600" />}
                {isEditMode ? `แก้ไขสินค้า: ${initialData.name}` : 'เพิ่มสินค้าใหม่'}
              </h1>
              {isSlab && <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 border border-blue-200 flex items-center gap-1"><Layers className="w-3.5 h-3.5" /> Wood Slabs (แผ่นไม้)</span>}
              {isRough && <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-700 border border-orange-200 flex items-center gap-1"><Hammer className="w-3.5 h-3.5" /> Rough Wood (ไม้ดิบ)</span>}
              {isProp && <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700 border border-purple-200 flex items-center gap-1"><Box className="w-3.5 h-3.5" /> Props (พร็อพ)</span>}
              {isFurniture && <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center gap-1"><Armchair className="w-3.5 h-3.5" /> Furniture (เฟอร์นิเจอร์)</span>}
            </div>
            <p className="text-slate-500 text-sm mt-1">
              {isEditMode ? `Product ID: ${initialData.id} • SKU: ${initialData.sku || '-'}` : 'เลือกหมวดหมู่และกรอกข้อมูลตามประเภทสินค้า'}
            </p>
          </div>
          <div className="flex gap-2">
            {isEditMode && (
              <button type="button" onClick={handleDelete} className="px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm font-medium hover:bg-red-100 flex items-center gap-2 cursor-pointer">
                <Trash2 className="w-4 h-4" /> ลบสินค้า
              </button>
            )}
            {!isEditMode && (
              <button type="button" onClick={() => window.location.reload()} className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-600 text-sm font-medium hover:bg-slate-50 flex items-center gap-2 cursor-pointer">
                <RotateCcw className="w-4 h-4" /> รีเซ็ต
              </button>
            )}
            <button
              type="submit"
              className={`px-6 py-2 text-white rounded-lg text-sm font-bold shadow-md flex items-center gap-2 cursor-pointer transition active:scale-95
                ${isProp ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-200' :
                  isFurniture ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' :
                  isRough ? 'bg-orange-600 hover:bg-orange-700 shadow-orange-200' :
                  'bg-blue-600 hover:bg-blue-700 shadow-blue-200'}
              `}
            >
              <Save className="w-4 h-4" /> {isEditMode ? 'บันทึกการแก้ไข' : 'บันทึกข้อมูล'}
            </button>
          </div>
        </div>

        {/* 4-Category Selector Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-2 mb-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveCategory('SLABS')}
            className={`flex-1 min-w-[160px] py-2.5 px-4 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
              isSlab ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-4 h-4" /> Wood Slabs (แผ่นไม้)
          </button>
          <button
            type="button"
            onClick={() => setActiveCategory('rough_wood')}
            className={`flex-1 min-w-[160px] py-2.5 px-4 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
              isRough ? 'bg-orange-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Hammer className="w-4 h-4" /> Rough Wood (ไม้ดิบ)
          </button>
          <button
            type="button"
            onClick={() => setActiveCategory('prop')}
            className={`flex-1 min-w-[160px] py-2.5 px-4 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
              isProp ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Box className="w-4 h-4" /> Props (พร็อพ)
          </button>
          <button
            type="button"
            onClick={() => setActiveCategory('furniture')}
            className={`flex-1 min-w-[160px] py-2.5 px-4 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
              isFurniture ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Armchair className="w-4 h-4" /> Furniture (เฟอร์นิเจอร์)
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left Column: Main Image + Gallery */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Main Image Card */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h2 className="font-semibold text-slate-800 flex items-center gap-2 text-sm">
                  <ImageIcon className="w-4 h-4 text-blue-500" /> รูปหลัก (Main Image)
                </h2>
                {isR2Url ? (
                  <span className="text-[10px] bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Cloudflare R2 (URL เดิม)
                  </span>
                ) : existingMainPath ? (
                  <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
                    ใช้ URL เดิมเมื่อเปลี่ยนรูป
                  </span>
                ) : (
                  <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">REQUIRED</span>
                )}
              </div>

              <div className="p-4 space-y-3">
                <input ref={mainInputRef} name="mainImage" type="file" accept="image/*" className="hidden" onChange={handleMainFile} />
                <div 
                  onClick={() => mainInputRef.current?.click()}
                  className={`relative group cursor-pointer border-2 border-dashed rounded-xl h-64 flex flex-col items-center justify-center transition overflow-hidden bg-slate-50
                    ${(mainFile || existingMainPath) ? 'border-blue-200 border-solid' : 'border-slate-300 hover:border-blue-400 hover:bg-blue-50'}`}
                >
                  {mainFile ? (
                    <>
                      <img src={URL.createObjectURL(mainFile)} className="w-full h-full object-contain" alt="New main preview" />
                      <div className="absolute inset-x-0 bottom-0 bg-emerald-600/95 text-white px-3 py-1.5 text-[11px] font-bold text-center">
                        {existingMainPath
                          ? 'เตรียมเขียนทับไฟล์เดิม (URL เดิมไม่เปลี่ยน)'
                          : 'รูปใหม่พร้อมอัปโหลดขึ้น Cloudflare R2'}
                      </div>
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2 backdrop-blur-[2px]">
                        <span className="bg-white text-slate-800 px-3 py-1.5 rounded-lg text-xs font-bold shadow">คลิกเพื่อเลือกไฟล์อื่น</span>
                      </div>
                    </>
                  ) : existingMainPath ? (
                    <>
                      <img src={getDisplayUrl(existingMainPath)} className="w-full h-full object-contain" alt="Current main" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center gap-2 backdrop-blur-[2px] p-4 text-center">
                        <span className="bg-white/95 text-slate-900 px-3.5 py-2 rounded-lg text-xs font-bold shadow-lg flex items-center gap-1.5">
                          <RefreshCw className="w-3.5 h-3.5 text-blue-600" /> เปลี่ยนรูปใหม่ (ใช้ URL เดิม)
                        </span>
                        <span className="text-[11px] text-white font-medium">
                          อัปโหลดทับไฟล์เดิมบน Cloudflare R2 / Storage ทันทีเมื่อกดบันทึก
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center text-center p-4">
                      <div className="bg-white p-3 rounded-full shadow-sm mb-3">
                        <UploadCloud className="w-6 h-6 text-slate-400" />
                      </div>
                      <span className="text-sm font-medium text-slate-600">คลิกเพื่อเลือกรูปหลัก</span>
                      <span className="text-xs text-slate-400 mt-1">อัปโหลดขึ้น Cloudflare R2 อัตโนมัติ</span>
                    </div>
                  )}
                </div>

                {mainFile && (
                  <button
                    type="button"
                    onClick={() => setMainFile(null)}
                    className="w-full py-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition cursor-pointer"
                  >
                    ยกเลิกรูปที่เลือกใหม่ (ใช้รูปเดิม)
                  </button>
                )}

                {/* แสดงและแก้ไข URL รูปหลัก */}
                <div className="pt-1">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">URL รูปหลัก (คงเดิมเมื่ออัปโหลดทับ)</label>
                    {existingMainPath && (
                      <button
                        type="button"
                        onClick={handleCopyUrl}
                        className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                      >
                        {copiedUrl ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        {copiedUrl ? 'คัดลอกแล้ว' : 'คัดลอก URL'}
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={existingMainPath || ''}
                    onChange={(e) => setExistingMainPath(e.target.value.trim() || null)}
                    placeholder="https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/..."
                    className="w-full px-2.5 py-1.5 text-[11px] font-mono bg-slate-50 border border-slate-200 rounded-lg text-slate-600 focus:outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Gallery Extra Images Card */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h2 className="font-semibold text-slate-800 flex items-center gap-2 text-sm">
                  <Images className="w-4 h-4 text-indigo-500" /> รูปเพิ่มเติม (Gallery)
                </h2>
                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                  {existingExtraImages.length + extraFiles.length} รูป
                </span>
              </div>
              <div className="p-4">
                <input ref={extraInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleExtraFiles} />
                
                <div 
                  onClick={() => extraInputRef.current?.click()}
                  className="cursor-pointer border-2 border-dashed border-slate-300 rounded-lg bg-slate-50 p-4 flex flex-col items-center justify-center transition hover:border-indigo-400 hover:bg-indigo-50 mb-4"
                >
                  <Plus className="w-5 h-5 text-slate-400 mb-1" />
                  <span className="text-xs font-medium text-slate-600">เพิ่มรูปภาพใหม่ (เลือกหลายรูปได้)</span>
                </div>

                <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                  {existingExtraImages.map((item, idx) => (
                    <div key={`old-${idx}`} className="flex items-center gap-2.5 bg-slate-50 p-2 border border-slate-200 rounded-lg shadow-2xs">
                      <div className="w-12 h-12 bg-white rounded overflow-hidden flex-shrink-0 relative border border-slate-200">
                        <img
                          src={item.replacementFile ? URL.createObjectURL(item.replacementFile) : getDisplayUrl(item.path)}
                          className="w-full h-full object-cover"
                          alt={`Extra ${idx + 1}`}
                        />
                        <div className="absolute bottom-0 inset-x-0 text-center bg-black/60">
                          <span className="text-[8px] text-white font-bold">
                            {item.replacementFile ? 'OVERWRITE' : `#${idx + 1}`}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-mono text-slate-600 truncate" title={item.path}>
                          {item.path.split('/').pop()}
                        </div>
                        {item.replacementFile ? (
                          <div className="text-[10px] text-emerald-600 font-bold">
                            จะเขียนทับ URL เดิมด้วย: {item.replacementFile.name}
                          </div>
                        ) : (
                          <label className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-800 cursor-pointer mt-0.5">
                            <RefreshCw className="w-2.5 h-2.5" /> เปลี่ยนรูป (ใช้ URL เดิม)
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleReplaceExistingExtra(idx, e.target.files?.[0])}
                            />
                          </label>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeExtraExisting(idx)}
                        className="p-1.5 hover:bg-red-100 text-red-400 hover:text-red-600 rounded cursor-pointer"
                        title="ลบรูปนี้"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  {extraFiles.map((item, idx) => (
                    <div key={item.id} className="flex items-center gap-3 bg-white p-2 border border-blue-200 rounded-lg shadow-2xs">
                      <div className="w-12 h-12 bg-slate-100 rounded overflow-hidden flex-shrink-0 border-2 border-blue-500">
                        <img src={URL.createObjectURL(item.file)} className="w-full h-full object-cover" alt="New extra" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-slate-700 truncate">{item.file.name}</div>
                        <div className="text-[10px] text-blue-600 font-bold">NEW (อัปโหลดขึ้น R2)</div>
                      </div>
                      <button type="button" onClick={() => removeExtraNew(idx)} className="p-1.5 hover:bg-red-50 text-red-400 rounded cursor-pointer">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Dynamic Form by Category */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* 1. ข้อมูลพื้นฐาน (Basic Info) */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
              <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <h2 className="font-bold text-slate-800 text-lg">ข้อมูลพื้นฐาน (Basic Information)</h2>
                <span className="text-xs font-mono text-slate-400">category_id: {activeCategory}</span>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    ชื่อสินค้า (Product Name) <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="name"
                    defaultValue={initialData?.name}
                    required
                    placeholder="ระบุชื่อสินค้า..."
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 text-sm transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">SKU</label>
                  <input
                    name="sku"
                    defaultValue={initialData?.sku}
                    placeholder="AUTO / Unique SKU"
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    Barcode {(isSlab || isRough) && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    name="barcode"
                    defaultValue={initialData?.barcode}
                    required={isSlab || isRough}
                    placeholder="รหัสบาร์โค้ด..."
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 text-sm font-mono"
                  />
                </div>

                {(isProp || isFurniture) && (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                      รหัสสินค้าโรงงาน (Item NO. / Factory Name)
                    </label>
                    <input
                      name="factory_name"
                      defaultValue={initialData?.factory_name || ''}
                      placeholder="เช่น 3D102672W06"
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-100 focus:border-purple-500 text-sm font-mono"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    {isFurniture ? 'สี / ผ้าหุ้ม (Color)' : 'สี (Color)'}
                  </label>
                  <input
                    name="color"
                    defaultValue={initialData?.color || ''}
                    placeholder={isProp ? "เช่น Gold, White, Black" : isFurniture ? "เช่น Brown, Fabric" : "เช่น Natural"}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">สถานะ (Status)</label>
                  <select
                    name="status"
                    defaultValue={initialData?.status || 'active'}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 text-sm bg-white"
                  >
                    <option value="active">Active (เปิดขาย)</option>
                    <option value="paused">Paused (ปิดการขายชั่วคราว)</option>
                    <option value="inactive">Inactive (ยกเลิก)</option>
                    <option value="draft">Draft (ฉบับร่าง)</option>
                    <option value="Pre-Oder">Pre-Order (พรีออเดอร์)</option>
                  </select>
                </div>

                {/* 💰 ส่วนต้นทุน (แยกตามหมวดหมู่) */}
                {canViewCosts && (
                  isProp ? (
                    <>
                      <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-200/80">
                        <label className="block text-xs font-bold text-amber-900 uppercase mb-1">
                          ต้นทุน ดอลลาร์ ไม่รวมค่าส่ง ($ USD)
                        </label>
                        <input
                          name="spec_cost_dollar"
                          defaultValue={initialData?.specs?.cost_dollar ?? ''}
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          className="w-full px-3.5 py-2 rounded-lg border border-amber-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-500 text-sm text-right font-mono font-bold text-amber-800"
                        />
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                          ต้นทุนรวมค่าส่ง (บาท ฿)
                        </label>
                        <input
                          name="spec_cost_th_shipping"
                          defaultValue={initialData?.specs?.cost_th_shipping ?? initialData?.cost ?? ''}
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          className="w-full px-3.5 py-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 text-sm text-right font-mono font-bold text-slate-800"
                        />
                      </div>
                    </>
                  ) : (
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">ต้นทุน (Cost - บาท)</label>
                      <input
                        name="cost"
                        defaultValue={initialData?.cost ?? ''}
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 text-sm text-right font-mono"
                      />
                    </div>
                  )
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">ราคาขาย (Price - บาท)</label>
                  <input
                    name="price"
                    defaultValue={initialData?.price ?? ''}
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 text-sm text-right font-mono text-blue-600 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">หน่วยนับ (Unit)</label>
                  <input
                    name="unit"
                    defaultValue={initialData?.unit || (isProp || isFurniture ? 'ชิ้น' : 'แผ่น')}
                    placeholder={isProp || isFurniture ? 'ชิ้น' : 'แผ่น, ท่อน, pcs'}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">น้ำหนัก (Weight - Kg)</label>
                  <input
                    name="weight"
                    defaultValue={initialData?.weight ?? 0}
                    type="number"
                    step="0.01"
                    placeholder="0.0"
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 text-sm text-right font-mono"
                  />
                </div>

                <div className="col-span-1 md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">รายละเอียดสินค้า (Description)</label>
                  <textarea
                    name="description"
                    defaultValue={initialData?.description || ''}
                    rows={3}
                    placeholder="ใส่รายละเอียดสินค้า..."
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* 2. ข้อมูลกลุ่มคอลเลกชัน (เฉพาะ Props & Furniture) */}
            {(isProp || isFurniture) && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className={`p-5 border-b flex items-center justify-between ${isProp ? 'bg-purple-50/60 border-purple-100' : 'bg-emerald-50/60 border-emerald-100'}`}>
                  <h2 className="font-bold text-slate-800 text-base flex items-center gap-2">
                    <FolderOpen className={`w-5 h-5 ${isProp ? 'text-purple-600' : 'text-emerald-600'}`} />
                    กลุ่มสินค้า & หมวดหมู่ย่อย (Collection Group)
                  </h2>
                  {initialData?.collection_group_id && (
                    <span className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-md border ${
                      isProp ? 'bg-purple-100 text-purple-800 border-purple-200' : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                    }`}>
                      Group: {initialData.collection_group_id}
                    </span>
                  )}
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                      รหัสกลุ่ม (Collection Group ID)
                    </label>
                    <input
                      name="collection_group_id"
                      defaultValue={initialData?.collection_group_id || colGroup?.id || ''}
                      placeholder="เช่น H2072, SKBLACK, 105"
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-purple-500 text-sm font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                      หมวดหมู่ย่อย (Product Sup)
                    </label>
                    <input
                      name="group_product_sup"
                      defaultValue={colGroup?.product_sup || initialData?.specs?.product_sup || ''}
                      placeholder={isProp ? "เช่น Sculpture, Ceramic Vases, Bath Room" : "เช่น Lounge Chair, Table, Sofa"}
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-purple-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                      ชื่อกลุ่ม (Name Group)
                    </label>
                    <input
                      name="group_name"
                      defaultValue={colGroup?.name || ''}
                      placeholder="เช่น Natural Travertine"
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-purple-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                      ลิงก์รูปปกกลุ่ม (Image Group URL)
                    </label>
                    <input
                      name="group_cover_image_url"
                      defaultValue={colGroup?.cover_image_url || colGroup?.image_url || ''}
                      placeholder="https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/..."
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-purple-500 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 3. สเปกสินค้าเฉพาะของแต่ละหมวด (Category-Specific Technical Specs) */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <h2 className="font-bold text-slate-800 text-lg">
                  {isSlab && 'สเปกแผ่นไม้ (Wood Slabs Technical Specs)'}
                  {isRough && 'สเปกไม้ดิบ (Rough Wood Specs)'}
                  {isProp && 'สเปกสินค้าพร็อพ (Props Specifications)'}
                  {isFurniture && 'สเปกเฟอร์นิเจอร์ (Furniture Specifications)'}
                </h2>
              </div>

              {/* 🪵 หมวดที่ 1: WOOD SLABS */}
              {isSlab && (
                <div className="p-6 grid grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { label: "Size (MM)", id: "spec_size", placeholder: "2000-800-50 MM" },
                    { label: "Material (ชนิดไม้)", id: "spec_material", placeholder: "Japanese Tochi Wood" },
                    { label: "Finish (ผิวงาน)", id: "spec_finish", placeholder: "Water-Based Paint" },
                    { label: "Grade (เกรด)", id: "spec_grade", placeholder: "A, B" },
                    { label: "Origin (แหล่งที่มา)", id: "spec_origin", placeholder: "Thailand, Japan" },
                    { label: "Spec Type (ประเภท)", id: "spec_spec_type", key: "spec_type", options: ["Wood slabs", "Small table", "Leg", "Chair/Stool", "Cabinet", "Table", "Small Furniture"] },
                    { label: "Edge Design (ขอบไม้)", id: "spec_edge_design", placeholder: "Natural Edge / Live Edge", span: 2 },
                    { label: "Panel Design", id: "spec_panel_design", placeholder: "Natural Surface" },
                    { label: "Color Craft", id: "spec_color_craft", placeholder: "Original Color" },
                    { label: "Texture Craft", id: "spec_texture_craft", placeholder: "Smooth" },
                    { label: "Panel Craft", id: "spec_panel_craft", placeholder: "Solid Panel" },
                    { label: "Brightness (ความเงา)", id: "spec_brightness", placeholder: "Matte", span: 2 }
                  ].map((field: any) => {
                    const specKey = field.key || field.id.replace('spec_', '')
                    const defaultVal = initialData?.specs?.[specKey] || (specKey === 'spec_type' ? initialData?.specs?.type : '') || ''
                    return (
                      <div key={field.id} className={field.span === 2 ? 'col-span-2' : ''}>
                        <label className="text-[11px] font-bold text-slate-500 uppercase">{field.label}</label>
                        {field.options ? (
                          <select
                            name={field.id}
                            defaultValue={defaultVal}
                            className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 transition bg-white"
                          >
                            <option value="">— เลือกประเภท —</option>
                            {field.options.map((opt: string) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            name={field.id}
                            defaultValue={defaultVal}
                            className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 transition"
                            placeholder={field.placeholder}
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* 🔨 หมวดที่ 2: ROUGH WOOD */}
              {isRough && (
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                        ขนาดไม้ดิบ (Size Raw)
                      </label>
                      <input
                        name="spec_size_raw"
                        defaultValue={initialData?.specs?.size_raw || initialData?.specs?.size || ''}
                        placeholder="เช่น 3590-990-63 MM"
                        className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:border-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                        ลักษณะแผ่น (Panel Craft)
                      </label>
                      <input
                        name="spec_panel_craft"
                        defaultValue={initialData?.specs?.panel_craft || ''}
                        placeholder="เช่น Rough-Board, Solid"
                        className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-orange-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">ความยาว (Length)</label>
                      <input
                        name="spec_length_cm"
                        type="number"
                        step="0.01"
                        defaultValue={initialData?.specs?.length_cm ?? initialData?.length_cm ?? ''}
                        placeholder="3590"
                        className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:border-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">ความกว้าง (Width)</label>
                      <input
                        name="spec_width_cm"
                        type="number"
                        step="0.01"
                        defaultValue={initialData?.specs?.width_cm ?? initialData?.width_cm ?? ''}
                        placeholder="990"
                        className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:border-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">ความหนา (Thickness)</label>
                      <input
                        name="spec_thickness_cm"
                        type="number"
                        step="0.01"
                        defaultValue={initialData?.specs?.thickness_cm ?? initialData?.thickness_cm ?? ''}
                        placeholder="63"
                        className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:border-orange-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">ชนิดไม้ (Material)</label>
                      <input
                        name="spec_material"
                        defaultValue={initialData?.specs?.material || ''}
                        placeholder="เช่น ไม้สัก, Japanese Zelkova"
                        className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">เกรด (Grade)</label>
                      <input
                        name="spec_grade"
                        defaultValue={initialData?.specs?.grade || ''}
                        placeholder="A, B"
                        className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">ผิวงาน (Finish)</label>
                      <input
                        name="spec_finish"
                        defaultValue={initialData?.specs?.finish || ''}
                        placeholder="ไม้ดิบ"
                        className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-orange-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-orange-50/50 p-4 rounded-xl border border-orange-200/70">
                    <div>
                      <label className="block text-xs font-bold text-orange-900 uppercase mb-1">คลังจัดเก็บ (Warehouse)</label>
                      <input
                        name="spec_warehouse"
                        defaultValue={initialData?.specs?.warehouse || ''}
                        placeholder="ระบุคลังจัดเก็บ..."
                        className="w-full px-3.5 py-2 bg-white border border-orange-200 rounded-lg text-sm focus:outline-none focus:border-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-orange-900 uppercase mb-1">เวลาดูแล (Maintain Time)</label>
                      <input
                        name="spec_maintain_time"
                        defaultValue={initialData?.specs?.maintain_time || ''}
                        placeholder="ระบุเวลาดูแล..."
                        className="w-full px-3.5 py-2 bg-white border border-orange-200 rounded-lg text-sm focus:outline-none focus:border-orange-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 📦🛋️ หมวดที่ 3 & 4: PROPS และ FURNITURE */}
              {(isProp || isFurniture) && (
                <div className="p-6 space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                        ความกว้าง W (ซม.)
                      </label>
                      <input
                        name="spec_width_cm"
                        type="number"
                        step="0.01"
                        defaultValue={initialData?.specs?.width_cm ?? initialData?.width_cm ?? ''}
                        placeholder="เช่น 33"
                        className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-sm font-mono font-bold focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                        ความลึก/ยาว D (ซม.)
                      </label>
                      <input
                        name="spec_length_cm"
                        type="number"
                        step="0.01"
                        defaultValue={initialData?.specs?.length_cm ?? initialData?.length_cm ?? ''}
                        placeholder="เช่น 20"
                        className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-sm font-mono font-bold focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                        ความสูง H (ซม.)
                      </label>
                      <input
                        name="spec_thickness_cm"
                        type="number"
                        step="0.01"
                        defaultValue={initialData?.specs?.thickness_cm ?? initialData?.thickness_cm ?? ''}
                        placeholder="เช่น 59.5"
                        className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-sm font-mono font-bold focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                        ไซส์กลุ่ม (Group Size)
                      </label>
                      <input
                        name="spec_group_size"
                        list="group-size-options"
                        defaultValue={initialData?.specs?.group_size || ''}
                        placeholder="S, M, L, XL, XXL"
                        className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm font-bold uppercase focus:outline-none focus:border-purple-500"
                      />
                      <datalist id="group-size-options">
                        <option value="S" />
                        <option value="M" />
                        <option value="L" />
                        <option value="XL" />
                        <option value="XXL" />
                      </datalist>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                        วัสดุ (Material)
                      </label>
                      <input
                        name="spec_material"
                        defaultValue={initialData?.specs?.material || ''}
                        placeholder={isProp ? "เช่น Iron & Marble, Ceramic, Glass" : "เช่น Solid Wood, Fabric, Leather"}
                        className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                        โรงงาน / แบรนด์ (Factory / Brand)
                      </label>
                      <input
                        name="spec_brand"
                        defaultValue={initialData?.specs?.brand || ''}
                        placeholder="เช่น Fashim, Merlin, SAIDKOCC"
                        className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}