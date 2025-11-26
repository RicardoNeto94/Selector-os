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
  const [portalUrl, setPortalUrl] = useState(null);

  useEffect(() => {
    loadBilling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadBilling() {
    setLoading(true);
    setError(null);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.error(userError);
      setError("Unable to load user.");
      setLoading(false);
      return;
    }

    setUser(user);

    if (!user) {
      setError("You must be logged in to view billing.");
      setLoading(false);
      return;
    }

    // 👇 Load the restaurant owned by this user
    const { data: r, error: restaurantError } = await supabase
      .from("restaurants")
      .select("id, name, subscription_plan, stripe_customer_id")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (restaurantError) {
      console.error(restaurantError);
      setError("Unable to load restaurant billing details.");
    }

    setRestaurant(r);
    setLoading(false);
  }

  async function handleOpenPortal() {
  setError(null);
  setPortalLoading(true);

  try {
    const res = await fetch("/api/create-portal", {
      method: "POST",
    });

    let json = null;
    try {
      json = await res.json();
    } catch (_) {
      // ignore JSON parse errors
    }

    if (!res.ok) {
      const msg =
        json?.error ||
        `Failed to create billing portal session (status ${res.status})`;
      throw new Error(msg);
    }

    if (!json?.url) {
      throw new Error("No portal URL returned from server.");
    }

    setPortalUrl(json.url);

    // redirect immediately
    window.location.href = json.url;
  } catch (err) {
    console.error("Billing portal error (client):", err);
    setError(err.message || "Could not open Stripe billing portal.");
  } finally {
    setPortalLoading(false);
  }
}


  if (loading) {
    return <p className="text-gray-400">Loading billing details…</p>;
  }

  const currentPlan =
    restaurant?.subscription_plan && restaurant.subscription_plan !== ""
      ? restaurant.subscription_plan
      : "free";

  return (
    <div className="space-y-12 max-w-4xl">
      {/* HEADER */}
      <div className="bg-white shadow-sm border rounded-2xl p-8">
        <h1 className="text-3xl font-bold">Billing</h1>
        <p className="text-gray-500 mt-1">
          Manage your subscription and payment details.
        </p>
        {restaurant?.name && (
          <p className="text-gray-400 text-sm mt-2">
            Restaurant: <span className="font-medium">{restaurant.name}</span>
          </p>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4">
          {error}
        </div>
      )}

      {/* SUBSCRIPTION STATUS */}
      <div className="bg-white border rounded-2xl shadow-sm p-8 space-y-6">
        <h2 className="text-xl font-semibold">Subscription</h2>

        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-medium text-gray-800">Current Plan</p>
            <p className="text-gray-500 text-sm capitalize">
              {currentPlan} plan
            </p>
          </div>

          {/* 🔧 changed disabled condition here */}
          <UpgradeButton
            disabled={portalLoading}
            loading={portalLoading}
            onClick={handleOpenPortal}
          />
        </div>

        {/* Premium perks preview */}
        <ul className="mt-4 space-y-2 text-gray-600 text-sm">
          <li>✔ Unlimited dishes</li>
          <li>✔ Unlimited allergens</li>
          <li>✔ Branding customisation</li>
          <li>✔ Priority support</li>
          <li className="line-through text-gray-300">AI Menu Builder</li>
          <li className="line-through text-gray-300">Custom domains</li>
        </ul>
      </div>

      {/* PAYMENT METHOD */}
      <div className="bg-white border rounded-2xl shadow-sm p-8 space-y-6">
        <h2 className="text-xl font-semibold">Payment Method</h2>

        <div className="flex items-center justify-between">
          <div className="text-gray-600">
            {restaurant?.stripe_customer_id ? (
              <>
                <p>Managed via Stripe customer portal</p>
                <p className="text-sm text-gray-400">
                  Use &quot;Manage subscription&quot; to update card details.
                </p>
              </>
            ) : (
              <>
                <p>No card on file</p>
                <p className="text-sm text-gray-400">
                  Card will be added when you complete checkout.
                </p>
              </>
            )}
          </div>

          <button
            className="
              px-5 py-2 
              bg-gray-200 text-gray-700 
              rounded-xl hover:bg-gray-300 
              transition
            "
            disabled
          >
            Add Card (via Stripe)
          </button>
        </div>
      </div>

      {/* INVOICE HISTORY */}
      <div className="bg-white border rounded-2xl shadow-sm p-8">
        <h2 className="text-xl font-semibold mb-4">Invoice History</h2>

        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400 border-b">
              <th className="py-2 text-left">Date</th>
              <th className="py-2 text-left">Invoice ID</th>
              <th className="py-2 text-left">Amount</th>
              <th className="py-2 text-right">Status</th>
            </tr>
          </thead>

          <tbody>
            {/* Still placeholder – we’ll hook this to Stripe webhooks later */}
            <tr className="border-b">
              <td className="py-3">—</td>
              <td className="py-3">No invoices</td>
              <td className="py-3">—</td>
              <td className="py-3 text-right">—</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* COMING SOON */}
      <div className="bg-white border rounded-2xl shadow-sm p-8 opacity-60">
        <h2 className="text-xl font-semibold mb-2">
          Stripe Integration Coming Soon
        </h2>
        <p className="text-gray-500">
          You’ll be able to manage billing fully inside the dashboard: plan
          upgrades, invoices, receipts, and automatic payments.
        </p>
        {portalUrl && (
          <p className="text-xs text-gray-400 mt-2 break-all">
            Last portal URL: {portalUrl}
          </p>
        )}
      </div>
    </div>
  );
}

/* Upgrade Button */
function UpgradeButton({ disabled, loading, onClick }) {
  return (
    <button
      className={`
        px-6 py-3 
        bg-green-500 text-white 
        rounded-xl 
        font-semibold 
        hover:bg-green-600 
        transition
        disabled:opacity-50 disabled:cursor-not-allowed
      `}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {loading ? "Opening…" : "Manage / Upgrade Plan"}
    </button>
  );
}
