"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function DashboardHome() {
  const supabase = createClientComponentClient();
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRestaurant();
  }, []);

  const loadRestaurant = async () => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setRestaurant(null);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("restaurants")
      .select("*")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (error) {
      console.error(error);
    }

    setRestaurant(data);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="text-gray-500 text-lg">Loading dashboard…</div>
    );
  }

  return (
    <div className="max-w-3xl">

      <h1 className="text-3xl font-bold mb-6">
        Dashboard Overview
      </h1>

      {restaurant ? (
        <div className="bg-white shadow-sm border rounded-xl p-6 space-y-3">

          <h2 className="text-xl font-semibold">
            {restaurant.name}
          </h2>

          <p className="text-sm text-gray-600">
            Restaurant ID: <span className="font-mono">{restaurant.id}</span>
          </p>

          <p className="text-sm text-gray-600">
            Created at:{" "}
            {restaurant.created_at
              ? new Date(restaurant.created_at).toLocaleString()
              : "Unknown"}
          </p>

        </div>
      ) : (
        <p className="text-red-600 text-lg">
          No restaurant found for this user.
        </p>
      )}

      <p className="mt-6 text-gray-500">
        Use the sidebar to manage menus, dishes, allergens, and account settings.
      </p>

    </div>
  );
}
