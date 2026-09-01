import "server-only";

import { redirect } from "next/navigation";
import { canUseModule } from "@/lib/billing/catalog";
import { requireDashboardUser } from "@/lib/server/requireDashboardUser";

export async function requireDashboardModule(moduleKey) {
  const access = await requireDashboardUser();
  if (access.reason === "session") redirect("/sign-in?reason=session-required");
  if (!access.allowed) redirect("/access-pending");
  if (!canUseModule(access.entitlements, moduleKey)) {
    redirect(`/dashboard/settings?module=${encodeURIComponent(moduleKey)}&reason=module-unavailable`);
  }
  return access;
}
