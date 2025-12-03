// src/lib/stripe.js
import Stripe from "stripe";

let stripe = null;

// Only initialise Stripe if the secret key exists.
// If it doesn't, we log a warning but DO NOT break the build.
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2024-06-20",
  });
} else {
  console.warn(
    "⚠️ STRIPE_SECRET_KEY is not set. Stripe features are disabled in this environment."
  );
}

export { stripe };
