import { notFound } from "next/navigation"
import { getAlgorithmProductDetail } from "../../../../../actions/algorithm"
import ProductAlgorithmDetail from "./ProductAlgorithmDetail"

export const dynamic = "force-dynamic"

export default async function AlgorithmProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ productId: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const routeParams = await params
  const query = await searchParams
  const productId = Number(routeParams.productId)

  if (!Number.isSafeInteger(productId)) notFound()

  const detail = await getAlgorithmProductDetail(productId, {
    rangeDays: typeof query?.range === "string" ? Number(query.range) as 1 | 7 | 30 : 30,
    trafficType: typeof query?.traffic === "string" ? query.traffic as "all" | "internal" | "bot" | "unknown" : "all",
    countable: typeof query?.countable === "string" ? query.countable as "all" | "countable" | "excluded" : "all",
    identityType: typeof query?.identity === "string" ? query.identity as "all" | "user" | "visitor" : "all",
    location: typeof query?.location === "string" ? query.location : "",
    page: typeof query?.page === "string" ? Number(query.page) : 1,
  })

  if (!detail) notFound()
  return <ProductAlgorithmDetail detail={detail} />
}
