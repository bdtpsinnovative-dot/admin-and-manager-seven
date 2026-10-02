import type { Metadata } from "next"
import { getAlgorithmHealthAction } from "@/actions/algorithm"
import HealthDashboardClient from "./HealthDashboardClient"

export const metadata: Metadata = {
  title: "สถานะระบบอัลกอริทึม & ตรวจสอบบัก | Admin",
  description: "แดชบอร์ดตรวจสอบความสมบูรณ์ของข้อมูลอัลกอริทึม ตรวจจับบัก และการซ่อมแซมรายวัน",
}

export const dynamic = "force-dynamic"

export default async function AlgorithmHealthPage() {
  const { state, dailyAudit } = await getAlgorithmHealthAction()

  return (
    <div className="w-full p-4 md:p-6 lg:p-8">
      <HealthDashboardClient initialState={state} initialAudit={dailyAudit} />
    </div>
  )
}
