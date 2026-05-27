export const dynamic = "force-dynamic";

import {
  createServerComponentClient
} from "@supabase/auth-helpers-nextjs";

import { cookies } from "next/headers";

import WineClientView from "./WineClientView";

export default async function Page({
  params
}) {

  const { slug } = await params;

  const cookieStore =
    await cookies();

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
     LOCATION
  ======================================================= */

  let location = null;

  if (menu.location_id) {

    const {
      data: locationData
    } = await supabase
      .from("wine_locations")
      .select("*")
      .eq(
        "id",
        menu.location_id
      )
      .single();

    location =
      locationData;

  }

  /* =======================================================
   MENU WINES
======================================================= */

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
    position,
    wine_id
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

const winesMap =
  Object.fromEntries(

    (winesData || []).map(w => [
      w.id,
      w
    ])

  );

const safeItems =
  itemsError
    ? []
    : (rawItems || []).map(item => ({

        ...item,

        wines:
          winesMap[
            item.wine_id
          ] || null

      }));

  /* =======================================================
     INVENTORY
  ======================================================= */

  let inventoryMap = {};

  if (location) {

    const {
      data: inventoryRows
    } = await supabase
      .from("wine_inventory")
      .select(`
        wine_id,
        quantity
      `)
      .eq(
        "location_id",
        location.id
      );

    inventoryMap =
      Object.fromEntries(
        (inventoryRows || [])
          .map(row => [
            row.wine_id,
            row.quantity
          ])
      );

  }

  /* =======================================================
     MERGE INVENTORY
  ======================================================= */

  /* =======================================================
   FILTER + MERGE INVENTORY
======================================================= */

const inventoryItems =
  safeItems
    .filter(item => {

      const quantity =
        Number(
          inventoryMap[
            item.wine_id
          ] || 0
        );

      return quantity > 0;

    })
    .map(item => ({

      ...item,

      quantity:
        Number(
          inventoryMap[
            item.wine_id
          ] || 0
        )

    }));

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
        items={inventoryItems}
      />

    </main>

  );

}