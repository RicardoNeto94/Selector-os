"use client";

import { useEffect, useMemo, useState } from "react";
import "../../styles/guest.css";

export default function GuestMenu({ slug }) {
  const [dishes, setDishes] = useState([]);
  const [restaurant, setRestaurant] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedAllergens, setSelectedAllergens] = useState(new Set());
  const [containsMode, setContainsMode] = useState(false); // OFF = SAFE, ON = CONTAINS
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showCategoryPanel, setShowCategoryPanel] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Load menu + restaurant info from public APIs
  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError("");

        // 1) Dishes
        const res = await fetch(`/api/public-menu/${slug}`);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const json = await res.json();

        const normalized = (json || []).map((d) => ({
          ...d,
          allergens: Array.isArray(d.allergens)
            ? d.allergens.map((a) => String(a).trim().toUpperCase())
            : [],
        }));

        setDishes(normalized);

        // 2) Restaurant info (name, logo_url)
        try {
          const rRes = await fetch(`/api/public-restaurant/${slug}`);
          if (rRes.ok) {
            const rJson = await rRes.json();
            setRestaurant(rJson);
          } else {
            console.warn("Failed to load restaurant info", await rRes.text());
          }
        } catch (err) {
          console.warn("Error loading restaurant info", err);
        }
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

  // === MAIN FILTERING LOGIC =====================================
  //  - no allergens selected  → show all (respecting category only)
  //  - allergens selected & containsMode = false → ONLY SAFE dishes
  //  - allergens selected & containsMode = true  → ONLY CONTAINING dishes
  const filteredDishes = useMemo(() => {
    let list = dishes;

    // category filter
    if (selectedCategory) {
      list = list.filter((d) => d.category === selectedCategory);
    }

    if (!hasFilters) {
      return list;
    }

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

  // IMPORTANT: no fallback to full dishes when filter is empty
  const listToRender = filteredDishes;

  const restaurantName =
    restaurant?.name ||
    (slug ? slug.replace(/-/g, " ") : "this restaurant");

  return (
    <div className="guest-root">
      <div className="guest-shell">
        {/* Header */}
        <header className="guest-header">
          <div className="guest-header-main">
            <div className="guest-logo-circle">
              {restaurant?.logo_url ? (
                <img
                  src={restaurant.logo_url}
                  alt={restaurantName}
                  className="guest-logo-img"
                />
              ) : (
                "S"
              )}
            </div>
            <div>
              <div className="guest-header-title">
                Safe dishes for <span>{restaurantName}</span>
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
              // show SAFE only if dish is really safe
              // show CONTAINS only if dish really contains selection
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

      {/* Floating dock – only switch + icons */}
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
                  setShowFilterPanel((prev) => {
                    const next = !prev;
                    if (next) setShowCategoryPanel(false);
                    return next;
                  });
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
                  setShowCategoryPanel((prev) => {
                    const next = !prev;
                    if (next) setShowFilterPanel(false);
                    return next;
                  });
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
          </div>
        </div>
      )}
    </div>
  );
}
