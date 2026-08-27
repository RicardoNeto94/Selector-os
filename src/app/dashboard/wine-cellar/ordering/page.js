"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowPathIcon, BellAlertIcon, CheckCircleIcon, ChevronRightIcon,
  ExclamationTriangleIcon, ShoppingCartIcon, TruckIcon, XMarkIcon,
} from "@heroicons/react/24/outline";
import "./ordering.css";

const qty = (value) => new Intl.NumberFormat("en-GB", { maximumFractionDigits: 2 }).format(Number(value || 0));
const money = (value, currency = "EUR") => new Intl.NumberFormat("en-EE", { style: "currency", currency, maximumFractionDigits: 0 }).format(Number(value || 0));
const keyFor = (item) => `${item.wine_id}|${item.location_id}`;

async function request(action, payload = {}) {
  const response = await fetch("/api/wine-cellar/orders", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...payload }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "The ordering action failed.");
  return result;
}

export default function OrderingCentrePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("all");
  const [view, setView] = useState("attention");
  const [visibleLimit, setVisibleLimit] = useState(50);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/wine-cellar/orders", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Ordering information could not be loaded.");
      setData(result);
    } catch (loadError) { setError(loadError.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);
  useEffect(() => { setVisibleLimit(50); }, [view, search, location]);

  const model = useMemo(() => {
    const rules = new Map((data?.rules || []).map((rule) => [keyFor(rule), rule]));
    const valuations = new Map((data?.valuations || []).map((valuation) => [keyFor(valuation), valuation]));
    const activeOrders = new Map((data?.orders || []).filter((order) => ["approved", "ordered"].includes(order.status)).map((order) => [keyFor(order), order]));
    const rows = (data?.inventory || []).filter((row) => row.wines?.is_active && row.wine_locations).map((row) => {
      const rule = rules.get(keyFor(row));
      const order = activeOrders.get(keyFor(row));
      const valuation = valuations.get(keyFor(row));
      const reorderPoint = Number(rule?.reorder_point ?? 2);
      const targetQuantity = Number(rule?.target_quantity ?? 6);
      const current = Number(row.quantity || 0);
      return { ...row, rule, order, valuation, reorderPoint, targetQuantity, current, suggested: Math.max(1, Math.ceil(targetQuantity - Math.max(0, current))) };
    });
    const attention = rows.filter((row) => Boolean(row.rule) && row.current <= row.reorderPoint && !row.order);
    const suggestions = rows.filter((row) => !row.rule && row.current > 0 && row.current <= row.reorderPoint && !row.order);
    const locations = [...new Map(rows.map((row) => [row.location_id, row.wine_locations])).values()].sort((a, b) => a.name.localeCompare(b.name));
    return { rows, attention, suggestions, locations, approved: rows.filter((row) => row.order?.status === "approved"), ordered: rows.filter((row) => row.order?.status === "ordered") };
  }, [data]);

  const filtered = useMemo(() => {
    const source = view === "suggestions" ? model.suggestions : view === "approved" ? model.approved : view === "ordered" ? model.ordered : model.attention;
    const query = search.trim().toLowerCase();
    return source.filter((row) => (location === "all" || row.location_id === location) && (!query || [row.wines?.name, row.wines?.producer, row.wine_locations?.name].join(" ").toLowerCase().includes(query)));
  }, [model, view, search, location]);
  const visible = filtered.slice(0, visibleLimit);

  const committedValue = [...model.approved, ...model.ordered].reduce((sum, row) => sum + Number(row.order?.requested_quantity || 0) * Number(row.order?.unit_cost || 0), 0);

  async function updateStatus(order, status) {
    setSaving(true); setError("");
    try { await request("update_status", { orderId: order.id, status }); await load(); }
    catch (actionError) { setError(actionError.message); }
    finally { setSaving(false); }
  }

  return <div className="ordering-page"><div className="ordering-shell">
    <header className="ordering-hero">
      <div><span className="ordering-eyebrow">Wine purchasing</span><h1>Ordering Centre</h1><p>Turn live Compucash stock signals into a controlled purchasing workflow.</p></div>
      <div className="ordering-hero-actions"><div className="ordering-live"><i /> Live inventory</div><button onClick={load} disabled={loading}><ArrowPathIcon className={loading ? "spin" : ""} />Refresh</button></div>
    </header>

    {error && <div className="ordering-error"><ExclamationTriangleIcon />{error}</div>}

    <section className="ordering-summary">
      <Summary icon={BellAlertIcon} label="Needs approval" value={model.attention.length} detail={`${model.suggestions.length} quiet suggestions`} tone="warning" />
      <Summary icon={CheckCircleIcon} label="Approved" value={model.approved.length} detail="Ready to place" />
      <Summary icon={TruckIcon} label="On order" value={model.ordered.length} detail="Awaiting delivery" />
      <Summary icon={ShoppingCartIcon} label="Committed cost" value={money(committedValue)} detail="Approved and ordered" />
    </section>

    <section className="ordering-workspace">
      <div className="ordering-tabs">
        <button className={view === "attention" ? "active" : ""} onClick={() => setView("attention")}>Needs approval <b>{model.attention.length}</b></button>
        <button className={view === "suggestions" ? "active" : ""} onClick={() => setView("suggestions")}>Suggestions <b>{model.suggestions.length}</b></button>
        <button className={view === "approved" ? "active" : ""} onClick={() => setView("approved")}>Approved <b>{model.approved.length}</b></button>
        <button className={view === "ordered" ? "active" : ""} onClick={() => setView("ordered")}>On order <b>{model.ordered.length}</b></button>
      </div>
      <div className="ordering-filters"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search wine, producer or venue…" /><select value={location} onChange={(event) => setLocation(event.target.value)}><option value="all">All locations</option>{model.locations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>

      <div className="ordering-list">
        {loading ? <Empty>Reading current Compucash quantities…</Empty> : visible.length === 0 ? <Empty>{view === "attention" ? "No configured reorder alerts need approval." : view === "suggestions" ? "No low-stock suggestions in this view." : "No orders in this stage."}</Empty> : visible.map((row) => <article key={keyFor(row)} className="ordering-row">
          <div className="ordering-wine"><strong>{row.wines.name}</strong><span>{[row.wines.producer, row.wines.vintage, row.wines.wine_type].filter(Boolean).join(" · ")}</span></div>
          <div><small>Location</small><strong>{row.wine_locations.name}</strong></div>
          <div><small>On hand</small><strong className={row.current <= 0 ? "urgent" : ""}>{qty(Math.max(0, row.current))}</strong></div>
          <div><small>{row.order ? "Requested" : "Suggested"}</small><strong>{qty(row.order?.requested_quantity ?? row.suggested)}</strong></div>
          <div><small>Est. cost</small><strong>{row.valuation?.unit_inventory_cost ? money((row.order?.requested_quantity ?? row.suggested) * row.valuation.unit_inventory_cost, row.valuation.currency_code) : "—"}</strong></div>
          <div className="ordering-row-action">{!row.order ? <button onClick={() => setSelected(row)}>Review <ChevronRightIcon /></button> : row.order.status === "approved" ? <button disabled={saving} onClick={() => updateStatus(row.order, "ordered")}>Mark ordered</button> : <button disabled={saving} onClick={() => updateStatus(row.order, "received")}>Mark received</button>}</div>
        </article>)}
        {!loading && visible.length < filtered.length && <div className="ordering-load-more"><span>Showing {visible.length} of {filtered.length}</span><button onClick={() => setVisibleLimit((current) => current + 50)}>Show 50 more</button></div>}
      </div>
    </section>

    <footer className="ordering-footnote"><strong>Compucash remains the source of truth.</strong> Marking an order received does not add stock. The next successful sync confirms the physical quantity. <Link href="/dashboard/wine-cellar/inventory">Open Stock Control</Link></footer>
  </div>{selected && <OrderModal row={selected} saving={saving} onClose={() => setSelected(null)} onComplete={async () => { setSelected(null); await load(); }} setSaving={setSaving} setError={setError} />}</div>;
}

function Summary({ icon: Icon, label, value, detail, tone = "default" }) { return <div className={`ordering-summary-card ${tone}`}><Icon /><div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div></div>; }
function Empty({ children }) { return <div className="ordering-empty">{children}</div>; }

function OrderModal({ row, saving, onClose, onComplete, setSaving, setError }) {
  const [reorderPoint, setReorderPoint] = useState(row.reorderPoint);
  const [targetQuantity, setTargetQuantity] = useState(row.targetQuantity);
  const [requestedQuantity, setRequestedQuantity] = useState(row.suggested);
  const [supplierName, setSupplierName] = useState(row.rule?.supplier_name || "");
  const [supplierEmail, setSupplierEmail] = useState(row.rule?.supplier_email || "");
  const [notes, setNotes] = useState(row.rule?.notes || "");
  async function approve() {
    setSaving(true); setError("");
    try {
      const common = { wineId: row.wine_id, locationId: row.location_id, reorderPoint: Number(reorderPoint), targetQuantity: Number(targetQuantity), supplierName, supplierEmail, notes };
      await request("save_rule", common);
      await request("approve", { ...common, requestedQuantity: Number(requestedQuantity), quantityOnHand: row.current, unitCost: row.valuation?.unit_inventory_cost, currencyCode: row.valuation?.currency_code });
      await onComplete();
    } catch (actionError) { setError(actionError.message); }
    finally { setSaving(false); }
  }
  return <div className="ordering-modal-layer" role="dialog" aria-modal="true"><button className="ordering-modal-backdrop" onClick={onClose} aria-label="Close" /><section className="ordering-modal"><header><div><span>Purchase recommendation</span><h2>{row.wines.name}</h2><p>{row.wine_locations.name} · {qty(Math.max(0, row.current))} currently on hand</p></div><button onClick={onClose} aria-label="Close"><XMarkIcon /></button></header><div className="ordering-modal-grid"><label>Reorder when stock reaches<input type="number" min="0" step="0.1" value={reorderPoint} onChange={(e) => setReorderPoint(e.target.value)} /></label><label>Target stock<input type="number" min="0.1" step="0.1" value={targetQuantity} onChange={(e) => setTargetQuantity(e.target.value)} /></label><label>Quantity to order<input type="number" min="0.1" step="0.1" value={requestedQuantity} onChange={(e) => setRequestedQuantity(e.target.value)} /></label><label>Average unit cost<input value={row.valuation?.unit_inventory_cost ? money(row.valuation.unit_inventory_cost, row.valuation.currency_code) : "Not available"} disabled /></label><label>Supplier<input value={supplierName} onChange={(e) => setSupplierName(e.target.value)} placeholder="Optional supplier" /></label><label>Supplier email<input type="email" value={supplierEmail} onChange={(e) => setSupplierEmail(e.target.value)} placeholder="Optional email" /></label><label className="wide">Internal note<textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Vintage, allocation, delivery instruction…" /></label></div><footer><button className="secondary" onClick={onClose}>Cancel</button><button className="primary" disabled={saving} onClick={approve}>{saving ? "Approving…" : "Approve purchase"}</button></footer></section></div>;
}
