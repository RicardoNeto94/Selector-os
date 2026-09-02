"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowPathIcon } from "@heroicons/react/24/outline";

export default function SalesRefreshButton() {
  const router = useRouter();
  const [state, setState] = useState("idle");

  async function refresh() {
    setState("loading");
    try {
      const response = await fetch("/api/compucash/activity/sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Activity refresh failed.");
      setState("success");
      router.refresh();
    } catch (error) {
      console.error("SALES REFRESH ERROR:", error);
      setState("error");
    }
  }

  return <button type="button" onClick={refresh} disabled={state === "loading"} className="inline-flex min-h-9 items-center justify-center gap-2 rounded-full border border-[#d9cbc0] bg-white px-4 text-[8px] uppercase tracking-[0.14em] text-[#6f625a] disabled:opacity-50">
    <ArrowPathIcon className={`h-3.5 w-3.5 ${state === "loading" ? "animate-spin" : ""}`} />
    {state === "loading" ? "Refreshing" : state === "success" ? "Updated" : state === "error" ? "Try again" : "Refresh sales"}
  </button>;
}
