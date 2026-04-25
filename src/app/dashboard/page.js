import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // 🔹 GET RESTAURANT
  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("*")
    .limit(1)
    .single();

  if (!restaurant) {
    return (
      <div className="so-main-inner">
        <div className="so-card">
          No restaurant found
        </div>
      </div>
    );
  }

  // 🔹 GET COUNTS
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
        <h1 className="so-title">
          Welcome back
        </h1>

        <p className="so-sub">
          {restaurant.name} — overview of your system
        </p>
      </div>

      {/* KPI CARDS */}
      <div className="so-grid">

        <div className="so-card">
          <div className="so-sub">Menus</div>
          <div className="text-3xl font-semibold mt-2">
            {menusCount || 0}
          </div>
        </div>

        <div className="so-card">
          <div className="so-sub">Categories</div>
          <div className="text-3xl font-semibold mt-2">
            {categoriesCount || 0}
          </div>
        </div>

        <div className="so-card">
          <div className="so-sub">Dishes / Items</div>
          <div className="text-3xl font-semibold mt-2">
            {dishesCount || 0}
          </div>
        </div>

      </div>

      {/* QUICK ACTIONS */}
      <div className="so-card">

        <div className="flex justify-between items-center mb-6">
          <div>
            <div className="font-semibold text-lg">
              Quick Actions
            </div>
            <div className="so-sub">
              Jump directly into your workflow
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">

          <a href="/dashboard/menu" className="so-btn-primary">
            Manage Menus
          </a>

          <a href="/dashboard/dishes" className="so-btn-primary">
            Manage Dishes
          </a>

          <a href="/dashboard/wines" className="so-btn-primary">
            Wine Cellar
          </a>

          <a href="/dashboard/settings" className="so-btn-ghost">
            Settings
          </a>

        </div>

      </div>

      {/* SYSTEM STATUS */}
      <div className="so-card">

        <div className="font-semibold mb-4">
          System Status
        </div>

        <div className="flex items-center gap-2 text-sm text-slate-400">
          <div className="w-2 h-2 rounded-full bg-green-400"></div>
          All systems operational
        </div>

      </div>

    </div>
  );
}