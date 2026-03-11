export const dynamic = "force-dynamic";

import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export default async function WineGuestPage({ params }) {

  const supabase = createServerComponentClient({ cookies });

  const { restaurant, menu } = params;

  const { data: restaurantData } = await supabase
    .from("restaurants")
    .select("*")
    .eq("slug", restaurant)
    .maybeSingle();

  const { data: wineMenu } = await supabase
    .from("wine_menus")
    .select("*")
    .eq("slug", menu)
    .eq("restaurant_id", restaurantData.id)
    .maybeSingle();

  const { data: wines } = await supabase
    .from("wine_menu_items")
    .select(`
      wine_id,
      wines (*)
    `)
    .eq("wine_menu_id", wineMenu.id);

  return (
    <div className="min-h-screen bg-slate-950 text-white p-10">

      <h1 className="text-3xl font-semibold mb-10">
        {restaurantData.name} — {wineMenu.name}
      </h1>

      <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">

        {wines?.map((item) => {

          const wine = item.wines;

          return (
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
          );
        })}

      </div>

    </div>
  );
}
