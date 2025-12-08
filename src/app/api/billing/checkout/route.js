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
    console.error("checkout: restaurant missing", error);
    return NextResponse.json(
      { error: "Restaurant not found" },
      { status: 400 }
    );
  }

  let body = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  // 🔹 Normalise plan names
  const rawPlan = body.plan || "pro"; // default to pro if missing
  let plan;

  if (rawPlan === "standard" || rawPlan === "starter") {
    plan = "standard";
  } else if (rawPlan === "pro") {
    plan = "pro";
  } else {
    plan = "pro";
  }

  // 🔹 Map plan -> env var
  const priceId =
    plan === "standard"
      ? process.env.STRIPE_PRICE_STANDARD
      : process.env.STRIPE_PRICE_PRO;

  if (!priceId) {
    console.error("Missing Stripe price env", {
      plan,
      hasStandard: !!process.env.STRIPE_PRICE_STANDARD,
      hasPro: !!process.env.STRIPE_PRICE_PRO,
    });

    return NextResponse.json(
      { error: `Missing Stripe price env for plan ${plan}` },
      { status: 500 }
    );
  }

  // 🔹 Ensure Stripe customer
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
      { error: "Stripe checkout failed" },
      { status: 500 }
    );
  }
}
