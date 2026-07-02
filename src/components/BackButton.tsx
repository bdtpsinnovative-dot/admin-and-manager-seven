"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"

interface BackButtonProps {
  fallbackHref: string
  className?: string
  children?: React.ReactNode
}

export default function BackButton({ fallbackHref, className, children }: BackButtonProps) {
  const router = useRouter()

  const handleBack = (e: React.MouseEvent) => {
    e.preventDefault()
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back()
    } else {
      router.push(fallbackHref)
    }
  }

  return (
    <button onClick={handleBack} className={className}>
      {children || (
        <>
          <ArrowLeft className="w-4 h-4 mr-1" />
          <span>กลับ</span>
        </>
      )}
    </button>
  )
}
