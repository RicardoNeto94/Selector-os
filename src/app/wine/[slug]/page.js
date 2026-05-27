export const dynamic = "force-dynamic";

import {
  createServerComponentClient
} from "@supabase/auth-helpers-nextjs";

import { cookies } from "next/headers";

import WineClientView from "./WineClientView";

export default async function Page({
  params
}) {

  const { slug } = params;

  const cookieStore =
    cookies();

  const supabase =
    createServerComponentClient({
      cookies: () => cookieStore
    });

  /* =======================================================
     MENU
  ======================================================= */

  const {
    data: menu,
    error: menuError
  } = await supabase
    .from("wine_menus")
    .select("*")
    .eq("slug", slug)
    .single();

  if (
    menuError ||
    !menu
  ) {

    return (

      <div
        className="
        min-h-screen
        flex
        items-center
        justify-center
        bg-black
        text-white
      "
      >

        Menu not found

      </div>

    );

  }

  /* =======================================================
     MENU WINES
  ======================================================= */

  const {
    data: rawItems,
    error: itemsError
  } = await supabase
    .from("wine_menu_items")
    .select(`
      id,
      wine_id,
      position
    `)
    .eq(
      "wine_menu_id",
      menu.id
    )
    .order(
      "position",
      {
        ascending:true
      }
    );

  const {
    data: winesData,
    error: winesError
  } = await supabase
    .from("wines")
    .select(`
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
    `);

  const winesMap = {};

  (winesData || []).forEach(wine => {

    winesMap[
      String(wine.id)
    ] = wine;

  });

  const safeItems =
    (rawItems || [])
      .map(item => ({

        ...item,

        wines:
          winesMap[
            String(item.wine_id)
          ] || null

      }))
      .filter(item => item.wines);

  /* =======================================================
     RENDER
  ======================================================= */

  return (

    <main
      className="
      min-h-screen
      w-full
    "
    >

      <WineClientView
        menu={menu}
        items={safeItems}
      />

    </main>

  );

}