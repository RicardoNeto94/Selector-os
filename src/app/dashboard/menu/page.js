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

  // 2) Find this user's restaurant
  const { data: restaurant, error: restaurantError } = await supabase
    .from("restaurants")
    .select("*")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (restaurantError || !restaurant) {
    console.error("No restaurant for user", restaurantError);
    return (
      <main className="page-fade px-6 py-10 text-slate-200">
        <div className="max-w-3xl mx-auto rounded-2xl border border-red-500/30 bg-red-950/40 p-6">
          <h1 className="text-lg font-semibold mb-2">No restaurant found</h1>
          <p className="text-sm text-red-100/80">
            We couldn&apos;t find a restaurant linked to your account. Finish
            onboarding or contact support.
          </p>
        </div>
      </main>
    );
  }

  // 3) Load menus for this restaurant
  const { data: menus, error: menusError } = await supabase
    .from("menus")
    .select("*")
    .eq("restaurant_id", restaurant.id)
    .order("created_at", { ascending: true });

  if (menusError) {
    console.error("Error loading menus", menusError);
  }

  // Public path for this restaurant's guest allergen page
  const publicPath = `/menu/${restaurant.slug}`;

  return (
    <main className="page-fade px-6 py-10 text-slate-100">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <header className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-emerald-400/80">
              SELECTOROS • MENUS
            </p>
            <h1 className="mt-2 text-2xl md:text-3xl font-semibold">
              Allergen menus for{" "}
              <span className="text-emerald-400">{restaurant.name}</span>
            </h1>
            <p className="mt-1 text-sm text-slate-300/80 max-w-xl">
              Each menu below feeds into your guest-facing allergen page.
              Share the link or QR code with guests or staff.
            </p>
          </div>
        </header>

        {/* Card */}
        <section className="rounded-3xl bg-slate-950/85 border border-white/10 shadow-[0_24px_70px_rgba(0,0,0,0.85)] p-6 md:p-8">
          {(!menus || menus.length === 0) ? (
            <div className="text-sm text-slate-300/80">
              <p>No menus yet.</p>
              <p className="mt-1">
                Your first menu was created during onboarding. If you deleted
                it, create a new one from the Dishes / Menu tools.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs md:text-sm">
                <thead className="text-slate-400 border-b border-slate-800/80">
                  <tr>
                    <th className="text-left py-2 pr-4 font-normal">Name</th>
                    <th className="text-left py-2 pr-4 font-normal">Created</th>
                    <th className="text-left py-2 pr-4 font-normal">Status</th>
                    <th className="text-left py-2 pr-4 font-normal">
                      Public allergen link
                    </th>
                    <th className="text-left py-2 pr-4 font-normal">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {menus.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-900/60">
                      <td className="py-3 pr-4 font-medium">
                        {m.name || "Unnamed menu"}
                      </td>

                      <td className="py-3 pr-4 text-slate-300/80">
                        {m.created_at
                          ? new Date(m.created_at).toLocaleString()
                          : "—"}
                      </td>

                      <td className="py-3 pr-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium border ${
                            m.is_active
                              ? "border-emerald-400/60 text-emerald-300 bg-emerald-500/10"
                              : "border-slate-600/60 text-slate-300 bg-slate-800/60"
                          }`}
                        >
                          {m.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>

                      {/* Public link – same for all menus (per restaurant) in v1 */}
                      <td className="py-3 pr-4 text-slate-300/80">
                        <div className="flex items-center gap-2">
                          <LinkIcon className="w-4 h-4 opacity-70" />
                          <span className="truncate max-w-[260px]">
                            {publicPath}
                          </span>
                        </div>
                      </td>

                      {/* Guest view button */}
                      <td className="py-3 pr-4">
                        <a
                          href={publicPath}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-full bg-emerald-400 text-slate-950 text-xs font-semibold px-3 py-1.5 hover:bg-emerald-300 transition"
                        >
                          <ArrowTopRightOnSquareIcon className="w-4 h-4" />
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

        <p className="text-[11px] text-slate-500 max-w-xl">
          Note: Deactivating or deleting a menu will immediately change what
          guests see on your allergen page.
        </p>
      </div>
    </main>
  );
}
