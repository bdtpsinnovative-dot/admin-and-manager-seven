
//src/app/(admin)/inventory/[id]/page.tsx
import WoodSlabForm from "../../../../components/WoodSlabForm" 
import { getProductById } from "../../../../actions/woodslab"
import { notFound } from "next/navigation"
import BackButton from "../../../../components/BackButton"
import { ArrowLeft } from "lucide-react"

// 定義 type
type Props = {
  params: Promise<{ id: string }>
}

export default async function EditProductPage({ params }: Props) {
  const resolvedParams = await params
  const id = resolvedParams.id
  
  if (id === 'new') {
      return <WoodSlabForm />
  }

  const { data: product, error } = await getProductById(id)

  if (error || !product) {
    return notFound()
  }

  return (
    <div className="bg-slate-50 min-h-screen pb-10">
       <div className="max-w-6xl mx-auto pt-6 px-4">
          <BackButton fallbackHref="/inventory" className="inline-flex items-center text-sm text-slate-500 hover:text-blue-600 transition mb-2 cursor-pointer">
            <ArrowLeft className="w-4 h-4 mr-1" /> กลับไปหน้าคลังสินค้า
          </BackButton>
       </div>

       {/* ส่งข้อมูล product เก่าเข้าไปใน form */}
       <WoodSlabForm initialData={product} />
    </div>
  )
}