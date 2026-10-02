import { getAudienceAnalytics } from "../../../../actions/audience-analytics"
import { getDailyTrafficAnalytics } from "../../../../actions/daily-traffic"
import AudienceAnalyticsClient from "./AudienceAnalyticsClient"

export const dynamic = "force-dynamic"

export default async function AudienceAnalyticsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    range?: string | string[]
    offset?: string | string[]
    month?: string | string[]
    from?: string | string[]
    to?: string | string[]
  }>
}) {
  const params = await searchParams
  const range = typeof params?.range === "string" ? Number(params.range) : 30
  const offset = typeof params?.offset === "string" ? Math.max(0, parseInt(params.offset, 10) || 0) : 0
  const month = typeof params?.month === "string" ? params.month : undefined
  const from = typeof params?.from === "string" ? params.from : undefined
  const to = typeof params?.to === "string" ? params.to : undefined

  const [data, dailyTraffic] = await Promise.all([
    getAudienceAnalytics(range, offset, month, from, to),
    getDailyTrafficAnalytics(range, offset, month, from, to),
  ])
  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 font-sans text-slate-800">
      <div className="w-full space-y-6">
        <AudienceAnalyticsClient data={data} dailyTraffic={dailyTraffic} embedded={false} />
      </div>
    </div>
  )
}
