"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Papa from "papaparse";
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

  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);

  const [sortColumn, setSortColumn] = useState("name");
  const [sortDirection, setSortDirection] = useState("asc");

  const [editingWine, setEditingWine] = useState(null);
  const [saving, setSaving] = useState(false);

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
      .eq("restaurant_id", restaurantData.id);

    if (error) console.error(error);

    setWines(winesData || []);
    setLoading(false);
  }

  function toggleSort(column) {

    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }

  }

  async function importCSV() {

    if (!file || !restaurant) return;

    setImporting(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async function(results) {

        const rows = results.data;

        const winesToInsert = rows
          .filter(row => row.name && row.name.trim() !== "")
          .map(row => {

            const cleanPrice = row.price
              ? parseFloat(row.price.toString().replace(",", ".").replace(/[^\d.]/g, ""))
              : null;

            const cleanStock = row.stock
              ? parseInt(row.stock.toString().replace(/[^\d]/g, ""))
              : 0;

            const cleanVintage = row.vintage
              ? parseInt(row.vintage.toString().replace(/[^\d]/g, ""))
              : null;

            return {
              restaurant_id: restaurant.id,
              name: row.name.trim(),
              producer: row.producer?.trim() || null,
              country: row.country?.trim() || null,
              region: row.region?.trim() || null,
              subregion: row.subregion?.trim() || null,
              grapes: row.grapes?.trim() || null,
              wine_type: row.wine_type ? row.wine_type.toLowerCase().trim() : null,
              vintage: cleanVintage,
              size: row.size?.trim() || "75cl",
              price: isNaN(cleanPrice) ? null : cleanPrice,
              stock: isNaN(cleanStock) ? 0 : cleanStock,
              description: row.description?.trim() || null,
              notes: row.notes?.trim() || null
            };

          });

        const { error } = await supabase
          .from("wines")
          .insert(winesToInsert);

        if (error) {
          console.error(error);
          alert("Import failed — check console");
        } else {
          alert(`Imported ${winesToInsert.length} wines`);
          loadWines();
        }

        setImporting(false);
      }
    });
  }

  async function updateStock(wineId, currentStock, change) {

    const newStock = Math.max(0, (currentStock || 0) + change);

    const { error } = await supabase
      .from("wines")
      .update({ stock: newStock })
      .eq("id", wineId);

    if (error) return console.error(error);

    setWines(prev =>
      prev.map(w =>
        w.id === wineId ? { ...w, stock: newStock } : w
      )
    );
  }

  async function deleteWine(wineId) {

    if (!confirm("Remove this wine from the cellar?")) return;

    await supabase
      .from("wines")
      .delete()
      .eq("id", wineId);

    setWines(prev => prev.filter(w => w.id !== wineId));
  }

  async function saveWine() {

    if (!editingWine) return;

    setSaving(true);

    const { id, ...updates } = editingWine;

    const { error } = await supabase
      .from("wines")
      .update(updates)
      .eq("id", id);

    if (error) {
      console.error(error);
      alert("Failed to update wine");
      setSaving(false);
      return;
    }

    setWines(prev =>
      prev.map(w => w.id === id ? editingWine : w)
    );

    setSaving(false);
    setEditingWine(null);
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
    )
    .sort((a, b) => {

      const valA = a[sortColumn] ?? "";
      const valB = b[sortColumn] ?? "";

      if (valA < valB) return sortDirection === "asc" ? -1 : 1;
      if (valA > valB) return sortDirection === "asc" ? 1 : -1;
      return 0;

    });

  const totalPages = Math.ceil(filtered.length / perPage);

  const paginated = filtered.slice(
    (page - 1) * perPage,
    page * perPage
  );

  function sortIndicator(col) {
    if (sortColumn !== col) return "";
    return sortDirection === "asc" ? " ↑" : " ↓";
  }

  if (loading) {
    return <div className="page-fade text-slate-400">Loading wines…</div>;
  }

  return (
    <div className="page-fade space-y-6">

      <div className="flex items-center justify-between">

        <h1 className="text-2xl font-semibold text-white">
          Wine Cellar
        </h1>

        <a href="/dashboard/wines/new" className="so-btn-primary">
          + Add Wine
        </a>

      </div>

      {/* CSV IMPORT */}

      <div className="flex items-center gap-3">

        <input
          type="file"
          accept=".csv"
          onChange={(e) => setFile(e.target.files[0])}
        />

        <button
          onClick={importCSV}
          disabled={!file || importing}
          className="so-btn-primary"
        >
          {importing ? "Importing..." : "Import CSV"}
        </button>

      </div>

      {/* SEARCH */}

      <input
        type="text"
        placeholder="Search wines..."
        value={search}
        onChange={e => {
          setSearch(e.target.value);
          setPage(1);
        }}
        className="w-full max-w-md rounded-full bg-slate-800/60 border border-slate-700 px-5 py-2 text-sm text-white"
      />

      <div className="so-card overflow-x-auto">

        <table className="w-full text-sm">

          <thead className="border-b border-slate-700 text-slate-400">

            <tr>

              <th className="py-3 px-4 cursor-pointer" onClick={() => toggleSort("name")}>
                Wine{sortIndicator("name")}
              </th>

              <th className="py-3 px-4 cursor-pointer" onClick={() => toggleSort("producer")}>
                Producer{sortIndicator("producer")}
              </th>

              <th className="py-3 px-4 cursor-pointer" onClick={() => toggleSort("region")}>
                Region{sortIndicator("region")}
              </th>

              <th className="py-3 px-4 cursor-pointer" onClick={() => toggleSort("vintage")}>
                Vintage{sortIndicator("vintage")}
              </th>

              <th className="py-3 px-4 cursor-pointer" onClick={() => toggleSort("price")}>
                Price{sortIndicator("price")}
              </th>

              <th className="py-3 px-4 cursor-pointer" onClick={() => toggleSort("stock")}>
                Stock{sortIndicator("stock")}
              </th>

              <th></th>

            </tr>

          </thead>

          <tbody>

            {paginated.map(wine => (

              <tr
                key={wine.id}
                onClick={() => setEditingWine(wine)}
                className="border-b border-slate-800 hover:bg-slate-800/40 cursor-pointer"
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

                <td></td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

      {/* MODAL */}

      {editingWine && (

      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">

        <div className="bg-slate-900 border border-slate-700 rounded-xl w-[600px] p-6 space-y-3">

          <h2 className="text-xl font-semibold text-white">Edit Wine</h2>

          <input className="so-input" value={editingWine.name || ""} onChange={e=>setEditingWine({...editingWine,name:e.target.value})}/>
          <input className="so-input" value={editingWine.producer || ""} onChange={e=>setEditingWine({...editingWine,producer:e.target.value})}/>
          <input className="so-input" value={editingWine.country || ""} onChange={e=>setEditingWine({...editingWine,country:e.target.value})}/>
          <input className="so-input" value={editingWine.region || ""} onChange={e=>setEditingWine({...editingWine,region:e.target.value})}/>
          <input className="so-input" value={editingWine.grapes || ""} onChange={e=>setEditingWine({...editingWine,grapes:e.target.value})}/>
          <input type="number" className="so-input" value={editingWine.vintage || ""} onChange={e=>setEditingWine({...editingWine,vintage:e.target.value})}/>
          <input type="number" className="so-input" value={editingWine.price || ""} onChange={e=>setEditingWine({...editingWine,price:e.target.value})}/>
          <input type="number" className="so-input" value={editingWine.stock || ""} onChange={e=>setEditingWine({...editingWine,stock:e.target.value})}/>

          <textarea className="so-input" value={editingWine.description || ""} onChange={e=>setEditingWine({...editingWine,description:e.target.value})}/>
          <textarea className="so-input" value={editingWine.notes || ""} onChange={e=>setEditingWine({...editingWine,notes:e.target.value})}/>

          <div className="flex justify-end gap-3 pt-4">

            <button
              onClick={() => setEditingWine(null)}
              className="px-4 py-2 bg-slate-800 rounded"
            >
              Cancel
            </button>

            <button
              onClick={saveWine}
              className="so-btn-primary"
            >
              {saving ? "Saving..." : "Save"}
            </button>

          </div>

        </div>

      </div>

      )}

    </div>
  );
}