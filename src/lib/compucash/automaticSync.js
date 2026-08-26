import "server-only";
import { CompuCashClient } from "./client";
import {
  buildCompuCashInventoryPlan,
  buildCompuCashPreview,
  validateCompuCashSync,
} from "./preview";
import { getCompuCashTenantRuntime } from "./server";
import { buildChangedInventoryRows, checksumInventoryRows } from "./syncPlan";
import { refreshCompuCashBtgSuggestions } from "./btgSuggestions";
import { fetchAllRows } from "@/lib/supabase/fetchAllRows";
import {
  scopeTenantQuery,
  tenantWriteFields,
} from "@/lib/server/tenantContext";

export async function runAutomaticCompuCashSync({
  admin,
  tenant,
  triggerSource = "cron",
}) {
  const startedAt = new Date().toISOString();
  if (process.env.COMPUCASH_SYNC_WRITES_ENABLED !== "true") {
    throw new Error("Compucash inventory writes are disabled.");
  }

  const runtime = await getCompuCashTenantRuntime({ admin, tenant });
  const scopeRows = (query) => scopeTenantQuery(query, tenant);
  const client = new CompuCashClient(runtime.config);
  await client.authenticate();
  const [rawStores, wines, aliases, currentRows, locations] = await Promise.all([
    client.getStores(),
    fetchAllRows(admin, "wines", "id,sku,business_product_number,business_barcode", scopeRows),
    fetchAllRows(admin, "wine_business_aliases", "wine_id,business_product_id,business_product_number,business_barcode", scopeRows),
    fetchAllRows(admin, "wine_inventory", "wine_id,location_id,quantity", scopeRows),
    fetchAllRows(admin, "wine_locations", "id,name", scopeRows),
  ]);
  const rawProducts = await client.getProducts({
    storeIds: runtime.storeTargets.map((row) => row.externalStoreId),
  });
  const preview = buildCompuCashPreview({ rawStores, rawProducts, storeTargets: runtime.storeTargets, wines, aliases });
  const plan = buildCompuCashInventoryPlan({ rawProducts, storeTargets: runtime.storeTargets, wines, aliases });
  const validation = validateCompuCashSync({ preview, plan });
  if (!validation.safe) {
    throw new Error(`Compucash safety validation failed: ${validation.failures.join(", ")}`);
  }

  const rows = buildChangedInventoryRows({
    plannedRows: plan.rows,
    currentRows,
    locations,
    storeTargets: runtime.storeTargets,
    replaceMappedLocationInventory: true,
  });
  const maximumChangedRows = Number(process.env.COMPUCASH_MAX_CHANGED_ROWS || 3000);
  if (rows.length > maximumChangedRows) {
    throw new Error(`Compucash change count ${rows.length} exceeds limit ${maximumChangedRows}.`);
  }

  let result = { updated: 0, movements: 0, processed: 0, unchanged: 0 };
  if (rows.length) {
    const response = await admin.rpc("apply_wine_inventory_reconciliation", { p_rows: rows });
    if (response.error) throw response.error;
    result = response.data ?? result;
  }
  const sourceGroupResponse = await admin.rpc("apply_compucash_wine_source_groups", {
    p_rows: plan.wineSources,
  });
  if (sourceGroupResponse.error) throw sourceGroupResponse.error;
  const valuationResponse = await admin.rpc("apply_compucash_inventory_valuations", {
    p_rows: plan.valuations,
  });
  if (valuationResponse.error) throw valuationResponse.error;
  const btgSuggestions = await refreshCompuCashBtgSuggestions({
    admin,
    rawProducts,
    storeTargets: runtime.storeTargets,
    tenant,
  });

  const summary = {
    success: true,
    triggerSource,
    startedAt,
    completedAt: new Date().toISOString(),
    checksum: checksumInventoryRows(plan.rows),
    productsReceived: plan.productsReceived,
    productsMatched: plan.productsMatched,
    unmatchedProducts: plan.unmatchedProducts.length,
    changedRows: rows.length,
    sourceGroupsUpdated: sourceGroupResponse.data ?? 0,
    valuationsUpdated: valuationResponse.data ?? 0,
    result,
    btgSuggestions,
  };
  await recordRun(admin, summary, tenant);
  if (runtime.connection?.id) {
    const connectionUpdate = await admin
      .from("integration_connections")
      .update({
        last_successful_sync_at: summary.completedAt,
        updated_at: summary.completedAt,
      })
      .eq("id", runtime.connection.id)
      .eq("organization_id", tenant.organization.id);
    if (connectionUpdate.error) {
      console.error("COMPUCASH CONNECTION STATUS ERROR:", connectionUpdate.error);
    }
  }
  return summary;
}

export async function recordFailedCompuCashRun(
  admin,
  error,
  triggerSource = "cron",
  tenant = null
) {
  await recordRun(admin, {
    success: false,
    triggerSource,
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    error: error?.message || "Unknown Compucash sync error",
  }, tenant);
}

async function recordRun(admin, run, tenant) {
  const response = await admin.from("compucash_sync_runs").insert({
    ...tenantWriteFields(tenant),
    trigger_source: run.triggerSource,
    status: run.success ? "succeeded" : "failed",
    checksum: run.checksum ?? null,
    products_received: run.productsReceived ?? 0,
    products_matched: run.productsMatched ?? 0,
    unmatched_products: run.unmatchedProducts ?? 0,
    changed_rows: run.changedRows ?? 0,
    result: run.result ?? {},
    error_message: run.error ?? null,
    started_at: run.startedAt,
    completed_at: run.completedAt,
  });
  if (response.error) console.error("COMPUCASH SYNC RUN LOG ERROR:", response.error);
}
