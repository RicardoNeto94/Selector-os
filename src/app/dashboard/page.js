// src/app/dashboard/page.js
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = createServerComponentClient({ cookies });

  // 1) Auth guard
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  // 2) Load restaurant for this owner
  const { data: restaurant, error } = await supabase
    .from("restaurants")
    .select("*")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Dashboard: error loading restaurant", error);
  }

  // If no restaurant row yet → send them to select-plan
  if (!restaurant) {
    redirect("/select-plan");
  }

  // Decide if user has chosen a plan
  const hasPlan =
    restaurant.plan === "standard" ||
    restaurant.plan === "pro" ||
    restaurant.subscription_plan === "standard" ||
    restaurant.subscription_plan === "pro";

  const onboardingDone =
    restaurant.onboarding_complete || restaurant.onboarding_completed;

  // No plan yet → force paywall
  if (!hasPlan) {
    redirect("/select-plan");
  }

  // Plan chosen but onboarding not done → force onboarding
  if (!onboardingDone) {
    redirect("/onboarding");
  }

  // 3) Normal dashboard render (user has plan + onboarding)
  return (
    <>
      {/* Put your existing dashboard JSX here.
          Example if you already had: 
          <main className="page-fade px-6 py-10 text-slate-100"> ... */}
      
      <main className="page-fade px-6 py-10 text-slate-100">
        {/* YOUR EXISTING DASHBOARD CONTENT GOES HERE */}
      </main>
    </>
  );
}
