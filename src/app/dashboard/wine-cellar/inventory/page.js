"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const PAGE_SIZES = [25, 50, 100];
const TYPES = ["all", "sparkling", "white", "rosé", "red", "orange", "dessert", "fortified", "sake"];

const money = (value) =>
  new Intl.NumberFormat("en-EE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(Number(value || 0));

export default function WineInventoryPage() {
  const supabase = createClient();

  const [inventory, setInventory] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  const [search, setSearch] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [sortDirection, setSortDirection] = useState("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState(null);
  const [transferQty, setTransferQty] = useState(1);
  const [transferDestination, setTransferDestination] = useState("");

  const [editingWine, setEditingWine] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [savingWine, setSavingWine] = useState(false);

  useEffect(() => {
  setMounted(true);
  loadData();
}, []);
  useEffect(() => { setPage(1); }, [search, selectedLocation, selectedType, stockFilter, pageSize]);

  async function loadData() {
    setLoading(true);

    const [{ data: inventoryData, error: inventoryError }, { data: locationsData, error: locationsError }] = await Promise.all([
      supabase.from("wine_inventory").select(`
        *,
        wines (
          id, name, producer, vintage, price, wine_type, country,
          region, subregion, grapes, size, description, sku
        ),
        wine_locations ( id, name )
      `),
      supabase.from("wine_locations").select("*").order("name"),
    ]);

    if (inventoryError) console.error("INVENTORY LOAD ERROR:", inventoryError);
    if (locationsError) console.error("LOCATIONS LOAD ERROR:", locationsError);

    setInventory(inventoryData || []);
    setLocations(locationsData || []);
    setLoading(false);
  }

  async function updateQuantity(item, change) {
    if (!item || !change) return;
    const currentQty = Number(item.quantity || 0);
    const nextQty = Math.max(0, currentQty + change);
    const actualChange = nextQty - currentQty;
    if (!actualChange) return;

    const reason = window.prompt(actualChange > 0 ? "Reason for adding stock:" : "Reason for removing stock:");
    if (!reason?.trim()) return;

    setUpdatingId(item.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error: inventoryError } = await supabase.from("wine_inventory").update({ quantity: nextQty }).eq("id", item.id);
      if (inventoryError) throw inventoryError;

      const { error: movementError } = await supabase.from("wine_movements").insert({
        wine_id: item.wine_id,
        from_location: item.location_id,
        to_location: item.location_id,
        quantity: actualChange,
        movement_type: "adjustment",
        created_by: user?.id || null,
        notes: `${actualChange > 0 ? "Stock increased" : "Stock decreased"}: ${reason.trim()}`,
      });
      if (movementError) console.error("MOVEMENT LOG ERROR:", movementError);

      setInventory((prev) => prev.map((row) => row.id === item.id ? { ...row, quantity: nextQty } : row));
    } catch (error) {
      console.error("STOCK UPDATE ERROR:", error);
      alert("Unable to update stock.");
    }
    setUpdatingId(null);
  }

  async function executeTransfer() {
    if (!selectedInventoryItem || !transferDestination || transferQty <= 0) return;
    const sourceQty = Number(selectedInventoryItem.quantity || 0);
    if (transferQty > sourceQty) return alert("Not enough stock available.");

    try {
      setUpdatingId(selectedInventoryItem.id);
      const { data: { user } } = await supabase.auth.getUser();
      const sourceNewQty = sourceQty - transferQty;

      const { error: sourceError } = await supabase.from("wine_inventory").update({ quantity: sourceNewQty }).eq("id", selectedInventoryItem.id);
      if (sourceError) throw sourceError;

      const { data: existingDestination, error: destinationCheckError } = await supabase
        .from("wine_inventory").select("*")
        .eq("wine_id", selectedInventoryItem.wine_id)
        .eq("location_id", transferDestination).maybeSingle();
      if (destinationCheckError) throw destinationCheckError;

      if (existingDestination) {
        const { error } = await supabase.from("wine_inventory").update({ quantity: Number(existingDestination.quantity || 0) + transferQty }).eq("id", existingDestination.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("wine_inventory").insert({ wine_id: selectedInventoryItem.wine_id, location_id: transferDestination, quantity: transferQty });
        if (error) throw error;
      }

      await supabase.from("wine_transfers").insert({
        wine_id: selectedInventoryItem.wine_id,
        from_location_id: selectedInventoryItem.location_id,
        to_location_id: transferDestination,
        quantity: transferQty,
        transferred_by: user?.id || null,
      });

      await supabase.from("wine_movements").insert({
        wine_id: selectedInventoryItem.wine_id,
        from_location: selectedInventoryItem.location_id,
        to_location: transferDestination,
        quantity: transferQty,
        movement_type: "transfer",
        created_by: user?.id || null,
        notes: "Wine transferred between cellar locations.",
      });

      await loadData();
      setShowTransferModal(false);
      setSelectedInventoryItem(null);
      setTransferDestination("");
      setTransferQty(1);
    } catch (error) {
      console.error("TRANSFER ERROR:", error);
      alert("Transfer failed.");
    }
    setUpdatingId(null);
  }

  const wines = useMemo(() => {
    const map = new Map();
    inventory.forEach((item) => {
      const wine = item.wines;
      if (!wine?.id) return;
      if (!map.has(wine.id)) map.set(wine.id, { ...wine, stock: 0, inventoryRows: [] });
      const entry = map.get(wine.id);
      entry.stock += Number(item.quantity || 0);
      entry.inventoryRows.push(item);
    });
    return Array.from(map.values());
  }, [inventory]);

  const filteredWines = useMemo(() => {
    const q = search.trim().toLowerCase();
    const result = wines.filter((wine) => {
      const haystack = [wine.name, wine.producer, wine.country, wine.region, wine.subregion, wine.grapes, wine.vintage, wine.sku].join(" ").toLowerCase();
      const locationMatch = selectedLocation === "all" || wine.inventoryRows.some((row) => row.location_id === selectedLocation && Number(row.quantity || 0) > 0);
      const typeMatch = selectedType === "all" || String(wine.wine_type || "").toLowerCase() === selectedType;
      const stockMatch = stockFilter === "all" || (stockFilter === "available" && wine.stock > 0) || (stockFilter === "low" && wine.stock > 0 && wine.stock <= 2) || (stockFilter === "out" && wine.stock <= 0);
      return (!q || haystack.includes(q)) && locationMatch && typeMatch && stockMatch;
    });

    return result.sort((a, b) => {
      let av = sortBy === "stock" ? a.stock : a[sortBy];
      let bv = sortBy === "stock" ? b.stock : b[sortBy];
      if (sortBy === "price") { av = Number(av || 0); bv = Number(bv || 0); }
      if (typeof av === "string") av = av.toLowerCase();
      if (typeof bv === "string") bv = bv.toLowerCase();
      if (av < bv) return sortDirection === "asc" ? -1 : 1;
      if (av > bv) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [wines, search, selectedLocation, selectedType, stockFilter, sortBy, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(filteredWines.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const pageWines = filteredWines.slice(start, start + pageSize);
  const totalBottles = wines.reduce((sum, wine) => sum + wine.stock, 0);
  const totalValue = wines.reduce((sum, wine) => sum + wine.stock * Number(wine.price || 0), 0);
  const lowStock = wines.filter((wine) => wine.stock > 0 && wine.stock <= 2).length;
  const outStock = wines.filter((wine) => wine.stock <= 0).length;

  function sort(column) {
    if (sortBy === column) setSortDirection((value) => value === "asc" ? "desc" : "asc");
    else { setSortBy(column); setSortDirection("asc"); }
  }

  function openEditor(wine) {
    const stock = {};
    locations.forEach((location) => {
      stock[location.id] = Number(wine.inventoryRows.find((row) => row.location_id === location.id)?.quantity || 0);
    });
    setEditingWine(wine);
    setEditForm({
      name: wine.name || "", producer: wine.producer || "", vintage: wine.vintage ?? "", price: wine.price ?? "",
      wine_type: wine.wine_type || "", country: wine.country || "", region: wine.region || "", subregion: wine.subregion || "",
      grapes: wine.grapes || "", size: wine.size || "", description: wine.description || "", stock,
    });
  }

  async function saveWine() {
    if (!editingWine || !editForm?.name.trim()) return;
    setSavingWine(true);
    try {
      const { error } = await supabase.from("wines").update({
        name: editForm.name.trim(), producer: editForm.producer.trim(), vintage: editForm.vintage === "" ? null : Number(editForm.vintage),
        price: editForm.price === "" ? null : Number(editForm.price), wine_type: editForm.wine_type, country: editForm.country.trim(),
        region: editForm.region.trim(), subregion: editForm.subregion.trim(), grapes: editForm.grapes.trim(), size: editForm.size,
        description: editForm.description,
      }).eq("id", editingWine.id);
      if (error) throw error;

      for (const location of locations) {
        const quantity = Math.max(0, Number(editForm.stock[location.id] || 0));
        const existing = editingWine.inventoryRows.find((row) => row.location_id === location.id);
        if (existing) {
          const { error: stockError } = await supabase.from("wine_inventory").update({ quantity }).eq("id", existing.id);
          if (stockError) throw stockError;
        } else if (quantity > 0) {
          const { error: stockError } = await supabase.from("wine_inventory").insert({ wine_id: editingWine.id, location_id: location.id, quantity });
          if (stockError) throw stockError;
        }
      }

      await loadData();
      setEditingWine(null);
      setEditForm(null);
    } catch (error) {
      console.error("WINE SAVE ERROR:", error);
      alert(`Unable to save wine: ${error.message || "Unknown error"}`);
    }
    setSavingWine(false);
  }

  const sortLabel = (label, column) => (
    <button onClick={() => sort(column)} className="inline-flex items-center gap-2">
      {label}<span className={sortBy === column ? "text-[#963d2d]" : "text-[#c5b6aa]"}>{sortBy === column ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}</span>
    </button>
  );

  if (!mounted) {
  return (
    <div className="page-fade min-h-screen bg-[#f7f3ed] px-8 py-8 text-[#8f8177]">
      Loading wine inventory...
    </div>
  );
}
  return (
    <div className="page-fade min-h-screen bg-[#f7f3ed] text-[#30241f]">
      <div className="mx-auto max-w-[1700px] px-5 py-7 md:px-8 lg:px-10">
        <header className="flex flex-col gap-5 border-b border-[#ded3c8] pb-7 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-[9px] uppercase tracking-[0.34em] text-[#a17865]">Wine Operations</div>
            <h1 className="mt-3 text-[34px] font-medium tracking-[-0.04em] md:text-[44px]">Inventory</h1>
            <p className="mt-2 text-[12px] text-[#8a7b70]">Master wine catalogue and multi-location stock control.</p>
          </div>
          <button onClick={() => window.location.href = "/dashboard/wines/new"} className="min-h-10 rounded-full bg-[#963d2d] px-5 text-[10px] uppercase tracking-[0.15em] text-white">+ Add Wine</button>
        </header>

        <section className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-[20px] border border-[#ded3c8] bg-[#ded3c8] lg:grid-cols-4">
          {[["Catalogue", wines.length], ["Bottles", totalBottles], ["Inventory value", money(totalValue)], ["Attention", `${lowStock} low · ${outStock} out`]].map(([label, value]) => (
            <div key={label} className="bg-[#fbf8f3] px-5 py-4">
              <div className="text-[8px] uppercase tracking-[0.22em] text-[#a29184]">{label}</div>
              <div className="mt-2 text-[21px] tracking-[-0.03em]">{value}</div>
            </div>
          ))}
        </section>

        <section className="mt-5 overflow-hidden rounded-[22px] border border-[#ded3c8] bg-[#fbf8f3]">
          <div className="grid gap-3 border-b border-[#e4dad1] p-4 xl:grid-cols-[1fr_180px_210px_180px_auto]">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search wine, producer, region, grape, vintage or SKU..." className="min-h-11 rounded-xl border border-[#ddd0c5] bg-white/70 px-4 text-[11px] outline-none" />
            <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)} className="min-h-11 rounded-xl border border-[#ddd0c5] bg-white/70 px-3 text-[10px] capitalize outline-none">{TYPES.map((type) => <option key={type} value={type}>{type === "all" ? "All wine types" : type}</option>)}</select>
            <select value={selectedLocation} onChange={(e) => setSelectedLocation(e.target.value)} className="min-h-11 rounded-xl border border-[#ddd0c5] bg-white/70 px-3 text-[10px] outline-none"><option value="all">All locations</option>{locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select>
            <select value={stockFilter} onChange={(e) => setStockFilter(e.target.value)} className="min-h-11 rounded-xl border border-[#ddd0c5] bg-white/70 px-3 text-[10px] outline-none"><option value="all">All stock states</option><option value="available">Available</option><option value="low">Low stock ≤ 2</option><option value="out">Out of stock</option></select>
            <button onClick={() => { setSearch(""); setSelectedType("all"); setSelectedLocation("all"); setStockFilter("all"); }} className="px-4 text-[9px] uppercase tracking-[0.18em] text-[#8d7567]">Clear</button>
          </div>

          <div className="flex items-center justify-between border-b border-[#e4dad1] px-5 py-3 text-[9px] text-[#95867b]">
            <span>Showing {filteredWines.length ? start + 1 : 0}–{Math.min(start + pageSize, filteredWines.length)} of {filteredWines.length} wines</span>
            <label className="flex items-center gap-2">Rows<select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="rounded-lg border border-[#ddd0c5] bg-white px-2 py-1">{PAGE_SIZES.map((size) => <option key={size}>{size}</option>)}</select></label>
          </div>

          <div className="w-full overflow-hidden">
            <table className="w-full table-fixed border-collapse">
              <thead><tr className="border-b border-[#ded3c8] text-[8px] uppercase tracking-[0.18em] text-[#a18f82]">
                <th className="px-5 py-4 text-left font-normal">{sortLabel("Wine", "name")}</th><th className="px-4 py-4 text-left font-normal">{sortLabel("Type", "wine_type")}</th><th className="hidden px-3 py-4 text-left font-normal min-[1800px]:table-cell">Origin</th><th className="hidden px-3 py-4 text-left font-normal min-[1800px]:table-cell">Locations</th><th className="px-4 py-4 text-right font-normal">{sortLabel("Stock", "stock")}</th><th className="px-4 py-4 text-right font-normal">{sortLabel("Price", "price")}</th><th className="px-5 py-4 text-right font-normal">Action</th>
              </tr></thead>
              <tbody>
                {loading ? <tr><td colSpan="7" className="px-5 py-16 text-center text-[11px] text-[#95867b]">Loading inventory...</td></tr> : pageWines.map((wine) => {
                  const active = wine.inventoryRows.filter((row) => Number(row.quantity || 0) > 0);
                  return <tr key={wine.id} className="border-b border-[#ebe3dc] transition last:border-0 hover:bg-[#f7f1eb]">
                    <td className="px-4 py-3"><div className="min-w-0 truncate text-[11px] font-medium md:text-[12px]">{wine.name || "Unnamed Wine"}</div><div className="mt-1 text-[9px] text-[#94847a]">{[wine.producer, wine.vintage || "NV"].filter(Boolean).join(" · ")}</div></td>
                    <td className="px-3 py-3"><span className="rounded-full border border-[#dfd1c5] px-2.5 py-1 text-[8px] capitalize text-[#806d60]">{wine.wine_type || "—"}</span></td>
                    <td className="hidden px-3 py-3 text-[9px] leading-5 text-[#78675c] min-[1800px]:table-cell"><div>{wine.country || "—"}</div><div className="text-[#a29287]">{[wine.region, wine.subregion].filter(Boolean).join(" · ")}</div></td>
                    <td className="hidden px-3 py-3 min-[1800px]:table-cell"><div className="flex max-w-[340px] flex-wrap gap-1.5">{active.length ? active.slice(0, 3).map((row) => <button key={row.id} onClick={() => { setSelectedInventoryItem(row); setTransferQty(1); setTransferDestination(""); setShowTransferModal(true); }} className="rounded-full bg-[#eee5dc] px-2.5 py-1 text-[8px] text-[#756357]">{row.wine_locations?.name} · {row.quantity}</button>) : <span className="text-[9px] text-[#b09f94]">No stock</span>}{active.length > 3 && <span className="rounded-full bg-[#eee5dc] px-2.5 py-1 text-[8px]">+{active.length - 3}</span>}</div></td>
                    <td className="px-2 py-3 text-right"><div className={`text-[11px] font-medium ${wine.stock <= 0 ? "text-[#b74d3d]" : wine.stock <= 2 ? "text-[#a8663e]" : ""}`}>{wine.stock}</div><div className="mt-1 text-[8px] text-[#a29287]">bottles</div></td>
                    <td className="px-2 py-3 text-right text-[10px]">{wine.price == null ? "—" : money(wine.price)}</td>
                    <td className="px-3 py-3 text-right"><button onClick={() => openEditor(wine)} className="min-h-8 rounded-full border border-[#d7c7bb] px-3 text-[8px] uppercase tracking-[0.16em] text-[#8a4a3a] hover:bg-[#efe4dc]">Edit</button></td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-[#e4dad1] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-[9px] text-[#95867b]">Page {safePage} of {totalPages}</div>
            <div className="flex items-center gap-2">
              <button disabled={safePage === 1} onClick={() => setPage(1)} className="h-9 rounded-full border border-[#d9cbc0] px-3 text-[9px] disabled:opacity-30">First</button>
              <button disabled={safePage === 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="h-9 rounded-full border border-[#d9cbc0] px-4 text-[9px] disabled:opacity-30">Previous</button>
              <span className="min-w-16 text-center text-[9px] text-[#806d60]">{safePage} / {totalPages}</span>
              <button disabled={safePage === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="h-9 rounded-full border border-[#d9cbc0] px-4 text-[9px] disabled:opacity-30">Next</button>
              <button disabled={safePage === totalPages} onClick={() => setPage(totalPages)} className="h-9 rounded-full border border-[#d9cbc0] px-3 text-[9px] disabled:opacity-30">Last</button>
            </div>
          </div>
        </section>
      </div>

      {editingWine && editForm && <div className="fixed inset-0 z-[100] overflow-y-auto bg-[#2c211d]/45 p-3 backdrop-blur-sm md:p-6" onMouseDown={(e) => e.target === e.currentTarget && !savingWine && setEditingWine(null)}>
        <div className="mx-auto my-3 w-full max-w-[980px] overflow-hidden rounded-[24px] border border-[#ded0c5] bg-[#f8f4ee] shadow-2xl md:my-8">
          <div className="sticky top-0 z-20 flex items-start justify-between border-b border-[#dfd3c8] bg-[#f8f4ee]/95 px-5 py-5 backdrop-blur md:px-7"><div><div className="text-[8px] uppercase tracking-[0.28em] text-[#a17865]">Master Wine Record</div><h2 className="mt-2 text-[24px] tracking-[-0.03em]">Edit Wine</h2><div className="mt-1 max-w-[620px] truncate text-[10px] text-[#8e7d72]">{editingWine.name}</div></div><button onClick={() => !savingWine && setEditingWine(null)} className="h-10 w-10 rounded-full border border-[#d9cbc0] text-[18px]">×</button></div>
          <div className="grid gap-7 p-5 md:p-7 lg:grid-cols-[1.05fr_0.95fr]">
            <section><div className="text-[8px] uppercase tracking-[0.24em] text-[#9b8779]">Wine Details</div><div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[["Wine name","name"],["Producer","producer"],["Country","country"],["Region","region"],["Subregion","subregion"],["Grapes","grapes"],["Vintage","vintage"],["Bottle size","size"],["Price (€)","price"]].map(([label, field]) => <label key={field} className={field === "name" ? "sm:col-span-2" : ""}><span className="mb-1.5 block text-[8px] text-[#958277]">{label}</span><input type={field === "price" || field === "vintage" ? "number" : "text"} value={editForm[field]} onChange={(e) => setEditForm((form) => ({ ...form, [field]: e.target.value }))} className="min-h-11 w-full rounded-xl border border-[#ddd0c5] bg-white/65 px-3 text-[11px] outline-none" /></label>)}
              <label><span className="mb-1.5 block text-[8px] text-[#958277]">Wine type</span><select value={editForm.wine_type} onChange={(e) => setEditForm((form) => ({ ...form, wine_type: e.target.value }))} className="min-h-11 w-full rounded-xl border border-[#ddd0c5] bg-white/65 px-3 text-[11px] capitalize"><option value="">Select type</option>{TYPES.filter((type) => type !== "all").map((type) => <option key={type}>{type}</option>)}</select></label>
              <label className="sm:col-span-2"><span className="mb-1.5 block text-[8px] text-[#958277]">Description</span><textarea value={editForm.description} onChange={(e) => setEditForm((form) => ({ ...form, description: e.target.value }))} className="min-h-28 w-full rounded-xl border border-[#ddd0c5] bg-white/65 px-3 py-3 text-[11px] leading-5 outline-none" /></label>
            </div></section>
            <section><div className="flex items-end justify-between"><div><div className="text-[8px] uppercase tracking-[0.24em] text-[#9b8779]">Stock by Location</div><div className="mt-1 text-[9px] text-[#a29287]">Edit physical quantity in each cellar.</div></div><div className="text-right"><div className="text-[8px] uppercase tracking-[0.18em] text-[#a29287]">Total</div><div className="mt-1 text-[20px]">{Object.values(editForm.stock).reduce((sum, qty) => sum + Number(qty || 0), 0)}</div></div></div>
              <div className="mt-4 overflow-hidden rounded-[16px] border border-[#dfd3c8] bg-white/45">{locations.map((location) => <div key={location.id} className="flex items-center justify-between gap-4 border-b border-[#e8dfd7] px-4 py-3 last:border-0"><div className="truncate text-[10px]">{location.name}</div><input type="number" min="0" value={editForm.stock[location.id] ?? 0} onChange={(e) => setEditForm((form) => ({ ...form, stock: { ...form.stock, [location.id]: e.target.value } }))} className="h-10 w-24 rounded-xl border border-[#ddd0c5] bg-[#fbf8f3] px-3 text-right text-[11px] outline-none" /></div>)}</div>
            </section>
          </div>
          <div className="sticky bottom-0 flex justify-end gap-2 border-t border-[#dfd3c8] bg-[#f8f4ee]/95 px-5 py-4 backdrop-blur md:px-7"><button disabled={savingWine} onClick={() => setEditingWine(null)} className="min-h-11 rounded-full border border-[#d9cbc0] px-5 text-[9px] uppercase tracking-[0.16em]">Cancel</button><button disabled={savingWine || !editForm.name.trim()} onClick={saveWine} className="min-h-11 rounded-full bg-[#963d2d] px-6 text-[9px] uppercase tracking-[0.16em] text-white disabled:opacity-50">{savingWine ? "Saving..." : "Save Wine"}</button></div>
        </div>
      </div>}

      {showTransferModal && selectedInventoryItem && <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 p-5 backdrop-blur-sm"><div className="w-full max-w-[500px] rounded-[24px] border border-[#e5d9cf] bg-[#fbf8f3] p-6 shadow-2xl md:p-8"><div className="text-[8px] uppercase tracking-[0.25em] text-[#a17865]">Cellar Movement</div><h2 className="mt-3 text-[24px]">Transfer Wine</h2><p className="mt-1 text-[10px] text-[#8f8177]">{selectedInventoryItem.wines?.name}</p><div className="mt-7 space-y-4"><div><div className="mb-1.5 text-[8px] uppercase tracking-[0.18em] text-[#9d8c80]">From</div><div className="min-h-11 rounded-xl border border-[#e1d6cc] bg-white/55 px-4 py-3 text-[11px]">{selectedInventoryItem.wine_locations?.name} · {selectedInventoryItem.quantity} bottles</div></div><label className="block"><span className="mb-1.5 block text-[8px] uppercase tracking-[0.18em] text-[#9d8c80]">To</span><select value={transferDestination} onChange={(e) => setTransferDestination(e.target.value)} className="min-h-11 w-full rounded-xl border border-[#ddd0c5] bg-white/70 px-3 text-[11px]"><option value="">Select destination</option>{locations.filter((location) => location.id !== selectedInventoryItem.location_id).map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label><label className="block"><span className="mb-1.5 block text-[8px] uppercase tracking-[0.18em] text-[#9d8c80]">Quantity</span><input type="number" min="1" max={selectedInventoryItem.quantity} value={transferQty} onChange={(e) => setTransferQty(Number(e.target.value))} className="min-h-11 w-full rounded-xl border border-[#ddd0c5] bg-white/70 px-3 text-[11px]" /></label></div><div className="mt-7 flex justify-end gap-2"><button onClick={() => setShowTransferModal(false)} className="min-h-11 rounded-full border border-[#d9cbc0] px-5 text-[9px] uppercase tracking-[0.14em]">Cancel</button><button onClick={executeTransfer} disabled={!transferDestination || transferQty <= 0 || updatingId === selectedInventoryItem.id} className="min-h-11 rounded-full bg-[#963d2d] px-6 text-[9px] uppercase tracking-[0.14em] text-white disabled:opacity-40">Confirm Transfer</button></div></div></div>}
    </div>
  );
}
