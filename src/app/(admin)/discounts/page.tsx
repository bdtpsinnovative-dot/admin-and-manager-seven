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

  // 2. Fetch products in chunks (Supabase 1000 row batching) พร้อมหมวดหมู่และสต็อก
  let allProducts: any[] = [];
  let from = 0;
  while (true) {
    const { data: chunk } = await supabase
      .from("products")
      .select(`
        id, name, sku, image_url, category_id,
        collection_groups ( id, name, product_sup, tag ),
        stock ( branch_id, qty )
      `)
      .order("sku")
      .range(from, from + 999);
    if (!chunk || chunk.length === 0) break;
    allProducts = allProducts.concat(chunk);
    if (chunk.length < 1000) break;
    from += 1000;
  }

  const formattedProducts = allProducts.map((p) => {
    const totalStock = Array.isArray(p.stock)
      ? p.stock.reduce((sum: number, s: any) => sum + (Number(s.qty) || 0), 0)
      : 0;
    const subCategory = p.collection_groups?.product_sup || p.collection_groups?.name || null;
    return {
      id: p.id,
      name: p.name,
      sku: p.sku,
      image_url: p.image_url,
      category_id: p.category_id || "prop",
      sub_category: subCategory,
      total_stock: totalStock,
      stock: p.stock || [],
    };
  });

  return (
    <main className="min-h-screen bg-slate-50/60 p-4 sm:p-6 lg:p-8">
      <DiscountHubClient
        initialPosDiscounts={discounts || []}
        products={formattedProducts}
        branches={branchesRes.data || []}
        initialTerraPromotions={terraPromotions || []}
        collectionGroups={collectionGroups || []}
      />
    </main>
  );
}