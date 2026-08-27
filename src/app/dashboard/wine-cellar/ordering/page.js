"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowPathIcon, BellAlertIcon, CheckCircleIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import "./ordering.css";

const qty = (value) => new Intl.NumberFormat("en-GB", { maximumFractionDigits: 2 }).format(Math.max(0, Number(value || 0)));
const money = (value, currency = "EUR") => new Intl.NumberFormat("en-EE", { style: "currency", currency, maximumFractionDigits: 2 }).format(Number(value || 0));
const keyFor = (item) => `${item.wine_id}|${item.location_id}`;

export default function OrderingCentrePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("all");
  const [visibleLimit, setVisibleLimit] = useState(50);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/wine-cellar/orders", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Ordering notifications could not be loaded.");
      setData(result);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);
  useEffect(() => { setVisibleLimit(50); }, [search, location]);

  const model = useMemo(() => {
    const valuations = new Map((data?.valuations || []).map((valuation) => [keyFor(valuation), valuation]));
    const rows = (data?.inventory || [])
      .filter((row) => row.wines?.is_active && row.wine_locations && valuations.has(keyFor(row)))
      .map((row) => ({ ...row, current: Number(row.quantity || 0), valuation: valuations.get(keyFor(row)) }));
    const notifications = rows
      .filter((row) => row.current <= 0)
      .sort((a, b) => a.wine_locations.name.localeCompare(b.wine_locations.name) || a.wines.name.localeCompare(b.wines.name));
    const locations = [...new Map(notifications.map((row) => [row.location_id, row.wine_locations])).values()]
      .sort((a, b) => a.name.localeCompare(b.name));
    return { notifications, locations };
  }, [data]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return model.notifications.filter((row) =>
      (location === "all" || row.location_id === location) &&
      (!query || [row.wines?.name, row.wines?.producer, row.wine_locations?.name].join(" ").toLowerCase().includes(query))
    );
  }, [model, search, location]);
  const visible = filtered.slice(0, visibleLimit);

  return <div className="ordering-page"><div className="ordering-shell">
    <header className="ordering-hero">
      <div><span className="ordering-eyebrow">Inventory notifications</span><h1>Ordering Centre</h1><p>Wines requiring replenishment, based directly on the latest Compucash stock.</p></div>
      <div className="ordering-hero-actions"><div className="ordering-live"><i /> Live inventory</div><button onClick={load} disabled={loading}><ArrowPathIcon className={loading ? "spin" : ""} />Refresh</button></div>
    </header>

    {error && <div className="ordering-error"><ExclamationTriangleIcon />{error}</div>}

    <section className="ordering-summary ordering-summary-simple">
      <Summary icon={BellAlertIcon} label="Suggestions to order" value={model.notifications.length} detail="Compucash balance is zero" tone={model.notifications.length ? "warning" : "default"} />
      <Summary icon={CheckCircleIcon} label="Automatic resolution" value="Live" detail="Clears when stock is above zero" />
    </section>

    <section className="ordering-workspace">
      <div className="ordering-notification-heading"><div><span>Replenishment suggestions</span><strong>{model.notifications.length ? `${model.notifications.length} wine-location alerts` : "Everything is currently stocked"}</strong></div><p>No manual completion is required. A notification disappears automatically after Compucash reports a positive balance.</p></div>
      <div className="ordering-filters"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search wine, producer or venue…" /><select value={location} onChange={(event) => setLocation(event.target.value)}><option value="all">All locations</option>{model.locations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>

      <div className="ordering-list">
        {loading ? <Empty>Reading current Compucash quantities…</Empty> : visible.length === 0 ? <Empty>{model.notifications.length ? "No ordering suggestions match these filters." : "No zero-stock wines need ordering."}</Empty> : visible.map((row) => <article key={keyFor(row)} className="ordering-row ordering-notification-row">
          <div className="ordering-wine"><strong>{row.wines.name}</strong><span>{[row.wines.producer, row.wines.vintage, row.wines.wine_type].filter(Boolean).join(" · ")}</span></div>
          <div><small>Location</small><strong>{row.wine_locations.name}</strong></div>
          <div><small>On hand</small><strong className="urgent">{qty(row.current)}</strong></div>
          <div><small>Average cost</small><strong>{row.valuation?.unit_inventory_cost != null ? money(row.valuation.unit_inventory_cost, row.valuation.currency_code) : "—"}</strong></div>
          <div className="ordering-suggestion"><BellAlertIcon /><span><small>Suggestion</small><strong>Reorder</strong></span></div>
        </article>)}
        {!loading && visible.length < filtered.length && <div className="ordering-load-more"><span>Showing {visible.length} of {filtered.length}</span><button onClick={() => setVisibleLimit((current) => current + 50)}>Show 50 more</button></div>}
      </div>
    </section>

    <footer className="ordering-footnote"><strong>Compucash remains the source of truth.</strong> Vaxeron does not add stock or require a manual “received” action here. The next successful sync removes resolved notifications automatically. <Link href="/dashboard/wine-cellar/inventory">Open Stock Control</Link></footer>
  </div></div>;
}

function Summary({ icon: Icon, label, value, detail, tone = "default" }) { return <div className={`ordering-summary-card ${tone}`}><Icon /><div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div></div>; }
function Empty({ children }) { return <div className="ordering-empty">{children}</div>; }
