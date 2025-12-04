// src/app/api/stripe/webhook/route.js

import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

export async function POST(req) {
  const body = await req.text();
  const sig = headers().get("stripe-signature");
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
  } catch (err) {
    console.error("❌ Stripe webhook signature failed:", err.message);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      // Fired right after checkout succeeds
      case "checkout.session.completed": {
        const session = event.data.object;

        const restaurantId = session.metadata?.restaurant_id;
        const stripeCustomerId = session.customer;
        const stripeSubscriptionId = session.subscription;

        if (!restaurantId) {
          console.warn("No restaurant_id in session.metadata");
          break;
        }

        let priceId = null;
        let status = null;

        if (stripeSubscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(
            stripeSubscriptionId
          );
          priceId = subscription.items?.data?.[0]?.price?.id || null;
          status = subscription.status;
        }

        const plan =
          status === "active" &&
          priceId === process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID
            ? "pro"
            : "starter";

        const { error } = await supabaseAdmin
          .from("restaurants")
          .update({
            stripe_customer_id: stripeCustomerId,
            stripe_subscription_id: stripeSubscriptionId,
            stripe_subscription_status: status,
            stripe_price_id: priceId,
            plan,
          })
          .eq("id", restaurantId);

        if (error) {
          console.error("❌ Supabase update error (checkout.session):", error);
          return new NextResponse("Supabase error", { status: 500 });
        }

        console.log("✅ Restaurant updated after checkout", {
          restaurantId,
          plan,
        });
        break;
      }

      // Keep subscription in sync if Stripe changes it
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const subscriptionId = subscription.id;

        const priceId = subscription.items?.data?.[0]?.price?.id || null;
        const status = subscription.status;

        const { data, error } = await supabaseAdmin
          .from("restaurants")
          .select("id")
          .eq("stripe_subscription_id", subscriptionId)
          .limit(1);

        if (error) {
          console.error("❌ Supabase lookup error (subscription.updated):", error);
          break;
        }

        if (!data || !data.length) {
          console.warn(
            "Subscription event for unknown restaurant",
            subscriptionId
          );
          break;
        }

        const restaurantId = data[0].id;

        const plan =
          status === "active" &&
          priceId === process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID
            ? "pro"
            : "starter";

        const { error: updateError } = await supabaseAdmin
          .from("restaurants")
          .update({
            stripe_subscription_status: status,
            stripe_price_id: priceId,
            plan,
          })
          .eq("id", restaurantId);

        if (updateError) {
          console.error(
            "❌ Supabase update error (subscription.updated):",
            updateError
          );
        } else {
          console.log("✅ Restaurant subscription updated", {
            restaurantId,
            status,
            plan,
          });
        }

        break;
      }

      default:
        // Ignore all other events for now
        console.log(`ℹ️ Ignoring Stripe event: ${event.type}`);
        break;
    }

    return new NextResponse("OK", { status: 200 });
  } catch (err) {
    console.error("❌ Stripe webhook handler error:", err);
    return new NextResponse("Webhook handler error", { status: 500 });
  }
}
