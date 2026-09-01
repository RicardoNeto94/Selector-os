// src/app/api/billing/checkout/route.js
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getPlan, normalizePlanKey, stripePriceIdForPlan } from "@/lib/billing/catalog";
import { requireBillingAdministrator } from "@/lib/server/billingContext";

export async function POST(req) {
  if (!stripe) return NextResponse.json({ error: "Stripe is not configured in this environment." }, { status: 503 });
  const access = await requireBillingAdministrator();
  if (access.error) return NextResponse.json({ error: access.error.message }, { status: access.error.status });

  // 2) Read body (plan)
  let body = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const planKey = normalizePlanKey(body.plan);
  const plan = getPlan(planKey);
  if (!plan.checkout) {
    return NextResponse.json({ error: "This plan requires a Vaxeron commercial agreement." }, { status: 400 });
  }
  const priceId = stripePriceIdForPlan(planKey);

  if (!priceId) {
    return NextResponse.json(
      { error: `Missing Stripe price env for plan "${planKey}".` },
      { status: 500 }
    );
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
  const organizationId = access.tenant.organization.id;

  try {
    let customerId = access.settings.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: access.user.email || undefined,
        name: access.tenant.organization.name,
        metadata: { organization_id: organizationId },
      });
      customerId = customer.id;
      const customerUpdate = await access.admin
        .from("organization_platform_settings")
        .update({ stripe_customer_id: customerId, updated_at: new Date().toISOString() })
        .eq("organization_id", organizationId);
      if (customerUpdate.error) throw customerUpdate.error;
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/dashboard/billing?checkout=success`,
      cancel_url: `${baseUrl}/dashboard/billing?checkout=canceled`,
      allow_promotion_codes: true,
      subscription_data: {
        metadata: { organization_id: organizationId, plan: planKey },
      },
      metadata: {
        organization_id: organizationId,
        actor_user_id: access.user.id,
        plan: planKey,
        price_id: priceId,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout session error", err);

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
