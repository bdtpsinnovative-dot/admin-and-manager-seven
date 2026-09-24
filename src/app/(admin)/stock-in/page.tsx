import { getBranches } from "@/actions/stock-in"
import StockInClient from "./StockInClient"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export const metadata = {
  title: "รับสินค้าเข้าสต็อก (Stock In) | WoodSlab Admin",
  description: "ระบบนำเข้าและเพิ่มสต็อกสินค้าด่วนด้วย Excel/CSV โดยไม่ต้องใช้ RFID Tag",
}

export default async function StockInPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const branches = await getBranches()

  return (
    <div className="p-4 md:p-8 min-h-screen bg-slate-50/50">
      <StockInClient branches={branches} />
    </div>
  )
}
