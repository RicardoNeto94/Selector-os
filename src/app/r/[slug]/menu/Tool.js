"use client";

import { useEffect, useMemo, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useParams } from "next/navigation";

export default function Tool() {
  const supabase = createClientComponentClient();
  const params = useParams();
  const slug = params?.slug;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [restaurant, setRestaurant] = useState(null);
  const [dishes, setDishes] = useState([]);
  const [allergens, setAllergens] = useState([]);
  const [dishAllergenMap, setDishAllergenMap] = useState({});

  const [mode, setMode] = useState<"staff" | "guest">("staff");
  const [selectedAllergens, setSelectedAllergens] = useState([]); // list of allergen codes
  const [selectedDishId, setSelectedDishId] = useState(null);
  const [selectionCount, setSelectionCount] = useState(0);

  useEffect(() => {
    if (!slug) return;
    loadData(slug);
  }, [slug]);

  async function loadData(slugValue) {
    try {
      setLoading(true);
      setError("");

      // 1) Find restaurant by slug
      const { data: restaurantRow, error: restaurantError } = await supabase
        .from("restaurants")
        .select("*")
        .eq("slug", slugValue)
        .maybeSingle();

      if (restaurantError) throw restaurantError;
      if (!restaurantRow) {
        setError("Restaurant not found.");
        setLoading(false);
        return;
      }

      setRestaurant(restaurantRow);

      // 2) Load dishes for this restaurant
      const { data: dishesRows, error: dishesError } = await supabase
        .from("dishes")
        .select("*")
        .eq("restaurant_id", restaurantRow.id)
        .order("category", { ascending: true })
        .order("name", { ascending: true });

      if (dishesError) throw dishesError;

      const safeDishes = dishesRows || [];

      // 3) Load allergens
      const { data: allergenRows, error: allergenError } = await supabase
        .from("allergen")
        .select("*")
        .order("code", { ascending: true });

      if (allergenError) throw allergenError;

      const safeAllergens = allergenRows || [];

      // 4) Load dish_allergens link table for these dishes
      const dishIds = safeDishes.map((d) => d.id);
      let links = [];
      if (dishIds.length > 0) {
        const { data: linkRows, error: linkError } = await supabase
          .from("dish_allergens")
          .select("*")
          .in("dish_id", dishIds);

        if (linkError) throw linkError;
        links = linkRows || [];
      }

      // Build allergen lookup by id and code
      const allergenById = {};
      const allergenByCode = {};
      for (const a of safeAllergens) {
        if (a.id) allergenById[a.id] = a;
        if (a.code) allergenByCode[a.code] = a;
      }

      // Map dish -> list of allergen codes
      const map = {};
      for (const link of links) {
        const dishId = link.dish_id;
        let code = link.allergen_code || null;

        // If schema uses allergen_id instead of allergen_code, derive it
        if (!code && link.allergen_id && allergenById[link.allergen_id]) {
          code =
            allergenById[link.allergen_id].code ||
            allergenById[link.allergen_id].short_code ||
            null;
        }

        if (!code) continue;

        if (!map[dishId]) map[dishId] = [];
        if (!map[dishId].includes(code)) {
          map[dishId].push(code);
        }
      }

      setDishes(safeDishes);
      setAllergens(safeAllergens);
      setDishAllergenMap(map);
    } catch (err) {
      console.error("Public tool load error:", err);
      setError(err.message || "Failed to load menu.");
    } finally {
      setLoading(false);
    }
  }

  function toggleAllergen(code) {
    setSelectedDishId(null);
    setSelectedAllergens((prev) =>
      prev.includes(code)
        ? prev.filter((c) => c !== code)
        : [...prev, code]
    );
  }

  function resetFilters() {
    setSelectedAllergens([]);
    setSelectedDishId(null);
    setSelectionCount(0);
  }

  function handleDishClick(dishId) {
    if (mode === "guest") {
      // In guest mode: only highlight, no popup logic (for future)
      setSelectedDishId((current) => (current === dishId ? null : dishId));
      setSelectionCount((count) =>
        selectedDishId === dishId ? count : count + 1
      );
      return;
    }

    // Staff mode: same behaviour for now – later we can add a side panel
    setSelectedDishId((current) => (current === dishId ? null : dishId));
    setSelectionCount((count) =>
      selectedDishId === dishId ? count : count + 1
    );
  }

  const filteredDishes = useMemo(() => {
    if (selectedAllergens.length === 0) return dishes;

    // Show only dishes that DO NOT contain any selected allergen
    return dishes.filter((dish) => {
      const codes = dishAllergenMap[dish.id] || [];
      return !codes.some((code) => selectedAllergens.includes(code));
    });
  }, [dishes, dishAllergenMap, selectedAllergens]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-sm text-slate-200">
        Loading live menu…
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center text-sm text-red-200">
        <p>{error || "Restaurant not found."}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-4">
      <div
        className="w-full rounded-[22px] border shadow-2xl backdrop-blur-2xl px-5 py-6 md:px-8 md:py-8"
        style={{
          background: "var(--card-bg)",
          borderColor: "var(--card-border)",
          borderRadius: "var(--card-radius)",
          color: "var(--text)",
        }}
      >
        {/* HEADER */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1
              className="text-2xl md:text-3xl font-semibold tracking-[0.15em] uppercase"
              style={{ fontFamily: "var(--font-primary)" }}
            >
              {restaurant.name}
            </h1>
            <p
              className="mt-2 text-xs md:text-sm opacity-80"
              style={{ fontFamily: "var(--font-secondary)" }}
            >
              Live allergen-filtered menu view • Powered by SelectorOS
            </p>
          </div>

          {/* Mode toggle */}
          <div className="inline-flex items-center justify-between gap-2 rounded-full bg-black/40 border border-white/20 px-2 py-1 text-[11px]">
            <button
              type="button"
              onClick={() => setMode("staff")}
              className={`px-3 py-1 rounded-full transition ${
                mode === "staff" ? "bg-white text-black" : "text-white/70"
              }`}
            >
              Staff mode
            </button>
            <button
              type="button"
              onClick={() => setMode("guest")}
              className={`px-3 py-1 rounded-full transition ${
                mode === "guest" ? "bg-white text-black" : "text-white/70"
              }`}
            >
              Guest mode
            </button>
          </div>
        </header>

        {/* ALLERGEN FILTER STRIP */}
        <section className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <h2
              className="text-xs uppercase tracking-[0.18em] opacity-80"
              style={{ fontFamily: "var(--font-secondary)" }}
            >
              Filter by allergen
            </h2>
            <button
              type="button"
              onClick={resetFilters}
              className="text-[11px] underline underline-offset-2 opacity-80 hover:opacity-100"
            >
              Reset
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {allergens.map((a) => {
              const code = a.code || a.short_code || a.id;
              const label = a.name || a.label || a.description || code;
              const active = selectedAllergens.includes(code);

              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => toggleAllergen(code)}
                  className={`px-3 py-1.5 rounded-full border text-[11px] md:text-xs transition ${
                    active
                      ? "bg-white text-black border-white"
                      : "bg-black/40 text-white/85 border-white/30 hover:border-white/70"
                  }`}
                >
                  <span className="font-semibold mr-1">{code}</span>
                  <span className="opacity-80">{label}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* DISH GRID */}
        <section className="space-y-3">
          <div className="flex items-center justify-between text-[11px] opacity-80 mb-1">
            <span>
              Showing{" "}
              <strong>{filteredDishes.length}</strong> of{" "}
              <strong>{dishes.length}</strong> dishes
              {selectedAllergens.length > 0 && " (safe for selected allergies)"}
            </span>
            <span>Selections: {selectionCount}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {filteredDishes.map((dish) => {
              const selected = selectedDishId === dish.id;
              const codes = dishAllergenMap[dish.id] || [];

              return (
                <button
                  key={dish.id}
                  type="button"
                  onClick={() => handleDishClick(dish.id)}
                  className={`relative text-left p-4 rounded-2xl border transition transform ${
                    selected
                      ? "border-[var(--accent)] shadow-[0_0_25px_rgba(244,215,124,0.65)] scale-[1.01]"
                      : "border-white/18 hover:border-[var(--accent)] hover:scale-[1.01]"
                  }`}
                  style={{
                    background: "linear-gradient(135deg, rgba(0,0,0,0.85), rgba(255,255,255,0.05))",
                  }}
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <h3
                        className="text-sm md:text-[15px] font-semibold"
                        style={{ fontFamily: "var(--font-primary)" }}
                      >
                        {dish.name}
                      </h3>
                      {dish.price && (
                        <span className="text-[11px] opacity-80">
                          {dish.price}
                        </span>
                      )}
                    </div>
                    {dish.description && (
                      <p className="text-[11px] md:text-xs opacity-80">
                        {dish.description}
                      </p>
                    )}

                    {codes.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {codes.map((c) => (
                          <span
                            key={c}
                            className="px-2 py-0.5 rounded-full border border-white/30 text-[10px] uppercase tracking-wide opacity-80"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
