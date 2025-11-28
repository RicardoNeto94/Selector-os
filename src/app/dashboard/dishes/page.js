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

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    // Get restaurant for this owner
    const { data: r } = await supabase
      .from("restaurants")
      .select("*")
      .eq("owner_id", user.id)
      .maybeSingle();

    setRestaurant(r);

    // Get dishes for that restaurant
    const { data: d } = await supabase
      .from("dishes")
      .select("*, allergens ( allergen_code )")
      .eq("restaurant_id", r.id)
      .order("created_at", { ascending: false });

    setDishes(d || []);
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh] text-slate-300 text-sm">
        Loading dishes…
      </div>
    );
  }

  return (
    <div className="space-y-10 text-slate-100">
      {/* HEADER */}
      <div className="bg-slate-950/80 border border-white/10 rounded-2xl p-8 shadow-[0_24px_60px_rgba(0,0,0,0.7)]">
        <h1 className="text-3xl font-bold text-slate-50">Dishes</h1>
        <p className="text-slate-400 mt-1">
          Manage your dishes, allergens, and descriptions.
        </p>

        <button className="mt-6 inline-flex items-center gap-2 px-5 py-3 bg-emerald-500 text-slate-950 rounded-xl hover:bg-emerald-400 transition font-semibold">
          + Add Dish
        </button>
      </div>

      {/* DISH LIST */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {dishes.map((dish) => (
          <div
            key={dish.id}
            className="bg-slate-950/70 border border-white/10 rounded-2xl p-6 shadow-[0_18px_45px_rgba(0,0,0,0.55)] hover:border-emerald-400/40 hover:-translate-y-0.5 transition cursor-pointer"
          >
            {/* Dish header */}
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">{dish.name}</h2>

              <Link
                href={`/dashboard/dishes/${dish.id}`}
                className="text-emerald-400 text-sm font-semibold hover:underline"
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
                    className="px-3 py-1 text-xs rounded-full bg-slate-800/80 text-slate-100"
                  >
                    {a.allergen_code}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-500">
                  No allergens linked yet.
                </span>
              )}
            </div>

            {/* Created date */}
            <p className="mt-4 text-xs text-slate-500">
              Created:{" "}
              {dish.created_at
                ? new Date(dish.created_at).toLocaleString()
                : "—"}
            </p>
          </div>
        ))}

        {/* EMPTY STATE */}
        {dishes.length === 0 && (
          <div className="col-span-full text-center text-slate-400 py-20">
            <p className="text-lg mb-2">No dishes yet.</p>
            <p className="text-sm">
              Start by adding your first dish to this restaurant.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
