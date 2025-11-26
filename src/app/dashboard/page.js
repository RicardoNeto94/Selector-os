"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function OnboardingPage() {
  const [restaurant, setRestaurant] = useState(null);
  const [error, setError] = useState(null);
  const supabase = createClientComponentClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("Not authenticated");
        return;
      }

      const { data, error } = await supabase
        .from("restaurants")
        .select("*")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (error || !data) {
        setError("Restaurant not found");
      } else {
        setRestaurant(data);
      }
    }

    load();
  }, []);

  return (
    <main className="p-12 text-center">
      <h1 className="text-4xl font-bold mb-8">
        Selector<span className="text-green-500">OS</span> Onboarding
      </h1>

      {error && (
        <div className="text-red-500 text-xl mb-6">
          Error: {error}
        </div>
      )}

      {restaurant && (
        <>
          <p className="text-lg mb-6">
            Welcome! Your restaurant is ready:
          </p>

          <h2 className="text-2xl font-semibold mb-10">
            {restaurant.name}
          </h2>

          <Link href="/dashboard">
            <button className="px-8 py-3 bg-green-500 text-white rounded-full text-lg hover:bg-green-600 transition">
              Continue to dashboard
            </button>
          </Link>
        </>
      )}
    </main>
  );
}
