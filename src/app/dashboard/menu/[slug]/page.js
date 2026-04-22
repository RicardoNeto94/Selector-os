"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation"; // ✅ FIX
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function MenuEditorPage() {

  const { slug } = useParams(); // ✅ FIX
  const supabase = createClientComponentClient();

  const [menu, setMenu] = useState(null);
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);

  const [newCategory, setNewCategory] = useState("");
  const [dishInputs, setDishInputs] = useState({});

  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});

  const [loading, setLoading] = useState(true);

  // 🔹 LOAD EVERYTHING
  useEffect(() => {
    if (!slug) return; // ✅ prevents crash
    loadAll();
  }, [slug]);

  const loadAll = async () => {

    setLoading(true);

    const { data: menuData } = await supabase
      .from("menus")
      .select("*")
      .eq("public_slug", slug)
      .single();

    if (!menuData) {
      setLoading(false);
      return;
    }

    setMenu(menuData);

    const { data: cats } = await supabase
      .from("menu_categories")
      .select("*")
      .eq("menu_id", menuData.id)
      .order("position");

    const { data: its } = await supabase
      .from("menu_items")
      .select("*")
      .eq("menu_id", menuData.id)
      .order("position");

    setCategories(cats || []);
    setItems(its || []);

    setLoading(false);
  };

  const reloadCategories = async () => {
    if (!menu) return;

    const { data } = await supabase
      .from("menu_categories")
      .select("*")
      .eq("menu_id", menu.id)
      .order("position");

    setCategories(data || []);
  };

  const reloadItems = async () => {
    if (!menu) return;

    const { data } = await supabase
      .from("menu_items")
      .select("*")
      .eq("menu_id", menu.id)
      .order("position");

    setItems(data || []);
  };

  const addCategory = async () => {

    if (!menu || !menu.id) {
      alert("Menu not ready yet");
      return;
    }

    if (!newCategory.trim()) return;

    const { error } = await supabase.from("menu_categories").insert({
      menu_id: menu.id,
      name: newCategory.toUpperCase(),
      position: categories.length + 1
    });

    if (error) {
      alert(error.message);
      return;
    }

    setNewCategory("");
    reloadCategories();
  };

  const deleteCategory = async (id) => {

    await supabase.from("menu_items").delete().eq("category_id", id);
    await supabase.from("menu_categories").delete().eq("id", id);

    reloadCategories();
    reloadItems();
  };

  const addDish = async (categoryId) => {

    const input = dishInputs[categoryId] || {};

    if (!input.name || !input.price) {
      alert("Missing name or price");
      return;
    }

    const { error } = await supabase
      .from("menu_items")
      .insert({
        menu_id: menu.id,
        category_id: categoryId,
        name: input.name,
        description: input.description || "",
        price: Number(input.price),
        position: items.length + 1
      });

    if (error) {
      alert(error.message);
      return;
    }

    setDishInputs(prev => ({
      ...prev,
      [categoryId]: { name: "", description: "", price: "" }
    }));

    reloadItems();
  };

  const deleteDish = async (id) => {
    await supabase.from("menu_items").delete().eq("id", id);
    reloadItems();
  };

  const updateDish = async () => {

    await supabase
      .from("menu_items")
      .update({
        name: editData.name,
        description: editData.description,
        price: Number(editData.price)
      })
      .eq("id", editingId);

    setEditingId(null);
    setEditData({});
    reloadItems();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Loading menu...
      </div>
    );
  }

  if (!menu) return null;

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="max-w-4xl mx-auto px-6">

        <div className="mb-10">
          <h1 className="text-3xl font-semibold">{menu.name}</h1>
          <p className="text-sm text-gray-500">Menu Editor</p>
        </div>

        <div className="flex gap-3 mb-12">
          <input
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="New category"
            className="flex-1 border px-4 py-2 rounded-lg"
          />
          <button
            onClick={addCategory}
            className="bg-black text-white px-6 rounded-lg"
          >
            Add
          </button>
        </div>

        <div className="space-y-10">

          {categories.map(cat => {

            const catItems = items.filter(i => i.category_id === cat.id);
            const input = dishInputs[cat.id] || {};

            return (
              <div key={cat.id} className="bg-white rounded-2xl p-6 shadow-sm">

                <div className="flex justify-between mb-6">
                  <h2 className="text-xl font-semibold">{cat.name}</h2>
                  <button
                    onClick={() => deleteCategory(cat.id)}
                    className="text-red-500 text-xs"
                  >
                    Delete
                  </button>
                </div>

                <div className="space-y-4 mb-6">

                  {catItems.map(item => (
                    <div key={item.id} className="flex justify-between border-b pb-2">
                      <span>{item.name}</span>
                      <span>€{item.price}</span>
                    </div>
                  ))}

                </div>

              </div>
            );
          })}

        </div>

      </div>
    </div>
  );
}