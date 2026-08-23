import { NextResponse } from "next/server";
import { getCompuCashStatus } from "@/lib/compucash/server";
import { requireAdministrator } from "@/lib/server/requireAdministrator";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const authorization = await requireAdministrator(request);
    if (authorization.error) {
      return NextResponse.json(
        { error: authorization.error.message },
        { status: authorization.error.status }
      );
    }
    const status = getCompuCashStatus();
    const latestResult = await authorization.admin
      .from("compucash_sync_runs")
      .select("status,changed_rows,products_received,products_matched,unmatched_products,error_message,completed_at")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return NextResponse.json(
      {
        ...status,
        connected: status.configured,
        automaticSyncEnabled:
          process.env.COMPUCASH_SYNC_WRITES_ENABLED === "true" &&
          Boolean(process.env.CRON_SECRET),
        latestRun: latestResult.error ? null : latestResult.data,
        previewEndpoint: "/api/compucash/preview",
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("COMPUCASH STATUS ERROR:", error);

    return NextResponse.json(
      {
        configured: false,
        identityConfigured: false,
        secretConfigured: false,
        baseUrlConfigured: false,
        connected: false,
        error: "Unable to read CompuCash server configuration.",
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}
