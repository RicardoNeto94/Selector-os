"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function WinesPage() {

  const supabase = createClientComponentClient();

  const [wines, setWines] = useState([]);
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWines();
  }, []);

  const loadWines = async () => {

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

    const { data: winesData, error } = await supabase
      .from("wines")
      .select("*")
      .eq("restaurant_id", restaurantData.id);

    if (error) {
      console.error("Wine loading error:", error);
    }

    setWines(winesData || []);
    setLoading(false);
  };

  const updateStock = async (wineId, currentStock, change) => {

    const newStock = Math.max(0, (currentStock || 0) + change);

    await supabase
      .from("wines")
      .update({ stock: newStock })
      .eq("id", wineId);

    setWines(prev =>
      prev.map(w =>
        w.id === wineId ? { ...w, stock: newStock } : w
      )
    );

  };

  const winesByType = wines.reduce((groups, wine) => {

    const type = wine.wine_type || "Other";

    if (!groups[type]) groups[type] = [];

    groups[type].push(wine);

    return groups;

  }, {});

  if (loading) {
    return (
      <div className="page-fade">
        <div className="text-slate-400">Loading wines…</div>
      </div>
    );
  }

  return (
    <div className="page-fade">

      <div className="flex items-center justify-between mb-8">

        <h1 className="text-2xl font-semibold text-white">
          Wine Cellar
        </h1>

        <a
          href="/dashboard/wines/new"
          className="so-btn-primary"
        >
          + Add Wine
        </a>

      </div>

      {wines.length === 0 ? (

        <div className="so-card p-8 text-center text-slate-400">
          Your cellar is empty. Add your first bottle.
        </div>

      ) : (

        Object.keys(winesByType).map((type) => (

          <div key={type} className="mb-10">

            <h2 className="text-lg font-semibold text-white mb-4">
              {type}
            </h2>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">

              {winesByType[type].map((wine) => (

                <div
                  key={wine.id}
                  className="so-card p-6"
                >

                  <div className="text-lg font-semibold text-white">
                    {wine.name}
                  </div>

                  <div className="text-sm text-slate-400 mt-1">
                    {wine.region} · {wine.country}
                  </div>

                  <div className="text-sm text-slate-400">
                    {wine.vintage} · {wine.size}
                  </div>

                  <div className="mt-3 text-sm text-slate-300">
                    €{wine.price ?? "-"}
                  </div>

                  <div className="flex items-center justify-between mt-4">

                    <div className="flex items-center gap-3">

                      <button
                        onClick={() => updateStock(wine.id, wine.stock, -1)}
                        className="px-2 py-1 bg-slate-800 rounded"
                      >
                        –
                      </button>

                      <div className="text-sm text-slate-300">
                        {wine.stock ?? 0}
                      </div>

                      <button
                        onClick={() => updateStock(wine.id, wine.stock, 1)}
                        className="px-2 py-1 bg-slate-800 rounded"
                      >
                        +
                      </button>

                    </div>

                  </div>

                </div>

              ))}

            </div>

          </div>

        ))

      )}

    </div>
  );
}
