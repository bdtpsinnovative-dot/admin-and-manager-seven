import { createClient } from "../../../lib/supabase/server";
import { supabaseAdmin } from "../../../lib/supabase/admin";
import AppManagementForm from "./AppManagementForm";

export const dynamic = "force-dynamic";

export default async function AppManagementPage() {
  const { data } = await supabaseAdmin
    .from("system_settings")
    .select("*");

  const settings = (data || []).reduce((acc: any, curr: any) => {
    acc[curr.key] = curr.value;
    return acc;
  }, {});

  // Fetch session to get the access token to authorize the client component updates
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token || "";

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto">
      <AppManagementForm initialSettings={settings} token={token} />
    </div>
  );
}
