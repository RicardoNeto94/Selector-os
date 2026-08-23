import { createClient } from "@supabase/supabase-js";

const MENU_ID = "d1806d52-a670-40cd-bbe8-e7939716ae0f";
const SAKE_TARGETS = new Map([
  ["3994", "5bb68f00-74f6-4094-9fd7-5a5f36b44fac"],
  ["3851", "4e788091-02c6-4df5-b4b1-7393016dc80b"],
  ["3389", "3ca8087c-f4bb-4173-899e-e33140d10c73"],
  ["4273", "37542aac-9c98-443c-a836-60be583abfff"],
  ["3852", "92c1b398-e31d-4ecb-a58e-7556bc645354"],
  ["3992", "e70510bf-c8d6-4a25-a9e2-5bebed0ecc5a"],
  ["3996", "64d4d07d-d9d7-4af6-ae6b-707ffe1ac002"],
  ["6377", "fc2e9ef2-dadd-47a1-9e8a-1c4fcd0d0b28"],
]);
const EXPLICIT_WINE_TARGETS = new Map([
  ["3846", "97e29650-91ac-4ed4-b505-7f84576661b0"],
  ["1320", "5a22701f-fb9c-4aab-9d95-38a206fb9ad5"],
]);
const BASELINE = [
  ["12", 12, 18], ["3768", 12, 19], ["1325", 12, 21],
  ["3846", 12, 23], ["2179", 12, 24], ["1320", 12, 14],
  ["6422", 15, 19], ["1957", 15, 17], ["6434", 15, 32],
  ["5727", 15, 24], ["1351", 15, 14],
  ["3994", 6, 11], ["3851", 6, 13], ["3389", 6, 8],
  ["4273", 6, 11], ["3852", 6, 9], ["3992", 6, 10],
  ["3996", 6, 11], ["6377", 6, 20],
];

const required = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
};
const supabase = createClient(required("NEXT_PUBLIC_SUPABASE_URL"), required("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false },
});

const ids = BASELINE.map(([id]) => id);
const { data: aliases, error: aliasError } = await supabase
  .from("wine_business_aliases")
  .select("wine_id,business_product_id")
  .in("business_product_id", ids);
if (aliasError) throw aliasError;
const wineByProduct = new Map(aliases.map((row) => [String(row.business_product_id), row.wine_id]));
for (const [productId, wineId] of SAKE_TARGETS) wineByProduct.set(productId, wineId);
for (const [productId, wineId] of EXPLICIT_WINE_TARGETS) wineByProduct.set(productId, wineId);
const missing = ids.filter((id) => !wineByProduct.has(id));
if (missing.length) throw new Error(`Missing base-wine links for products: ${missing.join(", ")}`);

for (const [productId, wineId] of SAKE_TARGETS) {
  const existing = aliases.find((row) => String(row.business_product_id) === productId);
  if (existing) continue;
  const { error } = await supabase.from("wine_business_aliases").insert({
    wine_id: wineId,
    business_product_id: productId,
    business_product_number: null,
    business_barcode: null,
    business_product_name: `Koyo curated sake serving ${productId}`,
    product_group: "SAKE & SHOCHU",
    serving_cl: productId === "3992" ? 5 : 6,
    sales_price: BASELINE.find(([id]) => id === productId)?.[2] ?? null,
    source_type: "winehub_koyo_baseline",
  });
  if (error) throw error;
}
for (const [productId, wineId] of EXPLICIT_WINE_TARGETS) {
  const existing = aliases.find((row) => String(row.business_product_id) === productId);
  if (existing) continue;
  const [, servingCl, price] = BASELINE.find(([id]) => id === productId);
  const { error } = await supabase.from("wine_business_aliases").insert({
    wine_id: wineId,
    business_product_id: productId,
    business_product_number: null,
    business_barcode: null,
    business_product_name: `Koyo curated wine serving ${productId}`,
    product_group: "BY THE GLASS",
    serving_cl: servingCl,
    sales_price: price,
    source_type: "winehub_koyo_baseline",
  });
  if (error) throw error;
}

const targetWineIds = [...new Set(ids.map((id) => wineByProduct.get(id)))];
const { data: currentItems, error: itemsError } = await supabase
  .from("wine_menu_items")
  .select("id,wine_id,service_type")
  .eq("wine_menu_id", MENU_ID);
if (itemsError) throw itemsError;
const itemByWine = new Map(currentItems.map((item) => [item.wine_id, item]));

for (const item of currentItems) {
  if (["glass", "both"].includes(item.service_type) && !targetWineIds.includes(item.wine_id)) {
    const { error } = await supabase.from("wine_menu_items")
      .update({ service_type: "bottle", glass_price: null }).eq("id", item.id);
    if (error) throw error;
  }
}

const servingRows = [];
for (const [productId, servingCl, price] of BASELINE) {
  const wineId = wineByProduct.get(productId);
  let item = itemByWine.get(wineId);
  if (!item) {
    const { data, error } = await supabase.from("wine_menu_items").insert({
      wine_menu_id: MENU_ID, wine_id: wineId, quantity: 0, description: "",
      price_override: null, service_type: "both", glass_price: price,
    }).select("id,wine_id").single();
    if (error) throw error;
    item = data;
    itemByWine.set(wineId, item);
  } else {
    const { error } = await supabase.from("wine_menu_items")
      .update({ service_type: "both", glass_price: price }).eq("id", item.id);
    if (error) throw error;
  }
  servingRows.push({
    wine_menu_item_id: item.id,
    compucash_product_id: productId,
    serving_cl: servingCl,
    price,
    is_active: true,
    source: "winehub_koyo_baseline",
    last_synced_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
}
const { error: servingError } = await supabase.from("wine_menu_servings")
  .upsert(servingRows, { onConflict: "wine_menu_item_id,compucash_product_id" });
if (servingError) throw servingError;

console.log(JSON.stringify({ curatedProducts: BASELINE.length, menuWines: targetWineIds.length, servings: servingRows.length }, null, 2));
