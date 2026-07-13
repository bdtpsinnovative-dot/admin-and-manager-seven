import { createClient } from "@/lib/supabase/server";
import PropsClient from "./PropsClient";

export default async function PropsListPage() {
  const supabase = await createClient();

  // ดึงข้อมูลสินค้า
  const { data: products } = await supabase
    .from("products")
    .select("*")
    .eq("category_id", "prop")
    .order("created_at", { ascending: false });

  // ดึงข้อมูลส่วนลด (discounts) และกฎเกณฑ์ (discount_rules)
  const { data: discountRules } = await supabase
    .from("discount_rules")
    .select(`
      product_id,
      discount:discounts (
        id,
        name,
        discount_type,
        value,
        active,
        start_date,
        end_date
      )
    `) as any;

  const now = new Date();
  const activeRules = (discountRules ?? []).filter((rule: any) => {
    const d = rule.discount;
    if (!d || !d.active) return false;
    if (d.start_date && new Date(d.start_date) > now) return false;
    if (d.end_date && new Date(d.end_date) < now) return false;
    return true;
  });

  // คำนวณส่วนลดที่ดีที่สุดสำหรับสินค้าแต่ละชิ้น
  const productsWithDiscounts = (products ?? []).map((product: any) => {
    const productRules = activeRules.filter((r: any) => r.product_id === product.id);
    if (productRules.length === 0) return product;

    let bestDiscount: any = null;
    let bestDiscountedPrice = Number(product.price);

    productRules.forEach((rule: any) => {
      const d = rule.discount;
      const price = Number(product.price);
      let discountedPrice = price;

      if (d.discount_type === "PERCENT") {
        discountedPrice = price - (price * Number(d.value)) / 100;
      } else if (d.discount_type === "FIXED") {
        discountedPrice = Math.max(0, price - Number(d.value));
      }

      if (discountedPrice < bestDiscountedPrice) {
        bestDiscountedPrice = discountedPrice;
        bestDiscount = d;
      }
    });

    if (bestDiscount && bestDiscountedPrice < Number(product.price)) {
      return {
        ...product,
        active_discount: {
          id: bestDiscount.id,
          name: bestDiscount.name,
          discount_type: bestDiscount.discount_type,
          value: Number(bestDiscount.value),
          discounted_price: bestDiscountedPrice
        }
      };
    }

    return product;
  });

  return <PropsClient products={productsWithDiscounts} />;
}
