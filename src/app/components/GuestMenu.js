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

export default function GuestMenu({ slug }) {
const [dishes, setDishes] = useState([]);
const [restaurantLogoUrl, setRestaurantLogoUrl] = useState(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState("");

const [selectedAllergens, setSelectedAllergens] = useState(new Set());
const [containsMode, setContainsMode] = useState(false); // OFF = SAFE, ON = CONTAINS
const [selectedCategory, setSelectedCategory] = useState(null);
const [activeSheet, setActiveSheet] = useState(null); // "filters" | "categories" | null

// NEW: light / dark theme toggle (uses CSS vars in guest.css)
const [isLightMode, setIsLightMode] = useState(false);

// Load menu JSON from public API
useEffect(() => {
async function load() {
try {
setLoading(true);
setError("");

```
    const res = await fetch(`/api/public-menu/${slug}`);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

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
```

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

```
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
```

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
setActiveSheet(null);
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

const listToRender = filteredDishes;

const openFiltersSheet = () => {
setActiveSheet((prev) => (prev === "filters" ? null : "filters"));
};

const openCategoriesSheet = () => {
setActiveSheet((prev) => (prev === "categories" ? null : "categories"));
};

const closeSheet = () => setActiveSheet(null);

return (
<div
className={
"guest-root" + (isLightMode ? " guest-root--light" : "")
}
>
{/* 🔹 Sticky frosted header (full width) */} <header className="glass-header"> <div className="guest-shell"> <div className="guest-header"> <div className="guest-logo-image-wrap">
{restaurantLogoUrl ? ( <img
               src={restaurantLogoUrl}
               alt="Restaurant logo"
               className="guest-header-logo-img"
             />
) : ( <div className="guest-logo-circle">S</div>
)} </div>

```
        {/* Day / Night toggle – like Shang Shi moon button */}
        <button
          type="button"
          className="guest-mode-toggle"
          onClick={() => setIsLightMode((prev) => !prev)}
        >
          {isLightMode ? "☾" : "☀︎"}
        </button>
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

                {/* Price visible on desktop, hidden on phone via CSS */}
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

  {/* 🔹 Floating dock – iOS style */}
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

  {/* 🔹 Bottom sheet: Filters */}
  {activeSheet === "filters" && (
    <div className="guest-sheet-backdrop" onClick={closeSheet}>
      <div className="guest-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="guest-sheet-handle" />
        <div className="guest-sheet-header">
          <h2>Allergens</h2>
          <p>Tap all allergens the guest wants to avoid or inspect.</p>
        </div>

        <div className="guest-sheet-body">
          <div className="guest-sheet-pills-row">
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

        <div className="guest-sheet-footer">
          <button
            type="button"
            className="guest-sheet-btn ghost"
            onClick={handleSelectAllAllergens}
          >
            {selectedAllergens.size === allergenList.length
              ? "Clear all"
              : "Select all"}
          </button>
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
  )}

  {/* 🔹 Bottom sheet: Categories */}
  {activeSheet === "categories" && (
    <div className="guest-sheet-backdrop" onClick={closeSheet}>
      <div className="guest-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="guest-sheet-handle" />
        <div className="guest-sheet-header">
          <h2>Categories</h2>
          <p>Focus on a specific part of the menu.</p>
        </div>

        <div className="guest-sheet-body">
          {categoryList.length === 0 ? (
            <p className="guest-sheet-empty">No categories configured.</p>
          ) : (
            <div className="guest-sheet-pills-row">
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

        <div className="guest-sheet-footer">
          <button
            type="button"
            className="guest-sheet-btn ghost"
            onClick={() => setSelectedCategory(null)}
          >
            Clear category
          </button>
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
  )}
</div>
```

);
}
