"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Papa from "papaparse";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

const WINE_TYPE_OPTIONS = [
  "sparkling",
  "white",
  "rose",
  "red",
  "orange",
  "dessert",
  "fortified",
];

const BOTTLE_SIZE_OPTIONS = [
  "37.5cl",
  "75cl",
  "150cl",
  "300cl",
  "600cl",
];

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

  const [inventory, setInventory] = useState([]);

  useEffect(() => {
    loadWines();
  }, []);

  useEffect(() => {
    if (!editingWine) return;

    function handleKeyDown(e) {
      if (e.key === "Escape") {
        setEditingWine(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editingWine]);

  async function loadWines() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

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

  async function openWineEditor(wine) {
    setEditingWine(wine);

    const { data } = await supabase
      .from("wine_inventory")
      .select("*")
      .eq("wine_id", wine.id);

    setInventory(data || []);
  }

  function toggleSort(column) {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  }

  function sortIndicator(col) {
    if (sortColumn !== col) return "";
    return sortDirection === "asc" ? " ↑" : " ↓";
  }

  async function importCSV() {
    if (!file || !restaurant) return;

    setImporting(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async function (results) {
        const rows = results.data;

        const winesToInsert = rows
          .filter((row) => row.name && row.name.trim() !== "")
          .map((row) => {
            const cleanPrice = row.price
              ? parseFloat(
                  row.price.toString().replace(",", ".").replace(/[^\d.]/g, "")
                )
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
              wine_type: row.wine_type
                ? row.wine_type.toLowerCase().trim()
                : null,
              vintage: cleanVintage,
              size: row.size?.trim() || "75cl",
              price: isNaN(cleanPrice) ? null : cleanPrice,
              stock: isNaN(cleanStock) ? 0 : cleanStock,
              description: row.description?.trim() || null,
              notes: row.notes?.trim() || null,
            };
          });

        const { error } = await supabase.from("wines").insert(winesToInsert);

        if (error) {
          console.error(error);
          alert("Import failed — check console");
        } else {
          alert(`Imported ${winesToInsert.length} wines`);
          loadWines();
          setFile(null);
        }

        setImporting(false);
      },
    });
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

    setWines((prev) =>
      prev.map((w) => (w.id === wineId ? { ...w, stock: newStock } : w))
    );

    if (editingWine?.id === wineId) {
      setEditingWine((prev) => ({ ...prev, stock: newStock }));
    }
  }

  async function updateLocationStock(locationId, change) {
    const item = inventory.find((i) => i.id === locationId);
    if (!item) return;

    const newStock = Math.max(0, item.stock + change);

    await supabase
      .from("wine_inventory")
      .update({ stock: newStock })
      .eq("id", locationId);

    const updated = inventory.map((i) =>
      i.id === locationId ? { ...i, stock: newStock } : i
    );

    setInventory(updated);

    const total = updated.reduce((sum, i) => sum + i.stock, 0);

    await supabase.from("wines").update({ stock: total }).eq("id", editingWine.id);

    setEditingWine((prev) => ({ ...prev, stock: total }));

    setWines((prev) =>
      prev.map((w) => (w.id === editingWine.id ? { ...w, stock: total } : w))
    );
  }

  function totalInventoryStock() {
    return inventory.reduce((sum, item) => sum + (item.stock || 0), 0);
  }

  async function deleteWine(wineId) {
    if (!confirm("Remove this wine from the cellar?")) return;

    const { error } = await supabase.from("wines").delete().eq("id", wineId);

    if (error) {
      console.error(error);
      alert("Failed to delete wine");
      return;
    }

    setWines((prev) => prev.filter((w) => w.id !== wineId));

    if (editingWine?.id === wineId) {
      setEditingWine(null);
    }
  }

  async function saveWine() {
    if (!editingWine) return;

    setSaving(true);

    const { id, ...updates } = editingWine;

    const normalizedUpdates = {
      ...updates,
      wine_type: editingWine.wine_type || null,
      size: editingWine.size || null,
      vintage:
        editingWine.vintage === "" || editingWine.vintage == null
          ? null
          : Number(editingWine.vintage),
      price:
        editingWine.price === "" || editingWine.price == null
          ? null
          : Number(editingWine.price),
      stock:
        editingWine.stock === "" || editingWine.stock == null
          ? 0
          : Number(editingWine.stock),
    };

    const { error } = await supabase
      .from("wines")
      .update(normalizedUpdates)
      .eq("id", id);

    if (error) {
      console.error(error);
      alert("Failed to update wine");
      setSaving(false);
      return;
    }

    setWines((prev) =>
      prev.map((w) => (w.id === id ? { ...w, ...normalizedUpdates } : w))
    );

    setSaving(false);
    setEditingWine(null);
  }

  function getStockStatus(stock) {
    if (!stock || stock === 0) return "text-red-400";
    if (stock <= 3) return "text-amber-400";
    return "text-emerald-400";
  }

  function prettyWineType(value) {
    if (!value) return "Uncategorized";
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  const filtered = wines
    .filter(
      (w) =>
        wineType === "all" ||
        (w.wine_type || "").toLowerCase() === wineType.toLowerCase()
    )
    .filter((w) =>
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

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  if (loading) {
    return <div className="page-fade text-slate-400">Loading wines…</div>;
  }

  return (
    <div className="page-fade space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-white">Wine Cellar</h1>

        <a href="/dashboard/wines/new" className="so-btn-primary">
          + Add Wine
        </a>
      </div>

      <div className="flex items-center gap-3">
        <input
          type="file"
          accept=".csv"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />

        <button
          onClick={importCSV}
          disabled={!file || importing}
          className="so-btn-primary"
        >
          {importing ? "Importing..." : "Import CSV"}
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {[
          ["all", "All"],
          ["sparkling", "Sparkling"],
          ["white", "White"],
          ["rose", "Rosé"],
          ["red", "Red"],
          ["orange", "Orange"],
          ["dessert", "Dessert"],
          ["fortified", "Fortified"],
        ].map(([value, label]) => (
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

      <div className="flex justify-start">
        <div className="relative w-full max-w-md">
          <input
            type="text"
            placeholder="Search wines, producer, region..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-full bg-slate-800/60 border border-slate-700 px-5 py-2 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
          />
        </div>
      </div>

      <div className="so-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-700 text-slate-400">
            <tr>
              <th
                className="py-3 px-4 cursor-pointer text-left"
                onClick={() => toggleSort("name")}
              >
                Wine{sortIndicator("name")}
              </th>

              <th
                className="py-3 px-4 cursor-pointer text-left"
                onClick={() => toggleSort("producer")}
              >
                Producer{sortIndicator("producer")}
              </th>

              <th
                className="py-3 px-4 cursor-pointer text-left"
                onClick={() => toggleSort("region")}
              >
                Region{sortIndicator("region")}
              </th>

              <th
                className="py-3 px-4 cursor-pointer text-left"
                onClick={() => toggleSort("vintage")}
              >
                Vintage{sortIndicator("vintage")}
              </th>

              <th
                className="py-3 px-4 cursor-pointer text-left"
                onClick={() => toggleSort("price")}
              >
                Price{sortIndicator("price")}
              </th>

              <th
                className="py-3 px-4 cursor-pointer text-left"
                onClick={() => toggleSort("stock")}
              >
                Stock{sortIndicator("stock")}
              </th>

              <th className="py-3 px-4 text-left"></th>
            </tr>
          </thead>

          <tbody>
            {paginated.map((wine) => (
              <tr
                key={wine.id}
                onClick={() => openWineEditor(wine)}
                className="border-b border-slate-800 hover:bg-slate-800/40 cursor-pointer"
              >
                <td className="py-3 px-4 text-white font-medium">
                  {wine.name}
                </td>

                <td className="py-3 px-4 text-slate-400">
                  {wine.producer}
                </td>

                <td className="py-3 px-4 text-slate-400">{wine.region}</td>

                <td className="py-3 px-4 text-slate-400">{wine.vintage}</td>

                <td className="py-3 px-4 text-slate-400">
                  €{wine.price ?? "-"}
                </td>

                <td className={`py-3 px-4 ${getStockStatus(wine.stock)}`}>
                  {wine.stock ?? 0}
                </td>

                <td
                  className="py-3 px-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateStock(wine.id, wine.stock, -1)}
                      className="px-2 bg-slate-800 rounded text-white"
                    >
                      –
                    </button>

                    <button
                      onClick={() => updateStock(wine.id, wine.stock, 1)}
                      className="px-2 bg-slate-800 rounded text-white"
                    >
                      +
                    </button>

                    <button
                      onClick={() => deleteWine(wine.id)}
                      className="text-red-400 text-xs ml-2"
                    >
                      Remove
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {paginated.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="py-8 px-4 text-center text-slate-500"
                >
                  No wines found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-center gap-3 mt-6 flex-wrap">
        <button
          disabled={page === 1}
          onClick={() => setPage(1)}
          className="px-3 py-1 rounded bg-slate-800 text-slate-300 disabled:opacity-40"
        >
          ⏮ First
        </button>

        <button
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
          className="px-3 py-1 rounded bg-slate-800 text-slate-300 disabled:opacity-40"
        >
          ← Prev
        </button>

        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter((p) => p >= page - 2 && p <= page + 2)
          .map((p) => (
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

        <button
          disabled={page === totalPages}
          onClick={() => setPage(page + 1)}
          className="px-3 py-1 rounded bg-slate-800 text-slate-300 disabled:opacity-40"
        >
          Next →
        </button>

        <button
          disabled={page === totalPages}
          onClick={() => setPage(totalPages)}
          className="px-3 py-1 rounded bg-slate-800 text-slate-300 disabled:opacity-40"
        >
          Last ⏭
        </button>
      </div>

      {editingWine && (
        <div
          className="so-modal-backdrop"
          onClick={() => setEditingWine(null)}
        >
          <div
            className="so-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-semibold text-white mb-2">
              Edit Wine
            </h2>

            <div className="text-sm text-slate-400 mb-6">
              {editingWine.producer || "Unknown producer"}
              {editingWine.region ? ` • ${editingWine.region}` : ""}
              {editingWine.country ? ` • ${editingWine.country}` : ""}
            </div>

            <div className="so-form-grid">

              <div>
                <label className="block text-xs text-slate-400 mb-2">
                  Wine name
                </label>
                <input
                  className="so-input-apple"
                  value={editingWine.name || ""}
                  onChange={(e) =>
                    setEditingWine({ ...editingWine, name: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-2">
                  Producer
                </label>
                <input
                  className="so-input-apple"
                  value={editingWine.producer || ""}
                  onChange={(e) =>
                    setEditingWine({ ...editingWine, producer: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-2">
                  Country
                </label>
                <input
                  className="so-input-apple"
                  value={editingWine.country || ""}
                  onChange={(e) =>
                    setEditingWine({ ...editingWine, country: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-2">
                  Region
                </label>
                <input
                  className="so-input-apple"
                  value={editingWine.region || ""}
                  onChange={(e) =>
                    setEditingWine({ ...editingWine, region: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-2">
                  Subregion
                </label>
                <input
                  className="so-input-apple"
                  value={editingWine.subregion || ""}
                  onChange={(e) =>
                    setEditingWine({
                      ...editingWine,
                      subregion: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-2">
                  Grapes
                </label>
                <input
                  className="so-input-apple"
                  value={editingWine.grapes || ""}
                  onChange={(e) =>
                    setEditingWine({ ...editingWine, grapes: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-2">
                  Wine type
                </label>
                <select
                  className="so-input-apple"
                  value={editingWine.wine_type || ""}
                  onChange={(e) =>
                    setEditingWine({
                      ...editingWine,
                      wine_type: e.target.value,
                    })
                  }
                >
                  <option value="">Select wine type</option>
                  {WINE_TYPE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {prettyWineType(option)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-2">
                  Bottle size
                </label>
                <select
                  className="so-input-apple"
                  value={editingWine.size || ""}
                  onChange={(e) =>
                    setEditingWine({ ...editingWine, size: e.target.value })
                  }
                >
                  <option value="">Select bottle size</option>
                  {BOTTLE_SIZE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-2">
                  Vintage
                </label>
                <input
                  type="number"
                  className="so-input-apple"
                  value={editingWine.vintage || ""}
                  onChange={(e) =>
                    setEditingWine({ ...editingWine, vintage: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-2">
                  Price
                </label>
                <input
                  type="number"
                  className="so-input-apple"
                  value={editingWine.price || ""}
                  onChange={(e) =>
                    setEditingWine({ ...editingWine, price: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-2">
                  Stock
                </label>
                <input
                  type="number"
                  className="so-input-apple"
                  value={editingWine.stock || ""}
                  onChange={(e) =>
                    setEditingWine({ ...editingWine, stock: e.target.value })
                  }
                />
              </div>

            </div>

            <div className="mt-6">

              <label className="block text-xs text-slate-400 mb-3">
                Cellar Locations
              </label>

              <div className="space-y-2">

                {inventory.map((loc) => (

                  <div
                    key={loc.id}
                    className="flex items-center justify-between bg-slate-800/60 px-3 py-2 rounded"
                  >

                    <span className="text-sm text-slate-300 capitalize">
                      {loc.location.replace("_", " ")}
                    </span>

                    <div className="flex items-center gap-2">

                      <button
                        onClick={() => updateLocationStock(loc.id, -1)}
                        className="px-2 bg-slate-700 rounded"
                      >
                        –
                      </button>

                      <span className="w-6 text-center">
                        {loc.stock}
                      </span>

                      <button
                        onClick={() => updateLocationStock(loc.id, 1)}
                        className="px-2 bg-slate-700 rounded"
                      >
                        +
                      </button>

                    </div>

                  </div>

                ))}

              </div>

              <div className="text-xs text-slate-500 mt-3">
                Total stock: {totalInventoryStock()}
              </div>

            </div>

            <div className="mt-4">
              <label className="block text-xs text-slate-400 mb-2">
                Description
              </label>
              <textarea
                className="so-input-apple so-textarea"
                value={editingWine.description || ""}
                onChange={(e) =>
                  setEditingWine({
                    ...editingWine,
                    description: e.target.value,
                  })
                }
              />
            </div>

            <div className="mt-4">
              <label className="block text-xs text-slate-400 mb-2">
                Sommelier notes
              </label>
              <textarea
                className="so-input-apple so-textarea"
                value={editingWine.notes || ""}
                onChange={(e) =>
                  setEditingWine({ ...editingWine, notes: e.target.value })
                }
              />
            </div>

            <div className="so-modal-actions">
              <button
                onClick={() => setEditingWine(null)}
                className="so-btn-secondary"
              >
                Cancel
              </button>

              <button onClick={saveWine} className="so-btn-primary">
                {saving ? "Saving..." : "Save"}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}