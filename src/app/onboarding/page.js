// src/app/onboarding/page.js
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import OnboardingClient from "./OnboardingClient";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const supabase = await createClient();

  // 1) Auth guard
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  // 2) Load any existing restaurant for this owner
  const { data: restaurant, error } = await supabase
    .from("restaurants")
    .select("*")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Onboarding: error loading restaurant", error);
  }

  // 3) If onboarding already done, go to dashboard
  if (
    restaurant &&
    (restaurant.onboarding_complete || restaurant.onboarding_completed)
  ) {
    redirect("/dashboard");
  }

  return (
    <main className="page-fade min-h-screen flex items-center justify-center px-6 py-10 text-slate-900">
      <div className="max-w-3xl w-full">
        <div className="rounded-[32px] bg-white/90 backdrop-blur-2xl border border-slate-200/70 shadow-[0_24px_70px_rgba(15,23,42,0.22)] px-7 py-6">
          <header className="mb-4">
            <p className="text-xs uppercase tracking-[0.28em] text-emerald-500/80 mb-1">
              SelectorOS • Onboarding
            </p>
            <h1 className="text-2xl md:text-[26px] font-semibold text-slate-900">
              Let&apos;s set up your restaurant
            </h1>
            <p className="text-sm text-slate-500 mt-1 max-w-xl">
              We&apos;ll use this information to build your SelectorOS workspace
              and your first live menu cockpit.
            </p>
          </header>

          <OnboardingClient existingRestaurant={restaurant || null} />
        </div>
      </div>
    </main>
  );
}
