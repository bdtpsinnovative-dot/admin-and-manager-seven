import { getJournalCategoriesWithImages } from "@/actions/journal-collections";
import CollectionsManagerClient from "./CollectionsManagerClient";

export const dynamic = "force-dynamic";

export default async function CollectionsPage() {
  const categories = await getJournalCategoriesWithImages();

  return <CollectionsManagerClient initialCategories={categories} />;
}
