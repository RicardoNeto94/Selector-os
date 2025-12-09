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

  const { data: restaurant, error } = await supabase
    .from("restaurants")
    .select("*")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (error || !restaurant) {
    console.error("Billing: no restaurant for user", error);
    return (
      <div className="page-fade">
        <div className="max-w-xl mx-auto rounded-2xl border border-red-500/40 bg-red-50/90 p-6">
          <h1 className="text-lg font-semibold mb-2 text-red-800">
            No restaurant found
          </h1>
          <p className="text-sm text-red-700/90">
            We couldn&apos;t find a restaurant linked to your account. Finish
            onboarding first.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-fade">
      <div className="max-w-4xl mx-auto">
        <BillingClient restaurant={restaurant} />
      </div>
    </div>
  );
}
