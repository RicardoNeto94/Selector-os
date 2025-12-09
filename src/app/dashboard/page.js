/* src/app/dashboard/page.js */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = createServerComponentClient({ cookies });

  // 1) Auth guard
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  // 2) Get restaurant for this owner
  const { data: restaurant, error: restaurantError } = await supabase
    .from("restaurants")
    .select("*")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (restaurantError || !restaurant) {
    console.error("Dashboard: no restaurant for user", restaurantError);
    return (
      <main className="page-fade">
        <div className="so-main-inner max-w-3xl mx-auto">
          <div className="so-card border border-red-200/80 bg-red-50/90">
            <h1 className="mb-2 text-lg font-semibold text-red-800">
              No restaurant found
            </h1>
            <p className="text-sm text-red-700">
              We couldn&apos;t find a restaurant linked to your account yet.
              Finish onboarding or contact support.
            </p>
          </div>
        </div>
      </main>
    );
  }

  // 3) Load some basic stats (safe + simple)
  const { data: menus = [] } = await supabase
    .from("menus")
    .select("id, name, created_at")
    .eq("restaurant_id", restaurant.id);

  let dishesCount = 0;
  let latestDish = null;

  if (menus.length > 0) {
    const menuIds = menus.map((m) => m.id);

    const { data: dishes = [] } = await supabase
      .from("dishes")
      .select("*")
      .in("menu_id", menuIds)
      .order("created_at", { ascending: false });

    dishesCount = dishes.length;
    latestDish = dishes[0] || null;
  }

  // Allergens count is optional – if table doesn’t exist, just show 0
  let allergensCount = 0;
  try {
    const { data: allergens = [] } = await supabase
      .from("allergens")
      .select("id")
      .eq("restaurant_id", restaurant.id);

    allergensCount = allergens.length;
  } catch (e) {
    console.warn(
      "Allergens table not available or query failed:",
      e?.message ?? e
    );
  }

  return (
    <main className="page-fade">
      <div className="so-main-inner space-y-6">
        {/* HERO / WELCOME */}
        <section className="so-card so-card-hero">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-emerald-600">
                SELECTOROS • LIVE COCKPIT
              </p>
              <h1 className="mt-2 text-2xl font-semibold text-slate-900 md:text-3xl">
                Welcome back,{" "}
                <span className="text-emerald-600">
                  {restaurant.name || "Operator"}
                </span>
                .
              </h1>
              <p className="mt-2 max-w-xl text-sm text-slate-600">
                Manage dishes, allergens and menu visibility from a single
                control panel. Your staff views update in real time with every
                change.
              </p>
            </div>

            <div className="mt-2 flex gap-2 text-xs text-slate-600 md:flex-col md:text-right">
              <div>
                <span className="font-medium text-slate-900">
                  Menus live:&nbsp;
                </span>
                {menus.length}
              </div>
              <div>
                <span className="font-medium text-slate-900">
                  Dishes in workspace:&nbsp;
                </span>
                {dishesCount}
              </div>
              <div>
                <span className="font-medium text-slate-900">
                  Allergens in library:&nbsp;
                </span>
                {allergensCount}
              </div>
            </div>
          </div>
        </section>

        {/* KPI GRID */}
        <section className="so-grid">
          {/* Total dishes */}
          <div className="so-card">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Total dishes in SelectorOS</span>
            </div>
            <div className="mt-2 text-3xl font-semibold text-slate-900">
              {dishesCount}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Everything synced with your live guest view.
            </p>
          </div>

          {/* Menus */}
          <div className="so-card">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Menus in your workspace</span>
            </div>
            <div className="mt-2 text-3xl font-semibold text-slate-900">
              {menus.length}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Public &amp; staff views powered from here.
            </p>
          </div>

          {/* Allergens */}
          <div className="so-card">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Allergens in your library</span>
            </div>
            <div className="mt-2 text-3xl font-semibold text-slate-900">
              {allergensCount}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Central allergen set used by all menus.
            </p>
          </div>
        </section>

        {/* SECONDARY GRID */}
        <section className="so-grid-lg">
          {/* Latest dish */}
          <div className="so-card">
            <div className="text-xs text-slate-500">Latest added dish</div>
            {latestDish ? (
              <>
                <div className="mt-2 text-lg font-semibold text-slate-900">
                  {latestDish.name}
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Added{" "}
                  {latestDish.created_at
                    ? new Date(latestDish.created_at).toLocaleString()
                    : "recently"}
                  .
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm text-slate-600">
                No dishes yet. Start by adding your first dish from the Dishes
                tab.
              </p>
            )}
          </div>

          {/* Workspace status */}
          <div className="so-card">
            <div className="text-xs text-slate-500">Workspace status</div>
            <div className="mt-2 space-y-1 text-sm text-slate-700">
              <div>
                <span className="font-medium text-slate-900">Plan:</span>{" "}
                Starter
              </div>
              <div>
                <span className="font-medium text-slate-900">
                  Menus live:
                </span>{" "}
                {menus.length}
              </div>
              <div>
                <span className="font-medium text-slate-900">
                  Label coverage:
                </span>{" "}
                100%*
              </div>
            </div>
            <p className="mt-3 text-[11px] text-slate-500">
              *Label coverage calculation will be refined in a later release.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
