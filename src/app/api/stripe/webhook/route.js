import Stripe from "stripe";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

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

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;

        // We set these when creating the checkout session
        const restaurantId = session.metadata?.restaurant_id || null;
        const plan = session.metadata?.plan || "pro";

        const customerId = session.customer;
        const subscriptionId = session.subscription;

        // We also stored price_id in metadata when creating session
        const priceId =
          session.metadata?.price_id ||
          (Array.isArray(session.display_items) &&
            session.display_items[0]?.price?.id) ||
          null;

        if (!restaurantId) {
          console.warn(
            "⚠️ checkout.session.completed without restaurant_id metadata"
          );
          break;
        }

        await supabaseAdmin
          .from("restaurants")
          .update({
            plan: plan, // "pro"
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            stripe_price_id: priceId,
            stripe_subscription_status: "active",
          })
          .eq("id", restaurantId);

        console.log(
          `✅ Updated restaurant ${restaurantId} to plan ${plan} (customer ${customerId})`
        );
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const customerId = subscription.customer;
        const status = subscription.status; // active, canceled, past_due etc.

        // Get first price on the subscription
        const item = subscription.items?.data?.[0];
        const priceId = item?.price?.id || null;

        // Decide plan based on price
        let plan = "starter";
        if (priceId === process.env.STRIPE_PRICE_PRO_MONTHLY) {
          plan = "pro";
        }

        await supabaseAdmin
          .from("restaurants")
          .update({
            plan,
            stripe_subscription_status: status,
            stripe_price_id: priceId,
          })
          .eq("stripe_customer_id", customerId);

        console.log(
          `🔄 Subscription update for customer ${customerId}: status=${status}, plan=${plan}`
        );
        break;
      }

      default:
        // For now we ignore other events
        console.log(`➡️  Ignoring Stripe event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("❌ Error handling Stripe webhook:", err);
    return new NextResponse("Webhook handler error", { status: 500 });
  }
}
