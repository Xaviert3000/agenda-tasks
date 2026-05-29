import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import type { Database } from "@/lib/supabase/types";

type Plan = "free" | "pro";

async function insertWorkspace(
  supabase: ReturnType<typeof createClient<Database>>,
  payload: { name: string; slug: string; plan: Plan; userId: string }
) {
  const { name, slug, plan, userId } = payload;

  const { data, error } = await supabase
    .from("workspaces")
    .insert({ name, slug, plan, created_by: userId })
    .select("id, slug")
    .single();

  if (!error) return { data, error: null };

  // Si la columna plan no existe → insertar sin plan
  if (error.message?.includes("plan") || error.code === "PGRST204") {
    const { data: data2, error: error2 } = await supabase
      .from("workspaces")
      .insert({ name, slug, created_by: userId })
      .select("id, slug")
      .single();
    return { data: data2, error: error2 };
  }

  return { data, error };
}

export async function POST(req: Request) {
  try {
    const { name, slug, plan: planRaw, userId } = await req.json();
    const plan: Plan = planRaw === "pro" ? "pro" : "free";

    if (!name || !slug || !userId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: "Server misconfigured: missing service role key" }, { status: 500 });
    }

    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: ws, error } = await insertWorkspace(supabase, { name, slug, plan, userId });

    if (error) {
      if (error.code === "23505") {
        const fallbackSlug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
        const { data: ws2, error: error2 } = await insertWorkspace(supabase, {
          name, slug: fallbackSlug, plan, userId,
        });
        if (error2) {
          return NextResponse.json({ error: error2.message }, { status: 500 });
        }
        return NextResponse.json({ workspace: ws2 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ workspace: ws });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
