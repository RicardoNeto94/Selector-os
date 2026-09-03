import {
  hasAvailableStock,
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
  const format = parseBottleSizeCl(wine?.size, wine?.name) || 'unknown';
  return name && producer ? `${name}|${producer}|${vintage}|${format}` : "";
}

function issue({ wine, stock, category, severity = "warning", title, detail, href = "/dashboard/wines", locationName = "", relatedWineIds = [] }) {
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
    relatedWineIds,
  };
}

export function buildWineDataQualityReport({
  wines = [],
  inventoryRows = [],
  valuationRows = [],
} = {}) {
  const stockByWine = new Map();
  for (const row of inventoryRows) {
    const wineId = String(row?.wine_id || "");
    if (!wineId) continue;
    stockByWine.set(wineId, (stockByWine.get(wineId) || 0) + positiveBottleQuantity(row.quantity));
  }

  const stockedWines = wines.filter((wine) => wine?.is_active !== false && hasAvailableStock(stockByWine.get(String(wine.id))));
  const issues = [];

  for (const wine of stockedWines) {
    const wineId = String(wine.id);
    const stock = stockByWine.get(wineId) || 0;
    const sourceLinked = Boolean(
      text(wine.business_product_number) ||
      text(wine.business_barcode) ||
      text(wine.sku)
      || valuationRows.some((row) => String(row.wine_id) === wineId && text(row.external_product_id))
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
      relatedWineIds: group.map((wine) => String(wine.id)),
      detail: `${group.length} active records share the same name, producer, vintage and bottle format. Review before merging or deleting anything.`,
    }));
  }

  const severityOrder = { critical: 0, warning: 1, info: 2 };
  issues.sort((a, b) => (severityOrder[a.severity] - severityOrder[b.severity]) || a.wineName.localeCompare(b.wineName));
  const affectedWineIds = new Set(issues.flatMap((item) => [item.wineId, ...item.relatedWineIds]).filter((id) => id && hasAvailableStock(stockByWine.get(String(id)))));
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
