// src/app/dashboard/billing/page.js

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import BillingClient from "./BillingClient";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const supabase = createServerComponentClient({ cookies });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("*")
    .eq("owner_id", user.id)
    .maybeSingle();

  return (
    <main className="page-fade px-6 py-10 text-slate-900">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* HEADER */}
        <header className="rounded-3xl bg-white/75 backdrop-blur-2xl shadow-[0_24px_80px_rgba(15,23,42,0.35)] border border-white/60 px-6 py-5 md:px-8 md:py-6">
          <p className="text-xs uppercase tracking-[0.25em] text-emerald-500/80 mb-1">
            SELECTOROS • BILLING
          </p>
          <h1 className="text-2xl md:text-3xl font-semibold text-slate-900">
            Plans &amp; billing
          </h1>
          <p className="mt-2 text-sm text-slate-500 max-w-xl">
            Manage your SelectorOS subscription. Test mode uses Stripe&apos;s
            sandbox and will not charge real cards.
          </p>
          {restaurant && (
            <p className="mt-2 text-xs text-slate-400">
              Current workspace:{" "}
              <span className="font-semibold text-slate-600">
                {restaurant.name}
              </span>
            </p>
          )}
        </header>

        <BillingClient hasStripeCustomer={!!restaurant?.stripe_customer_id} />
      </div>
    </main>
  );
}
