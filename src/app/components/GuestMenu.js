"use client";

import { useEffect, useMemo, useState } from "react";
import "../../styles/guest.css";

export default function GuestMenu({ slug }) {
  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedAllergens, setSelectedAllergens] = useState(new Set());
  const [containsMode, setContainsMode] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showCategoryPanel, setShowCategoryPanel] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Load menu JSON from our public API
  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError("");

        const res = await fetch(`/api/public-menu/${slug}`);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const json = await res.json();

        const normalized = (json || []).map((d) => ({
          ...d,
          allergens: Array.isArray(d.allergens) ? d.allergens : [],
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

  // Unique sorted allergen codes
  const allergenList = useMemo(() => {
    const set = new Set();
    dishes.forEach((d) => (d.allergens || []).forEach((a) => set.add(a)));
    return Array.from(set).sort();
  }, [dishes]);

  // Unique sorted category list
  const categoryList = useMemo(() => {
    const set = new Set();
    dishes.forEach((d) => {
      if (d.category) set.add(d.category);
    });
    return Array.from(set).sort();
  }, [dishes]);

  const hasFilters = selectedAllergens.size > 0;
  const hasAnyDish = dishes.length > 0;

  // Safe count (how many dishes are SAFE given current filters/category)
  const safeCount = useMemo(() => {
    if (!hasFilters) {
      return dishes.filter((d) =>
        selectedCategory ? d.category === selectedCategory : true
      ).length;
    }

    let safe = 0;
    dishes.forEach((d) => {
      if (selectedCategory && d.category !== selectedCategory) return;
      const hasSelected = (d.allergens || []).some((code) =>
        selectedAllergens.has(code)
      );
      if (!hasSelected) safe += 1;
    });
    return safe;
  }, [dishes, hasFilters, selectedAllergens, selectedCategory]);

  // Main dish list logic
  const filteredDishes = useMemo(() => {
    let list = dishes;

    // Category filter first
    if (selectedCategory) {
      list = list.filter((d) => d.category === selectedCategory);
    }

    // No allergen filters → just category filter
    if (!hasFilters) {
      return list;
    }

    // With allergen filters:
    // containsMode = false → show only SAFE dishes (do NOT contain selection)
    // containsMode = true  → show only dishes that CONTAIN selected allergens
    return list.filter((d) => {
      const dishAllergens = d.allergens || [];
      const hasSelected = dishAllergens.some((code) =>
        selectedAllergens.has(code)
      );

      if (containsMode) {
        return hasSelected;      // show only "bad" dishes
      } else {
        return !hasSelected;     // show only SAFE dishes
      }
    });
  }, [dishes, hasFilters, selectedAllergens, containsMode, selectedCategory]);

  const handleToggleAllergen = (code) => {
    setSelectedAllergens((prev) => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
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
    setShowFilterPanel(false);
    setShowCategoryPanel(false);
  };

  const handleSelectAllAllergens = () => {
    setSelectedAllergens((prev) => {
      if (prev.size === allergenList.length) {
        return new Set();
      }
      return new Set(allergenList);
    });
  };

  const hasAnyActiveFilter =
    hasFilters || containsMode || selectedCategory !== null;

  // Decide what we actually render: if filters kill everything but we *do* have dishes,
  // still show the filtered result (empty grid) so it's clear no dish matches.
  const listToRender = filteredDishes;

  // Text for dock (you can tweak copy later)
  const countText = hasFilters
    ? containsMode
      ? `${filteredDishes.length} dish${
          filteredDishes.length === 1 ? "" : "es"
        } with selected allergens`
      : `${safeCount} safe dish${safeCount === 1 ? "" : "es"}`
    : `${dishes.length} dish${dishes.length === 1 ? "" : "es"}`;

  const filterText = hasFilters
    ? containsMode
      ? "Showing only dishes that CONTAIN the selected allergens."
      : "Showing only dishes that are SAFE for the selected allergens."
    : "Use filters to switch between safe dishes or those that contain the allergen.";

  return (
    <div className="guest-root">
      <div className="guest-shell">
        {/* Header */}
        <header className="guest-header">
          <div className="guest-header-main">
            <div className="guest-logo-circle">S</div>
            <div>
              <div className="guest-header-title">
                Safe dishes for{" "}
                <span>{slug ? slug.replace(/-/g, " ") : "this restaurant"}</span>
              </div>
              <p className="guest-header-subtitle">
                Live view of your configured dishes. Filters never delete data –
                they only change what’s visible.
              </p>
            </div>
          </div>

          <div className="guest-meta">
            <div>SELECTOROS • GUEST VIEW</div>
            <div>LIVE DATA FROM YOUR COCKPIT</div>
          </div>
        </header>

        {/* Content */}
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
            No dishes match your current filters. Try changing or resetting
            filters.
          </div>
        ) : (
          <section className="guest-grid">
            {listToRender.map((dish) => {
              const dishAllergens = dish.allergens || [];
              const dishHasSelected =
                hasFilters &&
                dishAllergens.some((code) => selectedAllergens.has(code));

              // Badge logic:
              // - containsMode = false (SAFE view) -> show SAFE pill
              // - containsMode = true (CONTAINS view) -> show Contains pill
              let badgeLabel = null;
              let badgeClass = "";
              if (hasFilters) {
                if (containsMode && dishHasSelected) {
                  badgeLabel = "Contains";
                  badgeClass = "dish-chip dish-chip-contains";
                } else if (!containsMode && !dishHasSelected) {
                  badgeLabel = "SAFE";
                  badgeClass = "dish-chip dish-chip-safe";
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

                    <div className="guest-card-price">
                      {typeof dish.price === "number" &&
                      !Number.isNaN(dish.price)
                        ? `${dish.price.toFixed(2)} €`
                        : ""}
                    </div>
                  </div>

                  {dish.description && (
                    <p className="guest-card-desc">{dish.description}</p>
                  )}

                  <div className="guest-card-footer">
                    <span className="guest-card-allergens">
                      Allergens:{" "}
                      {dishAllergens.length
                        ? dishAllergens.join(", ")
                        : "None"}
                    </span>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>

      {/* FLOATING FILTER BAR (chips) */}
      {!loading &&
        hasAnyDish &&
        (showFilterPanel || showCategoryPanel) && (
          <div className="guest-filterbar">
            <div className="guest-filterbar-inner">
              {showFilterPanel && allergenList.length > 0 && (
                <div className="guest-chips-row guest-chips-row--floating">
                  {allergenList.map((code) => (
                    <button
                      key={code}
                      type="button"
                      className={
                        "guest-pill" +
                        (selectedAllergens.has(code) ? " active" : "")
                      }
                      onClick={() => handleToggleAllergen(code)}
                    >
                      <span className="guest-pill-dot" />
                      {code}
                    </button>
                  ))}
                </div>
              )}

              {showCategoryPanel && categoryList.length > 0 && (
                <div className="guest-chips-row guest-chips-row--floating guest-chips-row--categories">
                  {categoryList.map((category) => (
                    <button
                      key={category}
                      type="button"
                      className={
                        "guest-pill" +
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
        )}

      {/* Floating dock – only switch + icons + helper text */}
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
                  "dock-icon" + (showFilterPanel ? " dock-icon-active" : "")
                }
                onClick={() => {
                  setShowFilterPanel((prev) => !prev);
                  if (!showFilterPanel) setShowCategoryPanel(false);
                }}
              >
                <span className="dock-icon-label">≡</span>
              </button>

              {/* Category toggle */}
              <button
                type="button"
                className={
                  "dock-icon" + (showCategoryPanel ? " dock-icon-active" : "")
                }
                onClick={() => {
                  setShowCategoryPanel((prev) => !prev);
                  if (!showCategoryPanel) setShowFilterPanel(false);
                }}
              >
                <span className="dock-icon-label">▦</span>
              </button>

              {/* Select all allergens / clear */}
              <button
                type="button"
                className="dock-icon dock-icon-gold"
                onClick={handleSelectAllAllergens}
                disabled={allergenList.length === 0}
              >
                <span className="dock-icon-label">+</span>
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

            <div className="guest-dock-left">
              <span className="guest-count-pill">{countText}</span>
              <span className="guest-dock-text">{filterText}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
