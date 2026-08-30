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

  const [wines, inventoryRows, menuItems, valuationRows, locations] = await Promise.all([
    fetchAllRows(supabase, "wines", "*", scope),
    fetchAllRows(supabase, "wine_inventory", "wine_id,location_id,quantity", scope),
    fetchAllRows(supabase, "wine_menu_items", "id,wine_id,wine_menu_id,description,service_type,glass_price,price_override,is_active", scope),
    fetchAllRows(supabase, "wine_inventory_valuations", "wine_id,location_id,external_product_id,unit_inventory_cost", (query) => scope(query).eq("source", "compucash")),
    fetchAllRows(supabase, "wine_locations", "id,name,wine_menu_id", scope),
  ]);

  const report = buildWineDataQualityReport({ wines, inventoryRows, menuItems, valuationRows, locations });
  return <DataQualityClient report={report} />;
}
