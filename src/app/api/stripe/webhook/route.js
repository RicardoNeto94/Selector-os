import Stripe from "stripe";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin"; // use the alias to be safe

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
});

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req) {
  const sig = req.headers.get("stripe-signature");
  const buf = await req.text();

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      buf,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("❌ Stripe webhook signature verify error:", err.message);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  console.log("➡️  Stripe webhook event received:", event.type);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;

        const restaurantId = session.metadata?.restaurant_id;
        const plan = session.metadata?.plan || "pro";
        const customerId = session.customer;
        const subscriptionId = session.subscription;

        const priceId =
          session.metadata?.price_id ||
          (Array.isArray(session.display_items) &&
            session.display_items[0]?.price?.id) ||
          null;

        console.log("checkout.session.completed payload metadata:", {
          restaurantId,
          plan,
          customerId,
          subscriptionId,
          priceId,
        });

        if (!restaurantId) {
          console.warn(
            "⚠️ checkout.session.completed WITHOUT restaurant_id metadata – cannot link subscription to restaurant."
          );
          break;
        }

        const { data, error } = await supabaseAdmin
          .from("restaurants")
          .update({
            plan,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            stripe_price_id: priceId,
            stripe_subscription_status: "active",
          })
          .eq("id", restaurantId)
          .select("id, name, plan, stripe_customer_id, stripe_subscription_status")
          .maybeSingle();

        if (error) {
          console.error(
            "❌ Supabase error updating restaurant on checkout.session.completed:",
            error
          );
        } else if (!data) {
          console.warn(
            "⚠️ No restaurant row updated on checkout.session.completed. restaurant_id:",
            restaurantId
          );
        } else {
          console.log(
            `✅ Updated restaurant ${data.id} (${data.name}) to plan ${data.plan} – customer=${data.stripe_customer_id} status=${data.stripe_subscription_status}`
          );
        }

        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const customerId = subscription.customer;
        const status = subscription.status; // active, canceled, past_due etc.

        const item = subscription.items?.data?.[0];
        const priceId = item?.price?.id || null;

        let plan = "starter";
        if (priceId === process.env.STRIPE_PRICE_PRO_MONTHLY) {
          plan = "pro";
        }

        console.log("customer.subscription.* payload:", {
          customerId,
          status,
          priceId,
          resolvedPlan: plan,
        });

        const { data, error } = await supabaseAdmin
          .from("restaurants")
          .update({
            plan,
            stripe_subscription_status: status,
            stripe_price_id: priceId,
          })
          .eq("stripe_customer_id", customerId)
          .select("id, name, plan, stripe_subscription_status")
          .maybeSingle();

        if (error) {
          console.error(
            "❌ Supabase error updating restaurant on subscription event:",
            error
          );
        } else if (!data) {
          console.warn(
            "⚠️ No restaurant row found for subscription event – stripe_customer_id:",
            customerId
          );
        } else {
          console.log(
            `🔄 Subscription update for restaurant ${data.id} (${data.name}): status=${data.stripe_subscription_status}, plan=${data.plan}`
          );
        }

        break;
      }

      default:
        console.log(`➡️  Ignoring Stripe event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("❌ Error handling Stripe webhook:", err);
    return new NextResponse("Webhook handler error", { status: 500 });
  }
}
