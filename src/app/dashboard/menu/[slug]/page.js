"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function MenuEditorPage() {

  const { slug } = useParams();
  const supabase = createClientComponentClient();

  const [menu, setMenu] = useState(null);
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);

  const [newCategory, setNewCategory] = useState("");
  const [dishInputs, setDishInputs] = useState({});

  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
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
    if (!menu || !menu.id) return;
    if (!newCategory.trim()) return;

    await supabase.from("menu_categories").insert({
      menu_id: menu.id,
      name: newCategory.toUpperCase(),
      position: categories.length + 1
    });

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

    await supabase
      .from("menu_items")
      .insert({
        menu_id: menu.id,
        category_id: categoryId,
        name: input.name,
        description: input.description || "",
        price: Number(input.price),
        position: items.length + 1
      });

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

        {/* ADD CATEGORY */}
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

        {/* CATEGORIES */}
        <div className="space-y-10">

          {categories.map(cat => {

            const catItems = items.filter(i => i.category_id === cat.id);
            const input = dishInputs[cat.id] || {};

            return (
              <div key={cat.id} className="bg-white rounded-2xl p-6 shadow-sm">

                {/* HEADER */}
                <div className="flex justify-between mb-6">
                  <h2 className="text-xl font-semibold">{cat.name}</h2>
                  <button
                    onClick={() => deleteCategory(cat.id)}
                    className="text-red-500 text-xs"
                  >
                    Delete
                  </button>
                </div>

                {/* DISHES */}
                <div className="space-y-4 mb-6">

                  {catItems.map(item => (

                    editingId === item.id ? (

                      <div key={item.id} className="grid grid-cols-3 gap-2">

                        <input
                          value={editData.name}
                          onChange={(e) =>
                            setEditData({ ...editData, name: e.target.value })
                          }
                          className="border px-2 py-1"
                        />

                        <input
                          value={editData.description}
                          onChange={(e) =>
                            setEditData({ ...editData, description: e.target.value })
                          }
                          className="border px-2 py-1"
                        />

                        <input
                          value={editData.price}
                          onChange={(e) =>
                            setEditData({ ...editData, price: e.target.value })
                          }
                          className="border px-2 py-1"
                        />

                        <button
                          onClick={updateDish}
                          className="bg-black text-white text-xs px-2 py-1"
                        >
                          Save
                        </button>

                      </div>

                    ) : (

                      <div key={item.id} className="flex justify-between items-center border-b pb-2">

                        <div>
                          <div className="font-medium">{item.name}</div>
                          <div className="text-sm text-gray-500">
                            {item.description}
                          </div>
                        </div>

                        <div className="flex items-center gap-4">

                          <span className="font-medium">€{item.price}</span>

                          <button
                            onClick={() => {
                              setEditingId(item.id);
                              setEditData(item);
                            }}
                            className="text-blue-500 text-sm"
                          >
                            Edit
                          </button>

                          <button
                            onClick={() => deleteDish(item.id)}
                            className="text-red-500 text-sm"
                          >
                            Delete
                          </button>

                        </div>

                      </div>

                    )

                  ))}

                </div>

                {/* ADD DISH */}
                <div className="grid grid-cols-3 gap-2">

                  <input
                    placeholder="Name"
                    value={input.name || ""}
                    onChange={(e) =>
                      setDishInputs(prev => ({
                        ...prev,
                        [cat.id]: { ...input, name: e.target.value }
                      }))
                    }
                    className="border px-2 py-1"
                  />

                  <input
                    placeholder="Description"
                    value={input.description || ""}
                    onChange={(e) =>
                      setDishInputs(prev => ({
                        ...prev,
                        [cat.id]: { ...input, description: e.target.value }
                      }))
                    }
                    className="border px-2 py-1"
                  />

                  <input
                    placeholder="Price"
                    value={input.price || ""}
                    onChange={(e) =>
                      setDishInputs(prev => ({
                        ...prev,
                        [cat.id]: { ...input, price: e.target.value }
                      }))
                    }
                    className="border px-2 py-1"
                  />

                </div>

                <button
                  onClick={() => addDish(cat.id)}
                  className="mt-3 bg-black text-white px-4 py-1 rounded"
                >
                  Add Dish
                </button>

              </div>
            );
          })}

        </div>

      </div>
    </div>
  );
}