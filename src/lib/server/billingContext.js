import "server-only";

import { createAdminClient } from "@/lib/server/requireAdministrator";
import { requireDashboardUser } from "@/lib/server/requireDashboardUser";
import { resolveEntitlements } from "@/lib/billing/catalog";

export async function requireBillingAdministrator() {
  const access = await requireDashboardUser();
  if (!access.user) return { ...access, error: { status: 401, message: "Authentication required." } };
  if (!access.allowed || !access.tenant?.organization) {
    return { ...access, error: { status: 403, message: "Active workspace access required." } };
  }
  if (access.tenant.source !== "membership") {
    return { ...access, error: { status: 403, message: "Billing is unavailable during support access." } };
  }
  if (!['owner', 'administrator'].includes(access.tenant.organization.role)) {
    return { ...access, error: { status: 403, message: "Workspace owner or administrator access required." } };
  }

  const admin = createAdminClient();
  const { data: settings, error } = await admin
    .from("organization_platform_settings")
    .select("*")
    .eq("organization_id", access.tenant.organization.id)
    .maybeSingle();
  if (error) throw error;
  if (!settings) {
    return { ...access, admin, error: { status: 409, message: "Workspace billing settings are not configured." } };
  }

  return {
    ...access,
    admin,
    settings,
    entitlements: resolveEntitlements(settings),
    error: null,
  };
}
