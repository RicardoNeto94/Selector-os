"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function doLogout() {
      const supabase = createClient();

      await supabase.auth.signOut();

      if (!cancelled) {
        router.replace("/sign-in");
        router.refresh();
      }
    }

    doLogout();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div style={{ padding: "20px", color: "#fff" }}>
      Logging out…
    </div>
  );
}