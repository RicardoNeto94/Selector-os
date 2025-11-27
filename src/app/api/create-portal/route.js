// src/app/api/create-portal/route.js
export const dynamic = "force-dynamic";

import Stripe from "stripe";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  // apiVersion is optional but nice to pin
  apiVersion: "2024-06-20",
});

export async function POST() {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // 1) Logged-in user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("User error:", userError);
      return Response.json({ error: "Not logged in" }, { status: 401 });
    }

    // 2) Restaurant for this user
    const { data: restaurant, error: restaurantError } = await supabase
      .from("restaurants")
      .select("id, name, stripe_customer_id")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (restaurantError || !restaurant) {
      console.error("Restaurant error:", restaurantError);
      return Response.json(
        { error: "Restaurant not found for this user" },
        { status: 400 }
      );
    }

    let customerId = restaurant.stripe_customer_id;

    // 3) Create customer if missing
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        name: restaurant.name ?? undefined,
        metadata: {
          restaurant_id: restaurant.id,
          user_id: user.id,
        },
      });

      customerId = customer.id;

      const { error: updateError } = await supabase
        .from("restaurants")
        .update({ stripe_customer_id: customerId })
        .eq("id", restaurant.id);

      if (updateError) {
        console.error("Failed to save stripe_customer_id:", updateError);
      }
    }

    // 4) Billing portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing`,
    });

    return Response.json({ url: session.url });
  } catch (err) {
    console.error("Stripe portal error (server):", err);

    const message =
      (err && type
