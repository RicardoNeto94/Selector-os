"use client";

import { useEffect, useMemo, useState } from "react";
import "../../styles/guest.css";

export default function GuestMenu({ slug }) {
  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedAllergens, setSelectedAllergens] = useState(new Set());

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

        // Ensure allergens is always an array
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

  // Unique sorted allergen codes present in the menu
  const allergenList = useMemo(() => {
    const set = new Set();
    dishes.forEach((d) => (d.allergens || []).forEach((a) => set.add(a)));
    return Array.from(set).sort();
  }, [dishes]);

  // SAFE dishes = dishes that do NOT contain any selected allergen
  const safeDishes = useMemo(() => {
    if (!selectedAllergens || selectedAllergens.size === 0) return dishes;

    return dishes.filter((d) => {
      const hasBlocked = (d.allergens || []).some((code) =>
        selectedAllergens.has(code)
      );
      return !hasBlocked;
    });
  }, [dishes, selectedAllergens]);

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

  const countText =
    safeDishes.length === 0
      ? "No safe dishes"
      : safeDishes.length === 1
      ? "1 safe dish"
      : `${safeDishes.length} safe dishes`;

  const activeFilterText =
    selectedAllergens.size === 0
      ? "No filters active – all dishes are shown."
      : `Hiding dishes that contain: ${Array.from(
          selectedAllergens
        ).join(", ")}`;
  
    const hasActiveFilters = selectedAllergens.size > 0;

  const handleResetFilters = () => {
    setSelectedAllergens(new Set());
  };


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
                Select allergen codes to hide dishes that contain them. Anything
                left is <strong>SAFE</strong> to serve.
              </p>
            </div>
          </div>

          <div className="guest-meta">
            <div>SelectorOS • Guest view</div>
            <div>Live data from your cockpit</div>
          </div>
        </header>

        {/* Filters row */}
        <section className="guest-filters">
          <div className="guest-filters-left">
            <span className="guest-count">{countText}</span>
            <span className="guest-active-filter">{activeFilterText}</span>
          </div>

          <div className="guest-filters-left">
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
        </section>

        {/* Content */}
        {loading ? (
          <div className="guest-empty">Loading menu…</div>
        ) : error ? (
          <div className="guest-empty">{error}</div>
        ) : dishes.length === 0 ? (
          <div className="guest-empty">
            This menu has no dishes yet. Add dishes in your SelectorOS
            dashboard.
          </div>
        ) : (
          <>
            <section className="guest-grid">
              {safeDishes.map((dish) => {
                const blocked =
                  selectedAllergens.size > 0 &&
                  (dish.allergens || []).some((code) =>
                    selectedAllergens.has(code)
                  );

                return (
                  <article
                    key={dish.name + dish.category}
                    className={
                      "guest-card " + (blocked ? "" : "safe")
                    }
                  >
                    <div className="guest-card-header">
                      <div>
                        <div className="guest-card-category">
                          {dish.category || "Dish"}
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
                      <span
                        className={
                          "guest-safe-tag " + (blocked ? "blocked" : "")
                        }
                      >
                        {blocked ? "Hidden by filter" : "SAFE"}
                      </span>
                      <span className="guest-card-allergens">
                        Allergens:{" "}
                        {dish.allergens && dish.allergens.length
                          ? dish.allergens.join(", ")
                          : "None"}
                      </span>
                    </div>
                  </article>
                );
              })}
            </section>

            {safeDishes.length === 0 && (
              <div className="guest-empty">
                No dishes are safe with the current allergen selection. Remove
                one or more allergens to see more dishes.
              </div>
            )}
          </>
        )}
      </div>

      {/* ---------------- FLOATING DOCK ---------------- */}
      {!loading && !error && dishes.length > 0 && (
        <div className="guest-dock">
          <div className="guest-dock-inner">
            {/* Safe dish count */}
            <div className="guest-dock-safe">
              <span className="guest-dock-dot" />
              <span className="guest-dock-safe-label">{countText}</span>
            </div>

            {/* Divider */}
            <span className="guest-dock-divider" />

            {/* Active filter text */}
            <span className="guest-dock-text">{activeFilterText}</span>

            {/* Reset */}
            <button
              type="button"
              onClick={handleResetFilters}
              disabled={!hasActiveFilters}
              className={
                "guest-dock-reset" + (hasActiveFilters ? " active" : "")
              }
            >
              Reset
            </button>
          </div>
        </div>
      )}
      {/* ------------------------------------------------ */}
    </div>
  );
}
