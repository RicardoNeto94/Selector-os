// src/app/dashboard/billing/page.js

import { redirect } from "next/navigation";
import { requireBillingAdministrator } from "@/lib/server/billingContext";
import BillingWorkspaceClient from "./BillingWorkspaceClient";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const access = await requireBillingAdministrator();
  if (!access.user) redirect("/sign-in");
  if (access.error) redirect("/dashboard/settings?billing=restricted");

  return (
    <main className="so-main page-fade">
      <div className="so-main-inner mx-auto w-full max-w-[1240px]">
        <BillingWorkspaceClient
          organization={access.tenant.organization}
          settings={access.settings}
          entitlements={access.entitlements}
        />
      </div>
    </main>
  );
}
