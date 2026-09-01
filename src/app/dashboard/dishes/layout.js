import { requireDashboardModule } from "@/lib/server/requireDashboardModule";

export default async function DishesLayout({ children }) {
  await requireDashboardModule("dining");
  return children;
}
