// src/app/r/[slug]/menu/Tool.js
"use client";

import { useEffect, useState } from "react";

const ALLERGENS = [
  { code: "GL", label: "Gluten" },
  { code: "CE", label: "Celery" },
  { code: "CR", label: "Crustaceans" },
  { code: "EG", label: "Eggs" },
  { code: "FL", label: "Fish" },
  { code: "LU", label: "Lupin" },
  { code: "MO", label: "Molluscs" },
  { code: "MI", label: "Milk" },
  { code: "MU", label: "Mustard" },
  { code: "NU", label: "Nuts" },
  { code: "PE", label: "Peanuts" },
  { code: "SE", label: "Sesame" },
  { code: "SO", label: "Soya" },
  { code: "SU", label: "Sulphites" },
  { code: "GA", label: "Garlic" },
  { code: "ON", label: "Onion" },
  { code: "MR", label: "Mushrooms" },
];

const CATEGORIES = [
  "Dim Sum",
  "Starters",
  "Soup",
  "Mains",
  "Rice & Noodles",
  "Side dishes",
  "Dessert",
];

export default function Tool({ slug }) {
  // === VIEW MODE: staff vs guest ============================================
  const [viewMode, setViewMode] = useState("staff"); // "staff" | "guest"

  // === DATA STATE ===========================================================
  const [loading, setLoading] = useState(true);
  const [restaurant, setRestaurant] = useState(null);
  const [dishes, setDishes] = useState([]);
  const [error, setError] = useState("");

  // === FILTER STATE =========================================================
  const [selectedAllergens, setSelectedAllergens] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [containsMode, setContainsMode] = useState(false);
  const [pinnedDishIds, setPinnedDishIds] = useState(new Set());

  // === LOAD DATA ============================================================
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");

        const baseUrl =
          process.env.NEXT_PUBLIC_APP_URL || window.location.origin;

        const [metaRes, dishesRes, allergensRes] = await Promise.all([
          fetch(`${baseUrl}/api/restaurant-meta/${slug}`),
          fetch(`${baseUrl}/api/public-menu/${slug}`),
          fetch(`${baseUrl}/api/allergens`),
        ]);

        if (!metaRes.ok) {
          throw new Error("Failed to load restaurant meta");
        }
        if (!dishesRes.ok) {
          throw new Error("Failed to load dishes");
        }

        const metaJson = await metaRes.json();
        const dishesJson = await dishesRes.json();

        setRestaurant(metaJson.restaurant || null);

        const dishData = dishesJson.dishes || [];
        setDishes(dishData);
      } catch (err) {
        console.error(err);
        setError(err.message || "Failed to load menu.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [slug]);

  // === FILTER HELPERS =======================================================
  const toggleAllergen = (code) => {
    setSelectedAllergens((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const resetFilters = () => {
    setSelectedAllergens([]);
    setSelectedCategory(null);
  };

  const filteredDishes = dishes.filter((dish) => {
    const matchesCategory =
      !selectedCategory || dish.category === selectedCategory;

    if (!matchesCategory) return false;

    if (selectedAllergens.length === 0) return true;

    const dishAllergens = dish.allergens || [];

    if (containsMode) {
      // "Contains" mode – only show dishes that contain ANY of the selected allergens
      return dishAllergens.some((a) => selectedAllergens.includes(a));
    } else {
      // "Avoid" mode – hide dishes that contain ANY of the selected allergens
      return !dishAllergens.some((a) => selectedAllergens.includes(a));
    }
  });

  const groupedByCategory = CATEGORIES.map((cat) => ({
    category: cat,
    dishes: filteredDishes.filter((d) => d.category === cat),
  })).filter((group) => group.dishes.length > 0);

  const togglePin = (dishId) => {
    setPinnedDishIds((prev) => {
      const next = new Set(prev);
      if (next.has(dishId)) {
        next.delete(dishId);
      } else {
        next.add(dishId);
      }
      return next;
    });
  };

  const isPinned = (dishId) => pinnedDishIds.has(dishId);

  if (loading) {
    return (
      <div className="guest-root">
        <div className="guest-shell">
          <div className="guest-header-row">
            <div className="guest-logo-pulse" />
            <div className="guest-header-text">
              <div className="guest-title-skeleton" />
              <div className="guest-subtitle-skeleton" />
            </div>
          </div>
          <div className="guest-skeleton-grid">
            <div className="guest-skeleton-card" />
            <div className="guest-skeleton-card" />
            <div className="guest-skeleton-card" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="guest-root">
        <div className="guest-shell">
          <div className="guest-error-card">
            <h1>Something went wrong</h1>
            <p>{error || "Restaurant not found or not published."}</p>
          </div>
        </div>
      </div>
    );
  }

  const primaryColor = restaurant.theme_primary_color || "#d4af37";

  return (
    <div className="guest-root">
      <div
        className="guest-shell"
        style={{
          backgroundColor: "#0A0D10", // unified dark background
        }}
      >
        {/* TOP BAR: restaurant + view toggle */}
        <header className="guest-header-row">
          <div className="guest-header-main">
            <div className="guest-logo-circle">
              {restaurant.theme_logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={restaurant.theme_logo_url}
                  alt={restaurant.name}
                  className="guest-logo-img"
                />
              ) : (
                <span className="guest-logo-initial">
                  {restaurant.name?.[0] || "S"}
                </span>
              )}
            </div>
            <div className="guest-header-text">
              <h1>{restaurant.name || "Restaurant"}</h1>
              <p>Live allergen view for guests & staff.</p>
            </div>
          </div>

          <div className="guest-view-toggle">
            <button
              type="button"
              onClick={() => setViewMode("guest")}
              className={`guest-view-pill ${
                viewMode === "guest" ? "guest-view-pill-active" : ""
              }`}
            >
              Guest mode
            </button>
            <button
              type="button"
              onClick={() => setViewMode("staff")}
              className={`guest-view-pill ${
                viewMode === "staff" ? "guest-view-pill-active" : ""
              }`}
            >
              Staff mode
            </button>
          </div>
        </header>

        {/* FILTER BAR */}
        <section className="guest-filter-dock">
          <div className="guest-filter-left">
            <div className="guest-allergen-chips">
              {ALLERGENS.map((a) => {
                const active = selectedAllergens.includes(a.code);
                return (
                  <button
                    key={a.code}
                    type="button"
                    onClick={() => toggleAllergen(a.code)}
                    className={`guest-chip ${active ? "guest-chip-active" : ""}`}
                  >
                    <span className="guest-chip-code">{a.code}</span>
                    <span className="guest-chip-label">{a.label}</span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={resetFilters}
              className="guest-reset-btn"
            >
              Reset
            </button>
          </div>

          <div className="guest-filter-right">
            <label className="guest-toggle-label">
              <span>Show dishes that contain selected allergens</span>
              <button
                type="button"
                onClick={() => setContainsMode((prev) => !prev)}
                className={`guest-toggle ${containsMode ? "on" : "off"}`}
              >
                <span className="guest-toggle-thumb" />
              </button>
            </label>
          </div>
        </section>

        {/* CATEGORY ROW */}
        <section className="guest-category-row">
          {CATEGORIES.map((cat) => {
            const active = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() =>
                  setSelectedCategory(active ? null : cat)
                }
                className={`guest-category-pill ${
                  active ? "guest-category-pill-active" : ""
                }`}
              >
                {cat}
              </button>
            );
          })}
        </section>

        {/* DISH GRID */}
        <section className="guest-dish-grid">
          {groupedByCategory.length === 0 ? (
            <div className="guest-empty-state">
              <p>No dishes match these filters.</p>
            </div>
          ) : (
            groupedByCategory.map((group) => (
              <div key={group.category} className="guest-category-group">
                <div className="guest-category-header">
                  <h2>{group.category}</h2>
                  <span className="guest-category-count">
                    {group.dishes.length}{" "}
                    {group.dishes.length === 1 ? "dish" : "dishes"}
                  </span>
                </div>

                <div className="guest-dish-list">
                  {group.dishes.map((dish) => {
                    const hasSelected =
                      selectedAllergens.length > 0 &&
                      dish.allergens?.some((a) =>
                        selectedAllergens.includes(a)
                      );

                    return (
                      <article key={dish.id} className="guest-dish-card">
                        <header className="guest-dish-header">
                          <div>
                            <h3>{dish.name}</h3>
                            {dish.description && (
                              <p>{dish.description}</p>
                            )}
                          </div>
                          <div className="guest-dish-price">
                            {dish.price != null
                              ? `${Number(dish.price).toFixed(2)} €`
                              : ""}
                          </div>
                        </header>

                        <footer className="guest-dish-footer">
                          <div className="guest-dish-allergens">
                            {dish.allergens?.length ? (
                              dish.allergens.map((code) => (
                                <span
                                  key={code}
                                  className={`guest-allergen-tag ${
                                    selectedAllergens.includes(code)
                                      ? "guest-allergen-tag-highlight"
                                      : ""
                                  }`}
                                >
                                  {code}
                                </span>
                              ))
                            ) : (
                              <span className="guest-allergen-none">
                                No allergens marked
                              </span>
                            )}
                          </div>

                          {hasSelected && (
                            <div className="guest-safe-pill">
                              Contains selected allergen
                            </div>
                          )}

                          {viewMode === "staff" && (
                            <button
                              type="button"
                              onClick={() => togglePin(dish.id)}
                              className={`guest-pin-btn ${
                                isPinned(dish.id) ? "pinned" : ""
                              }`}
                            >
                              {isPinned(dish.id) ? "Pinned" : "Pin for service"}
                            </button>
                          )}
                        </footer>
                      </article>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </section>
      </div>
    </div>
  );
}
