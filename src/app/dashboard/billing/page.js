// src/app/dashboard/billing/page.js
import "../../styles/dashboard.css";
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

  if (!user) redirect("/sign-in");

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("*")
    .eq("owner_id", user.id)
    .maybeSingle();

  return (
    <div className="so-dashboard-root">
      <div className="so-dashboard-main">
        <div className="so-dashboard-hero">
          <p className="so-hero-eyebrow">SELECTOROS • BILLING</p>
          <h1 className="so-hero-title">Your billing & plan</h1>
          <p className="so-hero-desc">
            Manage subscription, invoices and plan for{" "}
            <span className="text-emerald-500">{restaurant.name}</span>.
          </p>
        </div>

        <BillingClient restaurant={restaurant} />
      </div>
    </div>
  );
}
