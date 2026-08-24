import { createClient } from "@supabase/supabase-js";
import { COMPUCASH_STORE_TARGETS } from "../src/lib/compucash/constants.js";
import { buildCompuCashInventoryPlan } from "../src/lib/compucash/preview.js";

const required = (name, fallback) => {
  const value = process.env[name] || (fallback ? process.env[fallback] : null);
  if (!value) throw new Error(`Missing ${name}`);
  return value;
};

async function fetchAll(client, table, columns) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await client.from(table).select(columns).range(from, from + 999);
    if (error) throw error;
    rows.push(...(data || []));
    if ((data || []).length < 1000) return rows;
  }
}

async function readJson(response, label) {
  const text = await response.text();
  if (!response.ok) throw new Error(`${label} failed (${response.status})`);
  return text ? JSON.parse(text) : {};
}

const token = await readJson(await fetch(required("COMPUCASH_TOKEN_URL"), {
  method: "POST",
  headers: { "content-type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    grant_type: "client_credentials",
    scope: "cc5api",
    client_id: required("COMPUCASH_CLIENT_ID", "COMPUCASH_IDENTITY"),
    client_secret: required("COMPUCASH_CLIENT_SECRET", "COMPUCASH_SECRET"),
  }),
}), "OAuth token");

const query = new URLSearchParams({
  IsActive: "1",
  AllowBron: "-1",
  ProductsWithoutPrices: "true",
  LanguageCode: "et",
  StoreIds: COMPUCASH_STORE_TARGETS.map((row) => row.externalStoreId).join(","),
});
const productPayload = await readJson(await fetch(
  `${required("COMPUCASH_BASE_URL").replace(/\/+$/, "")}/Products?${query}`,
  { headers: { authorization: `Bearer ${token.access_token}`, "accept-language": "et", "x-api-version": "1.0" } },
), "Products");

const supabase = createClient(
  required("NEXT_PUBLIC_SUPABASE_URL"),
  required("SUPABASE_SERVICE_ROLE_KEY"),
  { auth: { persistSession: false, autoRefreshToken: false } },
);
const [wines, aliases, inventory] = await Promise.all([
  fetchAll(supabase, "wines", "id,name,producer,vintage,sku,business_product_number,business_barcode"),
  fetchAll(supabase, "wine_business_aliases", "wine_id,business_product_id,business_product_number,business_barcode"),
  fetchAll(supabase, "wine_inventory", "wine_id,location_id,quantity"),
]);
const products = productPayload.data || [];
const plan = buildCompuCashInventoryPlan({
  rawProducts: products,
  storeTargets: COMPUCASH_STORE_TARGETS,
  wines,
  aliases,
});

const normalize = (value) => String(value || "")
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
  .replace(/\b(?:19|20)\d{2}\b|\bnv\b|\b\d+(?:[.,]\d+)?\s*cl\b/g, " ")
  .replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
const tokens = (value) => new Set(normalize(value).split(" ").filter(Boolean));
const similarity = (left, right) => {
  const a = tokens(left);
  const b = tokens(right);
  return [...a].filter((token) => b.has(token)).length / Math.max(a.size, b.size, 1);
};

const unmatched = plan.unmatchedProducts.map((product) => ({
  externalProductId: product.externalProductId,
  productNumber: product.productNumber,
  name: product.name,
  stock: product.stock.filter((row) => Math.abs(row.quantity) > 0.000001),
  candidates: wines
    .map((wine) => ({
      wineId: wine.id,
      name: wine.name,
      producer: wine.producer,
      vintage: wine.vintage,
      businessProductNumber: wine.business_product_number,
      score: similarity(product.name, `${wine.producer || ""} ${wine.name || ""}`),
    }))
    .filter((row) => row.score >= 0.45)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5),
}));

const mappedLocationIds = new Set(COMPUCASH_STORE_TARGETS.map((row) => row.locationId));
const plannedByKey = new Map(
  plan.rows.map((row) => [`${row.wineId}:${row.locationId}`, Number(row.quantity || 0)])
);
const currentByKey = new Map(
  inventory
    .filter((row) => mappedLocationIds.has(row.location_id))
    .map((row) => [`${row.wine_id}:${row.location_id}`, Number(row.quantity || 0)])
);
const allKeys = new Set([...plannedByKey.keys(), ...currentByKey.keys()]);
const differences = [...allKeys]
  .map((key) => {
    const plannedQuantity = plannedByKey.get(key) || 0;
    const currentQuantity = currentByKey.get(key) || 0;
    const [wineId, locationId] = key.split(":");
    return {
      wineId,
      locationId,
      plannedQuantity,
      currentQuantity,
      difference: currentQuantity - plannedQuantity,
    };
  })
  .filter((row) => Math.abs(row.difference) >= 0.001)
  .sort((left, right) => Math.abs(right.difference) - Math.abs(left.difference));

const totalsByLocation = (rows, getLocationId, getQuantity) => {
  const totals = new Map();
  for (const row of rows) {
    const locationId = getLocationId(row);
    if (!mappedLocationIds.has(locationId)) continue;
    const quantity = Number(getQuantity(row) || 0);
    const current = totals.get(locationId) || { positiveBottles: 0, netBottles: 0 };
    current.positiveBottles += Math.max(0, Math.abs(quantity) < 0.001 ? 0 : quantity);
    current.netBottles += Math.abs(quantity) < 0.001 ? 0 : quantity;
    totals.set(locationId, current);
  }
  return Object.fromEntries([...totals.entries()].sort(([left], [right]) => left.localeCompare(right)));
};

const unmatchedPositiveBottles = unmatched.reduce(
  (total, product) => total + product.stock.reduce(
    (stockTotal, row) => stockTotal + Math.max(0, Number(row.quantity || 0)),
    0
  ),
  0
);

console.log(JSON.stringify({
  summary: {
    productsReceived: plan.productsReceived,
    productsEligible: plan.productsEligible,
    productsMatched: plan.productsMatched,
    unmatchedProducts: unmatched.length,
    unmatchedPositiveBottles,
    differingInventoryRows: differences.length,
  },
  plannedTotalsByLocation: totalsByLocation(plan.rows, (row) => row.locationId, (row) => row.quantity),
  currentTotalsByLocation: totalsByLocation(inventory, (row) => row.location_id, (row) => row.quantity),
  differences: differences.slice(0, 100),
  unmatched,
  negativeInventory: inventory.filter((row) => Number(row.quantity) < 0),
}, null, 2));
