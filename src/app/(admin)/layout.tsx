import { createClient } from "../../lib/supabase/server";
import { supabaseAdmin } from "../../lib/supabase/admin";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import AdminSidebar from "../../components/AdminSidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  
  // 1. ดึง User ที่ Login อยู่
  const { data: { user } } = await supabase.auth.getUser();

  // 🔒 ถ้าไม่ได้ล็อกอิน → redirect ไปหน้า login
  if (!user) {
    redirect("/login");
  }

  // 2. ดึงข้อมูล Profile ผ่าน supabaseAdmin ป้องกัน RLS latency
  let profile: any = null;
  const initialPfRes = await supabaseAdmin
    .from('profiles')
    .select('full_name, role, avatar_url, member_tags, allowed_pages')
    .eq('user_id', user.id)
    .maybeSingle();

  if (initialPfRes.error && initialPfRes.error.message?.includes('allowed_pages')) {
    const fallbackPf = await supabaseAdmin
      .from('profiles')
      .select('full_name, role, avatar_url, member_tags')
      .eq('user_id', user.id)
      .maybeSingle();
    profile = fallbackPf.data;
  } else {
    profile = initialPfRes.data;
  }

  const rawMemberTags: string[] = Array.isArray(profile?.member_tags) ? profile.member_tags : [];
  const pageMemberTags = rawMemberTags.filter((t) => t.startsWith('PAGE:')).map((t) => t.slice(5));
  const customAllowedPages: string[] | undefined =
    Array.isArray(profile?.allowed_pages) && profile.allowed_pages.length > 0
      ? profile.allowed_pages
      : pageMemberTags.length > 0
      ? pageMemberTags
      : undefined;

  const allowedRoles = ["admin", "data_entry", "data_analyst", "warehouse"];
  const hasCustomAdminPages = customAllowedPages && customAllowedPages.length > 0;
  if (profile && !allowedRoles.includes(profile.role) && !hasCustomAdminPages) {
    if (profile.role === "manager") {
      redirect("/manager/dashboard");
    } else if (profile.role === "sale") {
      redirect("/sale/dashboard");
    } else {
      redirect("/login");
    }
  }

  // 🔒 Route Authorization Guard: ดักจับ URL ที่พิมพ์ตรงๆ ทาง Address Bar
  const headersList = await headers();
  const currentPath = headersList.get('x-pathname') || '';

  if (customAllowedPages && customAllowedPages.length > 0) {
    const isAllowed = (path: string) => {
      if (!path || path === '/') return true;
      return customAllowedPages.some(allowed => 
        path === allowed || 
        path.startsWith(`${allowed}/`) ||
        (allowed === '/gallery' && path.startsWith('/manager/gallery')) ||
        (allowed === '/manager/gallery' && path.startsWith('/gallery'))
      );
    };

    if (currentPath && !isAllowed(currentPath)) {
      // ผู้ใช้ไม่มีสิทธิ์เข้าหน้านี้ -> redirect ไปยังหน้าที่ตนมีสิทธิ์
      const targetPage = customAllowedPages[0] || '/login';
      redirect(targetPage);
    }
  } else if (profile?.role === 'data_entry' || profile?.role === 'warehouse') {
    const defaultAllowed = ['/inventory', '/propsfina', '/stock-in', '/gallery', '/manager/gallery'];
    const isAllowed = (path: string) => {
      if (!path || path === '/') return true;
      return defaultAllowed.some(p => path === p || path.startsWith(`${p}/`));
    };

    if (currentPath && !isAllowed(currentPath)) {
      redirect('/inventory');
    }
  }

  const name = profile?.full_name || user.email || "Admin User";

  let avatarUrl = "";

  // 3. Logic สร้าง URL รูปภาพที่ถูกต้อง
  if (profile?.avatar_url) {
    const path = profile.avatar_url;

    if (path.startsWith("http") || path.startsWith("blob:")) {
      avatarUrl = path;
    } else {
      const baseUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public`;
      if (path.startsWith('profiles/')) {
        avatarUrl = `${baseUrl}/${path}`;
      } else {
        avatarUrl = `${baseUrl}/profiles/${path}`;
      }
    }
  }
  
  // 4. ข้อมูลที่จะส่งไป Sidebar
  const userData = {
    name: name,
    role: profile?.role || "Admin",
    avatar: avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=334155&color=fff`,
    allowedPages: customAllowedPages
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* ส่งข้อมูล User ที่ประมวลผลแล้วไปให้ Sidebar */}
      <AdminSidebar user={userData} />
      <main className="min-w-0 flex-1 pl-0 md:pl-[80px]">
        {children}
      </main>
    </div>
  );
}

