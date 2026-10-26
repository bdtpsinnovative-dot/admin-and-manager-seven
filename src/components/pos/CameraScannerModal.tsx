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
 * แปลงชื่อกล้องให้อ่านง่ายสำหรับผู้ใช้งานภาษาไทย
 */
function formatCameraLabel(label: string, index: number, total: number): string {
  const l = (label || '').toLowerCase()
  if (l.includes('back') || l.includes('rear') || l.includes('environment') || l.includes('หลัง')) {
    if (l.includes('ultra') || l.includes('0.5')) return 'กล้องหลัง (มุมกว้าง)'
    return 'กล้องหลัง'
  }
  if (l.includes('front') || l.includes('facetime') || l.includes('หน้า') || l.includes('user')) {
    return 'กล้องหน้า'
  }
  if (total > 1) {
    // บน iOS/iPadOS มักเรียง กล้อง 0 = กล้องหน้า, กล้อง 1 = กล้องหลัง
    if (index === 0) return 'กล้อง 1 (หน้า)'
    if (index === 1) return 'กล้อง 2 (หลัง)'
  }
  return label || `กล้องที่ ${index + 1}`
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

  // ฟังก์ชันหยุดกล้องอย่างปลอดภัย (รอให้ AVFoundation / WebKit ปล่อย hardware lock)
  const stopCurrentScanner = useCallback(async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop()
        }
        html5QrCodeRef.current.clear()
      } catch (e) {
        console.warn('Error clearing previous scanner:', e)
      }
      // ดีเลย์ 250ms เพื่อป้องกัน iOS hardware camera lock error (-11819)
      await new Promise((resolve) => setTimeout(resolve, 250))
    }
  }, [])

  // เริ่มสแกนกล้องตัวที่ระบุ
  const launchScanner = useCallback(
    async (cameraIdOrConfig: string | { facingMode: string }) => {
      setIsInitializing(true)
      setErrorMessage(null)

      try {
        await stopCurrentScanner()

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
          cameraIdOrConfig as any,
          config,
          (decodedText) => {
            handleSuccess(decodedText)
          },
          () => {
            // parsing error while scanning frame - ignore
          }
        )

        // บังคับ playsinline และ autoplay สำหรับ Safari / iPadOS ไม่ให้วิดีโอค้างเป็นจอดำ
        setTimeout(() => {
          try {
            const videoEl = document.querySelector(`#${containerIdRef.current} video`) as HTMLVideoElement | null
            if (videoEl) {
              videoEl.setAttribute('playsinline', 'true')
              videoEl.setAttribute('webkit-playsinline', 'true')
              videoEl.muted = true
              videoEl.play().catch(() => {})
            }
          } catch {
            // ignore
          }
        }, 150)

        // เช็คว่ามี Flashlight/Torch หรือไม่
        try {
          const capabilities = scanner.getRunningTrackCapabilities() as any
          if (capabilities && capabilities.torch) {
            setHasTorch(true)
          } else {
            setHasTorch(false)
          }
        } catch {
          setHasTorch(false)
        }

        setIsInitializing(false)
      } catch (err: any) {
        console.error('Camera launch error:', err)
        let msg = 'ไม่สามารถเปิดกล้องได้ กรุณาตรวจสอบสิทธิ์การใช้งานกล้องในการตั้งค่า'
        if (err?.name === 'NotAllowedError' || err?.message?.includes('Permission')) {
          msg = 'เบราว์เซอร์ถูกปฏิเสธการเข้าถึงกล้อง กรุณาเปิดอนุญาตสิทธิ์กล้องในการตั้งค่าของ iPad / เบราว์เซอร์'
        } else if (err?.name === 'NotFoundError') {
          msg = 'ไม่พบอุปกรณ์กล้องในเครื่องนี้'
        } else if (err?.name === 'NotReadableError') {
          msg = 'กล้องกำลังถูกใช้งานโดยแอปอื่น หรือระบบกล้องของ iPad ยังไม่พร้อมใช้งาน กรุณาลองใหม่อีกครั้ง'
        }
        setErrorMessage(msg)
        setIsInitializing(false)
      }
    },
    [handleSuccess, stopCurrentScanner]
  )

  // เริ่มต้นค้นหากล้องหลังที่เหมาะสมที่สุดสำหรับ iPad / iPhone / อุปกรณ์เคลื่อนที่
  const initAndStartBackCamera = useCallback(async () => {
    setIsInitializing(true)
    setErrorMessage(null)

    // ตรวจสอบ Secure Context บน iOS (Apple บล็อกกล้องผ่าน HTTP ยกเว้น localhost)
    if (typeof window !== 'undefined' && window.isSecureContext === false && window.location.hostname !== 'localhost') {
      setErrorMessage('Safari บน iPad ไม่อนุญาตให้เปิดกล้องผ่าน HTTP ทั่วไป กรุณาใช้งานผ่าน HTTPS หรือกด "เลือกรูปภาพจากเครื่อง" ด้านล่างแทนได้ครับ')
      setIsInitializing(false)
      return
    }

    try {
      // 1. ตรวจสอบสิทธิ์และดึงรายชื่อกล้อง
      let devices: { id: string; label: string }[] = []
      try {
        devices = await Html5Qrcode.getCameras()
      } catch (e) {
        console.warn('Initial getCameras failed:', e)
      }

      // บน iPad/iOS หากยังไม่เคยขอ permission รายการ label จะเป็นสตริงว่าง
      // เราจะ probe ขอสิทธิ์สั้นๆ เพื่อให้ได้ชื่อกล้องครบถ้วน
      if (!devices || devices.length === 0 || (devices.length > 0 && !devices[0].label)) {
        try {
          if (navigator?.mediaDevices?.getUserMedia) {
            const probeStream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: { ideal: 'environment' } },
              audio: false
            })
            // ปิด track ทันที
            probeStream.getTracks().forEach((track) => track.stop())
            await new Promise((r) => setTimeout(r, 200))
            devices = await Html5Qrcode.getCameras()
          }
        } catch (permErr: any) {
          console.warn('Permission probe error:', permErr)
          if (permErr?.name === 'NotAllowedError') {
            setErrorMessage('เบราว์เซอร์ถูกปฏิเสธการเข้าถึงกล้อง กรุณาเปิดอนุญาตสิทธิ์กล้องในการตั้งค่าของ iPad')
            setIsInitializing(false)
            return
          }
        }
      }

      setCameras(devices)

      // 2. ค้นหากล้องหลังที่ชัดเจน
      let targetCameraId: string | null = null
      let targetIndex = 0

      if (devices && devices.length > 0) {
        // ก. หาจากชื่อ label ที่ระบุว่าเป็นกล้องหลัง (เช่น "Back Camera", "Rear", "Camera 1, Facing back")
        // และพยายามเลี่ยงเลนส์ Ultra-wide ในขั้นแรก
        let backIdx = devices.findIndex((d) => {
          const l = d.label.toLowerCase()
          return (
            (l.includes('back') || l.includes('rear') || l.includes('environment') || l.includes('หลัง')) &&
            !l.includes('ultra') &&
            !l.includes('0.5')
          )
        })

        // ข. หากไม่เจอกล้องหลังปกติ ให้หากล้องหลังตัวใดก็ได้
        if (backIdx === -1) {
          backIdx = devices.findIndex((d) => {
            const l = d.label.toLowerCase()
            return l.includes('back') || l.includes('rear') || l.includes('environment') || l.includes('หลัง')
          })
        }

        // ค. บน iPad/iPhone หาก label ว่างเปล่า: กล้องที่ 0 คือกล้องหน้า และกล้องที่ 1 หรือตัวสุดท้ายคือกล้องหลัง!
        if (backIdx === -1 && devices.length > 1) {
          backIdx = devices.length - 1
        }

        if (backIdx !== -1) {
          targetIndex = backIdx
          targetCameraId = devices[backIdx].id
        } else {
          targetIndex = 0
          targetCameraId = devices[0].id
        }

        setCurrentCameraIndex(targetIndex)
      }

      // 3. เริ่มเปิดกล้องด้วย Device ID ที่เจาะจงกล้องหลัง
      if (targetCameraId) {
        await launchScanner(targetCameraId)
      } else {
        // หากไม่มี device list ให้ใช้ facingMode environment
        await launchScanner({ facingMode: 'environment' })
      }
    } catch (err: any) {
      console.error('initAndStartBackCamera failed:', err)
      // Fallback ครั้งสุดท้าย
      try {
        await launchScanner({ facingMode: 'environment' })
      } catch (fbErr: any) {
        setErrorMessage('ไม่สามารถเปิดใช้งานกล้องหลังได้ กรุณาตรวจสอบสิทธิ์การใช้งานกล้องในการตั้งค่า iPad')
        setIsInitializing(false)
      }
    }
  }, [launchScanner])

  // จัดการเมื่อเปิด/ปิด Modal
  useEffect(() => {
    if (!isOpen) return
    scannedRef.current = false
    setErrorMessage(null)
    setTorchOn(false)

    // สตาร์ตค้นหาและเปิดกล้องหลังสำหรับ iPad ทันที
    initAndStartBackCamera()

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
  }, [isOpen, initAndStartBackCamera])

  // สลับกล้อง (หน้า/หลัง/เลนส์อื่น)
  const handleSwitchCamera = async () => {
    if (cameras.length <= 1) return
    const nextIndex = (currentCameraIndex + 1) % cameras.length
    setCurrentCameraIndex(nextIndex)
    await launchScanner(cameras[nextIndex].id)
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

  const currentCamera = cameras[currentCameraIndex]
  const currentCameraDisplay = currentCamera
    ? formatCameraLabel(currentCamera.label, currentCameraIndex, cameras.length)
    : 'กล้องหลัง'

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
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm tracking-tight text-white">{title}</h3>
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                  {currentCameraDisplay}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">หันกล้อง iPad ไปที่ QR Code คูปอง</p>
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
              <div className="text-center">
                <span className="text-xs text-slate-200 font-bold block">กำลังเปิดกล้องหลัง...</span>
                <span className="text-[11px] text-slate-400">โปรดรอสักครู่</span>
              </div>
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
                  onClick={() => initAndStartBackCamera()}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  ลองเปิดกล้องใหม่
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
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
                  className={`p-2.5 rounded-full backdrop-blur-md transition-all cursor-pointer ${
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
                  className="px-3 py-1.5 rounded-full bg-black/60 hover:bg-black/80 active:scale-95 backdrop-blur-md text-white transition-all text-xs font-semibold flex items-center gap-1.5 cursor-pointer border border-white/10"
                  title="แตะเพื่อสลับกล้อง"
                >
                  <SwitchCamera className="w-4 h-4 text-emerald-400" />
                  <span>สลับกล้อง ({cameras.length})</span>
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
