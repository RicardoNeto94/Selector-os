"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ArrowPathIcon, CheckCircleIcon, ChevronDownIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { BOTTLE_FORMATS, bottleFormatForWine, bottleQuantity, fetchAllQueryRows, parseBottleSizeCl, positiveBottleQuantity, summarizeBottleFormats, summarizeInventoryFamilies } from "@/lib/wineInventory";
import "./inventory.css";

export const dynamic = "force-dynamic";
const PAGE_SIZES = [25, 50, 100];
const TYPES = ["all", "sparkling", "white", "rosé", "red", "orange", "dessert", "fortified", "sake"];
const number = (value) => Number(value || 0);
const quantity = (value) => new Intl.NumberFormat("en-GB", { maximumFractionDigits: 2 }).format(Math.abs(number(value)) < 0.001 ? 0 : number(value));
const money = (value) => new Intl.NumberFormat("en-EE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(number(value));
const syncDate = (value) => value ? new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value)) : "Not yet completed";

function Kpi({ label, value, detail, active, onClick, tone = "default" }) {
  const colour = tone === "warning" ? "text-[#a95836]" : tone === "good" ? "text-[#607758]" : "text-[#30241f]";
  const content = <><div className="text-[8px] uppercase tracking-[0.22em] text-[#a29184]">{label}</div><div className={`mt-2 text-[22px] tracking-[-0.035em] ${colour}`}>{value}</div><div className="mt-1 text-[8px] leading-4 text-[#9a8a7f]">{detail}</div></>;
  return onClick ? <button type="button" onClick={onClick} className={`inventory-kpi px-5 py-4 text-left ${active ? "is-active" : ""}`}>{content}</button> : <div className="inventory-kpi px-5 py-4">{content}</div>;
}

export default function WineInventoryPage() {
  const supabase = useMemo(() => createClient(), []);
  const [inventory, setInventory] = useState([]); const [locations, setLocations] = useState([]); const [latestSync, setLatestSync] = useState(null); const [loading, setLoading] = useState(true); const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState(""); const [selectedLocation, setSelectedLocation] = useState("all"); const [selectedType, setSelectedType] = useState("all"); const [stockFilter, setStockFilter] = useState("available"); const [sortBy, setSortBy] = useState("name"); const [sortDirection, setSortDirection] = useState("asc"); const [page, setPage] = useState(1); const [pageSize, setPageSize] = useState(25); const [expandedWineId, setExpandedWineId] = useState(null);
  const [selectedFormat, setSelectedFormat] = useState("all"); const [savingSizeId, setSavingSizeId] = useState(null);

  async function loadData() {
    setLoading(true); setLoadError("");
    try {
      const [inventoryRows, locationsResult, syncResult] = await Promise.all([
        fetchAllQueryRows(() => supabase.from("wine_inventory").select("id,wine_id,location_id,quantity,wines(id,name,producer,vintage,price,wine_type,country,region,subregion,grapes,size,sku),wine_locations(id,name)").order("id")),
        supabase.from("wine_locations").select("id,name,location_type").order("name"),
        supabase.from("compucash_sync_runs").select("status,completed_at,products_matched,unmatched_products,error_message").order("created_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      if (locationsResult.error) throw locationsResult.error;
      if (syncResult.error) console.error("COMPUCASH SYNC STATUS ERROR:", syncResult.error);
      setInventory(inventoryRows); setLocations(locationsResult.data || []); setLatestSync(syncResult.data || null);
    } catch (error) {
      console.error("INVENTORY LOAD ERROR:", error);
      setLoadError(error?.message || "Inventory could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedStock = params.get("stock");
    const requestedFormat = params.get("format");
    if (["available", "low"].includes(requestedStock)) setStockFilter(requestedStock);
    if (Object.keys(BOTTLE_FORMATS).includes(requestedFormat)) setSelectedFormat(requestedFormat);
  }, []);
  useEffect(() => { setPage(1); }, [search, selectedLocation, selectedType, selectedFormat, stockFilter, pageSize]);

  const wines = useMemo(() => {
    const map = new Map();
    inventory.forEach((row) => { const wine = row.wines; if (!wine?.id) return; if (!map.has(wine.id)) map.set(wine.id, { ...wine, stock: 0, netStock: 0, inventoryRows: [] }); const entry = map.get(wine.id); entry.stock += positiveBottleQuantity(row.quantity); entry.netStock += bottleQuantity(row.quantity); entry.inventoryRows.push(row); });
    return Array.from(map.values());
  }, [inventory]);
  const metrics = useMemo(() => ({ positiveUnits: wines.reduce((sum, wine) => sum + wine.stock, 0), available: wines.filter((wine) => wine.stock > 0).length, low: wines.filter((wine) => wine.stock > 0 && wine.stock <= 2).length, negative: inventory.filter((row) => bottleQuantity(row.quantity) < 0).length, value: wines.reduce((sum, wine) => sum + wine.stock * number(wine.price), 0) }), [wines, inventory]);
  const inventoryFamilies = useMemo(() => summarizeInventoryFamilies(inventory, (row) => row.quantity), [inventory]);
  const bottleFormats = useMemo(() => summarizeBottleFormats(inventory, (row) => row.quantity), [inventory]);
  const filteredWines = useMemo(() => {
    const q = search.trim().toLowerCase();
    return wines.filter((wine) => { const haystack = [wine.name, wine.producer, wine.country, wine.region, wine.subregion, wine.grapes, wine.vintage, wine.sku].join(" ").toLowerCase(); const locationMatch = selectedLocation === "all" || wine.inventoryRows.some((row) => row.location_id === selectedLocation && positiveBottleQuantity(row.quantity) > 0); const typeMatch = selectedType === "all" || String(wine.wine_type || "").toLowerCase() === selectedType; const formatMatch = selectedFormat === "all" || bottleFormatForWine(wine) === selectedFormat; const stockMatch = wine.stock > 0 && (stockFilter === "available" || (stockFilter === "low" && wine.stock <= 2)); return (!q || haystack.includes(q)) && locationMatch && typeMatch && formatMatch && stockMatch; }).sort((a, b) => { let av = sortBy === "stock" ? a.stock : a[sortBy]; let bv = sortBy === "stock" ? b.stock : b[sortBy]; if (sortBy === "price") { av = number(av); bv = number(bv); } if (typeof av === "string") av = av.toLowerCase(); if (typeof bv === "string") bv = bv.toLowerCase(); return av < bv ? (sortDirection === "asc" ? -1 : 1) : av > bv ? (sortDirection === "asc" ? 1 : -1) : 0; });
  }, [wines, search, selectedLocation, selectedType, selectedFormat, stockFilter, sortBy, sortDirection]);
  const totalPages = Math.max(1, Math.ceil(filteredWines.length / pageSize)); const safePage = Math.min(page, totalPages); const start = (safePage - 1) * pageSize; const pageWines = filteredWines.slice(start, start + pageSize);
  const filteredSummary = useMemo(() => ({ units: filteredWines.reduce((sum, wine) => sum + Math.max(0, wine.stock), 0), value: filteredWines.reduce((sum, wine) => sum + Math.max(0, wine.stock) * number(wine.price), 0) }), [filteredWines]);
  const sort = (column) => { if (sortBy === column) setSortDirection((value) => value === "asc" ? "desc" : "asc"); else { setSortBy(column); setSortDirection("asc"); } };
  const sortLabel = (label, column) => <button type="button" onClick={() => sort(column)} className="inline-flex items-center gap-2">{label}<span className={sortBy === column ? "text-[#426b5e]" : "text-[#aab7b2]"}>{sortBy === column ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}</span></button>;
  const syncHealthy = latestSync?.status === "succeeded";

  async function saveWineSize(wineId, size) {
    const normalizedSize = String(size || "").trim();
    if (!parseBottleSizeCl(normalizedSize)) throw new Error("Enter a valid size such as 37.5cl, 75cl or 150cl.");
    setSavingSizeId(wineId);
    try {
      const { error } = await supabase.from("wines").update({ size: normalizedSize }).eq("id", wineId);
      if (error) throw error;
      setInventory((current) => current.map((row) => row.wine_id === wineId ? { ...row, wines: { ...row.wines, size: normalizedSize } } : row));
    } finally {
      setSavingSizeId(null);
    }
  }

  return <div className="wine-inventory-page min-h-screen"><div className="wine-inventory-shell mx-auto max-w-[1700px] px-5 py-7 md:px-8 lg:px-10">
    <header className="inventory-header flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><div className="inventory-eyebrow text-[9px] uppercase tracking-[0.34em]">Wine Operations</div><h1 className="mt-3 text-[34px] font-medium tracking-[-0.04em] md:text-[44px]">Stock Control</h1><p className="mt-2 max-w-[680px] text-[11px] leading-5">See what is available and where it is stored. Quantities are read-only because Compucash is the source of truth.</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={loadData} disabled={loading} className="inventory-secondary-action inline-flex min-h-10 items-center gap-2 px-4 text-[9px] uppercase tracking-[0.14em]"><ArrowPathIcon className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />Refresh</button><Link href="/dashboard/wines" className="inventory-primary-action inline-flex min-h-10 items-center px-5 text-[9px] uppercase tracking-[0.14em] text-white">Manage wine catalogue</Link></div></header>

    <section className={`mt-5 flex flex-col gap-3 rounded-[18px] border px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${syncHealthy ? "border-[#d5dfcf] bg-[#eff4ec]" : "border-[#ead2c4] bg-[#f8ebe3]"}`}><div className="flex items-center gap-3">{syncHealthy ? <CheckCircleIcon className="h-5 w-5 text-[#647c5c]" /> : <ExclamationTriangleIcon className="h-5 w-5 text-[#a95836]" />}<div><div className="text-[10px] font-medium">{syncHealthy ? "Compucash inventory is connected" : "Compucash sync needs attention"}</div><div className="mt-0.5 text-[9px] text-[#7f7066]">Last completed {syncDate(latestSync?.completed_at)}</div></div></div><div className="text-[9px] text-[#7f7066]">{latestSync ? `${number(latestSync.products_matched).toLocaleString("en-GB")} matched · ${number(latestSync.unmatched_products).toLocaleString("en-GB")} unmatched` : "No synchronization history"}</div></section>

    <section className="inventory-kpi-grid mt-5 grid grid-cols-2 overflow-hidden lg:grid-cols-4"><Kpi label="Total physical units" value={quantity(inventoryFamilies.total.positive)} detail={`All positive Compucash balances across ${locations.length} locations`} /><Kpi label="Wine bottles" value={quantity(inventoryFamilies.wine.positive)} detail="Wine only · excludes sake and alcohol-free" /><Kpi label="Sake & shochu" value={quantity(inventoryFamilies.sake.positive)} detail="Physical sake and shochu units" /><Kpi label="Active labels" value={metrics.available.toLocaleString("en-GB")} detail="Unique products with stock above zero" active={stockFilter === "available"} onClick={() => setStockFilter("available")} tone="good" /></section>

    <section className="inventory-format-grid mt-4" aria-label="Stock by bottle format">
      {Object.entries(BOTTLE_FORMATS).map(([key, format]) => <button type="button" key={key} onClick={() => setSelectedFormat((current) => current === key ? "all" : key)} className={`${key === "unknown" && bottleFormats[key] > 0 ? "needs-review" : ""} ${selectedFormat === key ? "is-active" : ""}`}><span>{format.label}</span><strong>{quantity(bottleFormats[key])}</strong><small>{format.detail}</small></button>)}
      <div><span>Fractional / open</span><strong>{quantity(bottleFormats.fractional)}</strong><small>Included in format totals</small></div>
    </section>

    {selectedFormat === "unknown" && <SizeReviewPanel wines={wines.filter((wine) => wine.stock > 0 && bottleFormatForWine(wine) === "unknown")} savingSizeId={savingSizeId} onSave={saveWineSize} />}

    <section className="inventory-table-card mt-5 overflow-hidden"><div className="inventory-filter-panel p-4"><div className="inventory-filter-grid grid gap-3 xl:grid-cols-[1fr_180px_210px_180px_auto]"><label className="inventory-search-field"><span className="mb-1.5 block text-[8px] uppercase tracking-[0.16em] text-[#71877f]">Search active inventory</span><input aria-label="Search active inventory" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Wine, producer, region, vintage or SKU…" className="min-h-11 w-full rounded-xl px-4 text-[11px] outline-none" /></label><Filter label="Wine type" value={selectedType} onChange={setSelectedType}>{TYPES.map((type) => <option key={type} value={type}>{type === "all" ? "All types" : type}</option>)}</Filter><Filter label="Location" value={selectedLocation} onChange={setSelectedLocation}><option value="all">All locations</option>{locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</Filter><Filter label="Stock view" value={stockFilter} onChange={setStockFilter}><option value="available">Available stock</option><option value="low">Low stock ≤ 2</option></Filter><button type="button" onClick={() => { setSearch(""); setSelectedType("all"); setSelectedLocation("all"); setStockFilter("available"); }} className="inventory-reset self-end px-4 text-[8px] uppercase tracking-[0.18em]">Reset filters</button></div></div>
      <div className="inventory-result-bar flex flex-col gap-3 px-5 py-3 sm:flex-row sm:items-center sm:justify-between"><div><strong>{filteredWines.length.toLocaleString("en-GB")} wines in this view</strong><span>{quantity(filteredSummary.units)} bottles on hand · {money(filteredSummary.value)} estimated selling value</span></div><label className="flex items-center gap-2">Rows<select value={pageSize} onChange={(e) => setPageSize(number(e.target.value))}>{PAGE_SIZES.map((size) => <option key={size}>{size}</option>)}</select></label></div>
      {loadError ? <div className="px-5 py-16 text-center text-[11px] text-red-600">{loadError}</div> : <div className="inventory-table-wrap w-full overflow-x-auto"><table className="inventory-table w-full min-w-[760px] table-fixed border-collapse"><thead><tr><th className="w-[34%] px-5 py-4 text-left font-normal">{sortLabel("Wine", "name")}</th><th className="w-[11%] px-4 py-4 text-left font-normal">{sortLabel("Type", "wine_type")}</th><th className="w-[25%] px-4 py-4 text-left font-normal">Locations</th><th className="w-[12%] px-4 py-4 text-right font-normal">{sortLabel("Quantity", "stock")}</th><th className="w-[10%] px-4 py-4 text-right font-normal">{sortLabel("Price", "price")}</th><th className="w-[8%] px-5 py-4 text-right font-normal">Details</th></tr></thead><tbody>{loading ? <tr><td colSpan="6" className="px-5 py-16 text-center text-[11px] text-[#95867b]">Loading Compucash inventory…</td></tr> : pageWines.length ? pageWines.map((wine) => <WineRow key={wine.id} wine={wine} expanded={expandedWineId === wine.id} onToggle={() => setExpandedWineId((current) => current === wine.id ? null : wine.id)} />) : <tr><td colSpan="6" className="px-5 py-16 text-center"><div className="text-[12px] font-medium">No wines match these filters</div><div className="mt-2 text-[9px] text-[#95867b]">Reset the filters or choose another location.</div></td></tr>}</tbody></table></div>}
      <div className="flex flex-col gap-3 border-t border-[#e4dad1] px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div className="text-[9px] text-[#95867b]">Page {safePage} of {totalPages}</div><div className="flex items-center gap-2"><PageButton disabled={safePage === 1} onClick={() => setPage(1)}>First</PageButton><PageButton disabled={safePage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</PageButton><span className="min-w-16 text-center text-[9px] text-[#806d60]">{safePage} / {totalPages}</span><PageButton disabled={safePage === totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>Next</PageButton><PageButton disabled={safePage === totalPages} onClick={() => setPage(totalPages)}>Last</PageButton></div></div>
    </section>
  </div></div>;
}

function SizeReviewPanel({ wines, savingSizeId, onSave }) {
  const [drafts, setDrafts] = useState({});
  const [error, setError] = useState("");

  async function save(wine) {
    setError("");
    try {
      await onSave(wine.id, drafts[wine.id] || "");
    } catch (saveError) {
      setError(saveError?.message || "Bottle size could not be saved.");
    }
  }

  return <section className="size-review-panel mt-4" aria-labelledby="size-review-title">
    <div className="size-review-heading"><div><span>Catalogue housekeeping</span><h2 id="size-review-title">Complete bottle sizes</h2><p>Compucash supplies the quantity for these products, but not their packaging size. Confirm the label or product card, enter the size and save.</p></div><strong>{wines.length} wine{wines.length === 1 ? "" : "s"}</strong></div>
    {error && <div className="size-review-error">{error}</div>}
    <div className="size-review-list">
      {wines.map((wine) => <div key={wine.id} className="size-review-row">
        <div><strong>{wine.name}</strong><span>{[wine.business_product_number || wine.sku, `${quantity(wine.stock)} bottles`].filter(Boolean).join(" · ")}</span></div>
        <div className="size-review-control"><input list="common-bottle-sizes" value={drafts[wine.id] || ""} onChange={(event) => setDrafts((current) => ({ ...current, [wine.id]: event.target.value }))} placeholder="e.g. 75cl" aria-label={`Bottle size for ${wine.name}`} /><button type="button" disabled={savingSizeId === wine.id || !drafts[wine.id]} onClick={() => save(wine)}>{savingSizeId === wine.id ? "Saving…" : "Save size"}</button></div>
      </div>)}
    </div>
    <datalist id="common-bottle-sizes"><option value="20cl" /><option value="30cl" /><option value="37.5cl" /><option value="50cl" /><option value="62cl" /><option value="70cl" /><option value="72cl" /><option value="75cl" /><option value="150cl" /><option value="180cl" /><option value="300cl" /></datalist>
  </section>;
}

function Filter({ label, value, onChange, children }) { return <label><span className="mb-1.5 block text-[8px] uppercase tracking-[0.16em] text-[#71877f]">{label}</span><select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} className="min-h-11 w-full rounded-xl px-3 text-[10px] capitalize outline-none">{children}</select></label>; }
function PageButton({ children, ...props }) { return <button type="button" {...props} className="h-9 rounded-full border border-[#d9cbc0] px-3 text-[9px] disabled:opacity-30">{children}</button>; }
function WineRow({ wine, expanded, onToggle }) {
  const positiveLocations = wine.inventoryRows.filter((row) => positiveBottleQuantity(row.quantity) > 0).sort((a, b) => number(b.quantity) - number(a.quantity));
  const visible = positiveLocations.slice(0, 2);
  const state = wine.stock <= 0 ? "Out" : wine.stock <= 2 ? "Low" : "Available";
  const stateClass = state === "Available" ? "bg-[#e6eee2] text-[#607758]" : state === "Low" ? "bg-[#f3e6da] text-[#9b603d]" : "bg-[#f1ddda] text-[#a34f42]";
  return <><tr className="inventory-wine-row"><td className="px-5 py-4 align-top"><div className="inventory-wine-name text-[11px] font-medium md:text-[12px]">{wine.name || "Unnamed wine"}</div><div className="inventory-wine-meta mt-1 text-[9px]">{[wine.producer, wine.vintage || "NV"].filter(Boolean).join(" · ")}</div></td><td className="px-4 py-4 align-top"><span className="inventory-type-pill rounded-full px-2.5 py-1 text-[8px] capitalize">{wine.wine_type || "—"}</span></td><td className="px-4 py-4 align-top"><div className="flex flex-wrap gap-1.5">{visible.map((row) => <span key={row.id} className="inventory-location-pill rounded-full px-2.5 py-1 text-[8px]">{row.wine_locations?.name || "Unknown"} · {quantity(row.quantity)}</span>)}{positiveLocations.length > 2 && <span className="inventory-location-pill rounded-full px-2.5 py-1 text-[8px]">+{positiveLocations.length - 2}</span>}</div></td><td className="px-4 py-4 text-right align-top"><div className="text-[11px] font-medium">{quantity(wine.stock)}</div><span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[7px] uppercase tracking-[0.12em] ${stateClass}`}>{state}</span></td><td className="px-4 py-4 text-right text-[10px] align-top">{wine.price == null ? "—" : money(wine.price)}</td><td className="px-5 py-4 text-right align-top"><button type="button" onClick={onToggle} aria-expanded={expanded} aria-label={`${expanded ? "Hide" : "Show"} details for ${wine.name}`} className="inventory-detail-button inline-flex h-8 w-8 items-center justify-center rounded-full"><ChevronDownIcon className={`h-3.5 w-3.5 transition ${expanded ? "rotate-180" : ""}`} /></button></td></tr>{expanded && <tr className="inventory-expanded-row"><td colSpan="6" className="px-5 py-4"><div className="grid gap-4 md:grid-cols-[1fr_auto]"><div><div className="text-[8px] uppercase tracking-[0.18em] text-[#74877f]">Stock by location</div><div className="mt-2 flex flex-wrap gap-2">{positiveLocations.map((row) => <div key={row.id} className="inventory-location-detail rounded-[12px] px-3 py-2"><div className="text-[9px] font-medium">{row.wine_locations?.name || "Unknown location"}</div><div className="mt-1 text-[9px] text-[#74877f]">{quantity(row.quantity)} bottles</div></div>)}</div></div><div className="md:text-right"><div className="text-[8px] uppercase tracking-[0.18em] text-[#74877f]">Inventory source</div><div className="mt-2 inline-flex rounded-full border border-[#d4dfcf] bg-[#edf3e9] px-3 py-1.5 text-[8px] uppercase tracking-[0.13em] text-[#5e7657]">Compucash · read only</div><div className="mt-2 text-[8px] leading-4 text-[#82918b]">Correct quantities in Compucash.<br />Vaxeron updates automatically.</div></div></div></td></tr>}</>;
}
