import { createClient } from "@supabase/supabase-js";
import { requireDashboardUser } from "@/lib/server/requireDashboardUser";
import { scopeTenantQuery } from "@/lib/server/tenantContext";
import { fetchAllRows } from "@/lib/supabase/fetchAllRows";
import { buildWineDataQualityReport } from "@/lib/wineDataQuality";
import DataQualityClient from "./DataQualityClient";

export const dynamic = "force-dynamic";

export default async function WineDataQualityPage() {
  const access = await requireDashboardUser();
  if (!access.allowed) return null;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const scope = (query) => scopeTenantQuery(query, access.tenant);

  const [wines, inventoryRows, valuationRows] = await Promise.all([
    fetchAllRows(supabase, "wines", "*", scope),
    fetchAllRows(supabase, "wine_inventory", "wine_id,location_id,quantity", scope),
    fetchAllRows(supabase, "wine_inventory_valuations", "wine_id,external_product_id", scope),
  ]);

  const report = buildWineDataQualityReport({ wines, inventoryRows, valuationRows });
  const records = wines.map(({ id, name, producer, wine_type, country, region, vintage, size, sku, business_product_number, business_barcode }) => ({ id, name, producer, wine_type, country, region, vintage, size, sku, business_product_number, business_barcode, hasStockBalance: inventoryRows.some(row => row.wine_id === id && (row.quantity == null || Number(row.quantity) !== 0)), sourceLinked: Boolean(sku || business_product_number || business_barcode || valuationRows.some(row => row.wine_id === id && row.external_product_id != null)) }));
  return <DataQualityClient report={report} records={records} canEdit={["owner", "administrator"].includes(access.tenant?.organization?.role)} />;
}
