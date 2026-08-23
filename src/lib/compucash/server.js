import "server-only";

const DEFAULT_TOKEN_URL =
  "https://www.compucash5.com/IdentityServer/connect/token";

export function getCompuCashConfig() {
  const identity =
    process.env.COMPUCASH_CLIENT_ID || process.env.COMPUCASH_IDENTITY;
  const secret =
    process.env.COMPUCASH_CLIENT_SECRET || process.env.COMPUCASH_SECRET;
  const baseUrl = process.env.COMPUCASH_BASE_URL;
  const tokenUrl = process.env.COMPUCASH_TOKEN_URL || DEFAULT_TOKEN_URL;
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
