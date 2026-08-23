import { createHash } from "node:crypto";

export function checksumInventoryRows(rows) {
  const canonical = rows
    .map((row) => [row.locationId, row.wineId, normalizeQuantity(row.quantity)].join("|"))
    .sort()
    .join("\n");
  return createHash("sha256").update(canonical).digest("hex");
}

export function buildChangedInventoryRows({
  plannedRows,
  currentRows,
  locations,
  storeTargets,
  replaceMappedLocationInventory = false,
}) {
  const current = new Map(
    currentRows.map((row) => [
      `${row.wine_id}|${row.location_id}`,
      Number(row.quantity || 0),
    ])
  );
  const locationNames = new Map(locations.map((row) => [row.id, row.name]));
  const storeNames = new Map();
  for (const target of storeTargets) {
    storeNames.set(target.locationId, [
      ...(storeNames.get(target.locationId) ?? []),
      target.expectedName,
    ]);
  }

  const authoritativeRows = [...plannedRows];
  if (replaceMappedLocationInventory) {
    const plannedKeys = new Set(
      plannedRows.map((row) => `${row.wineId}|${row.locationId}`)
    );
    const mappedLocationIds = new Set(
      storeTargets.map((target) => target.locationId)
    );
    for (const row of currentRows) {
      const key = `${row.wine_id}|${row.location_id}`;
      if (
        mappedLocationIds.has(row.location_id) &&
        !plannedKeys.has(key) &&
        Math.abs(Number(row.quantity || 0)) > 0.000001
      ) {
        authoritativeRows.push({
          wineId: row.wine_id,
          locationId: row.location_id,
          quantity: 0,
        });
      }
    }
  }

  return authoritativeRows
    .filter((row) => {
      const oldQuantity = current.get(`${row.wineId}|${row.locationId}`) ?? 0;
      return Math.abs(oldQuantity - row.quantity) > 0.000001;
    })
    .map((row) => ({
      wine_id: row.wineId,
      location_id: row.locationId,
      location_name: locationNames.get(row.locationId) ?? "Compucash location",
      quantity: normalizeQuantity(row.quantity),
      business_stores: (storeNames.get(row.locationId) ?? []).join(", "),
    }));
}

function normalizeQuantity(value) {
  return Number(Number(value || 0).toFixed(6));
}
