// src/app/page.js
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function Home() {
  const supabase = createServerComponentClient({ cookies });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If not logged in → go to sign-in
  if (!user) {
    redirect("/sign-in");
  }

  // If logged in → go straight to dashboard
  redirect("/dashboard");
}
