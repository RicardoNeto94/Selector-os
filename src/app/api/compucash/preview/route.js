import { NextResponse } from "next/server";
import { CompuCashClient } from "@/lib/compucash/client";
import {
  buildCompuCashInventoryPlan,
  buildCompuCashPreview,
  validateCompuCashSync,
} from "@/lib/compucash/preview";
import { getCompuCashTenantRuntime } from "@/lib/compucash/server";
import { checksumInventoryRows } from "@/lib/compucash/syncPlan";
import { requireAdministrator } from "@/lib/server/requireAdministrator";
import { fetchAllRows } from "@/lib/supabase/fetchAllRows";
import { scopeTenantQuery } from "@/lib/server/tenantContext";

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
    const scopeRows = (query) => scopeTenantQuery(query, authorization.tenant);
    const runtime = await getCompuCashTenantRuntime({
      admin: authorization.admin,
      tenant: authorization.tenant,
    });
    const client = new CompuCashClient(runtime.config);
    await client.authenticate();

    const [rawStores, wines, aliases] = await Promise.all([
      client.getStores(),
      fetchAllRows(
        authorization.admin,
        "wines",
        "id,sku,business_product_number,business_barcode",
        scopeRows
      ),
      fetchAllRows(
        authorization.admin,
        "wine_business_aliases",
        "wine_id,business_product_id,business_product_number,business_barcode",
        scopeRows
      ),
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

    return NextResponse.json({
      ...preview,
      syncCandidate: {
        checksum: checksumInventoryRows(plan.rows),
        safe: validation.safe,
        failures: validation.failures,
        matchRatio: validation.matchRatio,
        plannedRows: plan.rows.length,
        matchedWines: plan.matchedWines,
        duplicateWineMatches: plan.duplicateWineMatches,
        writesEnabled: process.env.COMPUCASH_SYNC_WRITES_ENABLED === "true",
      },
    }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("COMPUCASH PREVIEW ERROR:", error);
    return NextResponse.json(
      { error: error?.message || "Unable to preview Compucash inventory." },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
