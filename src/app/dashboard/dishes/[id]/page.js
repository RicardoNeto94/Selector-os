"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function EditDishPage() {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const params = useParams();

  const dishId = params?.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [restaurant, setRestaurant] = useState(null);
  const [menus, setMenus] = useState([]);
  const [allergens, setAllergens] = useState([]);

  // dish fields
  const [name, setName] = useState("");
  const [menuId, setMenuId] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");

  // allergen selection: array of allergen.id
  const [selectedAllergenIds, setSelectedAllergenIds] = useState([]);

  useEffect(() => {
    if (!dishId) return;
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dishId]);

  const loadData = async () => {
    try {
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

      // 1) Restaurant
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

      // 2) Menus
      const { data: menusData, error: mError } = await supabase
        .from("menus")
        .select("*")
        .eq("restaurant_id", r.id);

      if (mError) {
        setError("Failed to load menus.");
        setLoading(false);
        return;
      }
      setMenus(menusData || []);

      // 3) All allergens
      const { data: allergenData, error: aError } = await supabase
        .from("allergen")
        .select("*")
        .order("code", { ascending: true });

      if (aError) {
        console.error(aError);
        setError("Failed to load allergens.");
        setLoading(false);
        return;
      }
      setAllergens(allergenData || []);

      // 4) Dish
      const { data: dish, error: dError } = await supabase
        .from("dishes")
        .select("*")
        .eq("id", dishId)
        .maybeSingle();

      if (dError || !dish) {
        setError("Dish not found.");
        setLoading(false);
        return;
      }

      setName(dish.name || "");
      setMenuId(dish.menu_id || "");
      setCategory(dish.category || "");
      setPrice(dish.price != null ? String(dish.price) : "");
      setDescription(dish.description || "");

      // 5) Dish allergens (join table) → preselect only those
      const { data: dishAllergens, error: daError } = await supabase
        .from("dish_allergens")
        .select("allergen_id")
        .eq("dish_id", dishId);

      if (daError) {
        console.error("Failed to load dish allergens", daError);
      }

      if (dishAllergens && dishAllergens.length > 0) {
        const ids = dishAllergens
          .map((row) => row.allergen_id)
          .filter((x) => x != null)
          .map((x) => Number(x)); // normalise to number

        setSelectedAllergenIds(ids);
      } else {
        setSelectedAllergenIds([]);
      }

      setLoading(false);
    } catch (err) {
      console.error(err);
      setError("Unexpected error while loading dish.");
      setLoading(false);
    }
  };

  const toggleAllergen = (allergenId) => {
    setSelectedAllergenIds((prev) => {
      const idNum = Number(allergenId);
      const exists = prev.includes(idNum);
      if (exists) {
        return prev.filter((id) => id !== idNum);
      }
      return [...prev, idNum];
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      if (!name.trim()) {
        setError("Name is required.");
        setSaving(false);
        return;
      }
      if (!menuId) {
        setError("Menu is required.");
        setSaving(false);
        return;
      }

      const priceNumber =
        price === "" || price == null ? null : Number.parseFloat(price);

      // 1) Update dish
      const { error: updateError } = await supabase
        .from("dishes")
        .update({
          name: name.trim(),
          menu_id: menuId,
          category: category.trim() || null,
          price: priceNumber,
          description: description.trim() || null,
        })
        .eq("id", dishId);

      if (updateError) {
        console.error(updateError);
        setError("Failed to update dish. Check Supabase logs.");
        setSaving(false);
        return;
      }

      // 2) Reset allergens for this dish
      const { error: deleteError } = await supabase
        .from("dish_allergens")
        .delete()
        .eq("dish_id", dishId);

      if (deleteError) {
        console.error(deleteError);
        setError("Failed to reset dish allergens.");
        setSaving(false);
        return;
      }

      const idsArray = selectedAllergenIds.map((id) => Number(id));
      if (idsArray.length > 0) {
        const insertRows = idsArray.map((aid) => ({
          dish_id: dishId,
          allergen_id: aid,
        }));

        const { error: insertError } = await supabase
          .from("dish_allergens")
          .insert(insertRows);

        if (insertError) {
          console.error(insertError);
          setError("Failed to save allergens for this dish.");
          setSaving(false);
          return;
        }
      }

      router.push("/dashboard/dishes");
    } catch (err) {
      console.error(err);
      setError("Unexpected error while saving dish.");
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[70vh] text-slate-300 text-sm">
        Loading dish…
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="flex items-center justify-center h-[70vh] text-slate-300 text-sm">
        No restaurant found for this account.
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto mt-10 mb-20 text-slate-100">
      <button
        type="button"
        onClick={() => router.push("/dashboard/dishes")}
        className="mb-4 text-xs text-slate-400 hover:text-slate-200"
      >
        ← Back to dishes
      </button>

      <h1 className="text-2xl font-semibold mb-2">Edit dish</h1>
      <p className="text-sm text-slate-400 mb-6">
        Update this dish’s details and allergens. Changes go live instantly in
        your guest view.
      </p>

      {error && (
        <div className="mb-4 rounded-xl border border-red-500/60 bg-red-500/10 px-4 py-2 text-xs text-red-200">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSave}
        className="rounded-2xl bg-slate-950/80 border border-slate-800/80 p-6 space-y-6 shadow-[0_22px_60px_rgba(0,0,0,0.75)]"
      >
        {/* BASIC FIELDS */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              Dish name
            </label>
            <input
              type="text"
              className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-400"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Menu</label>
              <select
                className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                value={menuId || ""}
                onChange={(e) => setMenuId(e.target.value)}
              >
                <option value="">Select menu…</option>
                {menus.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Category (optional)
              </label>
              <input
                type="text"
                className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Starter, Main, Dessert…"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">
              Price (€)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-400"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="e.g. 24.50"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">
              Description (optional)
            </label>
            <textarea
              className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-400 min-h-[80px]"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description used in guest view."
            />
          </div>
        </div>

        {/* ALLERGENS */}
<div className="pt-4 border-t border-slate-800/80">
  <p className="text-xs text-slate-400 mb-2">
    Allergens linked to this dish
  </p>

  {allergens.length === 0 ? (
    <p className="text-xs text-slate-500">
      No allergens configured yet. Add them in your allergen library.
    </p>
  ) : (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {allergens.map((a) => {
        const idNum = Number(a.id);
        const active = selectedAllergenIds.includes(idNum);

        return (
          <button
            key={a.id}
            type="button"
            onClick={() => toggleAllergen(idNum)}
            className={
              "flex items-center justify-between gap-2 text-xs rounded-lg px-3 py-2 border transition " +
              (active
                ? "bg-emerald-500/10 border-emerald-400/70 text-emerald-100"
                : "bg-slate-900/80 border-slate-700 text-slate-200 hover:border-emerald-400/70")
            }
          >
            <span>
              <span className="font-semibold">{a.code || "A"}</span> –{" "}
              {a.name}
            </span>

            {/* fake checkbox indicator */}
            <span
              className={
                "w-3 h-3 rounded-sm border " +
                (active
                  ? "bg-emerald-400 border-emerald-300"
                  : "border-slate-500")
              }
            />
          </button>
        );
      })}
    </div>
  )}
</div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.push("/dashboard/dishes")}
            className="px-4 py-2 rounded-full text-xs border border-slate-600 text-slate-300 hover:bg-slate-800"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 rounded-full text-xs font-semibold bg-emerald-400 text-slate-950 hover:bg-emerald-300 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
