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
  const [wineType, setWineType] = useState("all");

  const [page, setPage] = useState(1);
  const perPage = 25;

  useEffect(() => {
    loadWines();
  }, []);

  async function loadWines() {

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
      console.error(error);
    }

    setWines(winesData || []);
    setLoading(false);
  }

  async function updateStock(wineId, currentStock, change) {

    const newStock = Math.max(0, (currentStock || 0) + change);

    const { error } = await supabase
      .from("wines")
      .update({ stock: newStock })
      .eq("id", wineId);

    if (error) {
      console.error(error);
      return;
    }

    setWines(prev =>
      prev.map(w =>
        w.id === wineId ? { ...w, stock: newStock } : w
      )
    );
  }

  async function deleteWine(wineId) {

    const confirmDelete = confirm("Remove this wine from the cellar?");
    if (!confirmDelete) return;

    await supabase
      .from("wines")
      .delete()
      .eq("id", wineId);

    setWines(prev => prev.filter(w => w.id !== wineId));
  }

  function getStockStatus(stock) {

    if (!stock || stock === 0) return "text-red-400";
    if (stock <= 3) return "text-amber-400";
    return "text-emerald-400";

  }

  const filtered = wines
  .filter(
    w =>
      wineType === "all" ||
      (w.wine_type || "").toLowerCase() === wineType.toLowerCase()
  )
  .filter(w =>
    `${w.name} ${w.producer} ${w.region} ${w.country} ${w.grapes}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );
  
  const totalPages = Math.ceil(filtered.length / perPage);

  const paginated = filtered.slice(
    (page - 1) * perPage,
    page * perPage
  );

  if (loading) {
    return (
      <div className="page-fade text-slate-400">
        Loading wines…
      </div>
    );
  }

  return (
    <div className="page-fade space-y-6">

      <div className="flex items-center justify-between">

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

      <div className="flex gap-2 flex-wrap">

        {[
          ["all","All"],
          ["sparkling","Sparkling"],
          ["white","White"],
          ["rose","Rosé"],
          ["red","Red"],
          ["orange","Orange"],
          ["dessert","Dessert"],
          ["fortified","Fortified"]
        ].map(([value,label]) => (

          <button
            key={value}
            onClick={() => {
              setWineType(value);
              setPage(1);
            }}
            className={`px-3 py-1 rounded text-sm ${
              wineType === value
                ? "bg-emerald-500 text-white"
                : "bg-slate-800 text-slate-300"
            }`}
          >
            {label}
          </button>

        ))}

      </div>

      <input
        type="text"
        placeholder="Search wines..."
        value={search}
        onChange={e => {
          setSearch(e.target.value);
          setPage(1);
        }}
        className="so-input"
      />

      <div className="so-card overflow-x-auto">

        <table className="w-full text-sm">

          <thead className="border-b border-slate-700 text-slate-400">

            <tr>

              <th className="text-left py-3 px-4">Wine</th>
              <th className="text-left py-3 px-4">Producer</th>
              <th className="text-left py-3 px-4">Region</th>
              <th className="text-left py-3 px-4">Vintage</th>
              <th className="text-left py-3 px-4">Price</th>
              <th className="text-left py-3 px-4">Stock</th>
              <th className="text-left py-3 px-4"></th>

            </tr>

          </thead>

          <tbody>

            {paginated.map(wine => (

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

                <td className={`py-3 px-4 ${getStockStatus(wine.stock)}`}>
                  {wine.stock ?? 0}
                </td>

                <td className="py-3 px-4 flex gap-2">

                  <button
                    onClick={() => updateStock(wine.id, wine.stock, -1)}
                    className="px-2 bg-slate-800 rounded"
                  >
                    –
                  </button>

                  <button
                    onClick={() => updateStock(wine.id, wine.stock, 1)}
                    className="px-2 bg-slate-800 rounded"
                  >
                    +
                  </button>

                  <button
                    onClick={() => deleteWine(wine.id)}
                    className="text-red-400 text-xs ml-2"
                  >
                    Remove
                  </button>

                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

      <div className="flex justify-center gap-2">

        {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (

          <button
            key={p}
            onClick={() => setPage(p)}
            className={`px-3 py-1 rounded ${
              p === page
                ? "bg-emerald-500 text-white"
                : "bg-slate-800 text-slate-300"
            }`}
          >
            {p}
          </button>

        ))}

      </div>

    </div>
  );
}
