import { getAlgorithmProducts } from "../../../../actions/algorithm"
import AlgorithmProductsList from "./AlgorithmProductsList"

export const dynamic = "force-dynamic"

export default async function AlgorithmProductsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const query = await searchParams
  const range = typeof query?.range === "string" ? Number(query.range) : 30
  const page = typeof query?.page === "string" ? Number(query.page) : 1
  const data = await getAlgorithmProducts(range, page)

  return <AlgorithmProductsList data={data} />
}
