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
  const [typeFilter, setTypeFilter] = useState("all");

  useEffect(() => {
    loadWines();
  }, []);

  /* LOAD WINES */

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
      .order("name");

    if (error) {
      console.error("Wine loading error:", error);
    }

    setWines(winesData || []);
    setLoading(false);
  };

  /* UPDATE STOCK */

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

  /* DELETE WINE */

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

  /* FILTER WINES */

  const filteredWines = wines
    .filter(w => {
      if (typeFilter === "all") return true;
      return w.wine_type === typeFilter;
    })
    .filter(w =>
      `${w.name} ${w.producer} ${w.region} ${w.country} ${w.grapes} ${w.vintage}`
        .toLowerCase()
        .includes(search.toLowerCase())
    );

  if (loading) {
    return (
      <div className="page-fade">
        <div className="text-slate-400">Loading wines…</div>
      </div>
    );
  }

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

      {/* TYPE FILTER TABS */}

      <div className="flex gap-3 mb-6 flex-wrap">

        {[
          { label: "All", value: "all" },
          { label: "Sparkling", value: "sparkling" },
          { label: "White", value: "white" },
          { label: "Rosé", value: "rose" },
          { label: "Red", value: "red" },
          { label: "Orange", value: "orange" },
          { label: "Dessert", value: "dessert" },
          { label: "Fortified", value: "fortified" }
        ].map(tab => (

          <button
            key={tab.value}
            onClick={() => setTypeFilter(tab.value)}
            className={`px-4 py-2 rounded-lg text-sm transition
            ${typeFilter === tab.value
              ? "bg-emerald-500 text-white"
              : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            {tab.label}
          </button>

        ))}

      </div>

      {/* SEARCH */}

      <input
        type="text"
        placeholder="Search wines..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="so-input mb-6"
      />

      {/* TABLE */}

      <div className="so-card overflow-x-auto">

        <table className="w-full text-sm">

          <thead className="border-b border-slate-700 text-slate-400">

            <tr className="text-left">

              <th className="py-3 px-4">Wine</th>
              <th className="py-3 px-4">Producer</th>
              <th className="py-3 px-4">Region</th>
              <th className="py-3 px-4">Vintage</th>
              <th className="py-3 px-4">Price</th>
              <th className="py-3 px-4">Stock</th>
              <th className="py-3 px-4"></th>

            </tr>

          </thead>

          <tbody>

            {filteredWines.map(wine => (

              <tr
                key={wine.id}
                className="border-b border-slate-800 hover:bg-slate-800/40"
              >

                <td className="py-3 px-4 text-white font-medium">
                  {wine.name}
                </td>

                <td className="py-3 px-4 text-slate-400">
                  {wine.producer}
                </td>

                <td className="py-3 px-4 text-slate-400">
                  {wine.region}
                </td>

                <td className="py-3 px-4 text-slate-400">
                  {wine.vintage}
                </td>

                <td className="py-3 px-4 text-slate-400">
                  €{wine.price ?? "-"}
                </td>

                <td className="py-3 px-4 text-slate-300">
                  {wine.stock ?? 0}
                </td>

                <td className="py-3 px-4">

                  <div className="flex gap-2">

                    <button
                      onClick={() => updateStock(wine.id, wine.stock, -1)}
                      className="px-2 py-1 bg-slate-800 rounded text-white"
                    >
                      –
                    </button>

                    <button
                      onClick={() => updateStock(wine.id, wine.stock, 1)}
                      className="px-2 py-1 bg-slate-800 rounded text-white"
                    >
                      +
                    </button>

                    <button
                      onClick={() => deleteWine(wine.id)}
                      className="text-xs text-red-400 hover:text-red-300 ml-3"
                    >
                      Remove
                    </button>

                  </div>

                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

    </div>
  );
}
