// src/app/api/billing/checkout/route.js
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { stripe } from "src/lib/stripe";

export async function POST(req) {
  const supabase = createRouteHandlerClient({ cookies });

  // 1) Auth guard
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // 2) Read body – which plan they clicked
  let body = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  // front-end sends "starter" or "pro"
  const rawPlan =
    body.plan === "starter" || body.plan === "pro" ? body.plan : "pro";

  // DB values we actually want to store
  // "starter" in UI → "standard" in DB
  const subscriptionPlan = rawPlan === "starter" ? "standard" : "pro";

  // 3) Map plan -> Stripe price ID
  const priceId =
    subscriptionPlan === "standard"
      ? process.env.STRIPE_PRICE_STARTER_MONTHLY
      : process.env.STRIPE_PRICE_PRO_MONTHLY;

  if (!priceId) {
    return NextResponse.json(
      { error: `Missing Stripe price env for plan ${subscriptionPlan}` },
      { status: 500 }
    );
  }

  // 4) Load or create restaurant row
  let { data: restaurant, error: restaurantError } = await supabase
    .from("restaurants")
    .select("*")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (restaurantError) {
    console.error("checkout: error loading restaurant", restaurantError);
  }

  // If there is NO restaurant yet, create a minimal one
  if (!restaurant) {
    const fallbackName =
      body.restaurantName?.trim() ||
      `New SelectorOS workspace for ${user.email || "operator"}`;

    const { data: inserted, error: insertError } = await supabase
      .from("restaurants")
      .insert({
        owner_id: user.id,
        name: fallbackName,
        plan: subscriptionPlan,
        subscription_plan: subscriptionPlan,
        onboarding_complete: false,
        onboarding_completed: false,
      })
      .select("*")
      .single();

    if (insertError) {
      console.error("checkout: failed to create restaurant", insertError);
      return NextResponse.json(
        { error: insertError.message || "Could not create restaurant." },
        { status: 500 }
      );
    }

    restaurant = inserted;
  } else {
    // Restaurant already exists → pre-set plan fields
    const { error: updateError } = await supabase
      .from("restaurants")
      .update({
        plan: subscriptionPlan,
        subscription_plan: subscriptionPlan,
      })
      .eq("id", restaurant.id);

    if (updateError) {
      console.error("checkout: failed to update restaurant plan", updateError);
      return NextResponse.json(
        { error: updateError.message || "Could not update restaurant plan." },
        { status: 500 }
      );
    }
  }

  // 5) Ensure Stripe customer
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

    const { error: customerUpdateError } = await supabase
      .from("restaurants")
      .update({ stripe_customer_id: customerId })
      .eq("id", restaurant.id);

    if (customerUpdateError) {
      console.error(
        "checkout: failed to attach stripe_customer_id",
        customerUpdateError
      );
      return NextResponse.json(
        {
          error:
            customerUpdateError.message ||
            "Could not attach Stripe customer to restaurant.",
        },
        { status: 500 }
      );
    }
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // 6) Create checkout session
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: `${baseUrl}/onboarding?success=1&plan=${subscriptionPlan}`,
    cancel_url: `${baseUrl}/select-plan?canceled=1`,
    metadata: {
      restaurant_id: restaurant.id,
      user_id: user.id,
      plan: subscriptionPlan,
      price_id: priceId,
    },
  });

  return NextResponse.json({ url: session.url });
}
