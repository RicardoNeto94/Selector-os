import test from "node:test";
import assert from "node:assert/strict";
import {
  bottleFormatForWine,
  bottleQuantity,
  guestServiceReadiness,
  hasAvailableStock,
  inventoryStockState,
  isGuestWineAvailable,
  isLowStock,
  isOutOfStock,
  normalizeWineCategory,
  parseBottleSizeCl,
  positiveBottleQuantity,
  summarizeBottleFormats,
  sumNetBottles,
  sumPositiveBottles,
} from "../src/lib/wineInventory.js";

test("normalizes common bottle-size units", () => {
  assert.equal(parseBottleSizeCl("37.5cl"), 37.5);
  assert.equal(parseBottleSizeCl("750 ml"), 75);
  assert.equal(parseBottleSizeCl("1.5L Magnum"), 150);
  assert.equal(parseBottleSizeCl("no size"), null);
});

test("classifies small, standard, large and unknown formats", () => {
  assert.equal(bottleFormatForWine({ size: "50cl" }), "small");
  assert.equal(bottleFormatForWine({ size: "72cl" }), "standard");
  assert.equal(bottleFormatForWine({ name: "Example Cuvée 150cl" }), "large");
  assert.equal(bottleFormatForWine({ name: "Example Cuvée" }), "unknown");
});

test("format totals reconcile and fractional stock remains a subset", () => {
  const summary = summarizeBottleFormats([
    { size: "37.5cl", stock: 2 },
    { size: "75cl", stock: 3.25 },
    { size: "180cl", stock: 1 },
    { name: "Unknown format", stock: 0.5 },
  ]);

  assert.deepEqual(summary, {
    small: 2,
    standard: 3.25,
    large: 1,
    unknown: 0.5,
    fractional: 0.75,
    total: 6.75,
  });
});

test("counts each Compucash stock unit as one bottle regardless of bottle size", () => {
  const inventory = [
    { quantity: 1, size: "37.5cl" },
    { quantity: 2.5, size: "75cl" },
    { quantity: 1, size: "180cl" },
  ];

  assert.equal(sumPositiveBottles(inventory), 4.5);
});

test("preserves fractional bottles and removes insignificant database residue", () => {
  assert.equal(bottleQuantity(2.37), 2.37);
  assert.equal(positiveBottleQuantity(0.1), 0.1);
  assert.equal(positiveBottleQuantity(0), 0);
  assert.equal(bottleQuantity(0.0004), 0);
  assert.equal(bottleQuantity(-0.0004), 0);
});

test("uses one availability rule for whole bottles, BTG fractions and residue", () => {
  assert.equal(hasAvailableStock(1), true);
  assert.equal(hasAvailableStock(0.1), true);
  assert.equal(hasAvailableStock(0.0004), false);
  assert.equal(hasAvailableStock(0), false);
  assert.equal(hasAvailableStock(-1), false);
  assert.equal(isOutOfStock(0.0004), true);
  assert.equal(isOutOfStock(-1), true);
});

test("classifies low stock only when a positive physical balance exists", () => {
  assert.equal(isLowStock(0.1), true);
  assert.equal(isLowStock(2), true);
  assert.equal(isLowStock(2.01), false);
  assert.equal(isLowStock(0), false);
  assert.equal(inventoryStockState(0), "out");
  assert.equal(inventoryStockState(0.1), "low");
  assert.equal(inventoryStockState(3), "available");
});

test("guest readiness requires stock and prices for each enabled service", () => {
  assert.equal(isGuestWineAvailable({ quantity: 0.1, listed: true }), true);
  assert.equal(isGuestWineAvailable({ quantity: 0, listed: true }), false);
  assert.equal(isGuestWineAvailable({ quantity: 2, listed: false }), false);

  assert.deepEqual(
    guestServiceReadiness({
      quantity: 2,
      serviceType: "both",
      bottlePrice: 120,
      glassPrice: null,
    }),
    {
      available: true,
      bottleEnabled: true,
      glassEnabled: true,
      bottleReady: true,
      glassReady: false,
      ready: false,
    }
  );
});

test("negative exceptions do not cancel physical bottles", () => {
  const inventory = [{ quantity: 3 }, { quantity: -2 }, { quantity: 0.5 }];

  assert.equal(sumPositiveBottles(inventory), 3.5);
  assert.equal(sumNetBottles(inventory), 1.5);
  assert.equal(positiveBottleQuantity(-2), 0);
});

test("non-alcoholic identity overrides an incorrect imported wine type", () => {
  assert.equal(
    normalizeWineCategory({
      name: "Muri Koji Rice Series 1 Non-Alcoholic White",
      wine_type: "sake",
    }),
    "non-alcoholic"
  );
});
