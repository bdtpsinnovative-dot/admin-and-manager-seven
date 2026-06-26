import { createClient } from "../../lib/supabase/server"
import { redirect } from "next/navigation"
import SaleSidebar from "../../components/SaleSidebar"

export default async function SaleLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  // 1. Check User
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect("/login")
  }

  // 2. Fetch Profile and Role
  const { data: profile } = await supabase
    .from('profiles')
    .select(`
      full_name,
      email,
      avatar_url,
      role,
      branches ( branch_name )
    `)
    .eq('user_id', user.id)
    .single()

  // Verify Role is indeed sale
  if (profile?.role !== 'sale') {
    redirect("/login")
  }

  // 3. Logic to build the image URL (Same as Admin/Manager)
  let avatarFullUrl = "";
  if (profile?.avatar_url) {
    const path = profile.avatar_url;
    
    if (path.startsWith("http") || path.startsWith("blob:")) {
        avatarFullUrl = path;
    } else {
        const baseUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public`;
        if (path.startsWith('profiles/')) {
            avatarFullUrl = `${baseUrl}/${path}`;
        } else {
            avatarFullUrl = `${baseUrl}/profiles/${path}`;
        }
    }
  }

  // 4. Fallback if no image
  if (!avatarFullUrl) {
      const name = profile?.full_name || "Sale";
      avatarFullUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=cbd5e1&color=64748b`;
  }

  // Prepare data
  const userName = profile?.full_name || profile?.email || "Sale"
  // @ts-ignore
  const branchName = profile?.branches?.branch_name || "ไม่ระบุสาขา"

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900 print:bg-white print:text-black">
      
      {/* Hide Sidebar in print mode */}
      <div className="print:hidden">
        <SaleSidebar 
          userName={userName} 
          branchName={branchName} 
          userAvatar={avatarFullUrl} 
        />
      </div>

      <main className="flex-1 md:ml-[88px] bg-slate-50/50 min-h-screen transition-all duration-300 print:ml-0 print:p-0 print:bg-white">
        <div className="max-w-7xl mx-auto p-4 md:p-8 print:p-0 print:max-w-full">
            {children}
        </div>
      </main>
    </div>
  )
}
