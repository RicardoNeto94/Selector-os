// src/lib/planLimits.js
import { normalizePlanKey } from "@/lib/billing/catalog";

export function getRestaurantPlan(restaurant) {
  // Fallbacks just in case
  const raw =
    restaurant.plan ||
    restaurant.subscription_plan ||
    "starter";

  return normalizePlanKey(raw);
}

export function getMenuLimitForPlan(plan) {
  switch (plan) {
    case "starter":
      return 1;
    case "professional":
      return 3;
    case "hospitality_suite":
    case "enterprise":
      return Infinity; // effectively no limit
    default:
      return 1;
  }
}
