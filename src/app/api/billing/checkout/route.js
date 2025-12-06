// src/app/api/billing/checkout/route.js
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { stripe } from "../../../../lib/stripe";

export async function POST(req) {
  const supabase = createRouteHandlerClient({ cookies });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: restaurant, error } = await supabase
    .from("restaurants")
    .select("*")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (error || !restaurant) {
    return NextResponse.json({ error: "Restaurant not found" }, { status: 400 });
  }

  let body = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  let plan = body.plan === "starter" || body.plan === "pro" ? body.plan : "pro";

  // Map plan -> price ID
  const priceId =
    plan === "starter"
      ? process.env.STRIPE_PRICE_STARTER_MONTHLY
      : process.env.STRIPE_PRICE_PRO_MONTHLY;

  if (!priceId) {
    return NextResponse.json(
      { error: `Missing Stripe price env for plan ${plan}` },
      { status: 500 }
    );
  }

  // Ensure Stripe customer
  let customerId = restaurant.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: {
        user_id: user.id,
        restaurant_id: restaurant.id,
      },
    });

    customerId = customer.id;

    await supabase
      .from("restaurants")
      .update({ stripe_customer_id: customerId })
      .eq("id", restaurant.id);
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: `${baseUrl}/onboarding?success=1&plan=${plan}`,
    cancel_url: `${baseUrl}/select-plan?canceled=1`,
    metadata: {
      restaurant_id: restaurant.id,
      user_id: user.id,
      plan,
      price_id: priceId,
    },
  });

  return NextResponse.json({ url: session.url });
}
