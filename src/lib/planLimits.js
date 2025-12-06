// src/lib/planLimits.js

export function getRestaurantPlan(restaurant) {
  // Fallbacks just in case
  const raw =
    restaurant.plan ||
    restaurant.subscription_plan ||
    "starter";

  if (raw === "pro") return "pro";
  if (raw === "enterprise") return "enterprise";

  return "starter";
}

export function getMenuLimitForPlan(plan) {
  switch (plan) {
    case "starter":
      return 1;
    case "pro":
      return 3;
    case "enterprise":
      return Infinity; // effectively no limit
    default:
      return 1;
  }
}
