
//src/app/(admin)/inventory/[id]/page.tsx
import WoodSlabForm from "../../../../components/WoodSlabForm" 
import { getProductById, checkCanViewCosts } from "../../../../actions/woodslab"
import { notFound, redirect } from "next/navigation"
import BackButton from "../../../../components/BackButton"
import { ArrowLeft } from "lucide-react"
import { createClient } from "../../../../lib/supabase/server"

type Props = {
  params: Promise<{ id: string }>
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}

function getTabFromCategory(categoryId?: string | null): string {
  if (categoryId === 'prop') return 'PROP'
  if (categoryId === 'furniture') return 'FURNITURE'
  if (categoryId === 'rough_wood') return 'ROUGH'
  return 'SLABS'
}

function getCategoryFromTab(tab?: string | null): 'SLABS' | 'rough_wood' | 'prop' | 'furniture' {
  const t = (tab || '').toUpperCase()
  if (t === 'PROP' || t === 'PROPS') return 'prop'
  if (t === 'FURNITURE') return 'furniture'
  if (t === 'ROUGH' || t === 'ROUGH_WOOD') return 'rough_wood'
  return 'SLABS'
}

export default async function EditProductPage({ params, searchParams }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const canViewCosts = await checkCanViewCosts()

  const resolvedParams = await params
  const resolvedSearch = searchParams ? await searchParams : {}
  const id = resolvedParams.id
  
  if (id === 'new') {
    const initialCategory = getCategoryFromTab(resolvedSearch.tab as string)
    const backTab = getTabFromCategory(initialCategory)
    return (
      <div className="bg-slate-50 min-h-screen pb-10">
        <div className="max-w-6xl mx-auto pt-6 px-4">
          <BackButton fallbackHref={`/inventory?tab=${backTab}`} className="inline-flex items-center text-sm text-slate-500 hover:text-blue-600 transition mb-2 cursor-pointer">
            <ArrowLeft className="w-4 h-4 mr-1" /> กลับไปหน้าคลังสินค้า
          </BackButton>
        </div>
        <WoodSlabForm canViewCosts={canViewCosts} initialCategory={initialCategory} />
      </div>
    )
  }

  const { data: product, error } = await getProductById(id)

  if (error || !product) {
    return notFound()
  }

  const backTab = getTabFromCategory(product.category_id)

  return (
    <div className="bg-slate-50 min-h-screen pb-10">
       <div className="max-w-6xl mx-auto pt-6 px-4">
          <BackButton fallbackHref={`/inventory?tab=${backTab}`} className="inline-flex items-center text-sm text-slate-500 hover:text-blue-600 transition mb-2 cursor-pointer">
            <ArrowLeft className="w-4 h-4 mr-1" /> กลับไปหน้าคลังสินค้า
          </BackButton>
       </div>

       {/* ส่งข้อมูล product เก่าเข้าไปใน form */}
       <WoodSlabForm initialData={product} canViewCosts={canViewCosts} />
    </div>
  )
}