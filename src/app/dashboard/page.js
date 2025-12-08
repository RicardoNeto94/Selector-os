// src/app/dashboard/page.js
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
// add other imports if you had some (icons, components, etc.)

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

  // 2) Load restaurant for this owner
  const { data: restaurant, error } = await supabase
    .from("restaurants")
    .select("*")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Dashboard: error loading restaurant", error);
  }

  // No restaurant yet → onboarding
  if (!restaurant) {
    redirect("/onboarding");
  }

  // 3) Check paid plan
  const hasPaidPlan =
    restaurant &&
    (
      restaurant.plan === "standard" ||
      restaurant.plan === "pro" ||
      restaurant.subscription_plan === "starter" ||
      restaurant.subscription_plan === "standard" ||
      restaurant.subscription_plan === "pro"
    );

  if (!hasPaidPlan) {
    redirect("/select-plan");
  }

  // 4) Load menus for this restaurant
  const { data: menus, error: menusError } = await supabase
    .from("menus")
    .select("id, name")
    .eq("restaurant_id", restaurant.id);

  if (menusError) {
    console.error("Dashboard: error loading menus", menusError);
  }

  const menuIds = (menus || []).map((m) => m.id);

  // 5) Load dishes for those menus
  let dishes = [];
  if (menuIds.length > 0) {
    const { data: dishesData, error: dishesError } = await supabase
      .from("dishes")
      .select("id, name, created_at, menu_id")
      .in("menu_id", menuIds);

    if (dishesError) {
      console.error("Dashboard: error loading dishes", dishesError);
    } else {
      dishes = dishesData || [];
    }
  }

  const totalDishes = dishes.length;
  const totalMenus = menuIds.length;

  const latestDish =
    dishes
      .slice()
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0] ||
    null;

  // 6) Render dashboard
  return (
    <main className="so-main">
      <div className="so-main-inner page-fade">
        {/* HERO CARD */}
        <section className="so-card so-card-hero mb-5">
          <div className="so-card-header">
            <div className="so-card-title">
              <span className="text-xs uppercase tracking-[0.22em] text-emerald-500">
                SelectorOS • Live cockpit
              </span>
            </div>
            <div className="text-xs text-slate-500">
              Label coverage&nbsp;
              <span className="font-semibold text-emerald-500">100%</span>
            </div>
          </div>

          <h1 className="mt-2 text-[28px] font-semibold text-slate-900">
            Welcome back,{" "}
            <span className="text-emerald-600">{restaurant.name}</span>.
          </h1>
          <p className="mt-2 text-sm text-slate-500 max-w-xl">
            Manage dishes, allergens and menu visibility from a single control
            panel. Your staff view updates in real time with every change.
          </p>

          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <span className="so-card-pill">Dishes {totalDishes}</span>
            <span className="so-card-pill">Menus {totalMenus}</span>
          </div>
        </section>

        {/* KPI GRID */}
        <section className="so-grid">
          <article className="so-card kpi-card">
            <div className="so-card-header">
              <span className="so-card-title text-xs text-slate-500">
                Total dishes in SelectorOS
              </span>
            </div>
            <div className="so-metric-main">{totalDishes}</div>
            <p className="so-metric-sub">
              Everything synced with your live staff view.
            </p>
          </article>

          <article className="so-card kpi-card">
            <div className="so-card-header">
              <span className="so-card-title text-xs text-slate-500">
                Menus in your workspace
              </span>
            </div>
            <div className="so-metric-main">{totalMenus}</div>
            <p className="so-metric-sub">
              Public & staff views powered from here.
            </p>
          </article>

          <article className="so-card kpi-card">
            <div className="so-card-header">
              <span className="so-card-title text-xs text-slate-500">
                Latest added dish
              </span>
            </div>
            <div className="so-metric-main text-base">
              {latestDish ? latestDish.name : "No dishes yet"}
            </div>
            {latestDish && (
              <p className="so-metric-sub">
                Added {new Date(latestDish.created_at).toLocaleString()}
              </p>
            )}
          </article>
        </section>
      </div>
    </main>
  );
}
