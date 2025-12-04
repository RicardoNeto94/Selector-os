// src/app/dashboard/billing/page.js

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import BillingClient from "./BillingClient";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const supabase = createServerComponentClient({ cookies });

  // 1) Auth guard
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  // 2) Load current user's restaurant
  const { data: restaurant, error } = await supabase
    .from("restaurants")
    .select("*")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (error || !restaurant) {
    console.error("Billing: no restaurant for user", error);
    return (
      <main className="page-fade px-6 pt-10 pb-16 text-slate-100">
        <div className="max-w-xl mx-auto rounded-2xl border border-red-500/40 bg-red-950/40 p-6">
          <h1 className="text-lg font-semibold mb-2">No restaurant found</h1>
          <p className="text-sm text-red-100/80">
            We couldn&apos;t find a restaurant linked to your account. Finish
            onboarding first.
          </p>
        </div>
      </main>
    );
  }

  // 3) Normal billing page render
  return (
    <main className="page-fade px-6 pt-10 pb-16 text-slate-100">
      <div className="max-w-5xl mx-auto">
        <BillingClient restaurant={restaurant} />
      </div>
    </main>
  );
}
