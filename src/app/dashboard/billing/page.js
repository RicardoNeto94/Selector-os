// src/app/dashboard/billing/page.js

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";

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

  // 2) Load this user's restaurant (only to show the name)
  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("*")
    .eq("owner_id", user.id)
    .maybeSingle();

  return (
    <main className="page-fade px-6 py-10 text-slate-900">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* HEADER */}
        <header className="rounded-3xl bg-white/75 backdrop-blur-2xl shadow-[0_24px_80px_rgba(15,23,42,0.35)] border border-white/60 px-6 py-5 md:px-8 md:py-6">
          <p className="text-xs uppercase tracking-[0.25em] text-emerald-500/80 mb-1">
            SELECTOROS • BILLING
          </p>
          <h1 className="text-2xl md:text-3xl font-semibold text-slate-900">
            Plans &amp; billing
          </h1>
          <p className="mt-2 text-sm text-slate-500 max-w-xl">
            Stripe billing is not live yet.{" "}
            <span className="font-medium">All workspaces are currently in free beta</span>{" "}
            while we build out subscription logic. Your restaurant will not be
            charged.
          </p>
          {restaurant && (
            <p className="mt-2 text-xs text-slate-400">
              Current workspace:{" "}
              <span className="font-semibold text-slate-600">
                {restaurant.name}
              </span>
            </p>
          )}
        </header>

        {/* PLANS GRID */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
          {/* Starter – current / free beta */}
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

          {/* Pro – coming soon */}
          <PlanCard
            name="Pro"
            badge="Coming soon"
            price="€39 / month (est.)"
            description="For growing groups that want more control and tools for staff training."
            features={[
              "Up to 5 workspaces",
              "Role-based staff access",
              "Advanced analytics",
              "Priority support",
            ]}
            primaryLabel="Upgrade to Pro"
            primaryDisabled
          />

          {/* Enterprise – coming soon */}
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
            primaryLabel="Talk to us"
            primaryDisabled
          />
        </section>

        {/* INFO / CONTACT CARD */}
        <section className="rounded-3xl bg-slate-900/90 backdrop-blur-2xl border border-white/10 shadow-[0_26px_80px_rgba(15,23,42,0.75)] px-6 py-5 md:px-8 md:py-6 text-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-300/80">
              Early access
            </p>
            <h2 className="mt-1 text-lg font-semibold">
              Need multi-site or chain pricing?
            </h2>
            <p className="mt-1 text-sm text-slate-300/90 max-w-xl">
              We&apos;re shaping SelectorOS pricing with our first partners.
              If you run multiple restaurants or a hotel group, reach out and
              we&apos;ll set up a tailored plan.
            </p>
          </div>

          <a
            href="mailto:hello@selectoros.app?subject=SelectorOS%20billing"
            className="inline-flex items-center justify-center rounded-full bg-emerald-400 px-6 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-300 transition shadow-[0_14px_40px_rgba(45,212,191,0.45)]"
          >
            Email the team
          </a>
        </section>
      </div>
    </main>
  );
}

/**
 * Simple presentational card component for plans.
 * This is local to this file.
 */
function PlanCard({
  name,
  badge,
  badgeTone = "neutral",
  price,
  description,
  features = [],
  primaryLabel,
  primaryDisabled = false,
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
          <span className={`px-2.5 py-1 rounded-full text-[11px] border ${badgeClasses}`}>
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
          disabled={primaryDisabled}
          className="w-full inline-flex items-center justify-center rounded-full px-4 py-2 text-xs font-semibold border border-slate-200 bg-slate-900/5 text-slate-500 disabled:text-slate-400 disabled:bg-slate-100 hover:bg-slate-900/10 transition"
        >
          {primaryLabel}
        </button>
        {primaryDisabled && (
          <p className="mt-1 text-[11px] text-slate-400 text-center">
            Stripe subscriptions will unlock this soon.
          </p>
        )}
      </div>
    </div>
  );
}
