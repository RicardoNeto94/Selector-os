// src/app/api/menus/create/route.js
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { getRestaurantPlan, getMenuLimitForPlan } from "@/lib/planLimits";

export async function POST(req) {
  const supabase = createRouteHandlerClient({ cookies });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: restaurant, error: restaurantError } = await supabase
    .from("restaurants")
    .select("*")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (restaurantError || !restaurant) {
    return NextResponse.json({ error: "Restaurant not found" }, { status: 400 });
  }

  const plan = getRestaurantPlan(restaurant);
  const limit = getMenuLimitForPlan(plan);

  // Count how many menus this restaurant already has
  const { data: menus, error: menusError } = await supabase
    .from("menus")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", restaurant.id);

  if (menusError) {
    console.error("Menu count error", menusError);
    return NextResponse.json({ error: "Failed to check menu limit" }, { status: 500 });
  }

  const currentCount = menus?.length ?? menus?.count ?? 0;

  if (limit !== Infinity && currentCount >= limit) {
    return NextResponse.json(
      {
        error: "menu_limit_reached",
        message:
          plan === "starter"
            ? "Starter plan includes 1 menu. Upgrade to Pro to add more."
            : "Pro plan includes 3 menus. Contact us for an Enterprise plan to add more.",
      },
      { status: 403 }
    );
  }

  // OK, below the limit → create menu
  const body = await req.json();

  const { data: newMenu, error: insertError } = await supabase
    .from("menus")
    .insert({
      restaurant_id: restaurant.id,
      name: body.name ?? "New menu",
      // any other fields...
    })
    .select("*")
    .single();

  if (insertError) {
    console.error("Insert menu error", insertError);
    return NextResponse.json({ error: "Failed to create menu" }, { status: 500 });
  }

  return NextResponse.json({ menu: newMenu });
}
