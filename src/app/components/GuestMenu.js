"use client";

import { useEffect, useMemo, useState } from "react";
import "../../styles/guest.css";

export default function GuestMenu({ slug }) {
  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedAllergens, setSelectedAllergens] = useState(new Set());
  const [containsMode, setContainsMode] = useState(false); // switch in dock
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

  // Safe count for dock: how many dishes do NOT contain selected allergens,
  // respecting the current category filter (if any).
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

    // Apply category filter first
    if (selectedCategory) {
      list = list.filter((d) => d.category === selectedCategory);
    }

    if (!hasFilters) {
      // No allergen filters selected → show all (respecting category filter only)
      return list;
    }

    // We have selected allergens → filter based on mode
    return list.filter((d) => {
      const dishAllergens = d.allergens || [];
      const hasSelected = dishAllergens.some((code) =>
        selectedAllergens.has(code)
      );

      // Contains mode ON → only dishes that contain selected allergen(s)
      if (containsMode) {
        return hasSelected;
      }

      // SAFE mode (switch OFF) → only dishes that do NOT contain any selected allergen
      return !hasSelected;
    });
  }, [dishes, hasFilters, selectedAllergens, containsMode, selectedCategory]);
 // Main dish list logic
 
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
  };

  const handleSelectAllAllergens = () => {
    setSelectedAllergens((prev) => {
      if (prev.size === allergenList.length) {
        return new Set();
      }
      return new Set(allergenList);
    });
  };

  // NEW: make filter/category buttons mutually exclusive
  const handleFilterButtonClick = () => {
    setShowFilterPanel((prev) => {
      const next = !prev;
      if (next) {
        setShowCategoryPanel(false);
      }
      return next;
    });
  };

  const handleCategoryButtonClick = () => {
    setShowCategoryPanel((prev) => {
      const next = !prev;
      if (next) {
        setShowFilterPanel(false);
      }
      return next;
    });
  };

  const hasAnyActiveFilter =
    hasFilters || containsMode || selectedCategory !== null;

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
                Select allergen codes, then use the dock to switch between
                SAFE view and Contains view.
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
        ) : filteredDishes.length === 0 ? (
          <div className="guest-empty">
            No dishes match the current selection. Try changing or resetting
            your filters.
          </div>
        ) : (
          <section className="guest-grid">
            {filteredDishes.map((dish) => {
              const dishAllergens = dish.allergens || [];
              const dishHasSelected =
                hasFilters &&
                dishAllergens.some((code) => selectedAllergens.has(code));

              // Badge logic – only when we are in "Contains" mode AND have filters
              let badgeLabel = null;
              let badgeClass = "";
              if (hasFilters && containsMode) {
                if (dishHasSelected) {
                  badgeLabel = "Contains";
                  badgeClass = "dish-chip dish-chip-contains";
                } else {
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
                      {/* pills row */}
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
                    <span className="guest-safe-tag">
                      {hasFilters && containsMode
                        ? `${safeCount} safe left`
                        : `${filteredDishes.length} dish${
                            filteredDishes.length === 1 ? "" : "es"
                          }`}
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
        dishes.length > 0 &&
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

      {/* Floating dock – switch + 4 icon buttons */}
      {!loading && dishes.length > 0 && (
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
                onClick={handleFilterButtonClick}
              >
                <span className="dock-icon-label">≡</span>
              </button>

              {/* Category toggle */}
              <button
                type="button"
                className={
                  "dock-icon" + (showCategoryPanel ? " dock-icon-active" : "")
                }
                onClick={handleCategoryButtonClick}
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
          </div>
        </div>
      )}
    </div>
  );
}
