import { requireDashboardModule } from "@/lib/server/requireDashboardModule";

export default async function WineOperationsLayout({ children }) {
  await requireDashboardModule("wine");
  return children;
}
