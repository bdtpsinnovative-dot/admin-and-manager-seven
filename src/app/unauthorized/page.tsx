import React from 'react';
import { createClient } from '../../lib/supabase/server';
import { supabaseAdmin } from '../../lib/supabase/admin';
import { redirect } from 'next/navigation';
import { logoutAction } from '../../actions/auth';
import { ShieldAlert, LogOut, ArrowLeft } from 'lucide-react';

export default async function UnauthorizedPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // หากผู้ใช้มีสิทธิ์เข้าใช้งานแล้ว (เช่น เพิ่งได้รับการปรับสิทธิ์เป็น Admin) ให้ส่งเข้าหน้าหลักอัตโนมัติทันทีเมื่อรีเฟรช
  if (user) {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role, member_tags')
      .eq('user_id', user.id)
      .maybeSingle();

    const role = profile?.role;
    const rawMemberTags: string[] = Array.isArray(profile?.member_tags) ? profile.member_tags : [];
    const pageMemberTags = rawMemberTags.filter((t: string) => t.startsWith('PAGE:')).map((t: string) => t.slice(5));

    if (role === 'admin' || role === 'data_analyst') {
      redirect('/dashboard');
    } else if (role === 'manager') {
      redirect('/manager/dashboard');
    } else if (role === 'sale') {
      redirect('/sale/dashboard');
    } else if (role === 'data_entry' || role === 'warehouse') {
      redirect('/inventory');
    } else if (pageMemberTags.length > 0) {
      redirect(pageMemberTags[0]);
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans text-slate-100">
      <div className="max-w-md w-full bg-slate-800/90 backdrop-blur-md rounded-3xl shadow-2xl border border-slate-700/60 p-8 text-center space-y-6">
        
        {/* Warning Icon Badge */}
        <div className="w-20 h-20 bg-rose-500/10 border border-rose-500/20 rounded-3xl flex items-center justify-center mx-auto text-rose-400 shadow-inner">
          <ShieldAlert className="w-10 h-10" />
        </div>

        {/* Title & Description */}
        <div className="space-y-2">
          <h1 className="text-xl font-bold text-white tracking-tight">
            ไม่มีสิทธิ์เข้าใช้งานระบบนี้
          </h1>
          <p className="text-xs text-slate-400 leading-relaxed px-2">
            บัญชีของคุณไม่ได้รับมอบหมายตำแหน่งหน้าที่ในการจัดการคลังสินค้า หากคุณต้องการเข้าใช้งาน กรุณาติดต่อหัวหน้างานหรือผู้ดูแลระบบ
          </p>
        </div>

        {/* Logged in User Card */}
        {user && (
          <div className="bg-slate-900/60 rounded-2xl p-3.5 border border-slate-700/50 text-left">
            <span className="text-[11px] font-semibold text-slate-400 block mb-0.5">
              เข้าสู่ระบบด้วยบัญชี:
            </span>
            <span className="text-xs font-medium text-slate-200 break-all">
              {user.email || user.id}
            </span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3 pt-2">
          {/* ปุ่มกลับไประบบพนักงาน */}
          <a
            href="https://taskmanagementsystem.wallcraftthailand.com/"
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-blue-600/20 active:scale-[0.98]"
          >
            <ArrowLeft className="w-4 h-4" />
            กลับไปยังระบบพนักงาน
          </a>

          {/* ปุ่มออกจากระบบ / สลับบัญชี */}
          <form action={logoutAction} className="w-full">
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-700/60 hover:bg-slate-700 border border-slate-600/60 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition active:scale-[0.98]"
            >
              <LogOut className="w-4 h-4 text-slate-400" />
              ออกจากระบบ / สลับบัญชีอื่น
            </button>
          </form>
        </div>

        <div className="text-[11px] text-slate-500 pt-1">
          Wallcraft & Terra Home Studio System
        </div>
      </div>
    </div>
  );
}
