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
    type: "",
    country: "",
    region: "",
    subregion: "",
    size: "",
    grape: "",
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

    const { data: m } = await supabase
      .from("wine_menus")
      .select("*")
      .eq("slug", menu)
      .eq("restaurant_id", r.id)
      .maybeSingle();

    const { data: wineItems } = await supabase
      .from("wine_menu_items")
      .select(`
        wine_id,
        wines (*)
      `)
      .eq("wine_menu_id", m.id);

    const winesList = wineItems.map(w => w.wines);

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
        String(w[key]).toLowerCase().includes(filters[key].toLowerCase())
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

      <div className="text-center mb-12">

        <h1 className="text-4xl font-semibold">
          {restaurantData?.name}
        </h1>

        <p className="text-slate-400 mt-2">
          {wineMenu?.name}
        </p>

      </div>

      {/* FILTER PANEL */}

      <div className="so-card p-8 max-w-4xl w-full grid md:grid-cols-2 gap-6">

        <select onChange={(e)=>updateFilter("wine_type",e.target.value)}>
          <option value="">Wine Type</option>
          {unique("wine_type").map(v => (
            <option key={v}>{v}</option>
          ))}
        </select>

        <select onChange={(e)=>updateFilter("country",e.target.value)}>
          <option value="">Country</option>
          {unique("country").map(v => (
            <option key={v}>{v}</option>
          ))}
        </select>

        <select onChange={(e)=>updateFilter("region",e.target.value)}>
          <option value="">Region</option>
          {unique("region").map(v => (
            <option key={v}>{v}</option>
          ))}
        </select>

        <select onChange={(e)=>updateFilter("subregion",e.target.value)}>
          <option value="">Subregion</option>
          {unique("subregion").map(v => (
            <option key={v}>{v}</option>
          ))}
        </select>

        <select onChange={(e)=>updateFilter("size",e.target.value)}>
          <option value="">Bottle Size</option>
          {unique("size").map(v => (
            <option key={v}>{v}</option>
          ))}
        </select>

        <select onChange={(e)=>updateFilter("grapes",e.target.value)}>
          <option value="">Grape</option>
          {unique("grapes").map(v => (
            <option key={v}>{v}</option>
          ))}
        </select>

        <select onChange={(e)=>updateFilter("vintage",e.target.value)}>
          <option value="">Vintage</option>
          {unique("vintage").map(v => (
            <option key={v}>{v}</option>
          ))}
        </select>

        <input
          placeholder="Search by name"
          className="bg-slate-900 p-3 rounded"
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

            <div key={wine.id} className="so-card p-6">

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
}export const dynamic = "force-dynamic";

import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export default async function WineGuestPage({ params }) {

  const supabase = createServerComponentClient({ cookies });

  const { restaurant, menu } = params;

  /* -------------------------------- */
  /* LOAD RESTAURANT                  */
  /* -------------------------------- */

  const { data: restaurantData, error: restaurantError } = await supabase
    .from("restaurants")
    .select("*")
    .eq("slug", restaurant)
    .maybeSingle();

  if (!restaurantData || restaurantError) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        Restaurant not found
      </div>
    );
  }

  /* -------------------------------- */
  /* LOAD WINE MENU                   */
  /* -------------------------------- */

  const { data: wineMenu, error: menuError } = await supabase
    .from("wine_menus")
    .select("*")
    .eq("slug", menu)
    .eq("restaurant_id", restaurantData.id)
    .maybeSingle();

  if (!wineMenu || menuError) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        Wine menu not found
      </div>
    );
  }

  /* -------------------------------- */
  /* LOAD WINES                       */
  /* -------------------------------- */

  const { data: wineItems, error: winesError } = await supabase
    .from("wine_menu_items")
    .select(`
      wine_id,
      wines (*)
    `)
    .eq("wine_menu_id", wineMenu.id);

  const wines = wineItems?.map(item => item.wines) || [];

  /* -------------------------------- */
  /* PAGE                             */
  /* -------------------------------- */

  return (
    <div className="min-h-screen bg-slate-950 text-white p-10">

      <h1 className="text-3xl font-semibold mb-10">
        {restaurantData.name} — {wineMenu.name}
      </h1>

      {wines.length === 0 && (
        <div className="text-slate-400 mb-8">
          No wines in this menu yet.
        </div>
      )}

      <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">

        {wines.map((wine) => (

          <div key={wine.id} className="so-card p-6">

            <div className="text-lg font-semibold">
              {wine.name}
            </div>

            <div className="text-sm text-slate-400 mt-1">
              {wine.region} · {wine.country}
            </div>

            <div className="text-sm text-slate-400">
              {wine.vintage} · {wine.size}
            </div>

            <div className="mt-3">
              €{wine.price}
            </div>

          </div>

        ))}

      </div>

    </div>
  );
}
