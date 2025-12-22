"use client";

import { useEffect, useMemo, useState } from "react";
import "../../styles/guest.css";

// 🔹 Master allergen list
const ALLERGENS = [
  "GL", "CR", "EG", "FL", "PE", "SO", "MI", "NU", "SE",
  "CE", "MU", "SU", "LU", "MO", "GA", "ON", "MR", "CL",
];

// 🔹 Allergen labels (used ONLY in filters modal)
const ALLERGEN_LABELS = {
  GL: "Gluten",
  CR: "Crustaceans",
  EG: "Eggs",
  FL: "Fish",
  PE: "Peanuts",
  SO: "Soya",
  MI: "Milk",
  NU: "Nuts",
  SE: "Sesame",
  CE: "Celery",
  MU: "Mustard",
  SU: "Sulphites",
  LU: "Lupin",
  MO: "Molluscs",
  GA: "Garlic",
  ON: "Onion",
  MR: "Mushrooms",
  CL: "Chilli",
};

export default function GuestMenu({ slug }) {
  const [dishes, setDishes] = useState([]);
  const [restaurantLogoUrl, setRestaurantLogoUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedAllergens, setSelectedAllergens] = useState(new Set());
  const [containsMode, setContainsMode] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [activeSheet, setActiveSheet] = useState(null);

  const [isDraggingSheet, setIsDraggingSheet] = useState(false);
  const [dragStartY, setDragStartY] = useState(null);
  const [dragOffsetY, setDragOffsetY] = useState(0);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError("");

        const res = await fetch(`/api/public-menu/${slug}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const json = await res.json();
        let logo = null;
        let dishData = [];

        if (Array.isArray(json)) {
          dishData = json;
        } else if (json?.dishes) {
          logo = json.logo_url || null;
          dishData = json.dishes;
        }

        setRestaurantLogoUrl(logo);

        setDishes(
          dishData.map((d) => ({
            ...d,
            allergens: Array.isArray(d.allergens)
              ? d.allergens.map((a) => String(a).toUpperCase())
              : [],
          }))
        );
      } catch (err) {
        console.error(err);
        setError("Failed to load menu.");
      } finally {
        setLoading(false);
      }
    }

    if (slug) load();
  }, [slug]);

  const allergenList = useMemo(() => ALLERGENS, []);
  const categoryList = useMemo(() => {
    const set = new Set();
    dishes.forEach((d) => d.category && set.add(d.category));
    return [...set].sort();
  }, [dishes]);

  const filteredDishes = useMemo(() => {
    let list = dishes;
    if (selectedCategory) {
      list = list.filter((d) => d.category === selectedCategory);
    }
    if (!selectedAllergens.size) return list;

    return list.filter((d) => {
      const hasSelected = d.allergens.some((a) =>
        selectedAllergens.has(a)
      );
      return containsMode ? hasSelected : !hasSelected;
    });
  }, [dishes, selectedCategory, selectedAllergens, containsMode]);

  const handleToggleAllergen = (code) => {
    setSelectedAllergens((prev) => {
      const next = new Set(prev);
      next.has(code) ? next.delete(code) : next.add(code);
      return next;
    });
  };

  const handleSelectAllAllergens = () => {
    setSelectedAllergens((prev) =>
      prev.size === allergenList.length ? new Set() : new Set(allergenList)
    );
  };

  const closeSheet = () => {
    setActiveSheet(null);
    setDragOffsetY(0);
    setIsDraggingSheet(false);
    setDragStartY(null);
  };

  const getClientY = (e) =>
    e.touches?.[0]?.clientY ??
    e.changedTouches?.[0]?.clientY ??
    e.clientY;

  const handleSheetDragStart = (e) => {
    if (!activeSheet) return;
    setIsDraggingSheet(true);
    setDragStartY(getClientY(e));
  };

  const handleSheetDragMove = (e) => {
    if (!isDraggingSheet || dragStartY == null) return;
    const delta = getClientY(e) - dragStartY;
    setDragOffsetY(delta > 0 ? delta : 0);
  };

  const handleSheetDragEnd = () => {
    if (dragOffsetY > 80) closeSheet();
    else setDragOffsetY(0);
    setIsDraggingSheet(false);
    setDragStartY(null);
  };

  return (
    <div className="guest-root">
      {/* HEADER */}
      <header className="glass-header">
        <div className="guest-shell">
          <div className="guest-header">
            {restaurantLogoUrl && (
              <img
                src={restaurantLogoUrl}
                className="guest-header-logo-img"
                alt="Restaurant logo"
              />
            )}
          </div>
        </div>
      </header>

      {/* GRID */}
      <div className="guest-shell">
        {filteredDishes.length === 0 ? (
          <div className="guest-empty">No dishes match your filters.</div>
        ) : (
          <section className="guest-grid">
            {filteredDishes.map((dish) => (
              <article key={dish.id} className="guest-card">
                <div className="dish-chip-row">
                  <span className="dish-chip dish-chip-category">
                    {dish.category}
                  </span>
                </div>
                <div className="guest-card-name">{dish.name}</div>
                {dish.description && (
                  <p className="guest-card-desc">{dish.description}</p>
                )}
                <div className="guest-card-footer">
                  Allergens:{" "}
                  {dish.allergens.length
                    ? dish.allergens.join(", ")
                    : "None"}
                </div>
              </article>
            ))}
          </section>
        )}
      </div>

      {/* PREMIUM MODAL */}
      <div
        className={"guest-sheet-backdrop" + (activeSheet ? " is-open" : "")}
        onClick={closeSheet}
      >
        <div
          className={
            "guest-sheet guest-sheet--premium" +
            (activeSheet ? " is-open" : "")
          }
          style={{
            transform: `translateY(${activeSheet ? dragOffsetY : 24}px)`,
          }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={handleSheetDragStart}
          onMouseMove={handleSheetDragMove}
          onMouseUp={handleSheetDragEnd}
          onTouchStart={handleSheetDragStart}
          onTouchMove={handleSheetDragMove}
          onTouchEnd={handleSheetDragEnd}
        >
          <div className="guest-sheet-handle" />

          {/* FILTERS */}
          {activeSheet === "filters" && (
            <div className="guest-sheet-body">
              <div className="guest-sheet-pills-grid">
                {allergenList.map((code) => (
                  <button
                    key={code}
                    className={
                      "guest-pill guest-pill--premium" +
                      (selectedAllergens.has(code) ? " active" : "")
                    }
                    onClick={() => handleToggleAllergen(code)}
                  >
                    <span className="guest-pill-dot" />
                    <span className="guest-pill-code">{code}</span>
                    <span className="guest-pill-name">
                      {ALLERGEN_LABELS[code]}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="guest-sheet-footer guest-sheet-footer--premium">
            <button
              className="guest-sheet-btn ghost"
              onClick={handleSelectAllAllergens}
            >
              Select all
            </button>
            <button className="guest-sheet-btn" onClick={closeSheet}>
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
