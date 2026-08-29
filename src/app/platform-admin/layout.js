import { redirect } from "next/navigation";
import { requirePlatformAdministrator } from "@/lib/server/requirePlatformAdministrator";

export const dynamic = "force-dynamic";

export default async function PlatformAdminLayout({ children }) {
  const access = await requirePlatformAdministrator();
  if (access.error?.status === 401) {
    redirect("/sign-in?reason=session-required&next=/platform-admin");
  }
  if (access.error) redirect("/dashboard");

  return children;
}
