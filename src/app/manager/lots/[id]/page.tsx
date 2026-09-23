import { redirect, notFound } from "next/navigation"
import { getInitialProfile } from "@/actions/tagcheck"
import { getLotDetail } from "@/actions/lots"
import ReceiveLotClient from "./ReceiveLotClient"

export default async function ReceiveLotPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await getInitialProfile()
  if (!profile) redirect("/login")

  const { id } = await params
  const lotId = Number(id)
  if (isNaN(lotId)) notFound()

  const detail = await getLotDetail(lotId)
  if (!detail) notFound()

  return (
    <ReceiveLotClient
      lot={detail.lot}
      items={detail.items}
      branchId={profile.branch_id}
      branchName={profile.branch_name}
    />
  )
}
