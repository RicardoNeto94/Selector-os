"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

// ⭐ Added missing icons here
import {
  ChartBarIcon,
  PlusIcon,
  Cog6ToothIcon,
  ClipboardDocumentListIcon,
  ExclamationTriangleIcon,
  Bars3Icon,
} from "@heroicons/react/24/outline";

export default function DashboardHome() {
  const supabase = createClientComponentClient();

  const [restaurant, setRestaurant] = useState(null);
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch restaurant
    const { data: r } = await supabase
      .from("restaurants")
      .select("*")
      .eq("owner_id", user.id)
      .maybeSingle();

    setRestaurant(r);

    // Fetch KPIs
    const { count: dishCount } = await supabase
      .from("dishes")
      .select("*", { count: "exact", head: true })
      .eq("restaurant_id", r.id);

    const { count: allergenCount } = await supabase
      .from("allergen")
      .select("*", { count: "exact", head: true });

    const { data: missing } = await supabase.rpc("dishes_missing_allergens", {
      rid: r.id,
    });

    const { data: lastDish } = await supabase
      .from("dishes")
      .select("*")
      .eq("restaurant_id", r.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    setStats({
      dishes: dishCount || 0,
      allergens: allergenCount || 0,
      missingLabels: missing?.count || 0,
      lastDish: lastDish?.name || "None",
      menus: 1, // For now you only have Main Menu; scalable later
    });

    // Activity feed
    const { data: recent } = await supabase
      .from("dishes")
      .select("*")
      .eq("restaurant_id", r.id)
      .order("created_at", { ascending: false })
      .limit(5);

    setActivity(recent || []);
    setLoading(false);
  };

  if (loading) {
    return <p className="text-gray-400">Loading your dashboard...</p>;
  }

  return (
    <div className="space-y-12">
      {/* HEADER */}
      <div className="bg-white shadow-sm border rounded-2xl p-8">
        <h1 className="text-3xl font-bold mb-1">{restaurant.name}</h1>
        <p className="text-gray-500 text-sm">
          Restaurant ID: <span className="font-mono">{restaurant.id}</span>
        </p>
        <p className="text-gray-500 text-sm mt-1">
          Created:{" "}
          {restaurant.created_at
            ? new Date(restaurant.created_at).toLocaleString()
            : "Unknown"}
        </p>
      </div>

      {/* KPI GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KPICard
          title="Total Dishes"
          value={stats.dishes}
          icon={<ChartBarIcon className="w-6 h-6" />}
        />

        <KPICard
          title="Allergens Used"
          value={stats.allergens}
          icon={<ClipboardDocumentListIcon className="w-6 h-6" />}
        />

        <KPICard
          title="Missing Labels"
          value={stats.missingLabels}
          icon={<ExclamationTriangleIcon className="w-6 h-6 text-red-500" />}
        />

        <KPICard
          title="Menus"
          value={stats.menus}
          icon={<Bars3Icon className="w-6 h-6" />}
        />

        <KPICard
          title="Last Added Dish"
          value={stats.lastDish}
          icon={<PlusIcon className="w-6 h-6" />}
        />
      </div>

      {/* QUICK ACTIONS */}
      <div className="bg-white border rounded-2xl shadow-sm p-8">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <ActionButton
            href="/dashboard/dishes"
            label="Add Dish"
            icon={<PlusIcon className="w-6 h-6" />}
          />
          <ActionButton
            href="/dashboard/allergens"
            label="Add Allergen"
            icon={<ClipboardDocumentListIcon className="w-6 h-6" />}
          />
          <ActionButton
            href="/dashboard/menu"
            label="Edit Menu"
            icon={<ChartBarIcon className="w-6 h-6" />}
          />
          <ActionButton
            href="/dashboard/settings"
            label="Settings"
            icon={<Cog6ToothIcon className="w-6 h-6" />}
          />
        </div>
      </div>

      {/* ACTIVITY FEED */}
      <div className="bg-white border rounded-2xl shadow-sm p-8">
        <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>

        <ul className="divide-y">
          {activity.length === 0 && (
            <p className="text-gray-500 text-sm">No recent changes.</p>
          )}

          {activity.map((d) => (
            <li key={d.id} className="py-3">
              <span className="font-medium">{d.name}</span>
              <span className="text-gray-500 text-sm ml-2">
                added {new Date(d.created_at).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function KPICard({ title, value, icon }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border flex items-center space-x-4 hover:shadow transition">
      <div className="p-3 bg-gray-100 rounded-xl">{icon}</div>
      <div>
        <p className="text-gray-500 text-sm">{title}</p>
        <p className="text-2xl font-semibold">{value}</p>
      </div>
    </div>
  );
}

function ActionButton({ href, label, icon }) {
  return (
    <a
      href={href}
      className="flex items-center justify-center space-x-2 bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-semibold transition"
    >
      {icon}
      <span>{label}</span>
    </a>
  );
}
