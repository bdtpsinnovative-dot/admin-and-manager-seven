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
    .select('role')
    .eq('user_id', user.id)
    .single();

  const role = profile?.role;
  if (role === 'manager') {
    redirect('/manager/dashboard');
  } else if (role === 'sale') {
    redirect('/sale/dashboard');
  }

  redirect('/dashboard');
}