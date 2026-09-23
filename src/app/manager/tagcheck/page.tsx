import { redirect } from "next/navigation"
import { getInitialProfile, getPropTagStatus } from "@/actions/tagcheck"
import TagCheckClient from "./TagCheckClient"

export default async function TagCheckPage() {
  const profile = await getInitialProfile()
  if (!profile) redirect("/login")

  const props = await getPropTagStatus(profile.branch_id)

  return (
    <TagCheckClient
      props={props}
      branchName={profile.branch_name}
    />
  )
}
