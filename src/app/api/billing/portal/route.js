// src/app/api/billing/portal/route.js

import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { requireBillingAdministrator } from "@/lib/server/billingContext";

export async function POST(request) {
  try {
    if (!stripe) {
      return NextResponse.json(
        { error: "Stripe is not configured in this environment." },
        { status: 500 }
      );
    }

    const access = await requireBillingAdministrator();
    if (access.error) return NextResponse.json({ error: access.error.message }, { status: access.error.status });
    if (!access.settings.stripe_customer_id) {
      return NextResponse.json(
        { error: "No Stripe customer found for this workspace" },
        { status: 400 }
      );
    }

    const origin =
      request.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL;

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: access.settings.stripe_customer_id,
      return_url: `${origin}/dashboard/billing`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (err) {
    console.error("Stripe portal error", err);
    return NextResponse.json(
      { error: "Unable to open billing portal" },
      { status: 500 }
    );
  }
}
