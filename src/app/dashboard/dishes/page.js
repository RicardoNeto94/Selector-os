"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function DishesPage() {
  const supabase = createClientComponentClient();

  const [restaurant, setRestaurant] = useState(null);
  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDishes();
  }, []);

  async function loadDishes() {
    setLoading(true);

    // Get logged in user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get restaurant
    const { data: r } = await supabase
      .from("restaurants")
      .select("*")
      .eq("owner_id", user.id)
      .maybeSingle();

    setRestaurant(r);

    // Get dishes
    const { data: d } = await supabase
      .from("dishes")
      .select("*, allergens ( allergen_code )")
      .eq("restaurant_id", r.id)
      .order("created_at", { ascending: false });

    setDishes(d || []);
    setLoading(false);
  }

  if (loading) {
    return <p className="text-gray-400">Loading dishes…</p>;
  }

  return (
    <div className="space-y-10">

      {/* HEADER */}
      <div className="bg-white shadow-sm border rounded-2xl p-8">
        <h1 className="text-3xl font-bold">Dishes</h1>
        <p className="text-gray-500 mt-1">
          Manage your dishes, allergens, and descriptions.
        </p>

        <button
          className="
            mt-6 px-5 py-3 
            bg-green-500 text-white 
            rounded-xl 
            hover:bg-green-600 transition font-semibold
          "
        >
          + Add Dish
        </button>
      </div>

      {/* DISH LIST */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">

        {dishes.map((dish) => (
          <div
  key={dish.id}
  className="
    bg-slate-950/70 border border-white/10 rounded-2xl
    p-6 shadow-[0_18px_45px_rgba(0,0,0,0.55)]
    hover:border-emerald-400/40 hover:-translate-y-0.5
    transition cursor-pointer
  "
>
            {/* Dish header */}
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">{dish.name}</h2>

              <Link
                href={`/dashboard/dishes/${dish.id}`}
                className="text-green-600 text-sm font-semibold hover:underline"
              >
                Edit →
              </Link>
            </div>

            {/* Allergens */}
            <div className="mt-4 flex flex-wrap gap-2">
              {dish.allergens && dish.allergens.length > 0 ? (
                dish.allergens.map((a) => (
                  <span
                    key={a.allergen_code}
                    className="px-3 py-1 text-xs bg-gray-100 rounded-full"
                  >
                    {a.allergen_code}
                  </span>
                ))
              ) : (
                <span className="text-gray-400 text-sm">
                  No allergens assigned
                </span>
              )}
            </div>

            {/* Footer */}
            <p className="text-gray-400 text-xs mt-4">
              Created {new Date(dish.created_at).toLocaleString()}
            </p>
          </div>
        ))}

        {/* EMPTY STATE */}
        {dishes.length === 0 && (
          <div className="col-span-full text-center text-gray-500 py-20">
            <p className="text-lg mb-4">No dishes yet.</p>
            <p className="text-sm">Add your first dish to get started.</p>
          </div>
        )}

      </div>
    </div>
  );
}
