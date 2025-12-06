// src/lib/planLimits.js

// Normalize the plan name from restaurant row
export function getRestaurantPlan(restaurant) {
  // You can tweak this logic depending on how you store plans
  const raw =
    restaurant.plan ||
    restaurant.subscription_plan ||
    restaurant.stripe_subscription_status ||
    "starter";

  const plan = String(raw).toLowerCase();

  if (plan.includes("enterprise")) return "enterprise";
  if (plan === "pro") return "pro";
  if (plan === "starter" || plan === "free") return "starter";

  // Fallback: treat anything unknown as starter for safety
  return "starter";
}

// How many menus this plan is allowed to have
export function getMenuLimitForPlan(plan) {
  switch (plan) {
    case "enterprise":
      return Infinity; // by request = no hard limit in code
    case "pro":
      return 3;
    case "starter":
    default:
      return 1;
  }
}
