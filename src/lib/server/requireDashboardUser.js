import "server-only";

import { createClient as createCookieClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/server/requireAdministrator";

export async function requireDashboardUser() {
  const cookieClient = await createCookieClient();
  const { data: authData, error: authError } = await cookieClient.auth.getUser();
  const user = authData?.user ?? null;

  if (authError || !user) {
    return { user: null, profile: null, roles: [], allowed: false, reason: "session" };
  }

  const admin = createAdminClient();
  const [profileResult, rolesResult] = await Promise.all([
    admin.from("profiles").select("id,email,status").eq("id", user.id).maybeSingle(),
    admin.from("user_roles").select("roles!inner(slug)").eq("user_id", user.id),
  ]);

  if (profileResult.error || rolesResult.error) throw profileResult.error || rolesResult.error;
  const profile = profileResult.data;
  const roles = (rolesResult.data ?? []).map((row) => row.roles?.slug).filter(Boolean);
  const allowed = profile?.status === "active" && roles.length > 0;
  return { user, profile, roles, allowed, reason: allowed ? null : "approval" };
}
