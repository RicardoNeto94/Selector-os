// src/app/page.js
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = createServerComponentClient({ cookies });

  // 1) Auth guard
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  // 2) Restaurant for this owner
  const { data: restaurant, error } = await supabase
    .from("restaurants")
    .select("*")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Home: error loading restaurant", error);
  }

  // No restaurant yet → send to onboarding (it will create one)
  if (!restaurant) {
    redirect("/onboarding");
  }

  // Has restaurant, check plan only
  const hasPaidPlan =
    restaurant &&
    (
      restaurant.plan === "standard" ||
      restaurant.plan === "pro" ||
      restaurant.subscription_plan === "starter" ||
      restaurant.subscription_plan === "standard" ||
      restaurant.subscription_plan === "pro"
    );

  if (!hasPaidPlan) {
    redirect("/select-plan");
  }

  // Restaurant + plan → always let them into dashboard
  redirect("/dashboard");
}
