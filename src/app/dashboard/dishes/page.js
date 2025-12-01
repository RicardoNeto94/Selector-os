"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function DishesPage() {
  const supabase = createClientComponentClient();

  const [loading, setLoading] = useState(true);
  const [restaurant, setRestaurant] = useState(null);
  const [menus, setMenus] = useState([]);
  const [dishes, setDishes] = useState([]);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError("You must be logged in.");
      setLoading(false);
      return;
    }

    const { data: r, error: rError } = await supabase
      .from("restaurants")
      .select("*")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (rError || !r) {
      setError("No restaurant found.");
      setLoading(false);
      return;
    }
    setRestaurant(r);

    const { data: menusData, error: mError } = await supabase
      .from("menus")
      .select("*")
      .eq("restaurant_id", r.id);

    if (mError) {
      setError("Failed to load menus.");
      setLoading(false);
      return;
    }

    setMenus(menusData || []);

    if (!menusData || menusData.length === 0) {
      setDishes([]);
      setLoading(false);
      return;
    }

    const menuIds = menusData.map((m) => m.id);

    const { data: dishesData, error: dError } = await supabase
      .from("dishes")
      .select("*")
      .in("menu_id", menuIds)
      .order("created_at", { ascending: false });

    if (dError) {
      setError("Failed to load dishes.");
      setLoading(false);
      return;
    }

    setDishes(dishesData || []);
    setLoading(false);
  };

  const handleDeleteDish = async (dishId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this dish? This cannot be undone."
    );
    if (!confirmed) return;

    try {
      setDeletingId(dishId);
      setError("");

      // 1) Delete allergen links (in case FK doesn't cascade)
      const { error: daError } = await supabase
        .from("dish_allergens")
        .delete()
        .eq("dish_id", dishId);

      if (daError) {
        console.error("Failed to delete dish_allergens", daError);
        setError("Failed to delete dish allergens.");
        setDeletingId(null);
        return;
      }

      // 2) Delete dish itself
      const { error: dishError } = await supabase
        .from("dishes")
        .delete()
        .eq("id", dishId);

      if (dishError) {
        console.error("Failed to delete dish", dishError);
        setError("Failed to delete dish.");
        setDeletingId(null);
        return;
      }

      // 3) Refresh list
      await loadData();
      setDeletingId(null);
    } catch (err) {
      console.error(err);
      setError("Unexpected error while deleting dish.");
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[70vh] text-slate-300 text-sm">
        Loading dishes…
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto mt-10 mb-20">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-emerald-400/80 mb-2">
            SelectorOS • Dishes
          </p>
          <h1 className="text-2xl font-semibold text-slate-50">Dishes</h1>
          <p className="text-sm text-slate-400 mt-1">
            All dishes across your menus. Changes here update your live
            allergen view.
          </p>
        </div>

        <a
          href="/dashboard/dishes/new"
          className="inline-flex items-center justify-center rounded-full bg-emerald-400 px-5 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-300 transition"
        >
          + Add dish
        </a>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/60 bg-red-500/10 px-4 py-2 text-xs text-red-200 mb-4">
          {error}
        </div>
      )}

      {dishes.length === 0 ? (
        <div className="rounded-2xl bg-slate-950/80 border border-slate-800/80 p-6 text-sm text-slate-300">
          No dishes yet. Start by adding your first dish.
        </div>
      ) : (
        <div className="rounded-2xl bg-slate-950/80 border border-slate-800/80 p-4">
          <table className="w-full text-sm text-slate-200">
            <thead className="text-xs uppercase tracking-wide text-slate-400 border-b border-slate-800">
              <tr>
                <th className="text-left py-2">Name</th>
                <th className="text-left py-2">Menu</th>
                <th className="text-left py-2">Category</th>
                <th className="text-right py-2">Price</th>
                <th className="text-right py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {dishes.map((d) => {
                const menu = menus.find((m) => m.id === d.menu_id);
                return (
                  <tr
                    key={d.id}
                    className="border-b border-slate-900/80 hover:bg-slate-900/50"
                  >
                    <td className="py-2 pr-4 font-medium">{d.name}</td>
                    <td className="py-2 pr-4 text-slate-300">
                      {menu?.name || "—"}
                    </td>
                    <td className="py-2 pr-4 text-slate-400 text-xs">
                      {d.category || "—"}
                    </td>
                    <td className="py-2 pl-4 text-right">
                      {d.price != null
                        ? `${Number(d.price).toFixed(2)} €`
                        : "—"}
                    </td>
                    <td className="py-2 pl-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteDish(d.id)}
                        disabled={deletingId === d.id}
                        className="text-[11px] rounded-full px-3 py-1 border border-red-500/60 text-red-200 hover:bg-red-500/10 disabled:opacity-50"
                      >
                        {deletingId === d.id ? "Deleting…" : "Delete"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
