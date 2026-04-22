"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function WineMenuEditor() {

  const supabase = createClientComponentClient();
  const params = useParams();
  const slug = params.slug;

  const [restaurant, setRestaurant] = useState(null);
  const [menu, setMenu] = useState(null);
  const [wines, setWines] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    // 1. Get restaurant
    const { data: restaurantData } = await supabase
      .from("restaurants")
      .select("*")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (!restaurantData) {
      setLoading(false);
      return;
    }

    setRestaurant(restaurantData);

    // 2. Get wine menu by slug
    const { data: menuData } = await supabase
      .from("wine_menus")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();

    if (!menuData) {
      setLoading(false);
      return;
    }

    setMenu(menuData);

    // 3. Get all wines (cellar)
    const { data: winesData } = await supabase
      .from("wines")
      .select("*")
      .eq("restaurant_id", restaurantData.id)
      .order("name");

    setWines(winesData || []);

    // 4. Get wines in this menu
    const { data: menuItemsData } = await supabase
      .from("wine_menu_items")
      .select("*")
      .eq("wine_menu_id", menuData.id);

    setMenuItems(menuItemsData || []);

    setLoading(false);
  }

  async function addWineToMenu(wine) {

    const exists = menuItems.find(i => i.wine_id === wine.id);
    if (exists) return;

    const { data, error } = await supabase
      .from("wine_menu_items")
      .insert({
        wine_menu_id: menu.id,
        wine_id: wine.id,
        quantity: 0,
        description: "",
        price_override: null
      })
      .select()
      .single();

    if (error) {
      console.error(error);
      return;
    }

    setMenuItems(prev => [...prev, data]);
  }

  async function removeWineFromMenu(wineId) {

    await supabase
      .from("wine_menu_items")
      .delete()
      .eq("wine_id", wineId)
      .eq("wine_menu_id", menu.id);

    setMenuItems(prev => prev.filter(i => i.wine_id !== wineId));
  }

  async function updateItem(item) {

    await supabase
      .from("wine_menu_items")
      .update({
        description: item.description,
        quantity: item.quantity,
        price_override: item.price_override
      })
      .eq("id", item.id);

  }

  function getMenuItem(wineId) {
    return menuItems.find(i => i.wine_id === wineId);
  }

  const pretty = menu?.name || "Wine Menu";

  if (loading) {
    return (
      <div className="page-fade text-slate-400">
        Loading editor...
      </div>
    );
  }

  return (
    <div className="page-fade space-y-8">

      <h1 className="text-2xl font-semibold text-white">
        {pretty} Editor
      </h1>

      <div className="so-card overflow-x-auto">

        <table className="w-full text-sm">

          <thead className="border-b border-slate-300 text-slate-500">
            <tr>
              <th className="py-3 px-4 text-left">Wine</th>
              <th className="py-3 px-4 text-left">Producer</th>
              <th className="py-3 px-4 text-left">Vintage</th>
              <th className="py-3 px-4 text-left">Quantity</th>
              <th className="py-3 px-4 text-left">Price</th>
              <th className="py-3 px-4 text-left">Description</th>
              <th className="py-3 px-4 text-left">Menu</th>
            </tr>
          </thead>

          <tbody>

            {wines.map(wine => {

              const item = getMenuItem(wine.id);
              const inMenu = !!item;

              return (
                <tr key={wine.id} className="border-b border-slate-200">

                  <td className="py-3 px-4 font-medium">
                    {wine.name}
                  </td>

                  <td className="py-3 px-4 text-slate-500">
                    {wine.producer}
                  </td>

                  <td className="py-3 px-4 text-slate-500">
                    {wine.vintage}
                  </td>

                  <td className="py-3 px-4">
                    {inMenu && (
                      <input
                        type="number"
                        value={item.quantity || 0}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setMenuItems(prev =>
                            prev.map(i =>
                              i.id === item.id ? { ...i, quantity: val } : i
                            )
                          );
                        }}
                        className="border rounded px-2 py-1 w-20"
                      />
                    )}
                  </td>

                  <td className="py-3 px-4">
                    {inMenu && (
                      <input
                        type="number"
                        value={item.price_override || ""}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setMenuItems(prev =>
                            prev.map(i =>
                              i.id === item.id ? { ...i, price_override: val } : i
                            )
                          );
                        }}
                        className="border rounded px-2 py-1 w-24"
                      />
                    )}
                  </td>

                  <td className="py-3 px-4">
                    {inMenu && (
                      <input
                        type="text"
                        value={item.description || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setMenuItems(prev =>
                            prev.map(i =>
                              i.id === item.id ? { ...i, description: val } : i
                            )
                          );
                        }}
                        className="border rounded px-2 py-1 w-full"
                      />
                    )}
                  </td>

                  <td className="py-3 px-4 flex gap-2">

                    {inMenu ? (
                      <>
                        <button
                          onClick={() => updateItem(item)}
                          className="px-3 py-1 bg-blue-600 text-white rounded"
                        >
                          Save
                        </button>

                        <button
                          onClick={() => removeWineFromMenu(wine.id)}
                          className="px-3 py-1 bg-red-500 text-white rounded"
                        >
                          Remove
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => addWineToMenu(wine)}
                        className="px-3 py-1 bg-emerald-500 text-white rounded"
                      >
                        Add
                      </button>
                    )}

                  </td>

                </tr>
              );

            })}

          </tbody>

        </table>

      </div>

    </div>
  );
}