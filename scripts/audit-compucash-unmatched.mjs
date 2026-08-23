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

console.log(JSON.stringify({
  summary: {
    productsReceived: plan.productsReceived,
    productsEligible: plan.productsEligible,
    productsMatched: plan.productsMatched,
    unmatchedProducts: unmatched.length,
  },
  unmatched,
  negativeInventory: inventory.filter((row) => Number(row.quantity) < 0),
}, null, 2));
