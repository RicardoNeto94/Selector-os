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

  if (loading) return <div className="p-10 text-white">Loading...</div>;

  return (
    <div className="min-h-screen bg-[#05070a] text-[#e8e4dc] px-6 py-12 flex justify-center">
      
      <div className="w-full max-w-[1200px]">

        {/* HEADER */}
        <div className="flex justify-between items-center mb-12">

          <div>
            <h1 className="text-3xl font-light tracking-wide text-[#c6a46c]">
              {menu?.name}
            </h1>
            <p className="text-sm text-white/40 mt-1">
              Menu editor
            </p>
          </div>

          <div className="flex gap-2 bg-white/5 p-1 rounded-full backdrop-blur-xl border border-white/10">
            {["food", "drinks", "services"].map(type => (
              <button
                key={type}
                onClick={() => setMenuType(type)}
                className={`px-5 py-2 text-sm rounded-full transition ${
                  menuType === type
                    ? "bg-[#c6a46c] text-black shadow-md"
                    : "text-white/50 hover:text-white"
                }`}
              >
                {type}
              </button>
            ))}
          </div>

        </div>

        {/* ADD CATEGORY */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-12 backdrop-blur-xl">

          <div className="text-xs text-white/40 mb-5 tracking-[0.2em]">
            ADD CATEGORY
          </div>

          <div className="flex gap-4 items-center">

            <input
              placeholder="Category name"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="flex-1 bg-white/[0.03] border border-white/10 px-5 py-3 rounded-2xl focus:outline-none focus:border-[#c6a46c] transition"
            />

            <input
              placeholder="Category description"
              value={newCategoryDesc}
              onChange={(e) => setNewCategoryDesc(e.target.value)}
              className="flex-1 bg-white/[0.03] border border-white/10 px-5 py-3 rounded-2xl focus:outline-none focus:border-[#c6a46c] transition"
            />

            <button
              onClick={addCategory}
              className="px-6 py-3 bg-[#c6a46c] text-black rounded-2xl font-medium hover:opacity-90 transition"
            >
              Add
            </button>

          </div>

        </div>

        {/* CATEGORIES */}
        <div className="space-y-10">

          {categories.map(cat => {

            const catItems = items.filter(i => i.category_id === cat.id);
            const input = dishInputs[cat.id] || {};

            return (
              <div
                key={cat.id}
                className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl"
              >

                {/* HEADER */}
                <div className="mb-6 border-b border-white/10 pb-4">

                  <h2 className="text-lg tracking-wide text-[#c6a46c]">
                    {cat.name}
                  </h2>

                  {cat.description && (
                    <p className="text-sm text-white/40 mt-2 max-w-md">
                      {cat.description}
                    </p>
                  )}

                </div>

                {/* ADD ITEM */}
                <div className="flex gap-3 mb-6 items-center">

                  <input
                    placeholder="Name"
                    value={input.name || ""}
                    onChange={(e) =>
                      setDishInputs(prev => ({
                        ...prev,
                        [cat.id]: { ...input, name: e.target.value }
                      }))
                    }
                    className="flex-1 bg-white/[0.03] border border-white/10 px-4 py-3 rounded-2xl"
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
                    className="flex-1 bg-white/[0.03] border border-white/10 px-4 py-3 rounded-2xl"
                  />

                  <input
                    placeholder="Duration"
                    value={input.duration || ""}
                    onChange={(e) =>
                      setDishInputs(prev => ({
                        ...prev,
                        [cat.id]: { ...input, duration: e.target.value }
                      }))
                    }
                    className="w-32 bg-white/[0.03] border border-white/10 px-4 py-3 rounded-2xl"
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
                    className="w-28 bg-white/[0.03] border border-white/10 px-4 py-3 rounded-2xl"
                  />

                  <button
                    onClick={() => addItem(cat.id)}
                    className="px-5 py-3 bg-[#c6a46c] text-black rounded-2xl"
                  >
                    Add
                  </button>

                </div>

                {/* ITEMS */}
                <div className="space-y-4">

                  {catItems.map(item => (
                    <div
                      key={item.id}
                      className="flex justify-between items-start border-b border-white/10 pb-4"
                    >

                      <div className="max-w-[70%]">

                        <div className="text-white text-[15px]">
                          {item.name}
                        </div>

                        {item.description && (
                          <div className="text-sm text-white/40 mt-1">
                            {item.description}
                          </div>
                        )}

                        {item.duration && (
                          <div className="text-xs text-white/30 mt-1">
                            {item.duration}
                          </div>
                        )}

                      </div>

                      <div className="text-[#c6a46c] font-medium text-[15px]">
                        €{item.price}
                      </div>

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