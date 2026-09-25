import { getAudienceAnalytics } from "../../../../actions/audience-analytics"
import { getDailyTrafficAnalytics } from "../../../../actions/daily-traffic"
import AudienceAnalyticsClient from "./AudienceAnalyticsClient"

export const dynamic = "force-dynamic"

export default async function AudienceAnalyticsPage({
  searchParams,
}: {
  searchParams?: Promise<{ range?: string | string[] }>
}) {
  const params = await searchParams
  const range = typeof params?.range === "string" ? Number(params.range) : 30
  const [data, dailyTraffic] = await Promise.all([
    getAudienceAnalytics(range),
    getDailyTrafficAnalytics(range),
  ])
  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 font-sans text-slate-800">
      <div className="w-full space-y-6">
        <AudienceAnalyticsClient data={data} dailyTraffic={dailyTraffic} embedded={false} />
      </div>
    </div>
  )
}
