// src/app/select-plan/SelectPlanClient.js
"use client";

import { useState } from "react";

export default function SelectPlanClient({ restaurantName }) {
  const [loadingPlan, setLoadingPlan] = useState("");
  const [error, setError] = useState("");

  async function startCheckout(planKey) {
    try {
      setError("");
      setLoadingPlan(planKey);

      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plan: planKey }), // "starter" or "pro"
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to start checkout.");
      }

      const data = await res.json();

      if (!data.url) {
        throw new Error("Stripe checkout URL missing from response.");
      }

      window.location.href = data.url;
    } catch (err) {
      console.error("Checkout error", err);
      setError(err.message || "Failed to redirect to Stripe checkout.");
      setLoadingPlan("");
    }
  }

  function handleEnterprise() {
    // For now: email. Later you can change to a /contact page.
    window.location.href =
      "mailto:hello@selector.ee?subject=SelectorOS%20Enterprise%20plan";
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="mb-3">
        <p className="text-xs uppercase tracking-[0.25em] text-emerald-400/80 mb-2">
          SelectorOS • Choose your plan
        </p>
        <h1 className="text-2xl md:text-3xl font-semibold text-slate-50">
          Select your workspace plan
        </h1>
        <p className="text-sm text-slate-400 mt-2 max-w-xl">
          You&apos;re about to create a live SelectorOS cockpit
          {restaurantName ? (
            <>
              {" "}
              for{" "}
              <span className="text-emerald-300 font-medium">
                {restaurantName}
              </span>
              .
            </>
          ) : (
            "."
          )}{" "}
          Pick a plan that matches how many menus you need.
        </p>
      </header>

      {/* Plans grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Starter */}
        <div className="rounded-3xl bg-slate-950/80 border border-slate-800/80 p-5 flex flex-col gap-3 shadow-[0_20px_50px_rgba(0,0,0,0.7)]">
          <div>
            <h2 className="text-base font-semibold text-slate-50">Standard</h2>
            <p className="text-xs text-slate-400 mt-1">
              For single-menu restaurants starting with SelectorOS.
            </p>
          </div>

          <div className="flex items-baseline gap-1">
            <span className="text-lg font-semibold text-slate-50">€X</span>
            <span className="text-xs text-slate-500">/ month</span>
          </div>

          <p className="text-xs text-slate-400">Includes:</p>
          <ul className="text-xs text-slate-300 space-y-1">
            <li>• 1 active menu</li>
            <li>• Guest allergen view</li>
            <li>• Basic theming</li>
          </ul>

          <button
            type="button"
            onClick={() => startCheckout("starter")}
            disabled={loadingPlan === "starter"}
            className="mt-3 inline-flex items-center justify-center rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-900 hover:bg-white disabled:opacity-60 transition"
          >
            {loadingPlan === "starter" ? "Redirecting…" : "Choose Standard"}
          </button>
        </div>

        {/* Pro */}
        <div className="rounded-3xl bg-emerald-500/10 border border-emerald-400/70 p-5 flex flex-col gap-3 shadow-[0_24px_60px_rgba(16,185,129,0.35)] relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none opacity-40">
            <div className="w-[180%] h-[180%] bg-[radial-gradient(circle_at_top,_rgba(45,212,191,0.35),transparent_60%)] translate-x-[-20%] translate-y-[-40%]" />
          </div>

          <div className="relative">
            <div className="inline-flex items-center gap-1 mb-2 rounded-full bg-emerald-500/15 border border-emerald-300/60 px-3 py-1 text-[10px] font-medium text-emerald-50 uppercase tracking-[0.16em]">
              Recommended
            </div>
            <h2 className="text-base font-semibold text-emerald-50">Pro</h2>
            <p className="text-xs text-emerald-100/90 mt-1">
              For live service with multiple menus and more control.
            </p>
          </div>

          <div className="relative flex items-baseline gap-1">
            <span className="text-lg font-semibold text-emerald-50">
              €49.99
            </span>
            <span className="text-xs text-emerald-100/80">/ month</span>
          </div>

          <p className="relative text-xs text-emerald-100/80">Includes:</p>
          <ul className="relative text-xs text-emerald-50/90 space-y-1">
            <li>• Up to 3 active menus</li>
            <li>• Guest & staff views</li>
            <li>• Stripe-powered billing & invoices</li>
          </ul>

          <button
            type="button"
            onClick={() => startCheckout("pro")}
            disabled={loadingPlan === "pro"}
            className="relative mt-3 inline-flex items-center justify-center rounded-full bg-emerald-400 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-300 disabled:opacity-60 transition"
          >
            {loadingPlan === "pro" ? "Redirecting…" : "Choose Pro"}
          </button>
        </div>

        {/* Enterprise */}
        <div className="rounded-3xl bg-slate-950/70 border border-slate-700/80 p-5 flex flex-col gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-50">
              Enterprise
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Groups, hotel collections or multi-unit operators.
            </p>
          </div>

          <div className="flex items-baseline gap-1">
            <span className="text-lg font-semibold text-slate-50">
              Let&apos;s talk
            </span>
          </div>

          <p className="text-xs text-slate-400">We can offer:</p>
          <ul className="text-xs text-slate-300 space-y-1">
            <li>• Unlimited menus & locations</li>
            <li>• Custom integrations & support</li>
            <li>• Team training & rollout</li>
          </ul>

          <button
            type="button"
            onClick={handleEnterprise}
            className="mt-3 inline-flex items-center justify-center rounded-full border border-slate-500/70 px-4 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-100 hover:text-slate-900 transition"
          >
            Contact the team
          </button>
        </div>
      </section>

      {error && (
        <p className="mt-4 text-xs text-red-300 bg-red-950/40 border border-red-500/40 rounded-xl px-3 py-2">
          {error}
        </p>
      )}

      <p className="mt-4 text-[11px] text-slate-500 max-w-xl">
        Standard and Pro are billed monthly via Stripe. You can cancel anytime
        in your customer portal.
      </p>
    </div>
  );
}
