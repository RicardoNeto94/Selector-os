// src/app/api/billing/portal/route.js

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import Stripe from "stripe";

let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2024-06-20",
  });
}

export async function POST(request) {
  try {
    if (!stripe) {
      return NextResponse.json(
        { error: "Stripe is not configured in this environment." },
        { status: 500 }
      );
    }

    const supabase = createRouteHandlerClient({ cookies });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data: restaurant, error: rError } = await supabase
      .from("restaurants")
      .select("*")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (rError || !restaurant || !restaurant.stripe_customer_id) {
      return NextResponse.json(
        { error: "No Stripe customer found for this workspace" },
        { status: 400 }
      );
    }

    const origin =
      request.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL;

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: restaurant.stripe_customer_id,
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
