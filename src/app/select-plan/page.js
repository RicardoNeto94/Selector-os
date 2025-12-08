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

  // 2) Try to load restaurant
  const { data: restaurant, error } = await supabase
    .from("restaurants")
    .select("*")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("select-plan: error loading restaurant", error);
  }

  // 3) If they already have a plan + finished onboarding → send them to dashboard
  if (
    restaurant &&
    (restaurant.plan === "standard" ||
      restaurant.plan === "pro" ||
      restaurant.subscription_plan === "standard" ||
      restaurant.subscription_plan === "pro") &&
    (restaurant.onboarding_complete || restaurant.onboarding_completed)
  ) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-5xl">
        <SelectPlanClient restaurantName={restaurant?.name || null} />
      </div>
    </main>
  );
}
