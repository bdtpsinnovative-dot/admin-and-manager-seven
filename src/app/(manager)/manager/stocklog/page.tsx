import { redirect } from "next/navigation"
import { getInitialProfile } from "@/actions/tagcheck"
import StockLogClient from "./StockLogClient"

export default async function StockLogPage() {
  const profile = await getInitialProfile()
  if (!profile) redirect("/login")

  return (
    <StockLogClient
      branchId={profile.branch_id}
      branchName={profile.branch_name}
    />
  )
}
