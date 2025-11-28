import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import SignIn from "src/components/Auth/SignIn";

export default async function SignInPage() {
  const supabase = createServerComponentClient({ cookies });
  const { data } = await supabase.auth.getSession();

  // If the user is already logged in and hits /sign-in,
  // send them straight to the dashboard, not onboarding.
  if (data?.session) {
    redirect("/dashboard");
  }

  return <SignIn />;
}
