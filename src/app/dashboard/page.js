"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import {
  ChartBarIcon,
  ClipboardDocumentListIcon,
  ExclamationTriangleIcon,
  Bars3Icon,
} from "@heroicons/react/24/outline";
import { PlusIcon } from "@heroicons/react/20/solid";

export default function DashboardHome() {
  const supabase = createClientComponentClient();

  const [restaurant, setRestaurant] = useState(null);
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Restaurant
    const { data: r } = await supabase
      .from("restaurants")
      .select("*")
      .eq("owner_id", user.id)
      .maybeSingle();

    setRestaurant(r);

    // KPIs
    const { count: dishCount } = await supabase
      .from("dishes")
      .select("*", { count: "exact", head: true });

    const { count: allergenCount } = await supabase
      .from("allergen")
      .select("*", { count: "exact", head: true });

    const { data: missing } = await supabase.rpc("dishes_missing_allergens", {
      rid: r.id,
    });

    const { data: lastDish } = await supabase
      .from("dishes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    setStats({
      dishes: dishCount || 0,
      allergens: allergenCount || 0,
      missingLabels: missing?.count || 0,
      lastDish: lastDish?.name || "No dishes yet",
      menus: 1,
    });

    // Activity feed
    const { data: recent } = await supabase
      .from("dishes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5);

    setActivity(recent || []);
    setLoading(false);
  };

  if (loading || !restaurant || !stats) {
    return (
      <div className="flex items-center justify-center h-[70vh] text-slate-500 text-sm">
        Loading your SelectorOS workspace…
      </div>
    );
  }

  return (
    <div className="so-main-inner space-y-8">
      {/* TOP GREETING + SUMMARY – now frosted glass */}
      <section className="so-card relative overflow-hidden so-card-hero">
        {/* decorative glows */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-16 -top-24 h-64 w-64 rounded-full bg-emerald-400/12 blur-3xl" />
          <div className="absolute right-[-40px] bottom-[-40px] h-72 w-72 rounded-full bg-sky-500/12 blur-3xl" />
        </div>

        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.25em] text-emerald-600">
              SelectorOS • Live cockpit
            </p>
            <h1 className="text-3xl font-semibold text-slate-900 md:text-4xl">
              Welcome back,{" "}
              <span className="text-emerald-600">
                {restaurant.name || "your restaurant"}
              </span>
              .
            </h1>
            <p className="max-w-xl text-sm text-slate-600">
              Manage dishes, allergens and menu visibility from a single control
              panel. Your staff view updates in real time with every change.
            </p>

            <div className="mt-4 flex flex-wrap gap-3 text-xs">
              <Tag label="Dishes" value={stats.dishes} />
              <Tag label="Allergens" value={stats.allergens} />
              <Tag
                label="Missing labels"
                value={stats.missingLabels}
                tone={stats.missingLabels ? "warning" : "success"}
              />
              <Tag label="Menus" value={stats.menus} />
            </div>
          </div>

          {/* Right small summary card – dark glass for contrast */}
          <div className="w-full max-w-sm">
            <div className="glass-dark px-6 py-5 rounded-2xl">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="mb-1 text-xs text-slate-300/80">
                    Last added dish
                  </p>
                  <p className="text-sm font-medium text-slate-50">
                    {stats.lastDish}
                  </p>
                </div>
                <div className="text-right">
                  <p className="mb-1 text-xs text-slate-300/80">
                    Label coverage
                  </p>
                  <p className="text-lg font-semibold text-emerald-400">
                    {stats.dishes === 0
                      ? "—"
                      : `${Math.round(
                          ((stats.dishes - stats.missingLabels) /
                            stats.dishes) *
                            100
                        )}%`}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <QuickButton
                  href="/dashboard/dishes/new"
                  label="Add dish"
                  icon={<PlusIcon className="h-4 w-4" />}
                />
                <QuickButton
                  href="/dashboard/menu"
                  label="Open menu editor"
                  icon={<ChartBarIcon className="h-4 w-4" />}
                  variant="ghost"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MIDDLE GRID: KPI CARDS + “TASK LIST” */}
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Left: KPI cards stacked */}
        <div className="space-y-4 xl:col-span-1">
          <KPICard
            title="Total dishes in SelectorOS"
            value={stats.dishes}
            icon={<ClipboardDocumentListIcon className="h-6 w-6" />}
            description="Everything synced with your live staff view."
          />
          <KPICard
            title="Allergens in your library"
            value={stats.allergens}
            icon={<Bars3Icon className="h-6 w-6" />}
            description="Central allergen set used by all menus."
          />
          <KPICard
            title="Dishes missing allergen labels"
            value={stats.missingLabels}
            icon={
              <ExclamationTriangleIcon className="h-6 w-6 text-amber-500" />
            }
            tone={stats.missingLabels ? "warning" : "default"}
            description={
              stats.missingLabels
                ? "Finish these to keep staff and guests safe."
                : "All dishes fully labelled. Nice."
            }
          />
        </div>

        {/* Right: “Tasks list” style card */}
        <div className="xl:col-span-2">
          <div className="so-card p-6 md:p-7">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                Tasks list
              </h2>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] text-slate-600">
                Live from your dishes table
              </span>
            </div>

            {activity.length === 0 ? (
              <p className="text-sm text-slate-500">
                No recent dishes yet. Start by adding your first dish in the
                Dishes tab.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs md:text-sm">
                  <thead className="border-b border-slate-200 text-slate-500">
                    <tr>
                      <th className="py-2 pr-4 text-left font-normal">
                        Dish name
                      </th>
                      <th className="py-2 pr-4 text-left font-normal">
                        Created at
                      </th>
                      <th className="py-2 pr-4 text-left font-normal">
                        Restaurant
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {activity.map((d) => (
                      <tr
                        key={d.id}
                        className="transition-colors hover:bg-slate-100/70"
                      >
                        <td className="py-2 pr-4 font-medium text-slate-800">
                          {d.name}
                        </td>
                        <td className="py-2 pr-4 text-slate-600">
                          {new Date(d.created_at).toLocaleString()}
                        </td>
                        <td className="py-2 pr-4 text-xs text-slate-500">
                          {restaurant.slug || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* BOTTOM STRIP: OPERATIONS CARDS */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left: Staff view status */}
        <div className="so-card flex flex-col justify-between p-6 md:p-7">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
              Staff view
            </p>
            <h3 className="mt-2 text-lg font-semibold text-slate-900">
              Keep front-of-house in sync with one source of truth.
            </h3>
            <p className="mt-2 max-w-md text-sm text-slate-500">
              Every update you make here flows directly into the live SelectorOS
              guest/staff view. Use it as the single place to maintain dishes
              and allergens.
            </p>
          </div>

          <div className="mt-4 flex flex-wrap gap-3 text-xs">
            <a
              href="/dashboard/menu"
              className="inline-flex items-center gap-2 rounded-full bg-emerald-400 px-4 py-2 font-semibold text-slate-950 transition hover:bg-emerald-300"
            >
              Open staff tool setup
            </a>
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50/80 px-3 py-1 text-slate-600">
              Live link: /r/{restaurant.slug || "your-restaurant"}
            </span>
          </div>
        </div>

        {/* Right: System health */}
        <div className="so-card flex flex-col justify-between p-6 md:p-7">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
              System health
            </p>
            <h3 className="mt-2 text-lg font-semibold text-slate-900">
              Data completeness snapshot
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Quick view of how safe your data is for staff use. As long as
              everything is labelled, your team never has to guess at allergens
              during service.
            </p>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
            <HealthPill
              label="Labelled dishes"
              value={stats.dishes - stats.missingLabels}
            />
            <HealthPill
              label="Unlabelled"
              value={stats.missingLabels}
              tone="warning"
            />
            <HealthPill label="Menus live" value={stats.menus} />
          </div>
        </div>
      </section>
    </div>
  );
}

/* Small presentational components */

function Tag({ label, value, tone = "default" }) {
  const toneClass =
    tone === "warning"
      ? "bg-amber-100 text-amber-800 border-amber-300"
      : tone === "success"
      ? "bg-emerald-100 text-emerald-800 border-emerald-300"
      : "bg-slate-100 text-slate-700 border-slate-200";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] ${toneClass}`}
    >
      <span className="opacity-80">{label}</span>
      <span className="font-semibold">{value}</span>
    </span>
  );
}

function KPICard({ title, value, description, icon, tone = "default" }) {
  const borderClass =
    tone === "warning" ? "border-amber-300" : "border-transparent";

  return (
    <div className={`so-card flex items-start gap-4 ${borderClass}`}>
      <div className="rounded-xl bg-slate-100 p-2.5 text-slate-900">
        {icon}
      </div>
      <div>
        <p className="mb-1 text-xs text-slate-500">{title}</p>
        <p className="mb-1 text-2xl font-semibold text-slate-900">{value}</p>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
    </div>
  );
}

function QuickButton({ href, label, icon, variant = "solid" }) {
  const base =
    variant === "solid"
      ? "bg-emerald-400 text-slate-950 hover:bg-emerald-300"
      : "bg-slate-800/80 text-slate-100 hover:bg-slate-700";

  return (
    <a
      href={href}
      className={`flex items-center justify-center gap-2 rounded-full px-3 py-2 text-xs font-semibold transition ${base}`}
    >
      {icon}
      <span>{label}</span>
    </a>
  );
}

function HealthPill({ label, value, tone = "default" }) {
  const color =
    tone === "warning"
      ? "text-amber-800 bg-amber-100 border-amber-300"
      : "text-emerald-800 bg-emerald-100 border-emerald-300";

  return (
    <div
      className={`flex flex-col gap-1 rounded-2xl border px-3 py-2 ${color}`}
    >
      <span className="text-[11px] uppercase tracking-wide opacity-80">
        {label}
      </span>
      <span className="text-sm font-semibold">{value}</span>
    </div>
  );
}
