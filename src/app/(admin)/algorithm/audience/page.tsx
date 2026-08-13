import { getAudienceAnalytics } from "../../../../actions/audience-analytics"
import AudienceAnalyticsClient from "./AudienceAnalyticsClient"

export const dynamic = "force-dynamic"

export default async function AudienceAnalyticsPage({
  searchParams,
}: {
  searchParams?: Promise<{ range?: string | string[] }>
}) {
  const params = await searchParams
  const range = typeof params?.range === "string" ? Number(params.range) : 30
  const data = await getAudienceAnalytics(range)
  return <AudienceAnalyticsClient data={data} />
}
