import { notFound } from "next/navigation"
import { getLotDetail } from "@/actions/lots"
import LotDetailClient from "./LotDetailClient"

interface Props { params: { id: string } }

export default async function LotDetailPage({ params }: Props) {
  const lotId = parseInt(params.id)
  if (isNaN(lotId)) notFound()

  const data = await getLotDetail(lotId)
  if (!data) notFound()

  return <LotDetailClient lot={data.lot} items={data.items} />
}
