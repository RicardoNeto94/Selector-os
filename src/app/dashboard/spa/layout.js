import { requireDashboardModule } from "@/lib/server/requireDashboardModule";

export default async function SpaLayout({ children }) {
  await requireDashboardModule("spa");
  return children;
}
