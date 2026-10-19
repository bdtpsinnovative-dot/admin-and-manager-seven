//src/app/(admin)/props/page.tsx
export const dynamic = "force-dynamic";

import { getAllProps } from "@/actions/props";
import PropsClient from "./PropsClient";

export default async function PropsListPage() {
  const products = await getAllProps();

  return <PropsClient products={products ?? []} />;
}
