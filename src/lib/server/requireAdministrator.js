import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient as createCookieClient } from "@/lib/supabase/server";

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase server configuration is missing.");
  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function requireAdministrator(request) {
  const admin = createAdminClient();
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
  let user = null;

  if (token) {
    const result = await admin.auth.getUser(token);
    user = result.data?.user ?? null;
  } else {
    const cookieClient = await createCookieClient();
    const result = await cookieClient.auth.getUser();
    user = result.data?.user ?? null;
  }

  if (!user) return { admin, error: { status: 401, message: "Authentication required." } };

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("status")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError) throw profileError;
  if (profile?.status !== "active") {
    return { admin, user, error: { status: 403, message: "Active account required." } };
  }

  const { data, error } = await admin
    .from("user_roles")
    .select("roles!inner(slug)")
    .eq("user_id", user.id);
  if (error) throw error;
  const isAdministrator = (data ?? []).some((row) => row.roles?.slug === "administrator");
  if (!isAdministrator) {
    return { admin, user, error: { status: 403, message: "Administrator access required." } };
  }
  return { admin, user, error: null };
}
