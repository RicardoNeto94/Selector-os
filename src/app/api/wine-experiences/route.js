import { NextResponse } from "next/server";

import { requireAdministrator } from "@/lib/server/requireAdministrator";
import { scopeTenantQuery, tenantWriteFields } from "@/lib/server/tenantContext";

const HEX = /^#[0-9a-f]{6}$/i;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const TEMPLATES = new Set(["editorial", "minimal", "midnight"]);
const FONTS = new Set(["editorial", "modern", "classic"]);
const DENSITIES = new Set(["relaxed", "compact"]);
const CURRENCIES = new Set(["EUR", "USD", "GBP", "SEK", "NOK", "DKK", "CHF"]);
const BESPOKE_SLUGS = new Set(["shang-shi-wine", "koyo-wine"]);

const DEFAULT_THEME = {
  template: "editorial",
  primaryColor: "#173a32",
  backgroundColor: "#f4f1e9",
  textColor: "#17221f",
  fontPairing: "editorial",
  logoUrl: "",
  currency: "EUR",
  density: "relaxed",
  welcomeMessage: "A cellar selected for this moment.",
  showProducer: true,
  showRegion: true,
  showVintage: true,
  showDescription: true,
};

const DEFAULT_RULES = {
  minimum_stock: 0,
  hide_zero_stock: true,
  auto_include_available: true,
  show_bottle: true,
  show_btg: true,
  show_exact_stock: false,
};

function cleanText(value, max = 120) {
  return String(value || "").trim().slice(0, max);
}

function cleanLogoUrl(value) {
  const logoUrl = cleanText(value, 500);
  if (!logoUrl || logoUrl.startsWith("/") || /^https:\/\//i.test(logoUrl)) return logoUrl;
  return "";
}

function parseTheme(input = {}) {
  const theme = { ...DEFAULT_THEME, ...input };
  if (!TEMPLATES.has(theme.template)) throw new Error("Invalid wine-list template.");
  if (!FONTS.has(theme.fontPairing)) throw new Error("Invalid font pairing.");
  if (!DENSITIES.has(theme.density)) throw new Error("Invalid display density.");
  for (const key of ["primaryColor", "backgroundColor", "textColor"]) {
    if (!HEX.test(theme[key])) throw new Error(`Invalid ${key}.`);
  }
  return {
    template: theme.template,
    primaryColor: theme.primaryColor.toLowerCase(),
    backgroundColor: theme.backgroundColor.toLowerCase(),
    textColor: theme.textColor.toLowerCase(),
    fontPairing: theme.fontPairing,
    logoUrl: cleanLogoUrl(theme.logoUrl),
    currency: CURRENCIES.has(String(theme.currency || "").toUpperCase())
      ? String(theme.currency).toUpperCase()
      : DEFAULT_THEME.currency,
    density: theme.density,
    welcomeMessage: cleanText(theme.welcomeMessage, 180),
    showProducer: theme.showProducer !== false,
    showRegion: theme.showRegion !== false,
    showVintage: theme.showVintage !== false,
    showDescription: theme.showDescription !== false,
  };
}

function parseRules(input = {}) {
  return {
    ...DEFAULT_RULES,
    hide_zero_stock: true,
    minimum_stock: 0,
    auto_include_available: input.auto_include_available !== false,
    show_bottle: input.show_bottle !== false,
    show_btg: input.show_btg !== false,
    show_exact_stock: false,
  };
}

async function loadWorkspace(admin, tenant) {
  const locationQuery = admin
    .from("wine_locations")
    .select("id,name,slug,location_type,wine_menu_id,restaurant_id,is_active")
    .eq("is_active", true)
    .order("name");
  const menuQuery = admin
    .from("wine_menus")
    .select("id,name,slug,is_active,location_id,restaurant_id,theme_primary_color,theme_secondary_color,background_style,card_style,custom_logo_url,logo_url")
    .order("created_at", { ascending: false });
  const experienceQuery = admin
    .from("guest_experiences")
    .select("id,venue_location_id,name,slug,hostname,renderer_key,theme,availability_rules,is_published,updated_at")
    .order("updated_at", { ascending: false });
  const itemQuery = admin
    .from("wine_menu_items")
    .select("id,wine_menu_id,wine_id,service_type,price_override,glass_price,description,wines(price)");
  const inventoryQuery = admin
    .from("wine_inventory")
    .select("wine_id,location_id,quantity")
    .gt("quantity", 0);

  const [locationsResult, menusResult, experiencesResult, itemsResult, inventoryResult] = await Promise.all([
    scopeTenantQuery(locationQuery, tenant),
    scopeTenantQuery(menuQuery, tenant),
    scopeTenantQuery(experienceQuery, tenant),
    scopeTenantQuery(itemQuery, tenant),
    scopeTenantQuery(inventoryQuery, tenant),
  ]);
  for (const result of [locationsResult, menusResult, experiencesResult, itemsResult, inventoryResult]) {
    if (result.error) throw result.error;
  }

  const menusById = new Map((menusResult.data || []).map((menu) => [menu.id, menu]));
  const experiencesByLocation = new Map(
    (experiencesResult.data || [])
      .filter((experience) => experience.venue_location_id)
      .map((experience) => [experience.venue_location_id, experience])
  );
  const itemsByMenu = new Map();
  for (const item of itemsResult.data || []) {
    if (!itemsByMenu.has(item.wine_menu_id)) itemsByMenu.set(item.wine_menu_id, []);
    itemsByMenu.get(item.wine_menu_id).push(item);
  }
  const availableWineIdsByLocation = new Map();
  for (const row of inventoryResult.data || []) {
    if (!availableWineIdsByLocation.has(row.location_id)) availableWineIdsByLocation.set(row.location_id, new Set());
    availableWineIdsByLocation.get(row.location_id).add(row.wine_id);
  }

  return (locationsResult.data || []).map((location) => {
    const menu = menusById.get(location.wine_menu_id) || null;
    const experience = experiencesByLocation.get(location.id) || null;
    const slug = experience?.slug || menu?.slug || location.slug;
    const menuItems = menu ? (itemsByMenu.get(menu.id) || []) : [];
    const availableWineIds = availableWineIdsByLocation.get(location.id) || new Set();
    const contentWineIds = new Set(menuItems.map((item) => item.wine_id));
    const availableCount = [...contentWineIds].filter((wineId) => availableWineIds.has(wineId)).length;
    const missingPriceCount = menuItems.filter((item) => {
      const bottleMissing = ["bottle", "both"].includes(item.service_type || "bottle") && item.price_override == null && item.wines?.price == null;
      const glassMissing = ["glass", "both"].includes(item.service_type) && item.glass_price == null;
      return bottleMissing || glassMissing;
    }).length;
    return {
      location,
      menu,
      experience,
      slug,
      bespoke: BESPOKE_SLUGS.has(slug) || (experience?.renderer_key === "wine" && BESPOKE_SLUGS.has(menu?.slug)),
      theme: { ...DEFAULT_THEME, ...(experience?.theme || {}) },
      availabilityRules: { ...DEFAULT_RULES, ...(experience?.availability_rules || {}) },
      readiness: {
        contentCount: contentWineIds.size,
        availableCount,
        locationStockCount: availableWineIds.size,
        missingPriceCount,
        publicPath: slug ? `/wine/${slug}` : null,
      },
    };
  });
}

export async function GET(request) {
  try {
    const access = await requireAdministrator(request);
    if (access.error) return NextResponse.json({ error: access.error.message }, { status: access.error.status });
    const lists = await loadWorkspace(access.admin, access.tenant);
    return NextResponse.json({ lists, defaults: { theme: DEFAULT_THEME, availabilityRules: DEFAULT_RULES } });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Wine lists could not be loaded." }, { status: 500 });
  }
}

export async function POST(request) {
  const access = await requireAdministrator(request);
  if (access.error) return NextResponse.json({ error: access.error.message }, { status: access.error.status });

  let createdMenuId = null;
  let locationId = null;
  try {
    const body = await request.json();
    const name = cleanText(body.name, 90);
    const slug = cleanText(body.slug, 100).toLowerCase();
    locationId = body.locationId;
    if (!name || !locationId || !SLUG.test(slug)) {
      return NextResponse.json({ error: "Name, venue and a valid URL slug are required." }, { status: 400 });
    }
    const theme = parseTheme(body.theme);
    const availabilityRules = parseRules(body.availabilityRules);

    let locationQuery = access.admin
      .from("wine_locations")
      .select("id,name,restaurant_id,wine_menu_id")
      .eq("id", locationId);
    locationQuery = scopeTenantQuery(locationQuery, access.tenant);
    const { data: location, error: locationError } = await locationQuery.maybeSingle();
    if (locationError) throw locationError;
    if (!location) return NextResponse.json({ error: "Venue was not found in this workspace." }, { status: 404 });
    if (location.wine_menu_id) {
      return NextResponse.json({ error: "This venue already has a wine list. Open it to customise the existing list." }, { status: 409 });
    }

    // `/wine/[slug]` is a global public route. A slug therefore has to be
    // unique across every tenant, even though the underlying rows remain
    // tenant-owned. Never scope this collision check to the active workspace.
    const [duplicateMenuResult, duplicateExperienceResult] = await Promise.all([
      access.admin.from("wine_menus").select("id").eq("slug", slug).limit(1).maybeSingle(),
      access.admin.from("guest_experiences").select("id").eq("slug", slug).limit(1).maybeSingle(),
    ]);
    if (duplicateMenuResult.error) throw duplicateMenuResult.error;
    if (duplicateExperienceResult.error) throw duplicateExperienceResult.error;
    if (duplicateMenuResult.data || duplicateExperienceResult.data) {
      return NextResponse.json({ error: "That public URL is already in use." }, { status: 409 });
    }

    const { data: menu, error: menuError } = await access.admin
      .from("wine_menus")
      .insert({
        ...tenantWriteFields(access.tenant),
        restaurant_id: location.restaurant_id,
        location_id: location.id,
        name,
        slug,
        is_active: true,
        theme_primary_color: theme.primaryColor,
        theme_secondary_color: theme.textColor,
        background_color: theme.backgroundColor,
        background_style: theme.template === "midnight" ? "dark" : "light",
        card_style: theme.template === "minimal" ? "minimal" : "glass",
        custom_logo_url: theme.logoUrl || null,
      })
      .select("id,name,slug")
      .single();
    if (menuError) throw menuError;
    createdMenuId = menu.id;

    let updateLocation = access.admin.from("wine_locations").update({ wine_menu_id: menu.id }).eq("id", location.id);
    updateLocation = scopeTenantQuery(updateLocation, access.tenant);
    const { error: updateError } = await updateLocation;
    if (updateError) throw updateError;

    let inventoryQuery = access.admin
      .from("wine_inventory")
      .select("wine_id,quantity,wines(price)")
      .eq("location_id", location.id)
      .gt("quantity", 0);
    inventoryQuery = scopeTenantQuery(inventoryQuery, access.tenant);
    const { data: inventoryRows = [], error: inventoryError } = await inventoryQuery;
    if (inventoryError) throw inventoryError;
    const uniqueWines = [...new Map(inventoryRows.map((row) => [row.wine_id, row])).values()];
    if (uniqueWines.length) {
      const { error: itemsError } = await access.admin.from("wine_menu_items").insert(
        uniqueWines.map((row, position) => ({
          ...tenantWriteFields(access.tenant),
          wine_menu_id: menu.id,
          wine_id: row.wine_id,
          position,
          service_type: "bottle",
          price_override: row.wines?.price == null ? null : Number(row.wines.price),
        }))
      );
      if (itemsError) throw itemsError;
    }

    const { error: experienceError } = await access.admin.from("guest_experiences").insert({
      ...tenantWriteFields(access.tenant),
      venue_location_id: location.id,
      name,
      slug,
      renderer_key: "wine_standard",
      theme,
      availability_rules: availabilityRules,
      is_published: body.isPublished === true,
    });
    if (experienceError) throw experienceError;

    return NextResponse.json({ success: true, menu, importedWines: uniqueWines.length }, { status: 201 });
  } catch (error) {
    if (createdMenuId) {
      await access.admin.from("wine_menu_items").delete().eq("wine_menu_id", createdMenuId);
      await access.admin.from("guest_experiences").delete().eq("venue_location_id", locationId).eq("renderer_key", "wine_standard");
      await access.admin.from("wine_locations").update({ wine_menu_id: null }).eq("id", locationId).eq("wine_menu_id", createdMenuId);
      await access.admin.from("wine_menus").delete().eq("id", createdMenuId);
    }
    return NextResponse.json({ error: error.message || "Wine list could not be created." }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const access = await requireAdministrator(request);
    if (access.error) return NextResponse.json({ error: access.error.message }, { status: access.error.status });
    const body = await request.json();
    const theme = parseTheme(body.theme);
    const availabilityRules = parseRules(body.availabilityRules);
    const name = cleanText(body.name, 90);

    let menuQuery = access.admin.from("wine_menus").select("id,slug,location_id").eq("id", body.menuId);
    menuQuery = scopeTenantQuery(menuQuery, access.tenant);
    const { data: menu, error: menuError } = await menuQuery.maybeSingle();
    if (menuError) throw menuError;
    if (!menu) return NextResponse.json({ error: "Wine list was not found in this workspace." }, { status: 404 });
    if (BESPOKE_SLUGS.has(menu.slug)) {
      return NextResponse.json({ error: "This is a bespoke Vaxeron experience. Its protected renderer is managed separately." }, { status: 409 });
    }

    let menuUpdate = access.admin.from("wine_menus").update({
      name,
      theme_primary_color: theme.primaryColor,
      theme_secondary_color: theme.textColor,
      background_color: theme.backgroundColor,
      background_style: theme.template === "midnight" ? "dark" : "light",
      card_style: theme.template === "minimal" ? "minimal" : "glass",
      custom_logo_url: theme.logoUrl || null,
    }).eq("id", menu.id);
    menuUpdate = scopeTenantQuery(menuUpdate, access.tenant);
    const { error: updateError } = await menuUpdate;
    if (updateError) throw updateError;

    let experienceQuery = access.admin.from("guest_experiences").select("id").eq("venue_location_id", body.locationId);
    experienceQuery = scopeTenantQuery(experienceQuery, access.tenant);
    const { data: experience, error: experienceLookupError } = await experienceQuery.maybeSingle();
    if (experienceLookupError) throw experienceLookupError;
    const payload = {
      name,
      renderer_key: "wine_standard",
      theme,
      availability_rules: availabilityRules,
      is_published: body.isPublished === true,
      updated_at: new Date().toISOString(),
    };
    if (experience) {
      let updateExperience = access.admin.from("guest_experiences").update(payload).eq("id", experience.id);
      updateExperience = scopeTenantQuery(updateExperience, access.tenant);
      const { error } = await updateExperience;
      if (error) throw error;
    } else {
      const { error } = await access.admin.from("guest_experiences").insert({
        ...tenantWriteFields(access.tenant),
        ...payload,
        venue_location_id: body.locationId,
        slug: menu.slug,
      });
      if (error) throw error;
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Wine list settings could not be saved." }, { status: 500 });
  }
}
