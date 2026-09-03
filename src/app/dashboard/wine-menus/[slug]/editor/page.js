"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeftIcon, ArrowTopRightOnSquareIcon, CheckCircleIcon, ExclamationTriangleIcon, MagnifyingGlassIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import "./content-editor.css";

export const dynamic = "force-dynamic";
const number = (value) => new Intl.NumberFormat("en-GB", { maximumFractionDigits: 2 }).format(Number(value || 0));

export default function WineMenuEditor() {
  const params = useParams();
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  const [data, setData] = useState({ menu: null, wines: [], items: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [view, setView] = useState("listed");
  const [busyId, setBusyId] = useState("");

  const load = useCallback(async () => {
    if (!slug) return;
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/wine-experiences/${encodeURIComponent(slug)}/content`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Wine-list content could not be loaded.");
      setData(payload);
    } catch (loadError) { setError(loadError.message); }
    finally { setLoading(false); }
  }, [slug]);

  useEffect(() => { load(); }, [load]);

  const itemsByWine = useMemo(() => new Map(data.items.map((item) => [item.wine_id, item])), [data.items]);
  const wineById = useMemo(() => new Map(data.wines.map((wine) => [wine.id, wine])), [data.wines]);
  const listedCount = data.items.length;
  const availableListed = data.items.filter((item) => Number(wineById.get(item.wine_id)?.stock || 0) > 0).length;
  const missingPriceCount = data.items.filter((item) => {
    const wine = wineById.get(item.wine_id);
    const bottleMissing = ["bottle", "both"].includes(item.service_type || "bottle") && item.price_override == null && wine?.price == null;
    const glassMissing = ["glass", "both"].includes(item.service_type) && item.glass_price == null;
    return bottleMissing || glassMissing;
  }).length;

  const visibleWines = useMemo(() => {
    const query = search.trim().toLowerCase();
    return data.wines.filter((wine) => {
      const listed = itemsByWine.has(wine.id);
      if (view === "listed" && !listed) return false;
      if (view === "available" && Number(wine.stock || 0) <= 0) return false;
      return !query || [wine.name, wine.producer, wine.region, wine.country, wine.vintage].join(" ").toLowerCase().includes(query);
    });
  }, [data.wines, itemsByWine, search, view]);

  function updateLocal(itemId, field, value) {
    setData((current) => ({ ...current, items: current.items.map((item) => item.id === itemId ? { ...item, [field]: value } : item) }));
  }

  async function action(body, successMessage) {
    const targetId = body.itemId || body.wineId;
    setBusyId(targetId); setError(""); setNotice("");
    try {
      const response = await fetch(`/api/wine-experiences/${encodeURIComponent(slug)}/content`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "The wine list could not be updated.");
      setNotice(successMessage); await load();
    } catch (actionError) { setError(actionError.message); }
    finally { setBusyId(""); }
  }

  return <main className="wine-content-page page-fade">
    <header className="wine-content-hero"><div>
      <Link href="/dashboard/wine-menus/studio" className="wine-content-back"><ArrowLeftIcon /> Digital Wine Lists</Link>
      <span className="wine-content-eyebrow">GUEST LIST CONTENT</span><h1>{data.menu?.name || "Wine Menu"}</h1>
      <p>Choose which wines belong on this venue’s guest list and refine service, pricing and descriptions.</p>
    </div>{data.menu && <a href={`/wine/${data.menu.slug}`} target="_blank" rel="noreferrer" className="wine-content-preview">Preview guest page <ArrowTopRightOnSquareIcon /></a>}</header>

    <section className="wine-content-summary" aria-label="Wine-list content status">
      <div><span>Selected wines</span><strong>{number(listedCount)}</strong><small>included in this list</small></div>
      <div><span>Available now</span><strong>{number(availableListed)}</strong><small>positive venue stock</small></div>
      <div className={missingPriceCount ? "needs-attention" : "is-ready"}><span>Pricing attention</span><strong>{number(missingPriceCount)}</strong><small>{missingPriceCount ? "missing guest prices" : "all prices ready"}</small></div>
    </section>

    {notice && <div className="wine-content-notice"><CheckCircleIcon />{notice}</div>}
    {error && <div className="wine-content-error"><ExclamationTriangleIcon />{error}<button type="button" onClick={load}>Try again</button></div>}

    <section className="wine-content-workspace"><div className="wine-content-toolbar">
      <nav aria-label="Wine content filters"><button type="button" className={view === "listed" ? "is-active" : ""} onClick={() => setView("listed")}>On this list <b>{listedCount}</b></button><button type="button" className={view === "available" ? "is-active" : ""} onClick={() => setView("available")}>Available stock</button><button type="button" className={view === "all" ? "is-active" : ""} onClick={() => setView("all")}>Full catalogue</button></nav>
      <label><MagnifyingGlassIcon /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search wine, producer, origin or vintage…" /></label>
    </div>

    {loading ? <div className="wine-content-state">Loading this venue’s wine list…</div> : visibleWines.length ? <div className="wine-content-list">{visibleWines.map((wine) => {
      const item = itemsByWine.get(wine.id); const listed = Boolean(item);
      return <article key={wine.id} className={`wine-content-row ${listed ? "is-listed" : ""}`}>
        <div className="wine-content-identity"><span>{wine.wine_type || "Wine"}</span><h2>{wine.name}</h2><p>{[wine.producer, wine.vintage || "NV", wine.region || wine.country, wine.size].filter(Boolean).join(" · ")}</p></div>
        <div className={`wine-content-stock ${Number(wine.stock) > 0 ? "is-available" : ""}`}><strong>{number(wine.stock)}</strong><span>venue units</span></div>
        {listed ? <>
          <label className="wine-content-service"><span>Service</span><select value={item.service_type || "bottle"} onChange={(event) => updateLocal(item.id, "service_type", event.target.value)}><option value="bottle">Bottle</option><option value="glass">By the glass</option><option value="both">Bottle & glass</option></select></label>
          <div className="wine-content-prices"><label><span>Bottle price</span><input type="number" min="0" step="0.01" value={item.price_override ?? ""} placeholder={wine.price == null ? "Required" : String(wine.price)} onChange={(event) => updateLocal(item.id, "price_override", event.target.value)} /></label>{["glass", "both"].includes(item.service_type) && <label><span>Glass price</span><input type="number" min="0" step="0.01" value={item.glass_price ?? ""} placeholder="Required" onChange={(event) => updateLocal(item.id, "glass_price", event.target.value)} /></label>}</div>
          <label className="wine-content-description"><span>Guest description</span><input value={item.description || ""} onChange={(event) => updateLocal(item.id, "description", event.target.value)} placeholder="Optional venue-specific note" /></label>
          <div className="wine-content-actions"><button type="button" className="save" disabled={busyId === item.id} onClick={() => action({ action: "update", itemId: item.id, serviceType: item.service_type, priceOverride: item.price_override, glassPrice: item.glass_price, description: item.description }, `${wine.name} saved.`)}>{busyId === item.id ? "Saving…" : "Save"}</button><button type="button" className="remove" aria-label={`Remove ${wine.name}`} disabled={busyId === item.id} onClick={() => window.confirm(`Remove ${wine.name} from this guest list?`) && action({ action: "remove", itemId: item.id }, `${wine.name} removed from the list.`)}><TrashIcon /></button></div>
        </> : <button type="button" className="wine-content-add" disabled={busyId === wine.id} onClick={() => action({ action: "add", wineId: wine.id }, `${wine.name} added to the list.`)}><PlusIcon />{busyId === wine.id ? "Adding…" : "Add to list"}</button>}
      </article>;
    })}</div> : <div className="wine-content-state"><CheckCircleIcon /><strong>No wines in this view</strong><span>Change the filter or search the full catalogue.</span></div>}
    </section>
  </main>;
}
