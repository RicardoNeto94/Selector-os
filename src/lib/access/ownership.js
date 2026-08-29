const PLATFORM_OWNER_EMAILS = new Set([
  "ricardoneto8@gmail.com",
]);

export function normalizeAccountEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export function isProtectedWorkspaceOwner({ email, membershipRole } = {}) {
  return membershipRole === "owner"
    || PLATFORM_OWNER_EMAILS.has(normalizeAccountEmail(email));
}
