"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function WinesPage() {

  const supabase = createClientComponentClient();

  const [wines, setWines] = useState([]);
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadWines();
  }, []);

  /* ------------------------------
     LOAD WINES
  ------------------------------ */

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

  /* ------------------------------
     STOCK STATUS
  ------------------------------ */

  const getStockStatus = (stock) => {

    if (!stock || stock === 0) {
      return { label: "Out", color: "text-red-400" };
    }

    if (stock <= 3) {
      return { label: "Low", color: "text-amber-400" };
    }

    return { label: "OK", color: "text-emerald-400" };

  };

  /* ------------------------------
     UPDATE STOCK
  ------------------------------ */

  const updateStock = async (wineId, currentStock, change) => {

    const newStock = Math.max(0, (currentStock || 0) + change);

    const { error } = await supabase
      .from("wines")
      .update({ stock: newStock })
      .eq("id", wineId);

    if (error) {
      console.error("Stock update failed:", error);
      return;
    }

    setWines(prev =>
      prev.map(w =>
        w.id === wineId ? { ...w, stock: newStock } : w
      )
    );

  };

  /* ------------------------------
     DELETE WINE
  ------------------------------ */

  const deleteWine = async (wineId) => {

    const confirmDelete = confirm("Remove this wine from the cellar?");
    if (!confirmDelete) return;

    const { error } = await supabase
      .from("wines")
      .delete()
      .eq("id", wineId);

    if (error) {
      console.error("Delete failed:", error);
      return;
    }

    setWines(prev => prev.filter(w => w.id !== wineId));

  };

  /* ------------------------------
     SEARCH FILTER
  ------------------------------ */

  const filteredWines = wines.filter(w =>
    `${w.name} ${w.region} ${w.country}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  /* ------------------------------
     LOADING
  ------------------------------ */

  if (loading) {
    return (
      <div className="page-fade">
        <div className="text-slate-400">Loading wines…</div>
      </div>
    );
  }

  /* ------------------------------
     UI
  ------------------------------ */

  return (
    <div className="page-fade">

      {/* HEADER */}

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

      {/* SEARCH */}

      <input
        type="text"
        placeholder="Search wines..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="so-input mb-6"
      />

      {/* EMPTY STATE */}

      {filteredWines.length === 0 ? (

        <div className="so-card p-8 text-center text-slate-400">
          Your cellar is empty. Add your first bottle.
        </div>

      ) : (

        <div className="so-card overflow-x-auto">

          <table className="w-full text-sm">

            {/* TABLE HEADER */}

            <thead className="border-b border-slate-700 text-slate-400">

              <tr className="text-left">

                <th className="py-3 px-4">Wine</th>
                <th className="py-3 px-4">Region</th>
                <th className="py-3 px-4">Vintage</th>
                <th className="py-3 px-4">Size</th>
                <th className="py-3 px-4">Price</th>
                <th className="py-3 px-4">Stock</th>
                <th className="py-3 px-4">Actions</th>

              </tr>

            </thead>

            {/* TABLE BODY */}

            <tbody>

              {filteredWines.map((wine) => {

                const stockStatus = getStockStatus(wine.stock);

                return (

                  <tr
                    key={wine.id}
                    className="border-b border-slate-800 hover:bg-slate-800/40 transition"
                  >

                    <td className="py-3 px-4 text-white font-medium">
                      {wine.name}
                    </td>

                    <td className="py-3 px-4 text-slate-300">
                      {wine.region} · {wine.country}
                    </td>

                    <td className="py-3 px-4 text-slate-300">
                      {wine.vintage}
                    </td>

                    <td className="py-3 px-4 text-slate-300">
                      {wine.size}
                    </td>

                    <td className="py-3 px-4 text-slate-300">
                      {wine.price ? `€${wine.price}` : "No price"}
                    </td>

                    <td className="py-3 px-4">

                      <div className="flex items-center gap-3">

                        <button
                          onClick={() => updateStock(wine.id, wine.stock, -1)}
                          className="px-2 py-1 bg-slate-800 rounded text-white"
                        >
                          –
                        </button>

                        <span className={`text-sm ${stockStatus.color}`}>
                          {wine.stock ?? 0}
                        </span>

                        <button
                          onClick={() => updateStock(wine.id, wine.stock, 1)}
                          className="px-2 py-1 bg-slate-800 rounded text-white"
                        >
                          +
                        </button>

                      </div>

                    </td>

                    <td className="py-3 px-4">

                      <button
                        onClick={() => deleteWine(wine.id)}
                        className="text-xs text-red-400 hover:text-red-300"
                      >
                        Remove
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
