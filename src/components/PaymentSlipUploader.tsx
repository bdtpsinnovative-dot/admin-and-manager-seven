"use client"

import { useEffect, useRef, useState } from 'react'
import { Check, ImagePlus, LoaderCircle, Minus, Plus, RotateCcw, RotateCw, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'

const CROP_WIDTH = 300
const CROP_HEIGHT = 400

type Point = { x: number; y: number }

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export default function PaymentSlipUploader({ orderId, orderCode }: { orderId: number; orderCode: string }) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const dragRef = useRef<{ pointerId: number; origin: Point; position: Point } | null>(null)
  const [sourceUrl, setSourceUrl] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState(`/api/payment-slips/${orderId}`)
  const [hasExistingSlip, setHasExistingSlip] = useState(false)
  const [imageSize, setImageSize] = useState({ width: 1, height: 1 })
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [position, setPosition] = useState<Point>({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [isImageReady, setIsImageReady] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    return () => {
      if (sourceUrl) URL.revokeObjectURL(sourceUrl)
    }
  }, [sourceUrl])

  const isQuarterTurn = rotation % 180 !== 0
  const rotatedWidth = isQuarterTurn ? imageSize.height : imageSize.width
  const rotatedHeight = isQuarterTurn ? imageSize.width : imageSize.height
  const baseScale = Math.max(CROP_WIDTH / rotatedWidth, CROP_HEIGHT / rotatedHeight)
  const displayWidth = imageSize.width * baseScale * zoom
  const displayHeight = imageSize.height * baseScale * zoom
  const boundsWidth = isQuarterTurn ? displayHeight : displayWidth
  const boundsHeight = isQuarterTurn ? displayWidth : displayHeight
  const maxX = Math.max(0, (boundsWidth - CROP_WIDTH) / 2)
  const maxY = Math.max(0, (boundsHeight - CROP_HEIGHT) / 2)

  useEffect(() => {
    setPosition(current => ({
      x: clamp(current.x, -maxX, maxX),
      y: clamp(current.y, -maxY, maxY),
    }))
  }, [maxX, maxY])

  useEffect(() => {
    if (!sourceUrl) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !uploading) {
        setSourceUrl(null)
        setIsImageReady(false)
        setZoom(1)
        setRotation(0)
        setPosition({ x: 0, y: 0 })
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [sourceUrl, uploading])

  function resetEditor() {
    setZoom(1)
    setRotation(0)
    setPosition({ x: 0, y: 0 })
    setIsDragging(false)
  }

  function closeEditor() {
    setSourceUrl(current => {
      if (current) URL.revokeObjectURL(current)
      return null
    })
    setIsImageReady(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
    resetEditor()
  }

  function handleFile(file?: File) {
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('รองรับเฉพาะไฟล์ JPG, PNG และ WebP')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('ไฟล์ต้นฉบับต้องมีขนาดไม่เกิน 10 MB')
      return
    }

    const url = URL.createObjectURL(file)
    setSourceUrl(current => {
      if (current) URL.revokeObjectURL(current)
      return url
    })
    setIsImageReady(false)
    resetEditor()
  }

  function changeZoom(nextZoom: number) {
    setZoom(clamp(nextZoom, 1, 3))
  }

  function rotate() {
    setRotation(current => (current + 90) % 360)
    setPosition({ x: 0, y: 0 })
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = {
      pointerId: event.pointerId,
      origin: { x: event.clientX, y: event.clientY },
      position,
    }
    setIsDragging(true)
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    setPosition({
      x: clamp(drag.position.x + event.clientX - drag.origin.x, -maxX, maxX),
      y: clamp(drag.position.y + event.clientY - drag.origin.y, -maxY, maxY),
    })
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null
      setIsDragging(false)
    }
  }

  async function createCroppedBlob() {
    const image = imageRef.current
    if (!image) throw new Error('รูปสลิปยังโหลดไม่เสร็จ')

    const outputWidth = 900
    const outputHeight = 1200
    const ratio = outputWidth / CROP_WIDTH
    const canvas = document.createElement('canvas')
    canvas.width = outputWidth
    canvas.height = outputHeight
    const context = canvas.getContext('2d')
    if (!context) throw new Error('เบราว์เซอร์ไม่รองรับการครอปรูป')

    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, outputWidth, outputHeight)
    context.translate(outputWidth / 2 + position.x * ratio, outputHeight / 2 + position.y * ratio)
    context.rotate((rotation * Math.PI) / 180)
    context.drawImage(
      image,
      (-displayWidth * ratio) / 2,
      (-displayHeight * ratio) / 2,
      displayWidth * ratio,
      displayHeight * ratio,
    )

    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('สร้างไฟล์สลิปไม่สำเร็จ')), 'image/jpeg', 0.9)
    })
  }

  async function uploadSlip() {
    setUploading(true)
    try {
      const blob = await createCroppedBlob()
      const formData = new FormData()
      formData.append('file', blob, `payment-slip-${orderCode}.jpg`)
      const response = await fetch(`/api/payment-slips/${orderId}`, { method: 'POST', body: formData })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'อัปโหลดสลิปไม่สำเร็จ')

      setPreviewUrl(result.url)
      setHasExistingSlip(true)
      closeEditor()
      toast.success('แนบสลิปเรียบร้อยแล้ว')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'อัปโหลดสลิปไม่สำเร็จ')
    } finally {
      setUploading(false)
    }
  }

  async function deleteSlip() {
    setDeleting(true)
    try {
      const response = await fetch(`/api/payment-slips/${orderId}`, { method: 'DELETE' })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'ลบสลิปไม่สำเร็จ')

      setHasExistingSlip(false)
      setPreviewUrl(`/api/payment-slips/${orderId}?v=${Date.now()}`)
      setShowDeleteConfirm(false)
      toast.success('ลบสลิปเรียบร้อยแล้ว')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'ลบสลิปไม่สำเร็จ')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <section className={`overflow-hidden rounded-xl border transition-colors ${hasExistingSlip ? 'border-teal-200 bg-teal-50/70' : 'border-dashed border-slate-300 bg-white'}`}>
        <div className="flex items-center gap-3 p-3">
          <a
            href={hasExistingSlip ? previewUrl : undefined}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={hasExistingSlip ? 'เปิดดูสลิปฉบับเต็ม' : undefined}
            className={`relative flex h-16 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-slate-100 ${hasExistingSlip ? 'cursor-zoom-in border-teal-200' : 'pointer-events-none border-slate-200'}`}
          >
            <img
              src={previewUrl}
              alt={`สลิปของบิล ${orderCode}`}
              className={`h-full w-full object-cover transition-opacity ${hasExistingSlip ? 'opacity-100' : 'opacity-0'}`}
              onLoad={() => setHasExistingSlip(true)}
              onError={() => setHasExistingSlip(false)}
            />
            {!hasExistingSlip && <ImagePlus className="absolute h-5 w-5 text-slate-400" />}
          </a>

          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              {hasExistingSlip && <Check className="h-3.5 w-3.5 text-teal-600" />}
              {hasExistingSlip ? 'แนบหลักฐานแล้ว' : 'หลักฐานการชำระเงิน (ไม่บังคับ)'}
            </p>
            <p className="mt-0.5 text-[10px] leading-relaxed text-slate-500">
              {hasExistingSlip ? 'กดรูปเพื่อดูสลิป หรือแนบใหม่เพื่อเปลี่ยนไฟล์' : 'แนบภายหลังได้'}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            {hasExistingSlip && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="rounded-lg border border-rose-200 bg-white p-2 text-rose-500 shadow-sm transition-colors hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2"
                aria-label="ลบสลิป"
                title="ลบสลิป"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-lg bg-slate-800 px-3 py-2 text-[11px] font-bold text-white shadow-sm transition-colors hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
            >
              {hasExistingSlip ? 'เปลี่ยน' : 'แนบสลิป'}
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            className="hidden"
            onChange={event => handleFile(event.target.files?.[0])}
          />
        </div>
      </section>

      {sourceUrl && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/55 p-0 backdrop-blur-sm sm:p-4" role="dialog" aria-modal="true" aria-label="ครอปรูปสลิป">
          <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-white text-slate-800 shadow-2xl sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:max-w-md sm:rounded-3xl sm:border sm:border-slate-200">
            <header className="flex shrink-0 items-start justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-base font-bold text-slate-800">จัดตำแหน่งสลิป</h2>
                <p className="mt-1 text-[11px] text-slate-500">ลากรูปและซูมให้พอดีกับกรอบ</p>
              </div>
              <button type="button" onClick={closeEditor} disabled={uploading} className="rounded-full bg-slate-100 p-2 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500" aria-label="ปิดหน้าครอป">
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="flex items-center justify-center bg-slate-100 px-2 py-5 sm:px-6">
                <div
                  className={`relative mx-auto overflow-hidden bg-slate-300 shadow-lg touch-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                  style={{ width: CROP_WIDTH, height: CROP_HEIGHT }}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  onWheel={event => {
                    event.preventDefault()
                    changeZoom(zoom - event.deltaY * 0.0015)
                  }}
                >
                  {!isImageReady && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-200">
                      <LoaderCircle className="h-6 w-6 animate-spin text-emerald-600" />
                    </div>
                  )}
                  <img
                    ref={imageRef}
                    src={sourceUrl}
                    alt="รูปสลิปที่กำลังครอป"
                    draggable={false}
                    onLoad={event => {
                      setImageSize({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })
                      setIsImageReady(true)
                    }}
                    className="pointer-events-none absolute left-1/2 top-1/2 max-w-none select-none"
                    style={{
                      width: displayWidth,
                      height: displayHeight,
                      transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px)) rotate(${rotation}deg)`,
                    }}
                  />

                  <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,transparent_33.1%,rgba(255,255,255,0.35)_33.3%,rgba(255,255,255,0.35)_33.6%,transparent_33.8%,transparent_66.2%,rgba(255,255,255,0.35)_66.4%,rgba(255,255,255,0.35)_66.7%,transparent_66.9%),linear-gradient(to_bottom,transparent_33.1%,rgba(255,255,255,0.35)_33.3%,rgba(255,255,255,0.35)_33.6%,transparent_33.8%,transparent_66.2%,rgba(255,255,255,0.35)_66.4%,rgba(255,255,255,0.35)_66.7%,transparent_66.9%)]" />
                  <div className="pointer-events-none absolute inset-0 border-2 border-emerald-500" />
                  <span className="pointer-events-none absolute left-0 top-0 h-7 w-7 border-l-4 border-t-4 border-emerald-600" />
                  <span className="pointer-events-none absolute right-0 top-0 h-7 w-7 border-r-4 border-t-4 border-emerald-600" />
                  <span className="pointer-events-none absolute bottom-0 left-0 h-7 w-7 border-b-4 border-l-4 border-emerald-600" />
                  <span className="pointer-events-none absolute bottom-0 right-0 h-7 w-7 border-b-4 border-r-4 border-emerald-600" />
                </div>
              </div>

              <div className="space-y-3 px-5 py-4">
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => changeZoom(zoom - 0.15)} disabled={zoom <= 1 || uploading} className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 disabled:opacity-30" aria-label="ซูมออก"><Minus className="h-4 w-4" /></button>
                  <input id={`slip-zoom-${orderId}`} type="range" min="1" max="3" step="0.01" value={zoom} onChange={event => changeZoom(Number(event.target.value))} className="h-1.5 flex-1 cursor-pointer accent-emerald-600" aria-label="ซูมรูป" />
                  <button type="button" onClick={() => changeZoom(zoom + 0.15)} disabled={zoom >= 3 || uploading} className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 disabled:opacity-30" aria-label="ซูมเข้า"><Plus className="h-4 w-4" /></button>
                  <span className="w-10 text-right font-mono text-[10px] text-slate-400">{zoom.toFixed(1)}×</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={rotate} disabled={uploading} className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-[11px] font-bold text-slate-600 transition-colors hover:bg-slate-50">
                    <RotateCw className="h-4 w-4" /> หมุนรูป
                  </button>
                  <button type="button" onClick={resetEditor} disabled={uploading} className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-[11px] font-bold text-slate-600 transition-colors hover:bg-slate-50">
                    <RotateCcw className="h-4 w-4" /> เริ่มใหม่
                  </button>
                </div>
              </div>
            </div>

            <footer className="shrink-0 border-t border-slate-200 bg-white p-4">
              <button type="button" onClick={uploadSlip} disabled={uploading || !isImageReady} className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-60">
                {uploading ? <><LoaderCircle className="h-4 w-4 animate-spin" /> กำลังบันทึก...</> : <><Check className="h-4 w-4" /> บันทึกสลิป</>}
              </button>
            </footer>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="ยืนยันลบสลิป">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-500">
              <Trash2 className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-base font-bold text-slate-800">ลบสลิปใบนี้?</h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">รูปจะถูกลบออกจาก R2 แต่บิลและรายการรับชำระเงินจะไม่ถูกลบ</p>
            <div className="mt-6 flex gap-3">
              <button type="button" onClick={() => setShowDeleteConfirm(false)} disabled={deleting} className="flex-1 rounded-xl border border-slate-200 py-3 text-xs font-bold text-slate-600 hover:bg-slate-50">เก็บไว้</button>
              <button type="button" onClick={deleteSlip} disabled={deleting} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose-500 py-3 text-xs font-bold text-white hover:bg-rose-600 disabled:cursor-wait disabled:opacity-70">
                {deleting ? <><LoaderCircle className="h-4 w-4 animate-spin" /> กำลังลบ...</> : 'ลบสลิป'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
