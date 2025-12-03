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
      <main className="page-fade">
        <div className="so-main-inner max-w-3xl mx-auto">
          <div className="so-card border border-red-200/80 bg-red-50/80">
            <h1 className="mb-2 text-lg font-semibold text-red-800">
              No restaurant found
            </h1>
            <p className="text-sm text-red-700">
              We couldn&apos;t find a restaurant linked to your account. Finish
              onboarding or contact support.
            </p>
          </div>
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

  // ✅ Public path for this restaurant's guest allergen page
  //    Route lives at /r/[slug]
  const publicPath = `/r/${restaurant.slug}`;

  return (
    <main className="page-fade">
      <div className="so-main-inner max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <header className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-emerald-600">
              SELECTOROS • MENUS
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-900 md:text-3xl">
              Allergen menus for{" "}
              <span className="text-emerald-600">{restaurant.name}</span>
            </h1>
            <p className="mt-1 max-w-xl text-sm text-slate-600">
              Each menu below feeds into your guest-facing allergen page. Share
              the link or QR code with guests or staff.
            </p>
          </div>
        </header>

        {/* Card */}
        <section className="so-card p-6 md:p-8">
          {!menus || menus.length === 0 ? (
            <div className="text-sm text-slate-600">
              <p>No menus yet.</p>
              <p className="mt-1">
                Your first menu was created during onboarding. If you deleted
                it, create a new one from the Dishes / Menu tools.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs md:text-sm">
                <thead className="border-b border-slate-200 text-slate-500">
                  <tr>
                    <th className="py-2 pr-4 text-left font-normal">Name</th>
                    <th className="py-2 pr-4 text-left font-normal">Created</th>
                    <th className="py-2 pr-4 text-left font-normal">Status</th>
                    <th className="py-2 pr-4 text-left font-normal">
                      Public allergen link
                    </th>
                    <th className="py-2 pr-4 text-left font-normal">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {menus.map((m) => (
                    <tr
                      key={m.id}
                      className="transition-colors hover:bg-slate-50"
                    >
                      <td className="py-3 pr-4 font-medium text-slate-900">
                        {m.name || "Unnamed menu"}
                      </td>

                      <td className="py-3 pr-4 text-slate-600">
                        {m.created_at
                          ? new Date(m.created_at).toLocaleString()
                          : "—"}
                      </td>

                      <td className="py-3 pr-4">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
                            m.is_active
                              ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                              : "border-slate-300 bg-slate-50 text-slate-600"
                          }`}
                        >
                          {m.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>

                      {/* Public link – same for all menus (per restaurant) in v1 */}
                      <td className="py-3 pr-4 text-slate-600">
                        <div className="flex items-center gap-2">
                          <LinkIcon className="h-4 w-4 opacity-60" />
                          <span className="max-w-[260px] truncate">
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
                          className="inline-flex items-center gap-1 rounded-full bg-emerald-400 px-3 py-1.5 text-xs font-semibold text-slate-950 transition hover:bg-emerald-300"
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

        <p className="max-w-xl text-[11px] text-slate-500">
          Note: Deactivating or deleting a menu will immediately change what
          guests see on your allergen page.
        </p>
      </div>
    </main>
  );
}
