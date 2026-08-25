import test from "node:test";
import assert from "node:assert/strict";
import { summarizeInventoryValuation } from "../src/lib/inventoryValuation.js";

test("summarizes cost, revenue and coverage using current location quantities", () => {
  const result = summarizeInventoryValuation({
    inventoryRows: [
      { wine_id: "wine-1", location_id: "venue-1", quantity: 4 },
      { wine_id: "wine-2", location_id: "venue-1", quantity: 2 },
    ],
    valuationRows: [
      {
        wine_id: "wine-1",
        location_id: "venue-1",
        cost_covered_quantity: 4,
        unit_inventory_cost: 10,
        unit_sale_price_net: 25,
        unit_sale_price_gross: 30,
      },
      {
        wine_id: "wine-2",
        location_id: "venue-1",
        cost_covered_quantity: 2,
        unit_inventory_cost: 20,
        unit_sale_price_net: null,
        unit_sale_price_gross: null,
      },
    ],
  });

  assert.equal(result.inventoryCost, 80);
  assert.equal(result.potentialRevenueNet, 100);
  assert.equal(result.potentialRevenueGross, 120);
  assert.equal(result.potentialGrossProfit, 60);
  assert.equal(result.potentialMargin, 60);
  assert.equal(result.costCoverage, 100);
  assert.equal(result.saleCoverage, (4 / 6) * 100);
});
