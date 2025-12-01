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

  // Load public menu JSON
  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError("");

        const res = await fetch(`/api/public-menu/${slug}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const json = await res.json();

        const normalized = (json || []).map((d) => ({
          ...d,
          allergens: Array.isArray(d.allergens) ? d.allergens : [],
        }));

        console.log("Public menu normalized:", normalized);

        setDishes(normalized);
      } catch (err) {
        console.error(err);
        setError("Failed to load menu. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    if (slug) load();
  }, [slug]);

  // Unique sorted allergen list
  const allergenList = useMemo(() => {
    const s = new Set();
    dishes.forEach((d) => (d.allergens || []).forEach((a) => s.add(a)));
    return Array.from(s).sort();
  }, [dishes]);

  // Unique category list
  const categoryList = useMemo(() => {
    const s = new Set();
    dishes.forEach((d) => {
      if (d.category) s.add(d.category);
    });
    return Array.from(s).sort();
  }, [dishes]);

  const hasFilters = selectedAllergens.size > 0;
  const hasAnyDish = dishes.length > 0;

  // Count pills logic
  const safeCount = useMemo(() => {
    if (!hasFilters) {
      return dishes.filter((d) =>
        selectedCategory ? d.category === selectedCategory : true
      ).length;
    }

    let c = 0;
    dishes.forEach((d) => {
      if (selectedCategory && d.category !== selectedCategory) return;

      const containsSelected = (d.allergens || []).some((code) =>
        selectedAllergens.has(code)
      );

      if (!containsSelected) c += 1;
    });
    return c;
  }, [dishes, hasFilters, selectedAllergens, selectedCategory]);

  // Filtered list logic
  const filteredDishes = useMemo(() => {
    let list = dishes;

    if (selectedCategory) list = list.filter((d) => d.category === selectedCategory);

    if (!hasFilters) return list;

    // If "contains" mode is ON → show only dishes containing the selected allergens
    if (containsMode) {
      return list.filter((d) =>
        (d.allergens || []).some((code) => selectedAllergens.has(code))
      );
    }

    // ContainsMode OFF → show everything but add SAFE/CONTAINS badges
    return list;
  }, [dishes, hasFilters, selectedAllergens, containsMode, selectedCategory]);

  // Always render at least the full dishes list when no filters
  const listToRender =
    filteredDishes.length > 0 || !hasAnyDish ? filteredDishes : dishes;

  // Select/Unselect allergens
  const handleToggleAllergen = (code) => {
    setSelectedAllergens((prev) => {
      const next = new Set(prev);
      next.has(code) ? next.delete(code) : next.add(code);
      return next;
    });
  };

  // Category click
  const handleCategoryClick = (cat) => {
    setSelectedCategory((prev) => (prev === cat ? null : cat));
  };

  // Reset everything
  const handleResetAll = () => {
    setSelectedAllergens(new Set());
    setSelectedCategory(null);
    setContainsMode(false);
    setShowFilterPanel(false);
    setShowCategoryPanel(false);
  };

  const handleSelectAllAllergens = () => {
    setSelectedAllergens((prev) => {
      if (prev.size === allergenList.length) return new Set();
      return new Set(allergenList);
    });
  };

  const hasAnyActiveFilter =
    hasFilters || containsMode || selectedCategory !== null;

  const countText = hasFilters
    ? containsMode
      ? `${filteredDishes.length} dish${filteredDishes.length === 1 ? "" : "es"} containing selection`
      : `${safeCount} safe dish${safeCount === 1 ? "" : "es"}`
    : `${dishes.length} dish${dishes.length === 1 ? "" : "es"}`;

  const filterText = hasFilters
    ? containsMode
      ? "Showing only dishes that CONTAIN your selected allergens."
      : "SAFE dishes in green; dishes containing your allergens in red."
    : "Use filters to highlight or limit dishes by allergens and category.";

  return (
    <div className="guest-root">
      <div className="guest-shell">
        {/* HEADER */}
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

        {/* MAIN SECTION */}
        {loading ? (
          <div className="guest-empty">Loading menu…</div>
        ) : error ? (
          <div className="guest-empty">{error}</div>
        ) : !hasAnyDish ? (
          <div className="guest-empty">
            No dishes configured yet. Add dishes in your SelectorOS cockpit.
          </div>
        ) : (
          <section className="guest-grid">
            {listToRender.map((dish) => {
              const allergens = dish.allergens || [];
              const hasSelected = allergens.some((c) => selectedAllergens.has(c));

              // ALWAYS show badges when filters are used
              let badgeLabel = null;
              let badgeClass = "";
              if (hasFilters) {
                if (hasSelected) {
                  badgeLabel = "Contains";
                  badgeClass = "dish-chip dish-chip-contains";
                } else {
                  badgeLabel = "SAFE";
                  badgeClass = "dish-chip dish-chip-safe";
                }
              }

              return (
                <article key={dish.id} className="guest-card">
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

                    {typeof dish.price === "number" && (
                      <div className="guest-card-price">
                        {dish.price.toFixed(2)} €
                      </div>
                    )}
                  </div>

                  {dish.description && (
                    <p className="guest-card-desc">{dish.description}</p>
                  )}

                  <div className="guest-card-footer">
                    <span className="guest-card-allergens">
                      Allergens: {allergens.length ? allergens.join(", ") : "None"}
                    </span>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>

      {/* FLOATING FILTER BAR */}
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
                  {categoryList.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      className={
                        "guest-pill" +
                        (selectedCategory === cat ? " active" : "")
                      }
                      onClick={() => handleCategoryClick(cat)}
                    >
                      <span className="guest-pill-dot" />
                      {cat}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      {/* FLOATING DOCK */}
      {!loading && hasAnyDish && (
        <div className="guest-dock">
          <div className="guest-dock-inner">
            {/* Contains / Safe switch */}
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
                onClick={() => setShowFilterPanel((p) => !p)}
              >
                <span className="dock-icon-label">≡</span>
              </button>

              {/* Category toggle */}
              <button
                type="button"
                className={
                  "dock-icon" + (showCategoryPanel ? " dock-icon-active" : "")
                }
                onClick={() => setShowCategoryPanel((p) => !p)}
              >
                <span className="dock-icon-label">▦</span>
              </button>

              {/* Select all allergens */}
              <button
                type="button"
                className="dock-icon dock-icon-gold"
                onClick={handleSelectAllAllergens}
                disabled={allergenList.length === 0}
              >
                <span className="dock-icon-label">+</span>
              </button>

              {/* Reset */}
              <button
                type="button"
                className="dock-icon"
                onClick={handleResetAll}
                disabled={!hasAnyActiveFilter}
              >
                <span className="dock-icon-label">↻</span>
              </button>
            </div>

            {/* Counter + text */}
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
