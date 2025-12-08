// src/app/dashboard/page.js
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

  // 2) Load restaurant for this owner
  const { data: restaurant, error: restaurantError } = await supabase
    .from("restaurants")
    .select("*")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (restaurantError) {
    console.error("Dashboard: error loading restaurant", restaurantError);
  }

  // No restaurant yet → onboarding
  if (!restaurant) {
    redirect("/onboarding");
  }

  // 3) Check paid plan
  const hasPaidPlan =
    restaurant &&
    (restaurant.plan === "standard" ||
      restaurant.plan === "pro" ||
      restaurant.subscription_plan === "starter" ||
      restaurant.subscription_plan === "standard" ||
      restaurant.subscription_plan === "pro");

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

  // 6) Latest dish
  const latestDish =
    dishes
      .slice()
      .sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0] || null;

  // 7) Allergens in library (per restaurant)
  let totalAllergens = 0;
  try {
    const { data: allergensData, error: allergensError } = await supabase
      .from("allergens")
      .select("id", { count: "exact", head: true })
      .eq("restaurant_id", restaurant.id);

    if (allergensError) {
      console.error("Dashboard: error loading allergens", allergensError);
    }
    // When using head:true, count is on .count, not data.length
    totalAllergens = allergensData?.length ?? allergensError?.details?.count ?? 0;
  } catch (e) {
    // If the above head+count style doesn't work with your setup, fall back:
    const { data: allergensFallback, error: allergensFallbackError } =
      await supabase
        .from("allergens")
        .select("id")
        .eq("restaurant_id", restaurant.id);

    if (allergensFallbackError) {
      console.error("Dashboard: fallback error loading allergens", allergensFallbackError);
    }
    totalAllergens = allergensFallback ? allergensFallback.length : 0;
  }

  // 8) Dishes missing allergen labels + coverage %
  let dishesMissingLabels = 0;
  let labelCoverage = 0;

  if (totalDishes > 0) {
    const dishIds = dishes.map((d) => d.id);

    const { data: dishAllergens, error: dishAllergensError } = await supabase
      .from("dish_allergens")
      .select("dish_id")
      .in("dish_id", dishIds);

    if (dishAllergensError) {
      console.error("Dashboard: error loading dish_allergens", dishAllergensError);
    } else {
      const withLabels = new Set((dishAllergens || []).map((da) => da.dish_id));
      dishesMissingLabels = dishIds.filter((id) => !withLabels.has(id)).length;

      const labeledCount = totalDishes - dishesMissingLabels;
      labelCoverage = Math.round((labeledCount / totalDishes) * 100);
    }
  }

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
              <span className="font-semibold text-emerald-500">
                {labelCoverage}%
              </span>
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
            <span className="so-card-pill">Allergens {totalAllergens}</span>
            <span className="so-card-pill">Menus {totalMenus}</span>
          </div>
        </section>

        {/* KPI GRID – 5 cards (Set A) */}
        <section className="so-grid">
          {/* 1. Total dishes */}
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

          {/* 2. Total menus */}
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

          {/* 3. Allergens in library */}
          <article className="so-card kpi-card">
            <div className="so-card-header">
              <span className="so-card-title text-xs text-slate-500">
                Allergens in your library
              </span>
            </div>
            <div className="so-metric-main">{totalAllergens}</div>
            <p className="so-metric-sub">
              Central allergen set used by all menus.
            </p>
          </article>

          {/* 4. Dishes missing labels */}
          <article className="so-card kpi-card">
            <div className="so-card-header">
              <span className="so-card-title text-xs text-slate-500">
                Dishes missing allergen labels
              </span>
            </div>
            <div className="so-metric-main">{dishesMissingLabels}</div>
            <p className="so-metric-sub">
              {dishesMissingLabels === 0
                ? "Nice work! All dishes are fully labeled."
                : "Label these dishes to reach 100% coverage."}
            </p>
          </article>

          {/* 5. Latest added dish */}
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
