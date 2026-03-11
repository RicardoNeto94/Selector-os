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

/* NEW STATES */
const [showResults, setShowResults] = useState(false);
const [selectedWine, setSelectedWine] = useState(null);
const [modalVisible, setModalVisible] = useState(false);

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

/* SHOW RESULTS PAGE */
setShowResults(true);

}

function updateFilter(field, value) {
setFilters(prev => ({
...prev,
[field]: value
}));
}

function resetFilters() {
setShowResults(false);
setFilteredWines([]);
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

  {/* BACK BUTTON */}

  {showResults && (
    <button
      onClick={resetFilters}
      className="mb-6 flex items-center gap-2 text-slate-300 hover:text-white"
    >
      ← Back to Filters
    </button>
  )}

  {/* FILTER PANEL */}

  {!showResults && (

  <>

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

  <button
    onClick={applyFilters}
    className="mt-8 bg-amber-400 text-black px-6 py-3 rounded-lg hover:opacity-90"
  >
    Show Selection
  </button>

  </>

  )}

  {/* RESULTS */}

{showResults && filteredWines.length > 0 && (

<div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 mt-12 max-w-6xl w-full">

{filteredWines.map((wine) => (

<div
key={wine.id}
onClick={()=>{
setSelectedWine(wine)
setModalVisible(true)
}}
className="group cursor-pointer bg-slate-900 border border-slate-700 rounded-xl p-6 transition-all duration-200 hover:border-amber-400 hover:shadow-xl hover:-translate-y-1"
>

{/* WINE NAME */}

<div className="text-lg font-semibold text-white group-hover:text-amber-300 transition">
{wine.name}
</div>

{/* REGION */}

<div className="text-sm text-slate-400 mt-2">
{wine.region} · {wine.country}
</div>

{/* VINTAGE */}

<div className="text-sm text-slate-400">
{wine.vintage} · {wine.size}
</div>

{/* DIVIDER */}

<div className="border-t border-slate-700 my-4 group-hover:border-amber-400 transition"></div>

{/* PRICE */}

<div className="text-base font-semibold text-amber-400">
€{wine.price}
</div>

</div>

))}

</div>

)}
  {/* WINE MODAL */}

{selectedWine && (

<div
className={`fixed inset-0 flex items-center justify-center z-50 px-4 transition-all duration-200
${modalVisible ? "bg-black/70 backdrop-blur-sm opacity-100" : "bg-black/0 opacity-0"}
`}
>

<div
className={`bg-white text-gray-900 max-w-4xl w-full rounded-lg shadow-2xl p-10 relative transition-all duration-200
${modalVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}
`}
>

{/* CLOSE BUTTON */}

<button
onClick={()=>{
setModalVisible(false)
setTimeout(()=>setSelectedWine(null),200)
}}
className="absolute top-6 right-6 text-gray-500 hover:text-gray-900 text-xl"
>
✕
</button>

{/* TITLE */}

<h2 className="text-2xl font-semibold mb-8">
{selectedWine.name} – {selectedWine.vintage}
</h2>

{/* DIVIDER */}

<div className="border-t border-amber-300 mb-8"></div>

{/* WINE INFO */}

<div className="grid grid-cols-3 gap-10 mb-10 text-sm">

<div className="text-amber-700 font-medium">
Price (Bottle)
</div>

<div className="col-span-2">
€{selectedWine.price} &nbsp;&nbsp; {selectedWine.size}
</div>

<div className="text-amber-700 font-medium">
Grape
</div>

<div className="col-span-2">
{selectedWine.grapes}
</div>

<div className="text-amber-700 font-medium">
Region
</div>

<div className="col-span-2">
{selectedWine.country} → {selectedWine.region} → {selectedWine.subregion}
</div>

</div>

{/* SECOND DIVIDER */}

<div className="border-t border-amber-300 mb-8"></div>

{/* DESCRIPTION */}

<div>

<div className="text-amber-700 font-medium mb-3">
Description
</div>

<p className="leading-relaxed text-gray-700">
{selectedWine.description}
</p>

</div>

</div>

</div>

)}

    {/* CLOSE BUTTON */}

    <button
      onClick={() => setSelectedWine(null)}
      className="absolute top-6 right-6 text-gray-500 hover:text-gray-900 text-xl"
    >
      ✕
    </button>

    {/* TITLE */}

    <h2 className="text-2xl font-semibold mb-8">
      {selectedWine.name} - {selectedWine.vintage}
    </h2>

    {/* DIVIDER */}

    <div className="border-t border-amber-300 mb-8"></div>

    {/* WINE INFO GRID */}

    <div className="grid grid-cols-3 gap-10 mb-10 text-sm">

      <div className="text-amber-700 font-medium">
        Price (Bottle)
      </div>

      <div className="col-span-2">
        €{selectedWine.price} &nbsp;&nbsp;
        {selectedWine.size}
      </div>

      <div className="text-amber-700 font-medium">
        Grape
      </div>

      <div className="col-span-2">
        {selectedWine.grapes}
      </div>

      <div className="text-amber-700 font-medium">
        Region
      </div>

      <div className="col-span-2">
        {selectedWine.country} → {selectedWine.region} → {selectedWine.subregion}
      </div>

    </div>

    {/* SECOND DIVIDER */}

    <div className="border-t border-amber-300 mb-8"></div>

    {/* DESCRIPTION */}

    <div>

      <div className="text-amber-700 font-medium mb-3">
        Description
      </div>

      <p className="leading-relaxed text-gray-700">
        {selectedWine.description}
      </p>

    </div>

  </div>

</div>

)}

</div>

);
}
