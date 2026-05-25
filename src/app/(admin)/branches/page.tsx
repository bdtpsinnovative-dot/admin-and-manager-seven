import { createClient } from "../../../lib/supabase/server" 
import BranchClient from "./BranchClient"

export default async function BranchesPage() {
  const supabase = await createClient()

  // 🐛 จุดที่แก้: เพิ่ม latitude, longitude เข้าไปใน select ไม่งั้นพิกัดไม่มา!
  const { data: branches } = await supabase
    .from('branches')
    .select('id, branch_code, branch_name, branch_type, latitude, longitude, created_at')
    .order('created_at', { ascending: false })

  return (
    <BranchClient initialBranches={branches || []} />
  )
}