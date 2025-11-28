"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function BillingPage() {
  const supabase = createClientComponentClient();

  const [user, setUser] = useState(null);
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    loadBilling();
  }, []);

  async function loadBilling() {
    try {
      setLoading(true);
      setError(null);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) {
        setError("You must be signed in to see billing.");
        setLoading(false);
        return;
      }

      setUser(user);

      const { data: restaurantData, error: restaurantError } = await supabase
        .from("restaurants")
        .select("*")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (restaurantError) throw restaurantError;

      setRestaurant(restaurantData);
    } catch (err) {
      console.error("Billing load error:", err);
      setError(err.message || "Failed to load billing information.");
    } finally {
      setLoading(false);
    }
  }

  async function openStripePortal() {
    try {
      setPortalLoading(true);
      setError(null);

      const res = await fetch("/api/create-portal", {
        method: "POST",
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.url) {
        throw new Error(json.error || "Failed to open Stripe billing portal.");
      }

      // Redirect to Stripe portal
      window.location.href = json.url;
    } catch (err) {
      console.error("Billing portal error (client):", err);
      setError(err.message || "Could not open Stripe billing portal.");
      setPortalLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh] text-slate-300 text-sm">
        Loading billing details…
      </div>
    );
  }

  const currentPlan =
    restaurant?.subscription_plan && restaurant.subscription_plan !== ""
      ? restaurant.subscription_plan
      : "free";

  const isFree = currentPlan === "free";

  return (
    <div className="space-y-8 max-w-4xl text-slate-100">
      {/* ERROR */}
      {error && (
        <div className="rounded-2xl border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* HEADER */}
      <section className="bg-slate-950/80 shadow-[0_24px_60px_rgba(0,0,0,0.7)] border border-white/10 rounded-2xl p-8 space-y-3">
        <h1 className="text-3xl font-bold">Billing</h1>
        <p className="text-slate-400">
          Manage your subscription and payment details.
        </p>

        {restaurant?.name && (
          <p className="text-sm text-slate-400">
            Restaurant:{" "}
            <span className="font-semibold text-slate-100">
              {restaurant.name}
            </span>
          </p>
        )}
      </section>

      {/* CURRENT PLAN */}
      <section className="bg-slate-950/80 border border-white/10 rounded-2xl p-8 shadow-[0_18px_45px_rgba(0,0,0,0.55)] space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-slate-400">
              Current plan
            </p>
            <p className="mt-1 text-2xl font-bold capitalize">
              {currentPlan}
            </p>
            <p className="mt-2 text-sm text-slate-400 max-w-md">
              {isFree
                ? "You are currently on the Free plan. Upgrade to unlock multiple restaurants, more menu slots, and advanced analytics."
                : "Your subscription is active. You can manage payment methods and invoices via the Stripe billing portal."}
            </p>
          </div>

          <div className="flex flex-col items-start md:items-end gap-3">
            <p className="text-xs text-slate-400">Billing owner</p>
            <p className="text-sm font-semibold">
              {user?.email ?? "Unknown email"}
            </p>

            <button
              type="button"
              onClick={openStripePortal}
              disabled={portalLoading}
              className={`
                inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold
                ${
                  portalLoading
                    ? "bg-emerald-900/70 text-emerald-200 cursor-wait"
                    : "bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                }
                transition disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              {portalLoading ? "Opening portal…" : "Manage / Upgrade plan"}
            </button>
          </div>
        </div>

        <div className="grid gap-4 text-xs text-slate-400 md:grid-cols-3">
          <div>
            <p className="font-semibold text-slate-200">Status</p>
            <p className="mt-1">{isFree ? "Trial / Free" : "Active"}</p>
          </div>
          <div>
            <p className="font-semibold text-slate-200">Seats</p>
            <p className="mt-1">
              {restaurant?.seats ?? 1} staff access (configurable later)
            </p>
          </div>
          <div>
            <p className="font-semibold text-slate-200">Next invoice</p>
            <p className="mt-1">
              {isFree ? "None – on Free plan" : "Managed in Stripe portal"}
            </p>
          </div>
        </div>
      </section>

      {/* INVOICE HISTORY – placeholder for now */}
      <section className="bg-slate-950/80 border border-white/10 rounded-2xl p-8 shadow-[0_18px_45px_rgba(0,0,0,0.55)]">
        <h2 className="text-xl font-semibold mb-4">Invoice History</h2>

        <table className="w-full text-sm">
          <thead>
            <tr className="text-slate-400 border-b border-white/10">
              <th className="py-2 text-left">Date</th>
              <th className="py-2 text-left">Invoice ID</th>
              <th className="py-2 text-left">Amount</th>
              <th className="py-2 text-right">Status</th>
            </tr>
          </thead>

          <tbody>
            <tr className="border-b border-white/5">
              <td className="py-2 text-slate-400">—</td>
              <td className="py-2 text-slate-400">—</td>
              <td className="py-2 text-slate-400">—</td>
              <td className="py-2 text-right text-slate-400">—</td>
            </tr>
            <tr>
              <td colSpan={4} className="py-4 text-xs text-slate-500">
                Stripe invoice history will appear here once webhooks are
                connected.
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  );
}
