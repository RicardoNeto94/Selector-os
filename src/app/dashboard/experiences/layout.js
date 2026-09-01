import { requireDashboardModule } from "@/lib/server/requireDashboardModule";

export default async function DiningExperiencesLayout({ children }) {
  await requireDashboardModule("dining");
  return children;
}
