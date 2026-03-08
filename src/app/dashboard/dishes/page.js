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
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("You must be logged in.");
      setLoading(false);
      return;
    }

    const { data: r } = await supabase
      .from("restaurants")
      .select("*")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (!r) {
      setError("No restaurant found.");
      setLoading(false);
      return;
    }

    setRestaurant(r);

    const { data: menusData } = await supabase
      .from("menus")
      .select("*")
      .eq("restaurant_id", r.id);

    setMenus(menusData || []);

    if (!menusData || menusData.length === 0) {
      setDishes([]);
      setLoading(false);
      return;
    }

    const menuIds = menusData.map((m) => m.id);

    const { data: dishesData } = await supabase
      .from("dishes")
      .select("*")
      .in("menu_id", menuIds)
      .order("created_at", { ascending: false });

    setDishes(dishesData || []);
    setLoading(false);
  };

  const handleDeleteDish = async (dishId) => {
    if (!confirm("Delete this dish permanently?")) return;

    setDeletingId(dishId);

    await supabase.from("dish_allergens").delete().eq("dish_id", dishId);
    await supabase.from("dishes").delete().eq("id", dishId);

    setDishes((prev) => prev.filter((d) => d.id !== dishId));
    setDeletingId(null);
  };

  if (loading) {
    return (
      <div className="flex h-[70vh] items-center justify-center text-slate-400">
        Loading dishes...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 page-fade">

      {/* HEADER */}
      <header className="flex items-center justify-between">

        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-teal-400">
            SelectorOS • Workspace
          </p>

          <h1 className="text-3xl font-semibold text-white mt-1">
            Dishes
          </h1>

          <p className="text-sm text-slate-400 mt-1">
            Manage dishes across all your menus.
          </p>
        </div>

        <a
          href="/dashboard/dishes/new"
          className="so-btn-primary"
        >
          + Add dish
        </a>

      </header>

      {error && (
        <div className="so-card border border-red-400/30 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* EMPTY STATE */}

      {dishes.length === 0 && (
        <div className="so-card flex items-center justify-center h-[300px] text-slate-400">
          No dishes yet. Add your first dish.
        </div>
      )}

      {/* DISH LIST */}

      {dishes.length > 0 && (
        <div className="so-card p-0 overflow-hidden">

          <table className="w-full text-sm">

            <thead className="text-xs uppercase tracking-wider text-slate-400 border-b border-white/10">
              <tr>
                <th className="text-left px-6 py-4">Dish</th>
                <th className="text-left px-6 py-4">Menu</th>
                <th className="text-left px-6 py-4">Category</th>
                <th className="text-right px-6 py-4">Price</th>
                <th className="text-right px-6 py-4">Actions</th>
              </tr>
            </thead>

            <tbody>

              {dishes.map((dish) => {

                const menu = menus.find((m) => m.id === dish.menu_id);

                return (

                  <tr
                    key={dish.id}
                    className="border-b border-white/5 hover:bg-white/5 transition"
                  >

                    <td className="px-6 py-4 font-medium text-white">
                      {dish.name}
                    </td>

                    <td className="px-6 py-4">

                      <span className="px-2 py-1 text-xs rounded-full bg-white/10 text-slate-300">
                        {menu?.name || "—"}
                      </span>

                    </td>

                    <td className="px-6 py-4 text-slate-400">
                      {dish.category || "—"}
                    </td>

                    <td className="px-6 py-4 text-right text-white font-medium">
                      {dish.price ? `${Number(dish.price).toFixed(2)} €` : "—"}
                    </td>

                    <td className="px-6 py-4 text-right">

                      <button
                        onClick={() => handleDeleteDish(dish.id)}
                        disabled={deletingId === dish.id}
                        className="text-xs px-3 py-1 rounded-full border border-red-400/40 text-red-300 hover:bg-red-400/10 transition"
                      >
                        {deletingId === dish.id ? "Deleting…" : "Delete"}
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
