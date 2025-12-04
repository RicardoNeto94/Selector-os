// src/app/dashboard/billing/BillingClient.js
"use client";

import { useState } from "react";

export default function BillingClient({ restaurant }) {
  const [loadingUpgrade, setLoadingUpgrade] = useState(false);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [error, setError] = useState("");

  // Extremely forgiving "isPro" check
  const isPro =
    restaurant.plan === "pro" ||
    restaurant.subscription_plan === "pro" ||
    restaurant.stripe_subscription_status === "active" ||
    restaurant.stripe_price_id === process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY;

  const currentPlanLabel = isPro ? "Pro" : "Starter";
  const currentPlanDescription = isPro
    ? "Full SelectorOS cockpit with unlimited dishes and live staff view."
    : "Basic tools to manage a single restaurant and allergen list.";

  async function handleUpgrade() {
    if (isPro) return; // nothing to do

    try {
      setError("");
      setLoadingUpgrade(true);

      const res = await fetch("/api/billing/checkout", {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to start checkout session.");
      }

      const data = await res.json();

      if (!data.url) {
        throw new Error("Stripe checkout URL missing from response.");
      }

      window.location.href = data.url;
    } catch (err) {
      console.error("Upgrade error", err);
      setError(err.message || "Failed to redirect to checkout.");
    } finally {
      setLoadingUpgrade(false);
    }
  }

  async function handleManageSubscription() {
    try {
      setError("");
      setLoadingPortal(true);

      const res = await fetch("/api/billing/portal", {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to open customer portal.");
      }

      const data = await res.json();

      if (!data.url) {
        throw new Error("Stripe portal URL missing from response.");
      }

      window.location.href = data.url;
    } catch (err) {
      console.error("Portal error", err);
      setError(err.message || "Failed to open Stripe customer portal.");
    } finally {
      setLoadingPortal(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="mb-2">
        <p className="text-xs uppercase tracking-[0.25em] text-emerald-400/80 mb-2">
          SelectorOS • Billing
        </p>
        <h1 className="text-2xl md:text-3xl font-semibold text-slate-50">
          Your billing & plan
        </h1>
        <p className="text-sm text-slate-400 mt-1 max-w-xl">
          Manage subscription, invoices and plan for{" "}
          <span className="text-emerald-300 font-medium">
            {restaurant.name}
          </span>
          .
        </p>
      </header>

      {/* Current plan summary */}
      <section className="rounded-3xl bg-slate-950/80 border border-slate-800/80 shadow-[0_22px_60px_rgba(0,0,0,0.75)] p-6 md:p-7 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs text-slate-400 mb-1">Current plan</p>
          <p className="text-xl font-semibold text-slate-50">
            {currentPlanLabel}
          </p>
          <p className="text-sm text-slate-400 mt-1 max-w-md">
            {currentPlanDescription}
          </p>

          <div className="mt-3 text-xs text-slate-500 space-y-1">
            <p>
              Status:{" "}
              <span className="font-medium text-slate-200">
                {restaurant.stripe_subscription_status || "n/a"}
              </span>
            </p>
            <p className="break-all">
              Customer ID:{" "}
              <span className="font-mono text-[11px]">
                {restaurant.stripe_customer_id || "—"}
              </span>
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 mt-4 md:mt-0 md:items-end">
          {isPro ? (
            <>
              <button
                type="button"
                onClick={handleManageSubscription}
                disabled={loadingPortal}
                className="inline-flex items-center justify-center rounded-full bg-emerald-400 px-5 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-300 disabled:opacity-50 transition"
              >
                {loadingPortal ? "Opening portal…" : "Manage subscription"}
              </button>
              <p className="text-[11px] text-slate-500 max-w-xs text-right">
                Opens your secure Stripe customer portal to update card,
                download invoices or cancel.
              </p>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleUpgrade}
                disabled={loadingUpgrade}
                className="inline-flex items-center justify-center rounded-full bg-emerald-400 px-6 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-300 disabled:opacity-50 transition"
              >
                {loadingUpgrade ? "Redirecting…" : "Upgrade to Pro"}
              </button>
              <p className="text-[11px] text-slate-500 max-w-xs text-right">
                You&apos;ll be redirected to a secure Stripe checkout. Your
                plan will update automatically after payment.
              </p>
            </>
          )}
        </div>
      </section>

      {/* Plan comparison grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Starter / Free */}
        <div className="rounded-3xl bg-slate-950/70 border border-slate-800/80 p-6 flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-slate-50">
                Starter 
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Ideal for testing SelectorOS with one restaurant.
              </p>
            </div>
            <p className="text-sm font-semibold text-slate-200">
              €0 / month
            </p>
          </div>
          <ul className="mt-2 text-xs text-slate-300 space-y-1">
            <li>• 1 restaurant workspace</li>
            <li>• Allergen editor & live staff view</li>
            <li>• Basic theme controls</li>
          </ul>
          {!isPro && (
            <span className="mt-2 inline-flex self-start rounded-full border border-slate-600 px-3 py-1 text-[11px] text-slate-300">
              This is your current plan
            </span>
          )}
        </div>

        {/* Pro */}
        <div className="rounded-3xl bg-emerald-500/10 border border-emerald-400/60 p-6 flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-emerald-200">
                Pro
              </h2>
              <p className="text-xs text-emerald-100/80 mt-1">
                Designed for live restaurant service with full control.
              </p>
            </div>
            <p className="text-sm font-semibold text-emerald-100">
              €49.99 / month
            </p>
          </div>
          <ul className="mt-2 text-xs text-emerald-50/90 space-y-1">
            <li>• Everything in Starter</li>
            <li>• Unlimited dishes & menus</li>
            <li>• Stripe-powered billing & invoices</li>
          </ul>

          {isPro ? (
            <span className="mt-2 inline-flex self-start rounded-full border border-emerald-400/70 px-3 py-1 text-[11px] text-emerald-100">
              This is your current plan
            </span>
          ) : (
            <button
              type="button"
              onClick={handleUpgrade}
              disabled={loadingUpgrade}
              className="mt-3 inline-flex items-center justify-center rounded-full bg-emerald-400 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-300 disabled:opacity-50 transition"
            >
              {loadingUpgrade ? "Redirecting…" : "Upgrade to Pro"}
            </button>
          )}
        </div>
      </section>

      {error && (
        <p className="text-xs text-red-300 bg-red-950/40 border border-red-500/40 rounded-xl px-3 py-2">
          {error}
        </p>
      )}

      <p className="text-[11px] text-slate-500 mt-4">
        All payments are processed securely by Stripe. You can cancel anytime
        in the customer portal.
      </p>
    </div>
  );
}
