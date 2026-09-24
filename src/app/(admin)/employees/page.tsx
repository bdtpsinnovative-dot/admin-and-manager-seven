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

  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('user_id, full_name, role, phone, citizen_id, birth_date, avatar_url, branch_id, member_tags, branches(id, branch_name, branch_code)');

  const { data: branches } = await supabaseAdmin
    .from('branches')
    .select('id, branch_name, branch_code')
    .order('id', { ascending: true });

  // ✅ กรองเฉพาะพนักงานจริงในระบบ (ไม่แสดงลูกค้าหน้าเว็บที่ไม่มี Role หรือมี Role เป็น customer)
  const NON_STAFF_ROLES = ['customer', 'unassigned', ''];

  const allEmployees = authUsers
    ?.map((user) => {
      const profile = profiles?.find((p) => p.user_id === user.id) as any;
      
      // ตรวจสอบว่า profile.branches เป็น array หรือไม่ ถ้าใช่ให้หยิบเอาตัวแรกมา
      const branchInfo = profile?.branches && Array.isArray(profile.branches) && profile.branches.length > 0 
        ? profile.branches[0] 
        : null;

      const allowedCategories = profile?.allowed_inventory_tabs?.length > 0 
        ? profile.allowed_inventory_tabs 
        : (profile?.member_tags?.length > 0 ? profile.member_tags : ['SLABS', 'ROUGH', 'PROP', 'FURNITURE']);

      const userRole = (profile?.role || "").toLowerCase().trim();

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