"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
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

export default function DataQualityClient({ report }) {
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

    <section className="dq-summary" aria-label="Wine data quality summary">
      <SummaryCell label="Active stocked labels" value={number(summary.stockedLabels)} detail="Only labels with positive physical stock" />
      <SummaryCell label="Catalogue-ready labels" value={number(summary.readyLabels)} detail="Identity and physical format complete" tone="good" />
      <SummaryCell label="Labels needing review" value={number(summary.needsAttention)} detail={`${number(summary.totalIssues)} catalogue issues`} tone={summary.needsAttention ? "warning" : "good"} />
      <SummaryCell label="Missing identifiers" value={number(report.counts?.source)} detail="No business product number, barcode or SKU" tone={report.counts?.source ? "critical" : "good"} />
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
        {visible.length ? visible.map((item) => <Link href={`/dashboard/wines?wine=${encodeURIComponent(item.wineId)}`} key={item.id} className="dq-row">
          <div className={`dq-severity ${item.severity}`}>{item.severity === "critical" ? <ShieldExclamationIcon /> : <ExclamationTriangleIcon />}</div>
          <div className="dq-wine"><strong>{item.wineName}</strong><span>{[item.producer, item.locationName].filter(Boolean).join(" · ") || "Wine catalogue"}</span></div>
          <div className="dq-issue"><span>{CATEGORY_LABELS[item.category]}</span><strong>{item.title}</strong><p>{item.detail}</p></div>
          <div className="dq-stock"><strong>{number(item.stock, 2)}</strong><span>units</span></div>
          <ArrowRightIcon className="dq-arrow" />
        </Link>) : <div className="dq-empty"><CheckCircleIcon /><strong>No issues in this view</strong><span>These stocked wine records are ready.</span></div>}
      </div>
      {filtered.length > PAGE_SIZE && <footer className="dq-pagination"><span>Page {safePage} of {totalPages}</span><div><button type="button" disabled={safePage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</button><button type="button" disabled={safePage === totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>Next</button></div></footer>}
    </section>
  </div></main>;
}
