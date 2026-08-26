import "server-only";

import { LEGACY_BURMAN_WORKSPACE } from "@/lib/tenancy/constants";

const MISSING_TENANCY_CODES = new Set(["42P01", "PGRST200", "PGRST205"]);

function isTenancySchemaUnavailable(error) {
  return Boolean(error && MISSING_TENANCY_CODES.has(error.code));
}

export async function resolveTenantContext(admin, userId) {
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
  if (tenant?.source !== "membership") return query;

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
