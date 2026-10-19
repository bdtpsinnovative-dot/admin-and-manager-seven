//src/app/(admin)/propsfina/page.tsx
export const dynamic = "force-dynamic";

import { getPropsBatch, getCategorySummaryCounts } from "@/actions/props";
import PropsClient from "./PropsClient";

export default async function PropsListPage() {
  const [initialData, categoryCounts] = await Promise.all([
    getPropsBatch({ category: "prop", offset: 0, limit: 100 }),
    getCategorySummaryCounts(),
  ]);

  return (
    <PropsClient
      initialProducts={initialData.products ?? []}
      initialTotalCount={initialData.totalCount ?? 0}
      initialCategoryCounts={categoryCounts}
    />
  );
}

