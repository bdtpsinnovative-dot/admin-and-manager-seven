import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Tag } from "lucide-react";
import UpdateSkuClient from "./UpdateSkuClient";

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function UpdateSkuPage({ searchParams }: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role, allowed_inventory_tabs, member_tags")
    .eq("user_id", user.id)
    .maybeSingle();

  const userRole = profile?.role || "employee";
  const isSuperAccess = userRole === "admin" || userRole === "data_analyst";

  const rawMemberCats = Array.isArray((profile as any)?.member_tags)
    ? (profile as any).member_tags.filter((t: string) => !t.startsWith("PAGE:"))
    : [];

  const rawAllowed =
    (profile as any)?.allowed_inventory_tabs?.length > 0
      ? (profile as any).allowed_inventory_tabs
      : rawMemberCats.length > 0
      ? rawMemberCats
      : ["PROP", "SLABS", "ROUGH", "FURNITURE"];

  const allowedTabs: string[] = isSuperAccess
    ? ["PROP", "SLABS", "ROUGH", "FURNITURE"]
    : rawAllowed;

  const resolvedSearchParams = await searchParams;
  const initialTab = (resolvedSearchParams.tab as string) || (allowedTabs.includes("PROP") ? "PROP" : allowedTabs[0] || "PROP");

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 font-sans text-slate-800">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <Link
              href={`/inventory?tab=${initialTab}`}
              className="inline-flex items-center text-sm text-slate-500 hover:text-indigo-600 transition mb-2 font-semibold group cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5 transition-transform group-hover:-translate-x-1" />
              กลับไปหน้าคลังสินค้า ({initialTab})
            </Link>
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 inline-flex items-center justify-center">
                <Tag className="w-6 h-6" />
              </span>
              อัปเดตและจัดการรหัส SKU (Update Product SKU)
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm mt-1">
              แก้ไขรหัส SKU สินค้าโดยตรงในฐานข้อมูล ปลอดภัย 100% ไม่ลบสินค้า ไม่กระทบสต็อกและประวัติการขาย
            </p>
          </div>
        </div>

        {/* Client Component */}
        <UpdateSkuClient
          allowedTabs={allowedTabs}
          initialTab={initialTab}
        />
      </div>
    </div>
  );
}
