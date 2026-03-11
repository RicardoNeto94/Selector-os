export const dynamic = "force-dynamic";

import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export default async function WineGuestPage({ params }) {

  const supabase = createServerComponentClient({ cookies });

  const { restaurant, menu } = params;

  /* -------------------------------- */
  /* LOAD RESTAURANT                  */
  /* -------------------------------- */

  const { data: restaurantData, error: restaurantError } = await supabase
    .from("restaurants")
    .select("*")
    .eq("slug", restaurant)
    .maybeSingle();

  if (!restaurantData || restaurantError) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        Restaurant not found
      </div>
    );
  }

  /* -------------------------------- */
  /* LOAD WINE MENU                   */
  /* -------------------------------- */

  const { data: wineMenu, error: menuError } = await supabase
    .from("wine_menus")
    .select("*")
    .eq("slug", menu)
    .eq("restaurant_id", restaurantData.id)
    .maybeSingle();

  if (!wineMenu || menuError) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        Wine menu not found
      </div>
    );
  }

  /* -------------------------------- */
  /* LOAD WINES                       */
  /* -------------------------------- */

  const { data: wineItems, error: winesError } = await supabase
    .from("wine_menu_items")
    .select(`
      wine_id,
      wines (*)
    `)
    .eq("wine_menu_id", wineMenu.id);

  const wines = wineItems?.map(item => item.wines) || [];

  /* -------------------------------- */
  /* PAGE                             */
  /* -------------------------------- */

  return (
    <div className="min-h-screen bg-slate-950 text-white p-10">

      <h1 className="text-3xl font-semibold mb-10">
        {restaurantData.name} — {wineMenu.name}
      </h1>

      {wines.length === 0 && (
        <div className="text-slate-400 mb-8">
          No wines in this menu yet.
        </div>
      )}

      <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">

        {wines.map((wine) => (

          <div key={wine.id} className="so-card p-6">

            <div className="text-lg font-semibold">
              {wine.name}
            </div>

            <div className="text-sm text-slate-400 mt-1">
              {wine.region} · {wine.country}
            </div>

            <div className="text-sm text-slate-400">
              {wine.vintage} · {wine.size}
            </div>

            <div className="mt-3">
              €{wine.price}
            </div>

          </div>

        ))}

      </div>

    </div>
  );
}
