// src/app/api/stripe/webhook/route.js

import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

// Init Stripe (server-side only)
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2024-06-20",
    })
  : null;

// Admin Supabase client using service role key
const supabaseAdmin =
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        {
          auth: { persistSession: false },
        }
      )
    : null;

export async function POST(request) {
  const sig = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !supabaseAdmin || !webhookSecret) {
    console.error("Stripe webhook misconfigured");
    return NextResponse.json({ error: "Misconfigured" }, { status: 500 });
  }

  let event;

  // Stripe needs the RAW body for signature verification
  const body = await request.text();

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error("❌ Webhook signature verification failed:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const customerId = subscription.customer;
        const status = subscription.status; // 'active', 'trialing', 'canceled', 'past_due', etc.

        console.log(
          `🔁 Subscription event: ${event.type} – ${customerId} → ${status}`
        );

        await supabaseAdmin
          .from("restaurants")
          .update({ stripe_subscription_status: status })
          .eq("stripe_customer_id", customerId);

        break;
      }

      default:
        // We ignore other event types for now
        console.log(`➡️ Ignoring Stripe event type: ${event.type}`);
        break;
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error("🔥 Error handling webhook:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
