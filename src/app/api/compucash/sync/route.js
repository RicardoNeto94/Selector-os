import { NextResponse } from "next/server";
import { CompuCashClient } from "@/lib/compucash/client";
import {
  buildCompuCashInventoryPlan,
  buildCompuCashPreview,
  validateCompuCashSync,
} from "@/lib/compucash/preview";
import { getCompuCashTenantRuntime } from "@/lib/compucash/server";
import {
  buildChangedInventoryRows,
  checksumInventoryRows,
} from "@/lib/compucash/syncPlan";
import { requireAdministrator } from "@/lib/server/requireAdministrator";
import { fetchAllRows } from "@/lib/supabase/fetchAllRows";
import { scopeTenantQuery } from "@/lib/server/tenantContext";
import { syncCompuCashActivity } from "@/lib/compucash/activitySync";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request) {
  try {
    const authorization = await requireAdministrator(request);
    if (authorization.error) {
      return NextResponse.json(
        { error: authorization.error.message },
        { status: authorization.error.status }
      );
    }
    if (process.env.COMPUCASH_SYNC_WRITES_ENABLED !== "true") {
      return NextResponse.json(
        { error: "Compucash inventory writes are disabled." },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    if (!body.confirmChecksum) {
      return NextResponse.json(
        { error: "A confirmed preview checksum is required." },
        { status: 400 }
      );
    }

    const admin = authorization.admin;
    const scopeRows = (query) => scopeTenantQuery(query, authorization.tenant);
    const runtime = await getCompuCashTenantRuntime({
      admin,
      tenant: authorization.tenant,
    });
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
    const preview = buildCompuCashPreview({
      rawStores,
      rawProducts,
      storeTargets: runtime.storeTargets,
      wines,
      aliases,
    });
    const plan = buildCompuCashInventoryPlan({
      rawProducts,
      storeTargets: runtime.storeTargets,
      wines,
      aliases,
    });
    const validation = validateCompuCashSync({ preview, plan });
    if (!validation.safe) {
      return NextResponse.json(
        { error: "Compucash snapshot failed safety validation.", validation },
        { status: 409 }
      );
    }

    const checksum = checksumInventoryRows(plan.rows);
    if (checksum !== body.confirmChecksum) {
      return NextResponse.json(
        { error: "Compucash data changed after preview. Generate a new preview.", checksum },
        { status: 409 }
      );
    }

    const rows = buildChangedInventoryRows({
      plannedRows: plan.rows,
      currentRows,
      locations,
      storeTargets: runtime.storeTargets,
    });
    let data = { updated: 0, movements: 0, processed: 0, unchanged: 0 };
    if (rows.length) {
      const inventoryResponse = await admin.rpc("apply_wine_inventory_reconciliation", {
        p_rows: rows,
      });
      if (inventoryResponse.error) throw inventoryResponse.error;
      data = inventoryResponse.data ?? data;
    }
    const sourceGroupResponse = await admin.rpc("apply_compucash_wine_source_groups", {
      p_rows: plan.wineSources,
    });
    if (sourceGroupResponse.error) throw sourceGroupResponse.error;
    const valuationResponse = await admin.rpc("apply_compucash_inventory_valuations", {
      p_rows: plan.valuations,
    });
    if (valuationResponse.error) throw valuationResponse.error;
    const activity = await syncCompuCashActivity({
      admin,
      client,
      tenant: authorization.tenant,
      storeTargets: runtime.storeTargets,
    });

    return NextResponse.json({
      success: true,
      checksum,
      submittedRows: rows.length,
      result: data ?? {},
      sourceGroupsUpdated: sourceGroupResponse.data ?? 0,
      valuationsUpdated: valuationResponse.data ?? 0,
      activity,
    });
  } catch (error) {
    console.error("COMPUCASH SYNC ERROR:", error);
    return NextResponse.json(
      { error: error?.message || "Unable to synchronize Compucash inventory." },
      { status: 500 }
    );
  }
}
