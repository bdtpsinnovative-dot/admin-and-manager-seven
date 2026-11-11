//src/app/(admin)/propsfinatest/page.tsx
export const dynamic = "force-dynamic";

import { getAllProps, getActiveDiscounts } from "@/actions/props";
import PropsClient from "./PropsClient";

export default async function PropsListTestPage() {
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
