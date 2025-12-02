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

  // allergen selection (set of allergen_id)
  const [selectedAllergenIds, setSelectedAllergenIds] = useState(new Set());

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

      // 1) Restaurant for this owner
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

      // 2) Menus for this restaurant
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

      // 3) All allergens (for checkboxes)
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

      // 4) Dish itself
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

      // 5) Current dish allergens
      const { data: dishAllergens, error: daError } = await supabase
        .from("dish_allergens")
        .select("allergen_id")
        .eq("dish_id", dishId);

      if (daError) {
        console.error("Failed to load dish allergens", daError);
        // not fatal – user can still edit basic fields
      }

      if (dishAllergens && dishAllergens.length > 0) {
        setSelectedAllergenIds(
          new Set(dishAllergens.map((row) => row.allergen_id))
        );
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
      const next = new Set(prev);
      if (next.has(allergenId)) {
        next.delete(allergenId);
      } else {
        next.add(allergenId);
      }
      return next;
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      // Basic validation
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

      // 1) Update dish row
      const priceNumber =
        price === "" || price == null ? null : Number.parseFloat(price);

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

      // 2) Reset dish_allergens → insert new selection
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

      const idsArray = Array.from(selectedAllergenIds);
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

      // back to dishes list
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
        {/* Basic fields */}
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
              placeholder="E.g. Steamed Sea Bass with Ginger"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Menu select */}
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Menu
              </label>
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

            {/* Category */}
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

          {/* Price */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </div>

          {/* Description */}
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

        {/* Allergens */}
        <div className="pt-4 border-t border-slate-800/80">
          <p className="text-xs text-slate-400 mb-2">
            Allergens linked to this dish
          </p>
          {allergens.length === 0 ? (
            <p className="text-xs text-slate-500">
              No allergens configured yet. Add them in your main allergen
              library.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {allergens.map((a) => {
                const checked = selectedAllergenIds.has(a.id);
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => toggleAllergen(a.id)}
                    className={
                      "px-3 py-1 rounded-full text-xs border transition " +
                      (checked
                        ? "bg-emerald-500/20 border-emerald-400 text-emerald-200"
                        : "bg-slate-900 border-slate-600 text-slate-200")
                    }
                  >
                    {a.code || "A"} – {a.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Actions */}
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
