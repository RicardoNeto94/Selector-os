import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/server/requireAdministrator";
import { scopeTenantQuery } from "@/lib/server/tenantContext";
import { LEGACY_BURMAN_WORKSPACE } from "@/lib/tenancy/constants";

export const dynamic = "force-dynamic";

const MISSING_TENANT_COLUMN_CODES = new Set(["42703", "PGRST204"]);

export async function GET() {
  try {
    const admin = createAdminClient();
    const tenant = { ...LEGACY_BURMAN_WORKSPACE, source: "membership" };
    let result = await loadCollection(admin, tenant);
    if (result.error && MISSING_TENANT_COLUMN_CODES.has(result.error.code)) {
      result = await loadCollection(admin, null);
    }
    if (result.error) throw result.error;
    return NextResponse.json(
      { categories: result.data || [] },
      { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } }
    );
  } catch (error) {
    console.error("PUBLIC COLLECTION ERROR:", error);
    return NextResponse.json(
      { error: "Unable to load the collection." },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}

function loadCollection(admin, tenant) {
  return scopeTenantQuery(
    admin
      .from("merchandise_categories")
      .select("*,merchandise_products(*)")
      .order("position"),
    tenant
  );
}
