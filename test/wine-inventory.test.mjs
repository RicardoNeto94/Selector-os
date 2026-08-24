import test from "node:test";
import assert from "node:assert/strict";
import {
  bottleQuantity,
  normalizeWineCategory,
  positiveBottleQuantity,
  sumNetBottles,
  sumPositiveBottles,
} from "../src/lib/wineInventory.js";

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
