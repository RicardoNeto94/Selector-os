import Stripe from "stripe";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";
import { stripe as sharedStripe } from "@/lib/stripe";
import {
  getPlanModules,
  planFromStripePriceId,
} from "@/lib/billing/catalog";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
});

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function legacyPOST(req) {
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

function fromUnix(value) {
  return value ? new Date(value * 1000).toISOString() : null;
}

function organizationPayload(subscription, plan) {
  return {
    plan,
    enabled_modules: getPlanModules(plan),
    billing_mode: "stripe",
    billing_status: subscription.status,
    stripe_customer_id: String(subscription.customer),
    stripe_subscription_id: subscription.id,
    stripe_price_id: subscription.items?.data?.[0]?.price?.id || null,
    current_period_end: fromUnix(subscription.current_period_end),
    cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
    updated_at: new Date().toISOString(),
  };
}

async function persistSubscription(organizationId, subscription, plan) {
  const payload = organizationPayload(subscription, plan);
  const { data: updatedSettings, error } = await supabaseAdmin
    .from("organization_platform_settings")
    .update(payload)
    .eq("organization_id", organizationId)
    .select("organization_id")
    .maybeSingle();
  if (error) throw error;
  if (!updatedSettings) {
    throw new Error(`No billing settings found for organization ${organizationId}.`);
  }

  // Transitional mirror for the remaining legacy restaurant-level billing readers.
  const { error: legacyError } = await supabaseAdmin
    .from("restaurants")
    .update({
      plan: plan === "starter" ? "starter" : "pro",
      stripe_customer_id: payload.stripe_customer_id,
      stripe_subscription_id: payload.stripe_subscription_id,
      stripe_price_id: payload.stripe_price_id,
      stripe_subscription_status: payload.billing_status,
    })
    .eq("organization_id", organizationId);
  if (legacyError) console.warn("Legacy billing mirror failed", legacyError);
}

async function resolveOrganizationId(subscription) {
  if (subscription.metadata?.organization_id) return subscription.metadata.organization_id;
  const { data, error } = await supabaseAdmin
    .from("organization_platform_settings")
    .select("organization_id")
    .eq("stripe_customer_id", String(subscription.customer))
    .maybeSingle();
  if (error) throw error;
  return data?.organization_id || null;
}

async function processSubscription(subscription, fallbackOrganizationId = null) {
  const priceId = subscription.items?.data?.[0]?.price?.id || null;
  const plan = planFromStripePriceId(priceId);
  if (!plan) throw new Error(`Unrecognized Stripe price ${priceId || "(missing)"}.`);
  const organizationId = fallbackOrganizationId || (await resolveOrganizationId(subscription));
  if (!organizationId) throw new Error("Subscription is not linked to a Vaxeron organization.");
  await persistSubscription(organizationId, subscription, plan);
}

export async function POST(req) {
  if (!sharedStripe || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Stripe webhook is not configured." }, { status: 503 });
  }

  let event;
  try {
    event = sharedStripe.webhooks.constructEvent(
      await req.text(),
      req.headers.get("stripe-signature"),
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    return new NextResponse(`Webhook Error: ${error.message}`, { status: 400 });
  }

  try {
    const { data: processed, error: lookupError } = await supabaseAdmin
      .from("billing_webhook_events")
      .select("stripe_event_id")
      .eq("stripe_event_id", event.id)
      .maybeSingle();
    if (lookupError) throw lookupError;
    if (processed) return NextResponse.json({ received: true, duplicate: true });

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      if (!session.metadata?.organization_id || !session.subscription) {
        throw new Error("Checkout is missing organization or subscription metadata.");
      }
      const subscription = await sharedStripe.subscriptions.retrieve(String(session.subscription));
      await processSubscription(subscription, session.metadata.organization_id);
    } else if (
      [
        "customer.subscription.created",
        "customer.subscription.updated",
        "customer.subscription.deleted",
      ].includes(event.type)
    ) {
      await processSubscription(event.data.object);
    }

    const { error: recordError } = await supabaseAdmin
      .from("billing_webhook_events")
      .insert({ stripe_event_id: event.id, event_type: event.type });
    if (recordError && recordError.code !== "23505") throw recordError;
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook processing failed", { eventId: event.id, type: event.type, error });
    return new NextResponse("Webhook handler error", { status: 500 });
  }
}

void legacyPOST;
