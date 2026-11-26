import { createClient } from "../../../lib/supabase/server" 
import BranchClient from "./BranchClient"

export default async function BranchesPage() {
  const supabase = await createClient()

  // ดึงข้อมูลสาขา พร้อมพิกัด และสถานะเปิด/ปิด (is_active)
  const { data: branches } = await supabase
    .from('branches')
    .select('id, branch_code, branch_name, branch_type, latitude, longitude, is_active, created_at')
    .order('created_at', { ascending: false })

  return (
    <BranchClient initialBranches={branches || []} />
  )
}
