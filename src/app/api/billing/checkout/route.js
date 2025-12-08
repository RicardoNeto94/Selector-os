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
    return NextResponse.json(
      { error: "Restaurant not found" },
      { status: 400 }
    );
  }

  // Read requested plan from body
  let body = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const rawPlan = body.plan;
  const plan =
    rawPlan === "starter" || rawPlan === "pro" ? rawPlan : "pro";

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
    try {
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
    } catch (err) {
      console.error("Stripe customer create error", err);
      return NextResponse.json(
        { error: "Failed to create Stripe customer." },
        { status: 500 }
      );
    }
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  try {
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
  } catch (err) {
    console.error("Stripe checkout error", err);
    return NextResponse.json(
      { error: err.message || "Stripe checkout failed." },
      { status: 500 }
    );
  }
}
