// src/app/dashboard/settings/page.js

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
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

  const { data: restaurant, error } = await supabase
    .from("restaurants")
    .select("*")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (error || !restaurant) {
    console.error("No restaurant for this user", error);
    return (
      <main className="page-fade px-6 py-10 text-slate-200">
        <h1 className="text-2xl font-semibold mb-2">Settings</h1>
        <p className="text-sm text-slate-400">
          We couldn’t find a restaurant linked to this account.
        </p>
      </main>
    );
  }

  return (
    <main className="page-fade px-6 py-10 text-slate-100">
      <div className="max-w-3xl space-y-8">
        <header>
          <h1 className="text-2xl font-semibold mb-1">
            {restaurant.name} – Settings
          </h1>
          <p className="text-sm text-slate-400">
            Manage branding and guest-facing options for your live allergen
            view.
          </p>
        </header>

        <section className="rounded-2xl bg-slate-950/80 border border-slate-800/70 shadow-[0_22px_60px_rgba(0,0,0,0.75)] p-6 space-y-4">
          <h2 className="text-lg font-semibold">Restaurant logo</h2>
          <p className="text-sm text-slate-400">
            Upload a logo that will appear on your guest view page. PNG or SVG
            with a transparent background works best.
          </p>

          <LogoUploader
            restaurantId={restaurant.id}
            initialLogoUrl={restaurant.logo_url}
          />
        </section>
      </div>
    </main>
  );
}
