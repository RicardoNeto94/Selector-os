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
      <div className="flex items-center justify-center h-[70vh] text-slate-300 text-sm">
        Loading your SelectorOS workspace…
      </div>
    );
  }

  return (
    <div className="space-y-8 text-slate-100">
      {/* TOP GREETING + SUMMARY */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 p-8 shadow-[0_32px_80px_rgba(0,0,0,0.65)]">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -left-10 -top-10 w-56 h-56 rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="absolute right-0 bottom-0 w-72 h-72 rounded-full bg-indigo-500/10 blur-3xl" />
        </div>

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.25em] text-emerald-400/80">
              SelectorOS • Live cockpit
            </p>
            <h1 className="text-3xl md:text-4xl font-semibold">
              Welcome back,{" "}
              <span className="text-emerald-400">
                {restaurant.name || "your restaurant"}
              </span>
              .
            </h1>
            <p className="text-sm text-slate-300/70 max-w-xl">
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

          {/* Right small summary card */}
          <div className="w-full max-w-sm">
            <div className="rounded-2xl bg-slate-900/80 border border-white/5 px-6 py-5 backdrop-blur-xl">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs text-slate-400 mb-1">
                    Last added dish
                  </p>
                  <p className="text-sm font-medium">{stats.lastDish}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400 mb-1">
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
                  href="/dashboard/dishes/new"   // 🔥 go straight to creation form
                  label="Add dish"
                  icon={<PlusIcon className="w-4 h-4" />}
                />
                <QuickButton
                  href="/dashboard/menu"
                  label="Open menu editor"
                  icon={<ChartBarIcon className="w-4 h-4" />}
                  variant="ghost"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MIDDLE GRID: KPI CARDS + “TASK LIST” */}
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left: KPI cards stacked */}
        <div className="space-y-4 xl:col-span-1">
          <KPICard
            title="Total dishes in SelectorOS"
            value={stats.dishes}
            icon={<ClipboardDocumentListIcon className="w-6 h-6" />}
            description="Everything synced with your live staff view."
          />
          <KPICard
            title="Allergens in your library"
            value={stats.allergens}
            icon={<Bars3Icon className="w-6 h-6" />}
            description="Central allergen set used by all menus."
          />
          <KPICard
            title="Dishes missing allergen labels"
            value={stats.missingLabels}
            icon={
              <ExclamationTriangleIcon className="w-6 h-6 text-amber-400" />
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
          <div className="rounded-3xl bg-slate-950/80 border border-white/5 shadow-[0_22px_60px_rgba(0,0,0,0.75)] p-6 md:p-7">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                Tasks list
              </h2>
              <span className="text-[11px] px-3 py-1 rounded-full bg-slate-800/80 text-slate-300/80 border border-slate-700/70">
                Live from your dishes table
              </span>
            </div>

            {activity.length === 0 ? (
              <p className="text-sm text-slate-400">
                No recent dishes yet. Start by adding your first dish in the
                Dishes tab.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs md:text-sm">
                  <thead className="text-slate-400 border-b border-slate-800/80">
                    <tr>
                      <th className="text-left py-2 pr-4 font-normal">
                        Dish name
                      </th>
                      <th className="text-left py-2 pr-4 font-normal">
                        Created at
                      </th>
                      <th className="text-left py-2 pr-4 font-normal">
                        Restaurant
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {activity.map((d) => (
                      <tr key={d.id} className="hover:bg-slate-900/60">
                        <td className="py-2 pr-4 font-medium">{d.name}</td>
                        <td className="py-2 pr-4 text-slate-300/80">
                          {new Date(d.created_at).toLocaleString()}
                        </td>
                        <td className="py-2 pr-4 text-slate-300/70 text-xs">
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
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Staff view status */}
        <div className="rounded-3xl bg-slate-900/80 border border-slate-800 p-6 md:p-7 shadow-[0_18px_50px_rgba(0,0,0,0.65)] flex flex-col justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
              Staff view
            </p>
            <h3 className="text-lg font-semibold mt-2">
              Keep front-of-house in sync with one source of truth.
            </h3>
            <p className="text-sm text-slate-400 mt-2 max-w-md">
              Every update you make here flows directly into the live SelectorOS
              guest/staff view. Use it as the single place to maintain dishes
              and allergens.
            </p>
          </div>

          <div className="mt-4 flex flex-wrap gap-3 text-xs">
            <a
              href="/dashboard/menu"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-400 text-slate-950 font-semibold hover:bg-emerald-300 transition"
            >
              Open staff tool setup
            </a>
            <span className="inline-flex items-center px-3 py-1 rounded-full border border-slate-700/70 text-slate-300/80">
              Live link: /r/{restaurant.slug || "your-restaurant"}
            </span>
          </div>
        </div>

        {/* Right: System health */}
        <div className="rounded-3xl bg-slate-950/85 border border-slate-800/70 shadow-[0_18px_50px_rgba(0,0,0,0.65)] p-6 md:p-7 flex flex-col justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
              System health
            </p>
            <h3 className="text-lg font-semibold mt-2">
              Data completeness snapshot
            </h3>
            <p className="text-sm text-slate-400 mt-2">
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
      ? "bg-amber-500/10 text-amber-200 border-amber-400/40"
      : tone === "success"
      ? "bg-emerald-500/10 text-emerald-200 border-emerald-400/40"
      : "bg-slate-800/60 text-slate-200 border-slate-600/40";

  return (
    <span
      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full border text-[11px] ${toneClass}`}
    >
      <span className="opacity-80">{label}</span>
      <span className="font-semibold">{value}</span>
    </span>
  );
}

function KPICard({ title, value, description, icon, tone = "default" }) {
  const borderClass =
    tone === "warning"
      ? "border-amber-400/40"
      : "border-slate-700/70";

  return (
    <div className={`rounded-2xl bg-slate-950/80 border ${borderClass} px-5 py-4 shadow-[0_14px_40px_rgba(0,0,0,0.6)] flex items-start gap-4`}>
      <div className="p-2.5 rounded-xl bg-slate-800/80 text-slate-100">
        {icon}
      </div>
      <div>
        <p className="text-xs text-slate-400 mb-1">{title}</p>
        <p className="text-2xl font-semibold mb-1">{value}</p>
        <p className="text-xs text-slate-400">{description}</p>
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
      className={`flex items-center justify-center gap-2 text-xs font-semibold rounded-full px-3 py-2 transition ${base}`}
    >
      {icon}
      <span>{label}</span>
    </a>
  );
}

function HealthPill({ label, value, tone = "default" }) {
  const color =
    tone === "warning"
      ? "text-amber-300 bg-amber-500/10 border-amber-400/40"
      : "text-emerald-300 bg-emerald-500/5 border-emerald-400/30";

  return (
    <div
      className={`rounded-2xl border px-3 py-2 flex flex-col gap-1 ${color}`}
    >
      <span className="text-[11px] uppercase tracking-wide opacity-80">
        {label}
      </span>
      <span className="text-sm font-semibold">{value}</span>
    </div>
  );
}
