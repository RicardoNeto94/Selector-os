"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createPortal } from "react-dom";
import { ArrowTopRightOnSquareIcon, CheckCircleIcon, DevicePhoneMobileIcon, GlobeAltIcon, PlusIcon, SwatchIcon, XMarkIcon } from "@heroicons/react/24/outline";
import StandardWineView from "@/components/menus/wine-views/StandardWineView";

const TEMPLATES = [
  ["editorial", "Editorial", "Warm, spacious and sommelier-led"],
  ["minimal", "Minimal", "Clean, efficient and product-focused"],
  ["midnight", "Midnight", "Dark, intimate and cinematic"],
];
const DESIGNER_STEPS = ["Basics", "Look & feel", "Guest publishing"];
const DEFAULT_THEME = { template: "editorial", primaryColor: "#173a32", backgroundColor: "#f4f1e9", textColor: "#17221f", fontPairing: "editorial", density: "relaxed", logoUrl: "", currency: "EUR", welcomeMessage: "A cellar selected for this moment.", showProducer: true, showRegion: true, showVintage: true, showDescription: true };
const slugify = (value) => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function WinePreview({ item, name, theme, published }) {
  if (item?.bespoke && item.menu?.slug) {
    return <div className="wine-studio-device wine-studio-device--live"><div className="wine-studio-device__camera" /><iframe src={`/wine/${item.menu.slug}`} title={`${name || item.menu.name} current guest page`} /></div>;
  }

  return <div className="wine-studio-device wine-studio-device--actual"><div className="wine-studio-device__camera" /><div className="wine-studio-actual-preview">
    <StandardWineView
      previewMode
      menu={{ name: name || "Your wine list", slug: item?.menu?.slug }}
      items={item?.previewItems || []}
      experience={{ theme, availability_rules: item?.availabilityRules || {}, is_published: published }}
    />
  </div></div>;
}

export default function WineListStudioPage() {
  const searchParams = useSearchParams();
  const contextualDesignerOpened = useRef(false);
  const [data, setData] = useState({ lists: [], defaults: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [studioOpen, setStudioOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [designerStep, setDesignerStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "", locationId: "", theme: DEFAULT_THEME, availabilityRules: {}, isPublished: false });

  async function load() {
    setLoading(true); setError("");
    try { const response = await fetch("/api/wine-experiences", { cache: "no-store" }); const result = await response.json(); if (!response.ok) throw new Error(result.error || "Wine lists could not be loaded."); setData(result); }
    catch (loadError) { setError(loadError.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);
  const unassigned = useMemo(() => data.lists.filter((item) => !item.menu), [data.lists]);

  function openCreate(locationId = "") {
    setEditing(null);
    const selectedLocation = unassigned.find((item) => item.location.id === locationId) || unassigned[0];
    setForm({ name: selectedLocation ? `${selectedLocation.location.name} Wine` : "", slug: selectedLocation ? slugify(`${selectedLocation.location.name} Wine`) : "", locationId: selectedLocation?.location.id || "", theme: { ...DEFAULT_THEME }, availabilityRules: { ...(data.defaults?.availabilityRules || {}) }, isPublished: false });
    setDesignerStep(0);
    setStudioOpen(true);
  }
  function openEdit(item, initialStep = 0) {
    setEditing(item);
    setForm({ name: item.experience?.name || item.menu?.name || item.location.name, slug: item.slug, locationId: item.location.id, menuId: item.menu?.id, theme: { ...DEFAULT_THEME, ...(item.theme || {}) }, availabilityRules: { ...(data.defaults?.availabilityRules || {}), ...(item.availabilityRules || {}) }, isPublished: item.experience?.is_published === true });
    setDesignerStep(initialStep);
    setStudioOpen(true);
  }

  useEffect(() => {
    const requestedLocationId = searchParams.get("locationId");
    if (loading || !requestedLocationId || contextualDesignerOpened.current) return;
    contextualDesignerOpened.current = true;
    const requested = data.lists.find((item) => item.location.id === requestedLocationId);
    if (!requested) return;
    if (requested.menu) openEdit(requested, requested.bespoke ? 2 : 0);
    else openCreate(requestedLocationId);
  }, [data.lists, loading, searchParams]);
  useEffect(() => {
    if (!studioOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event) => { if (event.key === "Escape") setStudioOpen(false); };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [studioOpen]);
  const updateTheme = (key, value) => setForm((current) => ({ ...current, theme: { ...current.theme, [key]: value } }));
  const configured = useMemo(() => data.lists.filter((item) => item.menu), [data.lists]);
  const published = useMemo(() => configured.filter((item) => item.experience?.is_published), [configured]);
  const needsAttention = useMemo(() => configured.filter((item) => !item.experience?.is_published || !item.readiness?.availableCount), [configured]);
  const editingReadiness = editing?.readiness || {};
  const previewItem = editing || data.lists.find((item) => item.location.id === form.locationId) || null;

  async function save(event) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const response = await fetch("/api/wine-experiences", { method: editing ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(form) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || "Wine list could not be saved.");
      setNotice(editing ? "Wine-list design saved." : `${result.importedWines || 0} available wines imported into the new list.`); setStudioOpen(false); await load();
    } catch (saveError) { setError(saveError.message); } finally { setSaving(false); }
  }

  return <div className="wine-studio-page page-fade">
    <header className="wine-studio-hero"><div><span className="wine-studio-eyebrow">GUEST EXPERIENCE</span><h1>Digital Wine Lists</h1><p>Create, brand and publish venue wine lists without changing code. Compucash remains the source of stock truth.</p></div><button type="button" className="so-btn-primary" onClick={() => openCreate()} disabled={!unassigned.length}><PlusIcon /> Create wine list</button></header>
    <section className="wine-studio-flow" aria-label="Wine list publishing workflow">{["Choose venue", "Shape the experience", "Check availability", "Preview & publish"].map((step, index) => <div key={step}><span>{String(index + 1).padStart(2, "0")}</span><strong>{step}</strong></div>)}</section>
    <section className="wine-studio-summary" aria-label="Digital wine-list status">
      <div><span>Configured</span><strong>{configured.length}</strong><small>venue wine lists</small></div>
      <div><span>Live</span><strong>{published.length}</strong><small>available to guests</small></div>
      <div className={needsAttention.length ? "needs-attention" : "is-ready"}><span>Needs action</span><strong>{needsAttention.length}</strong><small>draft or without live wines</small></div>
      <div><span>Venues available</span><strong>{unassigned.length}</strong><small>ready for a new list</small></div>
    </section>
    {notice && <div className="wine-studio-notice"><CheckCircleIcon />{notice}<button onClick={() => setNotice("")} aria-label="Dismiss"><XMarkIcon /></button></div>}
    {error && <div className="wine-studio-error">{error}</div>}
    <div className="wine-studio-section-head"><div><span className="wine-studio-eyebrow">YOUR PORTFOLIO</span><h2>Venue experiences</h2></div><p>Design, preview and publish here. Manage wine content from its venue workspace.</p></div>
    {loading ? <div className="wine-studio-loading">Preparing your wine-list studio…</div> : <div className="wine-studio-grid">
      {configured.map((item) => <article className="wine-studio-card" key={item.location.id}>
        <div className="wine-studio-card__top"><span className={`wine-studio-status ${item.experience?.is_published ? "is-live" : ""}`}>{item.experience?.is_published ? "Published" : "Draft"}</span><span className="wine-studio-tier">{item.bespoke ? "Bespoke" : "Standard"}</span></div>
        <div className="wine-studio-card__visual" style={{ "--card-accent": item.theme.primaryColor, "--card-bg": item.theme.backgroundColor }}><SwatchIcon /><span>{item.theme.template || "Custom"}</span></div>
        <div className="wine-studio-card__body"><small>{item.location.name}</small><h3>{item.menu.name}</h3><p>{item.bespoke ? "A protected, individually art-directed Vaxeron experience." : "A reusable experience your team can customise and publish."}</p>
          <div className="wine-studio-card__readiness"><span><strong>{item.readiness?.contentCount || 0}</strong> selected wines</span><span><strong>{item.readiness?.availableCount || 0}</strong> available now</span>{Number(item.readiness?.missingPriceCount) > 0 && <span className="is-warning"><strong>{item.readiness.missingPriceCount}</strong> missing prices</span>}</div>
          <div className="wine-studio-card__url"><GlobeAltIcon /><span>vaxeron.com{item.readiness?.publicPath}</span></div>
        </div>
        <div className="wine-studio-card__actions"><button type="button" onClick={() => openEdit(item, item.bespoke ? 2 : 0)}><SwatchIcon /> {item.bespoke ? "Publishing" : "Visual editor"}</button><a href={`/wine/${item.menu.slug}`} target="_blank" rel="noreferrer"><ArrowTopRightOnSquareIcon /> {item.experience?.is_published ? "Open live" : "Preview"}</a></div>
        {!item.bespoke && !item.experience?.is_published && <button type="button" className="wine-studio-card__primary" onClick={() => openEdit(item, 2)}>Finish and publish <span>→</span></button>}
      </article>)}
      {unassigned.length > 0 && <button className="wine-studio-card wine-studio-card--new" onClick={() => openCreate()}><span><PlusIcon /></span><strong>Create the next guest wine experience</strong><small>{unassigned.length} venue{unassigned.length === 1 ? "" : "s"} available</small></button>}
    </div>}

    {studioOpen && typeof document !== "undefined" && createPortal(<div className="wine-studio-modal" role="dialog" aria-modal="true" aria-label="Wine list designer"><button className="wine-studio-modal__backdrop" onClick={() => setStudioOpen(false)} aria-label="Close designer" /><form className="wine-studio-designer" onSubmit={save}>
      <header><div><span className="wine-studio-eyebrow">{editing ? "VENUE WINE EXPERIENCE" : "NEW VENUE EXPERIENCE"}</span><h2>{editing ? form.name : "Create a digital wine list"}</h2><p>Make the essential choices now. Everything can be refined later.</p></div><button type="button" onClick={() => setStudioOpen(false)} aria-label="Close"><XMarkIcon /></button></header>
      <nav className="wine-studio-stepper" aria-label="Designer steps">{DESIGNER_STEPS.map((step, index) => <button key={step} type="button" disabled={editing?.bespoke && index < 2} className={`${designerStep === index ? "is-current" : ""} ${designerStep > index ? "is-complete" : ""}`} onClick={() => setDesignerStep(index)}><span>{designerStep > index ? "✓" : index + 1}</span><strong>{editing?.bespoke && index < 2 ? `${step} · bespoke` : step}</strong></button>)}</nav>
      <div className="wine-studio-designer__body"><section className="wine-studio-controls">
        {designerStep === 0 && <div className="wine-studio-step-panel"><div className="wine-studio-step-copy"><span>01 · FOUNDATION</span><h3>Name the guest experience</h3><p>Connect this list to its venue and introduce the cellar in one sentence.</p></div>
          {!editing && <label>Venue<select value={form.locationId} onChange={(event) => setForm({ ...form, locationId: event.target.value })} required>{unassigned.map((item) => <option key={item.location.id} value={item.location.id}>{item.location.name}</option>)}</select></label>}
          <label>Wine list name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value, ...(!editing ? { slug: slugify(event.target.value) } : {}) })} required /></label>
          <label>Welcome message<textarea value={form.theme.welcomeMessage} onChange={(event) => updateTheme("welcomeMessage", event.target.value)} maxLength={180} /></label>
          <label>Public address<div className="wine-studio-slug-field"><span>vaxeron.com/wine/</span><input value={form.slug} onChange={(event) => !editing && setForm({ ...form, slug: slugify(event.target.value) })} disabled={editing} required /></div></label>
        </div>}
        {designerStep === 1 && <div className="wine-studio-step-panel"><div className="wine-studio-step-copy"><span>02 · ART DIRECTION</span><h3>Shape the atmosphere</h3><p>Choose a starting style, then bring it closer to the venue’s own identity.</p></div>
          <fieldset><legend>Starting style</legend><div className="wine-studio-templates">{TEMPLATES.map(([value, label, detail]) => <button key={value} type="button" className={form.theme.template === value ? "is-selected" : ""} onClick={() => updateTheme("template", value)}><strong>{label}</strong><small>{detail}</small></button>)}</div></fieldset>
          <fieldset><legend>Brand palette</legend><div className="wine-studio-colors">{[["primaryColor", "Accent"], ["backgroundColor", "Canvas"], ["textColor", "Text"]].map(([key, label]) => <label key={key}>{label}<span><input type="color" value={form.theme[key]} onChange={(event) => updateTheme(key, event.target.value)} /><input value={form.theme[key]} onChange={(event) => updateTheme(key, event.target.value)} /></span></label>)}</div></fieldset>
          <div className="wine-studio-fields"><label>Typography<select value={form.theme.fontPairing} onChange={(event) => updateTheme("fontPairing", event.target.value)}><option value="editorial">Editorial serif</option><option value="modern">Modern sans</option><option value="classic">Classic hospitality</option></select></label><label>Spacing<select value={form.theme.density} onChange={(event) => updateTheme("density", event.target.value)}><option value="relaxed">Relaxed</option><option value="compact">Compact</option></select></label><label>Currency<select value={form.theme.currency} onChange={(event) => updateTheme("currency", event.target.value)}>{["EUR", "USD", "GBP", "SEK", "NOK", "DKK", "CHF"].map((currency) => <option key={currency} value={currency}>{currency}</option>)}</select></label><label>Logo URL <span className="wine-studio-optional">Optional</span><input value={form.theme.logoUrl} onChange={(event) => updateTheme("logoUrl", event.target.value)} placeholder="https://…/logo.svg" /></label></div>
        </div>}
        {designerStep === 2 && <div className="wine-studio-step-panel"><div className="wine-studio-step-copy"><span>03 · GUEST VIEW</span><h3>Decide what guests see</h3><p>Only available wines appear. Choose the useful details, review the address and publish when ready.</p></div>
          {editing?.bespoke ? <div className="wine-studio-bespoke-note"><SwatchIcon /><div><strong>Protected bespoke design</strong><p>This venue’s art-directed guest interface is shown exactly in the preview. Its visual system is managed separately; this panel controls whether guests can access it.</p></div></div> : <fieldset><legend>Wine details</legend><div className="wine-studio-toggles">{[["showProducer", "Producer"], ["showRegion", "Region"], ["showVintage", "Vintage"], ["showDescription", "Descriptions"]].map(([key, label]) => <label key={key}><input type="checkbox" checked={form.theme[key]} onChange={(event) => updateTheme(key, event.target.checked)} /><span>{label}</span></label>)}</div></fieldset>}
          <div className="wine-studio-availability-note"><CheckCircleIcon /><div><strong>Inventory protection is active</strong><p>Positive stock appears automatically. Wines at zero are kept away from the guest list.</p></div></div>
          {editing && <div className="wine-studio-publish-checks"><div><span>Selected wines</span><strong>{editingReadiness.contentCount || 0}</strong></div><div><span>Available now</span><strong>{editingReadiness.availableCount || 0}</strong></div><div><span>Missing prices</span><strong>{editingReadiness.missingPriceCount || 0}</strong></div></div>}
          <label className="wine-studio-publish"><input type="checkbox" checked={form.isPublished} onChange={(event) => setForm({ ...form, isPublished: event.target.checked })} /><span><strong>Publish for guests</strong><small>{form.isPublished ? "The list will be available at its public address." : "Keep this off to save a private draft."}</small></span></label>
        </div>}
      </section><aside className="wine-studio-live-preview"><div className="wine-studio-device-label"><DevicePhoneMobileIcon /> {previewItem?.bespoke ? "Current bespoke guest page" : "Live guest-page preview"} <span>{previewItem?.bespoke ? "Protected design" : "Unsaved changes shown"}</span></div><WinePreview item={previewItem} name={form.name} theme={form.theme} published={form.isPublished} /></aside></div>
      <footer><div className="wine-studio-footer-status"><GlobeAltIcon /><span><strong>{editing?.bespoke ? "Bespoke guest experience" : `${designerStep + 1} of ${DESIGNER_STEPS.length}`}</strong>{form.slug ? `/wine/${form.slug}` : "Private draft"}</span></div>{designerStep > 0 && !editing?.bespoke && <button type="button" className="so-btn-secondary" onClick={() => setDesignerStep((step) => step - 1)}>Back</button>}{designerStep < DESIGNER_STEPS.length - 1 ? <button type="button" className="so-btn-primary" onClick={() => setDesignerStep((step) => step + 1)} disabled={!form.name || !form.slug || (!editing && !form.locationId)}>Continue <span>→</span></button> : <button type="submit" className="so-btn-primary" disabled={saving || (!editing && !form.locationId)}>{saving ? "Saving…" : editing ? "Save experience" : "Create experience"}</button>}</footer>
    </form></div>, document.body)}
  </div>;
}
