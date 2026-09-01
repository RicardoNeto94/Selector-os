import { requireDashboardModule } from "@/lib/server/requireDashboardModule";

export default async function WineCatalogueLayout({ children }) {
  await requireDashboardModule("wine");
  return children;
}
