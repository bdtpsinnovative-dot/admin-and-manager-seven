import { createClient } from "../../lib/supabase/server";
import { supabaseAdmin } from "../../lib/supabase/admin";
import { redirect } from "next/navigation";
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
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('full_name, role, avatar_url')
    .eq('user_id', user.id)
    .maybeSingle();

  if (profile && profile.role !== "admin") {
    redirect(profile.role === "manager" ? "/manager/dashboard" : "/login");
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
    avatar: avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=334155&color=fff`
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

