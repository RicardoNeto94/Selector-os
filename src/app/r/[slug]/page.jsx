"use client";

import { useEffect, useMemo, useState } from "react";

// Master allergen list – same codes you use in Shang Shi
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
  { code: "MR", label: "Mushroom" },
];

export default function PublicMenuPage({ params }) {
  const slug = params.slug;

  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeAllergens, setActiveAllergens] = useState([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        const res = await fetch(`/api/public-menu/${slug}`);
        if (!res.ok) {
          console.error("Failed to load menu", await res.text());
          if (!cancelled) setDishes([]);
          return;
        }
        const data = await res.json();
        if (!cancelled) setDishes(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Public menu error", err);
        if (!cancelled) setDishes([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const toggleAllergen = (code) => {
    setActiveAllergens((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  // A dish is SAFE if it does NOT contain any selected allergens
  const visibleDishes = useMemo(() => {
    if (!activeAllergens.length) return dishes;
    return dishes.filter(
      (d) =>
        !d.allergens ||
        d.allergens.length === 0 ||
        !d.allergens.some((a) => activeAllergens.includes(a))
    );
  }, [dishes, activeAllergens]);

  const safeCount = visibleDishes.length;

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#020308] via-[#04101a] to-[#041920] text-slate-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-5xl rounded-3xl bg-slate-950/80 border border-emerald-400/15 shadow-[0_40px_120px_rgba(0,0,0,0.9)] overflow-hidden relative">
        {/* Glow background */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-24 -top-24 w-72 h-72 rounded-full bg-emerald-500/25 blur-3xl" />
          <div className="absolute right-[-40px] bottom-[-40px] w-80 h-80 rounded-full bg-cyan-400/25 blur-3xl" />
        </div>

        <div className="relative p-6 md:p-8 space-y-6">
          {/* Header */}
          <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-300 via-amber-500 to-amber-800 shadow-[0_0_40px_rgba(250,204,21,0.4)] flex items-center justify-center text-lg font-semibold text-slate-900">
                {slug.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.25em] text-emerald-300/80">
                  Safe dishes for
                </p>
                <h1 className="text-xl md:text-2xl font-semibold">
                  <span className="capitalize text-emerald-300">{slug.replace(/-/g, " ")}</span>
                </h1>
                <p className="text-xs md:text-sm text-slate-300/80 mt-1">
                  Select allergen codes to hide dishes that contain them. Anything left is{" "}
                  <span className="font-semibold">SAFE</span> to serve.
                </p>
              </div>
            </div>

            <div className="text-right text-[11px] uppercase tracking-[0.22em] text-slate-400">
              <div>SELECTOROS • GUEST VIEW</div>
              <div className="text-[10px] text-slate-500">
                Live data from your cockpit
              </div>
            </div>
          </header>

          {/* Status strip */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-400/50 text-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
              <span className="font-semibold">
                {safeCount} safe {safeCount === 1 ? "dish" : "dishes"}
              </span>
            </span>
            <span className="text-slate-300/80">
              {activeAllergens.length === 0 ? (
                <>No filters active – all dishes are shown.</>
              ) : (
                <>
                  Hiding dishes that contain:{" "}
                  <span className="font-semibold">
                    {activeAllergens.join(", ")}
                  </span>
                </>
              )}
            </span>
          </div>

          {/* Allergen dock */}
          <section className="mt-2">
            <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400 mb-2">
              Allergen dock
            </div>
            <div className="flex flex-wrap gap-2 rounded-2xl bg-slate-900/80 border border-slate-700/60 px-3 py-3">
              {ALLERGENS.map((a) => {
                const active = activeAllergens.includes(a.code);
                return (
                  <button
                    key={a.code}
                    onClick={() => toggleAllergen(a.code)}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-medium border transition
                      ${
                        active
                          ? "bg-emerald-400 text-slate-900 border-emerald-300 shadow-[0_0_16px_rgba(52,211,153,0.7)]"
                          : "bg-slate-900/60 text-slate-200 border-slate-700 hover:border-emerald-300/60 hover:text-emerald-100"
                      }`}
                  >
                    {a.code}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Menu card */}
          <section className="mt-4">
            <div className="rounded-3xl border border-emerald-400/40 bg-gradient-to-br from-slate-950/90 via-slate-950/70 to-slate-900/80 px-5 py-4 md:px-7 md:py-6">
              <div className="flex items-center justify-between mb-4">
                <div className="text-[11px] uppercase tracking-[0.2em] text-emerald-300/90">
                  Menu
                </div>
                <div className="text-[11px] text-slate-400">
                  Allergens shown per dish
                </div>
              </div>

              {loading ? (
                <div className="py-10 text-center text-sm text-slate-400">
                  Loading live menu…
                </div>
              ) : dishes.length === 0 ? (
                <div className="py-10 text-center text-sm text-slate-400">
                  No dishes configured yet. Ask your server to refresh the menu.
                </div>
              ) : visibleDishes.length === 0 ? (
                <div className="py-10 text-center text-sm text-slate-400">
                  Your selected allergens hide all dishes. Try removing one filter.
                </div>
              ) : (
                <ul className="space-y-4">
                  {visibleDishes.map((d) => {
                    const hasAllergens = d.allergens && d.allergens.length > 0;
                    return (
                      <li
                        key={d.name + d.category}
                        className="rounded-2xl border border-emerald-500/40 bg-slate-950/60 px-4 py-4 md:px-5 md:py-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between"
                      >
                        <div>
                          {d.category && (
                            <p className="text-[10px] uppercase tracking-[0.22em] text-emerald-300/80 mb-1">
                              {d.category}
                            </p>
                          )}
                          <p className="text-sm md:text-base font-semibold text-slate-50">
                            {d.name}
                          </p>
                          {d.description && (
                            <p className="text-xs md:text-sm text-slate-300/80 mt-1">
                              {d.description}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          {typeof d.price === "number" && (
                            <p className="text-sm md:text-base font-semibold text-slate-50">
                              {d.price.toFixed(2)} €
                            </p>
                          )}
                          <div className="flex items-center gap-2">
                            <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/15 border border-emerald-400/60 text-emerald-200">
                              SAFE
                            </span>
                            <span className="text-[11px] text-slate-300/80">
                              Allergens:{" "}
                              {hasAllergens
                                ? d.allergens.join(", ")
                                : "None"}
                            </span>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
