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

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 font-sans text-slate-800">
      <div className="w-full space-y-6">
        <AlgorithmProductsList data={data} />
      </div>
    </div>
  )
}
