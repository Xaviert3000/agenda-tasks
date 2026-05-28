import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: ws } = await supabase
    .from("workspaces")
    .select("slug")
    .limit(1)
    .single();

  if (ws) redirect(`/${ws.slug}/dashboard`);

  // No workspace found — query by created_by as fallback (bypasses workspace_members RLS)
  const { data: ownedWs } = await supabase
    .from("workspaces")
    .select("slug")
    .eq("created_by", user.id)
    .limit(1)
    .single();

  if (ownedWs) redirect(`/${ownedWs.slug}/dashboard`);

  redirect("/login");
}
