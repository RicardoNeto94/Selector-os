import { NextResponse } from "next/server";
import { fetchAllRows } from "@/lib/supabase/fetchAllRows";
import { createAdminClient } from "@/lib/server/requireAdministrator";
import { requireDashboardUser } from "@/lib/server/requireDashboardUser";
import { scopeTenantQuery } from "@/lib/server/tenantContext";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request) {
  const access = await requireDashboardUser();
  if (!access.allowed) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  const from = safeDate(request.nextUrl.searchParams.get("from")) ?? monthAgo();
  const to = safeDate(request.nextUrl.searchParams.get("to"));
  const scope = safeScope(request.nextUrl.searchParams.get("scope"));
  const admin = createAdminClient();
  const rows = await fetchAllRows(
    admin,
    "compucash_activity_rows",
    "business_date,event_at,external_document_id,external_row_id,product_name,quantity,bottle_equivalent,unit_price,gross_amount,vat_percent,sale_point_name,is_cancelled,wines(name,producer,vintage,wine_type)",
    (query) => {
      let scoped = scopeTenantQuery(query, access.tenant)
        .eq("event_type", "sale")
        .gte("business_date", from)
        .order("event_at", { ascending: false });
      if (to) scoped = scoped.lte("business_date", to);
      return scoped;
    }
  );

  const header = [
    "Business date", "Sold at", "Venue", "Wine", "Producer", "Vintage",
    "CompuCash product", "Sale units", "Bottle equivalent", "Unit price",
    "Gross revenue", "VAT %", "Invoice", "Row", "Cancelled",
  ];
  const csvRows = rows.filter((row) => matchesScope(row, scope)).map((row) => [
    row.business_date, row.event_at, row.sale_point_name, row.wines?.name,
    row.wines?.producer, row.wines?.vintage, row.product_name, row.quantity,
    row.bottle_equivalent, row.unit_price, row.gross_amount, row.vat_percent,
    row.external_document_id, row.external_row_id, row.is_cancelled ? "Yes" : "No",
  ]);
  const csv = [header, ...csvRows]
    .map((row) => row.map(csvCell).join(","))
    .join("\r\n");
  const filename = `vaxeron-${scope}-sales-${from}-${to || "today"}.csv`;
  return new NextResponse(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

function csvCell(value) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function safeDate(value) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

function safeScope(value) {
  return ["wine", "sake", "alcohol-free"].includes(value) ? value : "all";
}

function matchesScope(row, scope) {
  if (scope === "all") return true;
  const wineType = String(row.wines?.wine_type || "").trim().toLowerCase();
  const isSake = wineType.includes("sake");
  const isAlcoholFree = wineType.includes("non-alcohol") || wineType.includes("alcohol-free") || wineType.includes("alcohol free") || wineType.includes("soft-drink");
  if (scope === "sake") return isSake;
  if (scope === "alcohol-free") return isAlcoholFree;
  return !isSake && !isAlcoholFree;
}

function monthAgo() {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - 30);
  return date.toISOString().slice(0, 10);
}
