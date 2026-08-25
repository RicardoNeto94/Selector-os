import "server-only";
import { CompuCashClient } from "./client";
import { COMPUCASH_STORE_TARGETS } from "./constants";
import {
  buildCompuCashInventoryPlan,
  buildCompuCashPreview,
  validateCompuCashSync,
} from "./preview";
import { getCompuCashConfig } from "./server";
import { buildChangedInventoryRows, checksumInventoryRows } from "./syncPlan";
import { refreshCompuCashBtgSuggestions } from "./btgSuggestions";
import { fetchAllRows } from "@/lib/supabase/fetchAllRows";

export async function runAutomaticCompuCashSync({ admin, triggerSource = "cron" }) {
  const startedAt = new Date().toISOString();
  if (process.env.COMPUCASH_SYNC_WRITES_ENABLED !== "true") {
    throw new Error("Compucash inventory writes are disabled.");
  }

  const client = new CompuCashClient(getCompuCashConfig());
  await client.authenticate();
  const [rawStores, wines, aliases, currentRows, locations] = await Promise.all([
    client.getStores(),
    fetchAllRows(admin, "wines", "id,sku,business_product_number,business_barcode"),
    fetchAllRows(admin, "wine_business_aliases", "wine_id,business_product_id,business_product_number,business_barcode"),
    fetchAllRows(admin, "wine_inventory", "wine_id,location_id,quantity"),
    fetchAllRows(admin, "wine_locations", "id,name"),
  ]);
  const rawProducts = await client.getProducts({
    storeIds: COMPUCASH_STORE_TARGETS.map((row) => row.externalStoreId),
  });
  const preview = buildCompuCashPreview({ rawStores, rawProducts, storeTargets: COMPUCASH_STORE_TARGETS, wines, aliases });
  const plan = buildCompuCashInventoryPlan({ rawProducts, storeTargets: COMPUCASH_STORE_TARGETS, wines, aliases });
  const validation = validateCompuCashSync({ preview, plan });
  if (!validation.safe) {
    throw new Error(`Compucash safety validation failed: ${validation.failures.join(", ")}`);
  }

  const rows = buildChangedInventoryRows({
    plannedRows: plan.rows,
    currentRows,
    locations,
    storeTargets: COMPUCASH_STORE_TARGETS,
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
  const btgSuggestions = await refreshCompuCashBtgSuggestions({
    admin,
    rawProducts,
    storeTargets: COMPUCASH_STORE_TARGETS,
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
    result,
    btgSuggestions,
  };
  await recordRun(admin, summary);
  return summary;
}

export async function recordFailedCompuCashRun(admin, error, triggerSource = "cron") {
  await recordRun(admin, {
    success: false,
    triggerSource,
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    error: error?.message || "Unknown Compucash sync error",
  });
}

async function recordRun(admin, run) {
  const response = await admin.from("compucash_sync_runs").insert({
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
