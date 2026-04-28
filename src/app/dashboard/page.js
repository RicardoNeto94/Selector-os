import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("*")
    .limit(1)
    .single();

  if (!restaurant) {
    return (
      <div className="so-main-inner">
        <div className="panel p-6">
          No restaurant found
        </div>
      </div>
    );
  }

  const { count: dishesCount } = await supabase
    .from("menu_items")
    .select("*", { count: "exact", head: true });

  const { count: categoriesCount } = await supabase
    .from("menu_categories")
    .select("*", { count: "exact", head: true });

  const { count: menusCount } = await supabase
    .from("menus")
    .select("*", { count: "exact", head: true });

  return (
    <div className="so-main-inner space-y-8">

      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-light">
          Welcome back
        </h1>

        <p className="mt-2 text-[var(--text-muted)]">
          {restaurant.name} — overview of your system
        </p>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-3 gap-6">

        <div className="panel p-6">
          <div className="text-sm text-[var(--text-muted)]">Menus</div>
          <div className="text-3xl mt-2">
            {menusCount || 0}
          </div>
        </div>

        <div className="panel p-6">
          <div className="text-sm text-[var(--text-muted)]">Categories</div>
          <div className="text-3xl mt-2">
            {categoriesCount || 0}
          </div>
        </div>

        <div className="panel p-6">
          <div className="text-sm text-[var(--text-muted)]">Dishes / Items</div>
          <div className="text-3xl mt-2">
            {dishesCount || 0}
          </div>
        </div>

      </div>

      {/* QUICK ACTIONS */}
      <div className="panel p-6">

        <div className="mb-6">
          <div className="text-lg font-medium">
            Quick Actions
          </div>
          <div className="text-sm text-[var(--text-muted)]">
            Jump directly into your workflow
          </div>
        </div>

        <div className="flex flex-wrap gap-3">

          <a href="/dashboard/menu" className="button">
            Manage Menus
          </a>

          <a href="/dashboard/dishes" className="button">
            Manage Dishes
          </a>

          <a href="/dashboard/wines" className="button">
            Wine Cellar
          </a>

          <a href="/dashboard/settings" className="input">
            Settings
          </a>

        </div>

      </div>

      {/* SYSTEM STATUS */}
      <div className="panel p-6">

        <div className="font-medium mb-4">
          System Status
        </div>

        <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
          All systems operational
        </div>

      </div>

    </div>
  );
}