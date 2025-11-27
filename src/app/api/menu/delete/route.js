// src/app/api/menu/delete/route.js
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export async function POST(req) {
  const supabase = createRouteHandlerClient({ cookies });

  try {
    const { menuId } = await req.json();

    if (!menuId) {
      return NextResponse.json(
        { error: "Missing menuId in request body" },
        { status: 400 }
      );
    }

    // Logged-in user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("User error:", userError);
      return NextResponse.json({ error: "Not logged in" }, { status: 401 });
    }

    // Restaurant for this user
    const { data: restaurant, error: restaurantError } = await supabase
      .from("restaurants")
      .select("id")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (restaurantError || !restaurant) {
      console.error("Restaurant error:", restaurantError);
      return NextResponse.json(
        { error: "Restaurant not found for this user" },
        { status: 400 }
      );
    }

    // Delete the menu that belongs to this restaurant
    const { error: deleteError } = await supabase
      .from("menus")
      .delete()
      .eq("id", menuId)
      .eq("restaurant_id", restaurant.id);

    if (deleteError) {
      console.error("Delete menu error:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete menu" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Menu delete error (server):", err);
    return NextResponse.json(
      { error: "Failed to delete menu" },
      { status: 500 }
    );
  }
}
