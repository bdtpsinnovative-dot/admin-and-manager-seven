// src/app/(admin)/employees/page.tsx
import { createClient } from "../../../lib/supabase/server";
import { supabaseAdmin } from "../../../lib/supabase/admin"; // ✅ เรียกใช้ admin client
import EmployeeClient from "./EmployeeClient";

// src/app/(admin)/employees/page.tsx
// ... (import ส่วนอื่นๆ เหมือนเดิม)

export default async function EmployeesPage() {
  const { data: { users: authUsers }, error: authError } = await supabaseAdmin.auth.admin.listUsers();

  if (authError) {
    return <div className="p-8 text-center text-red-500">Error: ไม่สามารถดึงข้อมูล User ได้ ({authError.message})</div>;
  }

  const initialRes = await supabaseAdmin
    .from('profiles')
    .select('user_id, full_name, role, phone, citizen_id, birth_date, avatar_url, branch_id, member_tags, allowed_inventory_tabs, allowed_pages, can_view_costs, branches(id, branch_name, branch_code)');

  let profiles: any[] | null = initialRes.data;

  if (initialRes.error && initialRes.error.message?.includes('allowed_pages')) {
    const resNoPages = await supabaseAdmin
      .from('profiles')
      .select('user_id, full_name, role, phone, citizen_id, birth_date, avatar_url, branch_id, member_tags, allowed_inventory_tabs, can_view_costs, branches(id, branch_name, branch_code)');
    profiles = resNoPages.data;
    if (resNoPages.error && resNoPages.error.message?.includes('can_view_costs')) {
      const fallback = await supabaseAdmin
        .from('profiles')
        .select('user_id, full_name, role, phone, citizen_id, birth_date, avatar_url, branch_id, member_tags, allowed_inventory_tabs, branches(id, branch_name, branch_code)');
      profiles = fallback.data;
    }
  } else if (initialRes.error && initialRes.error.message?.includes('can_view_costs')) {
    const fallback = await supabaseAdmin
      .from('profiles')
      .select('user_id, full_name, role, phone, citizen_id, birth_date, avatar_url, branch_id, member_tags, allowed_inventory_tabs, branches(id, branch_name, branch_code)');
    profiles = fallback.data;
  }

  const { data: branches } = await supabaseAdmin
    .from('branches')
    .select('id, branch_name, branch_code')
    .order('id', { ascending: true });

  const ALL_ADMIN_PAGES = [
    '/dashboard', '/sales-history', '/inventory', '/stock-in', '/propsfina', '/algorithm',
    '/web-gallery', '/discounts', '/branches', '/employees', '/balance-check', '/rfid-mismatch',
    '/stock-audit', '/manager/damage-history', '/filters', '/app-management', '/backup'
  ];

  const getDefaultPagesByRole = (role: string): string[] => {
    if (role === 'admin') return ALL_ADMIN_PAGES;
    if (role === 'data_analyst') {
      return [
        '/dashboard', '/sales-history', '/inventory', '/stock-in', '/algorithm',
        '/balance-check', '/rfid-mismatch', '/stock-audit', '/manager/damage-history', '/filters'
      ];
    }
    if (role === 'data_entry' || role === 'warehouse') {
      return ['/inventory', '/stock-in', '/propsfina'];
    }
    return ['/inventory', '/sales-history'];
  };

  // ✅ กรองเฉพาะพนักงานจริงในระบบ (ไม่แสดงลูกค้าหน้าเว็บที่ไม่มี Role หรือมี Role เป็น customer)
  const NON_STAFF_ROLES = ['customer', 'unassigned', ''];

  const allEmployees = authUsers
    ?.map((user) => {
      const profile = profiles?.find((p) => p.user_id === user.id) as any;
      
      // ตรวจสอบว่า profile.branches เป็น array หรือไม่ ถ้าใช่ให้หยิบเอาตัวแรกมา
      const branchInfo = profile?.branches && Array.isArray(profile.branches) && profile.branches.length > 0 
        ? profile.branches[0] 
        : null;

      const rawMemberTags: string[] = Array.isArray(profile?.member_tags) ? profile.member_tags : [];
      const catMemberTags = rawMemberTags.filter((t) => !t.startsWith('PAGE:'));
      const pageMemberTags = rawMemberTags.filter((t) => t.startsWith('PAGE:')).map((t) => t.slice(5));

      const allowedCategories = profile?.allowed_inventory_tabs?.length > 0 
        ? profile.allowed_inventory_tabs 
        : (catMemberTags.length > 0 ? catMemberTags : ['SLABS', 'ROUGH', 'PROP', 'FURNITURE']);

      const userRole = (profile?.role || "").toLowerCase().trim();

      const allowedPages: string[] = profile?.allowed_pages?.length > 0
        ? profile.allowed_pages
        : (pageMemberTags.length > 0 ? pageMemberTags : getDefaultPagesByRole(userRole));

      let canViewCosts: boolean;
      if (profile?.can_view_costs !== undefined && profile?.can_view_costs !== null) {
        canViewCosts = Boolean(profile.can_view_costs);
      } else {
        canViewCosts = ['admin', 'manager', 'data_analyst'].includes(userRole);
      }

      return {
        user_id: user.id,
        email: user.email || "",
        full_name: profile?.full_name || null,
        role: userRole || "unassigned",
        phone: profile?.phone || null,
        citizen_id: profile?.citizen_id || null,
        birth_date: profile?.birth_date || null,
        avatar_url: profile?.avatar_url || null, 
        branch_id: profile?.branch_id || null,
        allowed_inventory_tabs: allowedCategories,
        allowed_pages: allowedPages,
        can_view_costs: canViewCosts,
        // ✅ ส่งเป็น Object อันเดียว (หรือ null) ตามที่ TypeScript ต้องการ
        branches: branchInfo 
      };
    })
    .filter((emp) => emp.role && !NON_STAFF_ROLES.includes(emp.role)) || [];

  const storageBaseUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public`;

  return (
    <EmployeeClient 
      // ✅ Cast เป็น any หรือ Type ที่ถูกต้องเพื่อความชัวร์ในการ Build
      initialData={allEmployees as any} 
      branches={branches || []}
      storageBaseUrl={storageBaseUrl} 
    />
  );
}