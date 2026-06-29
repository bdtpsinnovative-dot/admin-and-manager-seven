import { createClient } from "../../lib/supabase/server";
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
  // 2. ค่า Default (กรณีไม่เจอ User หรือ Profile)
  let userData = {
    name: "Admin User",
    role: "Admin",
    avatar: `https://ui-avatars.com/api/?name=Admin&background=334155&color=fff`
  };

  if (user) {
    // 3. ดึงข้อมูล Profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, role, avatar_url')
      .eq('user_id', user.id)
      .single();

    const name = profile?.full_name || user.email || "Admin User";
    let avatarUrl = "";

    // ✅ 4. Logic สร้าง URL รูปภาพที่ถูกต้อง (แก้ตรงนี้)
    if (profile?.avatar_url) {
      const path = profile.avatar_url;

      // ถ้าเป็น Link ภายนอกอยู่แล้ว (http...)
      if (path.startsWith("http") || path.startsWith("blob:")) {
        avatarUrl = path;
      } else {
        // ถ้าเป็น Path ใน Storage เราต้องต่อเองเพื่อความชัวร์
        // ใช้ process.env.SUPABASE_URL หรือดึงจาก Env
        const baseUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public`;

        // เช็คว่าใน DB มีคำว่า profiles/ นำหน้าหรือยัง
        if (path.startsWith('profiles/')) {
            // มีแล้ว -> ต่อได้เลย
            avatarUrl = `${baseUrl}/${path}`;
        } else {
            // ไม่มี -> เติม profiles/ ให้
            avatarUrl = `${baseUrl}/profiles/${path}`;
        }
      }
    }
    
    // 5. อัปเดตข้อมูลที่จะส่งไป Sidebar
    userData = {
      name: name,
      role: profile?.role || "Admin",
      // ถ้าไม่มีรูปจริง ให้ใช้รูปตัวอักษรย่อ (UI Avatars)
      avatar: avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=334155&color=fff`
    };
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* ส่งข้อมูล User ที่ประมวลผลแล้วไปให้ Sidebar */}
      <AdminSidebar user={userData} />
      <main className="flex-1 pl-[80px]">
        {children}
      </main>
    </div>
  );
}