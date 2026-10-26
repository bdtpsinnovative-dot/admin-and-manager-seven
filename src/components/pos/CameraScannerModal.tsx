'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { X, Camera, SwitchCamera, Flashlight, Upload, AlertCircle, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

interface CameraScannerModalProps {
  isOpen: boolean
  onClose: () => void
  onScan: (code: string) => void
  title?: string
}

/**
 * ตัดแต่งข้อความที่สแกนได้ ไม่ว่าจะเป็น URL หรือโค้ดตรงๆ ให้เหลือแค่ Coupon Code ตัวพิมพ์ใหญ่
 */
export function extractCouponCode(rawText: string): string {
  let cleaned = (rawText || '').trim()
  if (!cleaned) return ''

  if (cleaned.startsWith('http://') || cleaned.startsWith('https://')) {
    try {
      const url = new URL(cleaned)
      const queryParam =
        url.searchParams.get('code') ||
        url.searchParams.get('coupon') ||
        url.searchParams.get('voucher') ||
        url.searchParams.get('c')
      if (queryParam) {
        return queryParam.trim().toUpperCase()
      }
      const segments = url.pathname.split('/').filter(Boolean)
      if (segments.length > 0) {
        return decodeURIComponent(segments[segments.length - 1]).trim().toUpperCase()
      }
    } catch {
      // url parse failed
    }
  }

  // Handle JSON format
  if (cleaned.startsWith('{') && cleaned.endsWith('}')) {
    try {
      const parsed = JSON.parse(cleaned)
      if (parsed.code || parsed.coupon_code || parsed.coupon) {
        return String(parsed.code || parsed.coupon_code || parsed.coupon).trim().toUpperCase()
      }
    } catch {
      // fallback
    }
  }

  return cleaned.toUpperCase()
}

/**
 * สร้างเสียง Beep สังเคราะห์ที่นุ่มนวลเมื่อสแกนสำเร็จ (Web Audio API)
 */
function playScanSuccessSound() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(1046.5, ctx.currentTime) // C6
    osc.frequency.setValueAtTime(1318.51, ctx.currentTime + 0.08) // E6

    gain.gain.setValueAtTime(0.2, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.22)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start()
    osc.stop(ctx.currentTime + 0.22)
  } catch {
    // Audio context may be restricted by browser policy
  }
}

export default function CameraScannerModal({
  isOpen,
  onClose,
  onScan,
  title = 'สแกน QR Code คูปองส่วนลด'
}: CameraScannerModalProps) {
  const containerIdRef = useRef(`qr-reader-${Math.random().toString(36).substring(2, 9)}`)
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null)
  const scannedRef = useRef(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([])
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0)
  const [isInitializing, setIsInitializing] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [hasTorch, setHasTorch] = useState(false)
  const [torchOn, setTorchOn] = useState(false)

  // จัดการเมื่อสแกนสำเร็จ
  const handleSuccess = useCallback(
    (decodedText: string) => {
      if (scannedRef.current) return
      scannedRef.current = true

      playScanSuccessSound()
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate([80, 40, 80])
        } catch {
          // ignore
        }
      }

      const code = extractCouponCode(decodedText)
      onScan(code)
      onClose()
    },
    [onScan, onClose]
  )

  // เริ่มกล้อง
  const startCamera = useCallback(
    async (cameraIdOrFacing: string | { facingMode: 'environment' | 'user' }) => {
      if (!isOpen) return
      setIsInitializing(true)
      setErrorMessage(null)

      try {
        // หยุดตัวเดิมก่อนถ้ามี
        if (html5QrCodeRef.current) {
          try {
            if (html5QrCodeRef.current.isScanning) {
              await html5QrCodeRef.current.stop()
            }
            html5QrCodeRef.current.clear()
          } catch (e) {
            console.warn('Error clearing previous qr scanner:', e)
          }
        }

        const scanner = new Html5Qrcode(containerIdRef.current, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A
          ],
          verbose: false
        })
        html5QrCodeRef.current = scanner

        const config = {
          fps: 15,
          qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight)
            const qrEdge = Math.max(180, Math.floor(minEdge * 0.72))
            return { width: qrEdge, height: qrEdge }
          },
          aspectRatio: 1.0
        }

        await scanner.start(
          cameraIdOrFacing,
          config,
          (decodedText) => {
            handleSuccess(decodedText)
          },
          () => {
            // parsing error while scanning frame - ignore
          }
        )

        // เช็คว่ามี Flashlight/Torch หรือไม่
        try {
          const capabilities = scanner.getRunningTrackCapabilities() as any
          if (capabilities && capabilities.torch) {
            setHasTorch(true)
          }
        } catch {
          setHasTorch(false)
        }

        // ดึงรายการกล้องทั้งหมดมาเก็บไว้เพื่อใช้สลับกล้อง
        try {
          const devices = await Html5Qrcode.getCameras()
          if (devices && devices.length > 0) {
            setCameras(devices)
          }
        } catch {
          // ignore
        }

        setIsInitializing(false)
      } catch (err: any) {
        console.error('Camera start error:', err)
        // ถ้า environment ล้มเหลว (เช่น บนคอมตั้งโต๊ะที่ไม่มีกล้องหลัง) ให้ fallback หากล้องแรก
        if (typeof cameraIdOrFacing === 'object' && cameraIdOrFacing.facingMode === 'environment') {
          try {
            const devices = await Html5Qrcode.getCameras()
            if (devices && devices.length > 0) {
              await startCamera(devices[0].id)
              return
            }
          } catch {
            // continue to error handling
          }
        }

        let msg = 'ไม่สามารถเข้าถึงกล้องได้ กรุณาตรวจสอบการอนุญาตใช้งานกล้อง (Camera Permission)'
        if (err?.name === 'NotAllowedError' || err?.message?.includes('Permission')) {
          msg = 'เบราว์เซอร์ถูกปฏิเสธการเข้าถึงกล้อง กรุณาเปิดอนุญาตสิทธิ์กล้องในการตั้งค่าของเบราว์เซอร์'
        } else if (err?.name === 'NotFoundError') {
          msg = 'ไม่พบอุปกรณ์กล้องในเครื่องนี้'
        }
        setErrorMessage(msg)
        setIsInitializing(false)
      }
    },
    [isOpen, handleSuccess]
  )

  // จัดการเมื่อเปิด/ปิด Modal
  useEffect(() => {
    if (!isOpen) return
    scannedRef.current = false
    setErrorMessage(null)
    setTorchOn(false)

    // เริ่มสแกนด้วยกล้องหลัง (environment) ซึ่งเหมาะกับ iPad / Mobile มากที่สุด
    startCamera({ facingMode: 'environment' })

    return () => {
      if (html5QrCodeRef.current) {
        try {
          if (html5QrCodeRef.current.isScanning) {
            html5QrCodeRef.current.stop().catch(() => {}).finally(() => {
              try {
                html5QrCodeRef.current?.clear()
              } catch {}
            })
          } else {
            html5QrCodeRef.current.clear()
          }
        } catch {
          // ignore
        }
      }
    }
  }, [isOpen, startCamera])

  // สลับกล้อง (หน้า/หลัง/เลนส์อื่น)
  const handleSwitchCamera = async () => {
    if (cameras.length <= 1) return
    const nextIndex = (currentCameraIndex + 1) % cameras.length
    setCurrentCameraIndex(nextIndex)
    await startCamera(cameras[nextIndex].id)
  }

  // เปิด/ปิดไฟฉาย
  const handleToggleTorch = async () => {
    if (!html5QrCodeRef.current || !hasTorch) return
    try {
      const nextState = !torchOn
      await (html5QrCodeRef.current as any).applyVideoConstraints({
        advanced: [{ torch: nextState }]
      })
      setTorchOn(nextState)
    } catch (e) {
      console.warn('Torch toggle error:', e)
    }
  }

  // อัปโหลดรูปภาพจากคลังรูป / ไฟล์
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const scanner = html5QrCodeRef.current || new Html5Qrcode(containerIdRef.current)
      const decodedText = await scanner.scanFile(file, false)
      if (decodedText) {
        handleSuccess(decodedText)
      } else {
        toast.error('ไม่พบคิวอาร์โค้ดในรูปภาพที่เลือก')
      }
    } catch {
      toast.error('ไม่พบคิวอาร์โค้ดในรูปภาพ กรุณาลองใหม่อีกครั้ง')
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm sm:max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-white">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-tight text-white">{title}</h3>
              <p className="text-[11px] text-slate-400">หันกล้องไปที่ QR Code หรือ บาร์โค้ด</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 active:scale-95 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Viewport กล้อง */}
        <div className="relative w-full bg-black aspect-square overflow-hidden flex items-center justify-center">
          
          {/* HTML5 QrCode Container */}
          <div
            id={containerIdRef.current}
            className="w-full h-full [&_video]:w-full [&_video]:h-full [&_video]:object-cover"
          />

          {/* Loading Indicator */}
          {isInitializing && !errorMessage && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 gap-3 z-10">
              <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
              <span className="text-xs text-slate-300 font-medium">กำลังเปิดกล้อง...</span>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="absolute inset-0 p-6 flex flex-col items-center justify-center bg-slate-950/95 text-center gap-3 z-10">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
                <AlertCircle className="w-6 h-6" />
              </div>
              <p className="text-xs text-rose-300 font-medium leading-relaxed max-w-xs">{errorMessage}</p>
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => startCamera({ facingMode: 'environment' })}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all"
                >
                  ลองใหม่อีกครั้ง
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all"
                >
                  เลือกรูปแทน
                </button>
              </div>
            </div>
          )}

          {/* กรอบเล็ง Viewfinder โอเวอร์เลย์ (แสดงเมื่อกล้องพร้อม) */}
          {!isInitializing && !errorMessage && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="relative w-[65%] h-[65%] border-2 border-emerald-400/40 rounded-2xl flex items-center justify-center shadow-[0_0_50px_rgba(16,185,129,0.15)]">
                
                {/* มุมกรอบเล็ง */}
                <span className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
                <span className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
                <span className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
                <span className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />

                {/* เส้นเลเซอร์แสกนเคลื่อนไหว */}
                <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34d399] animate-[bounce_2s_infinite]" />
              </div>
            </div>
          )}

          {/* Quick Controls บนกล้อง */}
          {!isInitializing && !errorMessage && (
            <div className="absolute top-3 right-3 flex items-center gap-2 z-20">
              {hasTorch && (
                <button
                  type="button"
                  onClick={handleToggleTorch}
                  className={`p-2.5 rounded-full backdrop-blur-md transition-all ${
                    torchOn ? 'bg-amber-400 text-slate-900 shadow-lg' : 'bg-black/40 text-white hover:bg-black/60'
                  }`}
                  title="เปิด/ปิด แฟลช"
                >
                  <Flashlight className="w-4 h-4" />
                </button>
              )}

              {cameras.length > 1 && (
                <button
                  type="button"
                  onClick={handleSwitchCamera}
                  className="p-2.5 rounded-full bg-black/40 hover:bg-black/60 active:scale-95 backdrop-blur-md text-white transition-all"
                  title="สลับกล้อง"
                >
                  <SwitchCamera className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-3">
          {/* ซ่อน input file ไว้กดผ่านปุ่ม */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 py-2.5 px-3 bg-slate-800 hover:bg-slate-700/80 active:scale-98 text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border border-slate-700/60 transition-all cursor-pointer"
          >
            <Upload className="w-4 h-4 text-emerald-400" />
            <span>เลือกรูปภาพจากเครื่อง</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-4 bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-semibold transition-all cursor-pointer"
          >
            ยกเลิก
          </button>
        </div>

      </div>
    </div>
  )
}
