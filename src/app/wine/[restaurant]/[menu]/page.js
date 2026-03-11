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
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center p-10">

      {/* HEADER */}

      <div className="wine-selector-header">

        {restaurantData?.logo_url && (
          <img
            src={restaurantData.logo_url}
            className="h-16 mb-2"
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

      {/* FILTER PANEL */}

<div className="wine-filter-panel">

  <div className="wine-filter-wrapper">
    <select
      className="wine-filter"
      onChange={(e)=>updateFilter("wine_type",e.target.value)}
    >
      <option value="">Select Wine Type</option>
      {unique("wine_type").map(v => (
        <option key={v}>{v}</option>
      ))}
    </select>
  </div>

  <div className="wine-filter-wrapper">
    <select
      className="wine-filter"
      onChange={(e)=>updateFilter("country",e.target.value)}
    >
      <option value="">Select Country</option>
      {unique("country").map(v => (
        <option key={v}>{v}</option>
      ))}
    </select>
  </div>

  <div className="wine-filter-wrapper">
    <select
      className="wine-filter"
      onChange={(e)=>updateFilter("region",e.target.value)}
    >
      <option value="">Select Region</option>
      {unique("region").map(v => (
        <option key={v}>{v}</option>
      ))}
    </select>
  </div>

  <div className="wine-filter-wrapper">
    <select
      className="wine-filter"
      onChange={(e)=>updateFilter("subregion",e.target.value)}
    >
      <option value="">Select Sub Region</option>
      {unique("subregion").map(v => (
        <option key={v}>{v}</option>
      ))}
    </select>
  </div>

  <div className="wine-filter-wrapper">
    <select
      className="wine-filter"
      onChange={(e)=>updateFilter("size",e.target.value)}
    >
      <option value="">Select Bottle Size</option>
      {unique("size").map(v => (
        <option key={v}>{v}</option>
      ))}
    </select>
  </div>

  <div className="wine-filter-wrapper">
    <select
      className="wine-filter"
      onChange={(e)=>updateFilter("grapes",e.target.value)}
    >
      <option value="">Select Grape</option>
      {unique("grapes").map(v => (
        <option key={v}>{v}</option>
      ))}
    </select>
  </div>

  <div className="wine-filter-wrapper">
    <select
      className="wine-filter"
      onChange={(e)=>updateFilter("vintage",e.target.value)}
    >
      <option value="">Select Vintage</option>
      {unique("vintage").map(v => (
        <option key={v}>{v}</option>
      ))}
    </select>
  </div>

  <input
    className="wine-filter"
    placeholder="Search wine name"
    onChange={(e)=>updateFilter("name",e.target.value)}
  />

</div>

      {/* SHOW BUTTON */}

      <button
        onClick={applyFilters}
        className="so-btn-primary mt-8"
      >
        Show Selection
      </button>

      {/* RESULTS */}

      {filteredWines.length > 0 && (

        <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6 mt-12 max-w-6xl w-full">

          {filteredWines.map((wine) => (

            <div key={wine.id} className="wine-selector-card">

              <div className="text-lg font-semibold">
                {wine.name}
              </div>

              <div className="text-sm text-slate-400">
                {wine.region} · {wine.country}
              </div>

              <div className="text-sm text-slate-400">
                {wine.vintage} · {wine.size}
              </div>

              <div className="mt-2">
                €{wine.price}
              </div>

            </div>

          ))}

        </div>

      )}

    </div>
  );
}
