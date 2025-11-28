"use client";

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";

export default function SignOutButton({ className = "" }) {
  const supabase = createClientComponentClient();
  const router = useRouter();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/sign-in");
  };

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className={className || "text-xs text-slate-300 hover:text-white"}
    >
      Log out
    </button>
  );
}
