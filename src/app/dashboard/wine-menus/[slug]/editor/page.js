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
  const [savingId, setSavingId] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

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

    const { data: winesData } = await supabase
      .from("wines")
      .select("*")
      .eq("restaurant_id", restaurantData.id)
      .order("name");

    setWines(winesData || []);

    const { data: menuItemsData } = await supabase
      .from("wine_menu_items")
      .select("*")
      .eq("wine_menu_id", menuData.id);

    setMenuItems(menuItemsData || []);

    setLoading(false);
  }

  async function addWineToMenu(wine) {
    const exists = menuItems.find(
      (item) => item.wine_id === wine.id
    );

    if (exists) return;

    const { data, error } = await supabase
      .from("wine_menu_items")
      .insert({
        wine_menu_id: menu.id,
        wine_id: wine.id,
        quantity: 0,
        description: "",
        price_override: null,
        service_type: "bottle",
        glass_price: null,
      })
      .select()
      .single();

    if (error) {
      console.error("ADD WINE ERROR:", error);
      return;
    }

    setMenuItems((prev) => [...prev, data]);
  }

  async function removeWineFromMenu(wineId) {
    const { error } = await supabase
      .from("wine_menu_items")
      .delete()
      .eq("wine_id", wineId)
      .eq("wine_menu_id", menu.id);

    if (error) {
      console.error("REMOVE WINE ERROR:", error);
      return;
    }

    setMenuItems((prev) =>
      prev.filter((item) => item.wine_id !== wineId)
    );
  }

  async function updateItem(item) {
    setSavingId(item.id);

    const { error } = await supabase
      .from("wine_menu_items")
      .update({
        description: item.description,
        quantity: item.quantity,
        price_override: item.price_override,
        service_type: item.service_type || "bottle",
        glass_price:
          item.service_type === "glass" ||
          item.service_type === "both"
            ? item.glass_price
            : null,
      })
      .eq("id", item.id);

    if (error) {
      console.error("UPDATE WINE ERROR:", error);
    }

    setSavingId(null);
  }

  function updateLocalItem(itemId, field, value) {
    setMenuItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    );
  }

  function getMenuItem(wineId) {
    return menuItems.find(
      (item) => item.wine_id === wineId
    );
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
      <div>
        <h1 className="text-2xl font-semibold text-[#3a2a24]">
          {pretty} Editor
        </h1>

        <p className="text-sm text-slate-500 mt-1">
          Build the guest wine list and configure bottle or
          by-the-glass service.
        </p>
      </div>

      <div className="so-card overflow-x-auto">
        <table className="w-full text-sm min-w-[1250px]">
          <thead className="border-b border-[#e7ddd3] text-slate-500">
            <tr>
              <th className="py-3 px-4 text-left">
                Wine
              </th>

              <th className="py-3 px-4 text-left">
                Producer
              </th>

              <th className="py-3 px-4 text-left">
                Vintage
              </th>

              <th className="py-3 px-4 text-left">
                Quantity
              </th>

              <th className="py-3 px-4 text-left">
                Service
              </th>

              <th className="py-3 px-4 text-left">
                Bottle Price
              </th>

              <th className="py-3 px-4 text-left">
                Glass Price
              </th>

              <th className="py-3 px-4 text-left">
                Description
              </th>

              <th className="py-3 px-4 text-left">
                Menu
              </th>
            </tr>
          </thead>

          <tbody>
            {wines.map((wine) => {
              const item = getMenuItem(wine.id);
              const inMenu = !!item;

              return (
                <tr
                  key={wine.id}
                  className="border-b border-[#efe7df]"
                >
                  <td className="py-4 px-4 font-medium text-[#3a2a24]">
                    {wine.name}
                  </td>

                  <td className="py-4 px-4 text-slate-500">
                    {wine.producer}
                  </td>

                  <td className="py-4 px-4 text-slate-500">
                    {wine.vintage}
                  </td>

                  <td className="py-4 px-4">
                    {inMenu && (
                      <input
                        type="number"
                        min="0"
                        value={item.quantity ?? 0}
                        onChange={(e) =>
                          updateLocalItem(
                            item.id,
                            "quantity",
                            Number(e.target.value)
                          )
                        }
                        className="border border-[#e7ddd3] rounded-lg px-3 py-2 w-20 bg-white text-[#3a2a24]"
                      />
                    )}
                  </td>

                  <td className="py-4 px-4">
                    {inMenu && (
                      <select
                        value={
                          item.service_type || "bottle"
                        }
                        onChange={(e) =>
                          updateLocalItem(
                            item.id,
                            "service_type",
                            e.target.value
                          )
                        }
                        className="border border-[#e7ddd3] rounded-lg px-3 py-2 min-w-[110px] bg-white text-[#3a2a24]"
                      >
                        <option value="bottle">
                          Bottle
                        </option>

                        <option value="glass">
                          Glass
                        </option>

                        <option value="both">
                          Both
                        </option>
                      </select>
                    )}
                  </td>

                  <td className="py-4 px-4">
                    {inMenu && (
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.price_override ?? ""}
                        onChange={(e) =>
                          updateLocalItem(
                            item.id,
                            "price_override",
                            e.target.value === ""
                              ? null
                              : Number(e.target.value)
                          )
                        }
                        placeholder={String(
                          wine.price || ""
                        )}
                        className="border border-[#e7ddd3] rounded-lg px-3 py-2 w-28 bg-white text-[#3a2a24]"
                      />
                    )}
                  </td>

                  <td className="py-4 px-4">
                    {inMenu &&
                      (item.service_type === "glass" ||
                        item.service_type === "both") && (
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.glass_price ?? ""}
                          onChange={(e) =>
                            updateLocalItem(
                              item.id,
                              "glass_price",
                              e.target.value === ""
                                ? null
                                : Number(e.target.value)
                            )
                          }
                          placeholder="0.00"
                          className="border border-[#e7ddd3] rounded-lg px-3 py-2 w-24 bg-white text-[#3a2a24]"
                        />
                      )}
                  </td>

                  <td className="py-4 px-4">
                    {inMenu && (
                      <input
                        type="text"
                        value={item.description || ""}
                        onChange={(e) =>
                          updateLocalItem(
                            item.id,
                            "description",
                            e.target.value
                          )
                        }
                        placeholder="Guest description"
                        className="border border-[#e7ddd3] rounded-lg px-3 py-2 min-w-[240px] w-full bg-white text-[#3a2a24]"
                      />
                    )}
                  </td>

                  <td className="py-4 px-4">
                    {inMenu ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateItem(item)}
                          disabled={savingId === item.id}
                          className="px-3 py-2 bg-[#8a3a2c] text-white rounded-lg disabled:opacity-50"
                        >
                          {savingId === item.id
                            ? "Saving..."
                            : "Save"}
                        </button>

                        <button
                          onClick={() =>
                            removeWineFromMenu(wine.id)
                          }
                          className="px-3 py-2 border border-red-200 text-red-500 rounded-lg"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() =>
                          addWineToMenu(wine)
                        }
                        className="px-3 py-2 bg-[#3a2a24] text-white rounded-lg"
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