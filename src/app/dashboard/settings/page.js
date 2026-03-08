// src/app/dashboard/settings/page.js

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import AppearanceSettingsForm from "./AppearanceSettingsForm";
import LogoUploader from "./LogoUploader";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = createServerComponentClient({ cookies });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const { data: restaurant, error: restaurantError } = await supabase
    .from("restaurants")
    .select("*")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (restaurantError || !restaurant) {
    console.error("No restaurant for user", restaurantError);

    return (
      <main className="so-main page-fade">
        <div className="so-main-inner mx-auto w-full max-w-[900px]">

          <div className="so-card border border-red-400/30 bg-red-50/90">
            <h1 className="mb-2 text-lg font-semibold text-red-800">
              No restaurant found
            </h1>

            <p className="text-sm text-red-700/90">
              We couldn&apos;t find a restaurant linked to your account yet.
              Finish onboarding or contact support.
            </p>
          </div>

        </div>
      </main>
    );
  }

  return (
    <main className="so-main page-fade">

      <div className="so-main-inner mx-auto w-full max-w-[1200px]">

        {/* PAGE TITLE */}

        <div className="mb-8">

          <h1 className="text-xl font-semibold text-white">
            Settings
          </h1>

          <p className="text-sm text-slate-400 mt-1 max-w-xl">
            Tune how SelectorOS looks and behaves for{" "}
            <span className="text-white font-medium">
              {restaurant.name || "your restaurant"}
            </span>.
          </p>

        </div>


        {/* CONTENT GRID */}

        <section className="grid grid-cols-1 lg:grid-cols-[1.7fr_1fr] gap-6 items-start">

          {/* APPEARANCE PANEL */}

          <div className="so-card p-6">

            <AppearanceSettingsForm
              restaurantId={restaurant.id}
              initialPrimaryColor={restaurant.theme_primary_color}
              initialBackgroundStyle={restaurant.theme_background_style}
              initialCardStyle={restaurant.theme_card_style}
              initialDensity={restaurant.theme_density}
            />

          </div>


          {/* BRANDING PANEL */}

          <aside className="so-card p-6 flex flex-col gap-5">

            <h2 className="text-sm font-semibold text-white">
              Logo & branding
            </h2>

            <LogoUploader
              restaurantId={restaurant.id}
              initialLogoUrl={
                restaurant.theme_logo_url || restaurant.logo_url || ""
              }
            />

            <div className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1 rounded-full bg-white/10 border border-white/10 text-slate-300 w-fit">
              <span className="w-1.5 h-1.5 rounded-full bg-white/70" />
              More branding controls coming soon
            </div>

            <p className="text-sm text-slate-400 leading-relaxed">
              Future updates will let you configure staff roles, table QR codes
              and deeper theme options for your allergen view.
            </p>

          </aside>

        </section>

      </div>

    </main>
  );
}
