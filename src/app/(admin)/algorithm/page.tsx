import { getAlgorithmOverview } from "../../../actions/algorithm"
import AlgorithmDashboard from "./AlgorithmDashboard"

export const dynamic = "force-dynamic"

export default async function AlgorithmPage({
  searchParams,
}: {
  searchParams?: Promise<{ range?: string | string[] }>
}) {
  const params = await searchParams
  const rangeValue = typeof params?.range === "string" ? Number(params.range) : 30
  const data = await getAlgorithmOverview(rangeValue)

  return <AlgorithmDashboard data={data} />
}
