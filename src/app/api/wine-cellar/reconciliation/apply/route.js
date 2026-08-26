import { NextResponse } from "next/server";
import { requireAdministrator } from "@/lib/server/requireAdministrator";
import { scopeTenantQuery } from "@/lib/server/tenantContext";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const authorization = await requireAdministrator(request);
    if (authorization.error) {
      return NextResponse.json(
        { error: authorization.error.message },
        { status: authorization.error.status }
      );
    }
    const body = await request.json();

    const rows = Array.isArray(body?.rows)
      ? body.rows
      : null;

    if (!rows) {
      return NextResponse.json(
        {
          error:
            "Reconciliation rows are required.",
        },
        {
          status: 400,
        }
      );
    }

    const wineIds = [...new Set(rows.map((row) => row?.wine_id).filter(Boolean))];
    const locationIds = [...new Set(rows.map((row) => row?.location_id).filter(Boolean))];
    if (wineIds.length === 0 || locationIds.length === 0) {
      return NextResponse.json({ error: "Every reconciliation row requires a wine and location." }, { status: 400 });
    }

    const [wineResult, locationResult] = await Promise.all([
      scopeTenantQuery(
        authorization.admin.from("wines").select("id").in("id", wineIds),
        authorization.tenant
      ),
      scopeTenantQuery(
        authorization.admin.from("wine_locations").select("id").in("id", locationIds),
        authorization.tenant
      ),
    ]);
    if (wineResult.error || locationResult.error) throw wineResult.error || locationResult.error;
    if ((wineResult.data ?? []).length !== wineIds.length || (locationResult.data ?? []).length !== locationIds.length) {
      return NextResponse.json({ error: "One or more reconciliation rows do not belong to this workspace." }, { status: 403 });
    }

    const {
      data,
      error,
    } = await authorization.admin.rpc(
      "apply_wine_inventory_reconciliation",
      {
        p_rows: rows,
      }
    );

    if (error) {
      console.error(
        "SERVER INVENTORY RECONCILIATION TRANSACTION FAILED:",
        error
      );

      return NextResponse.json(
        {
          error: error.message,
          code: error.code || null,
          details: error.details || null,
          hint: error.hint || null,
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      success: true,
      result: data || {},
    });
  } catch (error) {
    console.error(
      "SERVER INVENTORY RECONCILIATION ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Unable to apply inventory reconciliation.",
      },
      {
        status: 500,
      }
    );
  }
}
