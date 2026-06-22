//src/app/(admin)/inventory/import/page.tsx

import BulkUploadProducts from "@/components/BulkUploadProducts" // เช็ค path ให้ตรงนะครับนาย
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function ImportPage() {
  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <Link 
          href="/inventory" 
          className="inline-flex items-center text-sm text-slate-500 hover:text-blue-600 transition mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> กลับไปหน้าคลังสินค้า
        </Link>
        
        {/* เรียกใช้ Component ที่เราทำกันไว้ครับนาย */}
        <BulkUploadProducts />
      </div>
    </div>
  )
}