"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function WineMenuEditor() {

  const supabase = createClientComponentClient();
  const params = useParams();
  const venue = params.venue;

  const [restaurant, setRestaurant] = useState(null);
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

    const { data: winesData } = await supabase
      .from("wines")
      .select("*")
      .eq("restaurant_id", restaurantData.id)
      .order("name");

    setWines(winesData || []);

    const { data: menuData } = await supabase
      .from("wine_menu_items")
      .select("*")
      .eq("venue_slug", venue);

    setMenuItems(menuData || []);

    setLoading(false);

  }

  async function addWineToMenu(wine) {

    const { error } = await supabase
      .from("wine_menu_items")
      .insert({
        venue_slug: venue,
        wine_id: wine.id
      });

    if (error) {
      console.error(error);
      return;
    }

    setMenuItems(prev => [...prev, { wine_id: wine.id }]);

  }

  async function removeWineFromMenu(wineId) {

    await supabase
      .from("wine_menu_items")
      .delete()
      .eq("wine_id", wineId)
      .eq("venue_slug", venue);

    setMenuItems(prev => prev.filter(i => i.wine_id !== wineId));

  }

  function wineInMenu(wineId) {
    return menuItems.some(i => i.wine_id === wineId);
  }

  const pretty = venue
    .replace("-", " ")
    .replace(/\b\w/g, l => l.toUpperCase());

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
        {pretty} Wine Editor
      </h1>

      <div className="so-card overflow-x-auto">

        <table className="w-full text-sm">

          <thead className="border-b border-slate-700 text-slate-400">
            <tr>
              <th className="py-3 px-4 text-left">Wine</th>
              <th className="py-3 px-4 text-left">Producer</th>
              <th className="py-3 px-4 text-left">Region</th>
              <th className="py-3 px-4 text-left">Vintage</th>
              <th className="py-3 px-4 text-left">Menu</th>
            </tr>
          </thead>

          <tbody>

            {wines.map(wine => {

              const inMenu = wineInMenu(wine.id);

              return (
                <tr
                  key={wine.id}
                  className="border-b border-slate-800 hover:bg-slate-800/40"
                >

                  <td className="py-3 px-4 text-white">
                    {wine.name}
                  </td>

                  <td className="py-3 px-4 text-slate-400">
                    {wine.producer}
                  </td>

                  <td className="py-3 px-4 text-slate-400">
                    {wine.region}
                  </td>

                  <td className="py-3 px-4 text-slate-400">
                    {wine.vintage}
                  </td>

                  <td className="py-3 px-4">

                    {inMenu ? (

                      <button
                        onClick={() => removeWineFromMenu(wine.id)}
                        className="px-3 py-1 bg-red-500 text-white rounded"
                      >
                        Remove
                      </button>

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