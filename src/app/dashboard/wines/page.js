"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";import Papa from "papaparse";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

const WINE_TYPE_OPTIONS = [
  "all",
  "sparkling",
  "white",
  "rose",
  "red",
  "orange",
  "dessert",
  "fortified",
];

function StockBadge({ stock }) {

  let color = "bg-green-100 text-green-700";

  if (stock <= 6) color = "bg-orange-100 text-orange-700";
  if (stock === 0) color = "bg-red-100 text-red-700";

  return (
    <span className={`px-2 py-1 rounded-md text-xs font-medium ${color}`}>
      {stock}
    </span>
  );
}

export default function WinesPage() {

  const supabase = createClientComponentClient();
const router = useRouter();
  const [wines, setWines] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [wineType, setWineType] = useState("all");

  const [file, setFile] = useState(null);

  const [importing, setImporting] = useState(false);

const [importProgress, setImportProgress] = useState(0);

const [importTotal, setImportTotal] = useState(0);

const [importCurrent, setImportCurrent] = useState(0);

const [sortColumn, setSortColumn] = useState("name");
const [sortDirection, setSortDirection] = useState("asc");

const [showLocationsModal, setShowLocationsModal] = useState(false);

const [locations, setLocations] = useState([]);

const [newLocation, setNewLocation] = useState({
  name: "",
  location_type: "storage",
  restaurant_id: "",
  parent_location_id: ""
});
  useEffect(() => {

  loadWines();

}, []);


  async function loadWines() {

  setLoading(true);

  const { data } = await supabase
    .from("wines")
    .select(`
      *,
      wine_inventory(
  id,
  quantity,
  location_id,

  wine_locations(
    id,
    name,
    restaurant_id
  )
)
  `)
    .eq("is_active", true);

  if (!data) {
    setWines([]);
    setLoading(false);
    return;
  }

  const mapped = data.map(w => ({

    ...w,

    stock:
      w.wine_inventory?.reduce(
        (sum, i) => sum + (i.quantity || 0),
        0
      ) || 0

  }));

  setWines(mapped);

  setLoading(false);
}

async function loadLocations() {

  const { data, error } =
    await supabase
      .from("wine_locations")
      .select("*")
      .order("name", {
        ascending: true
      });

  if (error) {

    console.error(error);
    return;

  }

  setLocations(data || []);

}

async function createLocation() {

  if (!newLocation.name) return;

  const slug = newLocation.name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");

  const { error } = await supabase
    .from("wine_locations")
    .insert({
  name: newLocation.name,
  slug,
  location_type: newLocation.location_type,
  restaurant_id:
    newLocation.restaurant_id || null,
  parent_location_id:
    newLocation.parent_location_id || null,
  is_active: true
});

  if (error) {
    console.error(error);
    return;
  }

  setNewLocation({
    name: "",
    location_type: "storage",
    restaurant_id: "",
    parent_location_id: ""
  });

  loadLocations();
}

  function filteredWines() {

    const q = search.toLowerCase();

    return wines.filter(w => {

      return (
        w.name?.toLowerCase().includes(q) ||
        w.producer?.toLowerCase().includes(q) ||
        w.region?.toLowerCase().includes(q) ||
        w.country?.toLowerCase().includes(q)
      );

    });

  }

  function sortedWines(list) {

    return [...list].sort((a, b) => {

      let valA = a[sortColumn];
      let valB = b[sortColumn];

      if (sortColumn === "stock") {
        valA = a.stock;
        valB = b.stock;
      }

      if (typeof valA === "string") valA = valA.toLowerCase();
      if (typeof valB === "string") valB = valB.toLowerCase();

      if (valA < valB) return sortDirection === "asc" ? -1 : 1;
      if (valA > valB) return sortDirection === "asc" ? 1 : -1;

      return 0;

    });

  }

  function toggleSort(column) {

    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }

  }

  const filtered = filteredWines();
  const sorted = sortedWines(filtered);

  const paginated = sorted;

  const totalWines = wines.length;

  const totalBottles = wines.reduce((sum, w) => sum + w.stock, 0);

  const cellarValue = wines.reduce((sum, w) => {
    return sum + (w.stock * (w.price || 0));
  }, 0);
const wineTypeStats = {};

wines.forEach((wine) => {

  const type = (wine.wine_type || "unknown").toLowerCase();

  if (!wineTypeStats[type]) {
    wineTypeStats[type] = 0;
  }

  wineTypeStats[type] += wine.stock;

});

const totalWineTypeBottles = Object.values(wineTypeStats)
  .reduce((a, b) => a + b, 0);
  async function importCSV() {

  console.log("IMPORT STARTED", file);

  if (!file) return;

  setImporting(true);

  setImportProgress(0);

  setImportCurrent(0);

  Papa.parse(file, {

    header: true,

    complete: async function(results) {

      setImportTotal(results.data.length);

      for (const [index, row] of results.data.entries()) {

        setImportCurrent(index + 1);

        setImportProgress(
          Math.round(
            ((index + 1) / results.data.length) * 100
          )
        );

        const wineName =
          row["Wine"]?.trim();

        const producer =
          row["Producer"]?.trim();

        const qtyLocations =
          row["Qty. Location"]?.trim();

        if (!wineName || !qtyLocations) {
          continue;
        }

        const sku =
          row["SKU"]?.trim();

        if (!sku) {

          console.log(
            "Missing SKU:",
            wineName
          );

          continue;

        }

        // TRY SKU MATCH FIRST

        let { data: wine } = await supabase
          .from("wines")
          .select("id, sku")
          .eq("sku", sku)
          .maybeSingle();

        // FALLBACK TO NAME + PRODUCER

        if (!wine) {

          const { data: fallbackWine } =
            await supabase
              .from("wines")
              .select("id, sku")
              .eq("name", wineName)
              .eq("producer", producer || "")
              .maybeSingle();

          if (fallbackWine) {

            wine = fallbackWine;

            // SAVE SKU INTO DATABASE

            await supabase
              .from("wines")
              .update({
                sku
              })
              .eq("id", wine.id);

            console.log(
              "SKU linked:",
              wineName,
              sku
            );

          }

        }

        // STILL NOT FOUND

        if (!wine) {

          console.log(
            "Wine not found:",
            wineName,
            producer
          );

          continue;

        }

        // LOCATION MAP

        const LOCATION_MAP = {

          MS: "Main Cellar",
          MF: "Main Cellar",

          SS: "Shang Shi",

          K: "Koyo",
          KY: "Koyo",

          E: "Ecrin",
          FD: "Fox Den",
          BC: "Bombay Club",
          PC: "Peacock"

        };

        // SPLIT LOCATIONS

        const splitLocations =
          qtyLocations.split(",");

        for (const entry of splitLocations) {

          const [codeRaw, qtyRaw] =
            entry.split(":");

          if (!codeRaw || !qtyRaw) {
            continue;
          }

          const code =
            codeRaw.trim();

          const quantity =
            Number(qtyRaw.trim());

          const locationName =
            LOCATION_MAP[code];

          if (!locationName) {

            console.log(
              "Unknown location code:",
              code
            );

            continue;

          }

          // FIND LOCATION

          const { data: location } =
            await supabase
              .from("wine_locations")
              .select("id")
              .eq("name", locationName)
              .limit(1)
              .single();

          if (!location) {

            console.log(
              "Location not found:",
              locationName
            );

            continue;

          }

          // CHECK EXISTING INVENTORY

          const { data: existingInventory } =
            await supabase
              .from("wine_inventory")
              .select("id")
              .eq("wine_id", wine.id)
              .eq("location_id", location.id)
              .maybeSingle();

          // UPDATE EXISTING

          if (existingInventory) {

            await supabase
              .from("wine_inventory")
              .update({
                quantity
              })
              .eq(
                "id",
                existingInventory.id
              );

          }

          // CREATE NEW

          else {

            await supabase
              .from("wine_inventory")
              .insert({
                wine_id: wine.id,
                location_id: location.id,
                quantity
              });

          }

        }

      }

      loadWines();

      setImporting(false);

      alert(
        "Inventory synchronization completed."
      );

    }

  });

}


  return (

  <div className="max-w-[1600px] mx-auto px-8 py-8 space-y-5">

    {/* HEADER */}

    <div className="flex items-start justify-between gap-8">

  {/* LEFT */}

  <div>

    <div className="so-title">
      Wine Cellar
    </div>

    <div className="so-sub mt-1">
      Inventory, collections and cellar management
    </div>

  </div>

  {/* RIGHT */}

  <div className="flex items-center gap-3">

    <button
      onClick={() => router.push("/dashboard/wines/new")}
      className="so-btn-primary"
    >
      + Add Wine
    </button>

    <div className="flex items-center gap-2">

      <label className="
        px-4 py-2
        rounded-xl
        border border-[#e7ddd3]
        bg-white/80
        text-sm
        text-slate-600
        hover:bg-white
        transition-all
        cursor-pointer
      ">

        Upload CSV

        <input
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) =>
            setFile(e.target.files?.[0] || null)
          }
        />

      </label>

      <button
        onClick={importCSV}
        className="so-btn-ghost"
      >
        Sync
      </button>

      <button
        onClick={() => {
          setShowLocationsModal(true);
          loadLocations();
        }}
        className="so-btn-ghost"
      >
        Locations
      </button>

      <button
        onClick={() =>
          router.push("/dashboard/wine-menus")
        }
        className="so-btn-ghost"
      >
        Menus
      </button>

    </div>

  </div>

</div>

{importing && (       

  <div className="
    bg-white/80
    border border-[#efe7df]
    rounded-[24px]
    p-5
    backdrop-blur-sm
  ">

    <div className="flex items-center justify-between mb-3">

      <div className="text-[#3a2a24] font-medium">
        Syncing inventory...
      </div>

      <div className="text-sm text-slate-500">
        {importProgress}%
      </div>

    </div>

    <div className="
      w-full
      h-3
      rounded-full
      bg-[#efe7df]
      overflow-hidden
    ">

      <div
        className="
          h-full
          bg-[#8a3a2c]
          transition-all
          duration-300
        "
        style={{
          width: `${importProgress}%`
        }}
      />

    </div>

    <div className="mt-3 text-sm text-slate-500">

      {importCurrent} / {importTotal} wines processed

    </div>

  </div>

)}
    {/* SEARCH */}

    <div className="flex flex-wrap gap-3 items-center">

      <input
        placeholder="Search wines, producers, regions..."
        value={search}
        onChange={(e)=>setSearch(e.target.value)}
        className="so-input flex-1 min-w-[320px]"
      />

      <div className="
  flex items-center
  bg-white/75
  border border-[#efe7df]
  rounded-[18px]
  p-1
  overflow-x-auto
">

  {WINE_TYPE_OPTIONS.map(type => (

    <button
      key={type}
      onClick={() => setWineType(type)}
      className={`
        px-4 py-2
        rounded-[14px]
        text-sm
        whitespace-nowrap
        transition-all

        ${
          wineType === type
            ? "bg-[#8a3a2c] text-white shadow-sm"
            : "text-slate-500 hover:text-[#3a2a24]"
        }
      `}
    >
      {type}
    </button>

  ))}

</div>

    </div>

    {/* HERO */}
    <div
  onClick={() =>
    router.push("/dashboard/wine-cellar/inventory")
  }
  className="
    so-dashboard-card
    cursor-pointer
    hover:scale-[1.01]
    transition-all
  "
>

  <div className="flex items-center justify-between">

    <div>

      <div className="so-dashboard-title">
        Inventory Explorer
      </div>

      <div className="so-dashboard-sub mt-2">
        Manage stock, locations and cellar operations
      </div>

    </div>

    <div className="
      px-5 py-3
      rounded-2xl
      bg-[#8a3a2c]
      text-white
      text-sm
      font-medium
    ">
      Open →
    </div>

  </div>

</div>

    <div className="grid grid-cols-1 xl:grid-cols-[0.9fr_1.1fr] gap-5">

      {/* OVERVIEW */}

      <div className="so-dashboard-card">

        <div className="text-xl font-medium text-[#8a3a2c] mb-1">
          Cellar Overview
        </div>

        <div className="so-sub mb-6">
          Inventory intelligence across all venues
        </div>

        <div className="grid grid-cols-2 gap-4">

          <div className="bg-white rounded-2xl border border-[#efe7df] p-5">
            <div className="text-sm text-slate-500">
              Total Bottles
            </div>

            <div className="text-3xl mt-2 font-semibold">
              {totalBottles}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#efe7df] p-5">
            <div className="text-sm text-slate-500">
              Cellar Value
            </div>

            <div className="text-3xl mt-2 font-semibold">
              €{cellarValue.toLocaleString()}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#efe7df] p-5">
            <div className="text-sm text-slate-500">
              Producers
            </div>

            <div className="text-3xl mt-2 font-semibold">
              {new Set(wines.map(w => w.producer)).size}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#efe7df] p-5">
            <div className="text-sm text-slate-500">
              Low Stock
            </div>

            <div className="text-3xl mt-2 font-semibold">
              {wines.filter(w => w.stock <= 6).length}
            </div>
          </div>

        </div>

      </div>

      {/* CELLAR IMAGE */}

      <div className="so-card overflow-hidden p-0">

        <img
          src="https://images.unsplash.com/photo-1516594915697-87eb3b1c14ea?q=80&w=1600&auto=format&fit=crop"
          className="w-full h-[220px] object-cover"
        />

        <div className="px-6 py-5">

          <div className="flex items-center justify-between">

            <div>

              <div className="text-lg font-medium text-[#8a3a2c]">
                Burman Cellar
              </div>

              <div className="so-sub mt-1">
                Climate and storage monitoring
              </div>

            </div>

            <div className="text-emerald-600 text-sm font-medium">
              ● Optimal
            </div>

          </div>

          <div className="grid grid-cols-4 gap-6 mt-6">

            <div>
              <div className="text-xs text-slate-400 uppercase tracking-[0.14em]">
                Temperature
              </div>

              <div className="mt-2 text-lg font-medium">
                12.6°C
              </div>
            </div>

            <div>
              <div className="text-xs text-slate-400 uppercase tracking-[0.14em]">
                Humidity
              </div>

              <div className="mt-2 text-lg font-medium">
                62%
              </div>
            </div>

            <div>
              <div className="text-xs text-slate-400 uppercase tracking-[0.14em]">
                Zones
              </div>

              <div className="mt-2 text-lg font-medium">
                4
              </div>
            </div>

            <div>
              <div className="text-xs text-slate-400 uppercase tracking-[0.14em]">
                Alerts
              </div>

              <div className="mt-2 text-lg font-medium">
                2
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>

    {/* ANALYTICS */}

    

    {/* EDITORIAL LIST */}

    {/* DASHBOARD CONTENT */}

<div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-5">

  {/* RECENT ADDITIONS */}

  <div className="so-card">

    <div className="flex items-center justify-between mb-6">

      <div>

        <div className="so-dashboard-title">
          Recent Additions
        </div>

        <div className="so-dashboard-sub mt-1">
          Latest wines added to the cellar
        </div>

      </div>

      <button className="so-btn-ghost">
        View All
      </button>

    </div>

    <div className="space-y-2">

      {paginated.slice(0, 8).map((wine) => (

        <div
          key={wine.id}
          onClick={() =>
  router.push("/dashboard/wine-cellar/inventory")
}
          className="so-dashboard-wine-row"
        >

          <img
            src="https://images.unsplash.com/photo-1569919659476-f0852f6834b7?q=80&w=400&auto=format&fit=crop"
            className="so-dashboard-wine-thumb"
          />

          <div className="flex-1 min-w-0">

            <div className="so-dashboard-wine-name">
              {wine.name}
            </div>

            <div className="so-dashboard-wine-meta">
              {wine.producer}
            </div>

          </div>

          <div className="text-right">

            <div className="so-dashboard-price">
              €{wine.price || 0}
            </div>

            <div className="so-dashboard-stock">
              {wine.stock} bottles
            </div>

          </div>

        </div>

      ))}

    </div>

  </div>

  {/* STOCK ALERTS */}

  <div className="space-y-5">

    <div className="so-card">

      <div className="so-title mb-1">
        Stock Alerts
      </div>

      <div className="so-sub mb-5">
        Wines requiring operational attention
      </div>

      <div className="space-y-3">

        {wines
          .filter(w => w.stock <= 6)
          .slice(0, 6)
          .map((wine) => (

            <div
              key={wine.id}
              className="so-alert-row"
            >

              <div>

                <div className="so-alert-name">
                  {wine.name}
                </div>

                <div className="so-alert-meta">
                  {wine.producer}
                </div>

              </div>

              <div className="
                so-soft-pill
                so-soft-pill--low
              ">
                {wine.stock}
              </div>

            </div>

        ))}

      </div>

    </div>

    {/* CATEGORY BREAKDOWN */}

    <div className="so-card">

      <div className="so-title mb-1">
        Inventory by Category
      </div>

      <div className="so-sub mb-5">
        Cellar composition overview
      </div>

      <div className="space-y-4">

        {Object.entries(wineTypeStats)
          .slice(0, 5)
          .map(([type, qty]) => {

            const percentage =
              totalWineTypeBottles
                ? ((qty / totalWineTypeBottles) * 100).toFixed(1)
                : 0;

            return (

              <div key={type}>

                <div className="flex items-center justify-between mb-2">

                  <div className="capitalize text-sm font-medium">
                    {type}
                  </div>

                  <div className="text-sm text-slate-500">
                    {percentage}%
                  </div>

                </div>

                <div className="so-progress">

                  <div
                    className="so-progress-bar"
                    style={{
                      width: `${percentage}%`
                    }}
                  />

                </div>

              </div>

            );

        })}

      </div>

    </div>

  </div>

</div>


  </div>

);

}     
  