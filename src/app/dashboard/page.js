"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function DashboardPage() {

  const supabase = createClientComponentClient();

  const [restaurant, setRestaurant] = useState(null);

  const [wineStats, setWineStats] = useState({
    total: 0,
    lowStock: 0,
    outOfStock: 0,
    menus: 0
  });

  const [dishStats, setDishStats] = useState({
    dishes: 0,
    allergenDishes: 0
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const { data: restaurantData } = await supabase
      .from("restaurants")
      .select("*")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (!restaurantData) {
      setLoading(false);
      return;
    }

    setRestaurant(restaurantData);

    /* ---------------------------
       WINE STATS
    ---------------------------- */

    const { data: wines } = await supabase
      .from("wines")
      .select("*")
      .eq("restaurant_id", restaurantData.id);

    const { data: wineMenus } = await supabase
      .from("wine_menus")
      .select("*")
      .eq("restaurant_id", restaurantData.id);

    const totalWines = wines?.length || 0;

    const lowStock =
      wines?.filter(w => w.stock > 0 && w.stock <= 3).length || 0;

    const outOfStock =
      wines?.filter(w => !w.stock || w.stock === 0).length || 0;

    setWineStats({
      total: totalWines,
      lowStock: lowStock,
      outOfStock: outOfStock,
      menus: wineMenus?.length || 0
    });

    /* ---------------------------
       DISH STATS (FIXED LOGIC)
    ---------------------------- */

    const { data: menus } = await supabase
      .from("menus")
      .select("id")
      .eq("restaurant_id", restaurantData.id);

    const menuIds = menus?.map(m => m.id) || [];

    const { data: dishes } = await supabase
      .from("dishes")
      .select("*")
      .in("menu_id", menuIds);

    const totalDishes = dishes?.length || 0;

    setDishStats({
      dishes: totalDishes,
      allergenDishes: 0
    });

    setLoading(false);
  }

  if (loading) {
    return (
      <div className="page-fade text-slate-400">
        Loading dashboard…
      </div>
    );
  }

  return (
    <div className="page-fade space-y-8">

      <h1 className="text-2xl font-semibold text-white">
        Dashboard
      </h1>

      {/* WINE PROGRAM */}

      <div className="space-y-4">

        <h2 className="text-sm uppercase text-slate-400 tracking-wider">
          Wine Program
        </h2>

        <div className="grid md:grid-cols-4 gap-6">

          <div className="so-card">
            <div className="so-card-title">Total Wines</div>
            <div className="text-3xl font-bold text-white">
              {wineStats.total}
            </div>
          </div>

          <div className="so-card">
            <div className="so-card-title">Low Stock</div>
            <div className="text-3xl font-bold text-amber-400">
              {wineStats.lowStock}
            </div>
          </div>

          <div className="so-card">
            <div className="so-card-title">Out of Stock</div>
            <div className="text-3xl font-bold text-red-400">
              {wineStats.outOfStock}
            </div>
          </div>

          <div className="so-card">
            <div className="so-card-title">Wine Menus</div>
            <div className="text-3xl font-bold text-white">
              {wineStats.menus}
            </div>
          </div>

        </div>

      </div>

      {/* KITCHEN & ALLERGEN */}

      <div className="space-y-4">

        <h2 className="text-sm uppercase text-slate-400 tracking-wider">
          Kitchen & Allergens
        </h2>

        <div className="grid md:grid-cols-2 gap-6">

          <div className="so-card">
            <div className="so-card-title">Total Dishes</div>
            <div className="text-3xl font-bold text-white">
              {dishStats.dishes}
            </div>
          </div>

          <div className="so-card">
            <div className="so-card-title">Dishes With Allergens</div>
            <div className="text-3xl font-bold text-white">
              {dishStats.allergenDishes}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
