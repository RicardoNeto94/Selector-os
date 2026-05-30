export const dynamic = "force-dynamic";

import { createClient } from "@supabase/supabase-js";

import WineClientView from "./WineClientView";

export default async function Page({
  params
}) {

  const { slug } = await params;

  /* =======================================================
     SUPABASE
  ======================================================= */

  const supabase =
    createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

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

  console.log(
    "MENU:",
    menu
  );

  if (
    menuError ||
    !menu
  ) {

    console.error(
      "MENU ERROR:",
      menuError
    );

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
     WINES
  ======================================================= */

  const {
    data: winesData = [],
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

  if(winesError){

    console.error(
      "WINES ERROR:",
      winesError
    );

  }

  console.log(
    "WINES:",
    winesData.length
  );

  const winesMap = {};

(winesData || []).forEach(wine => {

  winesMap[
    String(wine.id)
      .trim()
      .toLowerCase()
  ] = wine;

});

  /* =======================================================
     INVENTORY
  ======================================================= */

  let inventoryMap = {};

  if(menu.location_id){

    const {
      data: inventoryRows = [],
      error: inventoryError
    } = await supabase
      .from("wine_inventory")
      .select(`
        wine_id,
        quantity,
        location_id
      `)
      .eq(
        "location_id",
        menu.location_id
      );

    if(inventoryError){

      console.error(
        "INVENTORY ERROR:",
        inventoryError
      );

    }

    console.log(
      "INVENTORY:",
      inventoryRows.length
    );

    inventoryRows.forEach(row => {

      inventoryMap[
        String(row.wine_id)
      ] = Number(
        row.quantity || 0
      );

    });

  }

  /* =======================================================
     FINAL ITEMS
  ======================================================= */

/* =======================================================
   FINAL ITEMS
======================================================= */

const finalItems =
  Object.entries(inventoryMap)
    .map(([wineId,quantity]) => {

      const wine =
        winesMap[
          String(wineId)
            .trim()
            .toLowerCase()
        ];

      if(!wine){
        return null;
      }

      if(quantity <= 0){
        return null;
      }

      return {

        id: wineId,

        wine_id: wineId,

        quantity,

        wines: wine

      };

    })
    .filter(Boolean);

console.log(
  "FINAL WINES:",
  finalItems.length
);

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
      items={finalItems}
    />

  </main>

);

}