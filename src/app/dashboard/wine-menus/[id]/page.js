"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function WineMenuEditor() {

  const supabase = createClientComponentClient();
  const { id } = useParams();

  const [menu, setMenu] = useState(null);
  const [cellarWines, setCellarWines] = useState([]);
  const [menuWines, setMenuWines] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("id")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (!restaurant) return;

    const { data: menuData } = await supabase
      .from("wine_menus")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    setMenu(menuData);

    const { data: wines } = await supabase
      .from("wines")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .order("name");

    setCellarWines(wines || []);

    const { data: menuItems } = await supabase
      .from("wine_menu_items")
      .select("*, wines(*)")
      .eq("wine_menu_id", id);

    setMenuWines(menuItems || []);

    setLoading(false);
  }

  async function addWineToMenu(wineId) {

    const { error } = await supabase
      .from("wine_menu_items")
      .insert({
        wine_menu_id: id,
        wine_id: wineId,
        position: 0
      });

    if (error) {
      console.error("Insert failed:", error);
      return;
    }

    loadData();
  }

  async function addEntireCellar() {

    const rows = cellarWines.map(w => ({
      wine_menu_id: id,
      wine_id: w.id,
      position: 0
    }));

    const { error } = await supabase
      .from("wine_menu_items")
      .insert(rows);

    if (error) {
      console.error("Bulk insert failed:", error);
      alert("Failed to add wines");
      return;
    }

    alert(`Added ${rows.length} wines to the menu`);

    loadData();
  }

  if (loading) {
    return (
      <div className="page-fade text-slate-400">
        Loading wine menu…
      </div>
    );
  }

  return (
    <div className="page-fade space-y-8">

      <h1 className="text-2xl font-semibold text-white">
        {menu?.name}
      </h1>

      {/* CURRENT MENU */}

      <div className="so-card p-6">

        <h2 className="text-white font-semibold mb-4">
          Wines in this menu
        </h2>

        {menuWines.length === 0 ? (

          <div className="text-slate-400">
            No wines added yet.
          </div>

        ) : (

          <div className="grid md:grid-cols-3 gap-4">

            {menuWines.map((item) => (

              <div
                key={item.id}
                className="so-card p-4"
              >

                <div className="text-white font-medium">
                  {item.wines.name}
                </div>

                <div className="text-sm text-slate-400">
                  {item.wines.region} · {item.wines.vintage}
                </div>

              </div>

            ))}

          </div>

        )}

      </div>

      {/* CELLAR */}

      <div className="so-card p-6">

        <div className="flex items-center justify-between mb-4">

          <h2 className="text-white font-semibold">
            Cellar wines
          </h2>

          <button
            onClick={addEntireCellar}
            className="so-btn-primary"
          >
            Add entire cellar
          </button>

        </div>

        <div className="grid md:grid-cols-3 gap-4">

          {cellarWines
            .filter(w => !menuWines.some(m => m.wine_id === w.id))
            .map((wine) => (

              <div
                key={wine.id}
                className="so-card p-4 hover:scale-[1.02] transition cursor-pointer"
                onClick={() => addWineToMenu(wine.id)}
              >

                <div className="text-white font-medium">
                  {wine.name}
                </div>

                <div className="text-sm text-slate-400">
                  {wine.region} · {wine.vintage}
                </div>

                <div className="text-xs text-slate-500 mt-2">
                  Click to add to menu
                </div>

              </div>

            ))}

        </div>

      </div>

    </div>
  );
}