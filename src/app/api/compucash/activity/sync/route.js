import { NextResponse } from "next/server";
import { CompuCashClient } from "@/lib/compucash/client";
import { syncCompuCashActivity } from "@/lib/compucash/activitySync";
import { getCompuCashTenantRuntime } from "@/lib/compucash/server";
import { requireAdministrator } from "@/lib/server/requireAdministrator";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request) {
  try {
    const authorization = await requireAdministrator(request);
    if (authorization.error) {
      return NextResponse.json(
        { error: authorization.error.message },
        { status: authorization.error.status }
      );
    }
    const runtime = await getCompuCashTenantRuntime({
      admin: authorization.admin,
      tenant: authorization.tenant,
    });
    const client = new CompuCashClient(runtime.config);
    await client.authenticate();
    const activity = await syncCompuCashActivity({
      admin: authorization.admin,
      client,
      tenant: authorization.tenant,
      storeTargets: runtime.storeTargets,
    });
    return NextResponse.json({ success: true, activity }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("COMPUCASH ACTIVITY REFRESH ERROR:", error);
    return NextResponse.json(
      { error: error?.message || "Unable to refresh Compucash activity." },
      { status: error?.status || 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
