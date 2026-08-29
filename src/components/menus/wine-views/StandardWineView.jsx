"use client";

import { useMemo, useState } from "react";
import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";

import styles from "./StandardWineView.module.css";

const DEFAULT_THEME = {
  template: "editorial",
  primaryColor: "#173a32",
  backgroundColor: "#f4f1e9",
  textColor: "#17221f",
  fontPairing: "editorial",
  density: "relaxed",
  logoUrl: "",
  currency: "EUR",
  welcomeMessage: "A cellar selected for this moment.",
  showProducer: true,
  showRegion: true,
  showVintage: true,
  showDescription: true,
};

const TYPE_ORDER = ["Sparkling", "Champagne", "White", "Rosé", "Orange", "Red", "Dessert", "Sake", "Non-alcoholic"];

function normaliseType(value) {
  const type = String(value || "Other").trim();
  return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
}

function formatPrice(value, currency = "EUR") {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0
    ? new Intl.NumberFormat("en", { style: "currency", currency, maximumFractionDigits: amount % 1 ? 2 : 0 }).format(amount)
    : "";
}

export default function StandardWineView({ menu, items = [], experience }) {
  const theme = { ...DEFAULT_THEME, ...(experience?.theme || {}) };
  const rules = experience?.availability_rules || {};
  const [activeType, setActiveType] = useState("All");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const types = useMemo(() => [...new Set(items.map((item) => normaliseType(item.wines?.wine_type)))].sort((a, b) => {
    const left = TYPE_ORDER.indexOf(a); const right = TYPE_ORDER.indexOf(b);
    return (left < 0 ? 99 : left) - (right < 0 ? 99 : right);
  }), [items]);
  const visible = useMemo(() => items.filter((item) => {
    const wine = item.wines || {};
    const service = item.service_type || "bottle";
    if (rules.show_bottle === false && service === "bottle") return false;
    if (rules.show_btg === false && (service === "glass" || service === "both")) return false;
    if (activeType === "By the glass" && !["glass", "both"].includes(service)) return false;
    if (activeType !== "All" && activeType !== "By the glass" && normaliseType(wine.wine_type) !== activeType) return false;
    const haystack = [wine.name, wine.producer, wine.region, wine.country, wine.grapes, wine.vintage].join(" ").toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  }), [items, activeType, query, rules.show_bottle, rules.show_btg]);

  return <div className={`${styles.root} ${styles[theme.template] || ""} ${styles[theme.density] || ""}`} style={{ "--wine-accent": theme.primaryColor, "--wine-bg": theme.backgroundColor, "--wine-text": theme.textColor }}>
    <header className={styles.header}>
      <div className={styles.brand}>{theme.logoUrl ? <img src={theme.logoUrl} alt={`${menu?.name || "Wine list"} logo`} style={{ display: "block", width: "auto", maxWidth: 150, height: 34, objectFit: "contain" }} /> : <><span>V</span><small>DIGITAL CELLAR</small></>}</div>
      <div className={styles.intro}><small>CURATED FOR THIS VENUE</small><h1>{menu?.name || experience?.name || "Wine list"}</h1><p>{theme.welcomeMessage}</p></div>
      <div className={styles.count}>{items.length}<span>available selections</span></div>
    </header>
    <div className={styles.toolbar}>
      <div className={styles.categories}><button className={activeType === "All" ? styles.active : ""} onClick={() => setActiveType("All")}>All</button>{items.some((item) => ["glass", "both"].includes(item.service_type)) && <button className={activeType === "By the glass" ? styles.active : ""} onClick={() => setActiveType("By the glass")}>By the glass</button>}{types.map((type) => <button className={activeType === type ? styles.active : ""} key={type} onClick={() => setActiveType(type)}>{type}</button>)}</div>
      <label className={styles.search}><MagnifyingGlassIcon /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search the cellar" /></label>
    </div>
    <main className={styles.list}>
      <div className={styles.listHeader}><span>{activeType}</span><small>{visible.length} selections</small></div>
      {visible.map((item) => {
        const wine = item.wines || {};
        const bottlePrice = formatPrice(item.price_override ?? wine.price, theme.currency);
        const glassPrice = formatPrice(item.glass_price, theme.currency);
        const meta = [theme.showVintage && wine.vintage, theme.showRegion && (wine.region || wine.country)].filter(Boolean).join(" · ");
        return <button className={styles.wine} key={item.id} onClick={() => setSelected(item)}>
          <div className={styles.identity}><small>{normaliseType(wine.wine_type)}</small><h2>{wine.name}</h2>{theme.showProducer && wine.producer && <p>{wine.producer}</p>}<span>{meta}</span></div>
          <div className={styles.service}>{["glass", "both"].includes(item.service_type) && <span>BTG</span>}</div>
          <div className={styles.prices}>{glassPrice && <span><small>GLASS</small>{glassPrice}</span>}{bottlePrice && <span><small>BOTTLE</small>{bottlePrice}</span>}</div>
        </button>;
      })}
      {!visible.length && <div className={styles.empty}>No available wines match this view.</div>}
    </main>
    <footer className={styles.footer}><span>Powered by Vaxeron</span><span>Live availability · Zero-stock wines hidden</span></footer>
    {selected && <div className={styles.modal} role="dialog" aria-modal="true"><button className={styles.backdrop} onClick={() => setSelected(null)} aria-label="Close" /><article><button className={styles.close} onClick={() => setSelected(null)} aria-label="Close"><XMarkIcon /></button><small>{normaliseType(selected.wines?.wine_type)}</small><h2>{selected.wines?.name}</h2><h3>{selected.wines?.producer}</h3><p>{theme.showDescription ? (selected.description || selected.wines?.description || "A considered selection from the venue cellar.") : ""}</p><dl><div><dt>Origin</dt><dd>{[selected.wines?.region, selected.wines?.country].filter(Boolean).join(", ") || "—"}</dd></div><div><dt>Vintage</dt><dd>{selected.wines?.vintage || "NV"}</dd></div><div><dt>Grapes</dt><dd>{selected.wines?.grapes || "—"}</dd></div></dl></article></div>}
  </div>;
}
