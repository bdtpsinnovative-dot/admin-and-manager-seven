"use client"

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
// ✅ เพิ่ม deleteProduct เข้ามา
import { createInitialProduct, updateProduct, uploadFile, deleteProduct } from '../actions/woodslab'
import { 
  X, UploadCloud, Loader2, Save, Plus, Trash2 
} from 'lucide-react'

// --- CONSTANTS ---
const BASE_FOLDER = "products"
const SKU_PREFIX = "ROUGH-"

// ✅ ฟังก์ชันบีบอัดรูป (เหมือนเดิม)
const blobToWebpSmart = async (file: File): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = document.createElement('img')
    img.src = URL.createObjectURL(file)
    img.onload = async () => {
      URL.revokeObjectURL(img.src)
      let quality = 0.9, scale = 1.0
      const MAX_SIZE = 950 * 1024, MAX_DIM = 1600
      
      const compress = (q: number, s: number): Promise<Blob> => {
        return new Promise((res) => {
          const canvas = document.createElement("canvas")
          let w = img.width * s, h = img.height * s
          if (Math.max(w, h) > MAX_DIM) {
             const r = MAX_DIM / Math.max(w, h); w *= r; h *= r;
          }
          canvas.width = Math.round(w); canvas.height = Math.round(h);
          const ctx = canvas.getContext("2d")
          if (ctx) {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
            canvas.toBlob(b => b && res(b), "image/webp", q)
          }
        })
      }
      let blob = await compress(quality, scale)
      while (blob.size > MAX_SIZE && quality > 0.1) {
        quality -= 0.1; if (quality < 0.6) scale *= 0.8;
        blob = await compress(quality, scale)
      }
      resolve(blob)
    }
    img.onerror = (err) => reject(err)
  })
}

interface RoughWoodFormProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  initialData?: any 
}

export default function RoughWoodForm({ isOpen, onClose, onSuccess, initialData }: RoughWoodFormProps) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  
  const isEditMode = !!initialData 

  const [loading, setLoading] = useState(false)
  const [loadingText, setLoadingText] = useState('')
  
  // State รูปภาพ
  const [mainFile, setMainFile] = useState<File | null>(null)
  const [existingMainUrl, setExistingMainUrl] = useState<string | null>(null)
  
  const [extraFiles, setExtraFiles] = useState<File[]>([])
  const [existingExtraImages, setExistingExtraImages] = useState<any[]>([])

  // Load Data
  useEffect(() => {
    if (isOpen && initialData) {
       setExistingMainUrl(initialData.image_url)
       if (initialData.specs?.images) {
         setExistingExtraImages(initialData.specs.images)
       }
    } else if (isOpen && !initialData) {
       setExistingMainUrl(null)
       setExistingExtraImages([])
       setMainFile(null)
       setExtraFiles([])
    }
  }, [isOpen, initialData])

  if (!isOpen) return null

  const handleMainFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setMainFile(e.target.files[0])
  }

  const handleExtraFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setExtraFiles(prev => [...prev, ...Array.from(e.target.files!)])
    }
  }

  const removeExistingExtra = (index: number) => {
    setExistingExtraImages(prev => prev.filter((_, i) => i !== index))
  }

  // ✅ ฟังก์ชันลบสินค้า
  const handleDelete = async () => {
    if (!initialData?.id) return
    
    // ถามยืนยันก่อนลบ
    if (!confirm(`⚠️ ยืนยันการลบสินค้า "${initialData.name}"?\nการกระทำนี้ไม่สามารถกู้คืนได้`)) {
      return
    }

    setLoading(true)
    setLoadingText('กำลังลบสินค้า...')

    try {
       const res = await deleteProduct(initialData.id)
       if (res.error) throw new Error(res.error)

       // ลบสำเร็จ
       setLoading(false)
       if (onSuccess) onSuccess()
       onClose()
       router.refresh()
    } catch (err: any) {
       console.error(err)
       alert("ลบสินค้าไม่สำเร็จ: " + err.message)
       setLoading(false)
    }
  }

  const uploadToStorage = async (file: File, productId: string | number, prefix: string) => {
    const webpBlob = await blobToWebpSmart(file)
    const formData = new FormData()
    formData.append('file', webpBlob)
    const path = `${BASE_FOLDER}/${productId}/${prefix}_${Date.now()}.webp`
    formData.append('path', path)
    
    const res = await uploadFile(formData)
    if (res.error) throw new Error(res.error)
    return path
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setLoadingText('กำลังเตรียมข้อมูล...')

    try {
      const formData = new FormData(e.currentTarget)
      
      const sizeRawStr = formData.get('size_raw') as string || ''
      const dims = sizeRawStr.match(/(\d+(?:\.\d+)?)/g)?.map(Number) || []
      
      let length_cm = 0, width_cm = 0, thickness_cm = 0
      if (dims.length >= 2) {
         length_cm = dims[0]
         thickness_cm = dims[dims.length - 1]
         const middleNums = dims.slice(1, -1)
         width_cm = middleNums.length > 0 ? Math.max(...middleNums) : dims[1]
      }

      const skuSuffix = formData.get('sku_suffix')
      let finalSku = initialData?.sku
      if (!isEditMode || skuSuffix) {
         finalSku = skuSuffix ? `${SKU_PREFIX}${skuSuffix}` : (initialData?.sku || `${SKU_PREFIX}${Date.now().toString().slice(-4)}`)
      }

      const payload: any = {
        name: formData.get('name') || `Rough Wood ${finalSku}`,
        sku: finalSku,
        barcode: formData.get('barcode'),
        status: formData.get('status'),
        price: Number(formData.get('price') || 0),
        weight: Number(formData.get('weight') || 0),
        unit: formData.get('unit'),
        description: formData.get('description'),
        category_id: 'rough_wood', 
      }

      const specs = {
        type: 'rough',
        size_raw: sizeRawStr,
        warehouse: formData.get('warehouse'),
        maintain_time: formData.get('maintain_time'),
        length_cm, width_cm, thickness_cm,
        images: [] as any[]
      }
      
      let productId = initialData?.id
      
      if (!isEditMode) {
         const { id, error } = await createInitialProduct({ ...payload, specs })
         if (error) throw new Error(error)
         productId = id
      } else {
         await updateProduct(productId, payload)
      }

      let finalMainUrl = existingMainUrl
      if (mainFile) {
        setLoadingText('กำลังอัปโหลดรูปหลัก...')
        finalMainUrl = await uploadToStorage(mainFile, productId, 'main_rough')
      }

      const finalExtraImages = [...existingExtraImages]
      for (let i = 0; i < extraFiles.length; i++) {
        setLoadingText(`กำลังอัปโหลดรูปเพิ่ม ${i + 1}/${extraFiles.length}...`)
        const path = await uploadToStorage(extraFiles[i], productId, `extra_rough_new_${i}`)
        finalExtraImages.push({ path, sort: finalExtraImages.length + 1 })
      }

      const finalSpecs = { ...specs, images: finalExtraImages }
      const updatePayload: any = { specs: finalSpecs }
      if (finalMainUrl) updatePayload.image_url = finalMainUrl

      await updateProduct(productId, updatePayload)

      setLoading(false)
      if (onSuccess) onSuccess()
      onClose()
      router.refresh()

    } catch (err: any) {
      console.error(err)
      alert("Error: " + err.message)
      setLoading(false)
    }
  }

  const getSkuSuffix = () => {
    if (!initialData?.sku) return ''
    return initialData.sku.replace(SKU_PREFIX, '')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white">
          <div>
            <h2 className="text-xl font-bold text-slate-800">{isEditMode ? `Edit: ${initialData.name}` : 'New Rough Wood'}</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400"><X className="w-5 h-5" /></button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 bg-slate-50">
          <form id="roughForm" ref={formRef} onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">SKU Code</label>
                  <div className="flex items-center">
                    <span className="bg-slate-100 border border-r-0 border-slate-300 text-slate-500 px-3 py-2.5 rounded-l-lg text-sm font-mono">{SKU_PREFIX}</span>
                    <input name="sku_suffix" defaultValue={getSkuSuffix()} placeholder="01-XXXX" className="w-full px-3 py-2.5 border border-slate-300 rounded-r-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm font-mono uppercase" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Barcode *</label>
                  <input name="barcode" defaultValue={initialData?.barcode} required className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Size Raw *</label>
                  <input name="size_raw" defaultValue={initialData?.specs?.size_raw} required className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm font-mono" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                  <select name="status" defaultValue={initialData?.status || 'active'} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm bg-white">
                    <option value="active">Active (เปิดขาย)</option>
                    <option value="paused">Paused (ปิดการขายชั่วคราว)</option>
                    <option value="inactive">Inactive (ยกเลิก)</option>
                  </select>
                </div>
              </div>
              
              <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Product Name</label>
                  <input name="name" defaultValue={initialData?.name} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm" />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Price</label>
                  <input name="price" type="number" step="0.01" defaultValue={initialData?.price} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm text-right" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Weight</label>
                  <input name="weight" type="number" step="0.01" defaultValue={initialData?.weight} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm text-right" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Unit</label>
                  <input name="unit" defaultValue={initialData?.unit || "PCS"} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm text-center uppercase" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-slate-100 p-3 rounded-lg border border-slate-200">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">WAREHOUSE</label>
                  <input name="warehouse" defaultValue={initialData?.specs?.warehouse} className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">MAINTAIN TIME</label>
                  <input name="maintain_time" defaultValue={initialData?.specs?.maintain_time} className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea name="description" defaultValue={initialData?.description} rows={3} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm"></textarea>
              </div>
            </div>

            <div className="lg:col-span-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Main Image</label>
                <div className={`relative border-2 border-dashed rounded-xl h-56 flex flex-col items-center justify-center cursor-pointer transition ${(mainFile || existingMainUrl) ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:bg-white'}`}>
                  <input type="file" accept="image/*" onChange={handleMainFile} className="absolute inset-0 opacity-0 cursor-pointer" />
                  {mainFile ? (
                    <img src={URL.createObjectURL(mainFile)} className="w-full h-full object-contain rounded-xl p-1" />
                  ) : existingMainUrl ? (
                    <img src={existingMainUrl} className="w-full h-full object-contain rounded-xl p-1" />
                  ) : (
                    <div className="text-center p-4"><UploadCloud className="w-6 h-6 mx-auto mb-2 text-slate-400" /><span className="text-sm text-slate-500">Click to upload</span></div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Extra Images</label>
                <div className="border border-slate-200 rounded-xl p-3 bg-white">
                  <div className="grid grid-cols-4 gap-2 mb-2">
                    {existingExtraImages.map((img: any, idx) => (
                      <div key={`old-${idx}`} className="aspect-square relative group">
                        <img src={img.path} className="w-full h-full object-cover rounded-lg border border-slate-100" />
                        <button type="button" onClick={() => removeExistingExtra(idx)} className="absolute top-0.5 right-0.5 bg-red-500 text-white p-0.5 rounded opacity-0 group-hover:opacity-100"><X className="w-3 h-3" /></button>
                      </div>
                    ))}
                    {extraFiles.map((file, idx) => (
                      <div key={`new-${idx}`} className="aspect-square relative group">
                        <img src={URL.createObjectURL(file)} className="w-full h-full object-cover rounded-lg border border-blue-200" />
                        <button type="button" onClick={() => setExtraFiles(prev => prev.filter((_, i) => i !== idx))} className="absolute top-0.5 right-0.5 bg-red-500 text-white p-0.5 rounded opacity-0 group-hover:opacity-100"><X className="w-3 h-3" /></button>
                      </div>
                    ))}
                  </div>
                  <label className="w-full py-2 border border-dashed border-slate-300 rounded-lg flex items-center justify-center gap-2 text-sm text-slate-600 cursor-pointer hover:bg-slate-50">
                    <Plus className="w-4 h-4" /> Add Photos
                    <input type="file" multiple accept="image/*" onChange={handleExtraFiles} className="hidden" />
                  </label>
                </div>
              </div>
            </div>
          </form>
        </div>

        <div className="p-4 border-t border-slate-100 bg-white flex justify-between items-center">
          {/* ✅ ส่วนซ้าย: ปุ่มลบ (แสดงเฉพาะโหมด Edit) */}
          <div>
            {isEditMode && (
              <button 
                type="button" 
                onClick={handleDelete}
                className="px-4 py-2 bg-red-50 border border-red-200 text-red-600 text-sm font-medium rounded-lg hover:bg-red-100 transition flex items-center gap-2"
                disabled={loading}
              >
                 <Trash2 className="w-4 h-4" /> Delete Product
              </button>
            )}
          </div>

          {/* ✅ ส่วนขวา: Cancel & Save */}
          <div className="flex items-center gap-3">
             {loading && <span className="text-xs text-blue-600 animate-pulse">{loadingText}</span>}
             <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-medium">Cancel</button>
             <button type="submit" form="roughForm" disabled={loading} className="px-5 py-2.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 flex items-center gap-2 shadow-lg shadow-blue-200">
               {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
             </button>
          </div>
        </div>
      </div>
    </div>
  )
}