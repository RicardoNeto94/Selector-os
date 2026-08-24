import { redirect } from "next/navigation";
import DashboardLayoutClient from "./DashboardLayoutClient";
import { requireDashboardUser } from "@/lib/server/requireDashboardUser";

export const dynamic = "force-dynamic";

// This server boundary runs before the private dashboard shell is returned.

export default async function DashboardLayout({ children }) {
  const access = await requireDashboardUser();
  if (access.reason === "session") redirect("/sign-in?reason=session-required");
  if (!access.allowed) redirect("/access-pending");
  return <DashboardLayoutClient>{children}</DashboardLayoutClient>;
}
