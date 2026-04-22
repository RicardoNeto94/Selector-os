import { createClient } from "@supabase/supabase-js";
import MenuDashboardClient from "@/components/dashboard/MenuDashboardClient";

export const dynamic = "force-dynamic";

export default async function MenuDashboardPage() {

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // ⚠️ TEMP: no auth (we fix later properly)
  const userId = "TEMP_USER_ID";

  // 🔹 GET RESTAURANT
  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("*")
    .limit(1)
    .single();

  if (!restaurant) {
    return <div>No restaurant found</div>;
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