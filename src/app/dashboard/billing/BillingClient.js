// src/app/dashboard/billing/BillingClient.js
"use client";

import { useState } from "react";

export default function BillingClient({ restaurant }) {
  const [loadingUpgrade, setLoadingUpgrade] = useState(false);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [error, setError] = useState("");

  // Very forgiving "isPro" check
  const isPro =
    restaurant.plan === "pro" ||
    restaurant.subscription_plan === "pro" ||
    restaurant.stripe_subscription_status === "active" ||
    restaurant.stripe_price_id ===
      process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY;

  const currentPlanLabel = isPro ? "Pro" : "Starter";
  const currentPlanDescription = isPro
    ? "Full SelectorOS cockpit with unlimited dishes and live staff view."
    : "Ideal for testing SelectorOS with a single restaurant workspace.";

  async function handleUpgrade() {
    if (isPro) return;

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
    <div className="page-fade px-6 pt-10 pb-16">
      {/* HERO HEADER CARD – matches dashboard/settings style */}
      <section className="mb-8">
        <div className="rounded-[32px] border border-white/60 bg-white/80 shadow-[0_24px_80px_rgba(15,23,42,0.18)] backdrop-blur-xl px-6 py-6 md:px-10 md:py-7 flex flex-col gap-3">
          <p className="text-[11px] font-medium tracking-[0.25em] text-emerald-500 uppercase">
            SELECTOROS • BILLING
          </p>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
            <div>
              <h1 className="text-2xl md:text-3xl font-semibold text-slate-900">
                Your billing &amp; plan
              </h1>
              <p className="mt-1 text-sm text-slate-500 max-w-xl">
                Manage subscription, invoices and plan for{" "}
                <span className="font-semibold text-emerald-600">
                  {restaurant.name}
                </span>
                .
              </p>
            </div>
            <div className="text-xs text-slate-500 md:text-right">
              <p>
                Current plan:{" "}
                <span className="font-semibold text-slate-900">
                  {currentPlanLabel}
                </span>
              </p>
              <p>
                Status:{" "}
                <span className="font-semibold text-slate-900">
                  {restaurant.stripe_subscription_status || "n/a"}
                </span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CURRENT PLAN SUMMARY – light card, no dark block */}
      <section className="mb-8">
        <div className="rounded-3xl border border-slate-200/70 bg-white/85 shadow-[0_18px_60px_rgba(15,23,42,0.12)] backdrop-blur-xl px-6 py-5 md:px-8 md:py-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-medium text-emerald-700">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Current plan
            </div>
            <p className="text-xl font-semibold text-slate-900">
              {currentPlanLabel}
            </p>
            <p className="text-sm text-slate-500 max-w-xl">
              {currentPlanDescription}
            </p>

            <div className="mt-3 text-[11px] text-slate-500 space-y-1">
              <p className="flex flex-wrap gap-1">
                <span className="font-medium text-slate-700">Status:</span>
                <span>{restaurant.stripe_subscription_status || "n/a"}</span>
              </p>
              <p className="flex flex-wrap gap-1 break-all">
                <span className="font-medium text-slate-700">Customer ID:</span>
                <span className="font-mono">
                  {restaurant.stripe_customer_id || "—"}
                </span>
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 md:items-end">
            {isPro ? (
              <>
                <button
                  type="button"
                  onClick={handleManageSubscription}
                  disabled={loadingPortal}
                  className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-400 disabled:opacity-50 transition"
                >
                  {loadingPortal ? "Opening portal…" : "Manage subscription"}
                </button>
                <p className="text-[11px] text-slate-500 max-w-xs md:text-right">
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
                  className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-6 py-2 text-sm font-semibold text-white hover:bg-emerald-400 disabled:opacity-50 transition"
                >
                  {loadingUpgrade ? "Redirecting…" : "Upgrade to Pro"}
                </button>
                <p className="text-[11px] text-slate-500 max-w-xs md:text-right">
                  You&apos;ll be redirected to a secure Stripe checkout. Your
                  plan will update automatically after payment.
                </p>
              </>
            )}
          </div>
        </div>
      </section>

      {/* PLAN COMPARISON – same glass/light style as dashboard cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Starter */}
        <div className="rounded-3xl border border-slate-200/70 bg-white/85 shadow-[0_18px_60px_rgba(15,23,42,0.10)] backdrop-blur-xl p-6 flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Starter</h2>
              <p className="text-xs text-slate-500 mt-1">
                Ideal for testing SelectorOS with one restaurant.
              </p>
            </div>
            <p className="text-sm font-semibold text-slate-900">€0 / month</p>
          </div>

          <ul className="mt-2 text-xs text-slate-600 space-y-1">
            <li>• 1 restaurant workspace</li>
            <li>• Allergen editor &amp; live staff view</li>
            <li>• Basic theme controls</li>
          </ul>

          {!isPro && (
            <span className="mt-3 inline-flex self-start rounded-full border border-slate-300/80 bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-700">
              This is your current plan
            </span>
          )}
        </div>

        {/* Pro */}
        <div className="rounded-3xl border border-emerald-300/80 bg-emerald-50/80 shadow-[0_18px_60px_rgba(16,185,129,0.25)] backdrop-blur-xl p-6 flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-emerald-900">Pro</h2>
              <p className="text-xs text-emerald-800 mt-1">
                Designed for live restaurant service with full control.
              </p>
            </div>
            <p className="text-sm font-semibold text-emerald-900">
              €49.99 / month
            </p>
          </div>

          <ul className="mt-2 text-xs text-emerald-900/90 space-y-1">
            <li>• Everything in Starter</li>
            <li>• Unlimited dishes &amp; menus</li>
            <li>• Stripe-powered billing &amp; invoices</li>
          </ul>

          {isPro ? (
            <span className="mt-3 inline-flex self-start rounded-full border border-emerald-400 bg-emerald-100 px-3 py-1 text-[11px] font-medium text-emerald-900">
              This is your current plan
            </span>
          ) : (
            <button
              type="button"
              onClick={handleUpgrade}
              disabled={loadingUpgrade}
              className="mt-3 inline-flex items-center justify-center rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-400 disabled:opacity-50 transition"
            >
              {loadingUpgrade ? "Redirecting…" : "Upgrade to Pro"}
            </button>
          )}
        </div>
      </section>

      {error && (
        <p className="mt-4 text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
          {error}
        </p>
      )}

      <p className="mt-4 text-[11px] text-slate-500">
        All payments are processed securely by Stripe. You can cancel anytime in
        the customer portal.
      </p>
    </div>
  );
}
