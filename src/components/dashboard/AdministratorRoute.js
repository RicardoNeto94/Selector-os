import "server-only";

import { redirect } from "next/navigation";
import { createClient as createCookieClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/server/requireAdministrator";

export default async function AdministratorRoute({ children }) {
  const cookieClient = await createCookieClient();
  const { data: authData } = await cookieClient.auth.getUser();
  const user = authData?.user;

  if (!user) {
    redirect("/sign-in");
  }

  const admin = createAdminClient();
  const { data: roleRows, error } = await admin
    .from("user_roles")
    .select("roles!inner(slug)")
    .eq("user_id", user.id);

  if (error) {
    throw error;
  }

  const isAdministrator = (roleRows ?? []).some(
    (row) => row.roles?.slug === "administrator"
  );

  if (!isAdministrator) {
    redirect("/dashboard");
  }

  return children;
}
