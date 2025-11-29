"use client";

import { useEffect, useMemo, useState } from "react";

// Allergen codes you support – matches your DB codes
const ALLERGEN_CODES = [
  "GL", // gluten
  "CE",
  "CR",
  "EG",
  "FL",
  "LU",
  "MO",
  "MI",
  "MU",
  "NU",
  "PE",
  "SE",
  "SO",
  "SU",
  "GA",
  "ON",
  "MR",
];

function niceNameFromSlug(slug) {
  if (!slug) return "";
  return slug
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

export default function PublicAllergenPage({ params }) {
  const { slug } = params;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dishes, setDishes] = useState([]);
  const [activeAllergens, setActiveAllergens] = useState([]);

  const restaurantName = niceNameFromSlug(slug);
  const restaurantInitial = restaurantName.charAt(0) || slug.charAt(0) || "S";

  useEffect(() => {
    async function loadMenu() {
      try {
        setLoading(true);
        setError("");

        const res = await fetch(`/api/public-menu/${slug}`, {
          cache: "no-store",
        });

        if (!res.ok) {
          throw new Error("Failed to load menu");
        }

        const json = await res.json();

        // API returns an array of rows:
        // [{ name, category, description, price, allergens: ['GL','CR', ...] }, ...]
        setDishes(Array.isArray(json) ? json : []);
      } catch (err) {
        console.error("Public menu error", err);
        setError("Failed to load menu");
      } finally {
        setLoading(false);
      }
    }

    loadMenu();
  }, [slug]);

  // Toggle allergen in the dock
  function toggleAllergen(code) {
    setActiveAllergens((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  }

  // A dish is SAFE if it does NOT contain any of the active allergen codes
  const { safeDishes, hiddenCount } = useMemo(() => {
    if (!activeAllergens.length) {
      return { safeDishes: dishes, hiddenCount: 0 };
    }

    const safe = dishes.filter((dish) => {
      const dishAllergens = dish.allergens || [];
      return !dishAllergens.some((code) => activeAllergens.includes(code));
    });

    const hidden = dishes.length - safe.length;
    return { safeDishes: safe, hiddenCount: hidden };
  }, [dishes, activeAllergens]);

  const safeCount = safeDishes.length;

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#02111b] via-[#021c2e] to-[#03989e] text-slate-100">
        <p className="text-sm opacity-80">Loading your SelectorOS workspace…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#02111b] via-[#021c2e] to-[#03989e] text-slate-100">
        <div className="rounded-3xl bg-black/50 border border-red-500/40 px-6 py-4 shadow-2xl">
          <p className="text-sm text-red-100">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#02111b] via-[#021c2e] to-[#03989e] text-slate-100 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-6xl rounded-[32px] bg-slate-950/80 border border-teal-400/20 shadow-[0_40px_120px_rgba(0,0,0,0.9)] overflow-hidden">
        {/* HEADER */}
        <div className="px-8 pt-8 pb-4 md:px-10 md:pt-10 md:pb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          {/* Left: avatar + title */}
          <div className="flex items-center gap-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-amber-500 text-slate-950 text-2xl font-bold shadow-[0_0_40px_rgba(252,211,77,0.5)]">
              {restaurantInitial.toUpperCase()}
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-emerald-300/80">
                Safe dishes for
              </p>
              <h1 className="text-2xl md:text-3xl font-semibold">
                {restaurantName}
              </h1>
              <p className="mt-1 text-xs md:text-sm text-slate-300/80 max-w-xl">
                Select allergen codes to hide dishes that contain them. Anything
                left is <span className="font-semibold">SAFE</span> to serve.
              </p>
            </div>
          </div>

          {/* Right: copy */}
          <div className="text-right text-[10px] md:text-xs text-slate-400">
            <div className="uppercase tracking-[0.25em]">
              SelectorOS • Guest view
            </div>
            <div className="mt-1">Live data from your cockpit</div>
          </div>
        </div>

        {/* STATS STRIP */}
        <div className="px-8 md:px-10 pb-4 flex flex-wrap items-center gap-3 text-xs md:text-sm">
          <span className="inline-flex items-center rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-400/40 px-3 py-1">
            {safeCount} safe {safeCount === 1 ? "dish" : "dishes"}
          </span>

          {activeAllergens.length === 0 ? (
            <span className="text-slate-300/80">
              No filters active – all dishes are shown.
            </span>
          ) : (
            <span className="text-slate-300/80">
              Hiding dishes that contain:{" "}
              <span className="font-semibold">
                {activeAllergens.join(", ")}
              </span>
              {hiddenCount > 0 && (
                <>
                  {" "}
                  · <span className="font-semibold">{hiddenCount}</span>{" "}
                  hidden.
                </>
              )}
            </span>
          )}
        </div>

        {/* ALLERGEN DOCK – THIS IS THE FLOATING ROW */}
        <div className="px-8 md:px-10 pb-6">
          <div className="rounded-3xl border border-teal-500/30 bg-slate-950/80 backdrop-blur-xl shadow-[0_18px_60px_rgba(0,0,0,0.9)] px-4 py-3 flex flex-wrap gap-2">
            {ALLERGEN_CODES.map((code) => {
              const active = activeAllergens.includes(code);
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => toggleAllergen(code)}
                  className={`rounded-full px-3 py-1 text-xs font-medium border transition
                    ${
                      active
                        ? "bg-emerald-400 text-slate-950 border-emerald-300 shadow-[0_0_18px_rgba(16,185,129,0.7)]"
                        : "bg-slate-900/80 text-slate-200 border-slate-600/60 hover:border-emerald-300/70 hover:text-emerald-200"
                    }
                  `}
                >
                  {code}
                </button>
              );
            })}
          </div>
        </div>

        {/* MENU LIST */}
        <div className="px-8 md:px-10 pb-10">
          <div className="rounded-3xl border border-teal-500/30 bg-gradient-to-br from-slate-950/90 to-slate-950/60 px-6 py-5">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
              <span className="uppercase tracking-[0.2em]">Menu</span>
              <span>Allergens shown per dish</span>
            </div>

            <div className="space-y-3">
              {safeDishes.map((dish) => {
                const dishAllergens = dish.allergens || [];
                const isCompletelySafe = dishAllergens.length === 0;

                return (
                  <div
                    key={dish.name + dish.category}
                    className="rounded-2xl border border-teal-500/25 bg-slate-950/80 px-4 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                  >
                    {/* Left */}
                    <div>
                      {dish.category && (
                        <div className="text-[10px] uppercase tracking-[0.25em] text-teal-300/70 mb-1">
                          {dish.category}
                        </div>
                      )}
                      <div className="font-semibold text-sm md:text-base">
                        {dish.name}
                      </div>
                      {dish.description && (
                        <div className="mt-1 text-xs text-slate-300/80 max-w-xl">
                          {dish.description}
                        </div>
                      )}
                    </div>

                    {/* Right */}
                    <div className="flex items-end gap-4 justify-between md:justify-end">
                      <div className="text-right">
                        {typeof dish.price === "number" && (
                          <div className="font-semibold text-sm md:text-base">
                            {dish.price.toFixed(2)} €
                          </div>
                        )}
                        <div className="mt-1 text-[11px] text-slate-400">
                          Allergens:{" "}
                          {dishAllergens.length
                            ? dishAllergens.join(", ")
                            : "None"}
                        </div>
                      </div>

                      <div>
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold border ${
                            isCompletelySafe
                              ? "bg-emerald-500/15 text-emerald-300 border-emerald-400/70"
                              : "bg-slate-800/80 text-amber-300 border-amber-400/60"
                          }`}
                        >
                          {isCompletelySafe ? "SAFE" : "HAS ALLERGENS"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {safeDishes.length === 0 && (
                <div className="text-xs text-slate-300/80 py-4">
                  No dishes are safe with the current allergen filters. Remove
                  some filters to see more dishes.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
