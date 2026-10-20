//src/app/(admin)/props2/page.tsx
export const dynamic = "force-dynamic";

import { getPropsBatch, getCategorySummaryCounts, getActiveDiscounts } from "@/actions/props";
import PropsClient from "./PropsClient";

export default async function PropsListPage() {
  const [initialData, categoryCounts, activeDiscounts] = await Promise.all([
    getPropsBatch({ category: "prop", offset: 0, limit: 100 }),
    getCategorySummaryCounts(),
    getActiveDiscounts(),
  ]);

  return (
    <PropsClient
      initialProducts={initialData.products ?? []}
      initialTotalCount={initialData.totalCount ?? 0}
      initialCategoryCounts={categoryCounts}
      initialActiveDiscounts={activeDiscounts ?? []}
    />
  );
}

