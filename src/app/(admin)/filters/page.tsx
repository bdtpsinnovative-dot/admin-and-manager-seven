// src/app/(admin)/filters/page.tsx
export const dynamic = "force-dynamic";

import { getFiltersDashboardData } from "@/actions/filters";
import FiltersClient from "./FiltersClient";

export default async function FiltersPage() {
  const data = await getFiltersDashboardData();

  return <FiltersClient initialData={data} />;
}
