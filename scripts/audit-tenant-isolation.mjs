import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Supabase server configuration is missing.");

const admin = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function describeError(error) {
  if (!error) return "Unknown Supabase error";
  return [error.code, error.message, error.details, error.hint]
    .filter(Boolean)
    .join(" · ");
}

const foundationTables = new Map([
  ["organizations", "id"],
  ["properties", "id"],
  ["organization_memberships", "organization_id,user_id"],
  ["property_memberships", "property_id,user_id"],
  ["integration_connections", "id"],
  ["guest_experiences", "id"],
]);

const missingFoundation = [];
for (const [table, columns] of foundationTables) {
  // A GET is intentional: some PostgREST deployments return 204 for a HEAD
  // request even when the relation is absent from the schema cache.
  const result = await admin.from(table).select(columns).limit(1);
  if (result.error?.code === "PGRST205") missingFoundation.push(table);
  else if (result.error) {
    console.log(JSON.stringify({
      success: false,
      stage: "connection_error",
      failures: [`${table}: ${describeError(result.error)}`],
    }, null, 2));
    process.exit(1);
  }
}

if (missingFoundation.length > 0) {
  console.log(JSON.stringify({
    success: false,
    stage: "foundation_not_applied",
    message: "Apply 20260823180000_multi_tenant_foundation.sql before the Burman backfill or RLS enforcement migrations.",
    missingFoundation,
  }, null, 2));
  process.exit(1);
}

const tenantTables = [
  "restaurants", "venues", "locations", "cellar_locations", "menus",
  "menu_categories", "menu_items", "menu_item_prices", "dishes",
  "dish_allergens", "experiences", "experience_sections",
  "experience_items", "experience_media", "experience_prices",
  "spa_categories", "spa_products", "spa_product_variants",
  "merchandise_categories", "merchandise_products", "wine_locations",
  "wines", "wine_inventory", "wine_stock", "wine_menus",
  "wine_menu_items", "wine_menu_servings", "wine_transfers",
  "wine_movements", "wine_business_aliases", "wine_btg_suggestions",
  "sake_pairings", "sake_pairing_stages", "wine_location_store_mappings",
  "wine_inventory_imports", "wine_inventory_import_rows",
  "wine_inventory_valuations", "compucash_sync_runs", "operation_days",
  "compucash_activity_rows",
  "daily_bookings", "daily_labour", "daily_occupancy", "daily_sales",
  "operation_summary", "operations_insights", "employee_costs",
  "sales_days", "sales_categories", "sales_payment_methods",
  "sales_products", "sales_venues", "import_batches", "import_jobs",
  "import_sources", "raw_import_rows", "restaurant_domains",
  "pwa_refresh_signals", "user_roles", "user_venue_access",
];

const failures = [];
const results = [];

for (const table of tenantTables) {
  const totalResult = await admin.from(table).select("organization_id,property_id", {
    count: "exact",
  }).limit(1);
  if (totalResult.error?.code === "PGRST205") continue;
  if (totalResult.error) {
    failures.push(`${table}: ${describeError(totalResult.error)}`);
    continue;
  }

  const [missingOrganization, missingProperty] = await Promise.all([
    admin.from(table).select("organization_id", { count: "exact" }).is("organization_id", null).limit(1),
    admin.from(table).select("property_id", { count: "exact" }).is("property_id", null).limit(1),
  ]);
  if (missingOrganization.error || missingProperty.error) {
    failures.push(`${table}: ${describeError(missingOrganization.error || missingProperty.error)}`);
    continue;
  }

  const nullOrganizationRows = missingOrganization.count || 0;
  const nullPropertyRows = missingProperty.count || 0;
  results.push({
    table,
    rows: totalResult.count || 0,
    nullOrganizationRows,
    nullPropertyRows,
  });
  if (nullOrganizationRows || nullPropertyRows) {
    failures.push(`${table}: ${nullOrganizationRows} rows lack organization and ${nullPropertyRows} lack property`);
  }
}

for (const table of ["wine_menus", "guest_experiences"]) {
  const { data, error } = await admin.from(table).select("id,slug,organization_id");
  if (error) {
    failures.push(`${table} public slug audit: ${describeError(error)}`);
    continue;
  }
  const seen = new Map();
  for (const row of data || []) {
    const slug = String(row.slug || "").trim().toLowerCase();
    if (!slug) continue;
    const previous = seen.get(slug);
    if (previous) {
      failures.push(`${table}: public slug \"${slug}\" is shared by rows ${previous.id} and ${row.id}`);
    } else {
      seen.set(slug, row);
    }
  }
}

const [organizations, properties, memberships] = await Promise.all([
  admin.from("organizations").select("id", { count: "exact" }).limit(1),
  admin.from("properties").select("id", { count: "exact" }).limit(1),
  admin.from("organization_memberships").select("user_id", { count: "exact" }).limit(1),
]);

console.log(JSON.stringify({
  success: failures.length === 0,
  organizations: organizations.count ?? null,
  properties: properties.count ?? null,
  memberships: memberships.count ?? null,
  tablesChecked: results.length,
  rowsChecked: results.reduce((sum, result) => sum + result.rows, 0),
  failures,
}, null, 2));

if (failures.length > 0) process.exitCode = 1;
