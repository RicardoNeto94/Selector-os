"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeftIcon, ArrowTopRightOnSquareIcon, PlusIcon, Squares2X2Icon, TrashIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import SpaConfirmDialog from "./SpaConfirmDialog";
import "@/styles/spa-catalogue.css";

export default function SpaCategoryManager({ type, title, description, singular, basePath }) {
  const supabase = createClient();
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [notice, setNotice] = useState("");

  async function loadCategories() {
    setLoading(true);
    const { data, error } = await supabase.from("spa_categories").select("*").eq("type", type).order("position");
    if (error) setNotice(error.message);
    setCategories(data || []);
    setLoading(false);
  }

  useEffect(() => { loadCategories(); }, [type]);

  async function createCategory(event) {
    event?.preventDefault();
    if (!newCategory.trim() || saving) return;
    setSaving(true);
    setNotice("");
    const { error } = await supabase.from("spa_categories").insert([{ name: newCategory.trim(), type, position: categories.length + 1 }]);
    if (error) setNotice(error.message);
    else {
      setNewCategory("");
      setShowCreateCategory(false);
      await loadCategories();
    }
    setSaving(false);
  }

  async function deleteCategory() {
    if (!pendingDelete) return;
    setSaving(true);
    const { error } = await supabase.from("spa_categories").delete().eq("id", pendingDelete.id);
    if (error) setNotice(error.message);
    else await loadCategories();
    setPendingDelete(null);
    setSaving(false);
  }

  return (
    <main className="spa-catalogue-page">
      <header className="spa-catalogue-hero">
        <div className="spa-catalogue-hero-copy">
          <Link href="/dashboard/spa" className="spa-hero-back spa-hero-back-inline"><ArrowLeftIcon />Back to Spa</Link>
          <span>Burman Spa · Catalogue</span>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        <div className="spa-catalogue-hero-actions">
          <div className="spa-catalogue-summary">
            <strong>{categories.length}</strong>
            <span>Active categories</span>
          </div>
          <button type="button" className="spa-button-primary spa-create-category-trigger" onClick={() => setShowCreateCategory(true)}><PlusIcon />New category</button>
        </div>
      </header>

      {notice && <div className="spa-catalogue-notice">{notice}</div>}

      <section className="spa-category-section">
        <div className="spa-section-heading">
          <div><span>Guest structure</span><h2>Catalogue categories</h2></div>
          <small>Open a category to manage its products, presentation and pricing.</small>
        </div>

        {loading ? (
          <div className="spa-category-skeletons">{[1,2,3].map((item) => <i key={item} />)}</div>
        ) : categories.length === 0 ? (
          <div className="spa-category-empty"><Squares2X2Icon /><h3>No categories yet</h3><p>Create the first collection above to begin building this guest catalogue.</p></div>
        ) : (
          <div className="spa-category-grid">
            {categories.map((category, index) => (
              <article key={category.id} className="spa-category-card">
                <div className="spa-category-card-top"><span>{String(index + 1).padStart(2, "0")}</span><Squares2X2Icon /></div>
                <div><small>{singular}</small><h3>{category.name}</h3><p>Manage products, visibility, descriptions and guest-facing prices.</p></div>
                <div className="spa-category-actions">
                  <Link href={`${basePath}/${category.id}`}>Open editor <span>↗</span></Link>
                  <button type="button" onClick={() => setPendingDelete(category)} aria-label={`Delete ${category.name}`}><TrashIcon /></button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <footer className="spa-catalogue-footer">
        <Link href="/dashboard/spa"><ArrowLeftIcon />Spa overview</Link>
        <a href="/spa/burman" target="_blank" rel="noreferrer">Open guest experience <ArrowTopRightOnSquareIcon /></a>
      </footer>

      <SpaConfirmDialog
        open={Boolean(pendingDelete)}
        title={`Delete “${pendingDelete?.name || "category"}”?`}
        description="This permanently removes the category. Delete or relocate its products first if they must remain available to guests."
        confirmLabel="Delete category"
        busy={saving}
        onCancel={() => setPendingDelete(null)}
        onConfirm={deleteCategory}
      />

      {showCreateCategory && (
        <div className="spa-create-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowCreateCategory(false); }}>
          <form className="spa-create-dialog" onSubmit={createCategory} role="dialog" aria-modal="true" aria-labelledby="spa-create-category-title">
            <span>New guest collection</span>
            <h2 id="spa-create-category-title">Create a {singular.toLowerCase()}</h2>
            <p>Add a clear category name. You can open it immediately afterwards to organise products, descriptions and pricing.</p>
            <label>
              <span>Category name</span>
              <input autoFocus value={newCategory} onChange={(event) => setNewCategory(event.target.value)} placeholder={`e.g. ${singular}`} />
            </label>
            <div>
              <button type="button" className="spa-button-secondary" onClick={() => { setShowCreateCategory(false); setNewCategory(""); }}>Cancel</button>
              <button type="submit" className="spa-button-primary" disabled={!newCategory.trim() || saving}><PlusIcon />{saving ? "Adding…" : "Create category"}</button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
