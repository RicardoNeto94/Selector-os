"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Papa from "papaparse";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import WineEditorModal from "@/components/WineEditorModal";

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

  const [wines, setWines] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [wineType, setWineType] = useState("all");

  const [editingWine, setEditingWine] = useState(null);
  const [inventory, setInventory] = useState([]);

  const [file, setFile] = useState(null);

  const [page, setPage] = useState(1);
  const perPage = 25;

  const [sortColumn, setSortColumn] = useState("name");
  const [sortDirection, setSortDirection] = useState("asc");

  useEffect(() => {
    loadWines();
  }, []);

  async function loadWines() {

    setLoading(true);

    const { data } = await supabase
      .from("wines")
      .select(`
        *,
        wine_inventory(stock)
      `);

    if (!data) {
      setWines([]);
      setLoading(false);
      return;
    }

    const mapped = data.map(w => ({
      ...w,
      stock: w.wine_inventory?.reduce((sum, i) => sum + i.stock, 0) || 0
    }));

    setWines(mapped);
    setLoading(false);
  }

  async function openWine(wine) {

    setEditingWine(wine);

    const { data } = await supabase
      .from("wine_inventory")
      .select("*")
      .eq("wine_id", wine.id);

    setInventory(data || []);
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

  const totalPages = Math.ceil(sorted.length / perPage);

  const paginated = sorted.slice(
    (page - 1) * perPage,
    page * perPage
  );

  const totalWines = wines.length;

  const totalBottles = wines.reduce((sum, w) => sum + w.stock, 0);

  const cellarValue = wines.reduce((sum, w) => {
    return sum + (w.stock * (w.price || 0));
  }, 0);

  async function importCSV() {

    if (!file) return;

    Papa.parse(file, {
      header: true,
      complete: async function(results) {

        for (const row of results.data) {

          await supabase.from("wines").insert({
            name: row.name,
            producer: row.producer,
            region: row.region,
            country: row.country,
            grapes: row.grapes,
            vintage: row.vintage,
            price: row.price
          });

        }

        loadWines();

      }
    });

  }

  return (

    <div className="p-6 space-y-6">

      <div className="flex justify-between items-center">

        <h1 className="text-xl font-semibold">
          Wine Cellar
        </h1>

        <button className="px-4 py-2 bg-blue-600 text-white rounded-md">
          + Add Wine
        </button>

      </div>


      {/* SUMMARY */}

      <div className="grid grid-cols-3 gap-4">

        <div className="bg-white/70 backdrop-blur rounded-xl p-4 border">
          <div className="text-sm text-slate-500">Total Wines</div>
          <div className="text-2xl font-semibold">{totalWines}</div>
        </div>

        <div className="bg-white/70 backdrop-blur rounded-xl p-4 border">
          <div className="text-sm text-slate-500">Total Bottles</div>
          <div className="text-2xl font-semibold">{totalBottles}</div>
        </div>

        <div className="bg-white/70 backdrop-blur rounded-xl p-4 border">
          <div className="text-sm text-slate-500">Cellar Value</div>
          <div className="text-2xl font-semibold">
            €{cellarValue.toLocaleString()}
          </div>
        </div>

      </div>


      {/* IMPORT */}

      <div className="flex gap-3 items-center">

        <input
          type="file"
          onChange={(e)=>setFile(e.target.files[0])}
        />

        <button
          onClick={importCSV}
          className="px-4 py-2 bg-blue-600 text-white rounded-md"
        >
          Import CSV
        </button>

      </div>


      {/* SEARCH */}

      <input
        placeholder="Search wines..."
        value={search}
        onChange={(e)=>setSearch(e.target.value)}
        className="px-3 py-2 border border-slate-300 rounded-md w-[300px]"
      />


      {/* FILTERS */}

      <div className="flex gap-2 flex-wrap">

        {WINE_TYPE_OPTIONS.map(type => (

          <button
            key={type}
            onClick={()=>setWineType(type)}
            className={`px-3 py-1 rounded-md text-sm border
              ${wineType === type ? "bg-slate-800 text-white" : "bg-white"}
            `}
          >
            {type}

          </button>

        ))}

      </div>


      {/* TABLE */}

      <div className="border border-slate-200 rounded-lg overflow-hidden">

        <table className="w-full text-sm">

          <thead className="bg-slate-50 text-slate-600">

            <tr>

              <th onClick={()=>toggleSort("name")} className="cursor-pointer px-4 py-3 text-left">
                Wine
              </th>

              <th onClick={()=>toggleSort("producer")} className="cursor-pointer px-4 py-3 text-left">
                Producer
              </th>

              <th onClick={()=>toggleSort("region")} className="cursor-pointer px-4 py-3 text-left">
                Region
              </th>

              <th onClick={()=>toggleSort("vintage")} className="cursor-pointer px-4 py-3 text-left">
                Vintage
              </th>

              <th onClick={()=>toggleSort("price")} className="cursor-pointer px-4 py-3 text-left">
                Price
              </th>

              <th onClick={()=>toggleSort("stock")} className="cursor-pointer px-4 py-3 text-center">
                Stock
              </th>

            </tr>

          </thead>

          <tbody>

            {loading && (
              <tr>
                <td colSpan="6" className="px-4 py-6 text-center">
                  Loading wines...
                </td>
              </tr>
            )}

            {!loading && paginated.map(wine => (

              <tr
                key={wine.id}
                onClick={()=>openWine(wine)}
                className="hover:bg-slate-50 cursor-pointer transition"
              >

                <td className="px-4 py-3">{wine.name}</td>
                <td className="px-4 py-3">{wine.producer}</td>
                <td className="px-4 py-3">{wine.region}</td>
                <td className="px-4 py-3">{wine.vintage}</td>
                <td className="px-4 py-3">€{wine.price}</td>

                <td className="px-4 py-3 text-center">
                  <StockBadge stock={wine.stock} />
                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>


      {/* PAGINATION */}

      <div className="flex justify-between items-center text-sm">

        <span>
          Page {page} of {totalPages || 1}
        </span>

        <div className="flex gap-2">

          <button
            disabled={page === 1}
            onClick={()=>setPage(page - 1)}
            className="px-3 py-1 border rounded-md disabled:opacity-40"
          >
            Previous
          </button>

          <button
            disabled={page === totalPages}
            onClick={()=>setPage(page + 1)}
            className="px-3 py-1 border rounded-md disabled:opacity-40"
          >
            Next
          </button>

        </div>

      </div>


      {editingWine && (

        <WineEditorModal
          wine={editingWine}
          inventory={inventory}
          setInventory={setInventory}
          reloadWines={loadWines}
          onClose={()=>setEditingWine(null)}
        />

      )}

    </div>

  );

}