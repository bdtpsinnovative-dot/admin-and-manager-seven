import { getJournalCategories } from "@/actions/web-gallery"
import WebGalleryClient from "./WebGalleryClient"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function WebGalleryPage() {
  const { data: categories, error } = await getJournalCategories()

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 md:p-8 font-sans">
      <WebGalleryClient initialCategories={categories || []} fetchError={error} />
    </div>
  )
}
