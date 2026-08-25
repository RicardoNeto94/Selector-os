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
    const { data, error } = await client
      .from(table)
      .select(columns)
      .range(from, from + 999);
    if (error) throw error;
    rows.push(...(data || []));
    if ((data || []).length < 1000) return rows;
  }
}

async function readJson(response, label) {
  const body = await response.text();
  if (!response.ok) throw new Error(`${label} failed (${response.status})`);
  return body ? JSON.parse(body) : {};
}

const token = await readJson(
  await fetch(required("COMPUCASH_TOKEN_URL"), {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      scope: "cc5api",
      client_id: required("COMPUCASH_CLIENT_ID", "COMPUCASH_IDENTITY"),
      client_secret: required("COMPUCASH_CLIENT_SECRET", "COMPUCASH_SECRET"),
    }),
  }),
  "OAuth token"
);

const productQuery = new URLSearchParams({
  IsActive: "1",
  AllowBron: "-1",
  ProductsWithoutPrices: "true",
  LanguageCode: "et",
  StoreIds: COMPUCASH_STORE_TARGETS.map((row) => row.externalStoreId).join(","),
});
const productPayload = await readJson(
  await fetch(
    `${required("COMPUCASH_BASE_URL").replace(/\/+$/, "")}/Products?${productQuery}`,
    {
      headers: {
        authorization: `Bearer ${token.access_token}`,
        "accept-language": "et",
        "x-api-version": "1.0",
      },
    }
  ),
  "Products"
);

const supabase = createClient(
  required("NEXT_PUBLIC_SUPABASE_URL"),
  required("SUPABASE_SERVICE_ROLE_KEY"),
  { auth: { persistSession: false, autoRefreshToken: false } }
);
const [wines, aliases] = await Promise.all([
  fetchAll(
    supabase,
    "wines",
    "id,sku,business_product_number,business_barcode"
  ),
  fetchAll(
    supabase,
    "wine_business_aliases",
    "wine_id,business_product_id,business_product_number,business_barcode"
  ),
]);
const plan = buildCompuCashInventoryPlan({
  rawProducts: productPayload.data || [],
  storeTargets: COMPUCASH_STORE_TARGETS,
  wines,
  aliases,
});

const { data: rowsUpdated, error: updateError } = await supabase.rpc(
  "apply_compucash_inventory_valuations",
  { p_rows: plan.valuations }
);
if (updateError) throw updateError;

const positiveRows = plan.valuations.filter((row) => row.quantity_snapshot > 0);
const costRows = positiveRows.filter((row) => row.inventory_cost_value !== null);
const saleRows = positiveRows.filter((row) => row.unit_sale_price_gross !== null);
const totalQuantity = positiveRows.reduce(
  (total, row) => total + row.quantity_snapshot,
  0
);
const costCoveredQuantity = positiveRows.reduce(
  (total, row) => total + row.cost_covered_quantity,
  0
);
const inventoryCost = costRows.reduce(
  (total, row) => total + row.inventory_cost_value,
  0
);
const potentialGrossRevenue = saleRows.reduce(
  (total, row) => total + row.quantity_snapshot * row.unit_sale_price_gross,
  0
);
const potentialNetRevenue = saleRows.reduce(
  (total, row) => total + row.quantity_snapshot * row.unit_sale_price_net,
  0
);

console.log(JSON.stringify({
  productsReceived: plan.productsReceived,
  productsMatched: plan.productsMatched,
  unmatchedProducts: plan.unmatchedProducts.length,
  valuationRowsPlanned: plan.valuations.length,
  valuationRowsUpdated: rowsUpdated ?? 0,
  positiveValuationRows: positiveRows.length,
  costCoveredRows: costRows.length,
  salePriceCoveredRows: saleRows.length,
  totalQuantity: Number(totalQuantity.toFixed(2)),
  costCoveredQuantity: Number(costCoveredQuantity.toFixed(2)),
  inventoryCost: Number(inventoryCost.toFixed(2)),
  potentialNetRevenue: Number(potentialNetRevenue.toFixed(2)),
  potentialGrossRevenue: Number(potentialGrossRevenue.toFixed(2)),
}, null, 2));
