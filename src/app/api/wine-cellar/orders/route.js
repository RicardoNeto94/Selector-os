import { NextResponse } from "next/server";
import { requireAdministrator } from "@/lib/server/requireAdministrator";
import { fetchAllRows } from "@/lib/supabase/fetchAllRows";
import { scopeTenantQuery, tenantWriteFields } from "@/lib/server/tenantContext";

export const dynamic = "force-dynamic";

const ACTIVE_STATUSES = ["approved", "ordered"];
const ALLOWED_STATUSES = new Set(["approved", "ordered", "received", "dismissed", "cancelled"]);

function jsonError(message, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

async function authorize(request) {
  const access = await requireAdministrator(request);
  if (access.error) return { response: jsonError(access.error.message, access.error.status) };
  if (!access.tenant?.property?.id) return { response: jsonError("A property workspace is required.", 409) };
  return { access };
}

async function ownsReferences(access, wineId, locationId) {
  const [wine, location] = await Promise.all([
    scopeTenantQuery(access.admin.from("wines").select("id").eq("id", wineId), access.tenant).maybeSingle(),
    scopeTenantQuery(access.admin.from("wine_locations").select("id").eq("id", locationId), access.tenant).maybeSingle(),
  ]);
  if (wine.error || location.error) throw wine.error || location.error;
  return Boolean(wine.data && location.data);
}

export async function GET(request) {
  try {
    const authorization = await authorize(request);
    if (authorization.response) return authorization.response;
    const { access } = authorization;
    const scope = (query) => scopeTenantQuery(query, access.tenant);
    const summaryOnly = new URL(request.url).searchParams.get("summary") === "1";

    const [inventory, rules, orders] = await Promise.all([
      fetchAllRows(access.admin, "wine_inventory", "id,wine_id,location_id,quantity,wines(id,name,producer,vintage,wine_type,size,is_active),wine_locations(id,name,location_type)", (query) => scope(query).order("id")),
      fetchAllRows(access.admin, "wine_reorder_rules", "*", (query) => scope(query).eq("enabled", true).order("updated_at", { ascending: false })),
      fetchAllRows(access.admin, "wine_order_requests", "*", (query) => scope(query).order("created_at", { ascending: false })),
    ]);

    const ruleMap = new Map(rules.map((rule) => [`${rule.wine_id}|${rule.location_id}`, rule]));
    const activeOrderKeys = new Set(orders.filter((order) => ACTIVE_STATUSES.includes(order.status)).map((order) => `${order.wine_id}|${order.location_id}`));
    const alerts = inventory.filter((row) => {
      if (!row.wines?.is_active || !row.wine_locations) return false;
      const rule = ruleMap.get(`${row.wine_id}|${row.location_id}`);
      const current = Number(row.quantity || 0);
      // A generated zero-balance matrix must not create thousands of noisy
      // alerts. Zero stock remains actionable after an administrator explicitly
      // enables a reorder rule for that wine and location.
      return (current > 0 || Boolean(rule)) && current <= Number(rule?.reorder_point ?? 2);
    });
    const summary = {
      alerts: alerts.length,
      urgent: alerts.filter((row) => ruleMap.has(`${row.wine_id}|${row.location_id}`) && Number(row.quantity || 0) <= 0).length,
      awaitingApproval: alerts.filter((row) => ruleMap.has(`${row.wine_id}|${row.location_id}`) && !activeOrderKeys.has(`${row.wine_id}|${row.location_id}`)).length,
      suggestions: alerts.filter((row) => !ruleMap.has(`${row.wine_id}|${row.location_id}`) && !activeOrderKeys.has(`${row.wine_id}|${row.location_id}`)).length,
      approved: orders.filter((order) => order.status === "approved").length,
      ordered: orders.filter((order) => order.status === "ordered").length,
    };
    if (summaryOnly) return NextResponse.json({ summary }, { headers: { "Cache-Control": "no-store" } });

    const valuations = await fetchAllRows(access.admin, "wine_inventory_valuations", "wine_id,location_id,unit_inventory_cost,currency_code", (query) => scope(query).eq("source", "compucash").order("wine_id"));
    return NextResponse.json({ inventory, rules, orders, valuations, summary }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("WINE ORDERING LOAD ERROR:", error);
    return jsonError(error?.message || "Ordering information could not be loaded.", 500);
  }
}

export async function POST(request) {
  try {
    const authorization = await authorize(request);
    if (authorization.response) return authorization.response;
    const { access } = authorization;
    const body = await request.json();
    const action = body?.action;

    if (action === "save_rule") {
      if (!(await ownsReferences(access, body.wineId, body.locationId))) return jsonError("Wine or location is outside this workspace.", 403);
      const reorderPoint = Number(body.reorderPoint);
      const targetQuantity = Number(body.targetQuantity);
      if (!Number.isFinite(reorderPoint) || reorderPoint < 0 || !Number.isFinite(targetQuantity) || targetQuantity <= reorderPoint) {
        return jsonError("Target quantity must be greater than the reorder point.");
      }
      const payload = {
        ...tenantWriteFields(access.tenant), wine_id: body.wineId, location_id: body.locationId,
        reorder_point: reorderPoint, target_quantity: targetQuantity,
        supplier_name: body.supplierName?.trim() || null, supplier_email: body.supplierEmail?.trim() || null,
        notes: body.notes?.trim() || null, enabled: true, updated_by: access.user.id, updated_at: new Date().toISOString(),
      };
      const { data, error } = await access.admin.from("wine_reorder_rules").upsert(payload, { onConflict: "organization_id,property_id,wine_id,location_id" }).select().single();
      if (error) throw error;
      return NextResponse.json({ success: true, rule: data });
    }

    if (action === "approve") {
      if (!(await ownsReferences(access, body.wineId, body.locationId))) return jsonError("Wine or location is outside this workspace.", 403);
      const current = Number(body.quantityOnHand || 0);
      const reorderPoint = Number(body.reorderPoint ?? 2);
      const targetQuantity = Number(body.targetQuantity ?? 6);
      const requestedQuantity = Number(body.requestedQuantity ?? Math.max(1, Math.ceil(targetQuantity - Math.max(0, current))));
      if (!Number.isFinite(requestedQuantity) || requestedQuantity <= 0 || targetQuantity <= reorderPoint) return jsonError("Invalid requested quantity or reorder target.");
      const payload = {
        ...tenantWriteFields(access.tenant), wine_id: body.wineId, location_id: body.locationId,
        status: "approved", quantity_on_hand: current, reorder_point: reorderPoint, target_quantity: targetQuantity,
        requested_quantity: requestedQuantity, unit_cost: Number.isFinite(Number(body.unitCost)) ? Number(body.unitCost) : null,
        currency_code: String(body.currencyCode || "EUR").toUpperCase(), supplier_name: body.supplierName?.trim() || null,
        supplier_email: body.supplierEmail?.trim() || null, notes: body.notes?.trim() || null, created_by: access.user.id,
      };
      const { data, error } = await access.admin.from("wine_order_requests").insert(payload).select().single();
      if (error?.code === "23505") return jsonError("An approved or ordered request already exists for this wine and location.", 409);
      if (error) throw error;
      return NextResponse.json({ success: true, order: data });
    }

    if (action === "update_status") {
      if (!ALLOWED_STATUSES.has(body.status)) return jsonError("Invalid order status.");
      const now = new Date().toISOString();
      const patch = { status: body.status, updated_at: now };
      if (body.status === "ordered") patch.ordered_at = now;
      if (body.status === "received") patch.received_at = now;
      if (body.status === "dismissed") patch.dismissed_at = now;
      const { data, error } = await scopeTenantQuery(access.admin.from("wine_order_requests").update(patch).eq("id", body.orderId).select(), access.tenant).maybeSingle();
      if (error) throw error;
      if (!data) return jsonError("Order request not found.", 404);
      return NextResponse.json({ success: true, order: data });
    }

    return jsonError("Unknown ordering action.");
  } catch (error) {
    console.error("WINE ORDERING ACTION ERROR:", error);
    return jsonError(error?.message || "Ordering action failed.", 500);
  }
}
