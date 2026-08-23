import { createClient } from "@supabase/supabase-js";

const KOYO_LOCATION_ID = "8686f110-ef73-4d28-802e-c0944e0dea24";
const KOYO_MENU_ID = "d1806d52-a670-40cd-bbe8-e7939716ae0f";
const BTG_GROUP_ID = 336;
const SAKE_NAMES = [
  "Hatsumago Densho Kimoto Honjozo",
  "Takanome Hiire",
  "Nanbu Bijin Ginjo",
];
const PRICE_FIXES = new Map([
  ["Dalrymple Coal River Valley Pinot Noir", 21],
  ["Clemens Busch Nonnengarten Riesling", 19],
  ["Chateau Lynch-Bages Echo de Lynch Bages", 18],
  ["Chateau Tronquoy-Lalande", 15],
  ["Clemens Busch Punderich Riesling Kabinett", 14],
  ["Thymiopoulos Rose de Xinomavro", 12],
]);

function required(name, ...fallbacks) {
  const value = [process.env[name], ...fallbacks.map((key) => process.env[key])].find(Boolean);
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function normalizeName(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(?:19|20)\d{2}\b/g, " ")
    .replace(/\bnv\b/g, " ")
    .replace(/\b\d+(?:[.,]\d+)?\s*cl\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function servingCl(name) {
  const match = String(name ?? "").match(/(?:^|\s)(\d+(?:[.,]\d+)?)\s*cl\b/i);
  return match ? Number(match[1].replace(",", ".")) : null;
}

async function readJson(response, label) {
  const text = await response.text();
  let payload;
  try { payload = text ? JSON.parse(text) : {}; } catch { throw new Error(`${label} returned invalid JSON`); }
  if (!response.ok) throw new Error(`${label} failed (${response.status}): ${text.slice(0, 200)}`);
  return payload;
}

async function fetchCompucashProducts() {
  const tokenPayload = await readJson(await fetch(required("COMPUCASH_TOKEN_URL"), {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      scope: "cc5api",
      client_id: required("COMPUCASH_CLIENT_ID", "COMPUCASH_IDENTITY"),
      client_secret: required("COMPUCASH_CLIENT_SECRET", "COMPUCASH_SECRET"),
    }),
  }), "OAuth token");
  const query = new URLSearchParams({ IsActive: "1", AllowBron: "-1", ProductsWithoutPrices: "true", LanguageCode: "et" });
  const payload = await readJson(await fetch(`${required("COMPUCASH_BASE_URL").replace(/\/+$/, "")}/Products?${query}`, {
    headers: { authorization: `Bearer ${tokenPayload.access_token}`, "accept-language": "et", "x-api-version": "1.0" },
  }), "Products");
  return payload.data ?? [];
}

async function fetchAll(supabase, table, columns) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from(table).select(columns).range(from, from + 999);
    if (error) throw error;
    rows.push(...data);
    if (data.length < 1000) return rows;
  }
}

const supabase = createClient(
  required("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL"),
  required("SUPABASE_SERVICE_ROLE_KEY"),
  { auth: { persistSession: false, autoRefreshToken: false } }
);

const [products, wines, aliases, koyoInventory, menuItems] = await Promise.all([
  fetchCompucashProducts(),
  fetchAll(supabase, "wines", "id,name"),
  fetchAll(supabase, "wine_business_aliases", "id,wine_id,business_product_id"),
  supabase.from("wine_inventory").select("wine_id,quantity").eq("location_id", KOYO_LOCATION_ID).gt("quantity", 0).then(({ data, error }) => { if (error) throw error; return data; }),
  supabase.from("wine_menu_items").select("id,wine_id,glass_price,service_type,wine:wines(name)").eq("wine_menu_id", KOYO_MENU_ID).then(({ data, error }) => { if (error) throw error; return data; }),
]);

const winesByNormalizedName = new Map();
for (const wine of wines) {
  const key = normalizeName(wine.name);
  if (!winesByNormalizedName.has(key)) winesByNormalizedName.set(key, []);
  winesByNormalizedName.get(key).push(wine);
}
const aliasProductIds = new Set(aliases.map((row) => String(row.business_product_id ?? "")).filter(Boolean));
const btgProducts = products.filter((product) => Number(product.productGroupId ?? product.productGroup?.id) === BTG_GROUP_ID);
const aliasRows = [];
const unresolved = [];
for (const product of btgProducts) {
  const productId = String(product.productId ?? product.id ?? "");
  if (!productId || aliasProductIds.has(productId)) continue;
  const matches = winesByNormalizedName.get(normalizeName(product.productName ?? product.name)) ?? [];
  if (matches.length !== 1) {
    unresolved.push({ productId, name: product.productName ?? product.name, matches: matches.length });
    continue;
  }
  const prices = product.salePrices ?? product.salesPrices ?? [];
  const firstPrice = prices.find((entry) => Number.isFinite(Number(entry.price ?? entry.salePrice)));
  aliasRows.push({
    wine_id: matches[0].id,
    business_product_id: productId,
    business_product_number: null,
    business_barcode: null,
    business_product_name: product.productName ?? product.name,
    product_group: "BY THE GLASS",
    serving_cl: servingCl(product.productName ?? product.name),
    sales_price: firstPrice ? Number(firstPrice.price ?? firstPrice.salePrice) : null,
    source_type: "compucash_btg_exact_name",
  });
}
if (aliasRows.length) {
  const { error } = await supabase.from("wine_business_aliases").insert(aliasRows);
  if (error) throw error;
}

const positiveKoyoWineIds = new Set(koyoInventory.map((row) => row.wine_id));
const existingKoyoWineIds = new Set(menuItems.map((row) => row.wine_id));
const sakeRows = wines
  .filter((wine) => SAKE_NAMES.includes(wine.name.trim()))
  .filter((wine) => positiveKoyoWineIds.has(wine.id) && !existingKoyoWineIds.has(wine.id))
  .map((wine) => ({ wine_menu_id: KOYO_MENU_ID, wine_id: wine.id, quantity: 0, description: "", price_override: null, service_type: "bottle", glass_price: null }));
if (sakeRows.length) {
  const { error } = await supabase.from("wine_menu_items").insert(sakeRows);
  if (error) throw error;
}

const priceUpdates = [];
const allMenuItems = await fetchAll(supabase, "wine_menu_items", "id,wine_id,glass_price,service_type");
const wineNameById = new Map(wines.map((wine) => [wine.id, wine.name]));
for (const item of allMenuItems) {
  const price = PRICE_FIXES.get(wineNameById.get(item.wine_id));
  if (price == null || item.glass_price != null || !["glass", "both"].includes(item.service_type)) continue;
  const { error } = await supabase.from("wine_menu_items").update({ glass_price: price }).eq("id", item.id).is("glass_price", null);
  if (error) throw error;
  priceUpdates.push({ name: wineNameById.get(item.wine_id), price });
}

console.log(JSON.stringify({
  btg: { received: btgProducts.length, aliasesInserted: aliasRows.length, unresolved: unresolved.length },
  koyo: { positiveSakesRequested: SAKE_NAMES.length, menuItemsInserted: sakeRows.length },
  glassPrices: { updated: priceUpdates.length, rows: priceUpdates },
}, null, 2));
