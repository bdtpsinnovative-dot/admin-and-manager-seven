import { createClient } from '../lib/supabase/server';
import { supabaseAdmin } from '../lib/supabase/admin';
import { redirect } from 'next/navigation';

export default async function RootPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // 🛡️ ดึงข้อมูลผ่าน supabaseAdmin ป้องกัน RLS error และใช้ maybeSingle แทน single
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role, member_tags, allowed_pages')
    .eq('user_id', user.id)
    .maybeSingle();

  const role = profile?.role;
  const rawMemberTags: string[] = Array.isArray(profile?.member_tags) ? profile.member_tags : [];
  const pageMemberTags = rawMemberTags.filter((t: string) => t.startsWith('PAGE:')).map((t: string) => t.slice(5));
  const customAllowedPages: string[] =
    Array.isArray(profile?.allowed_pages) && profile.allowed_pages.length > 0
      ? profile.allowed_pages
      : pageMemberTags.length > 0
      ? pageMemberTags
      : [];

  // 1. ตำแหน่งที่มีระบบ Portal เฉพาะของตัวเอง (Manager และ Sale) ให้เข้าหน้าระบบเฉพาะเสมอ
  if (role === 'manager') {
    redirect('/manager/dashboard');
  } else if (role === 'sale') {
    redirect('/sale/dashboard');
  }

  // 2. ตำแหน่งที่ทำงานในฝั่ง Admin หากมีกำหนดสิทธิ์หน้าเฉพาะบุคคล ให้พาไปยังหน้าแรกที่ได้รับสิทธิ์ทันที
  if (role !== 'admin' && customAllowedPages.length > 0) {
    redirect(customAllowedPages[0]);
  }

  // 3. ตำแหน่งผู้ดูแลระบบสูงสุด หรือนักวิเคราะห์ข้อมูล
  if (role === 'admin' || role === 'data_analyst') {
    redirect('/dashboard');
  }

  // 4. ตำแหน่งคลังสินค้า หรือฝ่ายลงข้อมูลสินค้า
  if (role === 'data_entry' || role === 'warehouse') {
    redirect('/inventory');
  }

  // ❌ พนักงานตำแหน่งอื่นที่ไม่มีหน้าที่จัดการสินค้า -> ส่งไปหน้า "ไม่มีสิทธิ์เข้าถึง" ชัดเจน (ไม่ขึ้นจอดำพัง)
  redirect('/unauthorized');
}
