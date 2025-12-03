// src/app/dashboard/settings/page.js

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import AppearanceSettingsForm from "./AppearanceSettingsForm";

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
        {/* PAGE HEADER — slightly tighter padding so it sits higher */}
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

          {/* RIGHT: Branding / staff card */}
          <aside className="rounded-[28px] bg-white/80 backdrop-blur-xl border border-slate-200/70 shadow-[0_18px_50px_rgba(15,23,42,0.15)] px-6 py-5 flex flex-col gap-3">
            <div className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 w-fit mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Coming soon
            </div>
            <h2 className="text-base font-semibold text-slate-900">
              Branding & staff
            </h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              Logo upload, staff roles, QR codes and integrations will live
              here. You&apos;ll be able to brand your guest view with your own
              identity and control who can edit dishes.
            </p>

            <ul className="mt-2 space-y-1.5 text-sm text-slate-500">
              <li>• Upload a logo for guest & staff views.</li>
              <li>• Set manager / editor roles for SelectorOS.</li>
              <li>• Generate table QR codes for the allergen view.</li>
            </ul>

            <div className="mt-3 rounded-2xl border border-dashed border-slate-300/80 bg-slate-50/80 px-4 py-3 text-xs text-slate-500">
              Roadmap note: this block is a preview. Your current restaurant
              uses the default SelectorOS identity.
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
