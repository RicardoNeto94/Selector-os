// src/app/dashboard/menu/page.js

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";

import MenuDashboardClient from "@/components/dashboard/MenuDashboardClient";

export const dynamic = "force-dynamic";

export default async function MenuDashboardPage() {

  // ✅ FIX auth (same pattern as other pages)
  const cookieStore = await cookies();

  const supabase = createServerComponentClient({
    cookies: () => cookieStore
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  // 🔹 GET RESTAURANT
  const { data: restaurant, error: restaurantError } = await supabase
    .from("restaurants")
    .select("*")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (restaurantError || !restaurant) {
    return (
      <main className="so-main">
        <div className="so-main-inner">

          <div className="so-card">
            <h1 className="text-white font-semibold mb-2">
              No restaurant found
            </h1>
            <p className="text-slate-400 text-sm">
              You need to complete onboarding first.
            </p>
          </div>

        </div>
      </main>
    );
  }

  // 🔹 GET MENUS
  const { data: menus = [] } = await supabase
    .from("menus")
    .select("*")
    .eq("restaurant_id", restaurant.id)
    .order("created_at", { ascending: true });

  return (
    <main className="so-main">

      <div className="so-main-inner">

        <MenuDashboardClient
          menus={menus}
          restaurant={restaurant}
          plan="pro"
          maxMenus={null}
          isAtLimit={false}
        />

      </div>

    </main>
  );
}