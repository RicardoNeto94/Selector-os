import assert from "node:assert/strict";
import test from "node:test";

import { buildWineDataQualityReport } from "../src/lib/wineDataQuality.js";
import { parseCatalogueCorrection } from "../src/lib/wineCatalogueCorrection.js";

const completeWine = {
  id: "wine-1",
  name: "Estate Riesling",
  producer: "Example Estate",
  vintage: "2024",
  wine_type: "white",
  country: "Germany",
  region: "Mosel",
  size: "75cl",
  sku: "W-1",
  price: 75,
  description: "A concise factual description.",
  is_active: true,
};

test("reports a fully complete stocked wine as ready", () => {
  const report = buildWineDataQualityReport({
    wines: [completeWine],
    inventoryRows: [{ wine_id: "wine-1", quantity: 3 }],
    valuationRows: [{ wine_id: "wine-1", external_product_id: "100", unit_inventory_cost: 20 }],
  });
  assert.deepEqual(report.summary, { stockedLabels: 1, readyLabels: 1, needsAttention: 0, criticalLabels: 0, totalIssues: 0 });
});

test("ignores zero-stock labels in operational quality counts", () => {
  const report = buildWineDataQualityReport({
    wines: [{ ...completeWine, sku: "" }],
    inventoryRows: [{ wine_id: "wine-1", quantity: 0 }],
  });
  assert.equal(report.summary.stockedLabels, 0);
  assert.equal(report.issues.length, 0);
});

test("keeps fractional BTG stock in catalogue scope", () => {
  const report = buildWineDataQualityReport({
    wines: [{ ...completeWine, producer: "" }],
    inventoryRows: [{ wine_id: "wine-1", quantity: 0.1 }],
  });
  assert.equal(report.summary.stockedLabels, 1);
  assert.ok(report.issues.find((item) => item.category === "catalogue"));
});

test("flags source, size and identity gaps without multiplying them by inventory location", () => {
  const report = buildWineDataQualityReport({
    wines: [{ ...completeWine, sku: "", producer: "", country: "", region: "", wine_type: "", size: "" }],
    inventoryRows: [{ wine_id: "wine-1", quantity: 1 }, { wine_id: "wine-1", quantity: 2 }],
  });
  assert.equal(report.issues.filter((item) => item.category === "source").length, 1);
  assert.equal(report.issues.filter((item) => item.category === "catalogue").length, 2);
});

test("surfaces duplicate candidates but never merges them", () => {
  const report = buildWineDataQualityReport({
    wines: [completeWine, { ...completeWine, id: "wine-2", sku: "W-2" }],
    inventoryRows: [{ wine_id: "wine-1", quantity: 1 }],
  });
  const duplicate = report.issues.find((item) => item.category === "duplicates");
  assert.ok(duplicate);
  assert.match(duplicate.detail, /Review before merging/);
  assert.deepEqual(duplicate.relatedWineIds, ['wine-1', 'wine-2']);
});

test('different bottle formats are not flagged as duplicates', () => {
  const report = buildWineDataQualityReport({ wines: [completeWine, { ...completeWine, id: 'wine-2', size: '150cl' }], inventoryRows: [{ wine_id: 'wine-1', quantity: 2 }, { wine_id: 'wine-2', quantity: 1 }] });
  assert.equal(report.counts.duplicates || 0, 0);
});
test('all stocked duplicate candidates count as needing attention', () => {
  const report = buildWineDataQualityReport({ wines: [completeWine, { ...completeWine, id: 'wine-2' }], inventoryRows: [{ wine_id: 'wine-1', quantity: 2 }, { wine_id: 'wine-2', quantity: 1 }] });
  assert.equal(report.summary.needsAttention, 2);
  assert.equal(report.summary.readyLabels, 0);
});
test('validated corrections clear resolved issues on recalculation', () => {
  const broken = { ...completeWine, producer: '', size: '' };
  const changes = parseCatalogueCorrection({ producer: ' Correct Producer ', size: '750ml' });
  assert.equal(changes.producer, 'Correct Producer');
  const report = buildWineDataQualityReport({ wines: [{ ...broken, ...changes }], inventoryRows: [{ wine_id: broken.id, quantity: 1 }] });
  assert.equal(report.issues.length, 0);
});
test('quick corrections reject stock, tenant and integration mapping changes', () => {
  for (const key of ['quantity', 'organization_id', 'property_id', 'business_product_number', 'business_barcode', 'price', 'is_active']) assert.throws(() => parseCatalogueCorrection({ [key]: 'anything' }), /cannot be changed/);
  assert.throws(() => parseCatalogueCorrection({ size: 'unknown' }), /valid bottle size/);
  assert.throws(() => parseCatalogueCorrection({ name: '' }), /required/);
});
test('a valuation link is a valid source identity', () => {
  const report=buildWineDataQualityReport({wines:[{...completeWine,sku:null}],inventoryRows:[{wine_id:'wine-1',quantity:1}],valuationRows:[{wine_id:'wine-1',external_product_id:'3153'}]});
  assert.equal(report.counts.source || 0,0);
});
test('archived duplicate no longer flags the retained stocked record', () => {
  const report=buildWineDataQualityReport({wines:[completeWine,{...completeWine,id:'old',is_active:false}],inventoryRows:[{wine_id:'wine-1',quantity:1}]});assert.equal(report.counts.duplicates || 0,0);
});
