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

    setError("");
    setDeletingId(dishId);

    try {
      // delete links from dish_allergens first
      const { error: daError } = await supabase
        .from("dish_allergens")
        .delete()
        .eq("dish_id", dishId);

      if (daError) {
        console.error("Failed to delete dish_allergens", daError);
      }

      const { error: dishError } = await supabase
        .from("dishes")
        .delete()
        .eq("id", dishId);

      if (dishError) {
        console.error("Failed to delete dish", dishError);
        setError("Failed to delete dish. Check console / Supabase logs.");
        setDeletingId(null);
        return;
      }

      setDishes((prev) => prev.filter((d) => d.id !== dishId));
      setDeletingId(null);
    } catch (err) {
      console.error(err);
      setError("Unexpected error while deleting dish.");
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <main className="page-fade">
        <div className="so-main-inner flex h-[70vh] items-center justify-center text-sm text-slate-500">
          Loading dishes…
        </div>
      </main>
    );
  }

  return (
    <main className="page-fade">
      <div className="so-main-inner max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.25em] text-emerald-600">
              SELECTOROS • DISHES
            </p>
            <h1 className="text-2xl font-semibold text-slate-900">Dishes</h1>
            <p className="mt-1 text-sm text-slate-600">
              All dishes across your menus. Changes here update your live
              allergen view.
            </p>
          </div>

          <a
            href="/dashboard/dishes/new"
            className="inline-flex items-center justify-center rounded-full bg-emerald-400 px-5 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
          >
            + Add dish
          </a>
        </div>

        {error && (
          <div className="so-card border border-red-200 bg-red-50/90 text-xs text-red-800">
            {error}
          </div>
        )}

        {dishes.length === 0 ? (
          <div className="so-card text-sm text-slate-600">
            No dishes yet. Start by adding your first dish.
          </div>
        ) : (
          <div className="so-card p-4 overflow-x-auto">
            <table className="min-w-full text-sm text-slate-800">
              <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="py-2 text-left">Name</th>
                  <th className="py-2 text-left">Menu</th>
                  <th className="py-2 text-left">Category</th>
                  <th className="py-2 text-right">Price</th>
                  <th className="py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {dishes.map((d) => {
                  const menu = menus.find((m) => m.id === d.menu_id);
                  return (
                    <tr
                      key={d.id}
                      className="border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50"
                    >
                      <td className="py-2 pr-4 font-medium text-slate-900">
                        {d.name}
                      </td>
                      <td className="py-2 pr-4 text-slate-600">
                        {menu?.name || "—"}
                      </td>
                      <td className="py-2 pr-4 text-xs text-slate-500">
                        {d.category || "—"}
                      </td>
                      <td className="py-2 pl-4 text-right text-slate-800">
                        {d.price != null
                          ? `${Number(d.price).toFixed(2)} €`
                          : "—"}
                      </td>
                      <td className="py-2 pl-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteDish(d.id)}
                          disabled={deletingId === d.id}
                          className="rounded-full border border-red-300 px-3 py-1 text-[11px] text-red-700 transition hover:bg-red-50 disabled:opacity-50"
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
    </main>
  );
}
