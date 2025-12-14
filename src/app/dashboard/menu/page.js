// src/app/dashboard/menu/page.js

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import {
  ArrowTopRightOnSquareIcon,
  LinkIcon,
} from "@heroicons/react/24/outline";

export const dynamic = "force-dynamic";

export default async function MenuDashboardPage() {
  const supabase = createServerComponentClient({ cookies });

  // 1) Auth guard
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  // 2) Load profile (plan + limits)
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("plan, max_menus")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("Failed to load profile", profileError);
  }

  const plan = profile?.plan ?? "starter";
  const maxMenus = profile?.max_menus; // null = unlimited

  // 3) Find this user's restaurant
  const { data: restaurant, error: restaurantError } = await supabase
    .from("restaurants")
    .select("*")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (restaurantError || !restaurant) {
    return (
      <div className="page-fade">
        <div className="max-w-3xl mx-auto">
          <div className="so-card border border-red-200/80 bg-red-50/80">
            <h1 className="mb-2 text-lg font-semibold text-red-800">
              No restaurant found
            </h1>
            <p className="text-sm text-red-700">
              Finish onboarding or contact support.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 4) Load menus
  const { data: menus = [] } = await supabase
    .from("menus")
    .select("*")
    .eq("restaurant_id", restaurant.id)
    .order("created_at", { ascending: true });

  const menuCount = menus.length;
  const isAtLimit =
    typeof maxMenus === "number" && menuCount >= maxMenus;

  const publicPath = `/r/${restaurant.slug}`;

  return (
    <div className="page-fade">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <header className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-emerald-600">
              SELECTOROS • MENUS
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-900 md:text-3xl">
              Menus for <span className="text-emerald-600">{restaurant.name}</span>
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Plan: <strong className="capitalize">{plan}</strong>{" "}
              {typeof maxMenus === "number" && (
                <>({menuCount}/{maxMenus} menus)</>
              )}
            </p>
          </div>
        </header>

        {/* Limit warning */}
        {isAtLimit && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            You’ve reached your menu limit for the <strong>{plan}</strong> plan.
            Upgrade to add more menus.
          </div>
        )}

        {/* Table */}
        <section className="so-card p-6 md:p-8">
          {menuCount === 0 ? (
            <p className="text-sm text-slate-600">No menus yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs md:text-sm">
                <thead className="border-b border-slate-200 text-slate-500">
                  <tr>
                    <th className="py-2 pr-4 text-left">Name</th>
                    <th className="py-2 pr-4 text-left">Created</th>
                    <th className="py-2 pr-4 text-left">Status</th>
                    <th className="py-2 pr-4 text-left">Public link</th>
                    <th className="py-2 pr-4 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {menus.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <td className="py-3 pr-4 font-medium">
                        {m.name || "Unnamed menu"}
                      </td>
                      <td className="py-3 pr-4 text-slate-600">
                        {new Date(m.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 pr-4">
                        <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] text-emerald-700">
                          {m.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-slate-600">
                        <div className="flex items-center gap-2">
                          <LinkIcon className="h-4 w-4 opacity-60" />
                          {publicPath}
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <a
                          href={publicPath}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-full bg-emerald-400 px-3 py-1.5 text-xs font-semibold"
                        >
                          <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                          Guest view
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
