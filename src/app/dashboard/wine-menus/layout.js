import { requireDashboardModule } from "@/lib/server/requireDashboardModule";

export default async function WineMenusLayout({ children }) {
  await requireDashboardModule("guest_experience");
  return children;
}
