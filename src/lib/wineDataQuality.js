import {
  guestServiceReadiness,
  hasAvailableStock,
  hasUsablePrice,
  parseBottleSizeCl,
  positiveBottleQuantity,
} from "./wineInventory.js";

const text = (value) => String(value || "").replace(/\s+/g, " ").trim();
const keyText = (value) => text(value).toLocaleLowerCase("en").replace(/[^a-z0-9]+/g, " ").trim();

function wineLabel(wine) {
  return text(wine?.name) || "Unnamed wine";
}

function duplicateKey(wine) {
  const name = keyText(wine?.name);
  const producer = keyText(wine?.producer);
  const vintage = keyText(wine?.vintage || "nv");
  return name && producer ? `${name}|${producer}|${vintage}` : "";
}

function issue({ wine, stock, category, severity = "warning", title, detail, href = "/dashboard/wines", locationName = "" }) {
  return {
    id: `${category}:${wine?.id || title}:${locationName || title}`,
    wineId: wine?.id || null,
    wineName: wineLabel(wine),
    producer: text(wine?.producer),
    stock: positiveBottleQuantity(stock),
    category,
    severity,
    title,
    detail,
    href,
    locationName,
  };
}

export function buildWineDataQualityReport({
  wines = [],
  inventoryRows = [],
  menuItems = [],
  valuationRows = [],
  locations = [],
} = {}) {
  const wineById = new Map(wines.map((wine) => [String(wine.id), wine]));
  const stockByWine = new Map();
  for (const row of inventoryRows) {
    const wineId = String(row?.wine_id || "");
    if (!wineId) continue;
    stockByWine.set(wineId, (stockByWine.get(wineId) || 0) + positiveBottleQuantity(row.quantity));
  }

  const locationsByMenu = new Map(
    locations.filter((location) => location?.wine_menu_id).map((location) => [String(location.wine_menu_id), location])
  );
  const valuationsByWine = new Map();
  for (const row of valuationRows) {
    const wineId = String(row?.wine_id || "");
    if (!valuationsByWine.has(wineId)) valuationsByWine.set(wineId, []);
    valuationsByWine.get(wineId).push(row);
  }
  const placementsByWine = new Map();
  for (const item of menuItems) {
    const wineId = String(item?.wine_id || "");
    if (!placementsByWine.has(wineId)) placementsByWine.set(wineId, []);
    placementsByWine.get(wineId).push(item);
  }

  const stockedWines = wines.filter((wine) => wine?.is_active !== false && hasAvailableStock(stockByWine.get(String(wine.id))));
  const issues = [];

  for (const wine of stockedWines) {
    const wineId = String(wine.id);
    const stock = stockByWine.get(wineId) || 0;
    const valuations = valuationsByWine.get(wineId) || [];
    const placements = placementsByWine.get(wineId) || [];
    const sourceLinked = Boolean(
      text(wine.business_product_number) ||
      text(wine.business_barcode) ||
      text(wine.sku) ||
      valuations.some((row) => text(row.external_product_id))
    );

    if (!sourceLinked) {
      issues.push(issue({ wine, stock, category: "source", severity: "critical", title: "Missing source identifier", detail: "No product number, barcode, SKU or linked business-system product was found." }));
    }
    if (!parseBottleSizeCl(wine.size, wine.name)) {
      issues.push(issue({ wine, stock, category: "catalogue", title: "Bottle size needs review", detail: "Confirm the physical format so bottle-equivalent reporting remains accurate.", href: "/dashboard/wine-cellar/inventory?format=unknown" }));
    }

    const missingIdentity = [
      !text(wine.producer) && "producer",
      !text(wine.wine_type) && "wine type",
      !(text(wine.country) || text(wine.region)) && "origin",
    ].filter(Boolean);
    if (missingIdentity.length) {
      issues.push(issue({ wine, stock, category: "catalogue", title: "Core wine details incomplete", detail: `Missing ${missingIdentity.join(", ")}.` }));
    }

    const hasPurchaseCost = valuations.some((row) => hasUsablePrice(row.unit_inventory_cost));
    if (valuations.length && !hasPurchaseCost) {
      issues.push(issue({ wine, stock, category: "commercial", title: "Purchase cost unavailable", detail: "Compucash stock is linked, but its average purchase cost is missing." }));
    }

    const guestProblems = [];
    for (const placement of placements.filter((item) => item?.is_active !== false)) {
      const location = locationsByMenu.get(String(placement.wine_menu_id));
      const locationName = text(location?.name) || "a guest wine list";
      const readiness = guestServiceReadiness({
        quantity: stock,
        serviceType: placement.service_type || "bottle",
        bottlePrice: placement.price_override ?? wine.price,
        glassPrice: placement.glass_price,
      });
      const missing = [];
      if (!text(placement.description) && !text(wine.description)) missing.push("description");
      if (!readiness.bottleReady) missing.push("bottle price");
      if (!readiness.glassReady) missing.push("glass price");
      if (missing.length) guestProblems.push(`${locationName}: ${missing.join(", ")}`);
    }
    if (guestProblems.length) {
      const firstLocation = locationsByMenu.get(String(placements[0]?.wine_menu_id));
      issues.push(issue({
        wine,
        stock,
        category: "guest",
        severity: guestProblems.some((value) => value.includes("price")) ? "critical" : "warning",
        title: "Guest presentation incomplete",
        detail: guestProblems.slice(0, 2).join(" · ") + (guestProblems.length > 2 ? ` · +${guestProblems.length - 2} more` : ""),
        href: firstLocation?.id ? `/dashboard/wine-cellar/venues/${firstLocation.id}` : "/dashboard/wine-cellar/venues",
        locationName: text(firstLocation?.name),
      }));
    }
  }

  const duplicates = new Map();
  for (const wine of wines.filter((item) => item?.is_active !== false)) {
    const key = duplicateKey(wine);
    if (!key) continue;
    if (!duplicates.has(key)) duplicates.set(key, []);
    duplicates.get(key).push(wine);
  }
  for (const group of duplicates.values()) {
    if (group.length < 2) continue;
    const stockedGroup = group.filter((wine) => hasAvailableStock(stockByWine.get(String(wine.id))));
    if (!stockedGroup.length) continue;
    const representative = stockedGroup[0];
    issues.push(issue({
      wine: representative,
      stock: stockedGroup.reduce((sum, wine) => sum + positiveBottleQuantity(stockByWine.get(String(wine.id))), 0),
      category: "duplicates",
      title: "Possible duplicate labels",
      detail: `${group.length} active records share the same name, producer and vintage. Review before merging or deleting anything.`,
    }));
  }

  const severityOrder = { critical: 0, warning: 1, info: 2 };
  issues.sort((a, b) => (severityOrder[a.severity] - severityOrder[b.severity]) || a.wineName.localeCompare(b.wineName));
  const affectedWineIds = new Set(issues.map((item) => item.wineId).filter(Boolean));
  const criticalWineIds = new Set(issues.filter((item) => item.severity === "critical").map((item) => item.wineId).filter(Boolean));
  const counts = issues.reduce((result, item) => ({ ...result, [item.category]: (result[item.category] || 0) + 1 }), {});

  return {
    summary: {
      stockedLabels: stockedWines.length,
      readyLabels: Math.max(0, stockedWines.length - affectedWineIds.size),
      needsAttention: affectedWineIds.size,
      criticalLabels: criticalWineIds.size,
      totalIssues: issues.length,
    },
    counts,
    issues,
  };
}
