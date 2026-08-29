import "server-only";

import { createClient as createCookieClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/server/requireAdministrator";

export async function requirePlatformAdministrator(request) {
  const admin = createAdminClient();
  const authorization = request?.headers?.get?.("authorization");
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice(7)
    : null;
  let user = null;

  if (token) {
    const result = await admin.auth.getUser(token);
    user = result.data?.user ?? null;
  } else {
    const cookieClient = await createCookieClient();
    const result = await cookieClient.auth.getUser();
    user = result.data?.user ?? null;
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

  return { admin, user, platformAdmin, error: null };
}
