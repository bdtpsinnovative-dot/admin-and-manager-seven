//src/app/(admin)/props/page.tsx

import { createClient } from "@/lib/supabase/server";
import PropsClient from "./PropsClient";

export default async function PropsListPage() {
  const supabase = await createClient();

  const { data: products } = await supabase
    .from("products")
    .select("*")
    .eq("category_id", "prop")
    .order("created_at", { ascending: false });

  return <PropsClient products={products ?? []} />;
}
