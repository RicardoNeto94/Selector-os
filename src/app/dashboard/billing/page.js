"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function BillingPage() {
  const supabase = createClientComponentClient();
  
  const [user, setUser] = useState(null);
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBilling();
  }, []);

  async function loadBilling() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setUser(user);

    if (!user) return;

    const { data: r } = await supabase
      .from("restaurants")
      .select("*")
      .eq("owner_id", user.id)
      .maybeSingle();

    setRestaurant(r);
    setLoading(false);
  }

  if (loading) {
    return <p className="text-gray-400">Loading billing details…</p>;
  }

  return (
    <div className="space-y-12 max-w-4xl">

      {/* HEADER */}
      <div className="bg-white shadow-sm border rounded-2xl p-8">
        <h1 className="text-3xl font-bold">Billing</h1>
        <p className="text-gray-500 mt-1">
          Manage your subscription and payment details.
        </p>
      </div>

      {/* SUBSCRIPTION STATUS */}
      <div className="bg-white border rounded-2xl shadow-sm p-8 space-y-6">
        <h2 className="text-xl font-semibold">Subscription</h2>

        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-800">Current Plan</p>
            <p className="text-gray-500 text-sm">
              Free Tier — Limited features
            </p>
          </div>

          <UpgradeButton />
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
            <p>No card on file</p>
            <p className="text-sm text-gray-400">
              Add a card to enable subscriptions.
            </p>
          </div>

          <button className="
            px-5 py-2 
            bg-gray-200 text-gray-700 
            rounded-xl hover:bg-gray-300 
            transition
          ">
            Add Card
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
            {/* Temporary mock data */}
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
        <h2 className="text-xl font-semibold mb-2">Stripe Integration Coming Soon</h2>
        <p className="text-gray-500">
          You’ll be able to manage billing fully inside the dashboard: plan upgrades, 
          invoices, receipts, and automatic payments.
        </p>
      </div>
    </div>
  );
}

/* Upgrade Button */
function UpgradeButton() {
  return (
    <button
      className="
        px-6 py-3 
        bg-green-500 text-white 
        rounded-xl 
        font-semibold 
        hover:bg-green-600 
        transition
      "
      onClick={() => alert('Stripe checkout will be implemented here.')}
    >
      Upgrade Plan
    </button>
  );
}
