import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
// We intentionally do NOT import redirect here anymore

import SignIn from "src/components/Auth/SignIn";

export default async function SignInPage() {
  const supabase = createServerComponentClient({ cookies });

  // We still *fetch* the session if you ever want to use it,
  // but we don't auto-redirect from here anymore.
  await supabase.auth.getSession();

  return <SignIn />;
}
