"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";

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

export default function NewDishPage() {
  const supabase = createClientComponentClient();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [restaurant, setRestaurant] = useState(null);
  const [menus, setMenus] = useState([]);
  const [menuId, setMenuId] = useState("");

  const [category, setCategory] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [selectedAllergens, setSelectedAllergens] = useState([]);

  const [error, setError] = useState("");

  useEffect(() => {
    loadContext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadContext = async () => {
    setLoading(true);
    setError("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError("You must be logged in.");
      setLoading(false);
      return;
    }

    const { data: r, error: rError } = await supabase
      .from("restaurants")
      .select("*")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (rError || !r) {
      setError("No restaurant found for this account.");
      setLoading(false);
      return;
    }
    setRestaurant(r);

    const { data: menusData, error: mError } = await supabase
      .from("menus")
      .select("*")
      .eq("restaurant_id", r.id)
      .order("created_at", { ascending: true });

    if (mError) {
      setError("Failed to load menus.");
      setLoading(false);
      return;
    }

    setMenus(menusData || []);
    if (menusData && menusData.length > 0) {
      setMenuId(menusData[0].id);
    }

    setLoading(false);
  };

  const toggleAllergen = (code) => {
    setSelectedAllergens((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!menuId) {
      setError("Please pick a menu first.");
      return;
    }
    if (!name.trim()) {
      setError("Dish name is required.");
      return;
    }
    if (!price || Number.isNaN(Number(price))) {
      setError("Please enter a valid price.");
      return;
    }

    try {
      setSaving(true);

      // 1) Insert dish
      const { data: dish, error: dishError } = await supabase
        .from("dishes")
        .insert({
          menu_id: menuId,
          name: name.trim(),
          description: description.trim() || null,
          price: Number(price),
          // optional: category column if you added it to dishes
          category: category.trim() || null,
        })
        .select("*")
        .single();

      if (dishError) throw dishError;

      // 2) Insert allergens
      if (selectedAllergens.length > 0) {
        const rows = selectedAllergens.map((code) => ({
          dish_id: dish.id,
          allergen_code: code,
        }));

        const { error: daError } = await supabase
          .from("dish_allergens")
          .insert(rows);

        if (daError) throw daError;
      }

      // 3) Go back to dishes list (or dashboard)
      router.push("/dashboard/dishes");
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to save dish.");
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[70vh] text-slate-300 text-sm">
        Loading dish editor…
      </div>
    );
  }

  // No menu yet: force them to create one first
  if (!menus.length) {
    return (
      <div className="max-w-xl mx-auto mt-16 rounded-2xl bg-slate-950/80 border border-slate-800 p-8 text-sm text-slate-200">
        <h1 className="text-xl font-semibold mb-3">No menus yet</h1>
        <p className="mb-4">
          You need at least one menu before you can add dishes to your guest
          allergen tool.
        </p>
        <a
          href="/dashboard/menu"
          className="inline-flex items-center justify-center rounded-full bg-emerald-400 px-5 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-300 transition"
        >
          Create your first menu
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto mt-10 mb-20">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.25em] text-emerald-400/80 mb-2">
          SelectorOS • Dishes
        </p>
        <h1 className="text-2xl font-semibold text-slate-50">
          Add a new dish
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          This dish will sync automatically to your live allergen view.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-3xl bg-slate-950/80 border border-slate-800/80 shadow-[0_22px_60px_rgba(0,0,0,0.75)] p-6 md:p-7 space-y-6"
      >
        {error && (
          <div className="rounded-xl border border-red-500/60 bg-red-500/10 px-4 py-2 text-xs text-red-200">
            {error}
          </div>
        )}

        {/* Menu + Category */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Menu
            </label>
            <select
              value={menuId}
              onChange={(e) => setMenuId(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-50"
            >
              {menus.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name || "Untitled menu"}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Category (optional)
            </label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Dim Sum, Starters, Mains…"
              className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500"
            />
          </div>
        </div>

        {/* Name + Description */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            Dish name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Test dumpling"
            className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            Description (optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Juicy pork dumpling with ginger"
            className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 resize-none"
          />
        </div>

        {/* Price */}
        <div className="max-w-xs">
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            Price (EUR)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="12.50"
            className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500"
          />
        </div>

        {/* Allergens */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-2">
            Allergens in this dish
          </label>
          <p className="text-[11px] text-slate-400 mb-3">
            Tap all codes that this dish <span className="font-semibold">contains</span>. 
            The guest allergen tool will hide this dish when those allergens are selected.
          </p>
          <div className="flex flex-wrap gap-2">
            {ALLERGENS.map((a) => {
              const active = selectedAllergens.includes(a.code);
              return (
                <button
                  key={a.code}
                  type="button"
                  onClick={() => toggleAllergen(a.code)}
                  className={`px-3 py-1.5 rounded-full border text-xs font-semibold transition ${
                    active
                      ? "bg-emerald-400 text-slate-950 border-emerald-300"
                      : "bg-slate-900/70 text-slate-200 border-slate-700 hover:border-slate-500"
                  }`}
                >
                  {a.code} <span className="opacity-70 ml-1">{a.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-xs text-slate-400 hover:text-slate-200"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center rounded-full bg-emerald-400 px-6 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-300 disabled:opacity-50 transition"
          >
            {saving ? "Saving…" : "Save dish"}
          </button>
        </div>
      </form>
    </div>
  );
}
