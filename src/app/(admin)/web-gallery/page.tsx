import { getJournalCategoriesWithImages } from "@/actions/journal-collections";
import WebGalleryClient from "./WebGalleryClient";

export const dynamic = "force-dynamic";

export default async function WebGalleryPage() {
  const categories = await getJournalCategoriesWithImages();

  return <WebGalleryClient initialCategories={categories} />;
}
