// src/app/api/billing/checkout/route.js
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "../../../../lib/stripe";

export async function POST(req) {
  const supabase = await createClient();

  // 1) Auth guard
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // 2) Read body (plan)
  let body = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const planKey = body.plan === "starter" ? "starter" : "pro";

  // 3) Map plan -> Stripe price
  const priceId =
    planKey === "starter"
      ? process.env.STRIPE_PRICE_STARTER_MONTHLY
      : process.env.STRIPE_PRICE_PRO_MONTHLY;

  if (!priceId) {
    return NextResponse.json(
      { error: `Missing Stripe price env for plan "${planKey}".` },
      { status: 500 }
    );
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: user.email ?? undefined,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/onboarding?success=1&plan=${planKey}`,
      cancel_url: `${baseUrl}/select-plan?canceled=1`,
      metadata: {
        user_id: user.id,
        plan: planKey,
        price_id: priceId,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout session error", err);

    // 👇 TEMP: show real Stripe error
    return NextResponse.json(
      {
        error:
          err?.message ||
          err?.error?.message ||
          "Failed to create Stripe checkout session",
      },
      { status: 500 }
    );
  }
}
