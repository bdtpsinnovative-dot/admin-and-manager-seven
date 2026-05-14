import { notFound } from "next/navigation"
import { getLotDetail } from "@/actions/lots"
import LotDetailClient from "./LotDetailClient"

interface Props { params: Promise<{ id: string }> }

export default async function LotDetailPage({ params }: Props) {
  const { id } = await params
  const lotId = parseInt(id)
  if (isNaN(lotId)) notFound()

  const data = await getLotDetail(lotId)
  if (!data) notFound()

  return <LotDetailClient lot={data.lot} items={data.items} />
}
