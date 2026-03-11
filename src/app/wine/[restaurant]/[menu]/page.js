"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function WineSelector({ params }) {

  const supabase = createClientComponentClient();

  const { restaurant, menu } = params;

  const [restaurantData, setRestaurant] = useState(null);
  const [wineMenu, setWineMenu] = useState(null);
  const [wines, setWines] = useState([]);
  const [filteredWines, setFilteredWines] = useState([]);

  const [filters, setFilters] = useState({
    wine_type: "",
    country: "",
    region: "",
    subregion: "",
    size: "",
    grapes: "",
    vintage: "",
    name: ""
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {

    const { data: r } = await supabase
      .from("restaurants")
      .select("*")
      .eq("slug", restaurant)
      .maybeSingle();

    if (!r) return;

    const { data: m } = await supabase
      .from("wine_menus")
      .select("*")
      .eq("slug", menu)
      .eq("restaurant_id", r.id)
      .maybeSingle();

    if (!m) return;

    const { data: wineItems } = await supabase
      .from("wine_menu_items")
      .select(`
        wine_id,
        wines (*)
      `)
      .eq("wine_menu_id", m.id);

    const winesList = wineItems?.map(item => item.wines) || [];

    setRestaurant(r);
    setWineMenu(m);
    setWines(winesList);
  }

  function unique(field) {
    return [...new Set(wines.map(w => w[field]).filter(Boolean))];
  }

  function applyFilters() {

    let results = wines;

    Object.keys(filters).forEach((key) => {

      if (!filters[key]) return;

      results = results.filter(w =>
        String(w[key] ?? "")
          .toLowerCase()
          .includes(filters[key].toLowerCase())
      );

    });

    setFilteredWines(results);
  }

  function updateFilter(field, value) {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center px-6 py-16">

      {/* HEADER */}

      <div className="flex flex-col items-center text-center mb-12">

        {restaurantData?.logo_url && (
          <img
            src={restaurantData.logo_url}
            className="h-16 mb-3"
            alt="Restaurant logo"
          />
        )}

        <h1 className="text-4xl font-semibold">
          {restaurantData?.name}
        </h1>

        <p className="text-slate-400 mt-2">
          {wineMenu?.name}
        </p>

      </div>

      {/* FILTER PANEL */}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl w-full">

        <select
          className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-3"
          onChange={(e)=>updateFilter("wine_type",e.target.value)}
        >
          <option value="">All Wine Types</option>
          {unique("wine_type").map(v => (
            <option key={v}>{v}</option>
          ))}
        </select>

        <select
          className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-3"
          onChange={(e)=>updateFilter("country",e.target.value)}
        >
          <option value="">All Countries</option>
          {unique("country").map(v => (
            <option key={v}>{v}</option>
          ))}
        </select>

        <select
          className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-3"
          onChange={(e)=>updateFilter("region",e.target.value)}
        >
          <option value="">All Regions</option>
          {unique("region").map(v => (
            <option key={v}>{v}</option>
          ))}
        </select>

        <select
          className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-3"
          onChange={(e)=>updateFilter("subregion",e.target.value)}
        >
          <option value="">All Sub Regions</option>
          {unique("subregion").map(v => (
            <option key={v}>{v}</option>
          ))}
        </select>

        <select
          className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-3"
          onChange={(e)=>updateFilter("size",e.target.value)}
        >
          <option value="">All Bottle Sizes</option>
          {unique("size").map(v => (
            <option key={v}>{v}</option>
          ))}
        </select>

        <select
          className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-3"
          onChange={(e)=>updateFilter("grapes",e.target.value)}
        >
          <option value="">All Grapes</option>
          {unique("grapes").map(v => (
            <option key={v}>{v}</option>
          ))}
        </select>

        <select
          className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-3"
          onChange={(e)=>updateFilter("vintage",e.target.value)}
        >
          <option value="">All Vintages</option>
          {unique("vintage").map(v => (
            <option key={v}>{v}</option>
          ))}
        </select>

        <input
          className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 md:col-span-2"
          placeholder="Search wine name"
          onChange={(e)=>updateFilter("name",e.target.value)}
        />

      </div>

      {/* SHOW BUTTON */}

      <button
        onClick={applyFilters}
        className="mt-8 bg-amber-400 text-black px-6 py-3 rounded-lg hover:opacity-90"
      >
        Show Selection
      </button>

      {/* RESULTS */}

      {filteredWines.length > 0 && (

        <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6 mt-12 max-w-6xl w-full">

          {filteredWines.map((wine) => (

            <div key={wine.id} className="bg-slate-900 border border-slate-700 rounded-xl p-5 hover:border-sky-400 transition">

              <div className="text-lg font-semibold">
                {wine.name}
              </div>

              <div className="text-sm text-slate-400">
                {wine.region} · {wine.country}
              </div>

              <div className="text-sm text-slate-400">
                {wine.vintage} · {wine.size}
              </div>

              <div className="mt-2 font-semibold">
                €{wine.price}
              </div>

            </div>

          ))}

        </div>

      )}

    </div>
  );
}
