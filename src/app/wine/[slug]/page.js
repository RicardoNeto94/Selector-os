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

function scopeToMenuTenant(query, menu) {
  let scoped = query.eq("organization_id", menu.organization_id);
  if (menu.property_id) scoped = scoped.eq("property_id", menu.property_id);
  return scoped;
}

export default async function Page({ params }) {
  const { slug } = await params;

  /* =======================================================
     SUPABASE
  ======================================================= */

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
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

  let experienceQuery = supabase
    .from("guest_experiences")
    .select("name,slug,renderer_key,theme,availability_rules,is_published")
    .eq("slug", slug);
  experienceQuery = menu.organization_id
    ? experienceQuery.eq("organization_id", menu.organization_id)
    : experienceQuery.is("organization_id", null);
  const { data: experience, error: experienceError } = await experienceQuery.maybeSingle();

  if (experienceError) {
    console.log("WINE EXPERIENCE ERROR:", JSON.stringify(experienceError));
  }

  if (experience?.renderer_key === "wine_standard" && !experience.is_published) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f1e9] text-[#17221f] px-6 text-center">
        <div><div className="text-xs tracking-[0.28em] mb-5">VAXERON · PRIVATE PREVIEW</div><h1 className="text-4xl font-serif mb-3">This wine list is being prepared.</h1><p className="opacity-60">Please return when the venue has published its selection.</p></div>
      </div>
    );
  }

  /* =======================================================
     VENUE LOCATIONS
  ======================================================= */

  let locationsQuery = supabase
    .from("wine_locations")
    .select(`
      id,
      name,
      wine_menu_id
    `)
    .eq("wine_menu_id", menu.id);
  locationsQuery = scopeToMenuTenant(locationsQuery, menu);
  const {
    data: locations = [],
    error: locationsError,
  } = await locationsQuery;

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

  let pairingQuery = supabase
    .from("sake_pairings")
    .select("*")
    .eq("wine_menu_id", menu.id)
    .eq("status", "published")
    .order("position", {
      ascending: true,
    });
  pairingQuery = scopeToMenuTenant(pairingQuery, menu);
  const {
    data: pairingRows = [],
    error: pairingError,
  } = await pairingQuery;

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

    let stageQuery = supabase
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
    stageQuery = scopeToMenuTenant(stageQuery, menu);
    const {
      data: stageRows = [],
      error: stageError,
    } = await stageQuery;

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

  let menuItemsQuery = supabase
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
  menuItemsQuery = scopeToMenuTenant(menuItemsQuery, menu);
  const {
    data: menuItems = [],
    error: menuItemsError,
  } = await menuItemsQuery;

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

  const menuItemIds = (menuItems || []).map((item) => item.id).filter(Boolean);
  const servingsByMenuItem = {};
  for (const batch of chunkArray(menuItemIds, QUERY_BATCH_SIZE)) {
    let servingsQuery = supabase
      .from("wine_menu_servings")
      .select("id,wine_menu_item_id,compucash_product_id,serving_cl,price,is_active")
      .in("wine_menu_item_id", batch)
      .eq("is_active", true)
      .order("serving_cl", { ascending: true });
    servingsQuery = scopeToMenuTenant(servingsQuery, menu);
    const { data: servingRows = [], error } = await servingsQuery;
    if (error) console.log("WINE SERVINGS ERROR:", JSON.stringify(error));
    for (const serving of servingRows) {
      servingsByMenuItem[serving.wine_menu_item_id] = [
        ...(servingsByMenuItem[serving.wine_menu_item_id] || []),
        { ...serving, serving_cl: Number(serving.serving_cl), price: serving.price == null ? null : Number(serving.price) },
      ];
    }
  }

  const wineIdBatches = chunkArray(
    wineIds,
    QUERY_BATCH_SIZE
  );

  /* =======================================================
     WINES — BATCHED
  ======================================================= */

  let winesData = [];

  for (const batch of wineIdBatches) {
    let winesQuery = supabase
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
    winesQuery = scopeToMenuTenant(winesQuery, menu);
    const {
      data = [],
      error,
    } = await winesQuery;

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
    const { data: inventoryRows = [], error } = await supabase.rpc(
      "get_public_wine_menu_availability",
      { p_menu_id: menu.id }
    );
    if (error) console.log("PUBLIC INVENTORY ERROR:", JSON.stringify(error));
    (inventoryRows || []).forEach((row) => {
      inventoryMap[String(row.wine_id)] = Number(row.quantity || 0);
    });
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
        servings: servingsByMenuItem[menuItem.id] || [],

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
  experience={experience}
/>
    </main>
  );
}
