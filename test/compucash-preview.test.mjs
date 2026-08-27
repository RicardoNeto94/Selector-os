import test from "node:test";
import assert from "node:assert/strict";
import {
  buildCompuCashPreview,
  buildCompuCashInventoryPlan,
  getProductExclusionReason,
  normalizeCompuCashProduct,
} from "../src/lib/compucash/preview.js";
import { buildChangedInventoryRows } from "../src/lib/compucash/syncPlan.js";
import { COMPUCASH_STORE_TARGETS } from "../src/lib/compucash/constants.js";

test("maps Casino Bar Beverages into the Bombay Club venue", () => {
  const target = COMPUCASH_STORE_TARGETS.find(
    (row) => row.externalStoreId === "7"
  );

  assert.deepEqual(target, {
    externalStoreId: "7",
    locationId: "f8762405-c48c-42e6-94ff-fc526abf8adb",
    expectedName: "Casino Bar Beverages",
  });
});

test("preserves fractional physical stock", () => {
  const product = normalizeCompuCashProduct({
    productId: 501,
    productNumber: "W-501",
    productGroupId: 15,
    storeQuantities: [{ storeId: 13, quantity: 2.37 }],
  });
  assert.equal(product.stock[0].quantity, 2.37);
});

test("normalizes Compucash cost and default gross/net sale prices", () => {
  const product = normalizeCompuCashProduct({
    productId: 502,
    productNumber: "W-502",
    productGroupId: 15,
    storeQuantities: [{ storeId: 13, quantity: 2, storagePrice: 20 }],
    salePrices: [{
      salePriceGID: 4,
      salePrice: 49.2,
      vatPercent: 22,
      isDefault: true,
    }],
  });

  assert.equal(product.stock[0].storagePrice, 20);
  assert.deepEqual(product.defaultSalePrice, {
    salePriceGroupId: "4",
    salePriceGross: 49.2,
    salePriceNet: 40.327869,
    vatPercent: 22,
    isDefault: true,
  });
});

test("uses the base physical variation instead of variation-inclusive parent stock", () => {
  const product = normalizeCompuCashProduct({
    productId: 1121,
    productNumber: "005705",
    productName: "Yalumba Antique Muscat Rutherglen 37.5cl",
    productGroupId: 63,
    storeQuantities: [
      { storeId: 5, quantity: 144 },
      { storeId: 6, quantity: 1 },
    ],
    productVariations: [
      {
        productId: 5705,
        storeQuantities: [{ storeId: 5, quantity: 144 }],
      },
      {
        productId: 1121,
        storeQuantities: [{ storeId: 6, quantity: 1 }],
      },
    ],
  });

  assert.deepEqual(product.stock, [{
    externalProductId: "1121",
    externalStoreId: "6",
    quantity: 1,
    storagePrice: null,
  }]);
});

test("sums stores mapped to one location and emits explicit zeroes", () => {
  const plan = buildCompuCashInventoryPlan({
    rawProducts: [{
      productId: 501,
      productNumber: "W-501",
      productName: "Physical bottle 75cl",
      productGroupId: 15,
      storeQuantities: [
        { storeId: 26, quantity: 2.5 },
        { storeId: 27, quantity: 3 },
      ],
    }],
    storeTargets: [
      { externalStoreId: "26", locationId: "main" },
      { externalStoreId: "27", locationId: "main" },
      { externalStoreId: "13", locationId: "koyo" },
    ],
    wines: [{ id: "wine-1", business_product_number: "W-501" }],
  });
  assert.deepEqual(plan.rows, [
    { wineId: "wine-1", locationId: "koyo", quantity: 0 },
    { wineId: "wine-1", locationId: "main", quantity: 5.5 },
  ]);
  assert.deepEqual(plan.wineSources, [{ wine_id: "wine-1", product_group_id: "15" }]);
});

test("builds weighted store-level valuation snapshots", () => {
  const plan = buildCompuCashInventoryPlan({
    rawProducts: [{
      productId: 503,
      productNumber: "W-503",
      productName: "Physical bottle 75cl",
      productGroupId: 15,
      storeQuantities: [
        { storeId: 26, quantity: 2, storagePrice: 10 },
        { storeId: 27, quantity: 1, storagePrice: 16 },
      ],
      salePrices: [{
        salePriceGID: 8,
        salePrice: 36.6,
        salePriceWithoutVat: 30,
        vatPercent: 22,
        isDefault: true,
      }],
    }],
    storeTargets: [
      { externalStoreId: "26", locationId: "main" },
      { externalStoreId: "27", locationId: "main" },
    ],
    wines: [{ id: "wine-1", business_product_number: "W-503" }],
  });

  assert.equal(plan.valuations.length, 1);
  assert.deepEqual(plan.valuations[0], {
    wine_id: "wine-1",
    location_id: "main",
    external_product_id: "503",
    external_store_ids: ["26", "27"],
    quantity_snapshot: 3,
    cost_covered_quantity: 3,
    unit_inventory_cost: 12,
    inventory_cost_value: 36,
    unit_sale_price_gross: 36.6,
    unit_sale_price_net: 30,
    vat_percent: 22,
    sale_price_group_id: "8",
    currency_code: "EUR",
    source_updated_at: plan.valuations[0].source_updated_at,
  });
});

test("reports multiple Compucash products mapped to one Vaxeron wine", () => {
  const plan = buildCompuCashInventoryPlan({
    rawProducts: [
      { productId: 1, productNumber: "A", productName: "Wine A", productGroupId: 15 },
      { productId: 2, productNumber: "B", productName: "Wine B", productGroupId: 15 },
    ],
    storeTargets: [{ externalStoreId: "13", locationId: "koyo" }],
    wines: [{ id: "wine-1", business_product_number: "A" }],
    aliases: [{ wine_id: "wine-1", business_product_number: "B" }],
  });
  assert.equal(plan.duplicateWineMatches.length, 1);
  assert.deepEqual(
    plan.duplicateWineMatches[0].products.map((product) => product.productNumber),
    ["A", "B"]
  );
});

test("matches products without a product number by immutable external ID", () => {
  const report = buildCompuCashPreview({
    rawStores: [{ storeId: 13, storeName: "Koyo Beverages" }],
    rawProducts: [{
      productId: 2286,
      productName: "Armand de Brignac Gold Brut NV 75cl",
      productGroupId: 76,
      storeQuantities: [{ storeId: 13, quantity: 3 }],
    }],
    storeTargets: [{ externalStoreId: "13", locationId: "koyo", expectedName: "Koyo Beverages" }],
    wines: [{ id: "wine-1" }],
    aliases: [{ wine_id: "wine-1", business_product_id: "2286" }],
  });
  assert.equal(report.totals.productsMatched, 1);
  assert.equal(report.acceptedStockSample[0].wineId, "wine-1");
});

test("excludes BTG portions even inside a physical wine group", () => {
  assert.equal(
    getProductExclusionReason({ productGroupId: "15", name: "Riesling 12cl" }),
    "by_the_glass_serving"
  );
  assert.equal(
    getProductExclusionReason({ productGroupId: "77", name: "Junmai Daiginjo 6cl" }),
    "by_the_glass_serving"
  );
  assert.equal(
    getProductExclusionReason({ productGroupId: "67", name: "Botrytis Semillon 37.5cl" }),
    null
  );
});

test("matches exact identifiers and never guesses conflicts", () => {
  const report = buildCompuCashPreview({
    rawStores: [{ storeId: 13, storeName: "Koyo Beverages" }],
    rawProducts: [
      {
        productId: 501,
        productNumber: "W-501",
        productName: "Matched wine",
        productGroupId: 15,
        storeQuantities: [{ storeId: 13, quantity: 4 }],
      },
      {
        productId: 502,
        productNumber: "DUPLICATE",
        productName: "Ambiguous wine",
        productGroupId: 16,
        storeQuantities: [{ storeId: 13, quantity: 3 }],
      },
    ],
    storeTargets: [{ externalStoreId: "13", locationId: "koyo", expectedName: "Koyo Beverages" }],
    wines: [
      { id: "wine-1", business_product_number: "W-501" },
      { id: "wine-2", business_product_number: "DUPLICATE" },
      { id: "wine-3", business_product_number: "DUPLICATE" },
    ],
  });
  assert.equal(report.writesPerformed, false);
  assert.equal(report.totals.productsMatched, 1);
  assert.equal(report.totals.productConflicts, 1);
  assert.equal(report.totals.stockRowsAccepted, 1);
  assert.equal(report.acceptedStockSample[0].locationId, "koyo");
});

test("sake and shochu are authoritative physical inventory", () => {
  assert.equal(
    getProductExclusionReason({ productGroupId: "77", name: "Junmai Daiginjo 72cl" }),
    null
  );
});

test("authoritative replacement zeroes obsolete rows at mapped locations", () => {
  const rows = buildChangedInventoryRows({
    plannedRows: [{ wineId: "current-wine", locationId: "shang", quantity: 2 }],
    currentRows: [
      { wine_id: "current-wine", location_id: "shang", quantity: 2 },
      { wine_id: "legacy-wine", location_id: "shang", quantity: 3 },
      { wine_id: "other-location-wine", location_id: "other", quantity: 4 },
    ],
    locations: [{ id: "shang", name: "Shang Shi" }],
    storeTargets: [{ locationId: "shang", expectedName: "Shang Shi Beverages" }],
    replaceMappedLocationInventory: true,
  });
  assert.deepEqual(rows, [{
    wine_id: "legacy-wine",
    location_id: "shang",
    location_name: "Shang Shi",
    quantity: 0,
    business_stores: "Shang Shi Beverages",
  }]);
});

test("excludes Compucash control products from physical inventory", () => {
  assert.equal(
    getProductExclusionReason({ productGroupId: "16", name: "(C)Red Wine" }),
    "generic_placeholder"
  );
  assert.equal(
    getProductExclusionReason({ productGroupId: "77", name: "Sake Pairing" }),
    "pairing_package"
  );
});
