import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceId, workspaceSlug } = await request.json();

  const { data: profile } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", user.id)
    .single();

  // Crear o recuperar customer de Stripe
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("stripe_customer_id")
    .eq("id", workspaceId)
    .single();

  let customerId = workspace?.stripe_customer_id;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email!,
      name: profile?.name ?? user.email!,
      metadata: { workspace_id: workspaceId, user_id: user.id },
    });
    customerId = customer.id;

    await supabase
      .from("workspaces")
      .update({ stripe_customer_id: customerId })
      .eq("id", workspaceId);
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin;

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [
      {
        price: process.env.STRIPE_PRO_PRICE_ID!,
        quantity: 1,
      },
    ],
    metadata: { workspace_id: workspaceId },
    success_url: `${baseUrl}/${workspaceSlug}/dashboard?checkout=success`,
    cancel_url: `${baseUrl}/${workspaceSlug}/upgrade?checkout=cancelled`,
    subscription_data: {
      metadata: { workspace_id: workspaceId },
    },
  });

  return NextResponse.json({ url: session.url });
}
