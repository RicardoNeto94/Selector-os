// src/app/api/billing/checkout/route.js
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { stripe } from "src/lib/stripe";

export async function POST(req) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // 1) Auth guard
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("checkout: not authenticated", authError);
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // 2) Find this user's restaurant
    const { data: restaurants, error: restaurantError } = await supabase
      .from("restaurants")
      .select("*")
      .eq("owner_id", user.id);

    if (restaurantError) {
      console.error("checkout: error loading restaurants", restaurantError);
      return NextResponse.json(
        { error: "Failed to load restaurant for this account." },
        { status: 500 }
      );
    }

    if (!restaurants || restaurants.length === 0) {
      console.error("checkout: no restaurant for user", user.id);
      return NextResponse.json(
        { error: "Restaurant not found. Complete onboarding first." },
        { status: 400 }
      );
    }

    // If you accidentally created more than one, just pick the latest by create_at
    const restaurant = restaurants.sort((a, b) =>
      (b.create_at || "").localeCompare(a.create_at || "")
    )[0];

    // 3) Read body (plan)
    let body = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    let plan = body.plan === "starter" || body.plan === "pro"
      ? body.plan
      : "pro";

    // 4) Map plan -> Stripe price ID
    const starterPrice = process.env.STRIPE_PRICE_STARTER_MONTHLY;
    const proPrice = process.env.STRIPE_PRICE_PRO_MONTHLY;

    const priceId = plan === "starter" ? starterPrice : proPrice;

    if (!priceId) {
      console.error("checkout: missing price env", {
        plan,
        hasStarter: !!starterPrice,
        hasPro: !!proPrice,
      });
      return NextResponse.json(
        { error: `Missing Stripe price env for plan "${plan}".` },
        { status: 500 }
      );
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      console.error("checkout: STRIPE_SECRET_KEY is missing");
      return NextResponse.json(
        { error: "Stripe is not configured on the server." },
        { status: 500 }
      );
    }

    // 5) Ensure Stripe customer exists for this restaurant
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

      const { error: updateError } = await supabase
        .from("restaurants")
        .update({ stripe_customer_id: customerId })
        .eq("id", restaurant.id);

      if (updateError) {
        console.error("checkout: failed to save stripe_customer_id", updateError);
        // Not fatal for checkout, but log it.
      }
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

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
      success_url: `${baseUrl}/onboarding?success=1&plan=${plan}`,
      cancel_url: `${baseUrl}/select-plan?canceled=1`,
      metadata: {
        restaurant_id: restaurant.id,
        user_id: user.id,
        plan,
        price_id: priceId,
      },
      subscription_data: {
        metadata: {
          plan,
          restaurant_id: restaurant.id,
          user_id: user.id,
        },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("checkout: unexpected error", err);
    return NextResponse.json(
      {
        error:
          "Stripe checkout failed: " +
          (err?.message || "Unknown server error."),
      },
      { status: 500 }
    );
  }
}
