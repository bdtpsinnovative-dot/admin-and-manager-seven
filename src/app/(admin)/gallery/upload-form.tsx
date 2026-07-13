'use client'

import { useActionState, useState, startTransition, useEffect } from 'react'
import { uploadGalleryImage } from '@/actions/upload-gallery'
import imageCompression from 'browser-image-compression'

const initialState = { message: '' }

export default function UploadForm() {
  const [state, formAction, isPending] =
    useActionState(uploadGalleryImage, initialState)

  const [preview, setPreview] = useState<string | null>(null)
  const [fileName, setFileName] = useState('')
  const [isCompressing, setIsCompressing] = useState(false)

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview)
    }
  }, [preview])

  const handleFileChange = (file: File | null) => {
    if (!file) return
    setFileName(file.name)
    const url = URL.createObjectURL(file)
    setPreview(url)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsCompressing(true)

    const formData = new FormData(e.currentTarget)
    const file = formData.get('file') as File

    if (file?.size) {
      let finalFile = file;
      
      if (file.size > 2 * 1024 * 1024) {
        // บีบอัดเฉพาะรูปที่ขนาดเกิน 2 MB
        const compressed = await imageCompression(file, {
          maxSizeMB: 1.8,
          maxWidthOrHeight: 2560,
          useWebWorker: true,
          fileType: 'image/webp',
        })
        finalFile = new File(
          [compressed],
          file.name.replace(/\.[^/.]+$/, '.webp'),
          { type: 'image/webp' }
        )
      } else {
        // รูปที่ขนาดไม่เกิน 2 MB แปลงเป็น webp โดยรักษาความละเอียดสูง
        const compressed = await imageCompression(file, {
          maxSizeMB: 5,
          maxWidthOrHeight: 3840,
          useWebWorker: true,
          fileType: 'image/webp',
        })
        finalFile = new File(
          [compressed],
          file.name.replace(/\.[^/.]+$/, '.webp'),
          { type: 'image/webp' }
        )
      }

      formData.set('file', finalFile)
    }

    setIsCompressing(false)
    startTransition(() => formAction(formData))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* Preview box */}
      <label
        htmlFor="file"
        className="
          relative block cursor-pointer overflow-hidden
          rounded-2xl border-2 border-dashed
          bg-gray-50 hover:border-blue-500 transition
        "
      >
        {preview ? (
          <img
            src={preview}
            alt="Preview"
            className="h-64 w-full object-cover"
          />
        ) : (
          <div className="flex h-64 flex-col items-center justify-center text-gray-400">
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-10 w-10 mb-3"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 16.5V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10.5M3 16.5l4.5-4.5a2 2 0 0 1 3 0l2 2 4.5-4.5a2 2 0 0 1 3 0L21 13.5M3 16.5V18a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-1.5"
    />
  </svg>

  <p className="text-sm font-medium">
    Click to upload image
  </p>
  <p className="text-xs mt-1">
    JPG / PNG / WEBP
  </p>
</div>

        )}
      </label>

      <input
        id="file"
        type="file"
        name="file"
        required
        className="hidden"
        onChange={(e) =>
          handleFileChange(e.target.files?.[0] ?? null)
        }
      />

      {/* File name */}
      {fileName && (
        <p className="text-xs text-gray-600">
          Selected: {fileName}
        </p>
      )}

      <input
        type="text"
        name="customName"
        placeholder="Custom file name (optional)"
        className="
          w-full rounded-xl border px-4 py-2
          focus:outline-none focus:ring-2 focus:ring-blue-500
        "
      />

      <button
        disabled={isPending || isCompressing}
        className="
          w-full rounded-xl bg-blue-600 py-3
          text-white font-medium
          hover:bg-blue-700 transition
          disabled:opacity-50
        "
      >
        {isCompressing
          ? 'Compressing...'
          : isPending
          ? 'Uploading...'
          : 'Upload Image'}
      </button>

      {state?.message && (
        <p className="text-sm text-green-600 text-center">
          {state.message}
        </p>
      )}
    </form>
  )
}
