//src/app/(admin)/propsfina/page.tsx
export const dynamic = "force-dynamic";

import { getAllProps, getActiveDiscounts } from "@/actions/props";
import PropsClient from "./PropsClient";

export default async function PropsListPage() {
  const [products, activeDiscounts] = await Promise.all([
    getAllProps(),
    getActiveDiscounts(),
  ]);

  return (
    <PropsClient
      products={products ?? []}
      initialActiveDiscounts={activeDiscounts ?? []}
    />
  );
}
