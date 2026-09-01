import { NextResponse } from "next/server";
import { requirePlatformAdministrator } from "@/lib/server/requirePlatformAdministrator";

export const dynamic = "force-dynamic";

const ORGANIZATION_STATUSES = new Set(["active", "suspended", "archived"]);
const ONBOARDING_STATUSES = new Set(["invited", "in_progress", "ready", "live", "paused"]);
const PLANS = new Set(["pilot", "starter", "professional", "hospitality_suite", "enterprise"]);
const INVENTORY_MODES = new Set(["manual", "csv", "api", "hybrid"]);
const BILLING_MODES = new Set(["platform_managed", "stripe"]);
const MODULE_KEYS = ["wine", "dining", "spa", "guest_experience"];

function responseError(message, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request, context) {
  try {
    const access = await requirePlatformAdministrator(request);
    if (access.error) return responseError(access.error.message, access.error.status);
    const { organizationId } = await context.params;
    const { admin } = access;

    const { data: organization, error: organizationError } = await admin
      .from("organizations")
      .select("id,name,slug,status,created_at,updated_at")
      .eq("id", organizationId)
      .maybeSingle();
    if (organizationError) throw organizationError;
    if (!organization) return responseError("Customer not found.", 404);

    const [propertiesResult, membershipsResult, settingsResult, integrationsResult, sessionsResult] =
      await Promise.all([
        admin.from("properties").select("id,organization_id,name,slug,status,created_at").eq("organization_id", organizationId).order("created_at"),
        admin.from("organization_memberships").select("organization_id,user_id,role,status,created_at").eq("organization_id", organizationId).order("created_at"),
        admin.from("organization_platform_settings").select("*").eq("organization_id", organizationId).maybeSingle(),
        admin.from("integration_connections").select("id,provider,display_name,status,last_successful_sync_at,created_at").eq("organization_id", organizationId).order("created_at", { ascending: false }),
        admin.from("platform_support_sessions").select("id,actor_user_id,property_id,access_level,reason,started_at,expires_at,ended_at,ended_by_user_id").eq("organization_id", organizationId).order("started_at", { ascending: false }).limit(30),
      ]);

    const firstError = [propertiesResult, membershipsResult, settingsResult, integrationsResult, sessionsResult]
      .map((result) => result.error)
      .find(Boolean);
    if (firstError) throw firstError;

    const userIds = Array.from(new Set([
      ...(membershipsResult.data || []).map((row) => row.user_id),
      ...(sessionsResult.data || []).flatMap((row) => [row.actor_user_id, row.ended_by_user_id]).filter(Boolean),
    ]));
    let profiles = [];
    if (userIds.length) {
      const result = await admin.from("profiles").select("id,first_name,last_name,email,status").in("id", userIds);
      if (result.error) throw result.error;
      profiles = result.data || [];
    }
    const profileById = new Map(profiles.map((profile) => [profile.id, profile]));

    return NextResponse.json({
      customer: {
        ...organization,
        properties: propertiesResult.data || [],
        memberships: (membershipsResult.data || []).map((row) => ({
          ...row,
          profile: profileById.get(row.user_id) || null,
        })),
        settings: settingsResult.data || null,
        integrations: integrationsResult.data || [],
      },
      supportSessions: (sessionsResult.data || []).map((row) => ({
        ...row,
        actor: profileById.get(row.actor_user_id) || null,
        endedBy: profileById.get(row.ended_by_user_id) || null,
      })),
    });
  } catch (error) {
    console.error("PLATFORM CUSTOMER LOAD ERROR:", error);
    return responseError(error?.message || "Unable to load this customer.", 500);
  }
}

export async function PATCH(request, context) {
  try {
    const access = await requirePlatformAdministrator(request);
    if (access.error) return responseError(access.error.message, access.error.status);
    if (!["root_owner", "platform_administrator"].includes(access.platformAdmin.role)) {
      return responseError("This platform role is read-only.", 403);
    }
    const { organizationId } = await context.params;
    const body = await request.json();
    const organizationUpdate = {};
    const settingsUpdate = { updated_at: new Date().toISOString() };

    if (body.status !== undefined) {
      if (!ORGANIZATION_STATUSES.has(body.status)) return responseError("Invalid customer status.");
      organizationUpdate.status = body.status;
      organizationUpdate.updated_at = new Date().toISOString();
    }
    if (body.onboardingStatus !== undefined) {
      if (!ONBOARDING_STATUSES.has(body.onboardingStatus)) return responseError("Invalid onboarding status.");
      settingsUpdate.onboarding_status = body.onboardingStatus;
    }
    if (body.plan !== undefined) {
      if (!PLANS.has(body.plan)) return responseError("Invalid plan.");
      settingsUpdate.plan = body.plan;
    }
    if (body.inventoryMode !== undefined) {
      if (!INVENTORY_MODES.has(body.inventoryMode)) return responseError("Invalid inventory mode.");
      settingsUpdate.inventory_mode = body.inventoryMode;
    }
    if (body.billingMode !== undefined) {
      if (!BILLING_MODES.has(body.billingMode)) return responseError("Invalid billing mode.");
      settingsUpdate.billing_mode = body.billingMode;
    }
    if (body.enabledModules !== undefined) {
      settingsUpdate.enabled_modules = Object.fromEntries(
        MODULE_KEYS.map((key) => [key, Boolean(body.enabledModules?.[key])])
      );
    }
    if (body.internalNotes !== undefined) {
      settingsUpdate.internal_notes = String(body.internalNotes || "").trim().slice(0, 4000) || null;
    }

    const { admin } = access;
    if (Object.keys(organizationUpdate).length) {
      const result = await admin.from("organizations").update(organizationUpdate).eq("id", organizationId);
      if (result.error) throw result.error;
    }
    if (Object.keys(settingsUpdate).length > 1) {
      const result = await admin.from("organization_platform_settings").upsert(
        { organization_id: organizationId, ...settingsUpdate },
        { onConflict: "organization_id" }
      );
      if (result.error) throw result.error;
    }

    const audit = await admin.from("platform_audit_log").insert({
      actor_user_id: access.user.id,
      action: "customer.updated",
      target_type: "organization",
      target_id: organizationId,
      metadata: body,
    });
    if (audit.error) throw audit.error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PLATFORM CUSTOMER UPDATE ERROR:", error);
    return responseError(error?.message || "Unable to update this customer.", 500);
  }
}
