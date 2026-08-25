import { COMPUCASH_PHYSICAL_WINE_GROUP_IDS } from "./constants.js";

export function normalizeCompuCashStore(store) {
  if (!Number.isInteger(store?.storeId)) throw new Error("Invalid Compucash store ID.");
  return {
    externalStoreId: String(store.storeId),
    name: String(store.storeName ?? "").trim(),
  };
}

export function normalizeCompuCashProduct(product) {
  if (!Number.isInteger(product?.productId)) throw new Error("Invalid Compucash product ID.");
  const externalProductId = String(product.productId);
  // Compucash parent products can expose storeQuantities that aggregate every
  // product variation (for example a physical 37.5cl bottle plus its BTG CL
  // variation). When the API exposes the base product as a variation whose ID
  // matches the parent product ID, that variation is the authoritative physical
  // balance. Falling back preserves products that have no variation payload.
  const baseVariation = (product.productVariations ?? []).find(
    (variation) => Number(variation?.productId) === product.productId
  );
  const authoritativeStoreQuantities =
    baseVariation?.storeQuantities ?? product.storeQuantities ?? [];
  const stock = authoritativeStoreQuantities.map((row) => ({
    externalProductId,
    externalStoreId: String(row.storeId),
    quantity: Number(row.quantity),
    storagePrice: row.storagePrice == null ? null : Number(row.storagePrice),
  }));
  if (stock.some((row) => !Number.isFinite(row.quantity))) {
    throw new Error(`Invalid quantity for Compucash product ${externalProductId}.`);
  }
  return {
    externalProductId,
    productNumber: nullable(product.productNumber),
    barcode: nullable(product.productBarcode),
    name: nullable(product.productName),
    productGroupId: product.productGroupId == null ? null : String(product.productGroupId),
    stock,
  };
}

export function getProductExclusionReason(product) {
  if (!COMPUCASH_PHYSICAL_WINE_GROUP_IDS.has(product.productGroupId)) return "non_physical_wine_group";
  const name = product.name ?? "";
  // Match standalone serving measures only. The previous word-boundary rule
  // incorrectly treated the trailing `5cl` in a physical `37.5cl` half-bottle
  // as a by-the-glass portion.
  if (/(?<![\d.])(?:5|6|12|15)\s*cl\b/i.test(name)) return "by_the_glass_serving";
  if (/^\s*\(\s*c\s*\)/i.test(name) || /\(\s*c\s*\)\s*$/i.test(name)) {
    return "generic_placeholder";
  }
  if (/^\s*sake\s+pairing\s*$/i.test(name)) return "pairing_package";
  return null;
}

export function buildUniqueIndex(rows, fields) {
  const index = new Map();
  for (const row of rows) {
    for (const field of fields) {
      const value = normalizeIdentifier(row[field]);
      if (!value) continue;
      index.set(value, [...(index.get(value) ?? []), row.wine_id ?? row.id]);
    }
  }
  return index;
}

export function chooseWineMatch(product, indexes) {
  const candidates = [
    ["external_product_id", product.externalProductId, indexes.byExternalProductId],
    ["business_product_number", product.productNumber, indexes.byProductNumber],
    ["sku", product.productNumber, indexes.bySku],
    ["barcode", product.barcode, indexes.byBarcode],
  ];
  for (const [method, rawValue, index] of candidates) {
    const value = normalizeIdentifier(rawValue);
    if (!value) continue;
    const matches = [...new Set(index.get(value) ?? [])];
    if (matches.length === 1) return { method, wineId: matches[0], conflict: false };
    if (matches.length > 1) return { method, wineId: null, conflict: true, candidates: matches };
  }
  return { method: "unmatched", wineId: null, conflict: false };
}

export function buildCompuCashPreview({ rawStores, rawProducts, storeTargets, wines, aliases = [] }) {
  const stores = rawStores.map(normalizeCompuCashStore);
  const products = rawProducts.map(normalizeCompuCashProduct);
  const targets = new Map(storeTargets.map((row) => [String(row.externalStoreId), row]));
  const aliasesAndWines = [...wines, ...aliases];
  const indexes = {
    byExternalProductId: buildUniqueIndex(aliasesAndWines, ["business_product_id"]),
    byProductNumber: buildUniqueIndex(aliasesAndWines, ["business_product_number"]),
    bySku: buildUniqueIndex(wines, ["sku"]),
    byBarcode: buildUniqueIndex(aliasesAndWines, ["business_barcode", "barcode"]),
  };
  const eligible = [];
  const excluded = {};
  for (const product of products) {
    const reason = getProductExclusionReason(product);
    if (reason) excluded[reason] = (excluded[reason] ?? 0) + 1;
    else eligible.push(product);
  }
  const matches = eligible.map((product) => ({ product, match: chooseWineMatch(product, indexes) }));
  const snapshots = matches.flatMap(({ product, match }) =>
    product.stock
      .filter((row) => targets.has(row.externalStoreId))
      .map((row) => ({
        ...row,
        wineId: match.wineId,
        locationId: targets.get(row.externalStoreId).locationId,
        accepted: Boolean(match.wineId),
      }))
  );
  const storeIdsReceived = new Set(stores.map((store) => store.externalStoreId));
  return {
    mode: "preview_only",
    generatedAt: new Date().toISOString(),
    writesPerformed: false,
    totals: {
      storesReceived: stores.length,
      configuredStores: storeTargets.length,
      configuredStoresMissing: storeTargets.filter((row) => !storeIdsReceived.has(String(row.externalStoreId))).length,
      productsReceived: products.length,
      productsEligible: eligible.length,
      productsExcluded: products.length - eligible.length,
      productsMatched: matches.filter((row) => row.match.wineId).length,
      productsUnmatched: matches.filter((row) => row.match.method === "unmatched").length,
      productConflicts: matches.filter((row) => row.match.conflict).length,
      stockRowsAccepted: snapshots.filter((row) => row.accepted).length,
      acceptedQuantity: snapshots.filter((row) => row.accepted).reduce((sum, row) => sum + row.quantity, 0),
    },
    excluded,
    missingConfiguredStores: storeTargets.filter((row) => !storeIdsReceived.has(String(row.externalStoreId))),
    renamedStores: stores.filter((store) => {
      const target = targets.get(store.externalStoreId);
      return target && target.expectedName !== store.name;
    }).map((store) => ({ ...store, expectedName: targets.get(store.externalStoreId).expectedName })),
    conflicts: matches.filter((row) => row.match.conflict).slice(0, 50).map(({ product, match }) => ({
      externalProductId: product.externalProductId,
      productNumber: product.productNumber,
      name: product.name,
      candidates: match.candidates,
    })),
    unmatchedProducts: matches.filter((row) => row.match.method === "unmatched").slice(0, 100).map(({ product }) => ({
      externalProductId: product.externalProductId,
      productNumber: product.productNumber,
      barcode: product.barcode,
      name: product.name,
    })),
    acceptedStockSample: snapshots.filter((row) => row.accepted).slice(0, 100),
  };
}

export function buildCompuCashInventoryPlan({ rawProducts, storeTargets, wines, aliases = [] }) {
  const products = rawProducts.map(normalizeCompuCashProduct);
  const eligibleProducts = products.filter((product) => !getProductExclusionReason(product));
  const aliasesAndWines = [...wines, ...aliases];
  const indexes = {
    byExternalProductId: buildUniqueIndex(aliasesAndWines, ["business_product_id"]),
    byProductNumber: buildUniqueIndex(aliasesAndWines, ["business_product_number"]),
    bySku: buildUniqueIndex(wines, ["sku"]),
    byBarcode: buildUniqueIndex(aliasesAndWines, ["business_barcode", "barcode"]),
  };
  const targetsByStore = new Map(
    storeTargets.map((target) => [String(target.externalStoreId), target])
  );
  const locationIds = [...new Set(storeTargets.map((target) => target.locationId))];
  const quantities = new Map();
  const matchedWineIds = new Set();
  const productsByWine = new Map();
  const sourceGroupsByWine = new Map();
  const unmatchedProducts = [];
  const conflicts = [];

  for (const product of eligibleProducts) {
    const match = chooseWineMatch(product, indexes);
    if (match.conflict) {
      conflicts.push({ product, candidates: match.candidates });
      continue;
    }
    if (!match.wineId) {
      unmatchedProducts.push(product);
      continue;
    }

    matchedWineIds.add(match.wineId);
    sourceGroupsByWine.set(match.wineId, {
      wine_id: match.wineId,
      product_group_id: product.productGroupId,
    });
    productsByWine.set(match.wineId, [
      ...(productsByWine.get(match.wineId) ?? []),
      {
        externalProductId: product.externalProductId,
        productNumber: product.productNumber,
        name: product.name,
      },
    ]);
    for (const locationId of locationIds) {
      const key = `${match.wineId}|${locationId}`;
      if (!quantities.has(key)) quantities.set(key, 0);
    }
    for (const stock of product.stock) {
      const target = targetsByStore.get(stock.externalStoreId);
      if (!target) continue;
      const key = `${match.wineId}|${target.locationId}`;
      quantities.set(key, (quantities.get(key) ?? 0) + stock.quantity);
    }
  }

  const rows = [...quantities.entries()]
    .map(([key, quantity]) => {
      const [wineId, locationId] = key.split("|");
      return { wineId, locationId, quantity };
    })
    .sort((a, b) =>
      `${a.locationId}|${a.wineId}`.localeCompare(`${b.locationId}|${b.wineId}`)
    );

  return {
    rows,
    productsReceived: products.length,
    productsEligible: eligibleProducts.length,
    productsMatched: eligibleProducts.length - unmatchedProducts.length - conflicts.length,
    matchedWines: matchedWineIds.size,
    unmatchedProducts,
    conflicts,
    duplicateWineMatches: [...productsByWine.entries()]
      .filter(([, matchedProducts]) => matchedProducts.length > 1)
      .map(([wineId, matchedProducts]) => ({ wineId, products: matchedProducts })),
    wineSources: [...sourceGroupsByWine.values()].sort((a, b) =>
      a.wine_id.localeCompare(b.wine_id)
    ),
  };
}

export function validateCompuCashSync({ preview, plan }) {
  const failures = [];
  const minimumProducts = Number(process.env.COMPUCASH_MINIMUM_PHYSICAL_PRODUCTS || 500);
  const minimumMatchRatio = Number(process.env.COMPUCASH_MINIMUM_MATCH_RATIO || 0.85);
  const matchRatio = plan.productsEligible
    ? plan.productsMatched / plan.productsEligible
    : 0;

  if (preview.totals.configuredStoresMissing > 0) failures.push("configured_store_missing");
  if (preview.totals.productConflicts > 0) failures.push("identifier_conflict");
  if (plan.duplicateWineMatches.length > 0) failures.push("multiple_products_match_one_wine");
  if (plan.productsEligible < minimumProducts) failures.push("product_count_below_minimum");
  if (matchRatio < minimumMatchRatio) failures.push("match_ratio_below_minimum");
  if (!plan.rows.length) failures.push("empty_inventory_plan");

  return {
    safe: failures.length === 0,
    failures,
    matchRatio,
    minimumProducts,
    minimumMatchRatio,
  };
}

function normalizeIdentifier(value) {
  return String(value ?? "").trim().toLowerCase();
}

function nullable(value) {
  const text = String(value ?? "").trim();
  return text || null;
}
