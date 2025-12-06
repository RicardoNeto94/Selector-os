// src/app/api/menu/publish/route.js
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { getRestaurantPlan, getMenuLimitForPlan } from "../../../../lib/planLimits";

export async function POST(req) {
  const supabase = createRouteHandlerClient({ cookies });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // 1) Load restaurant for this user
  const { data: restaurant, error: restaurantError } = await supabase
    .from("restaurants")
    .select("*")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (restaurantError || !restaurant) {
    console.error("No restaurant found for user", restaurantError);
    return NextResponse.json(
      { error: "No restaurant found for this account." },
      { status: 400 }
    );
  }

  // 2) Figure out the restaurant's plan
  const plan = getRestaurantPlan(restaurant);
  const maxMenus = getMenuLimitForPlan(plan);

  // 3) Count current menus for this restaurant
  const { data: menus, error: menusError } = await supabase
    .from("menus")
    .select("id")
    .eq("restaurant_id", restaurant.id);

  if (menusError) {
    console.error("Error loading menus", menusError);
    return NextResponse.json(
      { error: "Failed to load menus for this restaurant." },
      { status: 500 }
    );
  }

  const currentCount = menus?.length ?? 0;

  // 4) Enforce the limit
  if (maxMenus !== null && currentCount >= maxMenus) {
    return NextResponse.json(
      {
        error: `Menu limit reached for plan "${plan}".`,
        plan,
        maxMenus,
        currentCount,
      },
      { status: 403 }
    );
  }

  // 5) Parse body and insert new menu
  let body = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

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
    return NextResponse.json(
      { error: "Failed to create menu" },
      { status: 500 }
    );
  }

  return NextResponse.json({ menu: newMenu });
}
