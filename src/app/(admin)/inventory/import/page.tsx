//src/app/(admin)/inventory/import/page.tsx

import BulkUploadProducts from "@/components/BulkUploadProducts"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { redirect } from "next/navigation"

export default async function ImportPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const initialPfRes = await supabaseAdmin
    .from('profiles')
    .select('role, member_tags, allowed_inventory_tabs, can_view_costs')
    .eq('user_id', user.id)
    .maybeSingle()

  let profile: any = initialPfRes.data

  if (initialPfRes.error && initialPfRes.error.message?.includes('can_view_costs')) {
    const fallback = await supabaseAdmin
      .from('profiles')
      .select('role, member_tags, allowed_inventory_tabs')
      .eq('user_id', user.id)
      .maybeSingle()
    profile = fallback.data
  }

  const userRole = profile?.role || 'admin'
  const isSuperAccess = userRole === 'admin' || userRole === 'data_analyst'

  let canViewCosts: boolean
  if (profile?.can_view_costs !== undefined && profile?.can_view_costs !== null) {
    canViewCosts = Boolean(profile.can_view_costs)
  } else {
    canViewCosts = ['admin', 'manager', 'data_analyst'].includes(userRole)
  }

  const rawAllowed = (profile as any)?.allowed_inventory_tabs?.length > 0
    ? (profile as any).allowed_inventory_tabs
    : ((profile as any)?.member_tags?.length > 0 ? (profile as any).member_tags : ['SLABS', 'ROUGH', 'PROP', 'FURNITURE'])

  const allowedTabs: string[] = isSuperAccess ? ['SLABS', 'ROUGH', 'PROP', 'FURNITURE'] : rawAllowed

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <Link 
          href="/inventory" 
          className="inline-flex items-center text-sm text-slate-500 hover:text-blue-600 transition mb-4 font-semibold"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> กลับไปหน้าคลังสินค้า
        </Link>
        
        {/* เรียกใช้ Component พร้อมส่งสิทธิ์หมวดหมู่และสิทธิ์ดูต้นทุน */}
        <BulkUploadProducts allowedTabs={allowedTabs} canViewCosts={canViewCosts} />
      </div>
    </div>
  )
}