import test from "node:test";
import assert from "node:assert/strict";
import {
  canUseModule,
  normalizePlanKey,
  planFromStripePriceId,
  resolveEntitlements,
  stripePriceIdForPlan,
} from "../src/lib/billing/catalog.js";

test("normalizes legacy plan names", () => {
  assert.equal(normalizePlanKey("pro"), "professional");
  assert.equal(normalizePlanKey("standard"), "starter");
});

test("platform-managed workspaces keep assigned modules without Stripe", () => {
  const entitlements = resolveEntitlements({
    plan: "professional",
    billing_mode: "platform_managed",
    billing_status: "not_configured",
    onboarding_status: "live",
    enabled_modules: { wine: true, guest_experience: true },
  });
  assert.equal(entitlements.enabled, true);
  assert.equal(canUseModule(entitlements, "wine"), true);
  assert.equal(canUseModule(entitlements, "spa"), false);
});

test("Stripe-managed access requires an active or trialing subscription", () => {
  const inactive = resolveEntitlements({
    plan: "starter",
    billing_mode: "stripe",
    billing_status: "past_due",
    onboarding_status: "live",
  });
  const active = resolveEntitlements({
    plan: "starter",
    billing_mode: "stripe",
    billing_status: "active",
    onboarding_status: "live",
  });
  assert.equal(inactive.enabled, false);
  assert.equal(active.enabled, true);
});

test("Stripe price lookup only accepts configured catalogue prices", () => {
  const env = {
    STRIPE_PRICE_WINE_OPS_MONTHLY: "price_wine",
    STRIPE_PRICE_DIGITAL_WINE_MONTHLY: "price_digital",
  };
  assert.equal(stripePriceIdForPlan("starter", env), "price_wine");
  assert.equal(planFromStripePriceId("price_digital", env), "professional");
  assert.equal(planFromStripePriceId("price_attacker", env), null);
});
