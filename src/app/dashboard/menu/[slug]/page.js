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
  const [pricesMap, setPricesMap] = useState({});

  const [menuType, setMenuType] = useState("services");

  const [newCategory, setNewCategory] = useState("");
  const [newCategoryDesc, setNewCategoryDesc] = useState("");

  const [dishInputs, setDishInputs] = useState({});

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    loadAll();
  }, [slug, menuType]);

  const loadAll = async () => {

    setLoading(true);

    const { data: menuData } = await supabase
      .from("menus")
      .select("*")
      .eq("public_slug", slug)
      .single();

    if (!menuData) return;

    setMenu(menuData);

    const { data: cats = [] } = await supabase
      .from("menu_categories")
      .select("*")
      .eq("menu_id", menuData.id)
      .eq("type", menuType)
      .order("position");

    const { data: its = [] } = await supabase
      .from("menu_items")
      .select("*")
      .eq("menu_id", menuData.id)
      .eq("type", menuType)
      .order("position");

    setCategories(cats);
    setItems(its);

    if (its.length) {
      const { data: prices = [] } = await supabase
        .from("menu_item_prices")
        .select("*")
        .in("menu_item_id", its.map(i => i.id))
        .order("position");

      const grouped = {};
      prices.forEach(p => {
        if (!grouped[p.menu_item_id]) grouped[p.menu_item_id] = [];
        grouped[p.menu_item_id].push(p);
      });

      setPricesMap(grouped);
    }

    setLoading(false);
  };

  const updateItem = async (id, field, value) => {
    await supabase
      .from("menu_items")
      .update({ [field]: value })
      .eq("id", id);
  };

  const deleteItem = async (id) => {
    if (!confirm("Delete this item?")) return;

    await supabase
      .from("menu_items")
      .delete()
      .eq("id", id);

    loadAll();
  };

  const addCategory = async () => {
    if (!newCategory.trim()) return;

    await supabase.from("menu_categories").insert({
      menu_id: menu.id,
      name: newCategory.toUpperCase(),
      description: newCategoryDesc,
      type: menuType,
      position: categories.length + 1
    });

    setNewCategory("");
    setNewCategoryDesc("");
    loadAll();
  };

  const addItem = async (categoryId) => {

    const input = dishInputs[categoryId] || {};
    if (!input.name) return;

    await supabase.from("menu_items").insert({
      menu_id: menu.id,
      category_id: categoryId,
      name: input.name,
      description: input.description || "",
      duration: input.duration || "",
      price: input.price ? Number(input.price) : 0,
      type: menuType,
      position: items.length + 1
    });

    setDishInputs(prev => ({
      ...prev,
      [categoryId]: {}
    }));

    loadAll();
  };

  const addPrice = async (itemId) => {
    const { data } = await supabase
      .from("menu_item_prices")
      .insert({
        menu_item_id: itemId,
        label: "60 min",
        price: 0
      })
      .select()
      .single();

    setPricesMap(prev => ({
      ...prev,
      [itemId]: [...(prev[itemId] || []), data]
    }));
  };

  const updatePrice = async (id, value) => {
    await supabase
      .from("menu_item_prices")
      .update({ price: value })
      .eq("id", id);
  };

  const deletePrice = async (id) => {
    await supabase
      .from("menu_item_prices")
      .delete()
      .eq("id", id);

    setPricesMap(prev => {
      const updated = { ...prev };
      for (let key in updated) {
        updated[key] = updated[key].filter(p => p.id !== id);
      }
      return updated;
    });
  };

  if (loading) return <div className="p-10 text-white">Loading...</div>;

  return (
    <div className="min-h-screen bg-[#05070a] text-[#e8e4dc] px-6 py-12 flex justify-center">
      
      <div className="w-full max-w-[1200px]">

        {/* HEADER */}
        <div className="flex justify-between items-center mb-12">

          <div>
            <h1 className="text-3xl font-light text-[#c6a46c]">
              {menu?.name}
            </h1>
            <p className="text-sm text-white/40">Menu editor</p>
          </div>

          <div className="flex gap-2 bg-white/5 p-1 rounded-full">
            {["food", "drinks", "services"].map(type => (
              <button
                key={type}
                onClick={() => setMenuType(type)}
                className={`px-5 py-2 rounded-full ${
                  menuType === type ? "bg-[#c6a46c] text-black" : "text-white/50"
                }`}
              >
                {type}
              </button>
            ))}
          </div>

        </div>

        {/* ADD CATEGORY */}
        <div className="bg-white/5 border rounded-2xl p-6 mb-12">

          <div className="flex gap-4">

            <input
              placeholder="Category name"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="flex-1 bg-white/[0.03] border border-white/10 px-4 py-2 rounded-xl"
            />

            <input
              placeholder="Description"
              value={newCategoryDesc}
              onChange={(e) => setNewCategoryDesc(e.target.value)}
              className="flex-1 bg-white/[0.03] border border-white/10 px-4 py-2 rounded-xl"
            />

            <button onClick={addCategory} className="bg-[#c6a46c] px-4 rounded-xl text-black">
              Add
            </button>

          </div>

        </div>

        {/* CATEGORIES */}
        {categories.map(cat => {

          const catItems = items.filter(i => i.category_id === cat.id);
          const input = dishInputs[cat.id] || {};

          return (
            <div key={cat.id} className="bg-white/5 border rounded-2xl p-6 mb-6">

              {/* CATEGORY */}
              <div className="flex justify-between mb-4">

                <input
                  defaultValue={cat.name}
                  onBlur={(e) => supabase.from("menu_categories").update({ name: e.target.value }).eq("id", cat.id)}
                  className="bg-transparent border-b border-white/10 text-[#c6a46c]"
                />

                <button
                  onClick={async () => {
                    if (!confirm("Delete category?")) return;
                    await supabase.from("menu_categories").delete().eq("id", cat.id);
                    loadAll();
                  }}
                  className="text-red-400"
                >
                  Delete
                </button>

              </div>

              {/* ADD ITEM */}
              <div className="flex gap-2 mb-4">

                <input
                  placeholder="Name"
                  value={input.name || ""}
                  onChange={(e) =>
                    setDishInputs(prev => ({
                      ...prev,
                      [cat.id]: { ...input, name: e.target.value }
                    }))
                  }
                  className="bg-white/[0.03] border px-3 py-2 rounded-xl"
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
                  className="bg-white/[0.03] border px-3 py-2 rounded-xl"
                />

                <button onClick={() => addItem(cat.id)} className="bg-[#c6a46c] px-3 rounded-xl text-black">
                  Add
                </button>

              </div>

              {/* ITEMS */}
              {catItems.map(item => (
                <div key={item.id} className="border-b py-3">

                  <div className="flex justify-between items-center">

                    <input
                      defaultValue={item.name}
                      onBlur={(e) => updateItem(item.id, "name", e.target.value)}
                      className="bg-transparent border-b border-white/10"
                    />

                    <button onClick={() => deleteItem(item.id)} className="text-red-400 text-sm">
                      Delete
                    </button>

                  </div>

                  {menuType !== "services" && (
                    <input
                      defaultValue={item.price}
                      onBlur={(e) => updateItem(item.id, "price", e.target.value)}
                      className="mt-2 bg-transparent border-b border-white/10"
                    />
                  )}

                  {menuType === "services" && (
                    <>
                      {(pricesMap[item.id] || []).map(p => (
                        <div key={p.id} className="flex gap-2 mt-2">

                          <input
                            defaultValue={p.label}
                            onBlur={(e) =>
                              supabase.from("menu_item_prices").update({ label: e.target.value }).eq("id", p.id)
                            }
                          />

                          <input
                            defaultValue={p.price}
                            onBlur={(e) => updatePrice(p.id, e.target.value)}
                          />

                          <button onClick={() => deletePrice(p.id)}>✕</button>

                        </div>
                      ))}

                      <button onClick={() => addPrice(item.id)}>
                        + Add Price
                      </button>
                    </>
                  )}

                </div>
              ))}

            </div>
          );
        })}

      </div>
    </div>
  );
}