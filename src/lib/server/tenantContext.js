import "server-only";

import { LEGACY_BURMAN_WORKSPACE } from "@/lib/tenancy/constants";

const MISSING_TENANCY_CODES = new Set(["42P01", "PGRST200", "PGRST205"]);

function isTenancySchemaUnavailable(error) {
  return Boolean(error && MISSING_TENANCY_CODES.has(error.code));
}

async function resolveActiveSupportContext(admin, userId) {
  const now = new Date().toISOString();
  const { data: supportSession, error } = await admin
    .from("platform_support_sessions")
    .select("id,organization_id,property_id,access_level,reason,started_at,expires_at")
    .eq("actor_user_id", userId)
    .is("ended_at", null)
    .gt("expires_at", now)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    // Keep existing customer access available while the support-session
    // migration is being deployed.
    if (isTenancySchemaUnavailable(error)) return null;
    throw error;
  }
  if (!supportSession) return null;

  const [organizationResult, propertyResult] = await Promise.all([
    admin
      .from("organizations")
      .select("id,name,slug,status")
      .eq("id", supportSession.organization_id)
      .maybeSingle(),
    admin
      .from("properties")
      .select("id,name,slug,status,timezone,currency_code,organization_id")
      .eq("id", supportSession.property_id)
      .maybeSingle(),
  ]);
  if (organizationResult.error || propertyResult.error) {
    throw organizationResult.error || propertyResult.error;
  }

  const organization = organizationResult.data;
  const property = propertyResult.data;
  if (
    !organization ||
    organization.status !== "active" ||
    !property ||
    property.status !== "active" ||
    property.organization_id !== organization.id
  ) {
    return null;
  }

  return {
    organization: {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      role: "support_viewer",
    },
    property: {
      id: property.id,
      name: property.name,
      slug: property.slug,
      role: "support_viewer",
      timezone: property.timezone,
      currencyCode: property.currency_code,
    },
    supportSession: {
      id: supportSession.id,
      accessLevel: supportSession.access_level,
      reason: supportSession.reason,
      startedAt: supportSession.started_at,
      expiresAt: supportSession.expires_at,
    },
    source: "support",
  };
}

export async function resolveTenantContext(admin, userId) {
  const supportContext = await resolveActiveSupportContext(admin, userId);
  if (supportContext) return supportContext;

  const { data: memberships, error: membershipError } = await admin
    .from("organization_memberships")
    .select("organization_id,role,status,organizations(id,name,slug,status)")
    .eq("user_id", userId)
    .eq("status", "active");

  if (membershipError) {
    if (isTenancySchemaUnavailable(membershipError)) {
      return LEGACY_BURMAN_WORKSPACE;
    }

    throw membershipError;
  }

  const organizationMembership = (memberships ?? []).find(
    (membership) => membership.organizations?.status === "active"
  );

  if (!organizationMembership) return null;

  const { data: propertyMemberships, error: propertyError } = await admin
    .from("property_memberships")
    .select("property_id,role,properties(id,name,slug,status,timezone,currency_code,organization_id)")
    .eq("user_id", userId);

  if (propertyError) throw propertyError;

  const propertyMembership = (propertyMemberships ?? []).find(
    (membership) =>
      membership.properties?.status === "active" &&
      membership.properties?.organization_id ===
        organizationMembership.organization_id
  );

  return {
    organization: {
      id: organizationMembership.organizations.id,
      name: organizationMembership.organizations.name,
      slug: organizationMembership.organizations.slug,
      role: organizationMembership.role,
    },
    property: propertyMembership
      ? {
          id: propertyMembership.properties.id,
          name: propertyMembership.properties.name,
          slug: propertyMembership.properties.slug,
          role: propertyMembership.role,
          timezone: propertyMembership.properties.timezone,
          currencyCode: propertyMembership.properties.currency_code,
        }
      : null,
    source: "membership",
  };
}

export function scopeTenantQuery(query, tenant, { includeProperty = true } = {}) {
  if (!["membership", "support"].includes(tenant?.source)) return query;

  let scoped = query.eq("organization_id", tenant.organization.id);
  if (includeProperty && tenant.property?.id) {
    scoped = scoped.eq("property_id", tenant.property.id);
  }
  return scoped;
}

export function tenantWriteFields(tenant) {
  if (tenant?.source !== "membership") return {};

  return {
    organization_id: tenant.organization.id,
    property_id: tenant.property?.id ?? null,
  };
}
