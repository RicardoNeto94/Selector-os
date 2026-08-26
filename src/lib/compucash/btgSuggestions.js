import { fetchAllRows } from "@/lib/supabase/fetchAllRows";
import {
  scopeTenantQuery,
  tenantWriteFields,
} from "@/lib/server/tenantContext";

const BTG_GROUP_ID = "336";
const SAKE_GROUP_ID = "77";

export async function refreshCompuCashBtgSuggestions({
  admin,
  rawProducts,
  storeTargets,
  tenant,
}) {
  const scopeRows = (query) => scopeTenantQuery(query, tenant);
  const tenantFields = tenantWriteFields(tenant);
  const btgProducts = rawProducts.filter((product) => {
    const groupId = String(product.productGroupId ?? "");
    return (
      groupId === BTG_GROUP_ID ||
      (groupId === SAKE_GROUP_ID && /\b6\s*cl\b/i.test(product.productName ?? ""))
    );
  });
  const productIds = new Set(btgProducts.map((product) => String(product.productId)));
  const [aliases, inventory, locations, menuItems, existingSuggestions, menuServings] = await Promise.all([
    fetchAllRows(admin, "wine_business_aliases", "wine_id,business_product_id", scopeRows),
    fetchAllRows(admin, "wine_inventory", "wine_id,location_id,quantity", scopeRows),
    fetchAllRows(admin, "wine_locations", "id,wine_menu_id", scopeRows),
    fetchAllRows(admin, "wine_menu_items", "id,wine_menu_id,wine_id,service_type,glass_price", scopeRows),
    fetchAllRows(admin, "wine_btg_suggestions", "wine_id,location_id,business_product_number,business_product_name,status", scopeRows),
    fetchAllRows(admin, "wine_menu_servings", "id,wine_menu_item_id,compucash_product_id,price,is_active,source", scopeRows),
  ]);
  const aliasByProductId = new Map(
    aliases
      .filter((alias) => productIds.has(String(alias.business_product_id ?? "")))
      .map((alias) => [String(alias.business_product_id), alias])
  );
  const quantityByWineLocation = new Map(
    inventory.map((row) => [
      `${row.wine_id}|${row.location_id}`,
      Number(row.quantity || 0),
    ])
  );
  const menuByLocation = new Map(
    locations.filter((row) => row.wine_menu_id).map((row) => [row.id, row.wine_menu_id])
  );
  const enabledBtg = new Set(
    menuItems
      .filter((row) => ["glass", "both"].includes(row.service_type))
      .map((row) => `${row.wine_menu_id}|${row.wine_id}`)
  );
  const menuItemByMenuWine = new Map(
    menuItems.map((row) => [`${row.wine_menu_id}|${row.wine_id}`, row])
  );
  const terminalKeys = new Set(
    existingSuggestions
      .filter((row) => ["approved", "dismissed"].includes(row.status))
      .map(suggestionKey)
  );
  const storesByLocation = new Map();
  for (const target of storeTargets) {
    storesByLocation.set(target.locationId, [
      ...(storesByLocation.get(target.locationId) ?? []),
      String(target.externalStoreId),
    ]);
  }
  const suggestions = [];
  const servingRows = [];
  const servingMenuItemIds = new Set();
  for (const product of btgProducts) {
    const alias = aliasByProductId.get(String(product.productId));
    if (!alias) continue;
    for (const [locationId, storeIds] of storesByLocation) {
      const menuId = menuByLocation.get(locationId);
      if (!menuId) continue;
      const assignedStoreRows = (product.storeQuantities ?? [])
        .filter((row) => storeIds.includes(String(row.storeId)));
      const baseQuantity = quantityByWineLocation.get(`${alias.wine_id}|${locationId}`) ?? 0;
      const suggestionType = assignedStoreRows.length > 0
        ? "confirmed"
        : baseQuantity > 0
          ? "opportunity"
          : null;
      const menuItem = menuItemByMenuWine.get(`${menuId}|${alias.wine_id}`);
      const servingCl = parseServingCl(product.productName);
      if (assignedStoreRows.length > 0 && menuItem && [6, 12, 15].includes(servingCl)) {
        const priceRow = (product.salePrices ?? []).find((row) =>
          Number.isFinite(Number(row.salePrice ?? row.price))
        );
        servingRows.push({
          ...tenantFields,
          wine_menu_item_id: menuItem.id,
          compucash_product_id: String(product.productId),
          serving_cl: servingCl,
          price: priceRow ? Number(priceRow.salePrice ?? priceRow.price) : null,
          is_active: true,
          source: "compucash",
          last_synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        servingMenuItemIds.add(menuItem.id);
      }
      if (enabledBtg.has(`${menuId}|${alias.wine_id}`)) continue;
      if (!suggestionType) continue;
      const row = {
        ...tenantFields,
        wine_id: alias.wine_id,
        location_id: locationId,
        business_product_number: product.productNumber || null,
        business_barcode: product.productBarcode || null,
        business_product_name: product.productName,
        serving_cl: servingCl,
        suggestion_type: suggestionType,
        status: "pending",
        updated_at: new Date().toISOString(),
      };
      if (!terminalKeys.has(suggestionKey(row))) suggestions.push(row);
    }
  }
  const mappedLocationIds = [...storesByLocation.keys()];
  const stale = await scopeTenantQuery(admin
    .from("wine_btg_suggestions")
    .delete()
    .eq("status", "pending"), tenant)
    .in("location_id", mappedLocationIds);
  if (stale.error) throw stale.error;
  if (suggestions.length) {
    const inserted = await admin.from("wine_btg_suggestions").insert(suggestions);
    if (inserted.error) throw inserted.error;
  }
  if (servingRows.length) {
    const upserted = await admin.from("wine_menu_servings").upsert(servingRows, {
      onConflict: "wine_menu_item_id,compucash_product_id",
    });
    if (upserted.error) throw upserted.error;
  }
  for (const menuItemId of servingMenuItemIds) {
    const item = menuItems.find((row) => row.id === menuItemId);
    const itemServings = servingRows.filter((row) => row.wine_menu_item_id === menuItemId);
    const firstPrice = itemServings.find((row) => row.price !== null)?.price ?? null;
    const updated = await scopeTenantQuery(admin.from("wine_menu_items").update({
      service_type: item?.service_type === "glass" ? "glass" : "both",
      ...(firstPrice !== null ? { glass_price: firstPrice } : {}),
    }).eq("id", menuItemId), tenant);
    if (updated.error) throw updated.error;
  }
  const productById = new Map(
    btgProducts.map((product) => [String(product.productId), product])
  );
  let pricesUpdated = 0;
  for (const serving of menuServings.filter((row) => row.is_active)) {
    const product = productById.get(String(serving.compucash_product_id));
    const priceRow = (product?.salePrices ?? []).find((row) =>
      Number.isFinite(Number(row.salePrice ?? row.price))
    );
    if (!priceRow) continue;
    const price = Number(priceRow.salePrice ?? priceRow.price);
    if (Math.abs(Number(serving.price ?? 0) - price) <= 0.000001) continue;
    const updated = await scopeTenantQuery(admin.from("wine_menu_servings").update({
      price,
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", serving.id), tenant);
    if (updated.error) throw updated.error;
    pricesUpdated += 1;
  }
  return {
    confirmed: suggestions.filter((row) => row.suggestion_type === "confirmed").length,
    opportunities: suggestions.filter((row) => row.suggestion_type === "opportunity").length,
    servingsSynced: servingRows.length,
    pricesUpdated,
  };
}

function parseServingCl(name) {
  const match = String(name ?? "").match(/(?:^|\s)(\d+(?:[.,]\d+)?)\s*cl\b/i);
  return match ? Number(match[1].replace(",", ".")) : 0;
}

function suggestionKey(row) {
  return [
    row.wine_id,
    row.location_id,
    row.business_product_number || row.business_product_name,
  ].join("|");
}
