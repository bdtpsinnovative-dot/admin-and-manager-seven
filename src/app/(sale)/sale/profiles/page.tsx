import { getMyProfile } from "../../../../actions/profiles"
import ProfileForm from "@/app/(manager)/manager/profiles/ProfileForm"

export default async function SaleProfilePage() {
  // 1. ดึงข้อมูล Profile (Server Action)
  const { data: profile } = await getMyProfile()

  // 2. ดึง SUPABASE_URL จาก Server Environment
  const supabaseUrl = process.env.SUPABASE_URL

  if (!profile) {
     return <div className="p-8 text-center text-slate-500">ไม่พบข้อมูลผู้ใช้</div>
  }

  // 3. ส่งข้อมูล + URL ไปให้ Client Component
  return (
    <div className="animate-in fade-in duration-500 pb-20">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">ข้อมูลส่วนตัว (My Profile)</h1>
        <p className="text-slate-500 text-sm">จัดการข้อมูลบัญชีผู้ใช้ของคุณ</p>
      </div>
      
      <ProfileForm 
        profile={profile} 
        supabaseUrl={supabaseUrl!} 
      />
    </div>
  )
}
