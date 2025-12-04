// src/app/onboarding/page.js
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import OnboardingClient from "./OnboardingClient";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const supabase = createServerComponentClient({ cookies });

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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#e0f2fe_0,_#c7d2fe_35%,_#0f172a_100%)] flex items-center justify-center px-4 py-10">
      <OnboardingClient existingRestaurant={restaurant} />
    </main>
  );
}
