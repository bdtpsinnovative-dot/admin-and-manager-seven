import { createClient } from '../lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function RootPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, member_tags, allowed_pages')
    .eq('user_id', user.id)
    .single();

  const role = profile?.role;
  const rawMemberTags: string[] = Array.isArray(profile?.member_tags) ? profile.member_tags : [];
  const pageMemberTags = rawMemberTags.filter((t: string) => t.startsWith('PAGE:')).map((t: string) => t.slice(5));
  const customAllowedPages: string[] =
    Array.isArray(profile?.allowed_pages) && profile.allowed_pages.length > 0
      ? profile.allowed_pages
      : pageMemberTags.length > 0
      ? pageMemberTags
      : [];

  // ถ้ามีกำหนดสิทธิ์หน้าเฉพาะบุคคล ให้พาไปยังหน้าแรกที่ได้รับสิทธิ์ทันที
  if (customAllowedPages.length > 0) {
    redirect(customAllowedPages[0]);
  }

  if (role === 'manager') {
    redirect('/manager/dashboard');
  } else if (role === 'sale') {
    redirect('/sale/dashboard');
  } else if (role === 'data_entry' || role === 'warehouse') {
    redirect('/inventory');
  }

  redirect('/dashboard');
}