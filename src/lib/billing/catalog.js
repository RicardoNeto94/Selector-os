export const BILLING_MODES = Object.freeze({
  PLATFORM_MANAGED: "platform_managed",
  STRIPE: "stripe",
});

export const MODULE_KEYS = Object.freeze([
  "wine",
  "dining",
  "spa",
  "guest_experience",
]);

export const PLAN_CATALOG = Object.freeze({
  pilot: {
    key: "pilot",
    name: "Pilot",
    description: "A Vaxeron-managed evaluation workspace.",
    monthlyPrice: null,
    stripePriceEnv: null,
    modules: { wine: true, dining: false, spa: false, guest_experience: false },
    checkout: false,
  },
  starter: {
    key: "starter",
    name: "Wine Operations",
    description: "Live cellar, inventory, venue stock and ordering intelligence.",
    monthlyPrice: 299,
    stripePriceEnv: "STRIPE_PRICE_WINE_OPS_MONTHLY",
    modules: { wine: true, dining: false, spa: false, guest_experience: false },
    checkout: true,
  },
  professional: {
    key: "professional",
    name: "Digital Wine",
    description: "Wine operations plus branded, stock-aware guest wine lists.",
    monthlyPrice: 449,
    stripePriceEnv: "STRIPE_PRICE_DIGITAL_WINE_MONTHLY",
    modules: { wine: true, dining: false, spa: false, guest_experience: true },
    checkout: true,
  },
  hospitality_suite: {
    key: "hospitality_suite",
    name: "Hospitality Suite",
    description: "Wine, dining, spa and guest experience in one workspace.",
    monthlyPrice: 699,
    stripePriceEnv: "STRIPE_PRICE_HOSPITALITY_SUITE_MONTHLY",
    modules: { wine: true, dining: true, spa: true, guest_experience: true },
    checkout: true,
  },
  enterprise: {
    key: "enterprise",
    name: "Enterprise",
    description: "Custom multi-property rollout, integrations and support.",
    monthlyPrice: null,
    stripePriceEnv: null,
    modules: { wine: true, dining: true, spa: true, guest_experience: true },
    checkout: false,
  },
});

const LEGACY_PLAN_ALIASES = Object.freeze({
  pro: "professional",
  standard: "starter",
});

export function normalizePlanKey(value) {
  const raw = String(value || "pilot").trim().toLowerCase();
  const normalized = LEGACY_PLAN_ALIASES[raw] || raw;
  return PLAN_CATALOG[normalized] ? normalized : "pilot";
}

export function getPlan(value) {
  return PLAN_CATALOG[normalizePlanKey(value)];
}

export function getPlanModules(value) {
  return { ...getPlan(value).modules };
}

export function normalizeModules(modules, plan) {
  const defaults = getPlanModules(plan);
  if (!modules || typeof modules !== "object" || Array.isArray(modules)) return defaults;
  return Object.fromEntries(MODULE_KEYS.map((key) => [key, Boolean(modules[key])]));
}

export function resolveEntitlements(settings) {
  const plan = normalizePlanKey(settings?.plan);
  const billingMode = settings?.billing_mode || BILLING_MODES.PLATFORM_MANAGED;
  const billingStatus = settings?.billing_status || "not_configured";
  const accountEnabled = settings?.onboarding_status !== "paused";
  const subscriptionEnabled =
    billingMode !== BILLING_MODES.STRIPE ||
    ["trialing", "active"].includes(billingStatus);

  return {
    plan,
    planDefinition: getPlan(plan),
    billingMode,
    billingStatus,
    enabled: accountEnabled && subscriptionEnabled,
    modules: normalizeModules(settings?.enabled_modules, plan),
  };
}

export function canUseModule(entitlements, moduleKey) {
  return Boolean(
    MODULE_KEYS.includes(moduleKey) &&
      entitlements?.enabled &&
      entitlements?.modules?.[moduleKey]
  );
}

export function planFromStripePriceId(priceId, env = process.env) {
  if (!priceId) return null;
  return (
    Object.values(PLAN_CATALOG).find(
      (plan) => plan.stripePriceEnv && env[plan.stripePriceEnv] === priceId
    )?.key || null
  );
}

export function stripePriceIdForPlan(planKey, env = process.env) {
  const plan = getPlan(planKey);
  if (!plan.checkout || !plan.stripePriceEnv) return null;
  return env[plan.stripePriceEnv] || null;
}
