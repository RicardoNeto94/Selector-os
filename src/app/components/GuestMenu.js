"use client";

import { useEffect, useMemo, useState } from "react";
import "../../styles/guest.css";

export default function GuestMenu({ slug }) {
  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedAllergens, setSelectedAllergens] = useState(new Set());
  const [containsMode, setContainsMode] = useState(false); // false = all dishes, true = only “contains”

  // Load menu JSON from our API
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

    load();
  }, [slug]);

  // Unique sorted allergen codes
  const allergenList = useMemo(() => {
    const set = new Set();
    dishes.forEach((d) => (d.allergens || []).forEach((a) => set.add(a)));
    return Array.from(set).sort();
  }, [dishes]);

  const hasFilters = selectedAllergens.size > 0;

  // Counts for dock info
  const { safeCount } = useMemo(() => {
    if (!hasFilters) {
      return { safeCount: dishes.length };
    }
    let safe = 0;
    dishes.forEach((d) => {
      const hasSelected = (d.allergens || []).some((code) =>
        selectedAllergens.has(code)
      );
      if (!hasSelected) safe += 1;
    });
    return { safeCount: safe };
  }, [dishes, hasFilters, selectedAllergens]);

  // Apply view logic
  const filteredDishes = useMemo(() => {
    if (!hasFilters) {
      // No allergen selected → show everything
      return dishes;
    }

    return dishes.filter((d) => {
      const hasSelected = (d.allergens || []).some((code) =>
        selectedAllergens.has(code)
      );

      // containsMode ON → only dishes that contain selected allergen(s)
      if (containsMode) {
        return hasSelected;
      }

      // containsMode OFF → show all dishes, but badges will indicate SAFE / Contains
      return true;
    });
  }, [dishes, hasFilters, selectedAllergens, containsMode]);

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

  const handleResetAll = () => {
    setSelectedAllergens(new Set());
    setContainsMode(false);
  };

  const countText = hasFilters
    ? `${safeCount} safe dish${safeCount === 1 ? "" : "es"}`
    : `${dishes.length} dish${dishes.length === 1 ? "" : "es"}`;

  const filterText = hasFilters
    ? containsMode
      ? "Showing only dishes that CONTAIN selected allergens."
      : "SAFE dishes marked in green, dishes that contain your allergens marked in red."
    : "Select allergen codes to see what is safe or contains them.";

  return (
    <div className="guest-root">
      <div className="guest-shell">
        {/* Header */}
        <header className="guest-header">
          <div className="guest-header-main">
            <div className="guest-logo-circle">S</div>
            <div>
              <div className="guest-header-title">
                Safe dishes for <span>{slug.replace(/-/g, " ")}</span>
              </div>
              <p className="guest-header-subtitle">
                Select allergen codes to hide or show dishes. Anything left is{" "}
                <strong>SAFE</strong> to serve.
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
            No dishes match the current allergen selection. Try changing or
            resetting your filters.
          </div>
        ) : (
          <section className="guest-grid">
            {filteredDishes.map((dish) => {
              const dishAllergens = dish.allergens || [];
              const dishHasSelected =
                hasFilters &&
                dishAllergens.some((code) => selectedAllergens.has(code));

              // Badge logic:
              // – If no allergen selected → no badge
              // – If allergen selected:
              //     dishHasSelected → red "Contains"
              //     !dishHasSelected → green "SAFE"
              let badgeLabel = null;
              let badgeClass = "";
              if (hasFilters) {
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
                  key={dish.name + dish.category}
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
                      {dish.price != null ? `${dish.price.toFixed(2)} €` : ""}
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

      {/* Floating dock */}
      {!loading && dishes.length > 0 && (
        <div className="guest-dock">
          <div className="guest-dock-inner">
            {/* Left: counts & text */}
            <div className="guest-dock-left">
              <span className="guest-count-pill">{countText}</span>
              <span className="guest-dock-text">{filterText}</span>
            </div>

            {/* Middle: allergen chips */}
            <div className="guest-dock-middle">
              <div className="guest-chips-row guest-chips-row--dock">
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
            </div>

            {/* Right: Contains toggle + Reset */}
            <div className="guest-dock-right">
              <button
                type="button"
                className={
                  "dock-toggle" + (containsMode ? " dock-toggle-on" : "")
                }
                onClick={() => setContainsMode((prev) => !prev)}
                disabled={!hasFilters}
              >
                Contains
              </button>
              <button
                type="button"
                className="guest-reset-btn"
                onClick={handleResetAll}
                disabled={!hasFilters && !containsMode}
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
