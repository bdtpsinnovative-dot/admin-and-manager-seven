import { getDailyTrafficAnalytics } from "../../../../actions/daily-traffic"
import DailyTrafficClient from "./DailyTrafficClient"

export const dynamic = "force-dynamic"

export default async function DailyTrafficPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const query = await searchParams
  const range = typeof query?.range === "string" ? Number(query.range) : 30
  const offset = typeof query?.offset === "string" ? Number(query.offset) : 0
  const initialDate = typeof query?.date === "string" ? query.date : undefined
  const initialType = typeof query?.type === "string" && ["sources", "devices", "browsers"].includes(query.type)
    ? (query.type as "sources" | "devices" | "browsers")
    : undefined

  const data = await getDailyTrafficAnalytics(range, offset)

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 font-sans text-slate-800">
      <div className="w-full space-y-6">
        <DailyTrafficClient data={data} initialDate={initialDate} initialType={initialType} />
      </div>
    </div>
  )
}
