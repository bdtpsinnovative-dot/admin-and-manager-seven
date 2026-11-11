//src/app/(admin)/propsfinatest2/page.tsx
export const dynamic = "force-dynamic";

import { getAllProps, getActiveDiscounts } from "@/actions/props";
import PropsClient from "./PropsClient";

export default async function PropsListTest2Page() {
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
