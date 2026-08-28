import { createClient } from "@/lib/supabase/server";
import { getTerraPromotions, getAvailableCollectionGroups } from "@/actions/terra-promotions";
import DiscountHubClient from "./DiscountHubClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "จัดการส่วนลด & โปรโมชัน | Admin",
  description: "ศูนย์จัดการส่วนลดหน้าร้าน POS และโปรโมชันคอลเลกชัน/คูปองเว็บ Terra",
};

export default async function DiscountsPage() {
  const supabase = await createClient();

  // 1. Fetch POS Data (discounts, products, branches) & Terra Data (promotions, collection groups) in parallel
  const [
    { data: discounts },
    branchesRes,
    terraPromotions,
    collectionGroups,
  ] = await Promise.all([
    supabase
      .from("discounts")
      .select("*, discount_rules(*)")
      .order("created_at", { ascending: false }),
    supabase.from("branches").select("id, branch_name"),
    getTerraPromotions(),
    getAvailableCollectionGroups(),
  ]);

  // 2. Fetch products in chunks (Supabase 1000 row batching)
  let allProducts: any[] = [];
  let from = 0;
  while (true) {
    const { data: chunk } = await supabase
      .from("products")
      .select("id, name, sku, image_url")
      .order("sku")
      .range(from, from + 999);
    if (!chunk || chunk.length === 0) break;
    allProducts = allProducts.concat(chunk);
    if (chunk.length < 1000) break;
    from += 1000;
  }

  return (
    <main className="min-h-screen bg-slate-50/60 p-4 sm:p-6 lg:p-8">
      <DiscountHubClient
        initialPosDiscounts={discounts || []}
        products={allProducts}
        branches={branchesRes.data || []}
        initialTerraPromotions={terraPromotions || []}
        collectionGroups={collectionGroups || []}
      />
    </main>
  );
}