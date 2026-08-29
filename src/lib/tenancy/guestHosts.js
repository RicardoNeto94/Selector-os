const GUEST_HOSTS = Object.freeze({
  "burman.vaxeron.com": {
    destination: "/menu/burman-hotel",
    kind: "hotel",
  },
  "spa.vaxeron.com": {
    destination: "/spa/burman",
    kind: "spa",
  },
  "shangshi.vaxeron.com": {
    destination: "/wine/shang-shi-wine",
    kind: "wine",
  },
  "koyo.vaxeron.com": {
    destination: "/wine/koyo-wine",
    kind: "wine",
  },
  "foxden.vaxeron.com": {
    destination: "/menu/foxden",
    kind: "restaurant",
  },
});

const PRIVATE_PATH_PREFIXES = Object.freeze([
  "/dashboard",
  "/platform-admin",
  "/onboarding",
  "/invite",
  "/access-pending",
  "/select-plan",
  "/sign-in",
  "/sign-up",
  "/api/billing",
  "/api/compucash",
  "/api/create-portal",
  "/api/cron",
  "/api/generate-public-link",
  "/api/menu/delete",
  "/api/menu/publish",
  "/api/platform",
  "/api/restaurant",
  "/api/settings",
  "/api/stripe",
  "/api/team",
  "/api/wine-cellar",
  "/api/wines/descriptions",
]);

export function normalizeHostname(host = "") {
  return String(host).trim().toLowerCase().split(":")[0].replace(/\.$/, "");
}

export function getGuestHostConfig(host) {
  const hostname = normalizeHostname(host);
  if (GUEST_HOSTS[hostname]) return GUEST_HOSTS[hostname];

  // Chrome and Safari resolve subdomains of localhost during local PWA tests.
  const localMatch = hostname.match(/^([a-z0-9-]+)\.localhost$/);
  if (!localMatch) return null;
  return GUEST_HOSTS[`${localMatch[1]}.vaxeron.com`] ?? null;
}

export function isPrivatePath(pathname = "/") {
  return PRIVATE_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function isGuestSafeMethod(method = "GET") {
  return ["GET", "HEAD", "OPTIONS"].includes(String(method).toUpperCase());
}

export { GUEST_HOSTS, PRIVATE_PATH_PREFIXES };
