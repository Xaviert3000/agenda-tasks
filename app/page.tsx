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

  redirect(ws ? `/${ws.slug}/dashboard` : "/onboarding");
}
