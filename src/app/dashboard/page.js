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

  // 1.5) PAYWALL / PLAN GUARD
  let planLabel = "Starter";

  try {
    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .select("status, plan, price_id")
      .eq("user_id", user.id)
      .in("status", ["active", "trialing"])
      .maybeSingle();

    if (subError) {
      console.warn(
        "Dashboard: subscription check failed (non-fatal):",
        subError
      );
    } else if (!subscription) {
      redirect("/select-plan");
    } else {
      if (subscription.plan) planLabel = String(subscription.plan);
      else if (subscription.price_id) planLabel = "Pro";
      else planLabel = "Active";
    }
  } catch (e) {
    console.warn(
      "Dashboard: subscription table not available or query threw (non-fatal):",
      e?.message ?? e
    );
  }

  // 2) Get restaurant
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

  // 3) Load stats
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
    <main className="so-main page-fade">
      <div className="so-main-inner space-y-6">

        {/* ALERT */}
        <section className="so-card so-alert-card">
          <div>
            <div className="text-sm text-slate-400">Workspace notice</div>
            <div className="text-lg font-semibold text-white">
              SelectorOS workspace active
            </div>
            <div className="text-sm text-slate-400 mt-1">
              Manage dishes, allergens and menu visibility from a single cockpit.
            </div>
          </div>

          <button className="so-btn-primary">
            Open menus
          </button>
        </section>

        {/* KPI ROW */}
        <section className="so-kpi-grid">

          <div className="so-card so-kpi">
            <div className="so-kpi-title">Menus</div>
            <div className="so-kpi-value">{menus.length}</div>
            <div className="so-kpi-sub">Active menus</div>
          </div>

          <div className="so-card so-kpi">
            <div className="so-kpi-title">Dishes</div>
            <div className="so-kpi-value">{dishesCount}</div>
            <div className="so-kpi-sub">Total dishes</div>
          </div>

          <div className="so-card so-kpi">
            <div className="so-kpi-title">Allergens</div>
            <div className="so-kpi-value">{allergensCount}</div>
            <div className="so-kpi-sub">Allergen library</div>
          </div>

          <div className="so-card so-kpi">
            <div className="so-kpi-title">Plan</div>
            <div className="so-kpi-value">{planLabel}</div>
            <div className="so-kpi-sub">Workspace tier</div>
          </div>

        </section>

        {/* MAIN GRID */}
        <section className="so-dashboard-grid">

          <div className="so-card">
            <div className="so-card-title">Latest dish</div>

            {latestDish ? (
              <>
                <div className="mt-3 text-lg font-semibold text-white">
                  {latestDish.name}
                </div>

                <div className="text-sm text-slate-400 mt-1">
                  Added{" "}
                  {latestDish.created_at
                    ? new Date(latestDish.created_at).toLocaleString()
                    : "recently"}
                </div>
              </>
            ) : (
              <div className="text-slate-400 mt-3">
                No dishes yet. Add your first dish.
              </div>
            )}
          </div>

          <div className="so-card">
            <div className="so-card-title">Workspace status</div>

            <div className="mt-4 space-y-2 text-sm text-slate-300">
              <div>
                <span className="text-slate-400">Plan:</span> {planLabel}
              </div>

              <div>
                <span className="text-slate-400">Menus:</span> {menus.length}
              </div>

              <div>
                <span className="text-slate-400">Allergens:</span> {allergensCount}
              </div>
            </div>
          </div>

        </section>

      </div>
    </main>
  );
}
