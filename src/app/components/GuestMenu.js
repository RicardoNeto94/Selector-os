"use client";

import { useEffect, useMemo, useState } from "react";
import "../../styles/guest.css";

/* ======================================================
   MASTER ALLERGEN DEFINITIONS (LABEL + CODE)
====================================================== */
const ALLERGEN_META = {
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

const ALLERGENS = Object.keys(ALLERGEN_META);

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

  /* ================= LOAD MENU ================= */
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

        const normalized = dishData.map((d) => ({
          ...d,
          allergens: Array.isArray(d.allergens)
            ? d.allergens.map((a) => a.toUpperCase())
            : [],
        }));

        setDishes(normalized);
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
    return Array.from(set).sort();
  }, [dishes]);

  const filteredDishes = useMemo(() => {
    let list = dishes;

    if (selectedCategory) {
      list = list.filter((d) => d.category === selectedCategory);
    }

    if (selectedAllergens.size === 0) return list;

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

  const handleResetAll = () => {
    setSelectedAllergens(new Set());
    setContainsMode(false);
    setSelectedCategory(null);
    setActiveSheet(null);
    setDragOffsetY(0);
  };

  /* ================= RENDER ================= */
  return (
    <div className="guest-root">
      {/* HEADER */}
      <header className="glass-header">
        <div className="guest-shell">
          <div className="guest-header">
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
      </header>

      <div className="guest-shell">
        {loading ? (
          <div className="guest-empty">Loading menu…</div>
        ) : error ? (
          <div className="guest-empty">{error}</div>
        ) : (
          <section className="guest-grid">
            {filteredDishes.map((dish) => {
              const categoryClass = dish.category
                ? `cat-${dish.category.toLowerCase().replace(/\s+/g, "-")}`
                : "";

              return (
                <article
                  key={dish.id ?? dish.name}
                  className={`guest-card ${categoryClass}`} // 🔧 NEW
                >
                  <div className="dish-chip-row">
                    <span className="dish-chip dish-chip-category">
                      {dish.category || "Dish"}
                    </span>
                  </div>

                  <div className="guest-card-name">{dish.name}</div>

                  {dish.description && (
                    <p className="guest-card-desc">{dish.description}</p>
                  )}

                  {/* 🔧 NEW – read-only allergen pills */}
                  {dish.allergens.length > 0 && (
                    <div className="guest-card-allergen-pills">
                      {dish.allergens.map((code) => (
                        <span
                          key={code}
                          className={`alg-pill alg-${code.toLowerCase()}`}
                        >
                          <span className="alg-code">{code}</span>
                          <span className="alg-name">
                            {ALLERGEN_META[code]}
                          </span>
                        </span>
                      ))}
                    </div>
                  )}
                </article>
              );
            })}
          </section>
        )}
      </div>

      {/* DOCK */}
      <div className="guest-dock">
        <div className="guest-dock-inner">
          <button
            className={
              "ios-switch" + (containsMode ? " ios-switch-on" : "")
            }
            onClick={() => setContainsMode((p) => !p)}
            disabled={selectedAllergens.size === 0}
          >
            <span className="ios-switch-knob" />
          </button>

          <div className="guest-dock-icons">
            <button
              className="dock-icon"
              onClick={() => setActiveSheet("filters")}
            >
              ≡
            </button>
            <button
              className="dock-icon"
              onClick={() => setActiveSheet("categories")}
            >
              ▦
            </button>
            <button className="dock-icon" onClick={handleResetAll}>
              ↻
            </button>
          </div>
        </div>
      </div>

      {/* FILTER SHEET */}
      {activeSheet === "filters" && (
        <div className="guest-sheet-backdrop" onClick={() => setActiveSheet(null)}>
          <div className="guest-sheet" onClick={(e) => e.stopPropagation()}>
            <h2>Allergens</h2>
            <div className="guest-sheet-pills-row">
              {allergenList.map((code) => (
                <button
                  key={code}
                  className={`alg-pill alg-${code.toLowerCase()} ${
                    selectedAllergens.has(code) ? "is-active" : ""
                  }`}
                  onClick={() => handleToggleAllergen(code)}
                >
                  <span className="alg-code">{code}</span>
                  <span className="alg-name">
                    {ALLERGEN_META[code]}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
