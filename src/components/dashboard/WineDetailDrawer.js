"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import "./wine-detail-drawer.css";

const TABS = [
  ["overview", "Overview"],
  ["stock", "Stock"],
  ["guest", "Guest lists"],
  ["commercial", "Commercial"],
];

const quantity = (value) => new Intl.NumberFormat("en-GB", { maximumFractionDigits: 2 }).format(Number(value || 0));
const money = (value, currency = "EUR") => value == null
  ? "—"
  : new Intl.NumberFormat("en-EE", { style: "currency", currency, maximumFractionDigits: 2 }).format(Number(value || 0));

function Field({ label, value }) {
  return <div className="wine-drawer-field"><span>{label}</span><strong>{value || "—"}</strong></div>;
}

function Empty({ children }) {
  return <div className="wine-drawer-empty">{children}</div>;
}

export default function WineDetailDrawer({ wineId, open, onClose }) {
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState("overview");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open || !wineId) return;
    setTab("overview");
    setData(null);
    setError("");
    setLoading(true);
    fetch(`/api/wines/${encodeURIComponent(wineId)}`, { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Wine details could not be loaded.");
        return payload;
      })
      .then(setData)
      .catch((loadError) => setError(loadError.message))
      .finally(() => setLoading(false));
  }, [open, wineId]);

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event) => event.key === "Escape" && onClose?.();
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open, onClose]);

  if (!mounted || !open) return null;
  const wine = data?.wine;
  const currency = data?.valuationLines?.find((row) => row.currency_code)?.currency_code || "EUR";

  return createPortal(
    <div className="wine-drawer-layer" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose?.()}>
      <aside className="wine-detail-drawer" role="dialog" aria-modal="true" aria-label={wine?.name ? `${wine.name} details` : "Wine details"}>
        <header className="wine-drawer-header">
          <div className="wine-drawer-heading">
            <span>Unified wine record</span>
            <h2>{wine?.name || (loading ? "Loading wine…" : "Wine details")}</h2>
            {wine && <p>{[wine.producer, wine.vintage || "NV", wine.region || wine.country].filter(Boolean).join(" · ")}</p>}
          </div>
          <button type="button" className="wine-drawer-close" onClick={onClose} aria-label="Close wine details"><XMarkIcon /></button>
        </header>

        {wine && <div className="wine-drawer-summary">
          <div><span>Physical units</span><strong>{quantity(data.stock)}</strong></div>
          <div><span>Locations</span><strong>{data.stockLines.length}</strong></div>
          <div><span>Guest lists</span><strong>{data.placements.filter((item) => item.active).length}</strong></div>
          <div><span>Data status</span><strong className={data.quality.length ? "needs-attention" : "is-ready"}>{data.quality.length ? `${data.quality.length} to review` : "Ready"}</strong></div>
        </div>}

        <nav className="wine-drawer-tabs" aria-label="Wine detail sections">
          {TABS.map(([value, label]) => <button key={value} type="button" aria-current={tab === value ? "page" : undefined} className={tab === value ? "is-active" : ""} onClick={() => setTab(value)}>{label}</button>)}
        </nav>

        <div className="wine-drawer-content">
          {loading && <Empty>Loading the complete wine record…</Empty>}
          {error && <div className="wine-drawer-error"><ExclamationTriangleIcon /> <span>{error}</span></div>}

          {wine && tab === "overview" && <>
            {data.quality.length > 0 ? <section className="wine-drawer-alerts">
              <div className="wine-drawer-section-title"><span>Attention needed</span><strong>{data.quality.length}</strong></div>
              {data.quality.map((item) => <div key={item.id} className={`wine-drawer-alert ${item.severity}`}><ExclamationTriangleIcon /><div><strong>{item.title}</strong><p>{item.detail}</p></div></div>)}
            </section> : <div className="wine-drawer-ready"><CheckCircleIcon /><span>This stocked label has the essential catalogue and commercial data available.</span></div>}
            <section>
              <div className="wine-drawer-section-title"><span>Catalogue identity</span></div>
              <div className="wine-drawer-fields">
                <Field label="Producer" value={wine.producer} />
                <Field label="Vintage" value={wine.vintage || "NV"} />
                <Field label="Type" value={wine.wine_type} />
                <Field label="Bottle size" value={wine.size} />
                <Field label="Country" value={wine.country} />
                <Field label="Region" value={wine.region} />
                <Field label="Business product" value={wine.business_product_number} />
                <Field label="SKU" value={wine.sku} />
              </div>
            </section>
          </>}

          {wine && tab === "stock" && <section>
            <div className="wine-drawer-section-title"><span>Compucash stock by location</span><strong>{quantity(data.stock)} units</strong></div>
            {data.stockLines.length ? <div className="wine-drawer-list">{data.stockLines.map((line) => <div key={line.id}><div><strong>{line.locationName}</strong><span>{String(line.locationType || "storage").replaceAll("_", " ")}</span></div><b>{quantity(line.quantity)}</b></div>)}</div> : <Empty>No positive stock is currently reported for this wine.</Empty>}
            <p className="wine-drawer-note">Quantities are read-only in Vaxeron because Compucash is the operational source of truth.</p>
          </section>}

          {wine && tab === "guest" && <section>
            <div className="wine-drawer-section-title"><span>Guest-list placements</span><strong>{data.placements.length}</strong></div>
            {data.placements.length ? <div className="wine-drawer-placement-list">{data.placements.map((item) => <article key={item.id}>
              <div><span>{item.active ? "Published placement" : "Hidden placement"}</span><h3>{item.locationName}</h3></div>
              <div className="wine-drawer-placement-grid">
                <Field label="Service" value={item.serviceType} />
                <Field label="Bottle" value={money(item.bottlePrice, currency)} />
                <Field label="Glass" value={money(item.glassPrice, currency)} />
                <Field label="Description" value={item.description ? "Complete" : "Missing"} />
              </div>
              {item.locationId && <Link href={`/dashboard/wine-cellar/venues/${item.locationId}`}>Manage venue controls <ArrowTopRightOnSquareIcon /></Link>}
            </article>)}</div> : <Empty>This wine is not currently connected to a guest wine list.</Empty>}
          </section>}

          {wine && tab === "commercial" && <section>
            <div className="wine-drawer-section-title"><span>Commercial position</span><strong>{Math.round(data.valuation.costCoverage)}% cost coverage</strong></div>
            <div className="wine-drawer-commercial-grid">
              <Field label="Inventory at average cost" value={money(data.valuation.inventoryCost, currency)} />
              <Field label="Potential net revenue" value={money(data.valuation.potentialRevenueNet, currency)} />
              <Field label="Potential gross revenue" value={money(data.valuation.potentialRevenueGross, currency)} />
              <Field label="Potential gross profit" value={money(data.valuation.potentialGrossProfit, currency)} />
              <Field label="Potential margin" value={`${data.valuation.potentialMargin.toFixed(1)}%`} />
              <Field label="Selling-price coverage" value={`${data.valuation.saleCoverage.toFixed(1)}%`} />
            </div>
            <p className="wine-drawer-note">Purchase values use the average storage cost supplied by Compucash. Revenue remains an estimate and only covers locations with a usable selling price.</p>
          </section>}
        </div>
      </aside>
    </div>,
    document.body
  );
}
