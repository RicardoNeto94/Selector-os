"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

export default function BillingClient({ hasStripeCustomer }) {
  const searchParams = useSearchParams();
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [error, setError] = useState("");

  const success = searchParams.get("success");
  const canceled = searchParams.get("canceled");

  async function startCheckout() {
    try {
      setError("");
      setLoadingCheckout(true);
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Failed to start checkout");
      }
      window.location.href = data.url;
    } catch (err) {
      console.error(err);
      setError(err.message || "Could not start checkout.");
      setLoadingCheckout(false);
    }
  }

  async function openPortal() {
    try {
      setError("");
      setLoadingPortal(true);
      const res = await fetch("/api/billing/portal", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Failed to open billing portal");
      }
      window.location.href = data.url;
    } catch (err) {
      console.error(err);
      setError(err.message || "Could not open billing portal.");
      setLoadingPortal(false);
    }
  }

  return (
    <>
      {/* PLANS GRID */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
        {/* Starter – always current, disabled */}
        <PlanCard
          name="Starter"
          badge="Current plan"
          badgeTone="success"
          price="Free during beta"
          description="For single restaurants getting started with live allergen visibility."
          features={[
            "1 live workspace",
            "Unlimited dishes & allergens",
            "Guest & staff allergen views",
            "Email support",
          ]}
          primaryLabel="Current plan"
          primaryDisabled
        />

        {/* Pro – this is the important one */}
        <PlanCard
          name="Pro"
          badge={hasStripeCustomer ? "Active in Stripe" : "Test mode"}
          price="€39 / month"
          description="For growing groups that want more control and tools for staff training."
          features={[
            "Up to 5 workspaces",
            "Role-based staff access",
            "Advanced analytics (coming)",
            "Priority support",
          ]}
          primaryLabel={
            hasStripeCustomer ? "Manage subscription" : "Upgrade to Pro"
          }
          onPrimaryClick={hasStripeCustomer ? openPortal : startCheckout}
          primaryLoading={hasStripeCustomer ? loadingPortal : loadingCheckout}
          primaryDisabled={false} // explicitly enabled
        />

        {/* Enterprise – placeholder, disabled */}
        <PlanCard
          name="Enterprise"
          badge="Coming soon"
          price="Let’s talk"
          description="For hotel groups and multi-country operations that need custom rollouts."
          features={[
            "Unlimited workspaces",
            "Custom onboarding & training",
            "SSO & security reviews",
            "Dedicated account partner",
          ]}
          primaryLabel="Contact us"
          primaryDisabled
        />
      </section>

      {/* STATUS / ERROR */}
      <section className="mt-4 text-sm">
        {success && (
          <p className="text-emerald-600 text-xs">
            ✅ Checkout completed in test mode. Subscription details are visible
            in Stripe.
          </p>
        )}
        {canceled && (
          <p className="text-amber-600 text-xs">
            Checkout canceled. You can try again any time.
          </p>
        )}
        {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
      </section>
    </>
  );
}

function PlanCard({
  name,
  badge,
  badgeTone = "neutral",
  price,
  description,
  features = [],
  primaryLabel,
  primaryDisabled = false,
  primaryLoading = false,
  onPrimaryClick,
}) {
  const badgeClasses =
    badgeTone === "success"
      ? "bg-emerald-500/10 text-emerald-600 border-emerald-400/60"
      : "bg-slate-100/60 text-slate-500 border-slate-200/80";

  return (
    <div className="rounded-3xl bg-white/80 backdrop-blur-2xl border border-white/70 shadow-[0_22px_70px_rgba(15,23,42,0.25)] px-5 py-5 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-slate-900">{name}</h2>
        {badge && (
          <span
            className={`px-2.5 py-1 rounded-full text-[11px] border ${badgeClasses}`}
          >
            {badge}
          </span>
        )}
      </div>

      <p className="text-sm font-semibold text-slate-800">{price}</p>
      <p className="text-xs text-slate-500">{description}</p>

      <ul className="mt-2 space-y-1.5 text-xs text-slate-500">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <span className="mt-[3px] h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <div className="mt-4">
        <button
          type="button"
          onClick={onPrimaryClick}
          disabled={primaryDisabled || primaryLoading}
          className="w-full inline-flex items-center justify-center rounded-full px-4 py-2 text-xs font-semibold border border-slate-200 bg-slate-900/5 text-slate-600 disabled:text-slate-400 disabled:bg-slate-100 hover:bg-slate-900/10 transition"
        >
          {primaryLoading ? "Redirecting…" : primaryLabel}
        </button>
      </div>
    </div>
  );
}
