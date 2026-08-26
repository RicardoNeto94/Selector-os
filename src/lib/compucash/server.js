import "server-only";
import { COMPUCASH_STORE_TARGETS } from "@/lib/compucash/constants";
import {
  LEGACY_BURMAN_ORGANIZATION_ID,
  LEGACY_BURMAN_WORKSPACE,
} from "@/lib/tenancy/constants";

const DEFAULT_TOKEN_URL =
  "https://www.compucash5.com/IdentityServer/connect/token";
const MISSING_TENANCY_CODES = new Set(["42P01", "PGRST200", "PGRST205"]);

export function getCompuCashConfig() {
  return normalizeCompuCashConfig({
    clientId: process.env.COMPUCASH_CLIENT_ID || process.env.COMPUCASH_IDENTITY,
    clientSecret:
      process.env.COMPUCASH_CLIENT_SECRET || process.env.COMPUCASH_SECRET,
    baseUrl: process.env.COMPUCASH_BASE_URL,
    tokenUrl: process.env.COMPUCASH_TOKEN_URL || DEFAULT_TOKEN_URL,
  });
}

function normalizeCompuCashConfig(values) {
  const identity = values?.clientId;
  const secret = values?.clientSecret;
  const baseUrl = values?.baseUrl;
  const tokenUrl = values?.tokenUrl || DEFAULT_TOKEN_URL;
  const missing = [];

  if (!identity) {
    missing.push("COMPUCASH_CLIENT_ID");
  }

  if (!secret) {
    missing.push("COMPUCASH_CLIENT_SECRET");
  }

  if (!baseUrl) {
    missing.push("COMPUCASH_BASE_URL");
  }

  if (missing.length > 0) {
    throw new Error(
      `CompuCash configuration is incomplete. Missing: ${missing.join(", ")}`
    );
  }

  return {
    clientId: identity,
    clientSecret: secret,
    baseUrl: baseUrl.replace(/\/+$/, ""),
    tokenUrl,
  };
}

function normalizeStoreTargets(configuration) {
  const targets = configuration?.storeTargets;
  if (!Array.isArray(targets) || targets.length === 0) {
    throw new Error("Compucash store mappings are not configured for this workspace.");
  }

  return targets.map((target) => {
    const externalStoreId = String(target?.externalStoreId || "").trim();
    const locationId = String(target?.locationId || "").trim();
    if (!externalStoreId || !locationId) {
      throw new Error("A Compucash store mapping is incomplete.");
    }
    return {
      externalStoreId,
      locationId,
      expectedName: String(target?.expectedName || "").trim() || "Compucash store",
    };
  });
}

export async function getCompuCashTenantRuntime({ admin, tenant }) {
  if (tenant?.source !== "membership") {
    return {
      config: getCompuCashConfig(),
      storeTargets: COMPUCASH_STORE_TARGETS,
      connection: null,
      source: "legacy_environment",
    };
  }

  let connectionQuery = admin
    .from("integration_connections")
    .select("id,display_name,configuration,last_successful_sync_at,created_at")
    .eq("organization_id", tenant.organization.id)
    .eq("provider", "compucash")
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1);
  if (tenant.property?.id) {
    connectionQuery = connectionQuery.eq("property_id", tenant.property.id);
  }
  const { data: connection, error: connectionError } = await connectionQuery.maybeSingle();
  if (connectionError) throw connectionError;

  // Burman continues using the existing Vercel secrets until its Vault
  // connection is created and verified. Other organizations always require an
  // isolated connection, preventing accidental use of Burman credentials.
  if (!connection && tenant.organization.id === LEGACY_BURMAN_ORGANIZATION_ID) {
    return {
      config: getCompuCashConfig(),
      storeTargets: COMPUCASH_STORE_TARGETS,
      connection: null,
      source: "burman_environment_fallback",
    };
  }
  if (!connection) {
    const error = new Error(
      "This workspace does not have an active Compucash connection."
    );
    error.status = 409;
    throw error;
  }

  const credentialsResult = await admin.rpc(
    "get_integration_connection_credentials",
    { p_connection_id: connection.id }
  );
  if (credentialsResult.error) throw credentialsResult.error;
  if (!credentialsResult.data) {
    const error = new Error("Compucash credentials are unavailable for this workspace.");
    error.status = 503;
    throw error;
  }

  const storeTargets = normalizeStoreTargets(connection.configuration);
  let locationQuery = admin
    .from("wine_locations")
    .select("id")
    .eq("organization_id", tenant.organization.id)
    .in("id", storeTargets.map((target) => target.locationId));
  if (tenant.property?.id) {
    locationQuery = locationQuery.eq("property_id", tenant.property.id);
  }
  const { data: mappedLocations, error: mappedLocationsError } = await locationQuery;
  if (mappedLocationsError) throw mappedLocationsError;
  const allowedLocationIds = new Set((mappedLocations ?? []).map((row) => row.id));
  const invalidTargets = storeTargets.filter(
    (target) => !allowedLocationIds.has(target.locationId)
  );
  if (invalidTargets.length > 0) {
    const error = new Error(
      "One or more Compucash store mappings do not belong to this workspace."
    );
    error.status = 409;
    throw error;
  }

  return {
    config: normalizeCompuCashConfig(credentialsResult.data),
    storeTargets,
    connection,
    source: "tenant_connection",
  };
}

export function getCompuCashStatus() {
  const identity =
    process.env.COMPUCASH_CLIENT_ID || process.env.COMPUCASH_IDENTITY;
  const secret =
    process.env.COMPUCASH_CLIENT_SECRET || process.env.COMPUCASH_SECRET;
  const baseUrl = process.env.COMPUCASH_BASE_URL;
  return {
    configured: Boolean(
      identity &&
        secret &&
        baseUrl
    ),
    identityConfigured: Boolean(identity),
    secretConfigured: Boolean(secret),
    baseUrlConfigured: Boolean(baseUrl),
  };
}

export async function getCompuCashTenantStatus({ admin, tenant }) {
  if (tenant?.source !== "membership") return getCompuCashStatus();

  let query = admin
    .from("integration_connections")
    .select("id,status,last_successful_sync_at,created_at")
    .eq("organization_id", tenant.organization.id)
    .eq("provider", "compucash")
    .order("created_at", { ascending: true })
    .limit(1);
  if (tenant.property?.id) {
    query = query.eq("property_id", tenant.property.id);
  }
  const { data: connection, error } = await query.maybeSingle();
  if (error) throw error;

  if (!connection && tenant.organization.id === LEGACY_BURMAN_ORGANIZATION_ID) {
    return getCompuCashStatus();
  }

  const configured = Boolean(connection);
  return {
    configured,
    identityConfigured: configured,
    secretConfigured: configured,
    baseUrlConfigured: configured,
    connected: connection?.status === "active",
    lastSuccessfulSyncAt: connection?.last_successful_sync_at ?? null,
  };
}

export async function listAutomaticCompuCashTenants(admin) {
  const { data: connections, error } = await admin
    .from("integration_connections")
    .select("organization_id,property_id")
    .eq("provider", "compucash")
    .eq("status", "active");

  if (error) {
    if (MISSING_TENANCY_CODES.has(error.code)) {
      return [LEGACY_BURMAN_WORKSPACE];
    }
    throw error;
  }

  const burmanTenant = {
    ...LEGACY_BURMAN_WORKSPACE,
    source: "membership",
  };
  const tenants = [burmanTenant];
  const known = new Set([
    `${burmanTenant.organization.id}|${burmanTenant.property.id}`,
  ]);

  for (const connection of connections ?? []) {
    const key = `${connection.organization_id}|${connection.property_id ?? ""}`;
    if (known.has(key)) continue;
    known.add(key);
    tenants.push({
      organization: {
        id: connection.organization_id,
        name: "Hospitality organization",
        slug: connection.organization_id,
        role: "administrator",
      },
      property: connection.property_id
        ? {
            id: connection.property_id,
            name: "Property",
            slug: connection.property_id,
            role: "administrator",
            timezone: "UTC",
            currencyCode: "EUR",
          }
        : null,
      source: "membership",
    });
  }

  return tenants;
}
