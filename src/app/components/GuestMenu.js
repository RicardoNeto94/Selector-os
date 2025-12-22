"use client";

import { useEffect, useMemo, useState } from "react";
import "../../styles/guest.css";

// 🔹 Master allergen list (full set, independent of dishes)
const ALLERGENS = [
  "GL", // Gluten
  "CR", // Crustaceans
  "EG", // Eggs
  "FL", // Fish
  "PE", // Peanuts
  "SO", // Soya
  "MI", // Milk
  "NU", // Nuts
  "SE", // Sesame
  "CE", // Celery
  "MU", // Mustard
  "SU", // Sulphites
  "LU", // Lupin
  "MO", // Molluscs
  "GA", // Garlic
  "ON", // Onion
  "MR", // Mushrooms
  "CL", // Chilli / Custom
];

// ✅ Labels shown ONLY in the modal pills
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
  const [containsMode, setContainsMode] = useState(false); // OFF = SAFE, ON = CONTAINS
  const [selectedCategory, setSelectedCategory] = useState(null);

  // which bottom sheet is open? "filters" | "categories" | null
  const [activeSheet, setActiveSheet] = useState(null);

  // 👇 drag-to-dismiss state for bottom sheets
  const [isDraggingSheet, setIsDraggingSheet] = useState(false);
  const [dragStartY, setDragStartY] = useState(null);
  const [dragOffsetY, setDragOffsetY] = useState(0);

  // Load menu JSON from public API
  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError("");

        const res = await fetch(`/api/public-menu/${slug}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const json = await res.json();

        // Support both shapes:
        // 1) old: [ { ...dish } ]
        // 2) new: { logo_url, dishes: [ { ...dish } ] }
        let logo = null;
        let dishData = [];

        if (Array.isArray(json)) {
          dishData = json;
        } else if (json && Array.isArray(json.dishes)) {
          logo = json.logo_url || null;
          dishData = json.dishes;
        }

        setRestaurantLogoUrl(logo);

        const normalized = (dishData || []).map((d) => ({
          ...d,
          allergens: Array.isArray(d.allergens)
            ? d.allergens.map((a) => String(a).trim().toUpperCase())
            : [],
        }));

        setDishes(normalized);
      } catch (err) {
        console.error("Failed to load public menu", err);
        setError("Failed to load menu. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    if (slug) load();
  }, [slug]);

  // 🔹 Use fixed master allergen list (not derived from dishes)
  const allergenList = useMemo(() => ALLERGENS, []);

  // Unique sorted category list (still derived from dishes)
  const categoryList = useMemo(() => {
    const set = new Set();
    dishes.forEach((d) => {
      if (d.category) set.add(d.category);
    });
    return Array.from(set).sort();
  }, [dishes]);

  const hasFilters = selectedAllergens.size > 0;
  const hasAnyDish = dishes.length > 0;

  // === MAIN FILTERING LOGIC =====================================
  const filteredDishes = useMemo(() => {
    let list = dishes;

    // category filter
    if (selectedCategory) {
      list = list.filter((d) => d.category === selectedCategory);
    }

    if (!hasFilters) return list;

    return list.filter((d) => {
      const dishAllergens = d.allergens || [];
      const hasSelected = dishAllergens.some((code) =>
        selectedAllergens.has(code)
      );

      // toggle OFF → safe only; toggle ON → containing only
      return containsMode ? hasSelected : !hasSelected;
    });
  }, [dishes, selectedCategory, hasFilters, selectedAllergens, containsMode]);

  const handleToggleAllergen = (code) => {
    setSelectedAllergens((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const handleCategoryClick = (category) => {
    setSelectedCategory((prev) => (prev === category ? null : category));
  };

  const handleResetAll = () => {
    setSelectedAllergens(new Set());
    setContainsMode(false);
    setSelectedCategory(null);
    setActiveSheet(null);
    setDragOffsetY(0);
    setIsDraggingSheet(false);
    setDragStartY(null);
  };

  const handleSelectAllAllergens = () => {
    setSelectedAllergens((prev) => {
      if (prev.size === allergenList.length) return new Set();
      return new Set(allergenList);
    });
  };

  const hasAnyActiveFilter =
    hasFilters || containsMode || selectedCategory !== null;

  const listToRender = filteredDishes;

  const openFiltersSheet = () => {
    setActiveSheet((prev) => (prev === "filters" ? null : "filters"));
    setDragOffsetY(0);
  };

  const openCategoriesSheet = () => {
    setActiveSheet((prev) => (prev === "categories" ? null : "categories"));
    setDragOffsetY(0);
  };

  const closeSheet = () => {
    setActiveSheet(null);
    setDragOffsetY(0);
    setIsDraggingSheet(false);
    setDragStartY(null);
  };

  // 🔹 Drag helpers (mouse + touch) for bottom sheet
  const getClientY = (event) => {
    if ("touches" in event && event.touches[0]) return event.touches[0].clientY;
    if ("changedTouches" in event && event.changedTouches[0])
      return event.changedTouches[0].clientY;
    return event.clientY;
  };

  const handleSheetDragStart = (event) => {
    if (!activeSheet) return;
    const y = getClientY(event);
    if (y == null) return;
    setIsDraggingSheet(true);
    setDragStartY(y);
  };

  const handleSheetDragMove = (event) => {
    if (!isDraggingSheet || dragStartY == null) return;
    const y = getClientY(event);
    if (y == null) return;
    const delta = y - dragStartY;
    setDragOffsetY(delta > 0 ? delta : 0);
  };

  const handleSheetDragEnd = () => {
    if (!isDraggingSheet) return;

    const threshold = 80;
    if (dragOffsetY > threshold) closeSheet();
    else setDragOffsetY(0);

    setIsDraggingSheet(false);
    setDragStartY(null);
  };

  return (
    <div className="guest-root">
      {/* 🔹 Sticky frosted header */}
      <header className="glass-header">
        <div className="guest-shell">
          <div className="guest-header">
            <div className="guest-logo-image-wrap">
              {restaurantLogoUrl ? (
                <img
                  src={restaurantLogoUrl}
                  alt="Restaurant logo"
                  className="guest-header-logo-img"
                />
              ) : (
                <div className="guest-logo-circle">S</div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 🔹 Main content frame */}
      <div className="guest-shell">
        {loading ? (
          <div className="guest-empty">Loading menu…</div>
        ) : error ? (
          <div className="guest-empty">{error}</div>
        ) : !hasAnyDish ? (
          <div className="guest-empty">
            No dishes configured yet. Add dishes in your SelectorOS back office.
          </div>
        ) : listToRender.length === 0 ? (
          <div className="guest-empty">
            No dishes match your current filters. Adjust allergens or category.
          </div>
        ) : (
          <section className="guest-grid">
            {listToRender.map((dish) => {
              const dishAllergens = dish.allergens || [];
              const dishHasSelected =
                hasFilters &&
                dishAllergens.some((code) => selectedAllergens.has(code));

              // === BADGE LOGIC =====================================
              let badgeLabel = null;
              let badgeClass = "";
              if (hasFilters) {
                if (!containsMode && !dishHasSelected) {
                  badgeLabel = "Safe";
                  badgeClass = "dish-chip dish-chip-safe";
                } else if (containsMode && dishHasSelected) {
                  badgeLabel = "Contains";
                  badgeClass = "dish-chip dish-chip-contains";
                }
              }

              return (
                <article
                  key={dish.id ?? dish.name + (dish.category || "")}
                  className="guest-card"
                >
                  <div className="guest-card-header">
                    <div>
                      <div className="dish-chip-row">
                        {badgeLabel && (
                          <span className={badgeClass}>{badgeLabel}</span>
                        )}
                        <span className="dish-chip dish-chip-category">
                          {dish.category || "Dish"}
                        </span>
                      </div>

                      <div className="guest-card-name">{dish.name}</div>
                    </div>
                  </div>

                  {dish.description && (
                    <p className="guest-card-desc">{dish.description}</p>
                  )}

                  {/* ✅ Dish card allergens as COLORED CODE PILLS */}
                  <div className="guest-card-footer">
                    <div className="guest-card-allergens">
                      <span className="guest-card-allergens-label">
                        Allergens:
                      </span>

                      {dishAllergens.length ? (
                        <div className="guest-card-allergen-pills">
                          {dishAllergens.map((code) => (
                            <span
                              key={code}
                              className={"alg-pill alg-" + code.toLowerCase()}
                              title={code}
                            >
                              {code}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="guest-card-allergens-none">None</span>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>

      {/* 🔹 Floating dock – iOS style (UNCHANGED) */}
      {!loading && hasAnyDish && (
        <div className="guest-dock">
          <div className="guest-dock-inner">
            {/* Contain toggle (green iOS switch) */}
            <button
              type="button"
              className={"ios-switch" + (containsMode ? " ios-switch-on" : "")}
              onClick={() => setContainsMode((prev) => !prev)}
              disabled={!hasFilters}
            >
              <span className="ios-switch-knob" />
            </button>

            <div className="guest-dock-icons">
              {/* Filter toggle */}
              <button
                type="button"
                className={
                  "dock-icon" +
                  (activeSheet === "filters" ? " dock-icon-active" : "")
                }
                onClick={openFiltersSheet}
              >
                <span className="dock-icon-label">≡</span>
              </button>

              {/* Category toggle */}
              <button
                type="button"
                className={
                  "dock-icon" +
                  (activeSheet === "categories" ? " dock-icon-active" : "")
                }
                onClick={openCategoriesSheet}
              >
                <span className="dock-icon-label">▦</span>
              </button>

              {/* Reset all */}
              <button
                type="button"
                className="dock-icon"
                onClick={handleResetAll}
                disabled={!hasAnyActiveFilter}
              >
                <span className="dock-icon-label">↻</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Premium modal (always mounted) */}
      <div
        className={"guest-sheet-backdrop" + (activeSheet ? " is-open" : "")}
        onClick={closeSheet}
        aria-hidden={!activeSheet}
        style={{
          // ✅ This is the "dock disappeared" fix:
          // When closed, don't let the backdrop block clicks/visibility.
          pointerEvents: activeSheet ? "auto" : "none",
        }}
      >
        <div
          className={
            "guest-sheet guest-sheet--premium" + (activeSheet ? " is-open" : "")
          }
          style={{
            transform: `translateY(${activeSheet ? dragOffsetY : 24}px)`,
          }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={handleSheetDragStart}
          onMouseMove={handleSheetDragMove}
          onMouseUp={handleSheetDragEnd}
          onMouseLeave={handleSheetDragEnd}
          onTouchStart={handleSheetDragStart}
          onTouchMove={handleSheetDragMove}
          onTouchEnd={handleSheetDragEnd}
        >
          <div className="guest-sheet-handle" />

          {/* Top bar */}
          <div className="guest-sheet-top">
            <div className="guest-sheet-title">
              {activeSheet === "categories"
                ? "Categories"
                : activeSheet === "filters"
                ? "Filters"
                : "Menu"}
            </div>

            <button
              type="button"
              className="guest-sheet-close"
              aria-label="Close"
              onClick={closeSheet}
            >
              ×
            </button>
          </div>

          {/* Segmented control */}
          <div className="guest-segment" role="tablist" aria-label="Sheet mode">
            <button
              type="button"
              className={
                "guest-seg-btn" + (activeSheet === "filters" ? " active" : "")
              }
              onClick={() => {
                setActiveSheet("filters");
                setDragOffsetY(0);
              }}
              role="tab"
              aria-selected={activeSheet === "filters"}
            >
              Filters
            </button>
            <button
              type="button"
              className={
                "guest-seg-btn" + (activeSheet === "categories" ? " active" : "")
              }
              onClick={() => {
                setActiveSheet("categories");
                setDragOffsetY(0);
              }}
              role="tab"
              aria-selected={activeSheet === "categories"}
            >
              Categories
            </button>
            <div
              className={
                "guest-seg-indicator" +
                (activeSheet === "categories" ? " right" : " left")
              }
            />
          </div>

          {/* Content */}
          <div className="guest-sheet-body guest-sheet-body--premium">
            {/* Filters panel */}
            <div
              className={
                "guest-sheet-panel" + (activeSheet === "filters" ? " show" : "")
              }
            >
              <p className="guest-sheet-sub">
                Tap allergens the guest wants to avoid or inspect.
              </p>

              <div className="guest-sheet-pills-grid">
                {allergenList.map((code) => (
                  <button
                    key={code}
                    type="button"
                    className={
                      "guest-pill guest-pill--premium" +
                      (selectedAllergens.has(code) ? " active" : "")
                    }
                    onClick={() => handleToggleAllergen(code)}
                  >
                    <span className="guest-pill-dot" />
                    <span className="guest-pill-code">{code}</span>
                    <span className="guest-pill-name">
                      {ALLERGEN_LABELS[code] ?? code}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Categories panel */}
            <div
              className={
                "guest-sheet-panel" +
                (activeSheet === "categories" ? " show" : "")
              }
            >
              <p className="guest-sheet-sub">
                Focus on a specific part of the menu.
              </p>

              {categoryList.length === 0 ? (
                <p className="guest-sheet-empty">No categories configured.</p>
              ) : (
                <div className="guest-sheet-pills-grid">
                  {categoryList.map((category) => (
                    <button
                      key={category}
                      type="button"
                      className={
                        "guest-pill guest-pill--premium" +
                        (selectedCategory === category ? " active" : "")
                      }
                      onClick={() => handleCategoryClick(category)}
                    >
                      <span className="guest-pill-dot" />
                      {category}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="guest-sheet-footer guest-sheet-footer--premium">
            {activeSheet === "filters" ? (
              <button
                type="button"
                className="guest-sheet-btn ghost"
                onClick={handleSelectAllAllergens}
              >
                {selectedAllergens.size === allergenList.length
                  ? "Clear all"
                  : "Select all"}
              </button>
            ) : (
              <button
                type="button"
                className="guest-sheet-btn ghost"
                onClick={() => setSelectedCategory(null)}
              >
                Clear category
              </button>
            )}

            <button
              type="button"
              className="guest-sheet-btn"
              onClick={closeSheet}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
