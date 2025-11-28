import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

import SignIn from "src/components/Auth/SignIn";

export default async function SignInPage() {
  const supabase = createServerComponentClient({ cookies });

  // Just fetch session so Supabase client is wired – no redirect here.
  await supabase.auth.getSession();

  return <SignIn />;
}
