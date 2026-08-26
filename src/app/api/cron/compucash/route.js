import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import {
  recordFailedCompuCashRun,
  runAutomaticCompuCashSync,
} from "@/lib/compucash/automaticSync";
import { listAutomaticCompuCashTenants } from "@/lib/compucash/server";
import { createAdminClient } from "@/lib/server/requireAdministrator";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  const supplied = request.headers.get("authorization") || "";
  if (!secret || !secureEqual(supplied, `Bearer ${secret}`)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const admin = createAdminClient();
  try {
    const tenants = await listAutomaticCompuCashTenants(admin);
    const runs = [];
    for (const tenant of tenants) {
      try {
        const result = await runAutomaticCompuCashSync({
          admin,
          tenant,
          triggerSource: "vercel_cron",
        });
        runs.push({
          organizationId: tenant.organization.id,
          propertyId: tenant.property?.id ?? null,
          ...result,
        });
      } catch (error) {
        console.error("AUTOMATIC COMPUCASH TENANT SYNC ERROR:", error);
        await recordFailedCompuCashRun(
          admin,
          error,
          "vercel_cron",
          tenant
        );
        runs.push({
          organizationId: tenant.organization.id,
          propertyId: tenant.property?.id ?? null,
          success: false,
          error: error?.message || "Automatic Compucash sync failed.",
        });
      }
    }

    const failed = runs.filter((run) => !run.success);
    const response = runs.length === 1
      ? { ...runs[0], tenantRuns: runs }
      : {
          success: failed.length === 0,
          tenantsProcessed: runs.length,
          tenantsSucceeded: runs.length - failed.length,
          tenantsFailed: failed.length,
          tenantRuns: runs,
        };
    return NextResponse.json(response, {
      status: failed.length === runs.length ? 500 : 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("AUTOMATIC COMPUCASH SYNC ERROR:", error);
    return NextResponse.json(
      { error: error?.message || "Automatic Compucash sync failed." },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}

function secureEqual(left, right) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}
