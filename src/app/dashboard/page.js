// src/app/dashboard/page.js
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
// ...other imports

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = createServerComponentClient({ cookies });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const { data: restaurant, error } = await supabase
    .from("restaurants")
    .select("*")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Dashboard: error loading restaurant", error);
  }

  // Still no restaurant? → onboarding to create it
  if (!restaurant) {
    redirect("/onboarding");
  }

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

  // ✅ No more redirect to onboarding here.
  // At this point: user, restaurant, and plan exist → show dashboard.

  return (
    <main className="so-main">
      <div className="so-main-inner">
        {/* your existing dashboard UI */}
      </div>
    </main>
  );
}
