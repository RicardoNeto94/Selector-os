export const dynamic = "force-dynamic";

import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

import WineClientView from "./WineClientView";
export default async function Page({ params }) {

  const cookieStore = await cookies();

  const supabase =
    createServerComponentClient({
      cookies: () => cookieStore
    });

const slug = "shang-shi-wine";
  // MENU

  const { data: menu, error: menuError } =
    await supabase
      .from("wine_menus")
      .select("*")
      .eq("slug", slug)
      .single();

  if (menuError || !menu) {

    console.log(menuError);

    return (
      <div className="
        min-h-screen
        flex
        items-center
        justify-center
        bg-black
        text-white
      ">
        Menu not found
      </div>
    );

  }

  // WINES

  const { data: items, error: itemsError } =
    await supabase
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
      .order("position", {
        ascending: true
      });

  console.log(items);

  const safeItems =
    itemsError
      ? []
      : items || [];

  return (

    <main
      className="min-h-screen w-full"
      style={{
        background:
          "linear-gradient(180deg, #003223 0%, #001a12 100%)"
      }}
    >

      <div className="
        max-w-5xl
        mx-auto
        px-6
        py-10
      ">

        {/* HEADER */}

        <div className="
          text-center
          text-white
          mb-10
        ">

          <img
            src="/shangshi-logo.png"
            className="h-20 mx-auto mb-4"
          />

          <p className="
            tracking-[0.3em]
            text-sm
            opacity-80
          ">
            WINE SELECTION
          </p>

        </div>

        {/* CONTENT */}

        <WineClientView
          menu={menu}
          items={safeItems}
        />

      </div>

    </main>

  );

}