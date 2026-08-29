import "server-only";

import { createClient as createCookieClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/server/requireAdministrator";

function readJwtAssuranceLevel(token) {
  try {
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64url").toString("utf8")
    );
    return payload?.aal || null;
  } catch {
    return null;
  }
}

export async function requirePlatformAdministrator(request) {
  const admin = createAdminClient();
  const authorization = request?.headers?.get?.("authorization");
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice(7)
    : null;
  let user = null;
  let assuranceLevel = null;

  if (token) {
    const result = await admin.auth.getUser(token);
    user = result.data?.user ?? null;
    // The token has already been validated by Supabase above, so its AAL claim
    // can safely be used for the privileged step-up check.
    assuranceLevel = user ? readJwtAssuranceLevel(token) : null;
  } else {
    const cookieClient = await createCookieClient();
    const result = await cookieClient.auth.getUser();
    user = result.data?.user ?? null;
    if (user) {
      const assurance = await cookieClient.auth.mfa.getAuthenticatorAssuranceLevel();
      assuranceLevel = assurance.data?.currentLevel || null;
    }
  }

  if (!user) {
    return { admin, error: { status: 401, message: "Authentication required." } };
  }

  const { data: platformAdmin, error } = await admin
    .from("platform_administrators")
    .select("user_id,role,status")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (error) throw error;
  if (!platformAdmin) {
    return {
      admin,
      user,
      error: { status: 403, message: "Vaxeron platform administrator access required." },
    };
  }

  return { admin, user, platformAdmin, assuranceLevel, error: null };
}
