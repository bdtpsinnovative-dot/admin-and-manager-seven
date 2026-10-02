import { Suspense } from "react"
import { getAlgorithmOverview } from "../../../actions/algorithm"
import { getAudienceAnalytics } from "../../../actions/audience-analytics"
import { getDailyTrafficAnalytics } from "../../../actions/daily-traffic"
import AlgorithmDashboard from "./AlgorithmDashboard"
import AudienceAnalyticsClient from "./audience/AudienceAnalyticsClient"

export const dynamic = "force-dynamic"

async function AudienceSection({
  rangeValue,
  offsetValue,
  monthValue,
  fromValue,
  toValue,
}: {
  rangeValue: number
  offsetValue: number
  monthValue?: string
  fromValue?: string
  toValue?: string
}) {
  try {
    const [audience, dailyTraffic] = await Promise.all([
      getAudienceAnalytics(rangeValue, offsetValue, monthValue, fromValue, toValue),
      getDailyTrafficAnalytics(rangeValue, offsetValue, monthValue, fromValue, toValue),
    ])
    return <AudienceAnalyticsClient data={audience} dailyTraffic={dailyTraffic} embedded={true} />
  } catch (error) {
    console.error("[algorithm-audience] load failed:", error)
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 text-center shadow-sm">
        ยังไม่สามารถโหลดข้อมูล Audience Analytics ในช่วงเวลานี้ได้ (กรุณาลองใหม่อีกครั้ง)
      </div>
    )
  }
}

function AudienceSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6 shadow-sm animate-pulse space-y-5">
      <div className="flex items-center gap-2">
        <div className="h-9 w-36 rounded-xl bg-slate-100" />
        <div className="h-9 w-44 rounded-xl bg-slate-100" />
      </div>
      <div className="h-14 rounded-xl bg-slate-100" />
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-slate-100" />
        ))}
      </div>
      <div className="h-72 rounded-xl bg-slate-100" />
    </div>
  )
}

export default async function AlgorithmPage({
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
  const rangeValue = typeof params?.range === "string" ? Number(params.range) : 30
  const offsetValue = typeof params?.offset === "string" ? Math.max(0, parseInt(params.offset, 10) || 0) : 0
  const monthValue = typeof params?.month === "string" ? params.month : undefined
  const fromValue = typeof params?.from === "string" ? params.from : undefined
  const toValue = typeof params?.to === "string" ? params.to : undefined

  const data = await getAlgorithmOverview(rangeValue, offsetValue, monthValue, fromValue, toValue)

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 font-sans text-slate-800">
      <div className="w-full space-y-6">
        <AlgorithmDashboard data={data} />
        <div className="w-full">
          <Suspense fallback={<AudienceSkeleton />}>
            <AudienceSection
              rangeValue={rangeValue}
              offsetValue={offsetValue}
              monthValue={monthValue}
              fromValue={fromValue}
              toValue={toValue}
            />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
