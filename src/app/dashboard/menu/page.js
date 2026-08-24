// src/app/dashboard/menu/page.js

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

import MenuDashboardClient from "@/components/dashboard/MenuDashboardClient";

export const dynamic = "force-dynamic";

export default async function MenuDashboardPage() {

  // ✅ FIX auth (same pattern as other pages)
  const supabase = await createClient();

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
      <div className="so-page page-fade">
        <header className="so-page-header">
          <div>
            <p className="so-page-eyebrow">Guest experience</p>
            <h1 className="so-page-title">Menus</h1>
            <p className="so-page-description">Build, publish and manage guest-facing hospitality menus.</p>
          </div>
        </header>
        <div className="so-empty-state">
          <span>Organisation setup</span>
          <h2>No restaurant workspace is linked</h2>
          <p>Your account is authenticated, but it is not currently linked to a restaurant record. An administrator can resolve this in organisation settings.</p>
          <a href="/dashboard/settings" className="so-btn-secondary">Open settings</a>
        </div>
      </div>
    );
  }

  // 🔹 GET MENUS
  const { data: menus = [] } = await supabase
    .from("menus")
    .select("*")
    .eq("restaurant_id", restaurant.id)
    .order("created_at", { ascending: true });

  return (
    <MenuDashboardClient
      menus={menus}
      restaurant={restaurant}
      plan="pro"
      maxMenus={null}
      isAtLimit={false}
    />
  );
}
