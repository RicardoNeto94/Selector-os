import { NextResponse } from "next/server";
import Stripe from "stripe";
import { cookies } from "next/headers";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
});

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  const supabase = createServerComponentClient({ cookies });

  // 1) Get logged-in user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return new NextResponse("Not authenticated", { status: 401 });
  }

  // 2) Find restaurant for this owner
  const { data: restaurant, error: rError } = await supabase
    .from("restaurants")
    .select("*")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (rError || !restaurant) {
    console.error("No restaurant for user", user.id, rError);
    return new NextResponse("Restaurant not found", { status: 400 });
  }

  // 3) Decide which price to use (Pro monthly for now)
  const priceId = process.env.STRIPE_PRICE_PRO_MONTHLY;
  if (!priceId) {
    console.error("STRIPE_PRICE_PRO_MONTHLY is not set");
    return new NextResponse("Stripe price not configured", { status: 500 });
  }

  // 4) Reuse existing customer if we have it
  let customerId = restaurant.stripe_customer_id;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: {
        restaurant_id: restaurant.id,
        user_id: user.id,
      },
    });

    customerId = customer.id;

    // Persist on restaurant
    await supabase
      .from("restaurants")
      .update({ stripe_customer_id: customerId })
      .eq("id", restaurant.id);
  }

  // 5) Create checkout session
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?success=1`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?canceled=1`,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    metadata: {
      restaurant_id: restaurant.id.toString(),
      user_id: user.id,
      plan: "pro",
      price_id: priceId,
    },
  });

  return NextResponse.json({ url: session.url });
}
