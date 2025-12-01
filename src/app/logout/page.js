export const dynamic = "force-dynamic";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";

export default async function LogoutPage() {
  const supabase = createServerComponentClient({ cookies });

  // Clear Supabase session
  await supabase.auth.signOut();

  // Always send user to login after logout
  redirect("/sign-in");
}
