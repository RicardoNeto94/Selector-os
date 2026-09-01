import { requireDashboardModule } from "@/lib/server/requireDashboardModule";

export default async function MenusLayout({ children }) {
  await requireDashboardModule("dining");
  return children;
}
