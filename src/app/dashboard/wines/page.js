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
      .eq("restaurant_id", restaurantData.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Wine loading error:", error);
    }

    setWines(winesData || []);
    setLoading(false);
  };

  /* UPDATE STOCK */

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

  /* DELETE WINE */

  const deleteWine = async (wineId) => {

    const confirmDelete = confirm("Remove this wine from the cellar?");
    if (!confirmDelete) return;

    await supabase
      .from("wines")
      .delete()
      .eq("id", wineId);

    setWines(prev => prev.filter(w => w.id !== wineId));

  };

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

        <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">

          {wines.map((wine) => (

            <div
              key={wine.id}
              className="so-card p-6 hover:scale-[1.02] transition-transform"
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

              {/* STOCK CONTROLS */}

              <div className="flex items-center justify-between mt-4">

                <div className="flex items-center gap-3">

                  <button
                    onClick={() => updateStock(wine.id, wine.stock, -1)}
                    className="px-2 py-1 bg-slate-800 rounded text-white"
                  >
                    –
                  </button>

                  <div className="text-sm text-slate-300">
                    {wine.stock ?? 0}
                  </div>

                  <button
                    onClick={() => updateStock(wine.id, wine.stock, 1)}
                    className="px-2 py-1 bg-slate-800 rounded text-white"
                  >
                    +
                  </button>

                </div>

                {/* DELETE BUTTON */}

                <button
                  onClick={() => deleteWine(wine.id)}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  Remove
                </button>

              </div>

            </div>

          ))}

        </div>

      )}

    </div>
  );
}
