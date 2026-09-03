import { NextResponse } from "next/server";

import { requireAdministrator } from "@/lib/server/requireAdministrator";
import { scopeTenantQuery, tenantWriteFields } from "@/lib/server/tenantContext";
import { fetchAllRows } from "@/lib/supabase/fetchAllRows";
import { positiveBottleQuantity } from "@/lib/wineInventory";

export const dynamic = "force-dynamic";

async function findMenu(admin, tenant, slug) {
  let query = admin
    .from("wine_menus")
    .select("id,name,slug,location_id,restaurant_id,is_active")
    .eq("slug", slug);
  query = scopeTenantQuery(query, tenant);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data;
}

export async function GET(request, { params }) {
  try {
    const access = await requireAdministrator(request);
    if (access.error) return NextResponse.json({ error: access.error.message }, { status: access.error.status });
    const { slug } = await params;
    const menu = await findMenu(access.admin, access.tenant, slug);
    if (!menu) return NextResponse.json({ error: "Wine list was not found in this workspace." }, { status: 404 });

    const scope = (query) => scopeTenantQuery(query, access.tenant);
    const [wines, items, inventoryRows] = await Promise.all([
      fetchAllRows(access.admin, "wines", "id,name,producer,vintage,wine_type,country,region,size,price,is_active", (query) => scope(query.eq("is_active", true).order("name"))),
      fetchAllRows(access.admin, "wine_menu_items", "id,wine_menu_id,wine_id,position,service_type,price_override,glass_price,description", (query) => scope(query.eq("wine_menu_id", menu.id).order("position"))),
      menu.location_id
        ? fetchAllRows(access.admin, "wine_inventory", "wine_id,quantity", (query) => scope(query.eq("location_id", menu.location_id)))
        : [],
    ]);

    const stockByWine = new Map();
    for (const row of inventoryRows) {
      stockByWine.set(row.wine_id, (stockByWine.get(row.wine_id) || 0) + positiveBottleQuantity(row.quantity));
    }

    return NextResponse.json({
      menu,
      wines: wines.map((wine) => ({ ...wine, stock: stockByWine.get(wine.id) || 0 })),
      items,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Wine-list content could not be loaded." }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const access = await requireAdministrator(request);
    if (access.error) return NextResponse.json({ error: access.error.message }, { status: access.error.status });
    const { slug } = await params;
    const menu = await findMenu(access.admin, access.tenant, slug);
    if (!menu) return NextResponse.json({ error: "Wine list was not found in this workspace." }, { status: 404 });

    const body = await request.json();
    const action = String(body.action || "");
    const scope = (query) => scopeTenantQuery(query, access.tenant);

    if (action === "add") {
      let wineQuery = access.admin.from("wines").select("id").eq("id", body.wineId).eq("is_active", true);
      wineQuery = scope(wineQuery);
      const { data: wine, error: wineError } = await wineQuery.maybeSingle();
      if (wineError) throw wineError;
      if (!wine) return NextResponse.json({ error: "Wine was not found in this workspace." }, { status: 404 });

      let existingQuery = access.admin.from("wine_menu_items").select("id").eq("wine_menu_id", menu.id).eq("wine_id", wine.id);
      existingQuery = scope(existingQuery);
      const { data: existing, error: existingError } = await existingQuery.maybeSingle();
      if (existingError) throw existingError;
      if (existing) return NextResponse.json({ success: true, item: existing });

      let positionQuery = access.admin.from("wine_menu_items").select("position").eq("wine_menu_id", menu.id).order("position", { ascending: false }).limit(1);
      positionQuery = scope(positionQuery);
      const { data: lastRows = [], error: positionError } = await positionQuery;
      if (positionError) throw positionError;
      const { data: item, error } = await access.admin.from("wine_menu_items").insert({
        ...tenantWriteFields(access.tenant),
        wine_menu_id: menu.id,
        wine_id: wine.id,
        position: Number(lastRows[0]?.position || 0) + 1,
        service_type: "bottle",
        price_override: null,
        glass_price: null,
        description: "",
      }).select("id,wine_menu_id,wine_id,position,service_type,price_override,glass_price,description").single();
      if (error) throw error;
      return NextResponse.json({ success: true, item });
    }

    let itemQuery = access.admin.from("wine_menu_items").select("id,wine_menu_id,wine_id").eq("id", body.itemId).eq("wine_menu_id", menu.id);
    itemQuery = scope(itemQuery);
    const { data: item, error: itemError } = await itemQuery.maybeSingle();
    if (itemError) throw itemError;
    if (!item) return NextResponse.json({ error: "Menu item was not found in this workspace." }, { status: 404 });

    if (action === "remove") {
      let removeQuery = access.admin.from("wine_menu_items").delete().eq("id", item.id).eq("wine_menu_id", menu.id);
      removeQuery = scope(removeQuery);
      const { error } = await removeQuery;
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    if (action === "update") {
      const serviceType = ["bottle", "glass", "both"].includes(body.serviceType) ? body.serviceType : "bottle";
      const optionalMoney = (value) => value === "" || value == null ? null : Math.max(0, Number(value));
      const payload = {
        service_type: serviceType,
        price_override: optionalMoney(body.priceOverride),
        glass_price: ["glass", "both"].includes(serviceType) ? optionalMoney(body.glassPrice) : null,
        description: String(body.description || "").trim().slice(0, 800),
      };
      if ([payload.price_override, payload.glass_price].some((value) => value != null && !Number.isFinite(value))) {
        return NextResponse.json({ error: "Prices must be valid positive numbers." }, { status: 400 });
      }
      let updateQuery = access.admin.from("wine_menu_items").update(payload).eq("id", item.id).eq("wine_menu_id", menu.id);
      updateQuery = scope(updateQuery);
      const { error } = await updateQuery;
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unsupported content action." }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Wine-list content could not be updated." }, { status: 500 });
  }
}
