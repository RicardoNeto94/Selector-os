import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const QUERY_BATCH_SIZE = 100;

function chunkArray(array, size) {
  const chunks = [];

  for (
    let index = 0;
    index < array.length;
    index += size
  ) {
    chunks.push(array.slice(index, index + size));
  }

  return chunks;
}

export async function GET(request, { params }) {
  const { slug } = await params;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const {
    data: menu,
    error: menuError,
  } = await supabase
    .from("wine_menus")
    .select("*")
    .eq("slug", slug)
    .single();

  if (menuError || !menu) {
    return NextResponse.json(
      { error: "Menu not found" },
      { status: 404 }
    );
  }

  const {
    data: locations = [],
  } = await supabase
    .from("wine_locations")
    .select(`
      id,
      name,
      wine_menu_id
    `)
    .eq("wine_menu_id", menu.id);

  const locationIds = (locations || [])
    .map((location) => location.id)
    .filter(Boolean);

  const {
    data: pairingRows = [],
  } = await supabase
    .from("sake_pairings")
    .select("*")
    .eq("wine_menu_id", menu.id)
    .eq("status", "published")
    .order("position", {
      ascending: true,
    });

  let sakePairings = [];

  if (pairingRows.length > 0) {
    const pairingIds = pairingRows
      .map((pairing) => pairing.id)
      .filter(Boolean);

    const {
      data: stageRows = [],
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

  const {
    data: menuItems = [],
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

  const wineIds = [
    ...new Set(
      menuItems
        .map((item) => item.wine_id)
        .filter(Boolean)
    ),
  ];

  const wineIdBatches = chunkArray(
    wineIds,
    QUERY_BATCH_SIZE
  );

  let winesData = [];

  for (const batch of wineIdBatches) {
    const {
      data = [],
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

    winesData.push(...data);
  }

  const winesMap = {};

  winesData.forEach((wine) => {
    winesMap[String(wine.id)] = wine;
  });

  const inventoryMap = {};

  if (locationIds.length > 0) {
    for (const batch of wineIdBatches) {
      const {
        data: inventoryRows = [],
      } = await supabase
        .from("wine_inventory")
        .select(`
          wine_id,
          quantity,
          location_id
        `)
        .in("location_id", locationIds)
        .in("wine_id", batch);

      inventoryRows.forEach((row) => {
        const wineId = String(row.wine_id);

        inventoryMap[wineId] =
          Number(inventoryMap[wineId] || 0) +
          Number(row.quantity || 0);
      });
    }
  }

  const finalItems = menuItems
    .map((menuItem) => {
      const wineId = String(menuItem.wine_id);

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
        position: menuItem.position ?? 0,
        service_type: serviceType,
        glass_price: glassPrice,
        price_override: bottlePrice,
        description: menuItem.description || "",

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

  return NextResponse.json({
    menu,
    items: finalItems,
    sakePairings,
  });
}