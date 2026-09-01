import "server-only";

import { createClient as createCookieClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/server/requireAdministrator";
import { resolveTenantContext } from "@/lib/server/tenantContext";
import { resolveEntitlements } from "@/lib/billing/catalog";

export async function requireDashboardUser() {
  const cookieClient = await createCookieClient();
  const { data: authData, error: authError } = await cookieClient.auth.getUser();
  const user = authData?.user ?? null;

  if (authError || !user) {
    return {
      user: null,
      profile: null,
      roles: [],
      tenant: null,
      allowed: false,
      reason: "session",
    };
  }

  const admin = createAdminClient();
  const [profileResult, rolesResult] = await Promise.all([
    admin.from("profiles").select("id,email,status").eq("id", user.id).maybeSingle(),
    admin.from("user_roles").select("roles!inner(slug)").eq("user_id", user.id),
  ]);

  if (profileResult.error || rolesResult.error) throw profileResult.error || rolesResult.error;
  const profile = profileResult.data;
  const roles = (rolesResult.data ?? []).map((row) => row.roles?.slug).filter(Boolean);
  const accountIsActive = profile?.status === "active";
  const tenant = accountIsActive
    ? await resolveTenantContext(admin, user.id)
    : null;
  const platformResult = accountIsActive
    ? await admin
        .from("platform_administrators")
        .select("role,status")
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle()
    : { data: null, error: null };
  // The control-plane migration may be deployed immediately after the
  // application build. Until then, customer dashboard access must continue to
  // work normally and simply omit the internal Vaxeron navigation.
  const platformAdministrator = platformResult.error
    ? null
    : platformResult.data;
  let platformSettings = null;
  if (tenant?.organization?.id) {
    const settingsResult = await admin
      .from("organization_platform_settings")
      .select("*")
      .eq("organization_id", tenant.organization.id)
      .maybeSingle();
    if (!settingsResult.error) platformSettings = settingsResult.data;
  }
  // Tenant membership is the source of workspace access. Legacy user_roles
  // remain available for feature-level permissions during the transition, but
  // a newly provisioned organization owner must not depend on a Burman-era
  // role row in order to enter their own workspace.
  const allowed = accountIsActive && Boolean(tenant?.organization);

  return {
    user,
    profile,
    roles,
    tenant,
    platformSettings,
    entitlements: resolveEntitlements(
      platformSettings || {
        plan: "enterprise",
        billing_mode: "platform_managed",
        billing_status: "not_configured",
        onboarding_status: "live",
        enabled_modules: {
          wine: true,
          dining: true,
          spa: true,
          guest_experience: true,
        },
      }
    ),
    platformAdministrator,
    allowed,
    reason: allowed ? null : "approval",
  };
}
