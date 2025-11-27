// src/app/api/menu/route.js

import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export async function POST() {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // 1) Get logged-in user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("User error:", userError);
      return Response.json({ error: "Not logged in" }, { status: 401 });
    }

    // 2) Find the restaurant for this owner
    const { data: restaurant, error: restaurantError } = await supabase
      .from("restaurants")
      .select("id, name")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (restaurantError || !restaurant) {
      console.error("Restaurant error:", restaurantError);
      return Response.json(
        { error: "Restaurant not found for this user" },
        { status: 400 }
      );
    }

    // 3) Insert a menu linked to that restaurant
    const { data: menu, error: menuError } = await supabase
      .from("menus")
      .insert({
        restaurant_id: restaurant.id,
        name: "Main Menu",
      })
      .select()
      .single();

    if (menuError) {
      console.error("Create menu error (server):", menuError);
      return Response.json(
        { error: menuError.message ?? "Failed to create menu" },
        { status: 500 }
      );
    }

    // 4) Return created menu to the client
    return Response.json({ menu }, { status: 200 });
  } catch (err) {
    console.error("Unexpected error in /api/menu:", err);
    return Response.json(
      { error: "Unexpected error while creating menu" },
      { status: 500 }
    );
  }
}
