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

const [showResults, setShowResults] = useState(false);
const [selectedWine, setSelectedWine] = useState(null);

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

function groupByCountry(wineList) {

return wineList.reduce((acc, wine) => {

const country = wine.country || "Other";

if (!acc[country]) acc[country] = [];

acc[country].push(wine);

return acc;

}, {});

}

const winesToDisplay = showResults ? filteredWines : wines;

const winesByCountry = groupByCountry(winesToDisplay);

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
onChange={(e)=>updateFilter("grapes",e.target.value)}
>
<option value="">All Grapes</option>
{unique("grapes").map(v => (
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

{/* WINE LIST */}

<div className="max-w-4xl w-full mt-12">

{Object.entries(winesByCountry).map(([country, wines]) => (

<div key={country} className="mb-10">

<h2 className="text-xl font-semibold mb-4 border-b border-slate-700 pb-2">
{country}
</h2>

<div className="space-y-2">

{wines.map((wine) => (

<div
key={wine.id}
onClick={() => setSelectedWine(wine)}
className="flex justify-between items-center py-2 border-b border-slate-800 cursor-pointer hover:text-amber-300 transition"
>

<div>

<div className="font-medium">
{wine.name}
</div>

<div className="text-xs text-slate-400">
{wine.region} · {wine.vintage}
</div>

</div>

<div className="text-amber-400 font-semibold">
€{wine.price}
</div>

</div>

))}

</div>

</div>

))}

</div>

{/* WINE MODAL */}

{selectedWine && (

<div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4">

<div className="bg-white text-gray-900 max-w-4xl w-full rounded-lg shadow-2xl p-10 relative">

<button
onClick={()=>setSelectedWine(null)}
className="absolute top-6 right-6 text-gray-500 hover:text-gray-900 text-xl"
>
✕
</button>

<h2 className="text-2xl font-semibold mb-8">
{selectedWine.name} – {selectedWine.vintage}
</h2>

<div className="border-t border-amber-300 mb-8"></div>

<div className="grid grid-cols-3 gap-10 mb-10 text-sm">

<div className="text-amber-700 font-medium">
Price (Bottle)
</div>

<div className="col-span-2">
€{selectedWine.price} {selectedWine.size}
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

<div className="border-t border-amber-300 mb-8"></div>

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