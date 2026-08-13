import { getAlgorithmOverview } from "../../../actions/algorithm"
import { getAudienceAnalytics } from "../../../actions/audience-analytics"
import AlgorithmDashboard from "./AlgorithmDashboard"
import AudienceAnalyticsClient from "./audience/AudienceAnalyticsClient"

export const dynamic = "force-dynamic"

export default async function AlgorithmPage({
  searchParams,
}: {
  searchParams?: Promise<{ range?: string | string[] }>
}) {
  const params = await searchParams
  const rangeValue = typeof params?.range === "string" ? Number(params.range) : 30
  const [data, audience] = await Promise.all([
    getAlgorithmOverview(rangeValue),
    getAudienceAnalytics(rangeValue),
  ])

  return (
    <>
      <AlgorithmDashboard data={data} />
      <div className="algorithm-audience-embedded">
        <AudienceAnalyticsClient data={audience} />
      </div>
    </>
  )
}
