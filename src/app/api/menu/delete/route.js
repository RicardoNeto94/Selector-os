// src/app/api/menu/delete/route.js

import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export async function POST(req) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("User error:", userError);
      return Response.json({ error: "Not logged in" }, { status: 401 });
    }

    const body = await req.json();
    const menuId = body.menuId;

    if (!menuId) {
      return Response.json({ error: "menuId is required" }, { status: 400 });
    }

    // Optional: make sure this menu belongs to the logged-in owner
    const { data: menu, error: menuError } = await supabase
      .from("menus")
      .select("id, restaurant_id")
      .eq("id", menuId)
      .maybeSingle();

    if (menuError || !menu) {
      console.error("Menu not found or error:", menuError);
      return Response.json({ error: "Menu not found" }, { status: 404 });
    }

    // Check restaurant ownership
    const { data: restaurant, error: restaurantError } = await supabase
      .from("restaurants")
      .select("id, owner_id")
      .eq("id", menu.restaurant_id)
      .maybeSingle();

    if (restaurantError || !restaurant || restaurant.owner_id !== user.id) {
      console.error("Restaurant ownership error:", restaurantError);
      return Response.json({ error: "Not allowed to delete this menu" }, { status: 403 });
    }

    // Delete the menu
    const { error: deleteError } = await supabase
      .from("menus")
      .delete()
      .eq("id", menuId);

    if (deleteError) {
      console.error("Delete menu error:", deleteError);
      return Response.json(
        { error: deleteError.message ?? "Failed to delete menu" },
        { status: 500 }
      );
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error("Unexpected error in /api/menu/delete:", err);
    return Response.json(
      { error: "Unexpected error while deleting menu" },
      { status: 500 }
    );
  }
}
