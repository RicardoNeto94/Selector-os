// src/app/select-plan/SelectPlanClient.js
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function SelectPlanClient({ restaurant }) {
  const router = useRouter();
  const supabase = createClientComponentClient();

  const [loading, setLoading] = useState(null); // "starter" | "pro" | "enterprise"
  const [error, setError] = useState("");

  async function startCheckout(plan) {
    try {
      setError("");
      setLoading(plan);

      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plan }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to start checkout.");
      }

      const data = await res.json();
      if (!data.url) throw new Error("Stripe checkout URL missing from response.");

      window.location.href = data.url;
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to redirect to Stripe.");
      setLoading(null);
    }
  }

  async function handleChooseStarter() {
    // Starter ALSO goes through Stripe now
    await startCheckout("starter");
  }

  async function handleChoosePro() {
    await startCheckout("pro");
  }

  async function handleEnterprise() {
    try {
      setError("");
      setLoading("enterprise");

      const { error } = await supabase
        .from("restaurants")
        .update({
          plan: "enterprise",
          subscription_plan: "enterprise",
        })
        .eq("id", restaurant.id);

      if (error) throw error;

      // No Stripe here – go straight to onboarding
      router.push("/onboarding");
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to select Enterprise.");
      setLoading(null);
    }
  }

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <header className="rounded-[28px] bg-white/90 backdrop-blur-xl shadow-[0_20px_60px_rgba(15,23,42,0.16)] border border-slate-200/70 px-7 py-5">
        <p className="text-xs uppercase tracking-[0.25em] text-emerald-500/90 mb-2">
          SelectorOS • Choose your plan
        </p>
        <h1 className="text-2xl md:text-[26px] font-semibold text-slate-900">
          Pick the right cockpit for your restaurant
        </h1>
        <p className="text-sm text-slate-500 max-w-xl mt-1.5">
          You can upgrade or change plan later. We’ll only charge after you confirm via Stripe.
        </p>
      </header>

      {/* PLANS GRID */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* STARTER */}
        <article className="rounded-3xl bg-white/90 border border-slate-200/80 shadow-[0_16px_40px_rgba(15,23,42,0.10)] px-5 py-6 flex flex-col gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Starter</h2>
            <p className="mt-1 text-xs text-slate-500">
              Perfect to test SelectorOS in a single restaurant.
            </p>
          </div>
          <p className="text-lg font-semibold text-slate-900">€X / month</p>
          <ul className="mt-2 text-xs text-slate-600 space-y-1.5">
            <li>• 1 menu</li>
            <li>• Live allergen view</li>
            <li>• Basic theming</li>
          </ul>
          <button
            type="button"
            onClick={handleChooseStarter}
            disabled={loading === "starter"}
            className="mt-4 inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-900 hover:border-slate-400 hover:bg-slate-50 disabled:opacity-60 transition"
          >
            {loading === "starter" ? "Redirecting…" : "Continue with Starter"}
          </button>
        </article>

        {/* PRO */}
        <article className="rounded-3xl bg-emerald-500/10 border border-emerald-300/80 shadow-[0_18px_50px_rgba(16,185,129,0.26)] px-5 py-6 flex flex-col gap-3 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-emerald-400/30 blur-3xl" />
          </div>
          <div className="relative">
            <div className="inline-flex items-center gap-1 rounded-full bg-emerald-100/90 text-emerald-800 text-[10px] font-semibold px-2 py-0.5 mb-2">
              Recommended
            </div>
            <h2 className="text-base font-semibold text-emerald-50">
              Pro
            </h2>
            <p className="mt-1 text-xs text-emerald-100/80">
              For live restaurant service and full control.
            </p>
          </div>
          <p className="relative text-lg font-semibold text-emerald-50">
            €49.99 / month
          </p>
          <ul className="relative mt-2 text-xs text-emerald-50/90 space-y-1.5">
            <li>• Up to 3 menus</li>
            <li>• Unlimited dishes</li>
            <li>• Stripe billing & invoices</li>
          </ul>
          <button
            type="button"
            onClick={handleChoosePro}
            disabled={loading === "pro"}
            className="relative mt-4 inline-flex items-center justify-center rounded-full bg-emerald-400 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-300 disabled:opacity-60 transition"
          >
            {loading === "pro" ? "Redirecting…" : "Upgrade to Pro"}
          </button>
        </article>

        {/* ENTERPRISE */}
        <article className="rounded-3xl bg-white/85 border border-slate-200/80 shadow-[0_14px_36px_rgba(15,23,42,0.10)] px-5 py-6 flex flex-col gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Enterprise</h2>
            <p className="mt-1 text-xs text-slate-500">
              Multi-venue groups and custom workflows.
            </p>
          </div>
          <p className="text-lg font-semibold text-slate-900">By request</p>
          <ul className="mt-2 text-xs text-slate-600 space-y-1.5">
            <li>• More than 3 menus</li>
            <li>• Multi-restaurant setup</li>
            <li>• Priority support & onboarding</li>
          </ul>
          <button
            type="button"
            onClick={handleEnterprise}
            disabled={loading === "enterprise"}
            className="mt-4 inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-900 hover:border-slate-400 hover:bg-slate-50 disabled:opacity-60 transition"
          >
            {loading === "enterprise" ? "Setting up…" : "Continue with Enterprise"}
          </button>

          <p className="mt-2 text-[11px] text-slate-500">
            We&apos;ll reach out to you after onboarding.  
            For urgent setups: hello@selectoros.com
          </p>
        </article>
      </section>

      {error && (
        <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-2xl px-4 py-2 mt-2">
          {error}
        </p>
      )}

      <p className="text-[11px] text-slate-500 mt-3">
        Powered by Stripe • You can change or cancel your plan anytime in Billing.
      </p>
    </div>
  );
}
