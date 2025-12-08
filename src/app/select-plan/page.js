// src/app/select-plan/page.js
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import SelectPlanClient from "./SelectPlanClient";

export const dynamic = "force-dynamic";

export default async function SelectPlanPage() {
  const supabase = createServerComponentClient({ cookies });

  // 1) Auth guard
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  // 2) Load restaurant for this owner (if any)
  const { data: restaurant, error } = await supabase
    .from("restaurants")
    .select("*")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("select-plan: error loading restaurant", error);
  }

  const hasPaidPlan =
    !!restaurant &&
    (
      restaurant.plan === "standard" ||
      restaurant.plan === "pro" ||
      restaurant.subscription_plan === "standard" ||
      restaurant.subscription_plan === "starter" || // ⬅️ IMPORTANT
      restaurant.subscription_plan === "pro"
    );

  const onboardingDone =
    !!restaurant &&
    (restaurant.onboarding_complete || restaurant.onboarding_completed);

  // If they already paid AND finished onboarding → straight to dashboard
  if (hasPaidPlan && onboardingDone) {
    redirect("/dashboard");
  }

  // If they already paid BUT didn't finish onboarding → send them there
  if (hasPaidPlan && !onboardingDone) {
    const planKey =
      restaurant.subscription_plan ||
      (restaurant.plan === "standard" ? "starter" : restaurant.plan) ||
      "starter";

    redirect(`/onboarding?plan=${encodeURIComponent(planKey)}`);
  }

  // Otherwise: show the SelectPlan screen
  return (
    <main className="page-fade px-6 py-10 text-slate-100">
      <div className="max-w-4xl mx-auto">
        <SelectPlanClient restaurantName={restaurant?.name || null} />
      </div>
    </main>
  );
}
