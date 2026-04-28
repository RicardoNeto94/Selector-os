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
  const [openCategory, setOpenCategory] = useState(null);

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
      price: menuType !== "services" ? Number(input.price || 0) : null,
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
      .update({ price: Number(value) })
      .eq("id", id);
  };

  const deletePrice = async (id) => {
    await supabase.from("menu_item_prices").delete().eq("id", id);

    setPricesMap(prev => {
      const updated = { ...prev };
      for (let key in updated) {
        updated[key] = updated[key].filter(p => p.id !== id);
      }
      return updated;
    });
  };

  const deleteItem = async (id) => {
    if (!confirm("Delete item?")) return;
    await supabase.from("menu_items").delete().eq("id", id);
    loadAll();
  };

  if (loading) return <div className="p-10 text-white">Loading...</div>;

  return (
    <div className="so-main-inner px-6 py-12 flex justify-center">
      <div className="w-full max-w-[1200px] space-y-10">

        {/* HEADER */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="so-title">{menu?.name}</h1>
            <p className="so-sub mt-1">Menu editor</p>
          </div>

          <div className="flex gap-2 bg-[var(--so-bg-surface)] p-1 rounded-full border">
            {["food", "drinks", "services"].map(type => (
              <button
                key={type}
                onClick={() => setMenuType(type)}
                className={`px-5 py-2 rounded-full text-sm ${
                  menuType === type
                    ? "bg-[var(--so-accent)] text-white"
                    : "text-[var(--so-text-muted)]"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* ADD CATEGORY */}
        <div className="so-card">
          <div className="flex gap-4 w-full items-center">
            <input
              placeholder="Category name"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="so-input flex-1 min-w-0"
            />
            <input
              placeholder="Description"
              value={newCategoryDesc}
              onChange={(e) => setNewCategoryDesc(e.target.value)}
              className="so-input flex-1 min-w-0"
            />
            <button onClick={addCategory} className="so-btn-primary">
              Add
            </button>
          </div>
        </div>

        {/* CATEGORIES */}
        {categories.map(cat => {

          const catItems = items.filter(i => i.category_id === cat.id);
          const input = dishInputs[cat.id] || {};

          return (
            <div key={cat.id} className="so-card space-y-6">

              {/* HEADER */}
              <div
                onClick={() =>
                  setOpenCategory(openCategory === cat.id ? null : cat.id)
                }
                className="flex justify-between items-center cursor-pointer"
              >
                <input
                  value={cat.name}
                  onChange={async (e) => {
                    await supabase
                      .from("menu_categories")
                      .update({ name: e.target.value })
                      .eq("id", cat.id);
                  }}
                  className="so-input w-[300px]"
                />

                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (!confirm("Delete category?")) return;
                    await supabase.from("menu_categories").delete().eq("id", cat.id);
                    loadAll();
                  }}
                  className="text-red-500 text-sm"
                >
                  Delete
                </button>
              </div>

              {openCategory === cat.id && (
                <>
                  {/* ADD ITEM */}
                  <div className="flex gap-3 w-full items-center">
                    <input
                      placeholder="Name"
                      value={input.name || ""}
                      onChange={(e) =>
                        setDishInputs(prev => ({
                          ...prev,
                          [cat.id]: { ...input, name: e.target.value }
                        }))
                      }
                      className="so-input flex-1 min-w-0"
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
                      className="so-input flex-1 min-w-0"
                    />

                    {menuType !== "services" && (
                      <input
                        type="number"
                        value={input.price || ""}
                        onChange={(e) =>
                          setDishInputs(prev => ({
                            ...prev,
                            [cat.id]: { ...input, price: e.target.value }
                          }))
                        }
                        className="so-input w-24 text-right"
                        placeholder="€"
                      />
                    )}

                    <button onClick={() => addItem(cat.id)} className="so-btn-primary">
                      Add
                    </button>
                  </div>

                  {/* ITEMS */}
                  {catItems.map(item => (
                    <div key={item.id} className="so-item">

                      <div className="flex w-full gap-4 items-center">

                        <div className="flex flex-col gap-2 flex-1 min-w-0">
                          <input
                            value={item.name}
                            onChange={async (e) => {
                              await supabase
                                .from("menu_items")
                                .update({ name: e.target.value })
                                .eq("id", item.id);
                            }}
                            className="so-input"
                          />

                          <input
                            value={item.description || ""}
                            onChange={async (e) => {
                              await supabase
                                .from("menu_items")
                                .update({ description: e.target.value })
                                .eq("id", item.id);
                            }}
                            className="so-input text-sm"
                          />
                        </div>

                        {menuType !== "services" && (
                          <input
                            type="number"
                            value={item.price || ""}
                            onChange={async (e) => {
                              await supabase
                                .from("menu_items")
                                .update({ price: Number(e.target.value) })
                                .eq("id", item.id);
                            }}
                            className="so-input w-24 text-right"
                          />
                        )}

                        <button
                          onClick={() => deleteItem(item.id)}
                          className="text-red-500 text-sm"
                        >
                          Delete
                        </button>

                      </div>

                      {menuType === "services" && (
                        <div className="mt-2 space-y-2">

                          {(pricesMap[item.id] || []).map(p => (
                            <div key={p.id} className="flex gap-3">
                              <input className="so-input w-32" value={p.label} />
                              <input className="so-input w-24 text-right" value={p.price} />
                              <button onClick={() => deletePrice(p.id)}>✕</button>
                            </div>
                          ))}

                          <button onClick={() => addPrice(item.id)} className="so-btn-ghost text-sm">
                            + Add Price
                          </button>

                        </div>
                      )}

                    </div>
                  ))}

                </>
              )}

            </div>
          );
        })}

      </div>
    </div>
  );
}