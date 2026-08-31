import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function TerraPromotionsRedirectPage() {
  redirect("/discounts?channel=terra");
}
