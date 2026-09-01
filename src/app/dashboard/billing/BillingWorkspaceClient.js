"use client";

import { useState } from "react";
import { PLAN_CATALOG } from "@/lib/billing/catalog";

const OFFERED_PLANS = ["starter", "professional", "hospitality_suite"];
const MODULE_LABELS = {
  wine: "Wine operations",
  dining: "Dining experiences",
  spa: "Spa experiences",
  guest_experience: "Branded guest journeys",
};

export default function BillingWorkspaceClient({ organization, settings, entitlements }) {
  const [loading, setLoading] = useState("");
  const [error, setError] = useState("");
  const managed = entitlements.billingMode === "platform_managed";

  async function openCheckout(plan) {
    try {
      setError("");
      setLoading(plan);
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.url) throw new Error(body.error || "Checkout could not be started.");
      window.location.assign(body.url);
    } catch (checkoutError) {
      setError(checkoutError.message || "Checkout could not be started.");
      setLoading("");
    }
  }

  async function openPortal() {
    try {
      setError("");
      setLoading("portal");
      const response = await fetch("/api/billing/portal", { method: "POST" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.url) throw new Error(body.error || "Billing portal could not be opened.");
      window.location.assign(body.url);
    } catch (portalError) {
      setError(portalError.message || "Billing portal could not be opened.");
      setLoading("");
    }
  }

  return (
    <div className="page-fade px-4 py-8 md:px-6 md:py-10">
      <header className="rounded-[2rem] border border-white/80 bg-white/75 px-6 py-7 shadow-[0_24px_70px_rgba(34,54,48,.10)] backdrop-blur-xl md:px-9">
        <p className="text-[11px] font-semibold uppercase tracking-[.28em] text-[#6b877f]">Workspace · billing</p>
        <div className="mt-3 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-[-.04em] text-[#173a32] md:text-5xl">Plan and modules</h1>
            <p className="mt-2 max-w-2xl text-sm text-[#6f817c]">
              Control the Vaxeron capabilities available to {organization.name}. Billing belongs to this workspace—not to an individual venue.
            </p>
          </div>
          <div className="rounded-2xl border border-[#dce7e2] bg-[#f6faf8] px-5 py-3 text-sm text-[#47655d]">
            <span className="block text-[10px] font-semibold uppercase tracking-[.2em] text-[#88a099]">Current plan</span>
            <strong className="mt-1 block text-lg text-[#173a32]">{entitlements.planDefinition.name}</strong>
            <span>{managed ? "Managed by Vaxeron" : entitlements.billingStatus.replaceAll("_", " ")}</span>
          </div>
        </div>
      </header>

      <section className="mt-6 grid gap-4 lg:grid-cols-3">
        {OFFERED_PLANS.map((planKey) => {
          const plan = PLAN_CATALOG[planKey];
          const current = entitlements.plan === planKey;
          return (
            <article key={planKey} className={`flex min-h-[330px] flex-col rounded-[1.75rem] border p-6 shadow-[0_18px_55px_rgba(34,54,48,.08)] ${current ? "border-[#6d9789] bg-[#edf6f2]" : "border-white/80 bg-white/75"}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[.22em] text-[#789087]">{plan.name}</p>
                  <p className="mt-3 text-3xl font-semibold text-[#173a32]">€{plan.monthlyPrice}<span className="text-sm font-normal text-[#80918c]"> / month</span></p>
                </div>
                {current && <span className="rounded-full bg-[#173a32] px-3 py-1 text-[10px] font-semibold uppercase tracking-[.14em] text-white">Current</span>}
              </div>
              <p className="mt-4 text-sm leading-6 text-[#6f817c]">{plan.description}</p>
              <ul className="mt-5 space-y-2 text-sm text-[#49645d]">
                {Object.entries(plan.modules).filter(([, enabled]) => enabled).map(([module]) => (
                  <li key={module} className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[#6aa98f]" />{MODULE_LABELS[module]}</li>
                ))}
              </ul>
              <div className="mt-auto pt-6">
                {!current && !managed && (
                  <button type="button" onClick={() => openCheckout(planKey)} disabled={Boolean(loading)} className="w-full rounded-full bg-[#173a32] px-5 py-3 text-xs font-semibold uppercase tracking-[.15em] text-white transition hover:bg-[#245448] disabled:opacity-50">
                    {loading === planKey ? "Opening checkout…" : `Choose ${plan.name}`}
                  </button>
                )}
                {!current && managed && <p className="text-xs leading-5 text-[#7b8d87]">Contact Vaxeron to change this managed workspace plan.</p>}
              </div>
            </article>
          );
        })}
      </section>

      <section className="mt-6 flex flex-col gap-4 rounded-[1.75rem] border border-white/80 bg-white/75 p-6 shadow-[0_18px_55px_rgba(34,54,48,.08)] md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#173a32]">Invoices and payment method</h2>
          <p className="mt-1 text-sm text-[#758781]">
            {managed ? "This account is invoiced or managed directly by Vaxeron." : "Stripe securely manages invoices, cards, cancellation and tax receipts."}
          </p>
          {settings.current_period_end && <p className="mt-2 text-xs text-[#8b9a95]">Current period ends {new Date(settings.current_period_end).toLocaleDateString()}.</p>}
        </div>
        {!managed && settings.stripe_customer_id && (
          <button type="button" onClick={openPortal} disabled={Boolean(loading)} className="rounded-full border border-[#cfded8] bg-white px-6 py-3 text-xs font-semibold uppercase tracking-[.14em] text-[#244a40] hover:bg-[#f3f8f6] disabled:opacity-50">
            {loading === "portal" ? "Opening…" : "Open secure billing portal"}
          </button>
        )}
      </section>

      {error && <p className="mt-4 rounded-2xl border border-[#e8c4b8] bg-[#fff4ef] px-4 py-3 text-sm text-[#a74d36]">{error}</p>}
      <p className="mt-4 text-xs text-[#879690]">Enterprise and multi-property agreements are configured by Vaxeron after a commercial review.</p>
    </div>
  );
}
