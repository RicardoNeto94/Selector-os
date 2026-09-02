import { createClient } from "@supabase/supabase-js";
import { requireDashboardUser } from "@/lib/server/requireDashboardUser";
import { scopeTenantQuery } from "@/lib/server/tenantContext";

import MenuDashboardClient from "@/components/dashboard/MenuDashboardClient";
import PwaRefreshControl from "@/components/dashboard/PwaRefreshControl";

export const dynamic = "force-dynamic";

export default async function MenuDashboardPage() {
  const access = await requireDashboardUser();
  if (!access.allowed) return null;
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const restaurantResult = await scopeTenantQuery(
    admin.from("restaurants").select("*").limit(1),
    access.tenant,
  ).maybeSingle();
  const restaurant = restaurantResult.data;

  if (restaurantResult.error || !restaurant) {
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

  const menusResult = await scopeTenantQuery(
    admin.from("menus").select("*").order("created_at", { ascending: true }),
    access.tenant,
  );
  const menus = menusResult.data || [];

  const roomPwaMenu = menus.find(
    (menu) => menu.design_type === "burman" && menu.is_active && menu.public_slug,
  );

  return <>
    <MenuDashboardClient
      menus={menus}
      restaurant={restaurant}
      plan="pro"
      maxMenus={null}
      isAtLimit={false}
    />
    {roomPwaMenu && <div className="so-page pt-0"><PwaRefreshControl menuSlug={roomPwaMenu.public_slug} propertyName={restaurant.name || "Property"} /></div>}
  </>;
}
