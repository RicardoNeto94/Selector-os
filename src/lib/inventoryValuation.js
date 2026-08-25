import { positiveBottleQuantity } from "./wineInventory.js";

export function summarizeInventoryValuation({ inventoryRows = [], valuationRows = [] }) {
  const quantityByKey = new Map();
  for (const row of inventoryRows) {
    const key = `${row.wine_id}|${row.location_id}`;
    quantityByKey.set(
      key,
      (quantityByKey.get(key) || 0) + positiveBottleQuantity(row.quantity)
    );
  }

  let totalQuantity = 0;
  let inventoryCost = 0;
  let potentialRevenueNet = 0;
  let potentialRevenueGross = 0;
  let comparableCost = 0;
  let comparableRevenueNet = 0;
  let costCoveredQuantity = 0;
  let saleCoveredQuantity = 0;

  for (const quantity of quantityByKey.values()) totalQuantity += quantity;

  for (const valuation of valuationRows) {
    const quantity = quantityByKey.get(
      `${valuation.wine_id}|${valuation.location_id}`
    ) || 0;
    if (quantity <= 0) continue;

    const unitCost = Number(valuation.unit_inventory_cost);
    const saleNet = Number(valuation.unit_sale_price_net);
    const saleGross = Number(valuation.unit_sale_price_gross);
    const hasCost = valuation.unit_inventory_cost != null && Number.isFinite(unitCost) && unitCost >= 0;
    const hasSaleNet = valuation.unit_sale_price_net != null && Number.isFinite(saleNet) && saleNet > 0;
    const hasSaleGross = valuation.unit_sale_price_gross != null && Number.isFinite(saleGross) && saleGross > 0;
    const coveredQuantity = hasCost
      ? Math.min(quantity, Math.max(0, Number(valuation.cost_covered_quantity || 0)))
      : 0;

    if (coveredQuantity > 0) {
      inventoryCost += coveredQuantity * unitCost;
      costCoveredQuantity += coveredQuantity;
    }
    if (hasSaleNet) {
      potentialRevenueNet += quantity * saleNet;
      saleCoveredQuantity += quantity;
    }
    if (hasSaleGross) potentialRevenueGross += quantity * saleGross;
    if (coveredQuantity > 0 && hasSaleNet) {
      comparableCost += coveredQuantity * unitCost;
      comparableRevenueNet += coveredQuantity * saleNet;
    }
  }

  const potentialGrossProfit = comparableRevenueNet - comparableCost;
  return {
    totalQuantity,
    inventoryCost,
    potentialRevenueNet,
    potentialRevenueGross,
    potentialGrossProfit,
    potentialMargin: comparableRevenueNet > 0
      ? (potentialGrossProfit / comparableRevenueNet) * 100
      : 0,
    costCoverage: totalQuantity > 0 ? (costCoveredQuantity / totalQuantity) * 100 : 0,
    saleCoverage: totalQuantity > 0 ? (saleCoveredQuantity / totalQuantity) * 100 : 0,
  };
}
