"use client";

import Link from "next/link";
import { Fragment, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRightIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  ShieldExclamationIcon,
} from "@heroicons/react/24/outline";
import "./data-quality.css";

const CATEGORY_LABELS = {
  all: "All issues",
  source: "Identifiers",
  catalogue: "Metadata & formats",
  duplicates: "Duplicates",
};

const PAGE_SIZE = 50;
const number = (value, digits = 0) => new Intl.NumberFormat("en-GB", { maximumFractionDigits: digits }).format(Number(value || 0));

function SummaryCell({ label, value, detail, tone = "default" }) {
  return <div className={`dq-summary-cell dq-tone-${tone}`}><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>;
}

export default function DataQualityClient({ report, records = [], canEdit = false }) {
  const router = useRouter();
  const [refreshing, startTransition] = useTransition();
  const [active, setActive] = useState(null);
  const [wineId, setWineId] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const record = records.find((wine) => wine.id === wineId);
  function edit(item, id = item.wineId) {
    setActive(item); setWineId(id); setError('');
    const wine = records.find((entry) => entry.id === id);
    setForm(Object.fromEntries(['name','producer','wine_type','country','region','vintage','size','sku'].map((key) => [key, String(wine?.[key] ?? '')])));
  }
  async function save(event) {
    event.preventDefault(); setSaving(true); setError('');
    const changes = Object.fromEntries(Object.entries(form).filter(([key, value]) => value !== String(record?.[key] ?? '')));
    if (!Object.keys(changes).length) { setError('Change a field before saving.'); setSaving(false); return; }
    try {
      const response = await fetch(`/api/wines/${encodeURIComponent(wineId)}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(changes) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not save the correction.');
      setNotice(`Saved ${record?.name || 'wine'}. The queue is recalculated from the updated catalogue.`); setActive(null);
      startTransition(() => router.refresh());
    } catch (error) { setError(error.message); } finally { setSaving(false); }
  }
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const summary = report?.summary || {};
  const issues = report?.issues || [];
  const readyPercent = summary.stockedLabels ? (summary.readyLabels / summary.stockedLabels) * 100 : 100;

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return issues.filter((item) => {
      const categoryMatch = category === "all" || item.category === category;
      const searchMatch = !query || [item.wineName, item.producer, item.title, item.detail, item.locationName].join(" ").toLowerCase().includes(query);
      return categoryMatch && searchMatch;
    });
  }, [issues, category, search]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function chooseCategory(nextCategory) {
    setCategory(nextCategory);
    setPage(1);
  }

  return <main className="dq-page"><div className="dq-shell">
    <header className="dq-header">
      <div><span className="dq-eyebrow">Wine Operations · Catalogue stewardship</span><h1>Catalogue Health</h1><p>Review only the stocked labels whose identity, bottle format or core wine metadata needs attention.</p></div>
      <div className="dq-readiness" style={{ "--readiness": `${Math.max(0, Math.min(100, readyPercent)) * 3.6}deg` }}><div><strong>{number(readyPercent, 1)}%</strong><span>ready</span></div></div>
    </header>
    {notice && <p className="dq-feedback" role="status">{notice} {refreshing && 'Refreshing…'}</p>}
    {!canEdit && <p className="dq-feedback">You have review access. A workspace owner or administrator can save corrections.</p>}

    <section className="dq-summary" aria-label="Wine data quality summary">
      <SummaryCell label="Active stocked labels" value={number(summary.stockedLabels)} detail="Only labels with positive physical stock" />
      <SummaryCell label="Catalogue-ready labels" value={number(summary.readyLabels)} detail="Identity and physical format complete" tone="good" />
      <SummaryCell label="Labels needing review" value={number(summary.needsAttention)} detail={`${number(summary.totalIssues)} catalogue issues`} tone={summary.needsAttention ? "warning" : "good"} />
    </section>

    <section className="dq-workspace">
      <div className="dq-toolbar">
        <nav aria-label="Data quality categories">
          {Object.entries(CATEGORY_LABELS).map(([key, label]) => <button key={key} type="button" className={category === key ? "is-active" : ""} onClick={() => chooseCategory(key)}><span>{label}</span><b>{key === "all" ? issues.length : report.counts?.[key] || 0}</b></button>)}
        </nav>
        <label className="dq-search"><MagnifyingGlassIcon /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search wine, producer or issue…" /></label>
      </div>

      <div className="dq-list-heading"><div><span>Prioritized review queue</span><strong>{number(filtered.length)} issue{filtered.length === 1 ? "" : "s"}</strong></div><p>Critical blockers appear first. Possible duplicates are review-only and are never merged automatically.</p></div>
      <div className="dq-list">
        {visible.length ? visible.map((item) => <Fragment key={item.id}><button type="button" className="dq-row" aria-expanded={active?.id === item.id} disabled={saving || refreshing} onClick={() => active?.id === item.id ? setActive(null) : edit(item)}>
          <div className={`dq-severity ${item.severity}`}>{item.severity === "critical" ? <ShieldExclamationIcon /> : <ExclamationTriangleIcon />}</div>
          <div className="dq-wine"><strong>{item.wineName}</strong><span>{[item.producer, item.locationName].filter(Boolean).join(" · ") || "Wine catalogue"}</span></div>
          <div className="dq-issue"><span>{CATEGORY_LABELS[item.category]}</span><strong>{item.title}</strong><p>{item.detail}</p></div>
          <div className="dq-stock"><strong>{number(item.stock, 2)}</strong><span>units</span></div>
          <span className="dq-action">{item.category === 'duplicates' ? 'Compare' : canEdit ? 'Fix issue' : 'Review'} <ArrowRightIcon className="dq-arrow" /></span>
        </button>{active?.id === item.id && <section className="dq-editor" aria-label={`Correct ${item.wineName}`}>
          {item.category === 'duplicates' && <div><h2>Compare candidate records</h2><p>These may be different bottle formats or genuinely separate products. Correct inaccurate details below; no stock is moved and no records are merged.</p><div className="dq-candidates">{(item.relatedWineIds || []).map((id) => { const wine = records.find((row) => row.id === id); return <button type="button" disabled={saving} key={id} aria-pressed={wineId === id} onClick={() => edit(item, id)}><strong>{wine?.name}</strong><span>{wine?.producer || 'No producer'} · {wine?.vintage || 'NV'} · {wine?.size || 'Size missing'}</span><span>SKU: {wine?.sku || '—'} · Product: {wine?.business_product_number || '—'}</span><small>Record {id}</small></button>; })}</div></div>}
          {record && <form onSubmit={save}><h2>{record.name}</h2>
            {item.category === 'source' && <p>Enter the verified catalogue SKU from the product or your source system—not a made-up value to clear the warning. Compucash product numbers and barcodes are not changed here.</p>}
            <div className="dq-fields">{(item.category === 'source' ? ['sku'] : item.title === 'Bottle size needs review' ? ['size'] : ['name','producer','wine_type','country','region','vintage','size']).map((key) => <label key={key}>{({ wine_type: 'Wine type', size: 'Bottle size (e.g. 75cl)', sku: 'Catalogue SKU' })[key] || key}<input disabled={!canEdit || saving || (key === 'sku' && Boolean(record.sku))} maxLength={250} value={form[key]} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} list={key === 'wine_type' ? 'dq-wine-types' : undefined} /></label>)}</div>
            <datalist id="dq-wine-types">{['Red','White','Rosé','Sparkling','Champagne','Orange','Dessert','Sake','Non-alcoholic'].map((value) => <option key={value} value={value} />)}</datalist>
            <p className="dq-help">Stock, prices and source mappings are unchanged. Source-managed details may be overwritten by a future sync; correct those in the source system too.</p>
            {error && <p role="alert" className="dq-error">{error}</p>}
            <div className="dq-editor-actions">{canEdit && <button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save correction'}</button>}<button type="button" disabled={saving} onClick={() => setActive(null)}>Cancel</button><Link href={`/dashboard/wines?wine=${encodeURIComponent(wineId)}`}>Open full wine record →</Link></div>
          </form>}
        </section>}</Fragment>) : <div className="dq-empty"><CheckCircleIcon /><strong>No issues in this view</strong><span>These stocked wine records are ready.</span></div>}
      </div>
      {filtered.length > PAGE_SIZE && <footer className="dq-pagination"><span>Page {safePage} of {totalPages}</span><div><button type="button" disabled={safePage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</button><button type="button" disabled={safePage === totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>Next</button></div></footer>}
    </section>
  </div></main>;
}
