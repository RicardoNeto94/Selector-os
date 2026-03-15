"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function WineSelector({ params }) {

const supabase = createClientComponentClient();
const { restaurant, menu } = params;

const [scrolled, setScrolled] = useState(false);

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

useEffect(() => {

const handleScroll = () => {
setScrolled(window.scrollY > 120);
};

window.addEventListener("scroll", handleScroll);

return () => window.removeEventListener("scroll", handleScroll);

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

function groupWineList(wineList) {

const tree = {};

wineList.forEach((wine) => {

const type = wine.wine_type || "Other";
const country = wine.country || "Other";
const region = wine.region || "Other";

if (!tree[type]) tree[type] = {};
if (!tree[type][country]) tree[type][country] = {};
if (!tree[type][country][region]) tree[type][country][region] = [];

tree[type][country][region].push(wine);

});

Object.values(tree).forEach(countries => {
Object.values(countries).forEach(regions => {
Object.values(regions).forEach(wines => {

wines.sort((a,b)=> (a.price || 0) - (b.price || 0));

});
});
});

return tree;

}

const winesToDisplay = showResults ? filteredWines : wines;
const wineTree = groupWineList(winesToDisplay);

return (

<>

{scrolled && (

<div className="fixed top-0 left-0 w-full z-50">

<div className="absolute inset-0 backdrop-blur-xl bg-[#f8f6f1]/70"></div>

<div className="absolute bottom-0 left-0 w-full h-10 bg-gradient-to-b from-transparent to-[#f8f6f1]"></div>

<div className="relative max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">

<img
src="/shangshi-logo.png"
className="h-10 opacity-90 transition-all duration-300"
alt="Shang Shi"
/>

<div className="text-xs tracking-[0.3em] text-[#8b7d63] uppercase">
Wine Selection
</div>

</div>

</div>

)}

<div className="min-h-screen bg-[#f8f6f1] text-[#1c1c1c] flex flex-col items-center px-6 pt-12 pb-20">

<div className="flex flex-col items-center text-center mb-12">

<img
src="/shangshi-logo.png"
className="h-28 mb-6"
alt="Shang Shi logo"
/>

<p className="text-sm tracking-[0.25em] text-[#8b7d63] uppercase">
Wine Selection
</p>

<div className="w-20 h-[1px] bg-[#c9a96a] mt-4"></div>

</div>

{showResults && (
<button
onClick={resetFilters}
className="mb-6 text-sm text-gray-600 hover:text-black"
>
← Back to Filters
</button>
)}

{!showResults && (

<>

<div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-xl w-full">

<select
className="bg-white border border-[#e5e0d6] rounded-lg px-4 py-2 text-sm"
onChange={(e)=>updateFilter("wine_type",e.target.value)}
>
<option value="">All Wine Types</option>
{unique("wine_type").map(v => (
<option key={v}>{v}</option>
))}
</select>

<select
className="bg-white border border-[#e5e0d6] rounded-lg px-4 py-2 text-sm"
onChange={(e)=>updateFilter("country",e.target.value)}
>
<option value="">All Countries</option>
{unique("country").map(v => (
<option key={v}>{v}</option>
))}
</select>

<select
className="bg-white border border-[#e5e0d6] rounded-lg px-4 py-2 text-sm"
onChange={(e)=>updateFilter("region",e.target.value)}
>
<option value="">All Regions</option>
{unique("region").map(v => (
<option key={v}>{v}</option>
))}
</select>

<select
className="bg-white border border-[#e5e0d6] rounded-lg px-4 py-2 text-sm"
onChange={(e)=>updateFilter("grapes",e.target.value)}
>
<option value="">All Grapes</option>
{unique("grapes").map(v => (
<option key={v}>{v}</option>
))}
</select>

<input
className="bg-white border border-[#e5e0d6] rounded-lg px-4 py-2 md:col-span-2 text-sm"
placeholder="Search wine name"
onChange={(e)=>updateFilter("name",e.target.value)}
/>

</div>

<button
onClick={applyFilters}
className="mt-8 border border-[#c9a96a] text-[#8b6b33] px-6 py-2 text-sm tracking-wide hover:bg-[#c9a96a]/10 transition"
>
Show Selection
</button>

</>

)}

{showResults && (

<div className="max-w-4xl w-full mt-10 space-y-8">

{Object.entries(wineTree).map(([type, countries]) => (

<div key={type}>

<h2 className="text-sm tracking-[0.35em] uppercase text-[#8b7d63] mb-6 pb-2 border-b border-[#d9c7a3]">
{type} wines
</h2>

{Object.entries(countries).map(([country, regions]) => (

<div key={country} className="mb-6">

<h3 className="text-base font-semibold text-[#2b2b2b] mb-2 tracking-wide">
{country}
</h3>

{Object.entries(regions).map(([region, wines]) => (

<div key={region} className="mb-4">

<div className="text-xs uppercase tracking-[0.18em] text-[#8b7d63] mb-2">
{region}
</div>

<div className="space-y-1">

{wines.map((wine) => (

<div
key={wine.id}
onClick={()=>setSelectedWine(wine)}
className="flex justify-between items-center py-2 border-b border-[#ece6da] cursor-pointer hover:text-[#b89656] transition"
>

<div>

<div className="text-[15px] font-medium font-serif">
{wine.name}
</div>

<div className="text-xs text-gray-500">
{wine.vintage}
</div>

</div>

<div className="text-[#b89656] font-semibold tabular-nums">
€{wine.price}
</div>

</div>

))}

</div>

</div>

))}

</div>

))}

</div>

))}

</div>

)}

{selectedWine && (

<div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">

<div className="bg-white text-gray-900 max-w-3xl w-full rounded-lg shadow-xl p-10 relative">

<button
onClick={()=>setSelectedWine(null)}
className="absolute top-6 right-6 text-gray-500 hover:text-gray-900 text-xl"
>
✕
</button>

<h2 className="text-xl font-semibold mb-8 font-serif">
{selectedWine.name} – {selectedWine.vintage}
</h2>

<div className="border-t border-[#d9c7a3] mb-8"></div>

<div className="grid grid-cols-3 gap-10 mb-10 text-sm">

<div className="text-[#8b6b33] font-medium">
Price
</div>

<div className="col-span-2">
€{selectedWine.price} {selectedWine.size}
</div>

<div className="text-[#8b6b33] font-medium">
Grape
</div>

<div className="col-span-2">
{selectedWine.grapes}
</div>

<div className="text-[#8b6b33] font-medium">
Region
</div>

<div className="col-span-2">
{selectedWine.country} → {selectedWine.region} → {selectedWine.subregion}
</div>

</div>

<div className="border-t border-[#d9c7a3] mb-8"></div>

<div>

<div className="text-[#8b6b33] font-medium mb-3">
Description
</div>

<p className="leading-relaxed text-gray-700 text-sm">
{selectedWine.description}
</p>

</div>

</div>

</div>

)}

</div>

</>

);
}