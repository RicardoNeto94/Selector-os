// src/app/dashboard/billing/page.js

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const supabase = createServerComponentClient({ cookies });

  // Auth guard
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  // Load restaurant – mainly to show the name
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
        {/* HEADER */}
        <section className="rounded-[28px] bg-white/90 backdrop-blur-xl shadow-[0_20px_60px_rgba(15,23,42,0.16)] border border-slate-200/70 px-7 py-4 flex flex-col gap-1">
          <h1 className="text-2xl md:text-[26px] font-semibold text-slate-900">
            Billing
          </h1>
          <p className="text-sm text-slate-500 max-w-xl">
            Manage your SelectorOS plan and invoices for{" "}
            <span className="font-medium text-slate-800">
              {restaurant.name || "your restaurant"}
            </span>
            .
          </p>
        </section>

        {/* MAIN GRID */}
        <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1.4fr)] gap-5 items-start">
          {/* LEFT: Plan card */}
          <div className="rounded-[28px] bg-white/90 backdrop-blur-xl border border-slate-200/70 shadow-[0_18px_50px_rgba(15,23,42,0.15)] px-6 py-6 flex flex-col gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-emerald-500 mb-1">
                Current plan
              </p>
              <div className="flex items-baseline gap-3">
                <h2 className="text-lg font-semibold text-slate-900">
                  Starter (placeholder)
                </h2>
                <span className="text-sm text-slate-500">— free beta</span>
              </div>
              <p className="text-sm text-slate-500 mt-1 max-w-md">
                During beta your SelectorOS workspace is free. When paid plans
                launch, they&apos;ll appear here with upgrade options.
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50/90 border border-slate-200 px-4 py-3 text-xs text-slate-500">
              No billing is active on this account yet. You won&apos;t be
              charged until you connect a payment method and pick a plan.
            </div>

            <div className="flex flex-wrap gap-3 pt-1">
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-full bg-slate-900 text-slate-50 text-xs font-semibold px-5 py-2 opacity-60 cursor-not-allowed"
              >
                Upgrade plan (soon)
              </button>
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-full border border-slate-300 text-xs font-semibold text-slate-700 px-4 py-2"
              >
                Contact sales
              </button>
            </div>
          </div>

          {/* RIGHT: Invoices / usage placeholder */}
          <aside className="rounded-[28px] bg-white/85 backdrop-blur-xl border border-slate-200/70 shadow-[0_18px_50px_rgba(15,23,42,0.15)] px-6 py-6 flex flex-col gap-3">
            <h2 className="text-base font-semibold text-slate-900">
              Invoices & usage
            </h2>
            <p className="text-sm text-slate-500">
              When billing goes live, this block will show a list of invoices,
              subscription status and basic usage (restaurants, menus, seats).
            </p>

            <div className="mt-2 rounded-2xl border border-dashed border-slate-300/80 bg-slate-50/80 px-4 py-3 text-xs text-slate-500">
              For now, everything in SelectorOS is on a free developer plan.
              Perfect for setting up dishes, menus and staff flows.
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
