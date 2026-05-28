import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { name, slug, plan, userId } = await req.json();

    if (!name || !slug || !plan || !userId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Usa service role para bypasear RLS — solo se llama desde el cliente
    // con el userId del usuario recién registrado
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: ws, error } = await supabase
      .from("workspaces")
      .insert({ name, slug, plan, created_by: userId })
      .select("id, slug")
      .single();

    if (error) {
      // Slug duplicado → reintentar con sufijo aleatorio
      if (error.code === "23505") {
        const fallbackSlug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
        const { data: ws2, error: error2 } = await supabase
          .from("workspaces")
          .insert({ name, slug: fallbackSlug, plan, created_by: userId })
          .select("id, slug")
          .single();

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
