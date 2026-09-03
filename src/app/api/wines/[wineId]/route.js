import { NextResponse } from "next/server";
import { requireAdministrator } from "@/lib/server/requireAdministrator";
import { scopeTenantQuery } from "@/lib/server/tenantContext";
import { fetchAllRows } from "@/lib/supabase/fetchAllRows";
import { summarizeInventoryValuation } from "@/lib/inventoryValuation";
import { buildWineDataQualityReport } from "@/lib/wineDataQuality";
import { positiveBottleQuantity } from "@/lib/wineInventory";
import { parseCatalogueCorrection } from "@/lib/wineCatalogueCorrection";

export const dynamic = "force-dynamic";

export async function PATCH(request, { params }) {
  try {
    const access = await requireAdministrator(request);
    if (access.error) return errorResponse(access.error.message, access.error.status);
    const { wineId } = await params;
    const scope = (query) => scopeTenantQuery(query, access.tenant);
    const { data: wine, error: lookupError } = await scope(access.admin.from('wines').select('id,sku').eq('id', wineId)).maybeSingle();
    if (lookupError) throw lookupError;
    if (!wine) return errorResponse('Wine not found in this workspace.', 404);
    let changes;
    try { changes = parseCatalogueCorrection(await request.json()); }
    catch (error) { return errorResponse(error.message); }
    // Existing integration identifiers must not be reassigned in a quick edit.
    if ('sku' in changes && wine.sku && changes.sku !== wine.sku) return errorResponse('Existing identifiers must be reviewed through the source integration.');
    if (changes.sku && changes.sku !== wine.sku) {
      const { data: duplicate, error } = await scope(access.admin.from('wines').select('id').eq('sku', changes.sku).neq('id', wineId)).limit(1).maybeSingle();
      if (error) throw error;
      if (duplicate) return errorResponse('That SKU already belongs to another wine in this workspace.', 409);
    }
    const { data, error } = await scope(access.admin.from('wines').update(changes).eq('id', wineId)).select('id').maybeSingle();
    if (error) throw error;
    if (!data) return errorResponse('Wine not found in this workspace.', 404);
    return NextResponse.json({ success: true });
  } catch (error) { return errorResponse(error.message || 'Correction could not be saved.', 500); }
}

function errorResponse(message, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request, { params }) {
  try {
    const access = await requireAdministrator(request);
    if (access.error) return errorResponse(access.error.message, access.error.status);

    const { wineId } = await params;
    const scope = (query) => scopeTenantQuery(query, access.tenant);
    const wineResult = await scope(
      access.admin.from("wines").select("*").eq("id", wineId)
    ).maybeSingle();
    if (wineResult.error) throw wineResult.error;
    if (!wineResult.data) return errorResponse("Wine not found in this workspace.", 404);

    const [inventoryRows, valuationRows, menuItems, locations] = await Promise.all([
      fetchAllRows(access.admin, "wine_inventory", "id,wine_id,location_id,quantity", (query) => scope(query).eq("wine_id", wineId).order("location_id")),
      fetchAllRows(access.admin, "wine_inventory_valuations", "*", (query) => scope(query).eq("wine_id", wineId).eq("source", "compucash").order("location_id")),
      fetchAllRows(access.admin, "wine_menu_items", "*", (query) => scope(query).eq("wine_id", wineId).order("wine_menu_id")),
      fetchAllRows(access.admin, "wine_locations", "id,name,location_type,wine_menu_id,is_active", (query) => scope(query).order("name")),
    ]);

    const locationById = new Map(locations.map((location) => [String(location.id), location]));
    const locationByMenuId = new Map(
      locations.filter((location) => location.wine_menu_id).map((location) => [String(location.wine_menu_id), location])
    );
    const stock = inventoryRows.reduce((sum, row) => sum + positiveBottleQuantity(row.quantity), 0);
    const stockLines = inventoryRows
      .filter((row) => positiveBottleQuantity(row.quantity) > 0)
      .map((row) => ({
        id: row.id,
        locationId: row.location_id,
        locationName: locationById.get(String(row.location_id))?.name || "Unknown location",
        locationType: locationById.get(String(row.location_id))?.location_type || null,
        quantity: positiveBottleQuantity(row.quantity),
      }))
      .sort((a, b) => b.quantity - a.quantity || a.locationName.localeCompare(b.locationName));

    const placements = menuItems.map((item) => {
      const location = locationByMenuId.get(String(item.wine_menu_id));
      return {
        id: item.id,
        locationId: location?.id || null,
        locationName: location?.name || "Unlinked wine menu",
        wineMenuId: item.wine_menu_id,
        active: item.is_active !== false,
        serviceType: item.service_type || "bottle",
        bottlePrice: item.price_override ?? wineResult.data.price ?? null,
        glassPrice: item.glass_price ?? null,
        description: item.description || wineResult.data.description || "",
      };
    });

    const quality = buildWineDataQualityReport({
      wines: [wineResult.data],
      inventoryRows,
      menuItems,
      valuationRows,
      locations,
    });

    return NextResponse.json({
      wine: wineResult.data,
      stock,
      stockLines,
      placements,
      valuation: summarizeInventoryValuation({ inventoryRows, valuationRows }),
      valuationLines: valuationRows,
      quality: quality.issues,
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("WINE DETAIL LOAD ERROR:", error);
    return errorResponse(error?.message || "Wine details could not be loaded.", 500);
  }
}
