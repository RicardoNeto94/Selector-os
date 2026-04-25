// src/app/dashboard/billing/page.js

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import BillingClient from "./BillingClient";

export const dynamic = "force-dynamic";

export default async function BillingPage() {

  // ✅ FIX (Next.js 14)
  const cookieStore = await cookies();

  const supabase = createServerComponentClient({
    cookies: () => cookieStore
  });

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
      <main className="so-main page-fade">
        <div className="so-main-inner mx-auto w-full max-w-[900px]">

          <div className="so-card border border-red-400/30 bg-red-500/10">

            <h1 className="text-lg font-semibold mb-2 text-red-400">
              No restaurant found
            </h1>

            <p className="text-sm text-red-300">
              We couldn&apos;t find a restaurant linked to your account.
              Finish onboarding first.
            </p>

          </div>

        </div>
      </main>
    );
  }

  return (
    <main className="so-main page-fade">
      <div className="so-main-inner mx-auto w-full max-w-[1000px]">

        <BillingClient restaurant={restaurant} />

      </div>
    </main>
  );
}