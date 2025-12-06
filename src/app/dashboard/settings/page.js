// src/app/dashboard/settings/page.js

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import AppearanceSettingsForm from "./AppearanceSettingsForm";
import LogoUploader from "./LogoUploader";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = createServerComponentClient({ cookies });

  // 1) Auth guard
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  // 2) Load restaurant + theme values
  const { data: restaurant, error: restaurantError } = await supabase
    .from("restaurants")
    .select("*")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (restaurantError || !restaurant) {
    console.error("No restaurant for user", restaurantError);
    return (
      <main className="page-fade px-6 pt-4 pb-8 text-slate-900">
        <div className="max-w-3xl mx-auto rounded-3xl border border-red-500/30 bg-red-50/80 p-6 shadow-lg">
          <h1 className="text-lg font-semibold mb-2 text-red-800">
            No restaurant found
          </h1>
          <p className="text-sm text-red-700/90">
            We couldn&apos;t find a restaurant linked to your account yet.
            Finish onboarding or contact support.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="page-fade px-6 pt-4 pb-8 text-slate-900">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* PAGE HEADER */}
        <section className="rounded-[28px] bg-white/90 backdrop-blur-xl shadow-[0_20px_60px_rgba(15,23,42,0.16)] border border-slate-200/70 px-7 py-4 flex flex-col gap-1">
          <h1 className="text-2xl md:text-[26px] font-semibold text-slate-900">
            Settings
          </h1>
          <p className="text-sm text-slate-500 max-w-xl">
            Tune how SelectorOS looks and behaves for{" "}
            <span className="font-medium text-slate-800">
              {restaurant.name || "your restaurant"}
            </span>
            .
          </p>
        </section>

        {/* MAIN GRID: APPEARANCE + BRANDING */}
        <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,2.1fr)_minmax(0,1fr)] gap-5 items-start">
          {/* LEFT: Appearance form */}
          <div>
            <AppearanceSettingsForm
              restaurantId={restaurant.id}
              initialPrimaryColor={restaurant.theme_primary_color}
              initialBackgroundStyle={restaurant.theme_background_style}
              initialCardStyle={restaurant.theme_card_style}
              initialDensity={restaurant.theme_density}
            />
          </div>

          {/* RIGHT: Branding / logo & roadmap */}
          <aside className="rounded-[28px] bg-white/80 backdrop-blur-xl border border-slate-200/70 shadow-[0_18px_50px_rgba(15,23,42,0.15)] px-6 py-5 flex flex-col gap-4">
            <h2 className="text-base font-semibold text-slate-900">
              Logo & branding
            </h2>

            <LogoUploader
              restaurantId={restaurant.id}
              initialLogoUrl={
                restaurant.theme_logo_url || restaurant.logo_url || ""
              }
            />

            <div className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 w-fit">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              More branding controls coming soon
            </div>

            <p className="text-sm text-slate-500 leading-relaxed">
              Future updates will let you configure staff roles, table QR codes
              and deeper theme options for your allergen view.
            </p>
          </aside>
        </section>
      </div>
    </main>
  );
}
