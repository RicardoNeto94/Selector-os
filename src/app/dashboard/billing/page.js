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
      <main className="page-fade px-6 pt-10 pb-16 text-slate-900">
        <div className="max-w-4xl mx-auto">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
            <h1 className="text-lg font-semibold mb-2 text-red-800">
              No restaurant found
            </h1>
            <p className="text-sm text-red-700">
              We couldn&apos;t find a restaurant linked to your account. Finish
              onboarding first.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="page-fade px-6 pt-10 pb-16 text-slate-900">
      <div className="max-w-6xl mx-auto">
        <BillingClient restaurant={restaurant} />
      </div>
    </main>
  );
}
