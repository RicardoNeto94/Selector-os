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

  if (loading) {
    return <div className="text-slate-400">Loading wines…</div>;
  }

  return (
    <div className="space-y-6">

      {/* TABLE */}

      <div className="so-card overflow-x-auto">

        <table className="w-full text-sm">

          <thead className="border-b border-slate-700 text-slate-400">

            <tr>

              <th className="py-3 px-4">Wine</th>
              <th className="py-3 px-4">Producer</th>
              <th className="py-3 px-4">Region</th>
              <th className="py-3 px-4">Vintage</th>
              <th className="py-3 px-4">Price</th>
              <th className="py-3 px-4">Stock</th>

            </tr>

          </thead>

          <tbody>

            {wines.map(wine => (

              <tr
                key={wine.id}
                onClick={() => setEditingWine(wine)}
                className="border-b border-slate-800 hover:bg-slate-800/40 cursor-pointer"
              >

                <td className="py-3 px-4 text-white">{wine.name}</td>
                <td className="py-3 px-4">{wine.producer}</td>
                <td className="py-3 px-4">{wine.region}</td>
                <td className="py-3 px-4">{wine.vintage}</td>
                <td className="py-3 px-4">€{wine.price ?? "-"}</td>
                <td className="py-3 px-4">{wine.stock ?? 0}</td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

      {/* APPLE STYLE MODAL */}

      {editingWine && (

      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">

        <div className="w-[720px] rounded-2xl border border-white/10 bg-gradient-to-b from-[#111827] to-[#020617] shadow-2xl p-8">

          <h2 className="text-2xl font-semibold text-white mb-6">
            Edit Wine
          </h2>

          <div className="grid grid-cols-2 gap-4">

            <input className="so-input-apple" placeholder="Wine name"
              value={editingWine.name || ""}
              onChange={e=>setEditingWine({...editingWine,name:e.target.value})}
            />

            <input className="so-input-apple" placeholder="Producer"
              value={editingWine.producer || ""}
              onChange={e=>setEditingWine({...editingWine,producer:e.target.value})}
            />

            <input className="so-input-apple" placeholder="Country"
              value={editingWine.country || ""}
              onChange={e=>setEditingWine({...editingWine,country:e.target.value})}
            />

            <input className="so-input-apple" placeholder="Region"
              value={editingWine.region || ""}
              onChange={e=>setEditingWine({...editingWine,region:e.target.value})}
            />

            <input className="so-input-apple" placeholder="Grapes"
              value={editingWine.grapes || ""}
              onChange={e=>setEditingWine({...editingWine,grapes:e.target.value})}
            />

            <input type="number" className="so-input-apple" placeholder="Vintage"
              value={editingWine.vintage || ""}
              onChange={e=>setEditingWine({...editingWine,vintage:e.target.value})}
            />

            <input type="number" className="so-input-apple" placeholder="Price"
              value={editingWine.price || ""}
              onChange={e=>setEditingWine({...editingWine,price:e.target.value})}
            />

            <input type="number" className="so-input-apple" placeholder="Stock"
              value={editingWine.stock || ""}
              onChange={e=>setEditingWine({...editingWine,stock:e.target.value})}
            />

          </div>

          <textarea
            className="so-input-apple mt-4 h-20"
            placeholder="Description"
            value={editingWine.description || ""}
            onChange={e=>setEditingWine({...editingWine,description:e.target.value})}
          />

          <textarea
            className="so-input-apple mt-3 h-20"
            placeholder="Sommelier notes"
            value={editingWine.notes || ""}
            onChange={e=>setEditingWine({...editingWine,notes:e.target.value})}
          />

          <div className="flex justify-end gap-3 mt-6">

            <button
              onClick={() => setEditingWine(null)}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700"
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