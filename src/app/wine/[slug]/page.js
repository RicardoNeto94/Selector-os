export const dynamic = "force-dynamic";

import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import WineClientView from "./WineClientView";

export default async function Page({ params }) {
  const supabase = createServerComponentClient({ cookies });
  const { slug } = params;

  // 🔹 Get wine menu
  const { data: menu, error: menuError } = await supabase
    .from("wine_menus")
    .select("*")
    .eq("slug", slug)
    .single();

  if (menuError || !menu) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        Menu not found
      </div>
    );
  }

  // 🔹 Get items
  const { data: items, error: itemsError } = await supabase
    .from("wine_menu_items")
    .select(`
      id,
      position,
      wine_id,
      wines:wine_id (
        id,
        name,
        producer,
        country,
        region,
        subregion,
        wine_type,
        grapes,
        vintage,
        price,
        description
      )
    `)
    .eq("wine_menu_id", menu.id)
    .order("position", { ascending: true });

  const safeItems = itemsError ? [] : items || [];

  return (
    <main
      className="min-h-screen flex justify-center"
      style={{
        background: "linear-gradient(180deg, #003223 0%, #001a12 100%)"
      }}
    >
      <div className="w-full max-w-md">

        {/* HEADER */}
        <div className="text-center pt-10 text-white">
          <img src="/shangshi-logo.png" className="h-16 mx-auto mb-4" />
          <p className="tracking-[0.3em] text-xs opacity-80">
            WINE SELECTION
          </p>
        </div>

        {/* CONTENT */}
        <div className="px-4 pb-16">
          <WineClientView menu={menu} items={safeItems} />
        </div>

      </div>
    </main>
  );
}