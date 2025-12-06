// src/app/page.js
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";

export const dynamic = "force-dynamic";

export default async function RootPage() {
  const supabase = createServerComponentClient({ cookies });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 1) Not logged in → send to marketing / sign-in
  if (!user) {
    // if you use /selector as landing, use that instead
    redirect("/sign-in");
  }

  // 2) Find restaurant for this user
  const { data: restaurant, error } = await supabase
    .from("restaurants")
    .select("*")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("RootPage: restaurant lookup error", error);
  }

  // 3) No restaurant yet → must finish onboarding
  if (!restaurant) {
    redirect("/onboarding");
  }

  const onboardingDone =
    restaurant.onboarding_complete || restaurant.onboarding_completed;

  if (!onboardingDone) {
    redirect("/onboarding");
  }

  // 4) Onboarding done but no active subscription → paywall
  const isActiveSub = restaurant.stripe_subscription_status === "active";

  if (!isActiveSub) {
    redirect("/select-plan");
  }

  // 5) All good → go to dashboard
  redirect("/dashboard");
}
