import { Suspense } from "react"
import { getAlgorithmOverview } from "../../../actions/algorithm"
import { getAudienceAnalytics } from "../../../actions/audience-analytics"
import AlgorithmDashboard from "./AlgorithmDashboard"
import AudienceAnalyticsClient from "./audience/AudienceAnalyticsClient"

export const dynamic = "force-dynamic"

async function AudienceSection({ rangeValue, offsetValue }: { rangeValue: number; offsetValue: number }) {
  const audience = await getAudienceAnalytics(rangeValue, offsetValue)
  return <AudienceAnalyticsClient data={audience} embedded={true} />
}

function AudienceSkeleton() {
  return (
    <div className="mt-5 rounded-[2rem] border border-[var(--algorithm-rule)] bg-[var(--algorithm-surface)] p-4 sm:p-6 shadow-[var(--algorithm-shadow)] animate-pulse">
      <div className="flex items-center gap-2 mb-6">
        <div className="h-9 w-36 rounded-full bg-[var(--algorithm-surface-soft)]" />
        <div className="h-9 w-44 rounded-full bg-[var(--algorithm-surface-soft)]" />
      </div>
      <div className="h-14 rounded-2xl bg-[var(--algorithm-surface-soft)] mb-5" />
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-[var(--algorithm-surface-soft)]" />
        ))}
      </div>
      <div className="h-72 rounded-2xl bg-[var(--algorithm-surface-soft)]" />
    </div>
  )
}

export default async function AlgorithmPage({
  searchParams,
}: {
  searchParams?: Promise<{ range?: string | string[]; offset?: string | string[] }>
}) {
  const params = await searchParams
  const rangeValue = typeof params?.range === "string" ? Number(params.range) : 30
  const offsetValue = typeof params?.offset === "string" ? Math.max(0, parseInt(params.offset, 10) || 0) : 0
  const data = await getAlgorithmOverview(rangeValue, offsetValue)

  return (
    <div className="space-y-6 pb-12">
      <AlgorithmDashboard data={data} />
      <div className="algorithm-audience-embedded mx-auto max-w-[1680px] px-3 sm:px-5 lg:px-8">
        <Suspense fallback={<AudienceSkeleton />}>
          <AudienceSection rangeValue={rangeValue} offsetValue={offsetValue} />
        </Suspense>
      </div>
    </div>
  )
}
