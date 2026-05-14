import { redirect } from "next/navigation"
import { getInitialProfile } from "@/actions/tagcheck"
import { getLotDiscrepancies } from "@/actions/lots"
import ReceiveCheckClient from "./ReceiveCheckClient"

export default async function ReceiveCheckPage() {
  const profile = await getInitialProfile()
  if (!profile) redirect("/login")

  const { lots, stats } = await getLotDiscrepancies(profile.branch_id)

  return (
    <ReceiveCheckClient
      lots={lots}
      stats={stats}
      branchName={profile.branch_name}
    />
  )
}
