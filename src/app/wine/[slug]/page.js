export const dynamic = "force-dynamic";

import { createClient } from "@supabase/supabase-js";

import WineClientView from "./WineClientView";

const QUERY_BATCH_SIZE = 100;

function chunkArray(array, size) {
  const chunks = [];

  for (
    let index = 0;
    index < array.length;
    index += size
  ) {
    chunks.push(
      array.slice(index, index + size)
    );
  }

  return chunks;
}

export default async function Page({ params }) {
  const { slug } = await params;

  /* =======================================================
     SUPABASE
  ======================================================= */

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  /* =======================================================
     MENU
  ======================================================= */

  const {
    data: menu,
    error: menuError,
  } = await supabase
    .from("wine_menus")
    .select("*")
    .eq("slug", slug)
    .single();

  if (menuError || !menu) {
    console.log(
      "MENU ERROR:",
      JSON.stringify(menuError)
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
     VENUE LOCATIONS
  ======================================================= */

  const {
    data: locations = [],
    error: locationsError,
  } = await supabase
    .from("wine_locations")
    .select(`
      id,
      name,
      wine_menu_id
    `)
    .eq("wine_menu_id", menu.id);

  if (locationsError) {
    console.log(
      "LOCATIONS ERROR:",
      JSON.stringify(locationsError)
    );
  }

  const locationIds = (locations || [])
    .map((location) => location.id)
    .filter(Boolean);

  /* =======================================================
     PUBLISHED SAKE PAIRINGS
  ======================================================= */

  const {
    data: pairingRows = [],
    error: pairingError,
  } = await supabase
    .from("sake_pairings")
    .select("*")
    .eq("wine_menu_id", menu.id)
    .eq("status", "published")
    .order("position", {
      ascending: true,
    });

  if (pairingError) {
    console.log(
      "SAKE PAIRINGS ERROR:",
      JSON.stringify(pairingError)
    );
  }

  let sakePairings = [];

  if ((pairingRows || []).length > 0) {
    const pairingIds = pairingRows
      .map((pairing) => pairing.id)
      .filter(Boolean);

    const {
      data: stageRows = [],
      error: stageError,
    } = await supabase
      .from("sake_pairing_stages")
      .select(`
        id,
        pairing_id,
        sake_wine_id,
        stage_number,
        stage_name,
        description,
        position,
        wines (
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
      .in("pairing_id", pairingIds)
      .order("position", {
        ascending: true,
      });

    if (stageError) {
      console.log(
        "SAKE PAIRING STAGES ERROR:",
        JSON.stringify(stageError)
      );
    }

    sakePairings = pairingRows.map(
      (pairing) => ({
        ...pairing,

        stages: (stageRows || [])
          .filter(
            (stage) =>
              stage.pairing_id === pairing.id
          )
          .sort(
            (a, b) =>
              Number(a.position || 0) -
              Number(b.position || 0)
          ),
      })
    );
  }

  /* =======================================================
     LIVE MENU ITEMS
  ======================================================= */

  const {
    data: menuItems = [],
    error: menuItemsError,
  } = await supabase
    .from("wine_menu_items")
    .select(`
      id,
      wine_id,
      position,
      service_type,
      glass_price,
      description,
      price_override
    `)
    .eq("wine_menu_id", menu.id)
    .order("position", {
      ascending: true,
    });

  if (menuItemsError) {
    console.log(
      "MENU ITEMS ERROR:",
      JSON.stringify(menuItemsError)
    );
  }

  /* =======================================================
     WINE IDS
  ======================================================= */

  const wineIds = [
    ...new Set(
      (menuItems || [])
        .map((item) => item.wine_id)
        .filter(Boolean)
    ),
  ];

  const wineIdBatches = chunkArray(
    wineIds,
    QUERY_BATCH_SIZE
  );

  /* =======================================================
     WINES — BATCHED
  ======================================================= */

  let winesData = [];

  for (const batch of wineIdBatches) {
    const {
      data = [],
      error,
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
      `)
      .in("id", batch);

    if (error) {
      console.log(
        "WINES BATCH ERROR:",
        JSON.stringify(error)
      );

      continue;
    }

    winesData.push(...data);
  }

  const winesMap = {};

  winesData.forEach((wine) => {
    winesMap[String(wine.id)] = wine;
  });

  /* =======================================================
     VENUE INVENTORY — BATCHED
  ======================================================= */

  const inventoryMap = {};

  if (locationIds.length > 0) {
    for (const batch of wineIdBatches) {
      const {
        data: inventoryRows = [],
        error,
      } = await supabase
        .from("wine_inventory")
        .select(`
          wine_id,
          quantity,
          location_id
        `)
        .in("location_id", locationIds)
        .in("wine_id", batch);

      if (error) {
        console.log(
          "INVENTORY BATCH ERROR:",
          JSON.stringify(error)
        );

        continue;
      }

      inventoryRows.forEach((row) => {
        const wineId = String(
          row.wine_id
        );

        inventoryMap[wineId] =
          Number(
            inventoryMap[wineId] || 0
          ) +
          Number(row.quantity || 0);
      });
    }
  }

  /* =======================================================
     FINAL GUEST ITEMS
  ======================================================= */

  const finalItems = (menuItems || [])
    .map((menuItem) => {
      const wineId = String(
        menuItem.wine_id
      );

      const wine = winesMap[wineId];

      if (!wine) {
        return null;
      }

      const quantity = Number(
        inventoryMap[wineId] || 0
      );

      if (quantity <= 0) {
        return null;
      }

      const serviceType =
        menuItem.service_type || "bottle";

      const glassPrice =
        menuItem.glass_price !== null &&
        menuItem.glass_price !== undefined
          ? Number(menuItem.glass_price)
          : null;

      const bottlePrice =
        menuItem.price_override !== null &&
        menuItem.price_override !== undefined
          ? Number(menuItem.price_override)
          : wine.price !== null &&
            wine.price !== undefined
          ? Number(wine.price)
          : null;

      return {
        id: menuItem.id,

        wine_id: wineId,

        quantity,

        position:
          menuItem.position ?? 0,

        service_type: serviceType,

        glass_price: glassPrice,

        price_override: bottlePrice,

        description:
          menuItem.description || "",

        wines: {
          ...wine,

          price: bottlePrice,

          description:
            menuItem.description ||
            wine.description ||
            "",
        },
      };
    })
    .filter(Boolean);

  /* =======================================================
     DEBUG
  ======================================================= */

  console.log("WINE GUEST DEBUG", {
    slug,
    menuId: menu?.id,
    locationsCount:
      locations?.length || 0,
    locationIds,
    menuItemsCount:
      menuItems?.length || 0,
    wineIdsCount: wineIds.length,
    batches: wineIdBatches.length,
    winesCount: winesData.length,
    inventoryWineCount:
      Object.keys(inventoryMap).length,
    positiveInventoryCount:
      Object.values(
        inventoryMap
      ).filter(
        (quantity) =>
          Number(quantity) > 0
      ).length,
    finalItemsCount:
      finalItems.length,
  });

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <main className="min-h-screen w-full">
      <WineClientView
  menu={menu}
  items={finalItems}
  sakePairings={sakePairings}
/>
    </main>
  );
}