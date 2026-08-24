"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function DishesPage() {
  const supabase = createClient();

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
    <div className="so-page page-fade">

      {/* HEADER */}
      <header className="so-page-header">

        <div>
          <p className="so-page-eyebrow">
            Guest experience
          </p>

          <h1 className="so-page-title">
            Dishes
          </h1>

          <p className="so-page-description">
            Create and maintain the dishes presented across restaurant and in-room menus.
          </p>
        </div>

        {!error && (
          <a href="/dashboard/dishes/new" className="so-btn-primary">
            + Add dish
          </a>
        )}

      </header>

      {error && (
        <div className="so-empty-state">
          <span>Organisation setup</span>
          <h2>Dish catalogue is not connected</h2>
          <p>{error} Ask an administrator to link this account to the correct restaurant workspace.</p>
          <a href="/dashboard/settings" className="so-btn-secondary">Open settings</a>
        </div>
      )}

      {/* EMPTY STATE */}

      {!error && dishes.length === 0 && (
        <div className="so-empty-state">
          <span>Dish catalogue</span>
          <h2>No dishes yet</h2>
          <p>Create the first dish to begin building guest-facing menus.</p>
          <a href="/dashboard/dishes/new" className="so-btn-secondary">Create first dish</a>
        </div>
      )}

      {/* DISH LIST */}

      {dishes.length > 0 && (
        <div className="so-glass-panel overflow-hidden">

          <table className="w-full text-sm">

            <thead className="so-table-head">
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
                    className="so-table-row"
                  >

                    <td className="px-6 py-4 font-medium text-[#26322f]">
                      {dish.name}
                    </td>

                    <td className="px-6 py-4">

                      <span className="so-soft-pill">
                        {menu?.name || "—"}
                      </span>

                    </td>

                    <td className="px-6 py-4 text-[#75817c]">
                      {dish.category || "—"}
                    </td>

                    <td className="px-6 py-4 text-right text-[#26322f] font-medium">
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
